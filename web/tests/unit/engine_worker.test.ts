// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// P9: the worker jobs give the same answers as the reference functions; the client falls back to the
// main thread where Worker is missing (node).
import { expect, it } from 'vitest';
import { decodeEphemeris } from '../../src/data/loaders';
import type { EphemerisMeta } from '../../src/data/types';
import { Engine } from '../../src/engine/client';
import { runWindow } from '../../src/engine/compute';
import * as L from '../../src/engine/light';
import { manifest, readBuf, readJson } from './helpers';

async function table(): Promise<L.Table> {
  const m = await manifest();
  const eph = decodeEphemeris(readJson<EphemerisMeta>(m.files.ephemeris.meta), readBuf(m.files.ephemeris.bin));
  return { data: eph.data, rows: eph.meta.row_count, step_s: eph.meta.step_s };
}

it('runWindow returns the reference metrics, verdict and the 10-minute series', async () => {
  const t = await table();
  const mask = L.flat_mask(L.smooth_horizon_deg(2));
  const rules = L.PRESETS.robotic;
  const a = runWindow(t, { place: { lat_deg: -85, lon_deg: 30, h_m: 0 }, mask, start_s: 0, end_s: 14 * 86400, rules });
  const ref = L.window_metrics(t, -85, 30, 0, mask, 0, 14 * 86400, rules);
  expect(a.metrics).toEqual(ref);
  expect(a.verdict).toEqual(L.verdict(ref, rules));
  expect(a.series.t_s.length).toBe(ref.n_samples);
  expect(a.series.t_s[1] - a.series.t_s[0]).toBe(600);
});

it('Engine falls back to the main thread without Worker and gives the same answer', async () => {
  const t = await table();
  const e = new Engine(t);
  const job = { place: { lat_deg: 0.67, lon_deg: 23.47, h_m: 0 }, mask: L.flat_mask(0), start_s: 3600, end_s: 3 * 86400, rules: L.PRESETS.crew };
  const r = await e.window(job);
  expect(r.metrics).toEqual(runWindow(t, job).metrics);
});
