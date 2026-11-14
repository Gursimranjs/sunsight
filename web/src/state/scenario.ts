// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// The scenario a user is looking at: site or coordinates, dates, preset and rules, view and time.
import type { EphemerisMeta } from '../data/types';
import { makeRules, PRESETS, type PresetId, type Rules } from '../engine/light';

export type View = 'report' | 'sky' | 'miss' | 'compare' | 'validation';
export const VIEWS: { id: View; label: string }[] = [
  { id: 'report', label: 'Report card' },
  { id: 'sky', label: 'Sky panorama' },
  { id: 'miss', label: 'Miss test' },
  { id: 'compare', label: 'Compare & calendar' },
  { id: 'validation', label: 'Validation' },
];

export interface Scenario {
  /** Curated site id, or null for custom coordinates (Anywhere mode). */
  site_id: string | null;
  lat_deg: number;
  lon_deg: number;
  /** Start of the stay, seconds after the table's first row. */
  start_s: number;
  stay_s: number;
  preset: PresetId;
  rules: Rules;
  view: View;
  /** Selected moment, seconds after start_s (shared by every view). */
  t_off_s: number;
  /** Sites in the compare view. */
  compare: string[];
}

export function defaultScenario(site_id: string | null): Scenario {
  const rules = makeRules(PRESETS.robotic);
  return {
    site_id, lat_deg: 0.67, lon_deg: 23.47, start_s: 0, stay_s: rules.stay_s, preset: 'robotic', rules,
    view: 'report', t_off_s: 0, compare: [],
  };
}

/** Table range in seconds after row 0 within which interpolation stays inside the table. */
export function tableRange(meta: Pick<EphemerisMeta, 'row_count' | 'step_s'>): { min_s: number; max_s: number } {
  return { min_s: 0, max_s: (meta.row_count - 2) * meta.step_s };
}

export const MIN_STAY_S = 3600;

/** Keep the stay inside the table: shorten it if longer than the table, then move the start in. */
export function clampWindow(start_s: number, stay_s: number, meta: Pick<EphemerisMeta, 'row_count' | 'step_s'>): { start_s: number; stay_s: number } {
  const { min_s, max_s } = tableRange(meta);
  const stay = Math.max(MIN_STAY_S, Math.min(Number.isFinite(stay_s) ? stay_s : MIN_STAY_S, max_s - min_s));
  let start = Number.isFinite(start_s) ? start_s : min_s;
  start = Math.max(min_s, Math.min(start, max_s - stay));
  return { start_s: start, stay_s: stay };
}

export function clampScenario(s: Scenario, meta: Pick<EphemerisMeta, 'row_count' | 'step_s'>): Scenario {
  const w = clampWindow(s.start_s, s.stay_s, meta);
  const t_off_s = Math.max(0, Math.min(Number.isFinite(s.t_off_s) ? s.t_off_s : 0, w.stay_s));
  return { ...s, ...w, t_off_s, rules: { ...s.rules, stay_s: w.stay_s } };
}
