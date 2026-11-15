// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// The horizon interface (review note 009), shown with ?ui=horizon: black sky with the mission line and
// the horizon hero, the lit ground panel with the call, and a view switch wrapping the existing views.
import { useState } from 'preact/hooks';
import { formatDeg, formatPct } from '../format';
import { encodeScenario } from '../state/url';
import { AboutData, SiteSource, TerrainCredit } from '../views/Credits';
import { Compare } from '../views/Compare';
import { Hero3D } from '../views/Hero3D';
import { MISS_TOLERANT_SHARE, missSig } from '../views/missGeometry';
import { MissView } from '../views/MissView';
import { Panorama } from '../views/Panorama';
import { RankView } from '../views/Rank';
import { asRefined, MetricTiles, RefinedNote } from '../views/ReportCard';
import { ShareBar } from '../views/ShareBar';
import { Story } from '../views/Story';
import { RulesContext, Term } from '../views/Term';
import { TableStatus } from '../views/useTableRange';
import { ValidationView } from '../views/Validation';
import { GroundPanel } from './GroundPanel';
import { HorizonHero } from './HorizonHero';
import { MissionLine, type PickerKind } from './MissionLine';
import { hzViewFor, scnViewFor, useHorizonState, type HzView } from './useHorizonState';
import { ViewSwitch } from './ViewSwitch';
import './horizon.css';

