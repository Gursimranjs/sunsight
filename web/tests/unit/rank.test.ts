// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Note 003 A: the "which sites work on this date" ranking: which sites are ranked, the rows and their order.
import { describe, expect, it } from 'vitest';
import { loadSites } from '../../src/data/loaders';
import { loadMaskSet, MISS_CENTRE_LABEL, NO_TERRAIN_LABEL } from '../../src/data/sites';
import type { Site } from '../../src/data/types';
import { runWindow } from '../../src/engine/compute';
import * as L from '../../src/engine/light';
import { clampScenario, defaultScenario, VIEWS } from '../../src/state/scenario';
import { decodeScenario, encodeScenario } from '../../src/state/url';
import { resolveForSite, TERRAIN_MISSING_LABEL, type AppData } from '../../src/state/data';
import { calendarSites } from '../../src/views/Compare';
import { mayHaveTerrain, rankRows, sortRanked, splitForRanking, VERDICT_ORDER } from '../../src/views/rankOrder';
import { DATA, fileFetcher, fixtureManifest, fixtureTable } from './helpers';

const row = (id: string, verdict: L.VerdictKind, score: number) => ({ id, verdict, score });

describe('ranking sort order', () => {
  it('puts go first, then marginal, then no-go', () => {
    const out = sortRanked([row('a', 'no-go', 99), row('b', 'marginal', 10), row('c', 'go', 1), row('d', 'no-go', 5), row('e', 'go', 50)]);
    expect(out.map((r) => r.verdict)).toEqual(['go', 'go', 'marginal', 'no-go', 'no-go']);
    expect(VERDICT_ORDER.go).toBeLessThan(VERDICT_ORDER.marginal);
    expect(VERDICT_ORDER.marginal).toBeLessThan(VERDICT_ORDER['no-go']);
  });

  it('sorts by score, highest first, within one verdict', () => {
    const out = sortRanked([row('a', 'go', 10), row('b', 'go', 80), row('c', 'go', 40), row('d', 'no-go', 3), row('e', 'no-go', 70)]);
    expect(out.map((r) => r.id)).toEqual(['b', 'c', 'a', 'e', 'd']);
  });

  it('keeps the input order for equal verdict and score, and does not change the input', () => {
    const input = [row('a', 'marginal', 20), row('b', 'marginal', 20), row('c', 'go', 20)];
    const copy = input.map((r) => ({ ...r }));
    expect(sortRanked(input).map((r) => r.id)).toEqual(['c', 'a', 'b']);
    expect(input).toEqual(copy);
  });

  it('puts a score that is not a number last within its verdict', () => {
    const out = sortRanked([row('a', 'go', NaN), row('b', 'go', 0), row('c', 'no-go', 5)]);
    expect(out.map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });

});

/** Fixture sites plus one whose region file is not in the manifest (its terrain file "fails to load"). */
async function fixtureRankInputs() {
  const m = fixtureManifest();
  const { sites: base } = await loadSites(m, fileFetcher, DATA);
  const data = {
    manifest: m, sites: base,
    region: (id: string) => loadMaskSet(m, 'regions', id, fileFetcher, DATA),
    missGrid: (id: string) => loadMaskSet(m, 'miss', id, fileFetcher, DATA),
  } as unknown as AppData;
  const broken: Site = { ...base.find((s) => s.id === 'fixture_equator')!, id: 'fixture_broken', name: 'Broken terrain', region_id: 'not_in_manifest' };
  const sites = [...base, broken];
  const places = await Promise.all(sites.map((s) => resolveForSite(data, s, 2)));
  return { sites, places };
}

describe('which sites are ranked (splitForRanking)', () => {
  it('ranks sites with terrain, counts a failed terrain file once and a no-terrain site once', async () => {
    const { sites, places } = await fixtureRankInputs();
    // The fixture: a region site, a miss-target site, a site without terrain and the broken one.
    expect(places.map((p) => p.horizonLabel)).toEqual([
      expect.stringMatching(/^Terrain horizon from region/), MISS_CENTRE_LABEL, NO_TERRAIN_LABEL, TERRAIN_MISSING_LABEL,
    ]);
    const split = splitForRanking(sites, places);
    expect(split.withTerrain.map((x) => x.site.id)).toEqual(['fixture_ridge', 'fixture_target']);
    expect(split.failed).toEqual(['Broken terrain']);
    expect(split.unranked).toBe(1);
    expect(split.unranked + split.failed.length + split.withTerrain.length).toBe(sites.length);
  });

  it('builds rows from real engine answers, keeps the horizon label, and sorts them', async () => {
    const { sites, places } = await fixtureRankInputs();
    const t = await fixtureTable();
    const rules = L.makeRules(L.PRESETS.robotic);
    const split = splitForRanking(sites, places);
    const answers = split.withTerrain.map(({ place }) =>
      runWindow(t, { place: { lat_deg: place.lat_deg, lon_deg: place.lon_deg, h_m: place.h_m }, mask: place.mask, start_s: 0, end_s: rules.stay_s, rules }));
    const rows = rankRows(split.withTerrain, answers);
    expect(rows).toHaveLength(2);
    expect(rows.length + split.failed.length + split.unranked).toBe(sites.length);
    for (const r of rows) {
      const k = split.withTerrain.findIndex((x) => x.site.id === r.id);
      expect(r.name).toBe(split.withTerrain[k].site.name);
      expect(r.horizonLabel).toBe(split.withTerrain[k].place.horizonLabel);
      expect(r.verdict).toBe(answers[k].verdict.verdict);
      expect(r.reason).toBe(answers[k].verdict.reason);
      expect(r.score).toBe(answers[k].metrics.score);
    }
    expect(rows).toEqual(sortRanked(rows));
  });

  it('rejects mismatched inputs instead of mislabelling rows', () => {
    expect(() => splitForRanking([{ name: 'a' }], [])).toThrow();
    expect(() => rankRows([{ site: { id: 'a', name: 'A' }, place: { terrain: true, horizonLabel: 'x' } }], [])).toThrow();
  });

  it('mayHaveTerrain: a miss grid within 40 m, a region or a miss target; not a grid point farther than 40 m', async () => {
    const { sites } = await fixtureRankInputs();
    const by = (id: string) => sites.find((s) => s.id === id)!;
    expect(mayHaveTerrain(by('fixture_ridge'))).toBe(true);
    expect(mayHaveTerrain(by('fixture_target'))).toBe(true);
    expect(mayHaveTerrain(by('fixture_equator'))).toBe(false);
    expect(mayHaveTerrain({ ...by('fixture_equator'), miss_grid_id: 'fixture_target', miss_point_offset_m: 12 })).toBe(true);
    expect(mayHaveTerrain({ ...by('fixture_equator'), miss_grid_id: 'fixture_target', miss_point_offset_m: 120 })).toBe(false);
  });
});

describe('calendar rows for "I have a site: which dates work?"', () => {
  it('puts the chosen site first and keeps the others in order', async () => {
    const { sites } = await fixtureRankInputs();
    expect(calendarSites(sites, 'fixture_target').map((s) => s.id)).toEqual(['fixture_target', 'fixture_ridge', 'fixture_equator', 'fixture_broken']);
    expect(calendarSites(sites, null)).toEqual(sites);
    expect(calendarSites(sites, 'unknown')).toEqual(sites);
  });
});

describe('the ranking view in the URL', () => {
  it('is a listed view and round-trips through the query string', () => {
    expect(VIEWS.some((v) => v.id === 'rank' && v.label === 'Which sites work?')).toBe(true);
    const meta = { row_count: 1440, step_s: 3600 };
    const epoch = Date.UTC(2027, 0, 1);
    const s = clampScenario({ ...defaultScenario('fixture_ridge'), view: 'rank', start_s: 2 * 86400 }, meta);
    const q = encodeScenario(s, epoch);
    expect(q).toContain('view=rank');
    expect(clampScenario(decodeScenario(q, epoch, 'fixture_ridge', ['fixture_ridge']), meta)).toEqual(s);
  });
});
