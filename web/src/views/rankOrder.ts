// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// The "which sites work on this date?" ranking without the view: which curated sites are ranked,
// which are not and why, the rows built from engine answers, and their order (verdict, then score).
import { siteMissGridId } from '../data/sites';
import type { Site } from '../data/types';
import type { VerdictKind } from '../engine/light';
import { TERRAIN_MISSING_LABEL } from '../state/data';

/** go before marginal before no-go. */
export const VERDICT_ORDER: Record<VerdictKind, number> = { go: 0, marginal: 1, 'no-go': 2 };

const scoreOr = (x: number) => (Number.isFinite(x) ? x : -Infinity);

/**
 * A sorted copy: by verdict (go, marginal, no-go), then by score, highest first. A score that is
 * not a number sorts last within its verdict; equal rows keep their input order.
 */
export function sortRanked<T extends { verdict: VerdictKind; score: number }>(rows: T[]): T[] {
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) =>
      VERDICT_ORDER[a.r.verdict] - VERDICT_ORDER[b.r.verdict]
      || scoreOr(b.r.score) - scoreOr(a.r.score)
      || a.i - b.i)
    .map((x) => x.r);
}

/**
 * True when resolving this site may load a terrain file: a miss grid within 40 m, a region, or a
 * miss-grid target. Only these sites take time in the "loading horizon masks" phase.
 */
export function mayHaveTerrain(site: Pick<Site, 'region_id' | 'miss_target_id' | 'miss_grid_id' | 'miss_point_offset_m'>): boolean {
  return !!(siteMissGridId(site as Site) || site.region_id || site.miss_target_id);
}

/** What the ranking needs from a resolved place. */
export interface RankPlace { terrain: boolean; horizonLabel: string }

export interface RankSplit<S, P> {
  /** Sites with a terrain horizon, in input order, with their resolved place: these are ranked. */
  withTerrain: { site: S; place: P }[];
  /** Names of sites whose terrain file could not be loaded (not ranked). */
  failed: string[];
  /** Sites with no terrain horizon masks in this data set (not ranked, not counted in `failed`). */
  unranked: number;
}

/** Splits curated sites by their resolved places; `unranked + failed.length + withTerrain.length === sites.length`. */
export function splitForRanking<S extends { name: string }, P extends RankPlace>(sites: S[], places: P[]): RankSplit<S, P> {
  if (places.length !== sites.length) throw new Error(`splitForRanking: ${sites.length} sites but ${places.length} places`);
  const withTerrain: { site: S; place: P }[] = [];
  const failed: string[] = [];
  sites.forEach((site, i) => {
    const place = places[i];
    if (place.terrain) withTerrain.push({ site, place });
    else if (place.horizonLabel === TERRAIN_MISSING_LABEL) failed.push(site.name);
  });
  return { withTerrain, failed, unranked: sites.length - withTerrain.length - failed.length };
}

export interface RankedSite {
  id: string;
  name: string;
  verdict: VerdictKind;
  reason: string;
  score: number;
  /** Which horizon the site was scored with, e.g. a region point some metres from the cited site. */
  horizonLabel: string;
}

/** What the ranking needs from an engine window answer. */
export interface RankAnswer { verdict: { verdict: VerdictKind; reason: string }; metrics: { score: number } }

/** Rows for the ranked sites (answers in the same order as `withTerrain`), sorted by verdict, then score. */
export function rankRows(withTerrain: { site: Pick<Site, 'id' | 'name'>; place: RankPlace }[], answers: RankAnswer[]): RankedSite[] {
  if (answers.length !== withTerrain.length) throw new Error(`rankRows: ${withTerrain.length} sites but ${answers.length} answers`);
  return sortRanked(withTerrain.map(({ site, place }, i) => ({
    id: site.id, name: site.name, verdict: answers[i].verdict.verdict, reason: answers[i].verdict.reason,
    score: answers[i].metrics.score, horizonLabel: place.horizonLabel,
  })));
}
