// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Single-instant look-ups that are cheap enough for the UI thread (slider, Anywhere mode).
import { EARTH_RADIUS_KM, SUN_RADIUS_KM } from '../data/contracts';
import { angular_radius, az_el, interp, local_frame, site_vector, type Table } from './light';

export interface SkyBody { az_deg: number; el_deg: number; r_deg: number; dist_km: number }
export interface Sky { sun: SkyBody; earth: SkyBody }

/** Sun and Earth as seen from any latitude/longitude at t_s seconds after the table's first row. */
export function skyAt(table: Table, t_s: number, lat_deg: number, lon_deg: number, h_m: number): Sky {
  const row = interp(table, t_s);
  const site = site_vector(lat_deg, lon_deg, h_m);
  const f = local_frame(lat_deg, lon_deg);
  const s = az_el(row, site, f, 0);
  const e = az_el(row, site, f, 3);
  return {
    sun: { ...s, r_deg: angular_radius(SUN_RADIUS_KM, s.dist_km) },
    earth: { ...e, r_deg: angular_radius(EARTH_RADIUS_KM, e.dist_km) },
  };
}

/** Angle between two sky directions given as azimuth/elevation, in degrees. */
export function skySeparation(az1_deg: number, el1_deg: number, az2_deg: number, el2_deg: number): number {
  const d = Math.PI / 180;
  const c = Math.sin(el1_deg * d) * Math.sin(el2_deg * d) + Math.cos(el1_deg * d) * Math.cos(el2_deg * d) * Math.cos((az1_deg - az2_deg) * d);
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}
