// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Site library and Anywhere mode: which mask and which point to use for a site or custom coordinates.
import { BIN_COUNT } from './contracts';
import { canGunzip, decodeMasks, DATA_BASE, gunzip, undeltaMasks } from './loaders';
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
  // Format v2: prefer the compressed .masks.dz (about 40% of the raw size); fall back to the raw .bin.
  const buf = ref.masks_dz && canGunzip()
    ? undeltaMasks(await gunzip(await (await fetcher(base + ref.masks_dz)).arrayBuffer()), meta.bin_count)
    : await (await fetcher(base + ref.masks)).arrayBuffer();
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
  /**
   * Identity of the mask actually used: "miss:<grid>/<point>@<stored height m>",
   * "region:<region>/<point>@<stored height m>" or "smooth:<dip deg>". Freshness keys include it.
   */
  maskKey: string;
}

export const NO_TERRAIN_LABEL = 'No terrain: smooth horizon';

/** Anywhere mode: a smooth Moon with the horizon dip for this observer height. Ground height 0 m. */
export function resolveCustom(lat_deg: number, lon_deg: number, observer_height_m: number): Resolved {
  const dip_deg = smooth_horizon_deg(observer_height_m);
  return {
    lat_deg, lon_deg, h_m: 0,
    mask: flat_mask(dip_deg),
    terrain: false, horizonLabel: NO_TERRAIN_LABEL, pointId: null, maskKey: `smooth:${dip_deg}`,
  };
}

export const MISS_CENTRE_LABEL = 'Terrain horizon from the miss-test grid (target point)';

/** A site uses its miss-grid point only when that point lies within this distance of the cited coordinates. */
export const MISS_POINT_MAX_OFFSET_M = 40;

/** Index of the miss grid's centre point (east 0 m, north 0 m), or -1. */
export function missCentreIndex(grid: MaskSet): number {
  return grid.meta.points.findIndex((p) => (p.east_m ?? NaN) === 0 && (p.north_m ?? NaN) === 0);
}

const finiteOr0 = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
const str = (x: unknown): string | null => (typeof x === 'string' && x !== '' ? x : null);

/** The miss grid this site is evaluated in (sites.json `miss_grid_id`), when its point is within 40 m. */
export function siteMissGridId(site: Site): string | null {
  const id = str(site.miss_grid_id);
  return id && finiteOr0(site.miss_point_offset_m) <= MISS_POINT_MAX_OFFSET_M ? id : null;
}

/** "10 m map" from the grid's near-field terrain file name (e.g. LDEM_83S_10MPP_ADJ.TIF); 10 m when not stated. */
function nearFieldMapLabel(grid: MaskSet): string {
  const t = grid.meta.terrain as { near_field?: unknown } | undefined;
  const m = typeof t?.near_field === 'string' ? /_(\d+)MPP/i.exec(t.near_field) : null;
  return `${m ? Number(m[1]) : 10} m map`;
}

const fromCited = (offset_m: number) => `${Math.round(offset_m)} m from the cited site`;
const sameId = (set: MaskSet, id: string) => set.meta.id === undefined || set.meta.id === id;

function fromPoint(set: MaskSet, kind: 'miss' | 'region', i: number, observer_height_m: number, label: (p: MaskPoint, stored_m: number) => string): Resolved {
  const p = set.meta.points[i];
  const hi = heightIndex(set.meta.observer_heights_m, observer_height_m);
  const stored_m = set.meta.observer_heights_m[hi];
  return {
    lat_deg: p.lat_deg, lon_deg: p.lon_deg, h_m: p.height_m,
    mask: maskOf(set, i, hi), terrain: true, horizonLabel: label(p, stored_m), pointId: p.id,
    maskKey: `${kind}:${set.meta.id}/${p.id}@${stored_m}`,
  };
}

/**
 * Where to evaluate a curated site. Priority:
 * (a) `miss_grid_id` with `miss_point_offset_m` <= 40 m (a missing offset counts as 0): that grid point
 *     (`miss_point_id`, else the grid point nearest the site);
 * (b) the region point (`region_point_id`, else the nearest), labelled with `region_point_offset_m` when >= 1 m;
 * (c) `miss_target_id` and no `miss_grid_id`: the centre point of that grid;
 * (d) the smooth horizon at the site's own coordinates and height.
 * Every terrain option uses the point's own coordinates and height (the mask was computed there).
 * `missGrid` is the grid named by `miss_grid_id` for (a), or by `miss_target_id` for (c).
 */
export function resolveSite(site: Site, region: MaskSet | null, observer_height_m: number, missGrid: MaskSet | null = null): Resolved {
  const gridId = siteMissGridId(site);
  if (gridId && missGrid && sameId(missGrid, gridId)) {
    const pts = missGrid.meta.points;
    const pid = str(site.miss_point_id);
    const named = pid ? pts.findIndex((p) => p.id === pid) : -1;
    const i = named >= 0 ? named : nearestPoint(pts, site.lat_deg, site.lon_deg);
    const offset_m = finiteOr0(site.miss_point_offset_m);
    const map = nearFieldMapLabel(missGrid);
    return fromPoint(missGrid, 'miss', i, observer_height_m, (p) =>
      `Terrain horizon from the miss-test grid (${map}), point ${p.id}${offset_m >= 1 ? ` (${fromCited(offset_m)})` : ''}`);
  }
  if (site.region_id && region) {
    const pts = region.meta.points;
    const named = typeof site.region_point_id === 'string' ? pts.findIndex((p) => p.id === site.region_point_id) : -1;
    const i = named >= 0 ? named : nearestPoint(pts, site.lat_deg, site.lon_deg);
    const offset_m = finiteOr0(site.region_point_offset_m);
    const name = region.meta.name ?? region.meta.id;
    return fromPoint(region, 'region', i, observer_height_m, (p, stored_m) => (offset_m >= 1
      ? `Terrain horizon from region "${name}", nearest region point ${p.id}, ${fromCited(offset_m)}, observer ${stored_m} m`
      : `Terrain horizon from region "${name}", point ${p.id}, observer ${stored_m} m`));
  }
  if (site.miss_target_id && !str(site.miss_grid_id) && missGrid && sameId(missGrid, site.miss_target_id)) {
    const i = missCentreIndex(missGrid);
    if (i >= 0) return fromPoint(missGrid, 'miss', i, observer_height_m, () => MISS_CENTRE_LABEL);
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
  artemis_region: 'Artemis III candidate regions',
  polar_feature: 'South polar features',
  moon_base: 'Moon Base targets',
  apollo: 'Apollo landings',
  clps: 'Commercial (CLPS) missions',
  commercial: 'Commercial missions',
  international: 'Other countries’ landings',
  fixture: 'Fixture sites (made-up)',
};

/** Label for a category: the sites file's own `category_label` if any, else ours, else the id tidied. */
export function categoryLabel(c: string, sites: Site[] = []): string {
  const own = sites.find((s) => s.category === c && typeof s.category_label === 'string')?.category_label as string | undefined;
  return own ?? CATEGORY_LABELS[c] ?? c.replace(/_/g, ' ').replace(/^./, (x) => x.toUpperCase());
}

export function validLatLon(lat_deg: number, lon_deg: number): boolean {
  return Number.isFinite(lat_deg) && Number.isFinite(lon_deg) && lat_deg >= -90 && lat_deg <= 90 && lon_deg >= -180 && lon_deg <= 360;
}
