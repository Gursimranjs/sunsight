// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// P15 leftover: the miss-tolerant calendar marks a date good only if at least min_share of the grid
// points inside the miss radius pass. Checked against a direct per-point computation on the fixture grid.
import { describe, expect, it } from 'vitest';
import { loadMaskSet } from '../../src/data/sites';
import { Engine } from '../../src/engine/client';
import { runMiss, runMissCalendar } from '../../src/engine/compute';
import * as L from '../../src/engine/light';
import { dayStarts } from '../../src/views/calendar';
import { missCalendarJob, missJob } from '../../src/views/missGeometry';
import { DATA, fileFetcher, fixtureManifest, fixtureTable } from './helpers';

const meta = { row_count: 1440, step_s: 3600 };
const epoch = Date.UTC(2027, 0, 1);
// Short stays that ignore contact give mixed pass/fail maps on the fixture (see py_reference.json).
const rules = L.makeRules({ ...L.PRESETS.robotic, stay_s: 3 * 86400, max_gap_s: 1e9 });

describe('miss-tolerant calendar', () => {
  it('each day equals a direct count of passing points inside the radius', async () => {
    const t = await fixtureTable();
    const set = await loadMaskSet(fixtureManifest(), 'miss', 'fixture_target', fileFetcher, DATA);
    const starts = dayStarts(5 * 86400, 8, rules.stay_s, meta, epoch);
    for (const radius_m of [100, 250, 500]) {
      for (const min_share of [0.5, 0.75, 0.9]) {
        const a = runMissCalendar(t, missCalendarJob(set, starts, rules.stay_s, rules, radius_m, min_share));
        expect(a.days.length).toBe(starts.length);
        starts.forEach((s, j) => {
          // Direct computation: every point inside the radius, its own window and verdict.
          let n = 0, ok = 0;
          set.meta.points.forEach((p, i) => {
            if (Math.hypot(p.east_m ?? 0, p.north_m ?? 0) > radius_m + 1e-9) return;
            n++;
            const hi = rules.observer_height_m === set.meta.observer_heights_m[0] ? 0 : 1;
            const nb = set.meta.bin_count, nh = set.meta.observer_heights_m.length;
            const mask = set.masks.subarray((i * nh + hi) * nb, (i * nh + hi + 1) * nb);
            const m = L.window_compute(t, p.lat_deg, p.lon_deg, p.height_m, mask, s, s + rules.stay_s, rules).metrics;
            if (L.verdict(m, rules).verdict !== 'no-go') ok++;
          });
          const d = a.days[j];
          expect(d.n_inside).toBe(n);
          expect(d.n_pass).toBe(ok);
          expect(d.share).toBe(ok / n);
          expect(d.tolerant).toBe(ok / n >= min_share);
        });
      }
    }
  });

  it('agrees with the miss view (runMiss) for the same window', async () => {
    const t = await fixtureTable();
    const set = await loadMaskSet(fixtureManifest(), 'miss', 'fixture_target', fileFetcher, DATA);
    const starts = dayStarts(5 * 86400, 4, rules.stay_s, meta, epoch);
    const a = runMissCalendar(t, missCalendarJob(set, starts, rules.stay_s, rules, 250, 0.9));
    starts.forEach((s, j) => {
      const m = runMiss(t, missJob(set, s, s + rules.stay_s, rules));
      expect(Math.abs(a.days[j].share - m.shares[1])).toBeLessThan(1e-12);
    });
  });

  it('the result is mixed on the fixture (some days tolerant at a lower bar, not all)', async () => {
    const t = await fixtureTable();
    const set = await loadMaskSet(fixtureManifest(), 'miss', 'fixture_target', fileFetcher, DATA);
    const starts = dayStarts(0, 40, rules.stay_s, meta, epoch);
    const a = runMissCalendar(t, missCalendarJob(set, starts, rules.stay_s, rules, 500, 0.75));
    const tol = a.days.filter((d) => d.tolerant).length;
    expect(tol).toBeGreaterThan(0);
    expect(tol).toBeLessThan(a.days.length);
  });

  it('the engine client gives the same answer', async () => {
    const t = await fixtureTable();
    const set = await loadMaskSet(fixtureManifest(), 'miss', 'fixture_target', fileFetcher, DATA);
    const starts = dayStarts(5 * 86400, 3, rules.stay_s, meta, epoch);
    const job = missCalendarJob(set, starts, rules.stay_s, rules, 250, 0.9);
    expect(await new Engine(t).missCalendar(job)).toEqual(runMissCalendar(t, job));
  });

  it('only points inside the radius are sent to the engine', async () => {
    const set = await loadMaskSet(fixtureManifest(), 'miss', 'fixture_target', fileFetcher, DATA);
    const job = missCalendarJob(set, [0], rules.stay_s, rules, 100, 0.9);
    expect(job.places.length).toBe(5);
    expect(job.masks.length).toBe(5 * set.meta.bin_count);
  });
});
