// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Review fix 1: a site resolves to its miss-grid point when that point is within 40 m of the cited
// coordinates, then to its region point (labelled with the distance), then to the grid centre, then
// to the smooth horizon. The optional sites.json fields may be absent.
import { describe, expect, it } from 'vitest';
import { loadSites } from '../../src/data/loaders';
import {
  loadMaskSet, maskOf, MISS_CENTRE_LABEL, MISS_POINT_MAX_OFFSET_M, NO_TERRAIN_LABEL, resolveSite,
} from '../../src/data/sites';
import type { Site } from '../../src/data/types';
import { resolveForSite, type AppData } from '../../src/state/data';
import { DATA, fileFetcher, fixtureManifest } from './helpers';

async function fixture() {
  const m = fixtureManifest();
  const { sites } = await loadSites(m, fileFetcher, DATA);
  const data = {
    manifest: m, sites,
    region: (id: string) => loadMaskSet(m, 'regions', id, fileFetcher, DATA),
    missGrid: (id: string) => loadMaskSet(m, 'miss', id, fileFetcher, DATA),
  } as unknown as AppData;
  const grid = await loadMaskSet(m, 'miss', 'fixture_target', fileFetcher, DATA);
  const region = await loadMaskSet(m, 'regions', 'fixture_ridge', fileFetcher, DATA);
  const byId = (id: string) => sites.find((s) => s.id === id)!;
  return { sites, data, grid, region, byId };
}

const gi = (grid: { meta: { points: { id: string }[] } }, id: string) => grid.meta.points.findIndex((p) => p.id === id);

describe('miss-grid point first (offset <= 40 m)', () => {
  it('uses the named grid point, its coordinates, height and mask at the nearest stored height', async () => {
    const { grid, byId } = await fixture();
    const site: Site = { ...byId('fixture_target'), miss_grid_id: 'fixture_target', miss_point_id: 'g41', miss_point_offset_m: 25.4 };
    const i = gi(grid, 'g41');
    const p = grid.meta.points[i];
    for (const [h, hi] of [[2, 0], [10, 1], [7, 1]] as const) {
      const r = resolveSite(site, null, h, grid);
      expect(r.terrain).toBe(true);
      expect([r.lat_deg, r.lon_deg, r.h_m, r.pointId]).toEqual([p.lat_deg, p.lon_deg, p.height_m, 'g41']);
      expect(Array.from(r.mask)).toEqual(Array.from(maskOf(grid, i, hi)));
      expect(r.horizonLabel).toBe('Terrain horizon from the miss-test grid (10 m map), point g41 (25 m from the cited site)');
      expect(r.maskKey).toBe(`miss:fixture_target/g41@${grid.meta.observer_heights_m[hi]}`);
    }
  });

  it('omits the distance below 1 m and treats a missing offset as 0', async () => {
    const { grid, byId } = await fixture();
    const base = byId('fixture_target');
    const zero = resolveSite({ ...base, miss_grid_id: 'fixture_target', miss_point_id: 'g40', miss_point_offset_m: 0 }, null, 2, grid);
    expect(zero.horizonLabel).toBe('Terrain horizon from the miss-test grid (10 m map), point g40');
    const sub = resolveSite({ ...base, miss_grid_id: 'fixture_target', miss_point_id: 'g40', miss_point_offset_m: 0.6 }, null, 2, grid);
    expect(sub.horizonLabel).toBe('Terrain horizon from the miss-test grid (10 m map), point g40');
    const missing = resolveSite({ ...base, miss_grid_id: 'fixture_target', miss_point_id: 'g31' }, null, 2, grid);
    expect(missing.pointId).toBe('g31');
  });

  it('wins over a region point (the Shackleton ridge case)', async () => {
    const { data, byId } = await fixture();
    const ridge: Site = { ...byId('fixture_ridge'), region_point_offset_m: 298, miss_grid_id: 'fixture_target', miss_point_id: 'g41', miss_point_offset_m: MISS_POINT_MAX_OFFSET_M };
    const r = await resolveForSite(data, ridge, 2);
    expect(r.pointId).toBe('g41');
    expect(r.horizonLabel).toMatch(/^Terrain horizon from the miss-test grid \(10 m map\), point g41 \(40 m from the cited site\)$/);
  });

  it('beyond 40 m falls back to the region point, labelled with its distance', async () => {
    const { data, region, byId } = await fixture();
    const ridge: Site = { ...byId('fixture_ridge'), region_point_offset_m: 298.4, miss_grid_id: 'fixture_target', miss_point_id: 'g41', miss_point_offset_m: 40.5 };
    const r = await resolveForSite(data, ridge, 10);
    const direct = resolveSite(ridge, region, 10);
    expect(r.pointId).toBe(direct.pointId);
    expect(r.pointId).toMatch(/^p\d+$/);
    expect(r.horizonLabel).toBe(`Terrain horizon from region "Fixture ridge (made-up)", nearest region point ${r.pointId}, 298 m from the cited site, observer 10 m`);
    expect(r.maskKey).toBe(`region:fixture_ridge/${r.pointId}@10`);
  });

  it('a region point within 1 m (or with no offset field) keeps the short label', async () => {
    const { region, byId } = await fixture();
    const site = byId('fixture_ridge');
    const plain = resolveSite(site, region, 2);
    expect(plain.horizonLabel).toBe(`Terrain horizon from region "Fixture ridge (made-up)", point ${plain.pointId}, observer 2 m`);
    expect(resolveSite({ ...site, region_point_offset_m: 0.4 }, region, 2).horizonLabel).toBe(plain.horizonLabel);
  });

  it('a miss grid that is not in the manifest falls back to the region', async () => {
    const { data, byId } = await fixture();
    const r = await resolveForSite(data, { ...byId('fixture_ridge'), miss_grid_id: 'nope', miss_point_id: 'g1', miss_point_offset_m: 3 }, 2);
    expect(r.horizonLabel).toMatch(/^Terrain horizon from region/);
  });
});

