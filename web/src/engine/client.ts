// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Promise wrapper around the engine worker. Falls back to running on the main thread when Web
// Workers are unavailable (for example in unit tests), so the app still works.
import { runCalendar, runMiss, runWindow, type CalendarAnswer, type CalendarJob, type MissAnswer, type MissJob, type WindowAnswer, type WindowJob } from './compute';
import type { Table } from './light';
import type { Reply, Request } from './protocol';

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void; onProgress?: (f: number) => void };
type Job = { type: 'window'; job: WindowJob } | { type: 'miss'; job: MissJob } | { type: 'calendar'; job: CalendarJob };

export class Engine {
  private worker: Worker | null = null;
  private table: Table;
  private next = 1;
  private pending = new Map<number, Pending>();
  /** Duration of the last job as measured inside the worker, in ms. */
  lastMs = 0;

  constructor(table: Table) {
    this.table = table;
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = (ev: MessageEvent<Reply>) => this.onReply(ev.data);
        // The worker gets its own copy; the UI keeps the original for quick single-sample lookups.
        const data = new Float32Array(table.data as Float32Array);
        this.send({ type: 'init', id: 0, table: { data, rows: table.rows, step_s: table.step_s } }, [data.buffer]);
      } catch {
        this.worker = null;
      }
    }
  }

  private onReply(r: Reply) {
    const p = this.pending.get(r.id);
    if (!p) return;
    if ('progress' in r) { p.onProgress?.(r.progress); return; }
    this.pending.delete(r.id);
    if (r.ok) { this.lastMs = r.ms ?? 0; p.resolve(r.result); } else p.reject(new Error(r.error));
  }

  private send(req: Request, transfer: Transferable[] = []) {
    this.worker!.postMessage(req, transfer);
  }

  private run<T>(job: Job, onProgress?: (f: number) => void): Promise<T> {
    if (!this.worker) {
      // Main-thread fallback.
      return new Promise<T>((resolve, reject) => {
        try {
          const t0 = performance.now();
          const r = job.type === 'window' ? runWindow(this.table, job.job)
            : job.type === 'miss' ? runMiss(this.table, job.job)
            : runCalendar(this.table, job.job);
          this.lastMs = performance.now() - t0;
          resolve(r as T);
        } catch (e) { reject(e as Error); }
      });
    }
    const id = this.next++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, onProgress });
      this.send({ ...job, id } as Request);
    });
  }

  window(job: WindowJob): Promise<WindowAnswer> { return this.run({ type: 'window', job }); }
  miss(job: MissJob, onProgress?: (f: number) => void): Promise<MissAnswer> { return this.run({ type: 'miss', job }, onProgress); }
  calendar(job: CalendarJob, onProgress?: (f: number) => void): Promise<CalendarAnswer> { return this.run({ type: 'calendar', job }, onProgress); }
}
