// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// P11: the report card's countdowns equal the times in the event list.
import { describe, expect, it } from 'vitest';
import { runWindow } from '../../src/engine/compute';
import { countdown, countdownsAt, stateAt } from '../../src/engine/countdown';
import * as L from '../../src/engine/light';
import { resolveCustom } from '../../src/data/sites';
import { clampWindow } from '../../src/state/scenario';
import { formatDuration } from '../../src/format';
import { fixtureTable } from './helpers';

describe('countdowns', () => {
  it('at the window start equal next_sunset/sunrise/earthset/earthrise from window_metrics', async () => {
    const t = await fixtureTable();
    let checked = 0;
    for (const [lat, lon] of [[0.67, 23.47], [-85, 30], [-89.5, 45], [45, -120]]) {
      for (const start of [0, 5 * 86400, 17 * 86400]) {
        const place = resolveCustom(lat, lon, 2);
        const a = runWindow(t, { place: { lat_deg: lat, lon_deg: lon, h_m: 0 }, mask: place.mask, start_s: start, end_s: start + 14 * 86400, rules: L.PRESETS.robotic });
        const m = a.metrics;
        const s0 = { lit0: a.series.sun_frac[0] >= 0.5, earth0: a.series.earth_frac[0] > 0, contact0: a.series.contact[0] > 0 };
        const c = countdownsAt(m, s0, start);
        if (c.sun.up) expect(c.sun.in_s).toBe(m.next_sunset_s); else expect(c.sun.in_s).toBe(m.next_sunrise_s);
        if (c.earth.up) expect(c.earth.in_s).toBe(m.next_earthset_s); else expect(c.earth.in_s).toBe(m.next_earthrise_s);
        if (c.contact.up) expect(c.contact.in_s).toBe(m.next_contact_loss_s);
        checked++;
      }
    }
    expect(checked).toBe(12);
  });

  it('anywhere in the window, each countdown lands exactly on the next event in the list', async () => {
    const t = await fixtureTable();
    const a = runWindow(t, { place: { lat_deg: -85, lon_deg: 30, h_m: 0 }, mask: L.flat_mask(-0.087), start_s: 0, end_s: 30 * 86400, rules: L.PRESETS.long });
    const evs = a.metrics.lit_events;
    expect(evs.length).toBeGreaterThan(0);
    const lit0 = a.series.sun_frac[0] >= 0.5;
    for (let k = 0; k < evs.length; k++) {
      const before = evs[k].t_s - 1234;
      const c = countdown(lit0, evs, before);
      expect(c.up).toBe(!evs[k].to);
      expect(c.at_s).toBe(evs[k].t_s);
      expect(c.in_s).toBe(1234);
      // Just after the event the state has flipped.
      expect(stateAt(lit0, evs, evs[k].t_s + 1)).toBe(evs[k].to);
    }
  });

  it('formats countdowns to the minute', () => {
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(59 * 60 + 29)).toBe('59 min');
    expect(formatDuration(3600 * 26 + 120)).toBe('1 d 2 h 2 min');
  });
});

describe('date clamping to the table range', () => {
  const meta = { row_count: 1440, step_s: 3600 };
  it('keeps the stay inside the table', () => {
    expect(clampWindow(-5, 86400, meta)).toEqual({ start_s: 0, stay_s: 86400 });
    expect(clampWindow(1e9, 14 * 86400, meta)).toEqual({ start_s: 1438 * 3600 - 14 * 86400, stay_s: 14 * 86400 });
    expect(clampWindow(0, 1e9, meta)).toEqual({ start_s: 0, stay_s: 1438 * 3600 });
    expect(clampWindow(NaN, NaN, meta).start_s).toBe(0);
  });
});
