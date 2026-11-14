// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Plain-language explanations of jargon. Numbers that are rules (lit threshold, station elevation,
// grazing angle, score weights, load, contact mode) are read from the rules in force.
import type { Rules } from '../engine/light';

/** A number as short text: 0.5 -> "0.5", 12.50 -> "12.5", 10 -> "10". */
const n = (x: number) => String(Number(x.toFixed(4)));
const pct = (share: number) => `${n(share * 100)}%`;

/** "at least 50% of the Sun's disc above the terrain" for the current lit threshold. */
export function litRuleText(r: Rules): string {
  return `at least ${pct(r.lit_threshold)} of the Sun’s disc above the terrain`;
}

const FIXED = {
  azimuth: 'Direction around the horizon, measured clockwise from north: 0° north, 90° east, 180° south, 270° west.',
  elevation: 'Angle above the horizon. 0° is the level horizon; negative means below it.',
  psr: 'Permanently shadowed: a crater floor the Sun never reaches, because the Sun stays within about 1.5° of the horizon near the poles.',
  smooth: 'With no terrain map here, the horizon is that of a perfectly smooth Moon: slightly below level because you stand above the ground.',
  miss: 'If the lander comes down anywhere inside this circle, what share of the ground still meets the rules? A robustness share, not a landing probability.',
} as const;

const FROM_RULES = {
  lit: (r: Rules) => `A moment counts as lit when at least ${pct(r.lit_threshold)} of the Sun’s disc is visible above the terrain.`,
  contact: (r: Rules) => (r.contact_mode === 'earth'
    ? 'Earth contact (current rule: any part of Earth in view): some part of Earth’s disc is above the lunar terrain. The ground-station check is switched off.'
    : `Earth contact: at least one Deep Space Network station (Goldstone, Madrid or Canberra) is above the lunar terrain and sees the Moon at least ${n(r.min_moon_el_deg)}° above its own horizon.`),
  grazing: (r: Rules) => (r.contact_mode === 'earth'
    ? `Earth contact where the ground station sits less than ${n(r.grazing_deg)}° above the lunar terrain. With the current contact rule (any part of Earth in view) contact is never graded as grazing.`
    : `Earth contact where the ground station sits less than ${n(r.grazing_deg)}° above the lunar terrain. Signals at such low angles reflect off the ground and fade.`),
  battery: (r: Rules) => `Battery = load (${n(r.load_w)} W) × longest darkness ÷ (usable depth of discharge ${n(r.depth_of_discharge)} × efficiency ${n(r.efficiency)}).`,
  score: (r: Rules) => {
    const [ws, we, wn] = r.weights;
    return `Score = 100 × (${n(ws)} × average share of the Sun visible + ${n(we)} × share of time with Earth contact − ${n(wn)} × longest darkness ÷ stay), clamped to 0–100.`;
  },
} as const;

export type GlossaryKey = keyof typeof FIXED | keyof typeof FROM_RULES;

const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

export function isGlossaryKey(k: string): k is GlossaryKey {
  return own(FIXED, k) || own(FROM_RULES, k);
}

/** The explanation of a jargon word under these rules. */
export function glossaryText(k: GlossaryKey, r: Rules): string {
  return own(FROM_RULES, k) ? FROM_RULES[k as keyof typeof FROM_RULES](r) : FIXED[k as keyof typeof FIXED];
}
