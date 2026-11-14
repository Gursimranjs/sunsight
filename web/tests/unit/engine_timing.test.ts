// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// P9: a 14-day window scores in under 50 ms (measured in node on the fixture table).
import { expect, it } from 'vitest';
import { decodeEphemeris } from '../../src/data/loaders';
import type { EphemerisMeta } from '../../src/data/types';
import * as L from '../../src/engine/light';
import { manifest, readBuf, readJson } from './helpers';

it('scores a 14-day window in under 50 ms', async () => {
  const m = await manifest();
  const eph = decodeEphemeris(readJson<EphemerisMeta>(m.files.ephemeris.meta), readBuf(m.files.ephemeris.bin));
  const table: L.Table = { data: eph.data, rows: eph.meta.row_count, step_s: eph.meta.step_s };
  const mask = L.flat_mask(0.5);
  const rules = L.PRESETS.robotic;
  // Warm up the JIT once, as the worker does on its first request.
  L.window_compute(table, -89.4, -137, 1500, mask, 0, 14 * 86400, rules);
  const runs: number[] = [];
  for (let k = 0; k < 5; k++) {
    const t0 = performance.now();
    const r = L.window_compute(table, -89.4, -137, 1500, mask, 86400 * (k + 1), 86400 * (k + 15), rules);
    runs.push(performance.now() - t0);
    expect(r.metrics.n_samples).toBe(2017);
    L.verdict(r.metrics, rules);
  }
  runs.sort((a, b) => a - b);
  const median_ms = runs[2];
  console.log(`14-day window: median ${median_ms.toFixed(2)} ms, worst ${runs[4].toFixed(2)} ms over 5 runs`);
  expect(median_ms).toBeLessThan(50);
});
