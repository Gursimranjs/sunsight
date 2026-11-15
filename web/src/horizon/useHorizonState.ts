// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// State of the horizon interface (review note 009): the same scenario, data loading, place resolution,
// worker window job, background prefetch, countdowns and 'now' sample as the classic App, with the
// ?ui=horizon flag kept in the address bar. A copy rather than a shared hook so the classic App is untouched.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { resolveCustom } from '../data/sites';
import type { WindowAnswer } from '../engine/compute';
import { countdownsAt } from '../engine/countdown';
import { local_frame, sample_at, site_vector } from '../engine/light';
import { loadAppData, resolveForSite, type AppData } from '../state/data';
import { currentPlace, freshAnswer, placeRequestKey, windowKey, type TaggedPlace } from '../state/freshness';
import { clampScenario, DEFAULT_QUERY, DEFAULT_SITE_ID, defaultScenario, type Scenario, type View } from '../state/scenario';
import { decodeScenario, encodeScenario } from '../state/url';
import type { MissShare } from '../views/missGeometry';
import { useTableRange } from '../views/useTableRange';

export const UI_PARAM = 'ui';
export const UI_HORIZON = 'horizon';

export function isHorizonQuery(search: string): boolean {
  return new URLSearchParams(search).get(UI_PARAM) === UI_HORIZON;
}

/** The query without the interface flag (no leading '?'). */
export function stripUi(search: string): string {
  const q = new URLSearchParams(search);
  q.delete(UI_PARAM);
  return q.toString();
}

/** Address-bar query for an encoded scenario, with the flag appended. */
export function withUi(encoded: string): string {
  return '?' + (encoded ? encoded + '&' : '') + `${UI_PARAM}=${UI_HORIZON}`;
}

export type HzView = 'horizon' | 'ground' | 'miss' | 'rank' | 'calendar' | 'compare' | 'tour' | 'proof' | 'export';

const TO_SCN: Record<Exclude<HzView, 'export'>, View> = {
  horizon: 'report', ground: '3d', miss: 'miss', rank: 'rank', calendar: 'compare', compare: 'compare', tour: 'story', proof: 'validation',
};
const FROM_SCN: Record<View, HzView> = {
  report: 'horizon', sky: 'horizon', '3d': 'ground', miss: 'miss', rank: 'rank', compare: 'calendar', story: 'tour', validation: 'proof',
};
export const scnViewFor = (v: Exclude<HzView, 'export'>): View => TO_SCN[v];
export const hzViewFor = (v: View): HzView => FROM_SCN[v];

/** Wait before the background prefetch tries again, and how many tries (same as the classic App). */
const PREFETCH_RETRY_MS = 20_000;
const PREFETCH_MAX_TRIES = 5;
/** The address bar is rewritten at most this often (Play changes the time many times a second). */
const URL_WRITE_MS = 300;

