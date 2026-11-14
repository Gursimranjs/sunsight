// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Web Worker: holds the ephemeris table and runs the heavy maths off the UI thread.
import { runCalendar, runMiss, runMissCalendar, runWindow } from './compute';
import type { Request } from './protocol';
import type { Table } from './light';

let table: Table | null = null;
const post = (msg: unknown, transfer: Transferable[] = []) =>
  (self as unknown as { postMessage(m: unknown, t: Transferable[]): void }).postMessage(msg, transfer);

self.onmessage = (ev: MessageEvent<Request>) => {
  const req = ev.data;
  try {
    if (req.type === 'init') {
      table = req.table;
      post({ id: req.id, ok: true, result: null });
      return;
    }
    if (!table) throw new Error('Engine worker has no table yet');
    const t0 = performance.now();
    if (req.type === 'window') {
      const result = runWindow(table, req.job);
      const s = result.series;
      post({ id: req.id, ok: true, result, ms: performance.now() - t0 }, Object.values(s).map((a) => (a as Float64Array).buffer));
    } else if (req.type === 'miss') {
      const result = runMiss(table, req.job, (done, total) => post({ id: req.id, progress: done / total }));
      post({ id: req.id, ok: true, result, ms: performance.now() - t0 });
    } else if (req.type === 'calendar') {
      const result = runCalendar(table, req.job, (done, total) => post({ id: req.id, progress: done / total }));
      post({ id: req.id, ok: true, result, ms: performance.now() - t0 });
    } else if (req.type === 'missCalendar') {
      const result = runMissCalendar(table, req.job, (done, total) => post({ id: req.id, progress: done / total }));
      post({ id: req.id, ok: true, result, ms: performance.now() - t0 });
    }
  } catch (e) {
    post({ id: req.id, ok: false, error: String(e) });
  }
};
