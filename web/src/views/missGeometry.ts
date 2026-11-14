// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Miss-test map helpers (pure, unit-tested).
import type { MaskPoint, MaskSet } from '../data/sites';
import { heightIndex, masksForHeight } from '../data/sites';
import type { MissCalendarJob, MissJob } from '../engine/compute';
import type { Rules } from '../engine/light';

export const MISS_RADII_M = [100, 250, 500];
/** A date is miss-tolerant when at least this share of the ground inside the radius passes. */
export const MISS_TOLERANT_SHARE = 0.9;

export function missJob(set: MaskSet, start_s: number, end_s: number, rules: Rules, radii_m = MISS_RADII_M): MissJob {
  const pts = set.meta.points;
  const hi = heightIndex(set.meta.observer_heights_m, rules.observer_height_m);
  return {
    places: pts.map((p) => ({ lat_deg: p.lat_deg, lon_deg: p.lon_deg, h_m: p.height_m })),
    masks: masksForHeight(set, hi),
    east_m: pts.map((p) => p.east_m ?? 0),
    north_m: pts.map((p) => p.north_m ?? 0),
    start_s, end_s, rules, radii_m,
  };
}

/** Index of the grid point nearest to (east_m, north_m). */
export function nearestGridPoint(points: MaskPoint[], east_m: number, north_m: number): number {
  let best = 0, bestD = Infinity;
  points.forEach((p, i) => {
    const d = Math.hypot((p.east_m ?? 0) - east_m, (p.north_m ?? 0) - north_m);
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

/** Keyboard step: the nearest point roughly in direction (dx, dy) from point i, or i if none. */
export function stepGridPoint(points: MaskPoint[], i: number, dx: number, dy: number): number {
  const p = points[i];
  let best = i, bestD = Infinity;
  points.forEach((q, k) => {
    if (k === i) return;
    const ex = (q.east_m ?? 0) - (p.east_m ?? 0), ny = (q.north_m ?? 0) - (p.north_m ?? 0);
    const along = ex * dx + ny * dy;
    const across = Math.abs(ex * dy - ny * dx);
    if (along <= 0 || across > along) return;
    const d = along + 2 * across;
    if (d < bestD) { bestD = d; best = k; }
  });
  return best;
}

/** Miss-tolerant calendar job: only the grid points inside radius_m (same inside test as miss_share). */
export function missCalendarJob(
  set: MaskSet, day_starts_s: number[], stay_s: number, rules: Rules, radius_m: number, min_share = MISS_TOLERANT_SHARE,
): MissCalendarJob {
  const pts = set.meta.points;
  const hi = heightIndex(set.meta.observer_heights_m, rules.observer_height_m);
  const all = masksForHeight(set, hi);
  const nb = set.meta.bin_count;
  const inside = pts.map((_, i) => i).filter((i) => Math.hypot(pts[i].east_m ?? 0, pts[i].north_m ?? 0) <= radius_m + 1e-9);
  const masks = new Float64Array(inside.length * nb);
  inside.forEach((i, k) => masks.set(all.subarray(i * nb, (i + 1) * nb), k * nb));
  return {
    places: inside.map((i) => ({ lat_deg: pts[i].lat_deg, lon_deg: pts[i].lon_deg, h_m: pts[i].height_m })),
    masks, day_starts_s, stay_s, rules, radius_m, min_share,
  };
}
