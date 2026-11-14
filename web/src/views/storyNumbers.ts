// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Numbers for the guided Athena story, computed from the cited coordinates in sites.json.
import { MOON_RADIUS_KM } from '../data/contracts';
import type { Site } from '../data/types';
import { local_frame, site_vector } from '../engine/light';

export const ATHENA_TARGET_ID = 'im2_athena_target';
export const ATHENA_ACTUAL_ID = 'im2_athena_actual';

const D = Math.PI / 180;
const R_M = MOON_RADIUS_KM * 1000;

export interface AthenaMiss {
  target: Site;
  actual: Site;
  /** Great-circle distance on the 1,737.4 km sphere. */
  dist_m: number;
  /** Offset of the resting place from the target in the target's local east/north frame (on the sphere). */
  east_m: number;
  north_m: number;
  bearing_deg: number;
}

export function athenaMiss(sites: Site[]): AthenaMiss | null {
  const target = sites.find((s) => s.id === ATHENA_TARGET_ID);
  const actual = sites.find((s) => s.id === ATHENA_ACTUAL_ID);
  if (!target || !actual) return null;
  const a = site_vector(target.lat_deg, target.lon_deg, 0);
  const b = site_vector(actual.lat_deg, actual.lon_deg, 0);
  const dot = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (R_M / 1000) ** 2;
  const cross = Math.hypot(a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]) / (R_M / 1000) ** 2;
  const ang_rad = Math.atan2(cross, dot);
  const dist_m = ang_rad * R_M;
  const f = local_frame(target.lat_deg, target.lon_deg);
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const e = d[0] * f.east[0] + d[1] * f.east[1] + d[2] * f.east[2];
  const n = d[0] * f.north[0] + d[1] * f.north[1] + d[2] * f.north[2];
  // Scale the chord's horizontal direction to the arc length.
  const k = dist_m / Math.max(Math.hypot(e, n), 1e-12);
  return { target, actual, dist_m, east_m: e * k, north_m: n * k, bearing_deg: ((Math.atan2(e, n) / D) + 360) % 360 };
}

/**
 * Shortest and longest possible miss when the true target can be anywhere in the rounding box
 * (± half a step north-south and east-west around the quoted target). Flat local approximation.
 */
export function missRange(m: Pick<AthenaMiss, 'east_m' | 'north_m'>, box: { ns_m: number; ew_m: number }): { min_m: number; max_m: number } {
  const clamp = (x: number, h: number) => Math.max(-h, Math.min(h, x));
  const min_m = Math.hypot(m.east_m - clamp(m.east_m, box.ew_m), m.north_m - clamp(m.north_m, box.ns_m));
  const max_m = Math.hypot(Math.abs(m.east_m) + box.ew_m, Math.abs(m.north_m) + box.ns_m);
  return { min_m, max_m };
}

/** Half a rounding step of a coordinate quoted to `decimals` places, in metres north-south and east-west. */
export function roundingHalfStep(lat_deg: number, decimals: number): { ns_m: number; ew_m: number } {
  const half_deg = 0.5 * 10 ** -decimals;
  return { ns_m: half_deg * D * R_M, ew_m: half_deg * D * R_M * Math.cos(lat_deg * D) };
}

/** Lit share at the target point (east 0, north 0) and its smallest and largest value within radius_m. */
export function litRange(lit: ArrayLike<number>, east_m: ArrayLike<number>, north_m: ArrayLike<number>, radius_m: number): { at_target: number; min: number; max: number; n: number } | null {
  let min = Infinity, max = -Infinity, n = 0, at = NaN;
  for (let i = 0; i < lit.length; i++) {
    if (east_m[i] === 0 && north_m[i] === 0) at = lit[i];
    if (Math.hypot(east_m[i], north_m[i]) > radius_m + 1e-9) continue;
    n++;
    if (lit[i] < min) min = lit[i];
    if (lit[i] > max) max = lit[i];
  }
  return n ? { at_target: at, min, max, n } : null;
}
