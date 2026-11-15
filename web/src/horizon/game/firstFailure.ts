// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// "Land it yourself": the first moment a stay fails its rules, read from the engine's event lists.
// An interface helper only: it re-reads the same dark spells and contact gaps the verdict uses
// (light.ts window_compute / verdict), so it reports a failure exactly when the verdict is no-go.
import {
  formatHoursText, SAMPLE_STEP_S, spells,
  type LightEvent, type Metrics, type Rules,
} from '../../engine/light';

export type FailureKind = 'power' | 'contact';

export interface FirstFailure {
  kind: FailureKind;
  /** When the rule is first broken, seconds after the start of the stay. */
  at_s: number;
  /** Start of the dark spell or contact gap that breaks the rule, seconds after the start of the stay. */
  spell_start_s: number;
  /** Length of that spell or gap inside the stay, seconds. */
  spell_s: number;
  /** Day of the stay the spell or gap starts on (1 = the first 24 hours). */
  day: number;
  /** One line for the player: "Power lost after 31.0 h" or "Out of contact for 4.2 h on day 2". */
  text: string;
}

type MetricsIn = Pick<Metrics, 'lit_events' | 'contact_events' | 'lit_share' | 'contact_share' | 'n_samples'>;
type RulesIn = Pick<Rules, 'max_dark_s' | 'max_gap_s'>;

/**
 * State at the first sample: the opposite of the first change of state, or, with no changes, the
 * state the whole stay was in (its share is then exactly 0 or 1).
 */
export function initialState(evs: LightEvent[], share: number): boolean {
  return evs.length ? !evs[0].to : share > 0.5;
}

const DAY_S = 86400;

/**
 * The first moment the stay breaks a rule, or null if it holds for the whole stay.
 * - Power: the first dark spell longer than rules.max_dark_s; it fails max_dark_s into that spell
 *   (with max_dark_s = 0, at the first sunset).
 * - Contact: the first contact gap longer than rules.max_gap_s; it fails max_gap_s into that gap.
 * When both break, the earlier failure wins (power on a tie).
 * Event times are seconds after the table's first row, as in the engine; start_s is the stay's start.
 */
export function firstFailure(m: MetricsIn, rules: RulesIn, start_s: number): FirstFailure | null {
  const { power, contact } = failures(m, rules, start_s);
  if (power && contact) return contact.at_s < power.at_s ? contact : power;
  return power ?? contact;
}

/** The first dark spell and the first contact gap that break their rules (each null if none does), and the stay length. */
export function failures(m: MetricsIn, rules: RulesIn, start_s: number): { power: FirstFailure | null; contact: FirstFailure | null; stay_s: number } {
  const t_end = start_s + (m.n_samples - 1) * SAMPLE_STEP_S;
  const dark = spells(start_s, t_end, initialState(m.lit_events, m.lit_share), m.lit_events, false);
  const gaps = spells(start_s, t_end, initialState(m.contact_events, m.contact_share), m.contact_events, false);
  const d = dark.find(([a, b]) => b - a > rules.max_dark_s);
  const g = gaps.find(([a, b]) => b - a > rules.max_gap_s);
  const power: FirstFailure | null = d ? {
    kind: 'power',
    at_s: d[0] - start_s + rules.max_dark_s,
    spell_start_s: d[0] - start_s,
    spell_s: d[1] - d[0],
    day: Math.floor((d[0] - start_s) / DAY_S) + 1,
    text: rules.max_dark_s === 0 && d[0] === start_s
      ? 'Power lost at touchdown: the site is in shadow'
      : `Power lost after ${formatHoursText(d[0] - start_s + rules.max_dark_s)}`,
  } : null;
  const contact: FirstFailure | null = g ? {
    kind: 'contact',
    at_s: g[0] - start_s + rules.max_gap_s,
    spell_start_s: g[0] - start_s,
    spell_s: g[1] - g[0],
    day: Math.floor((g[0] - start_s) / DAY_S) + 1,
    text: `Out of contact for ${formatHoursText(g[1] - g[0])} on day ${Math.floor((g[0] - start_s) / DAY_S) + 1}`,
  } : null;
  return { power, contact, stay_s: t_end - start_s };
}

/** True when a spell starting at touchdown lasts the whole stay (to within a second). */
const wholeStay = (f: FirstFailure, stay_s: number) => f.spell_start_s === 0 && f.spell_s >= stay_s - 1;

/**
 * Note 011 item 2: the Sun sentence for the dark spell that breaks the rule, from its start, its own
 * length and the stay length (the engine's reason says "sets" even where the Sun never rises).
 */
export function sunSentence(f: FirstFailure, stay_s: number): string {
  if (wholeStay(f, stay_s)) return 'The Sun never rises here during the stay.';
  if (f.spell_start_s === 0) return `The Sun is hidden at touchdown for the first ${formatHoursText(f.spell_s)}.`;
  return `The Sun sets after ${formatHoursText(f.spell_start_s)} and stays down for ${formatHoursText(f.spell_s)}.`;
}

/** The contact sentence for a gap that breaks the rule: the note 011 wording when there is no contact at all, else the engine's. */
export function contactSentence(f: FirstFailure, stay_s: number, longest_gap_s: number, max_gap_s: number): string {
  if (wholeStay(f, stay_s)) return 'No ground station is in view at any time during the stay.';
  return `Longest gap in Earth contact is ${formatHoursText(longest_gap_s)}, over the ${formatHoursText(max_gap_s)} limit.`;
}

/**
 * The game's reason line. For a no-go it says what breaks each rule in the note 011 wordings, from the
 * same events as the verdict; for a go or marginal stay it is the engine's own reason.
 */
export function gameReason(m: MetricsIn & Pick<Metrics, 'longest_gap_s'>, rules: RulesIn, start_s: number, engineReason: string): string {
  const { power, contact, stay_s } = failures(m, rules, start_s);
  if (!power && !contact) return engineReason;
  const out: string[] = [];
  if (power) {
    out.push(sunSentence(power, stay_s));
    out.push(rules.max_dark_s === 0 ? 'This scenario needs continuous sunlight.' : `The limit is ${formatHoursText(rules.max_dark_s)} of darkness.`);
  }
  if (contact) out.push(contactSentence(contact, stay_s, m.longest_gap_s, rules.max_gap_s));
  return out.join(' ');
}

/** "6.5" for 6.5 days, "14" for 14 days. */
export function formatStayDays(stay_s: number): string {
  return String(Number((stay_s / DAY_S).toFixed(1)));
}

/** "Mission holds for all 6.5 days", or the failure line. */
export function resultLine(f: FirstFailure | null, stay_s: number): string {
  return f ? f.text : `Mission holds for all ${formatStayDays(stay_s)} days`;
}
