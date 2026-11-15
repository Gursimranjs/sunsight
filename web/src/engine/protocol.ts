// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Messages between the UI thread and the engine worker.
import type { CalendarJob, MissCalendarJob, MissJob, WindowJob } from './compute';
import type { Table } from './light';

export type Request =
  | { type: 'init'; id: number; table: Table }
  /** Rows first_row .. first_row + rows.length / 18 - 1 of the table, just fetched on the UI thread. */
  | { type: 'fill'; id: number; first_row: number; rows: Float32Array }
  | { type: 'window'; id: number; job: WindowJob }
  | { type: 'miss'; id: number; job: MissJob }
  | { type: 'calendar'; id: number; job: CalendarJob }
  | { type: 'missCalendar'; id: number; job: MissCalendarJob };

export type Reply =
  | { id: number; ok: true; result: unknown; ms?: number }
  | { id: number; ok: false; error: string }
  | { id: number; progress: number };
