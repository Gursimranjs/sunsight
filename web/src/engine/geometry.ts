// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Function contracts from docs/BUILD_PLAN.md. Angles in degrees, distances in km.
import { MOON_RADIUS_KM } from '../data/contracts';

export type Vec3 = [number, number, number];
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

export function site_vector(lat_deg: number, lon_deg: number, h_m: number): Vec3 {
  const r_km = MOON_RADIUS_KM + h_m / 1000;
  const la = lat_deg * D2R, lo = lon_deg * D2R;
  return [r_km * Math.cos(la) * Math.cos(lo), r_km * Math.cos(la) * Math.sin(lo), r_km * Math.sin(la)];
}

export interface Frame { east: Vec3; north: Vec3; up: Vec3 }

export function local_frame(lat_deg: number, lon_deg: number): Frame {
  const la = lat_deg * D2R, lo = lon_deg * D2R;
  return {
    east: [-Math.sin(lo), Math.cos(lo), 0],
    north: [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)],
    up: [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)],
  };
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Azimuth (clockwise from local north, 0..360) and elevation of target as seen from site. */
export function az_el(target: Vec3, site: Vec3, frame: Frame): { az_deg: number; el_deg: number; dist_km: number } {
  const d: Vec3 = [target[0] - site[0], target[1] - site[1], target[2] - site[2]];
  const n = Math.hypot(d[0], d[1], d[2]);
  const el_deg = Math.asin(Math.max(-1, Math.min(1, dot(d, frame.up) / n))) * R2D;
  let az_deg = Math.atan2(dot(d, frame.east), dot(d, frame.north)) * R2D;
  if (az_deg < 0) az_deg += 360;
  return { az_deg, el_deg, dist_km: n };
}
