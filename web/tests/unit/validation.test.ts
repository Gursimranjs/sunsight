// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// P17 (UI): the validation summary loads, every check has a number with unit, a pass mark, a status
// and an explanation; CSVs parse; a missing file is reported honestly.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  checkCounts, formatCheckValue, loadValidation, normalizeSummary, parseCsv, STATUS_INFO, type ValidationCheck,
} from '../../src/data/validation';
import type { Manifest } from '../../src/data/types';
import { DATA, fileFetcher, fixtureManifest, readJson } from './helpers';

describe('validation summary', () => {
  it('loads the fixture summary named in the fixture manifest', async () => {
    const v = await loadValidation(fixtureManifest(), fileFetcher, DATA);
    expect(v.state).toBe('ok');
    if (v.state !== 'ok') return;
    expect(v.fixture).toBe(true);
    expect(v.summary.checks.length).toBe(8);
    for (const c of v.summary.checks) {
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.pass_mark.length).toBeGreaterThan(0);
      expect(c.explanation.length).toBeGreaterThan(0);
      expect(Object.keys(STATUS_INFO)).toContain(c.status);
      if (c.status !== 'not run') expect(Number.isFinite(c.value)).toBe(true);
    }
    expect(v.summary.limits.length).toBeGreaterThan(0);
    const n = checkCounts(v.summary.checks);
    expect(n.pass + n.fail + n.partial + n['not run']).toBe(8);
    expect(n.fail).toBe(1);
  });

  it('says "not run yet" when the manifest has no validation entry or the file is missing', async () => {
    const m = { ...fixtureManifest(), files: { ...fixtureManifest().files } } as Manifest;
    delete m.files.validation;
    expect((await loadValidation(m, fileFetcher, DATA)).state).toBe('missing');
    m.files.validation = 'validation/no_such_file.json';
    expect((await loadValidation(m, fileFetcher, DATA)).state).toBe('missing');
  });

  it('accepts the older placeholder shape and fills gaps with honest defaults', () => {
    const s = normalizeSummary({ checks: [{ id: 'x', title: 'x', value: null, unit: '', pass_mark: 'p', status: 'weird', explanation: '' }] });
    expect(s.checks[0].status).toBe('not run');
    expect(s.checks[0].explanation).toMatch(/No explanation/);
    expect(s.checks[0].data).toBeNull();
    expect(s.limits).toEqual([]);
    expect(s.generated_utc).toBeNull();
  });

  it('formats values with their unit', () => {
    const c = (value: number | null, unit: string): ValidationCheck => ({
      id: 'a', title: 'a', what: '', value, unit, value_label: '', pass_mark: '', status: 'pass', explanation: '', data: null, rows: 0, source: null, spread_points: null, timing_s: null,
    });
    expect(formatCheckValue(c(2.6e-5, 'deg'))).toBe('0.000026°');
    expect(formatCheckValue(c(0.004, 'deg'))).toBe('0.004°');
    expect(formatCheckValue(c(3.4, 'percentage points'))).toBe('3.4 percentage points');
    expect(formatCheckValue(c(1.5, '%'))).toBe('1.5%');
    expect(formatCheckValue(c(0, ''))).toBe('0');
    expect(formatCheckValue(c(1234.5678, 's'))).toBe('1235 s');
    expect(formatCheckValue(c(null, 'deg'))).toBe('no number yet');
  });

  it('parses CSV with quoted fields and keeps only the first rows asked for', async () => {
    const text = await (await fileFetcher(DATA + 'validation/fixture_ephemeris_horizons.csv')).text();
    const t = parseCsv(text, 3);
    expect(t.header).toEqual(['site', 'utc', 'body', 'az_diff_deg', 'el_diff_deg']);
    expect(t.rows.length).toBe(3);
    expect(t.total).toBe(4);
    const all = parseCsv(text, 10);
    expect(all.rows[3][0]).toBe('fixture, quoted');
    expect(parseCsv('a,b\r\n"x ""y""",2\r\n', 5).rows).toEqual([['x "y"', '2']]);
  });

  it('every CSV the fixture summary names exists', async () => {
    const s = normalizeSummary(readJson('validation/fixture_summary.json'));
    for (const c of s.checks.filter((x) => x.data)) {
      const res = await fileFetcher(DATA + c.data);
      expect(res.ok).toBe(true);
      expect(parseCsv(await res.text(), 100).total).toBe(c.rows);
    }
  });
});

describe('validation extras: source, spread, timing, sensitivity', () => {
  it('reads them from the fixture, baseline first', () => {
    const s = normalizeSummary(readJson('validation/fixture_summary.json'));
    const c = s.checks.find((x) => x.id === 'sunlight_pgda')!;
    expect(c.source).toBe('https://pgda.gsfc.nasa.gov/products/69');
    expect(c.spread_points).toBe(3.1);
    expect(c.timing_s).toBe(2.5);
    expect(s.checks.find((x) => x.id === 'eclipses')!.source).toBeNull();
    expect(s.sensitivity!.rows[0].delta_points).toBe(0);
    expect(s.sensitivity!.rows.length).toBe(3);
    expect(s.sensitivity!.point!.label).toMatch(/fixture/);
  });

  it('drops a malformed sensitivity block and non-http sources', () => {
    const s = normalizeSummary({ checks: [{ id: 'a', source: 'javascript:alert(1)' }], sensitivity: { rows: [{ change: 1 }] } });
    expect(s.sensitivity).toBeNull();
    expect(s.checks[0].source).toBeNull();
  });

  it('the shipped real summary (if present) parses with every field the page shows', () => {
    const path = new URL('../../public/data/validation/summary.json', import.meta.url).pathname;
    let raw: unknown;
    try { raw = JSON.parse(readFileSync(path, 'utf8')); } catch { return; }
    const s = normalizeSummary(raw);
    expect(s.checks.length).toBe(9); // eight checks plus "real_missions" (review note 004)
    expect(s.checks[8].id).toBe('real_missions');
    for (const c of s.checks) {
      expect(c.explanation).not.toMatch(/No explanation/);
      expect(c.pass_mark).not.toBe('not stated');
    }
    if (s.sensitivity) expect(s.sensitivity.rows[0].delta_points).toBe(0);
  });
});

describe('reported status (review note 004)', () => {
  it('is kept by the normaliser and counted', () => {
    const s = normalizeSummary({ checks: [{ id: 'real_missions', title: 'Real missions', value: 7, unit: 'events', pass_mark: 'None set', status: 'reported', explanation: 'x' }] });
    expect(s.checks[0].status).toBe('reported');
    expect(checkCounts(s.checks).reported).toBe(1);
    expect(STATUS_INFO.reported.label).toBe('REPORTED');
  });
});