export function HorizonApp() {
  const st = useHorizonState();
  const { data, error, scn, update, site, place, table, shown, fresh, answer, jobError, now, cds, missShare } = st;
  const [picker, setPicker] = useState<PickerKind | null>(null);
  /** Views with no classic view id of their own (Export; Compare shares the Calendar's view). */
  const [local, setLocal] = useState<HzView | null>(null);

  if (error) return <main class="hz"><p role="alert">Could not load data: {error}</p></main>;
  if (!data || !scn) return <main class="hz"><p>Loading SunSight…</p></main>;
  const fixture = data.fixtureFiles.size > 0;
  const epochMs = data.eph.start_ms;
  const placeName = site ? site.name : `Custom point ${formatDeg(scn.lat_deg, 3)}, ${formatDeg(scn.lon_deg, 3)}`;
  const fromScn = hzViewFor(scn.view);
  const view: HzView = local === 'export' || (local === 'compare' && fromScn === 'calendar') ? local : fromScn;
  const setView = (v: HzView) => {
    setLocal(v === 'export' || v === 'compare' ? v : null);
    if (v !== 'export') update({ view: scnViewFor(v) });
  };

  const hasMiss = !!site && !!(site.miss_target_id || (typeof site.miss_grid_id === 'string' && site.miss_grid_id));
  const ms = missShare && missShare.sig === missSig(scn.site_id, scn.start_s, scn.stay_s, scn.rules) ? missShare : null;
  const ok = ms ? ms.share >= MISS_TOLERANT_SHARE : false;
  const openMiss = () => {
    setView('miss');
    requestAnimationFrame(() => document.getElementById('hz-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const missLine = hasMiss ? (
    <p class={`hz-miss ${ms ? (ok ? 'ok' : 'warn') : ''}`} data-testid="verdict-miss-line">
      {ms
        ? <><span class="sym" aria-hidden="true">{ok ? '✓' : '!'}</span> Miss by up to {ms.radius_m} m: <strong data-testid="verdict-miss-share">{formatPct(ms.share)}</strong> of the ground still holds{ok ? ' (miss-tolerant)' : ' (not miss-tolerant)'}; <Term tip="miss">a robustness share, not a landing probability</Term>. </>
        : view === 'miss' ? <>Miss test: computing… </> : <>How much ground near the target still holds? </>}
      <button type="button" class="link-button" onClick={openMiss}>{ms ? 'See the map' : 'Open the Miss map'}</button>
    </p>
  ) : undefined;

  const stale = !fresh && !jobError;
  return (
    <RulesContext.Provider value={scn.rules}>
      <div class="hz" data-testid="hz-app">
        {fixture && (
          <div class="fixture-banner" role="status" data-testid="fixture-banner">
            Fixture data: these numbers are made up for development and are not real.
          </div>
        )}
        <header class="hz-sky">
          <h1 class="hz-brand">SunSight</h1>
          <MissionLine data={data} scn={scn} site={site} placeName={placeName} open={picker} setOpen={setPicker} update={update} />
          <HorizonHero series={shown?.series ?? null} now={now} mask={place?.mask ?? null} terrain={place?.terrain ?? true}
            horizonLabel={place?.horizonLabel ?? ''} busy={stale} />
        </header>
        <main>
          <GroundPanel verdict={fresh ? shown!.verdict : null} busy={stale} stay_s={scn.stay_s} now={now} lit_threshold={scn.rules.lit_threshold}
            countdowns={cds} epochMs={epochMs} start_s={scn.start_s} t_off_s={scn.t_off_s} series={shown?.series ?? null}
            onTime={(t_off_s) => update({ t_off_s })} missLine={missLine}
            status={table.state === 'error'
              ? <p data-testid="table-status"><TableStatus tr={table} /></p>
              : jobError && <p role="alert">The engine failed: {jobError}</p>}
            sources={<>
              <p class="small" data-testid="horizon-label">{placeName} · {!place ? 'Resolving the horizon…' : place.terrain ? place.horizonLabel : <Term tip="smooth">{place.horizonLabel}</Term>}</p>
              {site && asRefined(site.refined) && <RefinedNote r={asRefined(site.refined)!} />}
              {site && <SiteSource site={site} />}
              <TerrainCredit />
            </>} />
          <ViewSwitch view={view} onView={setView} />
          <div class="hz-view" id="hz-view" data-testid="hz-view" key={view} aria-label="View" role="region">
            {view === 'horizon' && shown && now && place && (
              <div aria-busy={stale} data-stale={!fresh} style={{ opacity: fresh ? 1 : 0.6 }}>
                <Panorama series={shown.series} now={now} mask={place.mask} horizonLabel={place.horizonLabel} />
                <MetricTiles m={shown.metrics} rules={scn.rules} />
              </div>
            )}
            {view === 'ground' && <><Hero3D data={data} site={site} place={place} scn={scn} now={now} series={answer?.series ?? null} update={update} table={table} /><TerrainCredit /></>}
            {view === 'miss' && <><MissView data={data} site={site} scn={scn} onSite={(id) => update({ site_id: id })} update={update} onSettled={() => st.setMissSettled(true)} onShare={st.setMissShare} /><TerrainCredit /></>}
            {view === 'rank' && <><RankView data={data} scn={scn} update={update} /><TerrainCredit /></>}
            {(view === 'calendar' || view === 'compare') && <Compare data={data} scn={scn} update={update} />}
            {view === 'tour' && <Story data={data} scn={scn} update={update} />}
            {view === 'proof' && <ValidationView data={data} />}
            {view === 'export' && (fresh && place && shown ? (
              <ShareBar answer={shown} ctx={{
                fixture, epoch_ms: epochMs, preset: scn.preset, rules: scn.rules, stay_s: scn.stay_s,
                start_utc: new Date(epochMs + scn.start_s * 1000).toISOString().slice(0, 16) + 'Z',
                link: location.origin + location.pathname + '?' + encodeScenario(scn, epochMs) + '&ui=horizon',
                site: { id: scn.site_id, name: placeName, lat_deg: place.lat_deg, lon_deg: place.lon_deg, h_m: place.h_m, horizon: place.horizonLabel },
              }} />
            ) : <p>Computing…</p>)}
          </div>
          <AboutData sites={data.sites} fixture={fixture} />
          <footer class="small hz-foot">
            Sun and Earth positions from {data.manifest.fixture ? 'made-up fixture data' : 'NASA/JPL SPICE kernels'}. All maths runs in your browser; no data leaves it.
            {' '}<a href={'?' + encodeScenario(scn, epochMs)}>Classic interface</a>
          </footer>
        </main>
      </div>
    </RulesContext.Provider>
  );
}
