// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// P19: the Athena story's numbers are computed from the cited coordinates in sites.json.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Site } from '../../src/data/types';
import { loadMaskSet } from '../../src/data/sites';
import { runMiss } from '../../src/engine/compute';
import * as L from '../../src/engine/light';
import { missJob } from '../../src/views/missGeometry';
import { athenaMiss, ATHENA_ACTUAL_ID, ATHENA_TARGET_ID, litRange, missRange, roundingHalfStep } from '../../src/views/storyNumbers';
import { DATA, fileFetcher, fixtureManifest, fixtureTable } from './helpers';

const sites = (JSON.parse(readFileSync(new URL('../../public/data/sites.json', import.meta.url), 'utf8')) as { sites: Site[] }).sites;
const R_M = 1737400;
const D = Math.PI / 180;

describe('Athena story numbers', () => {
  it('uses the cited LROC coordinates', () => {
    const t = sites.find((s) => s.id === ATHENA_TARGET_ID)!;
    const a = sites.find((s) => s.id === ATHENA_ACTUAL_ID)!;
    expect([t.lat_deg, t.lon_deg]).toEqual([-84.78, 29.13]);
    expect([a.lat_deg, a.lon_deg]).toEqual([-84.7906, 29.1957]);
    expect(t.source_url).toContain('lroc.im-ldi.com/images/1401');
    expect(a.source_url).toContain('lroc.im-ldi.com/images/1408');
  });

  it('target-to-actual distance equals the haversine distance on the 1,737.4 km sphere', () => {
    const m = athenaMiss(sites)!;
    const [la1, lo1, la2, lo2] = [-84.78 * D, 29.13 * D, -84.7906 * D, 29.1957 * D];
    const hav = 2 * R_M * Math.asin(Math.sqrt(Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2));
    expect(Math.abs(m.dist_m - hav)).toBeLessThan(0.01);
    expect(m.dist_m).toBeGreaterThan(300);
    expect(m.dist_m).toBeLessThan(450);
    // Actual is south (lower latitude at the south pole) and east of the target.
    expect(m.north_m).toBeLessThan(0);
    expect(m.east_m).toBeGreaterThan(0);
    expect(Math.hypot(m.east_m, m.north_m)).toBeCloseTo(m.dist_m, -1);
  });

  it('two-decimal rounding of the target is worth about ±150 m north-south and ±14 m east-west there', () => {
    const r = roundingHalfStep(-84.78, 2);
    expect(r.ns_m).toBeCloseTo(0.005 * D * R_M, 6);
    expect(r.ns_m).toBeGreaterThan(150);
    expect(r.ns_m).toBeLessThan(153);
    expect(r.ew_m).toBeCloseTo(0.005 * D * R_M * Math.cos(84.78 * D), 6);
  });

  it('the possible miss given the rounding spans the computed distance', () => {
    const m = athenaMiss(sites)!;
    const r = missRange(m, roundingHalfStep(-84.78, 2));
    expect(r.min_m).toBeLessThan(m.dist_m);
    expect(r.max_m).toBeGreaterThan(m.dist_m);
    // Brute force over the box corners and edges.
    const box = roundingHalfStep(-84.78, 2);
    let lo = Infinity, hi = 0;
    for (let i = 0; i <= 200; i++) for (let j = 0; j <= 200; j++) {
      const e = -box.ew_m + (2 * box.ew_m * i) / 200, n = -box.ns_m + (2 * box.ns_m * j) / 200;
      const d = Math.hypot(m.east_m - e, m.north_m - n);
      lo = Math.min(lo, d); hi = Math.max(hi, d);
    }
    expect(Math.abs(r.min_m - lo)).toBeLessThan(1);
    expect(Math.abs(r.max_m - hi)).toBeLessThan(1e-6);
  });

  it('lit range inside a radius equals a direct scan of the fixture miss grid', async () => {
    const t = await fixtureTable();
    const set = await loadMaskSet(fixtureManifest(), 'miss', 'fixture_target', fileFetcher, DATA);
    const rules = L.makeRules({ ...L.PRESETS.robotic, stay_s: 3 * 86400, max_gap_s: 1e9 });
    const job = missJob(set, 6 * 86400, 9 * 86400, rules);
    const a = runMiss(t, job);
    expect(a.lit_share.length).toBe(set.meta.points.length);
    for (const r of [100, 250, 500]) {
      const g = litRange(a.lit_share, job.east_m, job.north_m, r)!;
      const inside = set.meta.points.map((p, i) => [Math.hypot(p.east_m!, p.north_m!), i] as const).filter(([d]) => d <= r + 1e-9);
      const vals = inside.map(([, i]) => {
        const p = set.meta.points[i];
        const hi = 0;
        const nb = set.meta.bin_count, nh = set.meta.observer_heights_m.length;
        const mask = set.masks.subarray((i * nh + hi) * nb, (i * nh + hi + 1) * nb);
        return L.window_compute(t, p.lat_deg, p.lon_deg, p.height_m, mask, 6 * 86400, 9 * 86400, rules).metrics.lit_share;
      });
      expect(g.min).toBe(Math.min(...vals));
      expect(g.max).toBe(Math.max(...vals));
      expect(g.n).toBe(vals.length);
      const c = set.meta.points.findIndex((p) => p.east_m === 0 && p.north_m === 0);
      expect(g.at_target).toBe(a.lit_share[c]);
    }
  });

  it('returns null when either site is missing', () => {
    expect(athenaMiss(sites.filter((s) => s.id !== ATHENA_ACTUAL_ID))).toBeNull();
  });
});
