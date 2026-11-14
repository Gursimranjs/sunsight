// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Site resolution priority: region point, then the miss grid's centre point, then the smooth horizon.
import { describe, expect, it } from 'vitest';
import { loadSites } from '../../src/data/loaders';
import { loadMaskSet, maskOf, missCentreIndex, MISS_CENTRE_LABEL, NO_TERRAIN_LABEL, resolveSite } from '../../src/data/sites';
import { resolveForSite, type AppData } from '../../src/state/data';
import { DATA, fileFetcher, fixtureManifest } from './helpers';

async function fixtureData() {
  const m = fixtureManifest();
  const { sites } = await loadSites(m, fileFetcher, DATA);
  const data = {
    manifest: m, sites,
    region: (id: string) => loadMaskSet(m, 'regions', id, fileFetcher, DATA),
    missGrid: (id: string) => loadMaskSet(m, 'miss', id, fileFetcher, DATA),
  } as unknown as AppData;
  return { m, sites, data };
}

describe('site with a miss grid and no region', () => {
  it('resolves to the grid centre point with its own masks at the chosen height', async () => {
    const { m, sites } = await fixtureData();
    const site = sites.find((s) => s.id === 'fixture_target')!;
    expect(site.region_id).toBeNull();
    const grid = await loadMaskSet(m, 'miss', site.miss_target_id!, fileFetcher, DATA);
    const i = missCentreIndex(grid);
    const p = grid.meta.points[i];
    expect([p.east_m, p.north_m]).toEqual([0, 0]);
    for (const [h, hi] of [[2, 0], [10, 1]] as const) {
      const r = resolveSite(site, null, h, grid);
      expect(r.terrain).toBe(true);
      expect(r.horizonLabel).toBe(MISS_CENTRE_LABEL);
      expect([r.lat_deg, r.lon_deg, r.h_m, r.pointId]).toEqual([p.lat_deg, p.lon_deg, p.height_m, p.id]);
      expect(Array.from(r.mask)).toEqual(Array.from(maskOf(grid, i, hi)));
    }
  });

  it('resolveForSite applies the priority: region, then miss-grid centre, then smooth horizon', async () => {
    const { sites, data } = await fixtureData();
    const target = await resolveForSite(data, sites.find((s) => s.id === 'fixture_target')!, 2);
    expect(target.horizonLabel).toBe(MISS_CENTRE_LABEL);
    const ridge = await resolveForSite(data, sites.find((s) => s.id === 'fixture_ridge')!, 2);
    expect(ridge.horizonLabel).toMatch(/^Terrain horizon from region/);
    // A site with both a region and a miss grid uses the region.
    const both = await resolveForSite(data, { ...sites.find((s) => s.id === 'fixture_ridge')!, miss_target_id: 'fixture_target' }, 2);
    expect(both.horizonLabel).toMatch(/^Terrain horizon from region/);
    const plain = await resolveForSite(data, sites.find((s) => s.id === 'fixture_equator')!, 2);
    expect(plain.horizonLabel).toBe(NO_TERRAIN_LABEL);
    // A miss_target_id the manifest does not list: smooth horizon, no error.
    const unknown = await resolveForSite(data, { ...sites.find((s) => s.id === 'fixture_equator')!, miss_target_id: 'nope' }, 2);
    expect(unknown.horizonLabel).toBe(NO_TERRAIN_LABEL);
  });
});
