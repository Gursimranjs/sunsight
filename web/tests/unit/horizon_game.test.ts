// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Note 009, "Land it yourself": the first-failure helper and the game's per-point engine job.
import { describe, expect, it } from 'vitest';
import { loadMaskSet } from '../../src/data/sites';
import { runMiss, runWindow } from '../../src/engine/compute';
import * as L from '../../src/engine/light';
import { firstFailure, formatStayDays, initialState, resultLine } from '../../src/horizon/game/firstFailure';
import {
  distanceFromTarget_m, distanceText, formatDayUtc, gameBrief, gameGridId, gamePointJob, gameShareLink,
  gameTargetIndex, parseGamePoint,
} from '../../src/horizon/game/gameLogic';
import { missJob } from '../../src/views/missGeometry';
import { DATA, fileFetcher, fixtureManifest, fixtureTable, PY } from './helpers';

const H = 3600, D = 86400;
const ev = (t_s: number, to: boolean): L.LightEvent => ({ t_s, to });
/** Metrics for a stay of `stay_s` starting at start_s, sampled every 10 minutes. */
function m(_start_s: number, stay_s: number, lit: L.LightEvent[], con: L.LightEvent[], lit0 = true, con0 = true) {
  return {
    n_samples: stay_s / L.SAMPLE_STEP_S + 1,
    lit_events: lit, contact_events: con,
    lit_share: lit.length ? 0.5 : lit0 ? 1 : 0,
    contact_share: con.length ? 0.5 : con0 ? 1 : 0,
  };
}
const crew = L.PRESETS.crew, robotic = L.PRESETS.robotic;

describe('firstFailure on hand-made event lists', () => {
  it('holds when there is no darkness and no gap', () => {
    expect(firstFailure(m(1000, 6.5 * D, [], []), crew, 1000)).toBeNull();
    expect(resultLine(null, 6.5 * D)).toBe('Mission holds for all 6.5 days');
    expect(resultLine(null, 14 * D)).toBe('Mission holds for all 14 days');
  });

  it('with max_dark_s = 0 the first sunset is the failure', () => {
    const f = firstFailure(m(1000, 6.5 * D, [ev(1000 + 31 * H, false), ev(1000 + 33 * H, true)], []), crew, 1000)!;
    expect(f.kind).toBe('power');
    expect(f.at_s).toBe(31 * H);
    expect(f.spell_s).toBe(2 * H);
    expect(f.text).toBe('Power lost after 31.0 h');
  });

  it('dark at touchdown with max_dark_s = 0', () => {
    const f = firstFailure(m(0, 6.5 * D, [ev(5 * H, true)], [], false), crew, 0)!;
    expect(f.at_s).toBe(0);
    expect(f.text).toBe('Power lost at touchdown: the site is in shadow');
  });

  it('a dark spell within the limit holds; the first one over it fails max_dark_s into the spell', () => {
    const lit = [ev(10 * H, false), ev(11.5 * H, true), ev(30 * H, false), ev(34 * H, true)];
    const f = firstFailure(m(0, 14 * D, lit, []), robotic, 0)!;
    expect(f.kind).toBe('power');
    expect(f.spell_start_s).toBe(30 * H);
    expect(f.at_s).toBe(32 * H);
    expect(f.text).toBe('Power lost after 32.0 h');
    expect(firstFailure(m(0, 14 * D, lit.slice(0, 2), []), robotic, 0)).toBeNull();
  });

  it('a spell running to the end of the stay counts up to the last sample', () => {
    const stay = 14 * D;
    expect(firstFailure(m(0, stay, [ev(stay - 1.5 * H, false)], []), robotic, 0)).toBeNull();
    expect(firstFailure(m(0, stay, [ev(stay - 2.5 * H, false)], []), robotic, 0)!.at_s).toBe(stay - 0.5 * H);
  });

  it('a contact gap over the limit: duration and day of the stay', () => {
    const con = [ev(D + 3 * H, false), ev(D + 7.2 * H, true)];
    const f = firstFailure(m(0, 6.5 * D, [], con), crew, 0)!;
    expect(f.kind).toBe('contact');
    expect(f.day).toBe(2);
    expect(f.at_s).toBeCloseTo(D + 5 * H, 6);
    expect(f.text).toBe('Out of contact for 4.2 h on day 2');
  });

  it('the earlier failure wins', () => {
    const lit = [ev(50 * H, false), ev(52 * H, true)];
    const con = [ev(10 * H, false), ev(20 * H, true)];
    expect(firstFailure(m(0, 6.5 * D, lit, con), crew, 0)!.kind).toBe('contact');
    expect(firstFailure(m(0, 6.5 * D, [ev(5 * H, false), ev(6 * H, true)], con), crew, 0)!.kind).toBe('power');
  });

  it('initial state from the events, or from the share when nothing changes', () => {
    expect(initialState([ev(1, true)], 0.3)).toBe(false);
    expect(initialState([ev(1, false)], 0.3)).toBe(true);
    expect(initialState([], 1)).toBe(true);
    expect(initialState([], 0)).toBe(false);
    expect(formatStayDays(6.5 * D)).toBe('6.5');
  });
});

