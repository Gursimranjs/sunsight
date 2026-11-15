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
  if (power && contact) return contact.at_s < power.at_s ? contact : power;
  return power ?? contact;
}

/** "6.5" for 6.5 days, "14" for 14 days. */
export function formatStayDays(stay_s: number): string {
  return String(Number((stay_s / DAY_S).toFixed(1)));
}

/** "Mission holds for all 6.5 days", or the failure line. */
export function resultLine(f: FirstFailure | null, stay_s: number): string {
  return f ? f.text : `Mission holds for all ${formatStayDays(stay_s)} days`;
}