export function useHorizonState() {
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fixtureTick, setFixtureTick] = useState(0);
  const [scn, setScn] = useState<Scenario | null>(null);
  const [tagged, setTagged] = useState<TaggedPlace | null>(null);
  const [result, setResult] = useState<{ key: string; answer: WindowAnswer; windowMs: number } | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const reqKey = useRef('');
  const [tableTick, setTableTick] = useState(0);
  const prefetched = useRef(false);
  const [prefetchTry, setPrefetchTry] = useState(0);
  const [missSettled, setMissSettled] = useState(false);
  const [missShare, setMissShare] = useState<MissShare | null>(null);

  useEffect(() => {
    loadAppData(() => setFixtureTick((x) => x + 1))
      .then((d) => {
        d.store.onFill(() => setTableTick((x) => x + 1));
        setData(d);
        const first = d.sites[0]?.id ?? null;
        const q = stripUi(location.search);
        const ids = d.sites.map((x) => x.id);
        const q0 = q || (ids.includes(DEFAULT_SITE_ID) ? DEFAULT_QUERY : '');
        const s0 = q0 ? decodeScenario(q0, d.eph.start_ms, first, ids) : defaultScenario(first);
        setScn(clampScenario(s0, d.eph.meta));
      })
      .catch((e) => setError(String(e)));
  }, []);

  // Keep the scenario (and the flag) in the address bar, at most every URL_WRITE_MS.
  useEffect(() => {
    if (!scn || !data) return;
    const id = setTimeout(() => {
      const q = withUi(encodeScenario(scn, data.eph.start_ms));
      if (q !== location.search) history.replaceState(null, '', q);
    }, URL_WRITE_MS);
    return () => clearTimeout(id);
  }, [scn, data]);

  const update = (patch: Partial<Scenario>) => setScn((s) => (s && data ? clampScenario({ ...s, ...patch }, data.eph.meta) : s));
  const site = data && scn?.site_id ? data.sites.find((s) => s.id === scn.site_id) ?? null : null;

  const req = scn ? placeRequestKey(scn) : '';
  useEffect(() => {
    if (!data || !scn) return;
    let live = true;
    const h = scn.rules.observer_height_m;
    if (!site) setTagged({ req, place: resolveCustom(scn.lat_deg, scn.lon_deg, h) });
    else resolveForSite(data, site, h).then((r) => live && setTagged({ req, place: r }));
    return () => { live = false; };
  }, [data, req]);
  const place = currentPlace(tagged, req);

  const stayStart_s = scn?.start_s ?? 0, stayEnd_s = scn ? scn.start_s + scn.stay_s : 0;
  const table = useTableRange(data, stayStart_s, stayEnd_s);

  const key = place && scn ? `${windowKey(req, place, scn)}#${table.epoch}` : '';
  useEffect(() => {
    reqKey.current = key;
    setJobError(null);
    if (!data || !place || !scn || !key) return;
    data.engine
      .windowTimed({ place: { lat_deg: place.lat_deg, lon_deg: place.lon_deg, h_m: place.h_m }, mask: place.mask, start_s: scn.start_s, end_s: scn.start_s + scn.stay_s, rules: scn.rules })
      .then(({ answer, ms }) => { if (reqKey.current === key) setResult({ key, answer, windowMs: ms }); })
      .catch((e) => { if (reqKey.current === key) setJobError(String(e)); });
  }, [key]);

  // Background prefetch of the other table years once the first screen is done (as in the classic App).
  const firstScreenDone = !!result && (scn?.view !== 'miss' || missSettled);
  const prefetchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const prefetchFails = useRef(0);
  useEffect(() => () => { if (prefetchTimer.current) clearTimeout(prefetchTimer.current); }, []);
  useEffect(() => {
    if (!data || !firstScreenDone || prefetched.current || prefetchFails.current >= PREFETCH_MAX_TRIES) return;
    prefetched.current = true;
    let ran = false;
    const go = () => {
      ran = true;
      data.store.ensureAll().catch(() => {
        prefetched.current = false;
        prefetchFails.current += 1;
        if (prefetchFails.current >= PREFETCH_MAX_TRIES) return;
        if (prefetchTimer.current) clearTimeout(prefetchTimer.current);
        prefetchTimer.current = setTimeout(() => setPrefetchTry((x) => x + 1), PREFETCH_RETRY_MS * 2 ** (prefetchFails.current - 1));
      });
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (h: number) => void };
    const idle = w.requestIdleCallback ? w.requestIdleCallback(go, { timeout: 5000 }) : undefined;
    const fallback = idle === undefined ? setTimeout(go, 1000) : undefined;
    return () => {
      if (ran) return;
      if (idle !== undefined) w.cancelIdleCallback?.(idle);
      if (fallback !== undefined) clearTimeout(fallback);
      prefetched.current = false;
    };
  }, [data, result, firstScreenDone, prefetchTry]);

  const t_s = scn ? scn.start_s + scn.t_off_s : 0;
  const now = useMemo(() => {
    if (!data || !place || !scn) return null;
    if (!data.hasRange(t_s, t_s)) return null;
    const site_km = site_vector(place.lat_deg, place.lon_deg, place.h_m + scn.rules.observer_height_m);
    return sample_at(data.table, t_s, site_km, local_frame(place.lat_deg, place.lon_deg), place.mask, scn.rules);
  }, [data, place, t_s, scn?.rules, tableTick]);

  void fixtureTick;
  const answer = freshAnswer(result, key);
  const fresh = answer !== null;
  const shown = answer ?? result?.answer ?? null;
  const cds = shown && fresh && scn
    ? countdownsAt(shown.metrics, { lit0: shown.series.sun_frac[0] >= scn.rules.lit_threshold, earth0: shown.series.earth_frac[0] > 0, contact0: shown.series.contact[0] > 0 }, t_s)
    : null;

  return { data, error, scn, update, site, place, table, result, answer, shown, fresh, jobError, now, cds, missShare, setMissShare, setMissSettled };
}

export type HorizonState = ReturnType<typeof useHorizonState>;
