// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// P15: miss-test shares at 100, 250 and 500 m equal the Python reference on the fixture grid.
import { describe, expect, it } from 'vitest';
import { loadMaskSet } from '../../src/data/sites';
import { Engine } from '../../src/engine/client';
import { runMiss } from '../../src/engine/compute';
import * as L from '../../src/engine/light';
import { missJob, nearestGridPoint, stepGridPoint } from '../../src/views/missGeometry';
import { DATA, fileFetcher, fixtureManifest, fixtureTable, PY } from './helpers';

describe('miss test', () => {
  it('verdict at every grid point and the shares match pipeline/sunsight/light.py', async () => {
    const t = await fixtureTable();
    const set = await loadMaskSet(fixtureManifest(), 'miss', PY.miss.id, fileFetcher, DATA);
    expect(PY.miss.cases.length).toBeGreaterThanOrEqual(4);
    let mixed = 0;
    for (const c of PY.miss.cases) {
      const rules = L.makeRules({ ...L.PRESETS[c.preset as L.PresetId], ...c.rules_over });
      const job = missJob(set, c.start_s, c.end_s, rules);
      expect(set.meta.observer_heights_m[0] === rules.observer_height_m ? 0 : 1).toBe(c.height_index);
      const a = runMiss(t, job);
      expect(a.verdicts).toEqual(c.verdicts);
      [100, 250, 500].forEach((r, k) => expect(Math.abs(a.shares[k] - c.shares[String(r)])).toBeLessThan(1e-12));
      if (a.passes.some(Boolean) && a.passes.some((p) => !p)) mixed++;
    }
    expect(mixed).toBeGreaterThanOrEqual(3); // the reference exercises real pass/fail maps
  });

  it('the engine client (worker path) gives the same shares', async () => {
    const t = await fixtureTable();
    const set = await loadMaskSet(fixtureManifest(), 'miss', PY.miss.id, fileFetcher, DATA);
    const c = PY.miss.cases.find((x: { rules_over: object }) => Object.keys(x.rules_over).length > 0);
    const rules = L.makeRules({ ...L.PRESETS[c.preset as L.PresetId], ...c.rules_over });
    const a = await new Engine(t).miss(missJob(set, c.start_s, c.end_s, rules));
    expect(a.shares).toEqual([c.shares['100'], c.shares['250'], c.shares['500']]);
  });

  it('the landing pin snaps to the nearest grid point and steps with the arrow keys', async () => {
    const set = await loadMaskSet(fixtureManifest(), 'miss', PY.miss.id, fileFetcher, DATA);
    const pts = set.meta.points;
    const i = nearestGridPoint(pts, 140, -260);
    expect([pts[i].east_m, pts[i].north_m]).toEqual([100, -300]);
    const c = nearestGridPoint(pts, 0, 0);
    const e = stepGridPoint(pts, c, 1, 0);
    expect([pts[e].east_m, pts[e].north_m]).toEqual([100, 0]);
    const n = stepGridPoint(pts, c, 0, 1);
    expect([pts[n].east_m, pts[n].north_m]).toEqual([0, 100]);
    const edge = nearestGridPoint(pts, 500, 0);
    expect(stepGridPoint(pts, edge, 1, 0)).toBe(edge);
  });
});
