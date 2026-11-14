// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// P19: the Athena story's numbers are computed from the cited coordinates in sites.json.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Site } from '../../src/data/types';
import { athenaMiss, ATHENA_ACTUAL_ID, ATHENA_TARGET_ID, missRange, roundingHalfStep } from '../../src/views/storyNumbers';

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

  it('returns null when either site is missing', () => {
    expect(athenaMiss(sites.filter((s) => s.id !== ATHENA_ACTUAL_ID))).toBeNull();
  });
});
