// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Note 003 part C: "Jump to this site's best date" picks the day with the best verdict, then the
// best score, and the earliest day on ties; and the miss view knows which grid point is the target.
import { describe, expect, it } from 'vitest';
import { loadMaskSet, missCentreIndex } from '../../src/data/sites';
import { runCalendar } from '../../src/engine/compute';
import * as L from '../../src/engine/light';
import { dayStarts } from '../../src/views/calendar';
import { bestDayIndex, bestDateJob, missFailLine, missTargetIndex, targetFailsEverywhere } from '../../src/views/missGeometry';
import { DATA, fileFetcher, fixtureManifest, fixtureTable } from './helpers';

describe('bestDayIndex', () => {
  it('prefers go over marginal over no-go, whatever the score', () => {
    expect(bestDayIndex([
      { verdict: 'no-go', score: 99 },
      { verdict: 'marginal', score: 80 },
      { verdict: 'go', score: 10 },
      { verdict: 'marginal', score: 95 },
    ])).toBe(2);
    expect(bestDayIndex([
      { verdict: 'no-go', score: 99 },
      { verdict: 'marginal', score: 5 },
      { verdict: 'no-go', score: 100 },
    ])).toBe(1);
  });

  it('within the best verdict, the highest score wins', () => {
    expect(bestDayIndex([
      { verdict: 'go', score: 40 },
      { verdict: 'go', score: 71.5 },
      { verdict: 'go', score: 71.4 },
    ])).toBe(1);
    expect(bestDayIndex([
      { verdict: 'no-go', score: -3 },
      { verdict: 'no-go', score: 12 },
      { verdict: 'no-go', score: 11 },
    ])).toBe(1);
  });

  it('ties go to the earliest day', () => {
    expect(bestDayIndex([
      { verdict: 'marginal', score: 50 },
      { verdict: 'go', score: 60 },
      { verdict: 'go', score: 60 },
      { verdict: 'go', score: 60 },
    ])).toBe(1);
    expect(bestDayIndex([{ verdict: 'go', score: 1 }, { verdict: 'go', score: 1 }])).toBe(0);
  });

  it('skips scores that are not numbers and returns -1 for no days', () => {
    expect(bestDayIndex([])).toBe(-1);
    expect(bestDayIndex([{ verdict: 'go', score: NaN }, { verdict: 'go', score: 2 }])).toBe(1);
    expect(bestDayIndex([{ verdict: 'go', score: NaN }])).toBe(0);
  });
});

describe('target point and best-date job', () => {
  it('own grid: the target is the centre point; borrowed grid: the site point', async () => {
    const set = await loadMaskSet(fixtureManifest(), 'miss', 'fixture_target', fileFetcher, DATA);
    const centre = missCentreIndex(set);
    expect(centre).toBeGreaterThanOrEqual(0);
    expect(missTargetIndex(set, -1)).toBe(centre);
    // A site point outside the grid falls back to the centre.
    expect(missTargetIndex(set, set.meta.points.length)).toBe(centre);
  });

  it('the fail line is judged at the grid centre; a borrowed-grid site point that disagrees gets its own line', async () => {
    const set = await loadMaskSet(fixtureManifest(), 'miss', 'fixture_target', fileFetcher, DATA);
    const n = set.meta.points.length;
    const centre = missTargetIndex(set, -1);
    const site = (centre + 3) % n;
    const verdicts = (fail: number[]) => set.meta.points.map((_, i) => (fail.includes(i) ? 'no-go' : 'go') as L.VerdictKind);
    // Own grid (no site point): centre fails, nothing passes -> 'all'; centre fails, some pass -> 'some'.
    expect(missFailLine({ verdicts: verdicts(set.meta.points.map((_, i) => i)), shares: [0, 0, 0] }, centre, -1)).toBe('all');
    expect(missFailLine({ verdicts: verdicts([centre]), shares: [0, 0.5, 0.75] }, centre, -1)).toBe('some');
    expect(missFailLine({ verdicts: verdicts([site]), shares: [1, 0.99, 0.98] }, centre, -1)).toBe(null);
    // Borrowed grid: the site point fails but the centre (the marked target) passes -> not a "target fails" line.
    expect(missFailLine({ verdicts: verdicts([site]), shares: [1, 0.99, 0.98] }, centre, site)).toBe('site');
    // Borrowed grid: the centre fails but the site point passes -> the target line, from the centre's verdict.
    expect(missFailLine({ verdicts: verdicts([centre]), shares: [0, 0.5, 0.75] }, centre, site)).toBe('some');
    // Both pass -> no line.
    expect(missFailLine({ verdicts: verdicts([]), shares: [1, 1, 1] }, centre, site)).toBe(null);
    // A site point equal to the centre is the own-grid case.
    expect(missFailLine({ verdicts: verdicts([centre]), shares: [0, 0, 0] }, centre, centre)).toBe('all');
  });

  it('targetFailsEverywhere needs the target to fail and every share to be 0', () => {
    const base = { verdicts: ['no-go', 'go'] as L.VerdictKind[], passes: [false, true], shares: [0, 0, 0] };
    expect(targetFailsEverywhere(base, 0)).toBe(true);
    expect(targetFailsEverywhere({ ...base, shares: [0, 0, 0.01] }, 0)).toBe(false);
    expect(targetFailsEverywhere(base, 1)).toBe(false);
    expect(targetFailsEverywhere(base, -1)).toBe(false);
  });

  it('the job scores the target point over every whole day that fits in the table, and its best day is the true best', async () => {
    const t = await fixtureTable();
    const set = await loadMaskSet(fixtureManifest(), 'miss', 'fixture_target', fileFetcher, DATA);
    const meta = { row_count: t.rows, step_s: t.step_s };
    const epoch = Date.UTC(2027, 0, 1);
    const rules = L.makeRules({ ...L.PRESETS.robotic, stay_s: 3 * 86400, max_gap_s: 1e9 });
    const i = missTargetIndex(set, -1);
    const job = bestDateJob(set, i, rules.stay_s, rules, meta, epoch);
    expect(job.sites.length).toBe(1);
    expect(job.day_starts_s).toEqual(dayStarts(0, 1e6, rules.stay_s, meta, epoch));
    expect(job.day_starts_s.length).toBeGreaterThan(10);
    const last = job.day_starts_s[job.day_starts_s.length - 1];
    expect(last + rules.stay_s).toBeLessThanOrEqual((meta.row_count - 2) * meta.step_s);
    const p = set.meta.points[i];
    expect(job.sites[0].place).toEqual({ lat_deg: p.lat_deg, lon_deg: p.lon_deg, h_m: p.height_m });

    const cells = runCalendar(t, job).cells[0];
    const k = bestDayIndex(cells);
    // Declarative check: the best verdict present in the table, the highest score among days with it,
    // and the first day holding both.
    const verdicts = new Set(cells.map((c) => c.verdict));
    const top: L.VerdictKind = verdicts.has('go') ? 'go' : verdicts.has('marginal') ? 'marginal' : 'no-go';
    const topScore = Math.max(...cells.filter((c) => c.verdict === top).map((c) => c.score));
    expect(k).toBe(cells.findIndex((c) => c.verdict === top && c.score === topScore));
  }, 60_000);
});
