// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Review note 004, item 1: the table is fetched one year at a time. These tests use the shipped files in
// public/data: the year files must fill exactly the rows a computation reads, each fetch happens once,
// a window across a year boundary gives bit-identical answers to the full 2027-2030 table, and nothing
// computes on a row that is not loaded.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { N_COLS } from '../../src/data/contracts';
import { EphemerisStore, rowsForRange, stencilRows, type YearRef } from '../../src/data/ephemerisStore';
import { decodeEphemeris, loadEphemerisStore } from '../../src/data/loaders';
import type { EphemerisMeta, Manifest } from '../../src/data/types';
import { Engine, jobRange } from '../../src/engine/client';
import { runCalendar, runWindow } from '../../src/engine/compute';
import * as L from '../../src/engine/light';
import { fileFetcher, fixtureManifest, DATA as FIXTURE_DATA } from './helpers';

const PUB = new URL('../../public/data/', import.meta.url).pathname;
const man = JSON.parse(readFileSync(PUB + 'manifest.json', 'utf8')) as Manifest;
const meta = JSON.parse(readFileSync(PUB + man.files.ephemeris.meta, 'utf8')) as EphemerisMeta;
const years = man.files.ephemeris.years!;
const H = 3600;
const yearOf = (y: number) => years.find((c) => c.year === y)!;
/** Seconds after the table start of 1 January 00:00 UTC of `y`. */
const jan1 = (y: number) => yearOf(y).first_row * H;

