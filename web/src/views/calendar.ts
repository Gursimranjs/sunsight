// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Calendar helpers (pure, unit-tested): which day starts fit in the table.
import type { EphemerisMeta } from '../data/types';
import { tableRange } from '../state/scenario';

/**
 * Start times (seconds after row 0) for `days` consecutive daily stays beginning at the UTC
 * midnight on or after from_s; stays that would run past the table are dropped.
 */
export function dayStarts(from_s: number, days: number, stay_s: number, meta: Pick<EphemerisMeta, 'row_count' | 'step_s'>, epoch_ms: number): number[] {
  const { max_s } = tableRange(meta);
  const epochDay_s = (epoch_ms / 1000) % 86400; // table start's offset from UTC midnight
  const first = Math.ceil((from_s + epochDay_s) / 86400) * 86400 - epochDay_s;
  const out: number[] = [];
  for (let k = 0; k < days; k++) {
    const s = first + k * 86400;
    if (s + stay_s > max_s) break;
    out.push(s);
  }
  return out;
}
