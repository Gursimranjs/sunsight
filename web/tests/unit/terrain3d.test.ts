// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// P18: the geometry behind the 3D view (no WebGL needed): map projection, sky direction to scene
// axes, grid layout and ground height.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { local_frame } from '../../src/engine/light';
import {
  azElToScene, decodeTerrain, groundHeight, latLonToMap, mapToLatLon, mapToScene, terrainCentreMap, vertexScene,
  type TerrainMeta,
} from '../../src/views/terrain3d';
import { DATA, readBuf, readJson } from './helpers';

const REAL = new URL('../../public/data/terrain/', import.meta.url).pathname;
const realMetas = readdirSync(REAL).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(REAL + f, 'utf8')) as TerrainMeta);
const D = Math.PI / 180;

/** Point at great-circle distance dist_m and bearing az_deg (clockwise from north) from lat/lon, on the sphere. */
function destination(lat_deg: number, lon_deg: number, az_deg: number, dist_m: number): [number, number] {
  const f = local_frame(lat_deg, lon_deg);
  const d = dist_m / 1737400;
  const v = [0, 1, 2].map((k) => Math.cos(d) * f.up[k] + Math.sin(d) * (Math.sin(az_deg * D) * f.east[k] + Math.cos(az_deg * D) * f.north[k]));
  return [Math.asin(v[2]) / D, Math.atan2(v[1], v[0]) / D];
}

describe('3D view geometry', () => {
  it('south polar stereographic reproduces every shipped terrain centre to within 1 m', () => {
    expect(realMetas.length).toBeGreaterThan(0);
    for (const m of realMetas) {
      const c = m.center as Required<TerrainMeta['center']>;
      const [x, y] = latLonToMap(c.lat_deg, c.lon_deg);
      expect(Math.abs(x - c.map_x_m)).toBeLessThan(1);
      expect(Math.abs(y - c.map_y_m)).toBeLessThan(1);
      const [lat, lon] = mapToLatLon(x, y);
      expect(Math.abs(lat - c.lat_deg)).toBeLessThan(1e-9);
      expect(Math.abs(((lon - c.lon_deg + 540) % 360) - 180)).toBeLessThan(1e-9);
    }
  });

  it('a sky direction lands on the scene axis the stated formulas give', () => {
    const near = (a: number[], b: number[]) => a.forEach((x, i) => expect(Math.abs(x - b[i])).toBeLessThan(1e-12));
    near(azElToScene(0, 0, 0), [0, 0, -1]); // north at lon 0 = map +y = scene -z
    near(azElToScene(90, 0, 0), [1, 0, 0]); // east at lon 0 = map +x
    near(azElToScene(0, 0, 90), [1, 0, 0]); // north at lon 90 = map (sin 90, cos 90) = +x
    near(azElToScene(90, 0, 90), [0, 0, 1]); // east at lon 90 = map (cos 90, -sin 90) = -y = scene +z
    near(azElToScene(123, 90, 47), [0, 1, 0]);
    const v = azElToScene(211, 1.5, 173.66);
    expect(Math.hypot(...v)).toBeCloseTo(1, 12);
    expect(Math.asin(v[1]) / D).toBeCloseTo(1.5, 10);
  });

  it('a ground point 1 km away at bearing az appears in the scene at bearing az (within 0.05°)', () => {
    for (const m of realMetas) {
      const { lat_deg, lon_deg } = m.center;
      const c = terrainCentreMap(m);
      for (const az of [0, 37, 90, 145, 180, 260, 333]) {
        const [lat, lon] = destination(lat_deg, lon_deg, az, 1000);
        const [sx, , sz] = mapToScene(latLonToMap(lat, lon), c);
        const dir = azElToScene(az, 0, lon_deg);
        const ang = Math.atan2(sx * dir[2] - sz * dir[0], sx * dir[0] + sz * dir[2]) / D;
        expect(Math.abs(ang)).toBeLessThan(0.05);
        expect(Math.abs(Math.hypot(sx, sz) - 1000)).toBeLessThan(5); // stereographic scale near the pole ≈ 1
      }
    }
  });

  it('grid: row 0 is the largest map y (most negative scene z), columns increase map x', () => {
    const m = { size: 512, spacing_m: 20 } as TerrainMeta;
    const [x0, , z0] = vertexScene(0, 0, 0, m);
    const [x1, , z1] = vertexScene(511, 511, 0, m);
    expect(x0).toBeCloseTo(-5110, 9);
    expect(z0).toBeCloseTo(-5110, 9);
    expect(x1).toBeCloseTo(5110, 9);
    expect(z1).toBeCloseTo(5110, 9);
  });

  it('decodes the fixture terrain, rejects a wrong size and interpolates ground height bilinearly', () => {
    const meta = readJson<TerrainMeta>('terrain/fixture_target.json');
    const buf = readBuf('terrain/fixture_target.bin');
    const h = decodeTerrain(buf, meta);
    expect(h.length).toBe(512 * 512);
    expect(() => decodeTerrain(buf.slice(0, 100), meta)).toThrow();
    const n = meta.size, s = meta.spacing_m, half = (n - 1) / 2;
    // At a node the height is that node's value.
    const [x, , z] = vertexScene(100, 200, 0, meta);
    expect(groundHeight(h, meta, x, z)).toBe(h[100 * n + 200]);
    // Halfway between four nodes it is their mean.
    const g = groundHeight(h, meta, (200.5 - half) * s, (100.5 - half) * s);
    expect(g).toBeCloseTo((h[100 * n + 200] + h[100 * n + 201] + h[101 * n + 200] + h[101 * n + 201]) / 4, 9);
    // Outside the patch: null.
    expect(groundHeight(h, meta, 6000, 0)).toBeNull();
    void DATA;
  });
});
