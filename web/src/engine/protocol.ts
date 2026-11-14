// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Messages between the UI thread and the engine worker.
import type { CalendarJob, MissJob, WindowJob } from './compute';
import type { Table } from './light';

export type Request =
  | { type: 'init'; id: number; table: Table }
  | { type: 'window'; id: number; job: WindowJob }
  | { type: 'miss'; id: number; job: MissJob }
  | { type: 'calendar'; id: number; job: CalendarJob };

export type Reply =
  | { id: number; ok: true; result: unknown; ms?: number }
  | { id: number; ok: false; error: string }
  | { id: number; progress: number };
