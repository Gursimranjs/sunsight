// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Views that start long computations say when they are still waiting for a year of the Sun and Earth table,
// and say so (with a Retry button) when that year could not be fetched.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { AppData } from '../state/data';

export const LOADING_TABLE_TEXT = 'Loading Sun and Earth positions…';
export const TABLE_ERROR_TEXT = 'Could not load the Sun and Earth positions';

export interface TableRange {
  /** 'ok': every row the range reads is filled; 'loading': the fetch is running; 'error': it failed. */
  state: 'ok' | 'loading' | 'error';
  error: string | null;
  /** Fetch the range again (after an error). */
  retry: () => void;
  /**
   * Bumped each time the range becomes available after a failure. A view puts it in the key of the job it
   * runs on this range, so a job that failed with the fetch runs again once the rows are there.
   */
  epoch: number;
}

/**
 * Whether every row [start_s, end_s] reads is filled. Otherwise starts the fetch (shared with the engine's own
 * ensureRange) and re-renders when it is done or has failed. An empty range (start > end) needs nothing.
 * A failed fetch is not retried by itself: the view shows the error and Retry fetches again.
 */
export function useTableRange(data: AppData | null, start_s: number, end_s: number): TableRange {
  const empty = !(start_s <= end_s);
  // Before the app data is loaded nothing is filled (and nothing is fetched).
  const has = !!data && (empty || data.hasRange(start_s, end_s));
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState<{ tag: string; error: string } | null>(null);
  const [epoch, setEpoch] = useState(0);
  const [, bump] = useState(0);
  const sawError = useRef(false);
  const tag = `${start_s}:${end_s}:${attempt}`;
  useEffect(() => {
    if (has || !data) return;
    let live = true;
    data.ensureRange(start_s, end_s)
      .then(() => live && bump((x) => x + 1))
      .catch((e) => { if (live) { sawError.current = true; setFailed({ tag, error: String(e) }); } });
    return () => { live = false; };
  }, [data, start_s, end_s, has, attempt]);
  // The rows arrived after a failure (Retry here, or another fetch of the same year): let the jobs run again.
  useEffect(() => {
    if (has && sawError.current) { sawError.current = false; setEpoch((x) => x + 1); }
  }, [has]);
  const error = !has && failed && failed.tag === tag ? failed.error : null;
  return { state: has ? 'ok' : error ? 'error' : 'loading', error, epoch, retry: () => setAttempt((x) => x + 1) };
}

/** The loading line, or the error with a Retry button. Renders nothing once the range is loaded. */
export function TableStatus({ tr }: { tr: TableRange }) {
  if (tr.state === 'ok') return null;
  if (tr.state === 'loading') return <>{LOADING_TABLE_TEXT}</>;
  return (
    <span role="alert" data-testid="table-error">
      {TABLE_ERROR_TEXT}: {tr.error}{' '}
      <button type="button" data-testid="table-retry" onClick={tr.retry}>Retry</button>
    </span>
  );
}
