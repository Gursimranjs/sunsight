// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Promise wrapper around the engine worker. Falls back to running on the main thread when Web
// Workers are unavailable (for example in unit tests), so the app still works.
import {
  runCalendar, runMiss, runMissCalendar, runWindow,
  type CalendarAnswer, type CalendarJob, type MissAnswer, type MissCalendarAnswer, type MissCalendarJob, type MissJob, type WindowAnswer, type WindowJob,
} from './compute';
import type { Table } from './light';
import type { Reply, Request } from './protocol';

/**
 * A table filled on demand (data/ephemerisStore.ts): the engine waits for ensureRange before every job and
 * forwards each filled block of rows to the worker's copy.
 */
export interface LazyRows {
  ensureRange(start_s: number, end_s: number): Promise<void>;
  onFill(f: (first_row: number, rows: Float32Array) => void): () => void;
}

/** Time span of the table a job reads, or null when it reads nothing. */
export function jobRange(job: Job): [number, number] | null {
  if (job.type === 'window' || job.type === 'miss') return [job.job.start_s, job.job.end_s];
  const d = job.job.day_starts_s;
  if (!d.length) return null;
  // A loop, not Math.min(...d): a long day list would overflow the argument stack.
  let lo = d[0], hi = d[0];
  for (const t of d) { if (t < lo) lo = t; if (t > hi) hi = t; }
  return [lo, hi + job.job.stay_s];
}

type Timed = { result: unknown; ms: number };
type Pending = { resolve: (v: Timed) => void; reject: (e: Error) => void; onProgress?: (f: number) => void; type: Job['type'] };
export type Job = { type: 'window'; job: WindowJob } | { type: 'miss'; job: MissJob } | { type: 'calendar'; job: CalendarJob } | { type: 'missCalendar'; job: MissCalendarJob };

export class Engine {
  private worker: Worker | null = null;
  private table: Table;
  private lazy: LazyRows | null;
  private next = 1;
  private pending = new Map<number, Pending>();
  /** Duration of the last job of any kind as measured inside the worker, in ms. */
  lastMs = 0;
  /** Duration of the last window job only, in ms (calendar and miss jobs do not change it). */
  lastWindowMs = 0;

  constructor(table: Table, lazy: LazyRows | null = null) {
    this.table = table;
    this.lazy = lazy;
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = (ev: MessageEvent<Reply>) => this.onReply(ev.data);
        // The worker gets its own copy; the UI keeps the original for quick single-sample lookups.
        const data = new Float32Array(table.data as Float32Array);
        const loaded = table.loaded ? new Uint8Array(table.loaded) : undefined;
        this.send({ type: 'init', id: 0, table: { data, rows: table.rows, step_s: table.step_s, loaded } },
          loaded ? [data.buffer, loaded.buffer] : [data.buffer]);
        // Rows filled from now on follow as 'fill' messages (rows filled before this are in the copy above).
        lazy?.onFill((first_row, rows) => {
          const copy = new Float32Array(rows);
          this.send({ type: 'fill', id: 0, first_row, rows: copy }, [copy.buffer]);
        });
      } catch {
        this.worker = null;
      }
    }
  }

  /** Resolves once every row the job reads is filled here and posted to the worker. */
  private ready(job: Job): Promise<void> {
    const r = this.lazy ? jobRange(job) : null;
    return r ? this.lazy!.ensureRange(r[0], r[1]) : Promise.resolve();
  }

  private onReply(r: Reply) {
    const p = this.pending.get(r.id);
    if (!p) return;
    if ('progress' in r) { p.onProgress?.(r.progress); return; }
    this.pending.delete(r.id);
    if (r.ok) p.resolve(this.timed(p.type, r.result, r.ms ?? 0)); else p.reject(new Error(r.error));
  }

  private timed(type: Job['type'], result: unknown, ms: number): Timed {
    this.lastMs = ms;
    if (type === 'window') this.lastWindowMs = ms;
    return { result, ms };
  }

  private send(req: Request, transfer: Transferable[] = []) {
    this.worker!.postMessage(req, transfer);
  }

  /** Load the rows the job needs (never compute on rows that are not loaded), then run it. */
  private runTimed(job: Job, onProgress?: (f: number) => void): Promise<Timed> {
    return this.ready(job).then(() => this.runLoaded(job, onProgress));
  }

  private runLoaded(job: Job, onProgress?: (f: number) => void): Promise<Timed> {
    if (!this.worker) {
      // Main-thread fallback.
      return new Promise<Timed>((resolve, reject) => {
        try {
          const t0 = performance.now();
          const r = job.type === 'window' ? runWindow(this.table, job.job)
            : job.type === 'miss' ? runMiss(this.table, job.job)
            : job.type === 'missCalendar' ? runMissCalendar(this.table, job.job)
            : runCalendar(this.table, job.job);
          resolve(this.timed(job.type, r, performance.now() - t0));
        } catch (e) { reject(e as Error); }
      });
    }
    const id = this.next++;
    return new Promise<Timed>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onProgress, type: job.type });
      this.send({ ...job, id } as Request);
    });
  }

  private run<T>(job: Job, onProgress?: (f: number) => void): Promise<T> {
    return this.runTimed(job, onProgress).then((t) => t.result as T);
  }

  window(job: WindowJob): Promise<WindowAnswer> { return this.run({ type: 'window', job }); }
  /** A window job plus the time it took, so a caller can report the time of exactly this answer. */
  windowTimed(job: WindowJob): Promise<{ answer: WindowAnswer; ms: number }> {
    return this.runTimed({ type: 'window', job }).then((t) => ({ answer: t.result as WindowAnswer, ms: t.ms }));
  }
  miss(job: MissJob, onProgress?: (f: number) => void): Promise<MissAnswer> { return this.run({ type: 'miss', job }, onProgress); }
  calendar(job: CalendarJob, onProgress?: (f: number) => void): Promise<CalendarAnswer> { return this.run({ type: 'calendar', job }, onProgress); }
  missCalendar(job: MissCalendarJob, onProgress?: (f: number) => void): Promise<MissCalendarAnswer> { return this.run({ type: 'missCalendar', job }, onProgress); }
}
