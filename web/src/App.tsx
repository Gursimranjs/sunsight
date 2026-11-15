// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { resolveCustom } from './data/sites';
import type { WindowAnswer } from './engine/compute';
import { countdownsAt } from './engine/countdown';
import { local_frame, sample_at, site_vector } from './engine/light';
import { formatDeg } from './format';
import { loadAppData, resolveForSite, type AppData } from './state/data';
import { currentPlace, freshAnswer, placeRequestKey, windowKey, type TaggedPlace } from './state/freshness';
import { clampScenario, DEFAULT_QUERY, DEFAULT_SITE_ID, defaultScenario, tableRange, VIEWS, type Scenario } from './state/scenario';
import { decodeScenario, encodeScenario } from './state/url';
import { ShareBar } from './views/ShareBar';
import { Compare } from './views/Compare';
import { MissView } from './views/MissView';
import { Panorama } from './views/Panorama';
import { RankView } from './views/Rank';
import { asRefined, MetricTiles, RefinedNote, VerdictHero } from './views/ReportCard';
import { ScenarioControls, TimeBar } from './views/RulesEditor';
import { SitePicker } from './views/SitePicker';
import { StartStrip } from './views/StartStrip';
import { Timeline } from './views/Timeline';
import { ValidationView } from './views/Validation';
import { Hero3D } from './views/Hero3D';
import { Story } from './views/Story';
import { AboutData, SiteSource, TerrainCredit } from './views/Credits';
import { RulesContext } from './views/Term';
import { TableStatus, useTableRange } from './views/useTableRange';

/** Wait before the background prefetch of the other table years tries again after a failure. */
const PREFETCH_RETRY_MS = 20_000;
/** Background prefetch gives up after this many failures (20 s, 40 s, 80 s, 160 s apart). */
const PREFETCH_MAX_TRIES = 5;

