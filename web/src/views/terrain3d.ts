// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Geometry for the 3D hero view, kept free of Three.js so it can be unit-tested in node.
//
// Scene axes (metres, origin at the terrain cut's centre): X = map x, Y = height above the centre's
// ground, Z = -map y. The map is LOLA south polar stereographic: +y toward 0° longitude, +x toward 90°E.
import { MOON_RADIUS_KM } from '../data/contracts';

export interface TerrainMeta {
  fixture?: boolean;
  site_id: string;
  size: number;
  spacing_m: number;
  center: { lat_deg: number; lon_deg: number; map_x_m?: number; map_y_m?: number };
  row_order?: string;
  col_order?: string;
  units?: string;
  [key: string]: unknown;
}

const D = Math.PI / 180;
const R_M = MOON_RADIUS_KM * 1000;

/** South polar stereographic (true scale at the pole, sphere of 1737.4 km): map x, y in metres. */
export function latLonToMap(lat_deg: number, lon_deg: number): [number, number] {
  const rho_m = 2 * R_M * Math.tan(Math.PI / 4 + (lat_deg * D) / 2);
  return [rho_m * Math.sin(lon_deg * D), rho_m * Math.cos(lon_deg * D)];
}

export function mapToLatLon(x_m: number, y_m: number): [number, number] {
  const rho_m = Math.hypot(x_m, y_m);
  const lat_deg = (2 * Math.atan(rho_m / (2 * R_M)) - Math.PI / 2) / D;
  return [lat_deg, Math.atan2(x_m, y_m) / D];
}

export function terrainCentreMap(m: Pick<TerrainMeta, 'center'>): [number, number] {
  const c = m.center;
  return typeof c.map_x_m === 'number' && typeof c.map_y_m === 'number' ? [c.map_x_m, c.map_y_m] : latLonToMap(c.lat_deg, c.lon_deg);
}

/** Map position to scene X, Z (Y = 0), relative to the terrain centre. */
export function mapToScene(xy_m: [number, number], centre_m: [number, number]): [number, number, number] {
  return [xy_m[0] - centre_m[0], 0, -(xy_m[1] - centre_m[1])];
}

/**
 * Unit vector in scene axes for a sky direction given in the local east-north-up frame at a point
 * of longitude lon_deg: local north = map (sin λ, cos λ), local east = map (cos λ, -sin λ), up = +Y.
 */
export function azElToScene(az_deg: number, el_deg: number, lon_deg: number): [number, number, number] {
  const e = Math.cos(el_deg * D) * Math.sin(az_deg * D);
  const n = Math.cos(el_deg * D) * Math.cos(az_deg * D);
  const u = Math.sin(el_deg * D);
  const sl = Math.sin(lon_deg * D), cl = Math.cos(lon_deg * D);
  const mx = e * cl + n * sl;
  const my = -e * sl + n * cl;
  return [mx, u, -my];
}

/** Heights in metres, row-major, row 0 = largest map y, columns increasing map x. */
export function decodeTerrain(buf: ArrayBuffer, m: Pick<TerrainMeta, 'size'>): Int16Array {
  const want = m.size * m.size * 2;
  if (buf.byteLength !== want) throw new Error(`Terrain file is ${buf.byteLength} bytes, expected ${want}`);
  return new Int16Array(buf);
}

/** Scene position of grid node (row, col) with height h_m (Y is h_m minus the given base height). */
export function vertexScene(row: number, col: number, y_m: number, m: Pick<TerrainMeta, 'size' | 'spacing_m'>): [number, number, number] {
  const half = (m.size - 1) / 2;
  return [(col - half) * m.spacing_m, y_m, (row - half) * m.spacing_m];
}

/** Ground height (metres, file units) at scene X, Z by bilinear interpolation; null outside the grid. */
export function groundHeight(h: ArrayLike<number>, m: Pick<TerrainMeta, 'size' | 'spacing_m'>, x_m: number, z_m: number): number | null {
  const half = (m.size - 1) / 2;
  const c = x_m / m.spacing_m + half, r = z_m / m.spacing_m + half;
  if (!(c >= 0 && r >= 0 && c <= m.size - 1 && r <= m.size - 1)) return null;
  const c0 = Math.min(Math.floor(c), m.size - 2), r0 = Math.min(Math.floor(r), m.size - 2);
  const fc = c - c0, fr = r - r0;
  const n = m.size;
  const a = h[r0 * n + c0], b = h[r0 * n + c0 + 1], cc = h[(r0 + 1) * n + c0], d = h[(r0 + 1) * n + c0 + 1];
  if (fc === 0 && fr === 0) return a;
  return (1 - fr) * ((1 - fc) * a + fc * b) + fr * ((1 - fc) * cc + fc * d);
}

/** Smallest and largest height in the grid. */
export function heightRange(h: ArrayLike<number>): [number, number] {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < h.length; i++) { if (h[i] < lo) lo = h[i]; if (h[i] > hi) hi = h[i]; }
  return [lo, hi];
}
