// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Miss-test map helpers (pure, unit-tested).
import type { EphemerisMeta } from '../data/types';
import type { MaskPoint, MaskSet } from '../data/sites';
import { heightIndex, maskOf, masksForHeight, missCentreIndex } from '../data/sites';
import type { CalendarJob, MissAnswer, MissCalendarJob, MissJob } from '../engine/compute';
import type { Rules, VerdictKind } from '../engine/light';
import { dayStarts } from './calendar';

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

/**
 * The grid point that stands for the target: the site's own point when the site borrows another
 * target's grid (site_point_i >= 0), else the grid centre (east 0 m, north 0 m), else the point nearest it.
 */
export function missTargetIndex(set: MaskSet, site_point_i: number): number {
  if (site_point_i >= 0 && site_point_i < set.meta.points.length) return site_point_i;
  const c = missCentreIndex(set);
  return c >= 0 ? c : nearestGridPoint(set.meta.points, 0, 0);
}

/**
 * True when the target point fails the rules and no landing point within any miss radius passes,
 * so the share table would be all 0%.
 */
export function targetFailsEverywhere(a: Pick<MissAnswer, 'verdicts' | 'shares'>, target_i: number): boolean {
  if (target_i < 0 || target_i >= a.verdicts.length) return false;
  return a.verdicts[target_i] === 'no-go' && a.shares.every((s) => s === 0);
}

/**
 * Which "target fails" line the miss view shows, judged from the grid centre (the point the share
 * circles and the "+ Target" marker are drawn around):
 * - 'all': the centre fails and no landing point within any miss radius passes (every share is 0);
 * - 'some': the centre fails but some landing points near it pass;
 * - 'site': the site borrows another target's grid, the centre passes, and the site's own point fails;
 * - null: nothing to say.
 */
export type MissFailLine = 'all' | 'some' | 'site' | null;
export function missFailLine(a: Pick<MissAnswer, 'verdicts' | 'shares'>, centre_i: number, site_point_i: number): MissFailLine {
  if (centre_i < 0 || centre_i >= a.verdicts.length) return null;
  if (a.verdicts[centre_i] === 'no-go') return targetFailsEverywhere(a, centre_i) ? 'all' : 'some';
  if (site_point_i >= 0 && site_point_i < a.verdicts.length && site_point_i !== centre_i && a.verdicts[site_point_i] === 'no-go') return 'site';
  return null;
}

const VERDICT_RANK: Record<VerdictKind, number> = { go: 2, marginal: 1, 'no-go': 0 };

/**
 * Index of the best day: best verdict first (go > marginal > no-go), then highest score, earliest
 * day on ties. A score that is not a finite number ranks below every number. -1 when there are no days.
 */
export function bestDayIndex(days: { verdict: VerdictKind; score: number }[]): number {
  let best = -1;
  const sc = (x: number) => (Number.isFinite(x) ? x : -Infinity);
  days.forEach((d, i) => {
    if (best < 0) { best = i; return; }
    const b = days[best];
    const dv = VERDICT_RANK[d.verdict] - VERDICT_RANK[b.verdict];
    if (dv > 0 || (dv === 0 && sc(d.score) > sc(b.score))) best = i;
  });
  return best;
}

/**
 * Calendar job for one grid point: a stay starting at every UTC midnight that fits in the
 * ephemeris table, scored with the given rules. The worker runs it with progress.
 */
export function bestDateJob(
  set: MaskSet, point_i: number, stay_s: number, rules: Rules,
  meta: Pick<EphemerisMeta, 'row_count' | 'step_s'>, epoch_ms: number,
): CalendarJob {
  const p = set.meta.points[point_i];
  const hi = heightIndex(set.meta.observer_heights_m, rules.observer_height_m);
  const all_days = Math.ceil(((meta.row_count - 1) * meta.step_s) / 86400) + 1;
  return {
    // A copy, so posting the job to the worker does not clone the whole grid's mask buffer.
    sites: [{ place: { lat_deg: p.lat_deg, lon_deg: p.lon_deg, h_m: p.height_m }, mask: new Float64Array(maskOf(set, point_i, hi)) }],
    day_starts_s: dayStarts(0, all_days, stay_s, meta, epoch_ms),
    stay_s, rules,
  };
}

/** Which scenario a miss share belongs to: the verdict card shows the share only while this still matches (note 008). */
export function missSig(site_id: string | null, start_s: number, stay_s: number, rules: Rules): string {
  return JSON.stringify([site_id, start_s, stay_s, rules]);
}

/** The miss share the Miss test view last computed, for the verdict card. */
export interface MissShare { sig: string; share: number; radius_m: number }

