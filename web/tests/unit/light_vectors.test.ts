// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// P9: the browser engine reproduces every shared vector in tests/vectors/light_vectors.json to 1e-6.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as L from '../../src/engine/light';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const V: any = JSON.parse(readFileSync(new URL('../../../tests/vectors/light_vectors.json', import.meta.url), 'utf8'));
const TOL: number = V.tolerance;
const rugged: number[] = V.masks.rugged;

function maskOf(ref: unknown): number[] {
  if (ref === 'rugged') return rugged;
  if (ref === 'flat0') return L.flat_mask(0.0);
  return ref as number[];
}

function close(a: number, b: number, what: string) {
  if (Math.abs(a - b) > TOL) throw new Error(`${what}: got ${a}, expected ${b} (|diff| ${Math.abs(a - b)})`);
}

function table(): L.Table {
  const rows: number[][] = V.table.rows;
  const data = new Float32Array(rows.length * 18);
  rows.forEach((r, i) => data.set(r, i * 18));
  return { data, rows: rows.length, step_s: V.table.step_s };
}

describe('shared light vectors (tolerance 1e-6)', () => {
  it('uses the agreed tolerance', () => expect(TOL).toBe(1e-6));

  it('geometry: site_vector, local_frame, az_el', () => {
    expect(V.geometry.length).toBeGreaterThan(0);
    for (const g of V.geometry) {
      const s = L.site_vector(g.lat_deg, g.lon_deg, g.h_m);
      const f = L.local_frame(g.lat_deg, g.lon_deg);
      for (let i = 0; i < 3; i++) {
        close(s[i], g.site_km[i], 'site');
        close(f.east[i], g.east[i], 'east');
        close(f.north[i], g.north[i], 'north');
        close(f.up[i], g.up[i], 'up');
      }
      const r = L.az_el(g.target_km, s, f);
      close(r.az_deg, g.az_deg, 'az');
      close(r.el_deg, g.el_deg, 'el');
      close(r.dist_km, g.dist_km, 'dist');
    }
  });

  it('angular_radius and smooth_horizon_deg', () => {
    for (const c of V.angular_radius) close(L.angular_radius(c.args[0], c.args[1]), c.expected, 'angular_radius');
    for (const c of V.smooth_horizon) close(L.smooth_horizon_deg(c.h_m), c.expected, 'smooth_horizon');
  });

  it('horizon_at, including negative and >360 azimuths', () => {
    for (const c of V.horizon_at) close(L.horizon_at(rugged, c.az_deg), c.expected, `horizon_at ${c.az_deg}`);
  });

  it('sun_fraction: every case', () => {
    expect(V.sun_fraction.length).toBe(30);
    for (const c of V.sun_fraction) {
      const [a, b, r, d, e, f] = c.args;
      close(L.sun_fraction(maskOf(c.mask), a, b, r, d, e, f), c.expected, c.name);
    }
  });

  it('disc_fraction: every case', () => {
    for (const c of V.disc_fraction) close(L.disc_fraction(rugged, c.args[0], c.args[1], c.args[2]), c.expected, 'disc');
  });

  it('station_contact: every case', () => {
    for (const c of V.station_contact) expect(L.station_contact(c.args[0], c.args[1], c.args[2]), c.name).toBe(c.expected);
  });

  it('interp: every case', () => {
    const t = table();
    for (const c of V.interp) {
      const row = L.interp(t, c.t_s);
      c.expected.forEach((v: number, k: number) => close(row[k], v, `interp t=${c.t_s} col ${k}`));
    }
  });

  it('window: full metrics, event lists and verdicts for both cases', () => {
    const t = table();
    expect(V.window.length).toBe(2);
    for (const w of V.window) {
      const rules = L.PRESETS[w.preset as L.PresetId];
      // The preset in TypeScript equals the preset the vectors were made with.
      expect({ ...rules, weights: [...rules.weights] }).toEqual(w.rules);
      const m = L.window_metrics(t, w.lat_deg, w.lon_deg, w.h_m, rugged, w.start_s, w.end_s, rules);
      const got = m as unknown as Record<string, unknown>;
      expect(Object.keys(got).sort()).toEqual(Object.keys(w.metrics).sort());
      for (const [k, v] of Object.entries(w.metrics)) {
        if (typeof v === 'number') close(got[k] as number, v, `${w.preset} ${k}`);
        else if (Array.isArray(v)) {
          const ev = got[k] as L.LightEvent[];
          expect(ev.length, `${w.preset} ${k} length`).toBe(v.length);
          v.forEach((e: L.LightEvent, i: number) => {
            close(ev[i].t_s, e.t_s, `${w.preset} ${k}[${i}].t_s`);
            expect(ev[i].to).toBe(e.to);
          });
        } else expect(got[k], `${w.preset} ${k}`).toEqual(v);
      }
      expect(L.verdict(m, rules)).toEqual(w.verdict);
    }
  });

  it('verdict_cases: every preset and branch gives the same verdict and reason text', () => {
    for (const c of V.verdict_cases) expect(L.verdict(c.metrics, L.PRESETS[c.preset as L.PresetId])).toEqual(c.expected);
  });

  it('format_hours: same text as Python, days over 48 hours', () => {
    expect(V.format_hours.length).toBeGreaterThan(5);
    for (const c of V.format_hours) expect(L.formatHoursText(c.s)).toBe(c.expected);
  });

  it('miss_share', () => {
    for (const c of V.miss_share) close(L.miss_share(c.passes, c.east_m, c.north_m, c.radius_m), c.expected, 'miss_share');
  });
});

describe('duration text (review note 003 E)', () => {
  it('47.9 h, 48 h and 311.6 h', () => {
    expect(L.formatHoursText(47.9 * 3600)).toBe('47.9 h');
    expect(L.formatHoursText(48 * 3600)).toBe('48.0 h');
    expect(L.formatHoursText(311.6 * 3600)).toBe('13.0 days (311.6 h)');
  });
});

describe('Python-compatible helpers', () => {
  it('pyFixed rounds exact ties to even like Python', () => {
    expect(L.pyFixed(0.25, 1)).toBe('0.2');
    expect(L.pyFixed(0.75, 1)).toBe('0.8');
    expect(L.pyFixed(2.25, 1)).toBe('2.2');
    expect(L.pyFixed(0.15, 1)).toBe('0.1');
    expect(L.pyFixed(12.5, 0)).toBe('12');
    expect(L.pyFixed(13.5, 0)).toBe('14');
    expect(L.pyFixed(3.0, 1)).toBe('3.0');
  });
  it('wrap180 and horizon_at follow Python modulo for negatives', () => {
    expect(L.wrap180(-190)).toBe(170);
    expect(L.wrap180(190)).toBe(-170);
    const m = L.flat_mask(0).map((_, i) => i);
    expect(L.horizon_at(m, -0.25)).toBeCloseTo(1439, 9);
  });
});
