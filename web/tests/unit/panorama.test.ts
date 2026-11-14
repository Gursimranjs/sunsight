// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// P12: disc sizes on the panorama match the computed radii on the chart's scale.
import { describe, expect, it } from 'vitest';
import { runWindow } from '../../src/engine/compute';
import * as L from '../../src/engine/light';
import { closeScale, disc, fullScale, terrainPath, trackPath, type PanoBox } from '../../src/views/panoGeometry';
import { fixtureTable } from './helpers';

const box: PanoBox = { width_px: 900, height_px: 300, padL: 54, padR: 12, padT: 12, padB: 44 };

describe('panorama geometry', () => {
  it('full strip: disc radius in px equals r_deg x px-per-degree on each axis', async () => {
    const t = await fixtureTable();
    const mask = L.flat_mask(L.smooth_horizon_deg(2));
    const a = runWindow(t, { place: { lat_deg: -85, lon_deg: 30, h_m: 0 }, mask, start_s: 0, end_s: 14 * 86400, rules: L.PRESETS.robotic });
    const s = fullScale(box, [...a.series.sun_el_deg, ...a.series.earth_el_deg, -0.1]);
    expect(s.px_per_deg_x).toBeCloseTo((900 - 66) / 360, 12);
    expect(s.exaggeration).toBeGreaterThan(1);
    const i = 300;
    const d = disc(s, a.series.sun_az_deg[i], a.series.sun_el_deg[i], a.series.sun_r_deg[i]);
    expect(d.ry).toBeCloseTo(a.series.sun_r_deg[i] * s.px_per_deg_y, 12);
    expect(d.rx).toBeCloseTo(a.series.sun_r_deg[i] * s.px_per_deg_x, 12);
    expect(d.cy).toBeCloseTo(s.y(a.series.sun_el_deg[i]), 12);
    // The Sun's apparent radius is about 0.27 degrees.
    expect(a.series.sun_r_deg[i]).toBeGreaterThan(0.25);
    expect(a.series.sun_r_deg[i]).toBeLessThan(0.28);
  });

  it('close-up: equal scales, so the disc is a true circle of r_deg x px-per-degree', () => {
    const s = closeScale(box, 359.5, 1.2, 2);
    expect(s.px_per_deg_x).toBeCloseTo(s.px_per_deg_y, 12);
    expect(s.exaggeration).toBeCloseTo(1, 12);
    const d = disc(s, 0.3, 1.2, 0.2666);
    expect(d.rx).toBeCloseTo(0.2666 * s.px_per_deg_x, 12);
    expect(d.ry).toBeCloseTo(d.rx, 12);
    // Azimuth 0.3 lies 0.8 degrees right of the centre at 359.5 (wraps across north).
    expect(d.cx).toBeCloseTo(box.padL + (900 - 66) / 2 + 0.8 * s.px_per_deg_x, 9);
  });

  it('terrain outline takes the maximum of the bins in each pixel column', () => {
    const mask = L.flat_mask(0);
    mask[100] = 5; // one tall spike, 0.25 degrees wide
    const s = fullScale(box, [0, 5]);
    const d = terrainPath(s, mask);
    const ys = [...d.matchAll(/L[\d.]+,([\d.]+)/g)].map((m) => Number(m[1]));
    expect(Math.min(...ys)).toBeCloseTo(s.y(5), 1);
  });

  it('tracks break where they wrap across north', () => {
    const s = fullScale(box, [0, 2]);
    const d = trackPath(s, [358, 359, 0.5, 1.5], [1, 1, 1, 1]);
    expect(d.split('M').length - 1).toBe(2);
  });
});
