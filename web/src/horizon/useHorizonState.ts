// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// State of the horizon interface (review note 009): the same scenario, data loading, place resolution,
// worker window job, background prefetch, countdowns and 'now' sample as the classic App, with the
// ?ui=horizon flag kept in the address bar. A copy rather than a shared hook so the classic App is untouched.
import { h, type ComponentType } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { resolveCustom, type MaskSet } from '../data/sites';
import type { Site } from '../data/types';
import type { MissAnswer, WindowAnswer } from '../engine/compute';
import { countdownsAt } from '../engine/countdown';
import { local_frame, sample_at, site_vector } from '../engine/light';
import { loadAppData, resolveForSite, type AppData } from '../state/data';
import { currentPlace, freshAnswer, placeRequestKey, windowKey, type TaggedPlace } from '../state/freshness';
import { clampScenario, DEFAULT_QUERY, DEFAULT_SITE_ID, defaultScenario, type Scenario, type View } from '../state/scenario';
import { decodeScenario, encodeScenario } from '../state/url';
import { MISS_RADII_M, missJob, missSig, type MissShare } from '../views/missGeometry';
import { useTableRange, type TableRange } from '../views/useTableRange';

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

/** Views of the horizon interface. 'export' and 'game' have no classic view id; they live beside the scenario. */
export type HzView = 'horizon' | 'ground' | 'miss' | 'rank' | 'calendar' | 'tour' | 'proof' | 'export' | 'game';
export type LocalView = Extract<HzView, 'export' | 'game'>;
export const isLocalView = (v: HzView): v is LocalView => v === 'export' || v === 'game';

const TO_SCN: Record<Exclude<HzView, LocalView>, View> = {
  horizon: 'report', ground: '3d', miss: 'miss', rank: 'rank', calendar: 'compare', tour: 'story', proof: 'validation',
};
const FROM_SCN: Record<View, HzView> = {
  report: 'horizon', sky: 'horizon', '3d': 'ground', miss: 'miss', rank: 'rank', compare: 'calendar', story: 'tour', validation: 'proof',
};
export const scnViewFor = (v: Exclude<HzView, LocalView>): View => TO_SCN[v];
export const hzViewFor = (v: View): HzView => FROM_SCN[v];

/** URL value of the game view (not a classic view id, so the scenario decoder ignores it) and its point param. */
export const VIEW_PARAM = 'view';
export const GAME_VIEW = 'game';
/** Same name as GAME_POINT_PARAM in game/gameLogic.ts; repeated here so the shell does not load the game code. */
export const GAME_PT_PARAM = 'game_pt';

/**
 * The view the horizon interface opens with. The default link (DEFAULT_QUERY, view=miss) opens Horizon:
 * the miss map is only opened when the address bar itself names a view (review 009 shell #7).
 */
export function initialView(search: string): { scnView: View | null; local: LocalView | null } {
  const v = new URLSearchParams(search).get(VIEW_PARAM);
  if (v === GAME_VIEW) return { scnView: 'report', local: 'game' };
  if (v === null) return { scnView: 'report', local: null };
  return { scnView: null, local: null };
}

/**
 * Address-bar query: the encoded scenario with the flag, and, while the game is open, view=game plus the
 * game's chosen point (game_pt) taken from the current address bar, so the game's share link keeps working.
 */
export function horizonQuery(encoded: string, local: LocalView | null, currentSearch: string, keepPt = true): string {
  if (local !== 'game') return withUi(encoded);
  const q = new URLSearchParams(encoded);
  q.set(VIEW_PARAM, GAME_VIEW);
  // The point belongs to the grid, start and rules it was chosen for: dropped once any of them changes.
  const pt = keepPt ? new URLSearchParams(currentSearch).get(GAME_PT_PARAM) : null;
  if (pt) q.set(GAME_PT_PARAM, pt);
  return withUi(q.toString());
}

/** The miss-test grid a site uses: its own target grid, else the grid it lies in (as MissView picks it). */
export function missGridIdOf(site: Pick<Site, 'miss_target_id' | 'miss_grid_id'> | null): string | null {
  if (!site) return null;
  return site.miss_target_id ?? (typeof site.miss_grid_id === 'string' && site.miss_grid_id ? site.miss_grid_id : null);
}

/** The miss line's radius: the Miss map's default radius, so both show the same share. */
export const MISS_LINE_RADIUS_M = 250;

/**
 * The miss line's share, computed without the Miss map being open (review 009 shell #7): the same grid,
 * the same missJob and the same share index as MissView, stale-guarded by key and by missSig.
 * `enabled` is false while the Miss map is open (it reports its own share) and while the game is open.
 * `ready` is true once the window answer for the current inputs is in: the single worker runs jobs in order
 * and cannot cancel them, so the miss job is queued only then, never ahead of the next window job (wiring #7).
 */
