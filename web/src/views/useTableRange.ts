// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Views that start long computations say when they are still waiting for a year of the Sun and Earth table.
import { useEffect, useState } from 'preact/hooks';
import type { AppData } from '../state/data';

export const LOADING_TABLE_TEXT = 'Loading Sun and Earth positions…';

/**
 * True when every row [start_s, end_s] reads is filled. Otherwise starts the fetch (shared with the engine's
 * own ensureRange) and re-renders when it is done. An empty range (start > end) needs nothing.
 */
export function useTableRange(data: AppData, start_s: number, end_s: number): boolean {
  const empty = !(start_s <= end_s);
  const has = empty || data.hasRange(start_s, end_s);
  const [, bump] = useState(0);
  useEffect(() => {
    if (has) return;
    let live = true;
    data.ensureRange(start_s, end_s).then(() => live && bump((x) => x + 1)).catch(() => { /* the job reports it */ });
    return () => { live = false; };
  }, [data, start_s, end_s, has]);
  return has;
}
