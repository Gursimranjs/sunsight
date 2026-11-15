// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// "Land it yourself": pure helpers (which grid, the brief, the engine job for one point, the share link).
import { BIN_COUNT } from '../../data/contracts';
import type { MaskSet } from '../../data/sites';
import type { Site } from '../../data/types';
import type { WindowJob } from '../../engine/compute';
import type { PresetId, Rules } from '../../engine/light';
import { missJob, missTargetIndex } from '../../views/missGeometry';
import { formatStayDays } from './firstFailure';

/** Tries before the whole ground is shown. */
export const MAX_TRIES = 3;
/** The share line after the reveal uses this miss radius (one of MISS_RADII_M). */
export const REVEAL_RADIUS_M = 250;
/** The site the "Try Athena's target" button switches to. */
export const ATHENA_TARGET_ID = 'im2_athena_target';
/** Query parameter that carries the chosen grid point id in a shared link. */
export const GAME_POINT_PARAM = 'game_pt';
/** Lander drop and replay lengths, ms (interface timing only). */
export const DROP_MS = 600;
export const REPLAY_MS = 5000;

/** The miss grid the game is played on: the site's own target grid, else the grid it lies in; null if none. */
export function gameGridId(site: Pick<Site, 'miss_target_id' | 'miss_grid_id'> | null): string | null {
  if (!site) return null;
  if (typeof site.miss_target_id === 'string' && site.miss_target_id) return site.miss_target_id;
  if (typeof site.miss_grid_id === 'string' && site.miss_grid_id) return site.miss_grid_id;
  return null;
}

const WHO: Record<PresetId, string> = { crew: 'a crew', robotic: 'a robotic lander', long: 'a long-stay mission' };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "24 July 2029" (UTC) from Unix milliseconds. */
export function formatDayUtc(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "You are landing a crew for 6.5 days on <site> on 24 July 2029. Pick your spot within 500 m of the target." */
export function gameBrief(preset: PresetId, stay_s: number, siteName: string, start_ms: number, radius_m: number): string {
  return `You are landing ${WHO[preset]} for ${formatStayDays(stay_s)} days on ${siteName} on ${formatDayUtc(start_ms)}. `
    + `Pick your spot within ${Math.round(radius_m)} m of the target.`;
}

/** Radius of the grid around the target, m (the grid's stated radius, else its farthest point). */
export function gridRadius_m(set: MaskSet): number {
  if (typeof set.meta.radius_m === 'number' && Number.isFinite(set.meta.radius_m)) return set.meta.radius_m;
  return Math.max(0, ...set.meta.points.map((p) => Math.hypot(p.east_m ?? 0, p.north_m ?? 0)));
}

/** The grid point standing for the target (the grid centre). */
export function gameTargetIndex(set: MaskSet): number {
  return missTargetIndex(set, -1);
}

/** Distance of grid point i from the target point, m. */
export function distanceFromTarget_m(set: MaskSet, i: number): number {
  const p = set.meta.points[i], t = set.meta.points[gameTargetIndex(set)];
  return Math.hypot((p.east_m ?? 0) - (t.east_m ?? 0), (p.north_m ?? 0) - (t.north_m ?? 0));
}

/**
 * The window job for grid point i: the same place and mask (the miss job's masks for this observer
 * height) that the miss job scores for that point, so the game's verdict equals the Miss map's.
 */
export function gamePointJob(set: MaskSet, i: number, start_s: number, end_s: number, rules: Rules): WindowJob {
  const all = missJob(set, start_s, end_s, rules);
  return {
    place: all.places[i],
    // A copy, so posting the job to the worker does not clone the whole grid's mask buffer.
    mask: new Float64Array(all.masks.subarray(i * BIN_COUNT, (i + 1) * BIN_COUNT)),
    start_s, end_s, rules,
  };
}

/** Index of the grid point named by game_pt in a query string, or null. */
export function parseGamePoint(search: string, set: MaskSet): number | null {
  const id = new URLSearchParams(search).get(GAME_POINT_PARAM);
  if (!id) return null;
  const i = set.meta.points.findIndex((p) => p.id === id);
  return i >= 0 ? i : null;
}

/** The current link with game_pt set to the chosen point. */
export function gameShareLink(href: string, pointId: string): string {
  const u = new URL(href);
  u.searchParams.set(GAME_POINT_PARAM, pointId);
  return u.toString();
}

/** Spread of the reveal, ms: the farthest point starts this long after the target; with the 100 ms fade, 300 ms in all. */
export const REVEAL_SPREAD_MS = 200;

/** Delay before a grid point appears in the reveal, ms: outward from the target, in proportion to distance. */
export function revealDelay_ms(east_m: number, north_m: number, radius_m: number): number {
  if (!(radius_m > 0)) return 0;
  return Math.round(REVEAL_SPREAD_MS * Math.min(1, Math.hypot(east_m, north_m) / radius_m));
}

/** "on the target" or "120 m from the target". */
export function distanceText(d_m: number): string {
  return d_m < 0.5 ? 'on the target' : `${Math.round(d_m)} m from the target`;
}