function readBuf(path: string): ArrayBuffer {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

let fullCache: L.Table | null = null;
function fullTable(): L.Table {
  if (!fullCache) {
    const eph = decodeEphemeris(meta, readBuf(PUB + man.files.ephemeris.bin));
    fullCache = { data: eph.data, rows: eph.meta.row_count, step_s: eph.meta.step_s };
  }
  return fullCache;
}

/** A store over the shipped year files that counts fetches per year (optionally failing the first one). */
function store(failFirst = false) {
  const calls: number[] = [];
  let failed = false;
  const s = new EphemerisStore(meta, years, async (c: YearRef) => {
    calls.push(c.year);
    await new Promise((r) => setTimeout(r, 5)); // let concurrent callers overlap
    if (failFirst && !failed) { failed = true; throw new Error('network down'); }
    return readBuf(PUB + c.bin);
  });
  return { s, calls };
}

const loadedRows = (t: { loaded: Uint8Array }) => {
  const out: [number, number][] = [];
  let a = -1;
  t.loaded.forEach((v, k) => {
    if (v && a < 0) a = k;
    if (!v && a >= 0) { out.push([a, k - 1]); a = -1; }
  });
  if (a >= 0) out.push([a, t.loaded.length - 1]);
  return out;
};

describe('year files', () => {
  it('the manifest lists four years that tile the 35,064 rows', () => {
    expect(years.map((c) => [c.year, c.first_row, c.row_count])).toEqual([
      [2027, 0, 8760], [2028, 8760, 8784], [2029, 17544, 8760], [2030, 26304, 8760],
    ]);
    expect(meta.row_count).toBe(35_064);
    // The time origin is unchanged: row 0 is 2027-01-01T00:00 UTC, and 2029 starts 731 days later.
    expect(meta.start_utc).toBe('2027-01-01T00:00:00');
    expect(jan1(2029)).toBe(731 * 86400);
  });

  it('each year file is byte-for-byte the matching rows of 2027_2030.bin', () => {
    const full = new Uint8Array(readBuf(PUB + man.files.ephemeris.bin));
    for (const c of years) {
      const part = new Uint8Array(readBuf(PUB + c.bin));
      const a = c.first_row * N_COLS * 4;
      expect(part.length).toBe(c.row_count * N_COLS * 4);
      expect(Buffer.compare(Buffer.from(part), Buffer.from(full.subarray(a, a + part.length)))).toBe(0);
    }
  });
});

describe('stencil rows', () => {
  it('match interp: rows i-1..i+2 with i clamped to [1, n-3]', () => {
    expect(stencilRows(0, 100, H)).toEqual([0, 3]);
    expect(stencilRows(5.5 * H, 100, H)).toEqual([4, 7]);
    expect(stencilRows(98 * H, 100, H)).toEqual([96, 99]);
    expect(rowsForRange(10 * H, 20 * H + 1, 100, H)).toEqual([9, 22]);
    expect(rowsForRange(20 * H, 10 * H, 100, H)).toEqual([9, 22]);
  });
});

describe('ensureRange', () => {
  it('fills exactly the rows of the one year a mid-2029 stay needs, bit-identical to the full table', async () => {
    const { s, calls } = store();
    const a = jan1(2029) + 200 * 86400;
    expect(s.has(a, a + 14 * 86400)).toBe(false);
    await s.ensureRange(a, a + 14 * 86400);
    expect(calls).toEqual([2029]);
    expect(s.has(a, a + 14 * 86400)).toBe(true);
    const y = yearOf(2029);
    expect(loadedRows(s.table)).toEqual([[y.first_row, y.first_row + y.row_count - 1]]);
    const full = fullTable().data as Float32Array;
    const lo = y.first_row * N_COLS, hi = (y.first_row + y.row_count) * N_COLS;
    expect(Buffer.compare(Buffer.from(s.table.data.buffer, lo * 4, (hi - lo) * 4), Buffer.from(full.buffer, full.byteOffset + lo * 4, (hi - lo) * 4))).toBe(0);
    // Every other row is still empty.
    expect(s.table.data.subarray(0, lo).every((v) => v === 0)).toBe(true);
    expect(s.table.data.subarray(hi).every((v) => v === 0)).toBe(true);
  });

  it('also loads the next year when the interpolation stencil at the end reaches into it', async () => {
    const { s, calls } = store();
    // Ends 1.5 h before 2030 starts: interp at that time reads rows up to the first row of 2030.
    const end = jan1(2030) - 1.5 * H;
    expect(rowsForRange(end - 86400, end, meta.row_count, H)[1]).toBe(yearOf(2030).first_row);
    await s.ensureRange(end - 86400, end);
    expect(calls.sort()).toEqual([2029, 2030]);
    // Ending 3 h before the new year stays inside 2029.
    const t = store();
    await t.s.ensureRange(jan1(2030) - 4 * 86400, jan1(2030) - 3 * H);
    expect(t.calls).toEqual([2029]);
  });

  it('dedupes concurrent requests: each year is fetched once', async () => {
    const { s, calls } = store();
    const a = jan1(2028) + 10 * 86400;
    await Promise.all([s.ensureRange(a, a + 86400), s.ensureRange(a + 3600, a + 2 * 86400), s.ensureRange(0, a), s.ensureAll()]);
    expect(calls.sort()).toEqual([2027, 2028, 2029, 2030]);
    expect(s.fetches).toBe(4);
    await s.ensureAll();
    expect(s.fetches).toBe(4);
    expect(s.table.loaded.every((v) => v === 1)).toBe(true);
  });

  it('a failed fetch rejects, and the next call fetches again', async () => {
    const { s, calls } = store(true);
    const a = jan1(2027) + 86400;
    await expect(s.ensureRange(a, a + 3600)).rejects.toThrow('network down');
    expect(s.has(a, a + 3600)).toBe(false);
    await s.ensureRange(a, a + 3600);
    expect(calls).toEqual([2027, 2027]);
  });

  it('rejects a year file of the wrong size', async () => {
    const s = new EphemerisStore(meta, years, async () => new ArrayBuffer(16));
    await expect(s.ensureRange(0, 3600)).rejects.toThrow(/2027\.bin is 16 bytes/);
  });

  it('notifies listeners with the rows it filled (what the worker receives)', async () => {
    const { s } = store();
    const got: [number, number][] = [];
    s.onFill((first_row, rows) => got.push([first_row, rows.length / N_COLS]));
    await s.ensureRange(jan1(2030) + 86400, jan1(2030) + 2 * 86400);
    expect(got).toEqual([[yearOf(2030).first_row, yearOf(2030).row_count]]);
  });
});

describe('guard', () => {
  it('interp throws a clear error on rows that are not loaded', async () => {
    const { s } = store();
    expect(() => L.interp(s.table, jan1(2029) + 3600)).toThrow(L.RowsNotLoadedError);
    expect(() => L.interp(s.table, jan1(2029) + 3600)).toThrow(/not loaded yet/);
    await s.ensureRange(jan1(2029) + 86400, jan1(2029) + 2 * 86400);
    expect(() => L.interp(s.table, jan1(2029) + 86400)).not.toThrow();
    // The last hours of 2029 read the first row of 2030, which is not loaded.
    expect(() => L.interp(s.table, jan1(2030) - 1.5 * H)).toThrow(L.RowsNotLoadedError);
  });

  it('a job over unloaded rows throws instead of computing on zeros', async () => {
    const { s } = store();
    const mask = L.flat_mask(L.smooth_horizon_deg(2));
    const job = { place: { lat_deg: -89.45, lon_deg: -137.31, h_m: 1800 }, mask, start_s: jan1(2028), end_s: jan1(2028) + 86400, rules: L.PRESETS.robotic };
    expect(() => runWindow(s.table, job)).toThrow(L.RowsNotLoadedError);
    expect(() => runCalendar(s.table, { sites: [{ place: job.place, mask }], day_starts_s: [jan1(2028)], stay_s: 86400, rules: job.rules })).toThrow(/not loaded yet/);
  });
});

describe('answers match the full table', () => {
  const mask = L.flat_mask(L.smooth_horizon_deg(2));
  const place = { lat_deg: -89.45, lon_deg: -137.31, h_m: 1800 };

  it('a 14-day window across 2027 -> 2028 gives bit-identical metrics, verdict and series', async () => {
    const { s, calls } = store();
    const job = { place, mask, start_s: jan1(2028) - 7 * 86400, end_s: jan1(2028) + 7 * 86400, rules: L.PRESETS.robotic };
    await s.ensureRange(job.start_s, job.end_s);
    expect(calls.sort()).toEqual([2027, 2028]);
    const lazy = runWindow(s.table, job);
    const full = runWindow(fullTable(), job);
    expect(lazy.metrics).toStrictEqual(full.metrics);
    expect(lazy.verdict).toStrictEqual(full.verdict);
    // toStrictEqual compares numbers with Object.is, so every value is the same double.
    for (const k of Object.keys(full.series) as (keyof typeof full.series)[]) {
      expect(Array.from(lazy.series[k])).toStrictEqual(Array.from(full.series[k]));
    }
    expect(lazy.metrics.n_samples).toBe(14 * 144 + 1);
  });

  it('the Engine loads the rows a job needs before running it (window and calendar)', async () => {
    const { s, calls } = store();
    const e = new Engine(s.table, s);
    const job = { place, mask, start_s: jan1(2029) - 2 * 86400, end_s: jan1(2029) + 2 * 86400, rules: L.PRESETS.crew };
    const r = await e.window(job);
    expect(calls.sort()).toEqual([2028, 2029]);
    expect(r.metrics).toStrictEqual(runWindow(fullTable(), job).metrics);
    const cal = { sites: [{ place, mask }], day_starts_s: [jan1(2030) + 86400, jan1(2030) + 5 * 86400], stay_s: 2 * 86400, rules: L.PRESETS.crew };
    expect(jobRange({ type: 'calendar', job: cal })).toEqual([jan1(2030) + 86400, jan1(2030) + 7 * 86400]);
    const c = await e.calendar(cal);
    expect(calls.sort()).toEqual([2028, 2029, 2030]);
    expect(c).toStrictEqual(runCalendar(fullTable(), cal));
    expect(jobRange({ type: 'calendar', job: { ...cal, day_starts_s: [] } })).toBeNull();
  });
});

describe('loader', () => {
  it('builds a lazy store from the real manifest and fetches nothing until asked', async () => {
    const fetched: string[] = [];
    const f = (u: string) => { fetched.push(u.slice(PUB.length)); return fileFetcher(u); };
    const { eph, store: s } = await loadEphemerisStore(man, f, PUB);
    expect(fetched).toEqual([man.files.ephemeris.meta]);
    expect(eph.start_ms).toBe(Date.UTC(2027, 0, 1));
    expect(eph.data).toBe(s.table.data);
    await s.ensureRange(jan1(2029) + 86400, jan1(2029) + 15 * 86400);
    expect(fetched).toEqual([man.files.ephemeris.meta, 'ephemeris/2029.bin']);
    expect(fetched).not.toContain('ephemeris/2027_2030.bin');
  });

  it('serves a manifest without years (the fixture) as one chunk: the whole file', async () => {
    const m = fixtureManifest();
    const { eph, store: s } = await loadEphemerisStore(m, fileFetcher, FIXTURE_DATA);
    expect(s.chunks).toEqual([{ year: 2027, bin: m.files.ephemeris.bin, first_row: 0, row_count: eph.meta.row_count }]);
    await s.ensureRange(0, 3600);
    expect(s.table.loaded.every((v) => v === 1)).toBe(true);
  });
});

describe('failure paths (review of b3eda3d)', () => {
  const mask = L.flat_mask(L.smooth_horizon_deg(2));
  const place = { lat_deg: -89.45, lon_deg: -137.31, h_m: 1800 };

  it('an Engine job rejects when its year cannot be fetched, and the same job succeeds on retry', async () => {
    const { s, calls } = store(true);
    const e = new Engine(s.table, s);
    const job = { place, mask, start_s: jan1(2029) + 86400, end_s: jan1(2029) + 3 * 86400, rules: L.PRESETS.crew };
    await expect(e.window(job)).rejects.toThrow('network down');
    expect(s.has(job.start_s, job.end_s)).toBe(false);
    const r = await e.window(job);
    expect(calls).toEqual([2029, 2029]);
    expect(r.metrics).toStrictEqual(runWindow(fullTable(), job).metrics);
  });

  it('jobRange handles a day list too long to spread into Math.min (loop, not spread)', () => {
    const n = 300_000;
    const day_starts_s = Array.from({ length: n }, (_, k) => (k * 7919) % n);
    const cal = { sites: [{ place, mask }], day_starts_s, stay_s: 3600, rules: L.PRESETS.crew };
    expect(jobRange({ type: 'calendar', job: cal })).toEqual([0, n - 1 + 3600]);
  });
});