export function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fixtureTick, setFixtureTick] = useState(0);
  const [scn, setScn] = useState<Scenario | null>(null);
  const [tagged, setTagged] = useState<TaggedPlace | null>(null);
  /** The last window answer, the key of the inputs it was computed from, and how long that job took. */
  const [result, setResult] = useState<{ key: string; answer: WindowAnswer; windowMs: number } | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const reqKey = useRef('');
  /** Bumped whenever a year of the Sun and Earth table arrives, so main-thread look-ups re-run. */
  const [tableTick, setTableTick] = useState(0);
  const prefetched = useRef(false);
  /** Bumped by a timer after a failed background prefetch, so it tries again. */
  const [prefetchTry, setPrefetchTry] = useState(0);
  /** The miss test on the first screen has its answer (or has nothing to compute); see the prefetch below. */
  const [missSettled, setMissSettled] = useState(false);

  useEffect(() => {
    loadAppData(() => setFixtureTick((x) => x + 1))
      .then((d) => {
        d.store.onFill(() => setTableTick((x) => x + 1));
        setData(d);
        const first = d.sites[0]?.id ?? null;
        const q = typeof location !== 'undefined' ? location.search : '';
        const ids = d.sites.map((x) => x.id);
        // No query: open on the computed default scenario (note 003 B) when its site ships, else the first site.
        const q0 = q || (ids.includes(DEFAULT_SITE_ID) ? DEFAULT_QUERY : '');
        const s0 = q0 ? decodeScenario(q0, d.eph.start_ms, first, ids) : defaultScenario(first);
        setScn(clampScenario(s0, d.eph.meta));
      })
      .catch((e) => setError(String(e)));
  }, []);

  // Keep the scenario in the address bar so a copied link reopens this exact view.
  useEffect(() => {
    if (!scn || !data) return;
    const q = '?' + encodeScenario(scn, data.eph.start_ms);
    if (q !== location.search) history.replaceState(null, '', q);
  }, [scn, data]);

  const update = (patch: Partial<Scenario>) => setScn((s) => (s && data ? clampScenario({ ...s, ...patch }, data.eph.meta) : s));
  const site = data && scn?.site_id ? data.sites.find((s) => s.id === scn.site_id) ?? null : null;

  // Resolve the site to coordinates and a horizon mask (loads the region file when needed). The
  // result is tagged with the request it answers; until a matching one arrives, `place` is null.
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

  // Fetch the year(s) of the Sun and Earth table this stay reads (the engine jobs wait for the same fetch).
  // On failure the report card shows the error with a Retry button; table.epoch re-runs the window job after it.
  const stayStart_s = scn?.start_s ?? 0, stayEnd_s = scn ? scn.start_s + scn.stay_s : 0;
  const table = useTableRange(data, stayStart_s, stayEnd_s);

  // Score the window in the worker whenever the place, its mask, the dates or the rules change.
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

  // Once the first answer is on screen, and the miss test's answer too when the miss test is the open view
  // (the default link), fetch the other years while the browser is idle, so later date changes, calendars
  // and searches do not wait, and the first screen never shares the network with them. After a failure it
  // tries again on the next answer or after PREFETCH_RETRY_MS.
  const firstScreenDone = !!result && (scn?.view !== 'miss' || missSettled);
  // Background retries back off (PREFETCH_RETRY_MS, then twice that, …) and stop after PREFETCH_MAX_TRIES; a
  // view that needs a missing year still fetches it on demand and offers Retry. The timer lives in a ref so a
  // retry scheduled by an older run of the effect is still cleared on unmount.
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
      if (ran) return; // the fetch is under way; its own catch schedules any retry
      // not started yet: cancel it and let the next run of this effect schedule it again
      if (idle !== undefined) w.cancelIdleCallback?.(idle);
      if (fallback !== undefined) clearTimeout(fallback);
      prefetched.current = false;
    };
  }, [data, result, firstScreenDone, prefetchTry]);

  const t_s = scn ? scn.start_s + scn.t_off_s : 0;
  const now = useMemo(() => {
    if (!data || !place || !scn) return null;
    if (!data.hasRange(t_s, t_s)) return null; // its year is still loading; tableTick re-runs this

    const site_km = site_vector(place.lat_deg, place.lon_deg, place.h_m + scn.rules.observer_height_m);
    return sample_at(data.table, t_s, site_km, local_frame(place.lat_deg, place.lon_deg), place.mask, scn.rules);
  }, [data, place, t_s, scn?.rules, tableTick]);

  if (error) return <main><p role="alert">Could not load data: {error}</p></main>;
  if (!data || !scn) return <main><p>Loading SunSight…</p></main>;
  void fixtureTick;
  const fixture = data.fixtureFiles.size > 0;
  const epochMs = data.eph.start_ms;
  const answer = freshAnswer(result, key);
  const fresh = answer !== null;
  // While computing, the previous answer's charts stay on screen, dimmed and marked busy; the
  // verdict, countdowns and export appear only for the answer that matches the inputs.
  const shown = answer ?? result?.answer ?? null;
  const cds = shown && fresh
    ? countdownsAt(shown.metrics, { lit0: shown.series.sun_frac[0] >= scn.rules.lit_threshold, earth0: shown.series.earth_frac[0] > 0, contact0: shown.series.contact[0] > 0 }, t_s)
    : null;
  const placeName = site ? site.name : `Custom point ${formatDeg(scn.lat_deg, 3)}, ${formatDeg(scn.lon_deg, 3)}`;

  return (
    <RulesContext.Provider value={scn.rules}>
      {fixture && (
        <div class="fixture-banner" role="status" data-testid="fixture-banner">
          Fixture data: these numbers are made up for development and are not real.
        </div>
      )}
      <header class="top">
        <h1>SunSight</h1>
        <p class="tagline">Will a lunar landing site have sunlight for power and a line of sight to Earth?</p>
      </header>
      <StartStrip scn={scn} defaultCompare={data.sites.slice(0, 3).map((s) => s.id)} update={update} />
      <main>
        <VerdictHero
          verdict={fresh ? shown!.verdict : null}
          busy={!fresh && !jobError}
          placeName={placeName}
          horizonLabel={place?.horizonLabel ?? ''}
          terrain={place?.terrain ?? false}
          sunElDeg={now?.sun_el_deg ?? null}
          sunVisible={now?.sun_frac ?? null}
          countdowns={cds}
          epochMs={epochMs}
          nowMs={epochMs + t_s * 1000}
          siteNote={site ? <>
            {asRefined(site.refined) && <RefinedNote r={asRefined(site.refined)!} />}
            <SiteSource site={site} />
          </> : undefined}
        />
        <section class="controls" aria-label="Scenario">
          <SitePicker
            sites={data.sites}
            siteId={scn.site_id}
            lat_deg={scn.lat_deg}
            lon_deg={scn.lon_deg}
            onSite={(id) => update({ site_id: id })}
            onCustom={(lat_deg, lon_deg) => update({ site_id: null, lat_deg, lon_deg })}
          />
          <ScenarioControls scn={scn} epochMs={epochMs} rangeS={tableRange(data.eph.meta)} onChange={update} />
        </section>

        {table.state === 'error'
          ? <p data-testid="table-status"><TableStatus tr={table} /></p>
          : jobError && <p role="alert">The engine failed: {jobError}</p>}

        <TimeBar scn={scn} epochMs={epochMs} onTime={(t_off_s) => update({ t_off_s })} />

        <nav class="tabs" role="tablist" aria-label="Views">
          {VIEWS.map((v) => (
            <button key={v.id} role="tab" aria-selected={scn.view === v.id} onClick={() => update({ view: v.id })}>{v.label}</button>
          ))}
        </nav>

        {scn.view === 'report' && shown && (
          <div role="tabpanel" aria-label="Report card" aria-busy={!fresh && !jobError} data-stale={!fresh} style={{ opacity: fresh ? 1 : 0.6 }}>
            {!fresh && <p class="small" role="status" data-testid="stale-note">{jobError ? 'The charts below are from the previous inputs; the engine failed for the current ones.' : 'Updating: the charts below are from the previous inputs.'}</p>}
            <Timeline series={shown.series} metrics={shown.metrics} rules={scn.rules} start_s={shown.series.t_s[0]}
              stay_s={shown.series.t_s[shown.series.t_s.length - 1] - shown.series.t_s[0]} t_off_s={scn.t_off_s}
              onTime={(t_off_s) => update({ t_off_s })} />
            <MetricTiles m={shown.metrics} rules={scn.rules} />
            {fresh && place && (
              <ShareBar answer={shown} ctx={{
                fixture, epoch_ms: epochMs, preset: scn.preset, rules: scn.rules, stay_s: scn.stay_s,
                start_utc: new Date(epochMs + scn.start_s * 1000).toISOString().slice(0, 16) + 'Z',
                link: location.origin + location.pathname + '?' + encodeScenario(scn, epochMs),
                site: { id: scn.site_id, name: placeName, lat_deg: place.lat_deg, lon_deg: place.lon_deg, h_m: place.h_m, horizon: place.horizonLabel },
              }} />
            )}
          </div>
        )}
        {scn.view === 'rank' && (
          <div role="tabpanel" aria-label="Which sites work?">
            <RankView data={data} scn={scn} update={update} />
            <TerrainCredit />
          </div>
        )}
        {scn.view === 'sky' && shown && now && place && (
          <div role="tabpanel" aria-label="Sky panorama" aria-busy={!fresh} data-stale={!fresh} style={{ opacity: fresh ? 1 : 0.6 }}>
            <Panorama series={shown.series} now={now} mask={place.mask} horizonLabel={place.horizonLabel} />
          </div>
        )}
        {scn.view === 'miss' && (
          <div role="tabpanel" aria-label="Miss test">
            <MissView data={data} site={site} scn={scn} onSite={(id) => update({ site_id: id })} update={update} onSettled={() => setMissSettled(true)} />
            <TerrainCredit />
          </div>
        )}
        {scn.view === 'compare' && (
          <div role="tabpanel" aria-label="Compare and calendar">
            <Compare data={data} scn={scn} update={update} />
          </div>
        )}
        {scn.view === '3d' && (
          <div role="tabpanel" aria-label="3D view">
            <Hero3D data={data} site={site} place={place} scn={scn} now={now} series={answer?.series ?? null} update={update} table={table} />
            <TerrainCredit />
          </div>
        )}
        {scn.view === 'story' && (
          <div role="tabpanel" aria-label="Athena story">
            <Story data={data} scn={scn} update={update} />
          </div>
        )}
        {scn.view === 'validation' && (
          <div role="tabpanel" aria-label="Validation">
            <ValidationView data={data} />
          </div>
        )}
        <AboutData sites={data.sites} fixture={fixture} />
        <footer class="small muted" style={{ marginTop: 24 }}>
          {fresh && result && <>Scored {shown!.metrics.n_samples} ten-minute steps in {result.windowMs.toFixed(0)} ms. </>}
          Sun and Earth positions from {data.manifest.fixture ? 'made-up fixture data' : 'NASA/JPL SPICE kernels'}. All maths runs in your browser; no data leaves it.
        </footer>
      </main>
    </RulesContext.Provider>
  );
}
