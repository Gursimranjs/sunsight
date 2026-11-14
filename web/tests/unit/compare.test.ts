// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// P13: calendar days fit the table; the calendar job agrees with the report card for every cell.
import { describe, expect, it } from 'vitest';
import { loadSites } from '../../src/data/loaders';
import { resolveSite } from '../../src/data/sites';
import { runCalendar, runWindow } from '../../src/engine/compute';
import * as L from '../../src/engine/light';
import { dayStarts } from '../../src/views/calendar';
import { DATA, fileFetcher, fixtureManifest, fixtureTable } from './helpers';

const meta = { row_count: 1440, step_s: 3600 };
const epoch = Date.UTC(2027, 0, 1);

describe('calendar', () => {
  it('starts at UTC midnights and stops before the stay would leave the table', () => {
    expect(dayStarts(0, 3, 86400, meta, epoch)).toEqual([0, 86400, 172800]);
    expect(dayStarts(3600, 2, 86400, meta, epoch)).toEqual([86400, 172800]);
    const s = dayStarts(40 * 86400, 30, 14 * 86400, meta, epoch);
    expect(s[s.length - 1] + 14 * 86400).toBeLessThanOrEqual(1438 * 3600);
    expect(s.length).toBeLessThan(30);
  });

  it('every calendar cell equals the report card for that site and start date', async () => {
    const t = await fixtureTable();
    const { sites } = await loadSites(fixtureManifest(), fileFetcher, DATA);
    const rules = L.makeRules({ ...L.PRESETS.crew });
    const starts = dayStarts(0, 5, rules.stay_s, meta, epoch);
    const places = sites.filter((s) => !s.region_id).map((s) => resolveSite(s, null, rules.observer_height_m));
    const cal = runCalendar(t, {
      sites: places.map((p) => ({ place: { lat_deg: p.lat_deg, lon_deg: p.lon_deg, h_m: p.h_m }, mask: p.mask })),
      day_starts_s: starts, stay_s: rules.stay_s, rules,
    });
    places.forEach((p, i) => starts.forEach((s, j) => {
      const r = runWindow(t, { place: { lat_deg: p.lat_deg, lon_deg: p.lon_deg, h_m: p.h_m }, mask: p.mask, start_s: s, end_s: s + rules.stay_s, rules });
      expect(cal.cells[i][j].verdict).toBe(r.verdict.verdict);
      expect(cal.cells[i][j].score).toBe(r.metrics.score);
    }));
  });
});
