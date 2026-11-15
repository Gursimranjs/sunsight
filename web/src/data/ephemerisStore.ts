// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// The Sun and Earth table, filled one calendar year at a time (review note 004, speed).
//
// The engine still sees one logical Float32Array of row_count x 18 values with the same time origin
// (t_s = seconds after 2027-01-01T00:00 UTC, row k = row k of ephemeris/2027_2030.bin). Each year file
// ephemeris/<year>.bin is an exact byte slice of those rows (pipeline/sunsight/ephemeris.py split_years), so a
// filled row is bit-identical to the full table's row. `table.loaded` marks the filled rows; interp() throws
// on any row that is not loaded, so nothing is ever computed on zeros.
import { N_COLS } from './contracts';
import type { Table } from '../engine/light';

/** One year file: rows first_row .. first_row + row_count - 1 of the full table. */
export interface YearRef { year: number; bin: string; first_row: number; row_count: number }

/**
 * Rows interp() reads for time t_s: i = floor(t/step) clamped to [1, rows - 3], stencil i-1 .. i+2.
 * Must stay in step with interp() in engine/light.ts.
 */
export function stencilRows(t_s: number, rows: number, step_s: number): [number, number] {
  const i = Math.max(1, Math.min(rows - 3, Math.floor(t_s / step_s)));
  return [i - 1, i + 2];
}

/** First and last row any interpolation at a time in [start_s, end_s] can read. */
export function rowsForRange(start_s: number, end_s: number, rows: number, step_s: number): [number, number] {
  const a = Math.min(start_s, end_s), b = Math.max(start_s, end_s);
  return [stencilRows(a, rows, step_s)[0], stencilRows(b, rows, step_s)[1]];
}

export type FillListener = (first_row: number, rows: Float32Array) => void;

export class EphemerisStore {
  /** The engine's table. `data` is filled in place; `loaded[k]` is 1 once row k is filled. */
  readonly table: Table & { data: Float32Array; loaded: Uint8Array };
  readonly chunks: YearRef[];
  private readonly fetchChunk: (c: YearRef) => Promise<ArrayBuffer>;
  private readonly inflight = new Map<number, Promise<void>>();
  private readonly listeners = new Set<FillListener>();
  /** Number of year files fetched (each at most once unless a fetch failed), for tests and the UI. */
  fetches = 0;

  constructor(meta: { row_count: number; step_s: number }, chunks: YearRef[], fetchChunk: (c: YearRef) => Promise<ArrayBuffer>) {
    const rows = meta.row_count;
    let next = 0;
    for (const c of chunks) {
      if (c.first_row !== next || c.row_count <= 0) throw new Error(`Year file ${c.bin} does not continue the table at row ${next}`);
      next += c.row_count;
    }
    if (next !== rows) throw new Error(`Year files cover ${next} rows, the table has ${rows}`);
    this.chunks = chunks;
    this.fetchChunk = fetchChunk;
    this.table = { data: new Float32Array(rows * N_COLS), rows, step_s: meta.step_s, loaded: new Uint8Array(rows) };
  }

  /** The year files holding every row an interpolation inside [start_s, end_s] reads. */
  chunksFor(start_s: number, end_s: number): YearRef[] {
    const [r0, r1] = rowsForRange(start_s, end_s, this.table.rows, this.table.step_s);
    return this.chunks.filter((c) => c.first_row <= r1 && c.first_row + c.row_count - 1 >= r0);
  }

  isLoaded(c: YearRef): boolean {
    return this.table.loaded[c.first_row] === 1;
  }

  /** True when every row needed for [start_s, end_s] is filled. */
  has(start_s: number, end_s: number): boolean {
    return this.chunksFor(start_s, end_s).every((c) => this.isLoaded(c));
  }

  /** Years filled so far, in order. */
  get loadedYears(): number[] {
    return this.chunks.filter((c) => this.isLoaded(c)).map((c) => c.year);
  }

  /** Fetch and fill the years needed for [start_s, end_s]; concurrent calls share each fetch. */
  ensureRange(start_s: number, end_s: number): Promise<void> {
    return this.ensureChunks(this.chunksFor(start_s, end_s));
  }

  ensureAll(): Promise<void> {
    return this.ensureChunks(this.chunks);
  }

  private ensureChunks(list: YearRef[]): Promise<void> {
    const todo = list.filter((c) => !this.isLoaded(c));
    if (!todo.length) return Promise.resolve();
    return Promise.all(todo.map((c) => this.load(c))).then(() => undefined);
  }

  private load(c: YearRef): Promise<void> {
    let p = this.inflight.get(c.first_row);
    if (!p) {
      this.fetches += 1;
      p = this.fetchChunk(c).then((buf) => this.fill(c, buf));
      // A failed fetch is forgotten, so the next call tries again.
      p.catch(() => this.inflight.delete(c.first_row));
      this.inflight.set(c.first_row, p);
    }
    return p;
  }

  /** Copy one year's rows into the table, mark them loaded and tell the listeners (the worker). */
  fill(c: YearRef, buf: ArrayBuffer): void {
    if (this.isLoaded(c)) return;
    const expected = c.row_count * N_COLS * 4;
    if (buf.byteLength !== expected) throw new Error(`Year file ${c.bin} is ${buf.byteLength} bytes, expected ${expected}`);
    const rows = new Float32Array(buf);
    this.table.data.set(rows, c.first_row * N_COLS);
    this.table.loaded.fill(1, c.first_row, c.first_row + c.row_count);
    for (const f of this.listeners) f(c.first_row, rows);
  }

  /** Called after every fill with the rows just filled. Returns an unsubscribe function. */
  onFill(f: FillListener): () => void {
    this.listeners.add(f);
    return () => { this.listeners.delete(f); };
  }
}
