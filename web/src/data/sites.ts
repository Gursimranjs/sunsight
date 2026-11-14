// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Site library and Anywhere mode: which mask and which point to use for a site or custom coordinates.
import { BIN_COUNT } from './contracts';
import { decodeMasks, DATA_BASE } from './loaders';
import type { Manifest, Site } from './types';
import { great_circle_deg } from '../engine/geometry';
import { flat_mask, smooth_horizon_deg } from '../engine/light';

/** A point with its own horizon masks (region point or miss-test grid point). */
export interface MaskPoint {
  id: string;
  lat_deg: number;
  lon_deg: number;
  height_m: number;
  east_m?: number;
  north_m?: number;
  [key: string]: unknown;
}

export interface MaskSetMeta {
  fixture?: boolean;
  id: string;
  name?: string;
  observer_heights_m: number[];
  bin_count: number;
  scale_deg: number;
  points: MaskPoint[];
  target?: { lat_deg: number; lon_deg: number };
  spacing_m?: number;
  radius_m?: number;
  target_site_id?: string;
  [key: string]: unknown;
}

/** Region or miss grid with its decoded masks (points x heights x bins, degrees). */
export interface MaskSet { meta: MaskSetMeta; masks: Float64Array }

export function maskOf(set: MaskSet, pointIndex: number, heightIndex: number): Float64Array {
  const nh = set.meta.observer_heights_m.length;
  const nb = set.meta.bin_count;
  const off = (pointIndex * nh + heightIndex) * nb;
  return set.masks.subarray(off, off + nb);
}

/** Index of the stored observer height closest to the one the rules ask for. */
export function heightIndex(heights_m: number[], observer_height_m: number): number {
  let best = 0;
  heights_m.forEach((h, i) => {
    if (Math.abs(h - observer_height_m) < Math.abs(heights_m[best] - observer_height_m)) best = i;
  });
  return best;
}

/** All masks of one height as a contiguous block (points x bins), for the miss-grid worker job. */
export function masksForHeight(set: MaskSet, hi: number): Float64Array {
  const n = set.meta.points.length;
  const out = new Float64Array(n * set.meta.bin_count);
  for (let i = 0; i < n; i++) out.set(maskOf(set, i, hi), i * set.meta.bin_count);
  return out;
}

export function nearestPoint(points: MaskPoint[], lat_deg: number, lon_deg: number): number {
  let best = 0;
  let bestD = Infinity;
  points.forEach((p, i) => {
    const d = great_circle_deg(lat_deg, lon_deg, p.lat_deg, p.lon_deg);
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

type Fetcher = (url: string) => Promise<Response>;

export async function loadMaskSet(
  m: Manifest, kind: 'regions' | 'miss', id: string, fetcher: Fetcher = fetch, base = DATA_BASE,
): Promise<MaskSet> {
  const ref = (m.files[kind] ?? []).find((r) => r.id === id);
  if (!ref || !ref.masks) throw new Error(`No ${kind} entry "${id}" in the manifest`);
  const meta = (await (await fetcher(base + ref.meta)).json()) as MaskSetMeta;
  const buf = await (await fetcher(base + ref.masks)).arrayBuffer();
  const masks = decodeMasks(buf, meta.scale_deg);
  const want = meta.points.length * meta.observer_heights_m.length * meta.bin_count;
  if (masks.length !== want) throw new Error(`${kind}/${id}: ${masks.length} mask values, expected ${want}`);
  if (meta.bin_count !== BIN_COUNT) throw new Error(`${kind}/${id}: bin_count ${meta.bin_count} != ${BIN_COUNT}`);
  return { meta, masks };
}

/** Where to evaluate: coordinates, ground height and the horizon mask, plus a label for the user. */
export interface Resolved {
  lat_deg: number;
  lon_deg: number;
  h_m: number;
  mask: Float64Array | number[];
  terrain: boolean;
  /** Plain-words description of the horizon used. */
  horizonLabel: string;
  pointId: string | null;
}

export const NO_TERRAIN_LABEL = 'No terrain: smooth horizon';

/** Anywhere mode: a smooth Moon with the horizon dip for this observer height. Ground height 0 m. */
export function resolveCustom(lat_deg: number, lon_deg: number, observer_height_m: number): Resolved {
  return {
    lat_deg, lon_deg, h_m: 0,
    mask: flat_mask(smooth_horizon_deg(observer_height_m)),
    terrain: false, horizonLabel: NO_TERRAIN_LABEL, pointId: null,
  };
}

/**
 * A curated site. With a region, use the point named by site.region_point_id if present, else the
 * nearest region point by great-circle distance, and that point's own coordinates and height (the
 * mask was computed there). Without a region, the smooth horizon at the site's coordinates and height.
 */
export function resolveSite(site: Site, region: MaskSet | null, observer_height_m: number): Resolved {
  if (site.region_id && region) {
    const pts = region.meta.points;
    const named = typeof site.region_point_id === 'string' ? pts.findIndex((p) => p.id === site.region_point_id) : -1;
    const i = named >= 0 ? named : nearestPoint(pts, site.lat_deg, site.lon_deg);
    const hi = heightIndex(region.meta.observer_heights_m, observer_height_m);
    const p = pts[i];
    return {
      lat_deg: p.lat_deg, lon_deg: p.lon_deg, h_m: p.height_m,
      mask: maskOf(region, i, hi), terrain: true,
      horizonLabel: `Terrain horizon from region "${region.meta.name ?? region.meta.id}", point ${p.id}, observer ${region.meta.observer_heights_m[hi]} m`,
      pointId: p.id,
    };
  }
  return { ...resolveCustom(site.lat_deg, site.lon_deg, observer_height_m), h_m: site.height_m };
}

/** Sites grouped by category, in first-seen order, for the picker. */
export function groupSites(sites: Site[]): { category: string; sites: Site[] }[] {
  const groups = new Map<string, Site[]>();
  for (const s of sites) {
    const c = s.category || 'other';
    if (!groups.has(c)) groups.set(c, []);
    groups.get(c)!.push(s);
  }
  return [...groups.entries()].map(([category, list]) => ({ category, sites: list }));
}

const CATEGORY_LABELS: Record<string, string> = {
  artemis: 'Artemis III candidate regions',
  artemis_iii: 'Artemis III candidate regions',
  moon_base: 'Moon Base targets',
  apollo: 'Apollo landings',
  clps: 'Commercial (CLPS) missions',
  commercial: 'Commercial missions',
  international: 'Other countries’ landings',
  fixture: 'Fixture sites (made-up)',
};

export function categoryLabel(c: string): string {
  return CATEGORY_LABELS[c] ?? c.replace(/_/g, ' ').replace(/^./, (x) => x.toUpperCase());
}

export function validLatLon(lat_deg: number, lon_deg: number): boolean {
  return Number.isFinite(lat_deg) && Number.isFinite(lon_deg) && lat_deg >= -90 && lat_deg <= 90 && lon_deg >= -180 && lon_deg <= 360;
}
