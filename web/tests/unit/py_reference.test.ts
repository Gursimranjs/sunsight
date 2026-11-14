// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Extra parity with pipeline/sunsight/light.py beyond the shared vectors: all verdict branches,
// windows on the committed fixture table (smooth horizon, region mask, 'earth' contact mode).
// The answers come from web/scripts/py_reference.py (made-up fixture data).
import { describe, expect, it } from 'vitest';
import { decodeMasks } from '../../src/data/loaders';
import * as L from '../../src/engine/light';
import { fixtureManifest, fixtureTable, PY, readBuf, readJson } from './helpers';

const TOL: number = PY.tolerance;

function closeMetrics(got: L.Metrics, want: Record<string, unknown>, tag: string) {
  const g = got as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(want)) {
    if (typeof v === 'number') {
      if (Math.abs((g[k] as number) - v) > TOL) throw new Error(`${tag} ${k}: ${g[k]} vs ${v}`);
    } else if (Array.isArray(v)) {
      const ev = g[k] as L.LightEvent[];
      expect(ev.length, `${tag} ${k}`).toBe(v.length);
      v.forEach((e: L.LightEvent, i: number) => {
        expect(Math.abs(ev[i].t_s - e.t_s)).toBeLessThanOrEqual(TOL);
        expect(ev[i].to).toBe(e.to);
      });
    } else expect(g[k], `${tag} ${k}`).toEqual(v);
  }
}

describe('parity with the Python reference on fixture data', () => {
  it('reference file is flagged as fixture', () => expect(PY.fixture).toBe(true));

  it('verdict: go, marginal and no-go branches with identical wording', () => {
    const kinds = new Set<string>();
    for (const c of PY.verdict) {
      const v = L.verdict(c.metrics as L.Metrics, L.PRESETS[c.preset as L.PresetId]);
      expect(v).toEqual(c.expected);
      kinds.add(v.verdict);
    }
    expect([...kinds].sort()).toEqual(['go', 'marginal', 'no-go']);
  });

  it('windows: smooth horizon, region mask and earth contact mode', async () => {
    const t = await fixtureTable();
    const m = fixtureManifest();
    for (const w of PY.windows) {
      const rules = L.makeRules({ ...L.PRESETS[w.preset as L.PresetId], ...(w.rules_over ?? {}) });
      let mask: L.Mask;
      if (w.mask.smooth_m !== undefined) mask = L.flat_mask(L.smooth_horizon_deg(w.mask.smooth_m));
      else if (w.mask.flat !== undefined) mask = L.flat_mask(w.mask.flat);
      else {
        const reg = m.files.regions!.find((r) => r.id === w.mask.region)!;
        const meta = readJson<{ observer_heights_m: number[]; bin_count: number; scale_deg: number; points: unknown[] }>(reg.meta);
        const all = decodeMasks(readBuf(reg.masks!), meta.scale_deg);
        const nh = meta.observer_heights_m.length;
        const off = (w.mask.point * nh + w.mask.height_index) * meta.bin_count;
        mask = all.subarray(off, off + meta.bin_count);
      }
      const got = L.window_metrics(t, w.lat_deg, w.lon_deg, w.h_m, mask, w.start_s, w.end_s, rules);
      closeMetrics(got, w.metrics, w.name);
      expect(L.verdict(got, rules)).toEqual(w.verdict);
    }
  });
});