describe('older sites.json without the new fields', () => {
  it('keeps region > miss-grid centre > smooth horizon', async () => {
    const { data, byId } = await fixture();
    expect((await resolveForSite(data, byId('fixture_target'), 2)).horizonLabel).toBe(MISS_CENTRE_LABEL);
    expect((await resolveForSite(data, byId('fixture_ridge'), 2)).horizonLabel).toMatch(/^Terrain horizon from region/);
    const smooth = await resolveForSite(data, byId('fixture_equator'), 2);
    expect(smooth.horizonLabel).toBe(NO_TERRAIN_LABEL);
    expect(smooth.maskKey).toMatch(/^smooth:-0\.08/);
  });

  it('a site whose grid point is too far and has no region uses the smooth horizon, not the grid centre', async () => {
    const { data, byId } = await fixture();
    const far: Site = { ...byId('fixture_equator'), miss_target_id: null, miss_grid_id: 'fixture_target', miss_point_id: 'g40', miss_point_offset_m: 120 };
    expect((await resolveForSite(data, far, 2)).horizonLabel).toBe(NO_TERRAIN_LABEL);
  });

  it('Athena-style resting place: a point in another site\'s grid', async () => {
    const { data, grid, byId } = await fixture();
    const rest: Site = { ...byId('fixture_equator'), id: 'fixture_rest', miss_grid_id: 'fixture_target', miss_point_id: 'g31', miss_point_offset_m: 12.2 };
    const r = await resolveForSite(data, rest, 2);
    expect(r.pointId).toBe('g31');
    expect(r.lat_deg).toBe(grid.meta.points[gi(grid, 'g31')].lat_deg);
    expect(r.horizonLabel).toBe('Terrain horizon from the miss-test grid (10 m map), point g31 (12 m from the cited site)');
  });
});
