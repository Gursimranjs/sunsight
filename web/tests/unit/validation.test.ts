// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// P17 (UI): the validation summary loads, every check has a number with unit, a pass mark, a status
// and an explanation; CSVs parse; a missing file is reported honestly.
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
      id: 'a', title: 'a', what: '', value, unit, value_label: '', pass_mark: '', status: 'pass', explanation: '', data: null, rows: 0,
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
