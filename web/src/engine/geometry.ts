// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Function contracts from docs/BUILD_PLAN.md: a line-by-line port of the geometry part of
// pipeline/sunsight/light.py. Keep the order of operations identical so results match to 1e-6.
// Angles in degrees, distances in km.
import { MOON_RADIUS_KM } from '../data/contracts';

export type Vec3 = [number, number, number];
export const D2R = Math.PI / 180.0;
export const R2D = 180.0 / Math.PI;

export function site_vector(lat_deg: number, lon_deg: number, h_m: number): Vec3 {
  const r_km = MOON_RADIUS_KM + h_m / 1000.0;
  const la = lat_deg * D2R, lo = lon_deg * D2R;
  return [r_km * Math.cos(la) * Math.cos(lo), r_km * Math.cos(la) * Math.sin(lo), r_km * Math.sin(la)];
}

export interface Frame { east: Vec3; north: Vec3; up: Vec3 }

export function local_frame(lat_deg: number, lon_deg: number): Frame {
  const la = lat_deg * D2R, lo = lon_deg * D2R;
  return {
    east: [-Math.sin(lo), Math.cos(lo), 0.0],
    north: [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)],
    up: [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)],
  };
}

export interface AzEl { az_deg: number; el_deg: number; dist_km: number }

/**
 * Azimuth (0..360, clockwise from local north), elevation and distance of target from site.
 * `target` may be any indexable triple starting at `off` (so a table row can be passed without copying).
 */
export function az_el(target: ArrayLike<number>, site: ArrayLike<number>, frame: Frame, off = 0): AzEl {
  const d0 = target[off] - site[0], d1 = target[off + 1] - site[1], d2 = target[off + 2] - site[2];
  const n = Math.sqrt(d0 * d0 + d1 * d1 + d2 * d2);
  const u = frame.up, e = frame.east, no = frame.north;
  const s = (d0 * u[0] + d1 * u[1] + d2 * u[2]) / n;
  const el_deg = Math.asin(Math.max(-1.0, Math.min(1.0, s))) * R2D;
  let az_deg = Math.atan2(d0 * e[0] + d1 * e[1] + d2 * e[2], d0 * no[0] + d1 * no[1] + d2 * no[2]) * R2D;
  if (az_deg < 0.0) az_deg += 360.0;
  return { az_deg, el_deg, dist_km: n };
}

/** Python's float modulo: the result takes the sign of the divisor (JS `%` takes the dividend's). */
export function pymod(x: number, m: number): number {
  let r = x % m;
  if (r !== 0) {
    if (r < 0 !== m < 0) r += m;
  } else {
    r = m < 0 ? -0 : 0;
  }
  return r;
}

/** Great-circle angle between two points on the sphere, in degrees. */
export function great_circle_deg(lat1_deg: number, lon1_deg: number, lat2_deg: number, lon2_deg: number): number {
  const p1 = lat1_deg * D2R, p2 = lat2_deg * D2R, dl = (lon2_deg - lon1_deg) * D2R;
  const a = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(a))) * R2D;
}
