// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Date picker: this site's start dates as a strip of days, each a stay scored by the engine's
// calendar job (the same job the Compare view's calendar runs, for one site). Every day carries a
// symbol and a word as well as its colour. Clicking a day calls onStart with that day's start.
import { useEffect, useState } from 'preact/hooks';
import { resolveCustom, type Resolved } from '../../data/sites';
import type { Site } from '../../data/types';
import type { CalendarAnswer } from '../../engine/compute';
import type { VerdictKind } from '../../engine/light';
import { formatPct, formatUtc } from '../../format';
import { resolveForSite, type AppData } from '../../state/data';
import { tableRange, type Scenario } from '../../state/scenario';
import { dayStarts } from '../../views/calendar';
import { TableStatus, useTableRange } from '../../views/useTableRange';

/** Days on one page of the strip. */
export const STRIP_DAYS = 30;
const DAY_S = 86400;

/** Sentence-case word and symbol for each verdict (never colour alone). */
export const STRIP_WORD: Record<VerdictKind, { word: string; sym: string }> = {
  go: { word: 'Go', sym: '✓' },
  marginal: { word: 'Marginal', sym: '!' },
  'no-go': { word: 'No-go', sym: '✕' },
};

/** Where a page of the strip begins, `page` pages after the anchor, kept inside the table. */
export function stripFrom(anchor_s: number, page: number, max_s: number): number {
  return Math.min(Math.max(0, anchor_s + page * STRIP_DAYS * DAY_S), Math.max(0, max_s));
}

interface Props {
  data: AppData;
  site: Site | null;
  scn: Scenario;
  onStart: (start_s: number) => void;
}

/** The place the strip scores: the curated site's resolved point, or the custom coordinates. */
function usePlace(data: AppData, site: Site | null, scn: Scenario): Resolved | null {
  const h_m = scn.rules.observer_height_m;
  const tag = JSON.stringify([site?.id ?? null, site ? 0 : scn.lat_deg, site ? 0 : scn.lon_deg, h_m]);
  const [r, setR] = useState<{ tag: string; place: Resolved } | null>(null);
  useEffect(() => {
    if (!site) { setR({ tag, place: resolveCustom(scn.lat_deg, scn.lon_deg, h_m) }); return; }
    let live = true;
    resolveForSite(data, site, h_m).then((place) => live && setR({ tag, place }));
    return () => { live = false; };
  }, [tag]);
  return r && r.tag === tag ? r.place : null;
}

export function DateStrip({ data, site, scn, onStart }: Props) {
  const { max_s } = tableRange(data.eph.meta);
  // The strip stays put while the chosen start is on it; it jumps when the start moves off it.
  const [anchor_s, setAnchor] = useState(scn.start_s);
  const [page, setPage] = useState(0);
  const from_s = stripFrom(anchor_s, page, max_s);
  useEffect(() => {
    if (scn.start_s < from_s || scn.start_s >= from_s + STRIP_DAYS * DAY_S) { setAnchor(scn.start_s); setPage(0); }
  }, [scn.start_s]);

  const starts = dayStarts(from_s, STRIP_DAYS, scn.stay_s, data.eph.meta, data.eph.start_ms);
  const place = usePlace(data, site, scn);
  const table = useTableRange(data, starts.length ? starts[0] : 1, starts.length ? starts[starts.length - 1] + scn.stay_s : 0);
  const key = place ? JSON.stringify([place.maskKey, place.lat_deg, place.lon_deg, starts, scn.stay_s, scn.rules, table.epoch]) : '';
  const [ans, setAns] = useState<{ key: string; a: CalendarAnswer } | null>(null);
  const [error, setError] = useState<{ key: string; text: string } | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!place || !starts.length) return;
    let live = true;
    setProgress(0);
    data.engine.calendar({
      sites: [{ place: { lat_deg: place.lat_deg, lon_deg: place.lon_deg, h_m: place.h_m }, mask: place.mask }],
      day_starts_s: starts, stay_s: scn.stay_s, rules: scn.rules,
    }, (f) => live && setProgress(f)).then((a) => live && setAns({ key, a }))
      .catch((e) => live && setError({ key, text: String(e) }));
    return () => { live = false; };
  }, [key]);

  const a = ans && ans.key === key ? ans.a : null;
  const err = error && error.key === key ? error.text : null;
  const cells = a ? a.cells[0] : null;
  const when = (s: number) => formatUtc(data.eph.start_ms + s * 1000);
  const dayLabel = (s: number) => {
    const d = new Date(data.eph.start_ms + s * 1000);
    return { mon: d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }), day: String(d.getUTCDate()) };
  };
  const chosenDay = (s: number) => scn.start_s >= s && scn.start_s < s + DAY_S;
  const placeName = site ? site.name : `${scn.lat_deg.toFixed(2)}°, ${scn.lon_deg.toFixed(2)}°`;
  const stayDays = Number((scn.stay_s / DAY_S).toFixed(2));
  const canEarlier = from_s > 0;
  const canLater = starts.length > 0 && starts[starts.length - 1] + DAY_S + scn.stay_s <= max_s;

  return (
    <section class="hz-strip" aria-labelledby="hz-strip-title" data-testid="date-strip">
      <h3 id="hz-strip-title" style={{ margin: '0 0 4px', fontSize: '1rem' }}>Start dates at {placeName}</h3>
      <p style={{ margin: '0 0 6px', fontSize: '0.9rem' }}>
        Each day is a {stayDays}-day stay starting at 00:00 UTC, scored with the current rules.
      </p>
      <div class="hz-strip-nav">
        <button type="button" onClick={() => setPage((p) => p - 1)} disabled={!canEarlier}>Earlier {STRIP_DAYS} days</button>
        <button type="button" onClick={() => setPage((p) => p + 1)} disabled={!canLater}>Later {STRIP_DAYS} days</button>
      </div>
      {!starts.length && <p>The stay is too long to fit any start date here in the table.</p>}
      {!cells && starts.length > 0 && table.state !== 'ok' && <p><TableStatus tr={table} /></p>}
      {!cells && starts.length > 0 && table.state === 'ok' && (err
        ? <p role="alert">The calendar failed: {err}</p>
        : <p aria-live="polite">Computing {starts.length} stays… {formatPct(progress)}</p>)}
      {cells && (
        <ol class="hz-strip-days" aria-label={`Start dates from ${when(starts[0])}`}>
          {starts.map((s, j) => {
            const c = cells[j];
            const w = STRIP_WORD[c.verdict];
            const l = dayLabel(s);
            return (
              <li key={s} class={c.verdict}>
                <button type="button" data-testid="strip-day" data-verdict={c.verdict}
                  aria-current={chosenDay(s) ? 'date' : undefined}
                  aria-label={`Stay starting ${when(s)}: ${w.word.toLowerCase()}, score ${c.score.toFixed(0)}`}
                  title={`${w.word}, score ${c.score.toFixed(0)}, lit ${formatPct(c.lit_share)}, contact ${formatPct(c.contact_share)}`}
                  onClick={() => onStart(s)}>
                  <span class="hz-day-date">{l.mon} {l.day}</span>
                  <span class="hz-day-sym" aria-hidden="true">{w.sym}</span>
                  <span class="hz-day-word" aria-hidden="true">{w.word}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
      <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
        ✓ Go: every rule met with margin. ! Marginal: rules met, thin margin. ✕ No-go: a rule fails.
      </p>
    </section>
  );
}
