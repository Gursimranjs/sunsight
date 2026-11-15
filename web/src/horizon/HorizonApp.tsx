// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// The horizon interface (review note 009), shown with ?ui=horizon: black sky with the mission line and
// the horizon hero, the lit ground panel with the call, and a view switch wrapping the existing views.
// Every view other than Horizon, the game and the pickers are separate chunks loaded when first opened.
import { useState } from 'preact/hooks';
import { formatDeg, formatPct } from '../format';
import { encodeScenario } from '../state/url';
import { AboutData, SiteSource, TerrainCredit } from '../views/Credits';
import { MISS_TOLERANT_SHARE, missSig } from '../views/missGeometry';
import { Panorama } from '../views/Panorama';
import { asRefined, MetricTiles, RefinedNote } from '../views/ReportCard';
import { RulesContext, Term } from '../views/Term';
import { TableStatus } from '../views/useTableRange';
import { GroundPanel } from './GroundPanel';
import { HorizonHero } from './HorizonHero';
import { MissionLine, type PickerKind } from './MissionLine';
import { hzViewFor, isLocalView, lazyComponent, missGridIdOf, scnViewFor, useHorizonState, type HzView } from './useHorizonState';
import { ViewSwitch } from './ViewSwitch';
import './tokens.css';
import './horizon.css';

const views = () => import('./lazyViews');
const Hero3D = lazyComponent(() => views().then((m) => m.Hero3D), 'Loading the 3D ground…');
const MissView = lazyComponent(() => views().then((m) => m.MissView), 'Loading the miss map…');
const RankView = lazyComponent(() => views().then((m) => m.RankView), 'Loading the ranking…');
const Compare = lazyComponent(() => views().then((m) => m.Compare), 'Loading the calendar…');
const Story = lazyComponent(() => views().then((m) => m.Story), 'Loading the tour…');
const ValidationView = lazyComponent(() => views().then((m) => m.ValidationView), 'Loading the proof…');
const ShareBar = lazyComponent(() => views().then((m) => m.ShareBar), 'Loading the export…');
const LandGame = lazyComponent(() => import('./game/LandGame').then((m) => m.LandGame), 'Loading the game…');

