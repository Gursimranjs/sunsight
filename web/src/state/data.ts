// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Loaded data shared by every view, with caches for region and miss-grid files.
import type { EphemerisStore } from '../data/ephemerisStore';
import { loadEphemerisStore, loadManifest, loadSites } from '../data/loaders';
import { loadMaskSet, resolveSite, siteMissGridId, type MaskSet, type Resolved } from '../data/sites';
import type { Ephemeris, Manifest, Site } from '../data/types';
import { Engine } from '../engine/client';
import type { Table } from '../engine/light';

export interface AppData {
  manifest: Manifest;
  eph: Ephemeris;
  /** The engine's table; rows are filled a year at a time by `store`. Call ensureRange before reading it. */
  table: Table;
  store: EphemerisStore;
  /** Fetch the year files every interpolation in [start_s, end_s] reads (deduplicated); resolves when filled. */
  ensureRange(start_s: number, end_s: number): Promise<void>;
  /** True when every row [start_s, end_s] needs is already filled. */
  hasRange(start_s: number, end_s: number): boolean;
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
  // Only the table's metadata here: the year files load on demand (the scenario's year first, then the
  // rest in the background once the first answer is on screen; see App).
  const [{ eph, store }, s] = await Promise.all([loadEphemerisStore(manifest), loadSites(manifest)]);
  const fixtureFiles = new Set<string>();
  if (manifest.fixture) fixtureFiles.add('manifest');
  if (eph.meta.fixture === true) fixtureFiles.add(manifest.files.ephemeris.meta);
  if (s.fixture || s.sites.some((x) => x.fixture === true)) fixtureFiles.add(manifest.files.sites);
  const table: Table = store.table;
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
    manifest, eph, table, store, sites: s.sites, engine: new Engine(table, store), fixtureFiles,
    ensureRange: (a, b) => store.ensureRange(a, b),
    hasRange: (a, b) => store.has(a, b),
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