export function useMissLine(data: AppData | null, site: Site | null, scn: Scenario | null, table: TableRange, enabled: boolean, ready = true) {
  const gridId = missGridIdOf(site);
  const [set, setSet] = useState<MaskSet | null>(null);
  const [answer, setAnswer] = useState<{ key: string; a: MissAnswer } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    setSet(null);
    if (!data || !gridId || !enabled) return;
    let live = true;
    data.missGrid(gridId).then((s) => live && setSet(s)).catch(() => live && setFailed(`grid:${gridId}`));
    return () => { live = false; };
  }, [data, gridId, enabled]);
  const grid = set && (set.meta.id === undefined || set.meta.id === gridId) ? set : null;
  const key = grid && scn ? JSON.stringify([grid.meta.id, scn.start_s, scn.stay_s, scn.rules, table.epoch]) : '';
  useEffect(() => {
    if (!data || !grid || !scn || !key || !enabled || !ready) return;
    if (answer && answer.key === key) return;
    let live = true;
    data.engine.miss(missJob(grid, scn.start_s, scn.start_s + scn.stay_s, scn.rules))
      .then((a) => live && setAnswer({ key, a }))
      .catch(() => live && setFailed(key));
    return () => { live = false; };
  }, [key, enabled, ready]);
  const a = answer && answer.key === key ? answer.a : null;
  const share = a && scn ? a.shares[MISS_RADII_M.indexOf(MISS_LINE_RADIUS_M)] : NaN;
  const missLine: MissShare | null = scn && Number.isFinite(share)
    ? { sig: missSig(site?.id ?? null, scn.start_s, scn.stay_s, scn.rules), share, radius_m: MISS_LINE_RADIUS_M }
    : null;
  const failedNow = failed !== null && (failed === key || failed === `grid:${gridId}`);
  const settled = !gridId || !!a || failedNow || table.state === 'error';
  /** True when the miss line has no number and will not get one (grid or job failed, or the table is in error). */
  const unavailable = !!gridId && !a && (failedNow || table.state === 'error');
  return { missLine, settled, unavailable };
}

/**
 * A component loaded with a dynamic import() the first time it renders (the horizon interface keeps its
 * first load small: the game, the pickers and the heavy views are separate chunks). Shows `fallback` text
 * while loading and a Retry button if the chunk fails to load.
 */
export function lazyComponent<P extends object>(load: () => Promise<ComponentType<P>>, fallback = 'Loading…'): ComponentType<P> {
  let loaded: ComponentType<P> | null = null;
  let pending: Promise<ComponentType<P>> | null = null;
  return function Lazy(props: P) {
    const [, setTick] = useState(0);
    const [err, setErr] = useState<string | null>(null);
    useEffect(() => {
      if (loaded) return;
      let live = true;
      pending ??= load();
      pending.then((c) => { loaded = c; if (live) setTick((x) => x + 1); })
        .catch((e) => { pending = null; if (live) setErr(String(e)); });
      return () => { live = false; };
    }, [err]);
    if (loaded) return h(loaded as ComponentType<object>, props as object);
    if (err) return h('p', { role: 'alert' }, `Could not load this part of the page: ${err} `, h('button', { type: 'button', onClick: () => setErr(null) }, 'Retry'));
    return h('p', { 'aria-busy': 'true' }, fallback);
  };
}

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
  /** Views kept beside the scenario: Export and the game ('game' is also written to the address bar). */
  const [local, setLocal] = useState<LocalView | null>(() => (typeof location !== 'undefined' ? initialView(stripUi(location.search)).local : null));
  /** The start the link asked for, in ms, when it lay outside the table and was moved in (note 010 #4). */
  const [moved, setMoved] = useState<{ from_ms: number; to_ms: number } | null>(null);
  /** missSig of the scenario a shared game_pt was chosen for; game_pt is dropped once it changes (wiring #9). */
  const ptSig = useRef<string | null>(null);
  const ptDropped = useRef(false);

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
        const iv = initialView(q);
        if (iv.scnView) s0.view = iv.scnView;
        const s1 = clampScenario(s0, d.eph.meta);
        if (Number.isFinite(s0.start_s) && s1.start_s !== s0.start_s) {
          const m = { from_ms: d.eph.start_ms + s0.start_s * 1000, to_ms: d.eph.start_ms + s1.start_s * 1000 };
          // Fill the note after its (empty) live region has mounted, so screen readers announce it.
          setTimeout(() => setMoved(m), 300);
        }
        setScn(s1);
      })
      .catch((e) => setError(String(e)));
  }, []);

  // The moved-date note describes the start the link asked for; once the start changes it no longer applies.
  useEffect(() => {
    if (moved && scn && data && data.eph.start_ms + scn.start_s * 1000 !== moved.to_ms) setMoved(null);
  }, [scn?.start_s, moved]);

  // Keep the scenario (and the flag, and the game's view and point) in the address bar, at most every URL_WRITE_MS.
  useEffect(() => {
    if (!scn || !data) return;
    const sig = missSig(scn.site_id, scn.start_s, scn.stay_s, scn.rules);
    if (ptSig.current === null) ptSig.current = sig;
    else if (ptSig.current !== sig) ptDropped.current = true;
    const id = setTimeout(() => {
      const q = horizonQuery(encodeScenario(scn, data.eph.start_ms), local, location.search, !ptDropped.current);
      if (q !== location.search) history.replaceState(null, '', q);
    }, URL_WRITE_MS);
    return () => clearTimeout(id);
  }, [scn, data, local]);

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

  // The miss line's own job (shell #7), off while the Miss map is open (it reports its share then) and while
  // the game is open; queued only once the window answer for these inputs is in (wiring #7).
  const missMapOpen = local === null && scn?.view === 'miss';
  const windowFresh = !!result && !!key && result.key === key;
  const ml = useMissLine(data, site, scn, table, !missMapOpen && local !== 'game', windowFresh);

  // Background prefetch of the other table years once the first screen is done (as in the classic App):
  // the window answer, and the miss answer (the Miss map's or the miss line's).
  const firstScreenDone = !!result && (missMapOpen ? missSettled : ml.settled || local === 'game');
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

  return {
    data, error, scn, update, site, place, table, result, answer, shown, fresh, jobError, now, cds, missShare, setMissShare, setMissSettled,
    missLineShare: ml.missLine, missLineSettled: ml.settled, missLineUnavailable: ml.unavailable, local, setLocal,
    moved, dismissMoved: () => setMoved(null), tableMeta: data?.eph.meta ?? null,
  };
}

export type HorizonState = ReturnType<typeof useHorizonState>;