describe('firstFailure against the engine', () => {
  it('matches the Python reference windows: fails exactly when the verdict is no-go', () => {
    for (const w of PY.windows) {
      const rules = L.makeRules({ ...L.PRESETS[w.preset as L.PresetId], ...(w.rules_over ?? {}) });
      const f = firstFailure(w.metrics, rules, w.start_s);
      expect(f !== null).toBe(w.verdict.verdict === 'no-go');
    }
    const polar = PY.windows.find((w: { name: string }) => w.name === 'polar smooth');
    const f = firstFailure(polar.metrics, L.PRESETS.crew, polar.start_s)!;
    // No contact at the start; the 2 h limit is broken 2 h in, long before the first sunset.
    expect(f.kind).toBe('contact');
    expect(f.at_s).toBe(2 * H);
    expect(f.text).toBe('Out of contact for 3.1 days (73.5 h) on day 1');
  });

  it('on every point of the fixture miss grid, for every reference case', async () => {
    const t = await fixtureTable();
    const set = await loadMaskSet(fixtureManifest(), 'miss', PY.miss.id, fileFetcher, DATA);
    let fails = 0, holds = 0;
    for (const c of PY.miss.cases) {
      const rules = L.makeRules({ ...L.PRESETS[c.preset as L.PresetId], ...c.rules_over });
      const miss = runMiss(t, missJob(set, c.start_s, c.end_s, rules));
      set.meta.points.forEach((_, i) => {
        const a = runWindow(t, gamePointJob(set, i, c.start_s, c.end_s, rules));
        // The game's verdict for a point equals the Miss map's verdict for the same point.
        expect(a.verdict.verdict).toBe(miss.verdicts[i]);
        expect(a.verdict.verdict).toBe(c.verdicts[i]);
        const f = firstFailure(a.metrics, rules, c.start_s);
        expect(f !== null).toBe(a.verdict.verdict === 'no-go');
        if (f) {
          fails++;
          expect(f.at_s).toBeGreaterThanOrEqual(0);
          expect(f.at_s).toBeLessThanOrEqual(c.end_s - c.start_s);
          // The spell that breaks the rule is at most as long as the engine's longest one.
          expect(f.spell_s).toBeLessThanOrEqual((f.kind === 'power' ? a.metrics.longest_dark_s : a.metrics.longest_gap_s) + 1e-6);
        } else holds++;
      });
    }
    expect(fails).toBeGreaterThan(0);
    expect(holds).toBeGreaterThan(0);
  });
});

describe('game helpers', () => {
  it('grid, brief, distance and share link', async () => {
    const set = await loadMaskSet(fixtureManifest(), 'miss', PY.miss.id, fileFetcher, DATA);
    expect(gameGridId({ miss_target_id: 'a', miss_grid_id: 'b' })).toBe('a');
    expect(gameGridId({ miss_target_id: null, miss_grid_id: 'b' })).toBe('b');
    expect(gameGridId({ miss_target_id: null })).toBeNull();
    expect(gameGridId(null)).toBeNull();
    expect(formatDayUtc(Date.UTC(2029, 6, 24))).toBe('24 July 2029');
    expect(gameBrief('crew', 6.5 * D, 'the ridge', Date.UTC(2029, 6, 24), 500))
      .toBe('You are landing a crew for 6.5 days on the ridge on 24 July 2029. Pick your spot within 500 m of the target.');
    expect(gameBrief('robotic', 14 * D, 'X', Date.UTC(2027, 0, 1), 500)).toContain('a robotic lander for 14 days');
    const c = gameTargetIndex(set);
    expect(distanceFromTarget_m(set, c)).toBe(0);
    expect(distanceText(0)).toBe('on the target');
    const far = set.meta.points.findIndex((p) => p.east_m === 100 && p.north_m === -300);
    expect(distanceFromTarget_m(set, far)).toBeCloseTo(Math.hypot(100, 300), 9);
    const link = gameShareLink('https://x.test/sunsight/?site=a&preset=crew', set.meta.points[far].id);
    expect(link).toContain('site=a');
    expect(parseGamePoint(new URL(link).search, set)).toBe(far);
    expect(parseGamePoint('?game_pt=nope', set)).toBeNull();
    expect(parseGamePoint('', set)).toBeNull();
  });
});
