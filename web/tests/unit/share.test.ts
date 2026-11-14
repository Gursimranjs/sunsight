// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// P20: a shared link reopens the same scenario; the export equals what the screen shows.
import { describe, expect, it } from 'vitest';
import { runWindow } from '../../src/engine/compute';
import * as L from '../../src/engine/light';
import { SERIES_HEADER, toCsv, toJson, type ExportContext } from '../../src/export';
import { clampScenario, defaultScenario } from '../../src/state/scenario';
import { decodeScenario, encodeScenario } from '../../src/state/url';
import { fixtureTable } from './helpers';

const epoch = Date.UTC(2027, 0, 1);
const meta = { row_count: 1440, step_s: 3600 };
const ids = ['fixture_ridge', 'fixture_target', 'fixture_equator'];

describe('scenario in the URL', () => {
  it('round-trips a site scenario with edited rules, view, time and compare list', () => {
    const s = clampScenario({
      ...defaultScenario('fixture_target'), start_s: 6 * 86400 + 3600, stay_s: 3 * 86400, preset: 'crew',
      rules: L.makeRules({ ...L.PRESETS.crew, max_gap_s: 1000 * 3600, contact_mode: 'earth', weights: [0.6, 0.3, 0.1], lit_threshold: 0.75 }),
      view: 'miss', t_off_s: 7200, compare: ['fixture_ridge', 'fixture_equator'],
    }, meta);
    const q = encodeScenario(s, epoch);
    expect(q).toContain('site=fixture_target');
    expect(q).toContain('start=2027-01-07T01%3A00Z');
    const back = clampScenario(decodeScenario(q, epoch, 'fixture_ridge', ids), meta);
    expect(back).toEqual(s);
  });

  it('round-trips a custom point', () => {
    const s = clampScenario({ ...defaultScenario(null), lat_deg: -89.45, lon_deg: -137.31 }, meta);
    const back = clampScenario(decodeScenario(encodeScenario(s, epoch), epoch, 'fixture_ridge', ids), meta);
    expect(back).toEqual(s);
  });

  it('ignores junk and unknown sites', () => {
    const s = decodeScenario('site=nope&preset=evil&days=abc&view=hack&w=1,2', epoch, 'fixture_ridge', ids);
    expect(s.site_id).toBe('fixture_ridge');
    expect(s.preset).toBe('robotic');
    expect(s.view).toBe('report');
    expect(s.rules).toEqual(L.makeRules(L.PRESETS.robotic));
  });
});

describe('export', () => {
  it('CSV and JSON carry the same metrics, verdict and series as the screen', async () => {
    const t = await fixtureTable();
    const rules = L.makeRules(L.PRESETS.robotic);
    const a = runWindow(t, { place: { lat_deg: -84.79, lon_deg: 29.2, h_m: 5000 }, mask: L.flat_mask(L.smooth_horizon_deg(2)), start_s: 0, end_s: 14 * 86400, rules });
    const ctx: ExportContext = {
      fixture: true, site: { id: 'fixture_target', name: 'Fixture target (made-up)', lat_deg: -84.79, lon_deg: 29.2, h_m: 5000, horizon: 'No terrain: smooth horizon' },
      start_utc: '2027-01-01T00:00Z', stay_s: 14 * 86400, preset: 'robotic', rules, link: 'https://example.invalid/?site=fixture_target', epoch_ms: epoch,
    };
    const j = JSON.parse(toJson(a, ctx));
    expect(j.fixture).toBe(true);
    expect(j.verdict).toEqual(a.verdict);
    expect(j.metrics).toEqual(JSON.parse(JSON.stringify(a.metrics)));
    expect(j.series.rows.length).toBe(a.series.t_s.length);
    expect(j.series.rows[10][3]).toBe(a.series.sun_el_deg[10]);

    const csv = toCsv(a, ctx).trim().split('\n');
    expect(csv[0]).toContain('FIXTURE DATA');
    const head = csv.findIndex((l) => l === SERIES_HEADER.join(','));
    expect(csv.length - head - 1).toBe(a.series.t_s.length);
    const row = csv[head + 11].split(',');
    expect(Number(row[3])).toBe(a.series.sun_el_deg[10]);
    expect(row[0]).toBe('2027-01-01T01:40:00Z');
    expect(csv.find((l) => l.startsWith('# longest_dark_s,'))).toBe(`# longest_dark_s,${a.metrics.longest_dark_s}`);
  });
});
