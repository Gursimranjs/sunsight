// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Note 003 A: the "which sites work on this date" ranking sorts by verdict, then by score.
import { describe, expect, it } from 'vitest';
import { loadSites } from '../../src/data/loaders';
import { resolveSite } from '../../src/data/sites';
import { runWindow } from '../../src/engine/compute';
import * as L from '../../src/engine/light';
import { clampScenario, defaultScenario, VIEWS } from '../../src/state/scenario';
import { decodeScenario, encodeScenario } from '../../src/state/url';
import { sortRanked, VERDICT_ORDER } from '../../src/views/rankOrder';
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

  it('never puts a no-go above a go or marginal for real engine answers', async () => {
    const t = await fixtureTable();
    const { sites } = await loadSites(fixtureManifest(), fileFetcher, DATA);
    const rules = L.makeRules(L.PRESETS.robotic);
    const rows = sites.map((s) => {
      const p = resolveSite(s, null, rules.observer_height_m);
      const a = runWindow(t, { place: { lat_deg: p.lat_deg, lon_deg: p.lon_deg, h_m: p.h_m }, mask: p.mask, start_s: 0, end_s: rules.stay_s, rules });
      return { id: s.id, verdict: a.verdict.verdict, score: a.metrics.score };
    });
    const out = sortRanked(rows);
    expect(out).toHaveLength(rows.length);
    for (let i = 1; i < out.length; i++) {
      const a = out[i - 1], b = out[i];
      expect(VERDICT_ORDER[a.verdict]).toBeLessThanOrEqual(VERDICT_ORDER[b.verdict]);
      if (a.verdict === b.verdict) expect(a.score).toBeGreaterThanOrEqual(b.score);
    }
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
