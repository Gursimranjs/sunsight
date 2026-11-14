// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { resolveCustom, type Resolved } from './data/sites';
import type { WindowAnswer } from './engine/compute';
import { countdownsAt } from './engine/countdown';
import { local_frame, sample_at, site_vector } from './engine/light';
import { formatDeg } from './format';
import { loadAppData, resolveForSite, type AppData } from './state/data';
import { clampScenario, defaultScenario, tableRange, VIEWS, type Scenario } from './state/scenario';
import { decodeScenario, encodeScenario } from './state/url';
import { ShareBar } from './views/ShareBar';
import { Compare } from './views/Compare';
import { MissView } from './views/MissView';
import { Panorama } from './views/Panorama';
import { asRefined, MetricTiles, RefinedNote, VerdictHero } from './views/ReportCard';
import { ScenarioControls, TimeBar } from './views/RulesEditor';
import { SitePicker } from './views/SitePicker';
import { Timeline } from './views/Timeline';
import { ValidationView } from './views/Validation';
import { Hero3D } from './views/Hero3D';
import { Story } from './views/Story';

export function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fixtureTick, setFixtureTick] = useState(0);
  const [scn, setScn] = useState<Scenario | null>(null);
  const [place, setPlace] = useState<Resolved | null>(null);
  const [result, setResult] = useState<{ key: string; answer: WindowAnswer } | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const reqKey = useRef('');

  useEffect(() => {
    loadAppData(() => setFixtureTick((x) => x + 1))
      .then((d) => {
        setData(d);
        const first = d.sites[0]?.id ?? null;
        const q = typeof location !== 'undefined' ? location.search : '';
        const s0 = q ? decodeScenario(q, d.eph.start_ms, first, d.sites.map((x) => x.id)) : defaultScenario(first);
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

  // Resolve the site to coordinates and a horizon mask (loads the region file when needed).
  useEffect(() => {
    if (!data || !scn) return;
    let live = true;
    const h = scn.rules.observer_height_m;
    if (!site) setPlace(resolveCustom(scn.lat_deg, scn.lon_deg, h));
    else resolveForSite(data, site, h).then((r) => live && setPlace(r));
    return () => { live = false; };
  }, [data, site, scn?.lat_deg, scn?.lon_deg, scn?.rules.observer_height_m]);

  // Score the window in the worker whenever the place, dates or rules change.
  const key = place && scn ? JSON.stringify([place.lat_deg, place.lon_deg, place.h_m, place.pointId, place.horizonLabel, scn.start_s, scn.stay_s, scn.rules]) : '';
  useEffect(() => {
    if (!data || !place || !scn || !key) return;
    reqKey.current = key;
    setJobError(null);
    data.engine
      .window({ place: { lat_deg: place.lat_deg, lon_deg: place.lon_deg, h_m: place.h_m }, mask: place.mask, start_s: scn.start_s, end_s: scn.start_s + scn.stay_s, rules: scn.rules })
      .then((answer) => { if (reqKey.current === key) setResult({ key, answer }); })
      .catch((e) => setJobError(String(e)));
  }, [key]);

  const t_s = scn ? scn.start_s + scn.t_off_s : 0;
  const now = useMemo(() => {
    if (!data || !place || !scn) return null;
    const site_km = site_vector(place.lat_deg, place.lon_deg, place.h_m + scn.rules.observer_height_m);
    return sample_at(data.table, t_s, site_km, local_frame(place.lat_deg, place.lon_deg), place.mask, scn.rules);
  }, [data, place, t_s, scn?.rules]);

  if (error) return <main><p role="alert">Could not load data: {error}</p></main>;
  if (!data || !scn) return <main><p>Loading SunSight…</p></main>;
  void fixtureTick;
  const fixture = data.fixtureFiles.size > 0;
  const epochMs = data.eph.start_ms;
  const answer = result && result.key === key ? result.answer : null;
  const fresh = answer !== null;
  const shown = answer ?? result?.answer ?? null; // keep the previous answer on screen while computing
  const cds = shown && fresh
    ? countdownsAt(shown.metrics, { lit0: shown.series.sun_frac[0] >= scn.rules.lit_threshold, earth0: shown.series.earth_frac[0] > 0, contact0: shown.series.contact[0] > 0 }, t_s)
    : null;
  const placeName = site ? site.name : `Custom point ${formatDeg(scn.lat_deg, 3)}, ${formatDeg(scn.lon_deg, 3)}`;

  return (
    <>
      {fixture && (
        <div class="fixture-banner" role="status" data-testid="fixture-banner">
          Fixture data: these numbers are made up for development and are not real.
        </div>
      )}
      <header class="top">
        <h1>SunSight</h1>
        <p class="tagline">Will a lunar landing site have sunlight for power and a line of sight to Earth?</p>
      </header>
      <main>
        <VerdictHero
          verdict={fresh ? shown!.verdict : null}
          busy={!fresh}
          placeName={placeName}
          horizonLabel={place?.horizonLabel ?? ''}
          terrain={place?.terrain ?? false}
          sunElDeg={now?.sun_el_deg ?? null}
          sunVisible={now?.sun_frac ?? null}
          countdowns={cds}
          epochMs={epochMs}
          nowMs={epochMs + t_s * 1000}
          siteNote={site && asRefined(site.refined) ? <RefinedNote r={asRefined(site.refined)!} /> : undefined}
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

        {jobError && <p role="alert">The engine failed: {jobError}</p>}

        <TimeBar scn={scn} epochMs={epochMs} onTime={(t_off_s) => update({ t_off_s })} />

        <nav class="tabs" role="tablist" aria-label="Views">
          {VIEWS.map((v) => (
            <button key={v.id} role="tab" aria-selected={scn.view === v.id} onClick={() => update({ view: v.id })}>{v.label}</button>
          ))}
        </nav>

        {scn.view === 'report' && shown && (
          <div role="tabpanel" aria-label="Report card" style={{ opacity: fresh ? 1 : 0.6 }}>
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
        {scn.view === 'sky' && shown && now && place && (
          <div role="tabpanel" aria-label="Sky panorama" style={{ opacity: fresh ? 1 : 0.6 }}>
            <Panorama series={shown.series} now={now} mask={place.mask} horizonLabel={place.horizonLabel} />
          </div>
        )}
        {scn.view === 'miss' && (
          <div role="tabpanel" aria-label="Miss test">
            <MissView data={data} site={site} scn={scn} onSite={(id) => update({ site_id: id })} />
          </div>
        )}
        {scn.view === 'compare' && (
          <div role="tabpanel" aria-label="Compare and calendar">
            <Compare data={data} scn={scn} update={update} />
          </div>
        )}
        {scn.view === '3d' && (
          <div role="tabpanel" aria-label="3D view">
            <Hero3D data={data} site={site} place={place} scn={scn} now={now} update={update} />
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
        <footer class="small muted" style={{ marginTop: 24 }}>
          {fresh && <>Scored {shown!.metrics.n_samples} ten-minute steps in {data.engine.lastMs.toFixed(0)} ms. </>}
          Sun and Earth positions from {data.manifest.fixture ? 'made-up fixture data' : 'NASA/JPL SPICE kernels'}. All maths runs in your browser; no data leaves it.
        </footer>
      </main>
    </>
  );
}
