// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Mirrors pipeline/sunsight/contracts.py. tests/unit/contracts.test.ts checks they agree.
export const FORMAT_VERSION = 2; // v2: masks also ship as .masks.dz (delta + byte planes + gzip)
export const MOON_RADIUS_KM = 1737.4;
export const SUN_RADIUS_KM = 695_700.0;
export const EARTH_RADIUS_KM = 6_371.0;
export const BIN_COUNT = 1440;
export const MASK_SCALE_DEG = 0.001;
export const EPHEMERIS_COLUMNS = [
  'sun_x_km', 'sun_y_km', 'sun_z_km',
  'earth_x_km', 'earth_y_km', 'earth_z_km',
  'goldstone_x_km', 'goldstone_y_km', 'goldstone_z_km',
  'madrid_x_km', 'madrid_y_km', 'madrid_z_km',
  'canberra_x_km', 'canberra_y_km', 'canberra_z_km',
  'moon_el_goldstone_deg', 'moon_el_madrid_deg', 'moon_el_canberra_deg',
] as const;
export const N_COLS = EPHEMERIS_COLUMNS.length;