/** Classic cards on the classic dark surface: classic text colour (not the tokens' ink), centred like the view area. */
const CLASSIC_SURFACE = { color: 'var(--fg)', maxWidth: 1100, margin: '0 auto' };

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Scroll the view area into sight (smooth unless the visitor asked for reduced motion). */
const showViewArea = () => requestAnimationFrame(() => document.getElementById('hz-view')?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' }));

export function HorizonApp() {
  const st = useHorizonState();
  const { data, error, scn, update, site, place, table, shown, fresh, answer, jobError, now, cds, missShare, missLineShare, local, setLocal } = st;
  const [picker, setPicker] = useState<PickerKind | null>(null);

  if (error) return <main class="hz"><p role="alert">Could not load data: {error}</p></main>;
  if (!data || !scn) return <main class="hz"><p>Loading SunSight…</p></main>;
  const fixture = data.fixtureFiles.size > 0;
  const epochMs = data.eph.start_ms;
  const placeName = site ? site.name : `Custom point ${formatDeg(scn.lat_deg, 3)}, ${formatDeg(scn.lon_deg, 3)}`;
  const view: HzView = local ?? hzViewFor(scn.view);
  const setView = (v: HzView) => {
    if (isLocalView(v)) { setLocal(v); return; }
    setLocal(null);
    update({ view: scnViewFor(v) });
  };

  const hasMiss = missGridIdOf(site) !== null;
  const sig = missSig(scn.site_id, scn.start_s, scn.stay_s, scn.rules);
  // The Miss map's own share when it has one for this scenario (its radius may differ), else the miss line's job.
  const ms = missShare && missShare.sig === sig ? missShare : missLineShare && missLineShare.sig === sig ? missLineShare : null;
  const ok = ms ? ms.share >= MISS_TOLERANT_SHARE : false;
  const openView = (v: HzView) => { setView(v); showViewArea(); };
  const missLine = hasMiss ? (
    <p class={`hz-miss ${ms ? (ok ? 'ok' : 'warn') : ''}`} data-testid="verdict-miss-line">
      {ms
        ? <><span class="sym" aria-hidden="true">{ok ? '✓' : '!'}</span> Miss by up to {ms.radius_m} m: <strong data-testid="verdict-miss-share">{formatPct(ms.share)}</strong> of the ground still holds{ok ? ' (miss-tolerant)' : ' (not miss-tolerant)'}; <Term tip="miss">a robustness share, not a landing probability</Term>. </>
        : view === 'game' ? <>How much ground near the target still holds? Play to find out, or </> : <>Miss test: computing… </>}
      <button type="button" class="link-button" data-testid="hz-open-miss" onClick={() => openView('miss')}>{ms ? 'See the map' : 'Open the Miss map'}</button>
    </p>
  ) : undefined;
  const gameButton = hasMiss && view !== 'game' ? (
    <p class="hz-game-entry"><button type="button" data-testid="hz-game-button" onClick={() => openView('game')}>Land it yourself</button></p>
  ) : undefined;

  const stale = !fresh && !jobError;
  const staleNote = !fresh && shown ? (
    <p class="small hz-stale" role="status" data-testid="stale-note">
      {jobError ? 'The paths shown are from the previous inputs; the engine failed for the current ones.' : 'Updating: the paths shown are from the previous inputs.'}
    </p>
  ) : null;
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
          {/* Old answers stay visible while the new one computes, dimmed and labelled, as in the classic interface (shell #3). */}
          <div data-stale={!fresh} style={{ opacity: fresh ? 1 : 0.6 }}>
            <HorizonHero series={shown?.series ?? null} now={now} mask={place?.mask ?? null} terrain={place?.terrain ?? true}
              horizonLabel={place?.horizonLabel ?? ''} busy={stale} />
          </div>
          {staleNote}
        </header>
        <main>
          <GroundPanel verdict={fresh ? shown!.verdict : null} busy={stale} stay_s={scn.stay_s} now={now} lit_threshold={scn.rules.lit_threshold}
            countdowns={cds} epochMs={epochMs} start_s={scn.start_s} t_off_s={scn.t_off_s} series={fresh ? shown!.series : null}
            onTime={(t_off_s) => update({ t_off_s })} missLine={missLine} gameEntry={gameButton}
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
          {/* The wrapped views still sit on the classic dark surfaces: keep the classic text colour there, not the
              tokens' ink (which is for the light ground), until the views themselves take the tokens. */}
          <div class="hz-view" id="hz-view" data-testid="hz-view" key={view} aria-label="View" role="region" data-surface="classic" style={{ color: 'var(--fg)' }}>
            {view === 'horizon' && shown && now && place && (
              <div aria-busy={stale} data-stale={!fresh} style={{ opacity: fresh ? 1 : 0.6 }}>
                {!fresh && <p class="small" role="status">{jobError ? 'The charts below are from the previous inputs; the engine failed for the current ones.' : 'Updating: the charts below are from the previous inputs.'}</p>}
                <Panorama series={shown.series} now={now} mask={place.mask} horizonLabel={place.horizonLabel} />
                <MetricTiles m={shown.metrics} rules={scn.rules} />
              </div>
            )}
            {view === 'ground' && <><Hero3D data={data} site={site} place={place} scn={scn} now={now} series={answer?.series ?? null} update={update} table={table} /><TerrainCredit /></>}
            {view === 'miss' && (
              <>
                {hasMiss && (
                  <p class="hz-view-bar" data-testid="hz-miss-game-bar">
                    Try it as a game: <button type="button" class="link-button" data-testid="hz-miss-game-link" onClick={() => setView('game')}>Land it yourself</button>
                  </p>
                )}
                <MissView data={data} site={site} scn={scn} onSite={(id: string) => update({ site_id: id })} update={update} onSettled={() => st.setMissSettled(true)} onShare={st.setMissShare} />
                <TerrainCredit />
              </>
            )}
            {view === 'game' && <LandGame data={data} scn={scn} site={site} update={update} onShowMissMap={() => openView('miss')} />}
            {view === 'rank' && <><RankView data={data} scn={scn} update={update} /><TerrainCredit /></>}
            {view === 'calendar' && <Compare data={data} scn={scn} update={update} />}
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
          <div data-surface="classic" style={CLASSIC_SURFACE}><AboutData sites={data.sites} fixture={fixture} /></div>
          <footer class="small hz-foot" data-surface="classic" style={{ color: 'var(--fg)' }}>
            Sun and Earth positions from {data.manifest.fixture ? 'made-up fixture data' : 'NASA/JPL SPICE kernels'}. All maths runs in your browser; no data leaves it.
            {' '}<a href={'?' + encodeScenario(scn, epochMs) + '&ui=classic'}>Classic interface</a>
          </footer>
        </main>
      </div>
    </RulesContext.Provider>
  );
}
