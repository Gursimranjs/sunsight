// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Review fix 7: the footer's "scored in X ms" is the time of the window job it describes, not of
// whatever job (calendar, miss grid) ran last.
import { expect, it } from 'vitest';
import { Engine } from '../../src/engine/client';
import * as L from '../../src/engine/light';
import { fixtureTable } from './helpers';

it('lastWindowMs is set only by window jobs; windowTimed returns the time of its own job', async () => {
  const e = new Engine(await fixtureTable());
  const mask = L.flat_mask(L.smooth_horizon_deg(2));
  const place = { lat_deg: -85, lon_deg: 30, h_m: 0 };
  const rules = L.PRESETS.robotic;
  expect(e.lastWindowMs).toBe(0);
  const { answer, ms } = await e.windowTimed({ place, mask, start_s: 0, end_s: 3 * 86400, rules });
  expect(answer.metrics.n_samples).toBeGreaterThan(0);
  expect(ms).toBeGreaterThan(0);
  expect(e.lastWindowMs).toBe(ms);
  // A long calendar job afterwards changes lastMs but not lastWindowMs.
  await e.calendar({ sites: [{ place, mask }, { place: { ...place, lat_deg: -89 }, mask }], day_starts_s: [0, 86400, 2 * 86400, 3 * 86400, 4 * 86400, 5 * 86400], stay_s: 14 * 86400, rules });
  expect(e.lastMs).not.toBe(ms);
  expect(e.lastWindowMs).toBe(ms);
  await e.window({ place, mask, start_s: 0, end_s: 86400, rules });
  expect(e.lastWindowMs).toBe(e.lastMs);
});
