// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Loaded data shared by every view, with caches for region and miss-grid files.
import { loadEphemeris, loadManifest, loadSites } from '../data/loaders';
import { loadMaskSet, type MaskSet } from '../data/sites';
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
  };
}
