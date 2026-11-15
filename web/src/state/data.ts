// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Loaded data shared by every view, with caches for region and miss-grid files.
import { loadEphemeris, loadManifest, loadSites } from '../data/loaders';
import { loadMaskSet, resolveSite, siteMissGridId, type MaskSet, type Resolved } from '../data/sites';
import type { Ephemeris, Manifest, Site } from '../data/types';
import { Engine } from '../engine/client';
import type { Table } from '../engine/light';

export interface AppData {
  manifest: Manifest;
  eph: Ephemeris;
  table: Table;
  sites: Site[];
  engine: Engine;
  /** Names of loaded files that carry "fixture": true. */
  fixtureFiles: Set<string>;
  region(id: string): Promise<MaskSet>;
  missGrid(id: string): Promise<MaskSet>;
  /** Record that a file loaded later (validation, terrain) is fixture data, so the banner shows. */
  markFixture(name: string): void;
}

export async function loadAppData(onFixture: () => void): Promise<AppData> {
  const manifest = await loadManifest();
  const [eph, s] = await Promise.all([loadEphemeris(manifest), loadSites(manifest)]);
  const fixtureFiles = new Set<string>();
  if (manifest.fixture) fixtureFiles.add('manifest');
  if (eph.meta.fixture === true) fixtureFiles.add(manifest.files.ephemeris.meta);
  if (s.fixture || s.sites.some((x) => x.fixture === true)) fixtureFiles.add(manifest.files.sites);
  const table: Table = { data: eph.data, rows: eph.meta.row_count, step_s: eph.meta.step_s };
  const cache = new Map<string, Promise<MaskSet>>();
  const get = (kind: 'regions' | 'miss', id: string) => {
    const key = `${kind}/${id}`;
    if (!cache.has(key)) {
      const p = loadMaskSet(manifest, kind, id).then((set) => {
        if (set.meta.fixture === true) { fixtureFiles.add(key); onFixture(); }
        return set;
      });
      p.catch(() => cache.delete(key));
      cache.set(key, p);
    }
    return cache.get(key)!;
  };
  return {
    manifest, eph, table, sites: s.sites, engine: new Engine(table), fixtureFiles,
    region: (id) => get('regions', id),
    missGrid: (id) => get('miss', id),
    markFixture: (name) => { if (!fixtureFiles.has(name)) { fixtureFiles.add(name); onFixture(); } },
  };
}

/** Horizon label of a site whose terrain file failed to load (smooth horizon used instead). */
export const TERRAIN_MISSING_LABEL = 'Terrain file missing: smooth horizon used';

/**
 * Coordinates and horizon mask for a curated site, loading its miss grid or region file as needed.
 * Same priority as `resolveSite`. A file that fails to load falls through to the next option; if
 * no terrain is left after a failure, the smooth horizon is labelled "Terrain file missing".
 */
export async function resolveForSite(data: AppData, site: Site, observer_height_m: number): Promise<Resolved> {
  const listed = (id: string) => (data.manifest.files.miss ?? []).some((r) => r.id === id);
  let failed = false;
  const tryLoad = async (load: () => Promise<MaskSet>): Promise<MaskSet | null> => {
    try { return await load(); } catch { failed = true; return null; }
  };
  const gridId = siteMissGridId(site);
  if (gridId && listed(gridId)) {
    const grid = await tryLoad(() => data.missGrid(gridId));
    if (grid) return resolveSite(site, null, observer_height_m, grid);
  }
  if (site.region_id) {
    const region = await tryLoad(() => data.region(site.region_id!));
    if (region) return resolveSite(site, region, observer_height_m);
  }
  const target = site.miss_target_id;
  if (target && typeof site.miss_grid_id !== 'string' && listed(target)) {
    const grid = await tryLoad(() => data.missGrid(target));
    if (grid) return resolveSite(site, null, observer_height_m, grid);
  }
  const smooth = resolveSite(site, null, observer_height_m);
  return failed ? { ...smooth, horizonLabel: TERRAIN_MISSING_LABEL } : smooth;
}
