// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// "I have a date: which sites work?": every curated site with terrain masks, scored for the
// scenario's start date, stay and rules, ranked by verdict and then score.
import { LOADING_TABLE_TEXT, useTableRange } from './useTableRange';
import { useEffect, useState } from 'preact/hooks';
import type { Resolved } from '../data/sites';
import type { WindowAnswer } from '../engine/compute';
import { PRESET_LABELS, type VerdictKind } from '../engine/light';
import { formatPct, formatUtc } from '../format';
import { resolveForSite, type AppData } from '../state/data';
import type { Scenario } from '../state/scenario';
import { mayHaveTerrain, rankRows, splitForRanking, type RankedSite } from './rankOrder';
import { VerdictBadge } from './ReportCard';

interface Props {
  data: AppData;
  scn: Scenario;
  update: (patch: Partial<Scenario>) => void;
}

interface Ranking { key: string; rows: RankedSite[]; unranked: number; failed: string[] }
/** Progress of the run for `key`: loading horizon masks, then scoring the ranked sites. */
interface Progress { key: string; phase: 'masks' | 'score'; done: number; total: number }

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function RankView({ data, scn, update }: Props) {
  const h_m = scn.rules.observer_height_m;
  const key = JSON.stringify([scn.start_s, scn.stay_s, scn.rules]);
  // Only sites that may load a terrain file take time while masks load; the rest resolve at once.
  const maskTotal = data.sites.filter(mayHaveTerrain).length;
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<{ key: string; text: string } | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      // Resolve every curated site; region and miss-grid files load in parallel and are cached.
      let loaded = 0;
      setProgress({ key, phase: 'masks', done: 0, total: maskTotal });
      const places: Resolved[] = await Promise.all(data.sites.map((s) => resolveForSite(data, s, h_m).then((p) => {
        if (mayHaveTerrain(s)) {
          loaded += 1;
          if (live) setProgress({ key, phase: 'masks', done: loaded, total: maskTotal });
        }
        return p;
      })));
      if (!live) return;
      const { withTerrain, failed, unranked } = splitForRanking(data.sites, places);
      // One window job at a time, so a newer run (or the report card's own job) never waits behind
      // a queue of stale ones: once this run is stale, nothing more is sent.
      const answers: WindowAnswer[] = [];
      setProgress({ key, phase: 'score', done: 0, total: withTerrain.length });
      for (const { place } of withTerrain) {
        if (!live) return;
        answers.push(await data.engine.window({
          place: { lat_deg: place.lat_deg, lon_deg: place.lon_deg, h_m: place.h_m }, mask: place.mask,
          start_s: scn.start_s, end_s: scn.start_s + scn.stay_s, rules: scn.rules,
        }));
        if (live) setProgress({ key, phase: 'score', done: answers.length, total: withTerrain.length });
      }
      if (!live) return;
      setRanking({ key, rows: rankRows(withTerrain, answers), unranked, failed });
    })().catch((e) => { if (live) setError({ key, text: String(e) }); });
    return () => { live = false; };
  }, [key]);

  const r = ranking && ranking.key === key ? ranking : null;
  const err = error && error.key === key ? error.text : null;
  const prog: Progress = progress && progress.key === key ? progress : { key, phase: 'masks', done: 0, total: maskTotal };
  const tableReady = useTableRange(data, scn.start_s, scn.start_s + scn.stay_s);
  const startText = formatUtc(data.eph.start_ms + scn.start_s * 1000);
  const stay_days = Number((scn.stay_s / 86400).toFixed(2));
  const open = (id: string) => { update({ site_id: id, view: 'report', t_off_s: 0 }); window.scrollTo({ top: 0 }); };
  const counts = r ? (['go', 'marginal', 'no-go'] as VerdictKind[]).map((v) => r.rows.filter((x) => x.verdict === v).length) : [];
  const anyPass = r ? counts[0] + counts[1] > 0 : false;
  const other = r && r.rows.length > 0 ? 'other ' : '';

  return (
    <section class="card" aria-label="Which sites work on this date" data-testid="rank">
      <h3>Which sites work for a {stay_days}-day stay starting {startText}?</h3>
      <p class="small muted" style={{ margin: '0 0 8px' }}>
        Every curated site with terrain horizon masks, scored with the current rules ({PRESET_LABELS[scn.preset]} preset, observer {scn.rules.observer_height_m} m).
        Sorted by verdict, then by score. Change the date, stay or rules above and the ranking follows.
      </p>
      {err && <p role="alert">The ranking failed: {err}</p>}
      {!r && !err && (
        <p role="status" data-testid="rank-progress">
          {prog.phase === 'masks'
            ? <>Loading horizon masks… {prog.done} of {prog.total} {plural(prog.total, 'site', 'sites')}</>
            : !tableReady ? <>{LOADING_TABLE_TEXT}</>
            : <>Scoring {prog.total} {plural(prog.total, 'site', 'sites')}… {formatPct(prog.total ? prog.done / prog.total : 0)}</>}
        </p>
      )}
      {r && r.rows.length === 0 && (r.failed.length > 0
        ? <p>No site could be ranked: no terrain horizon masks could be used.</p>
        : <p>No curated site in this data set has terrain horizon masks, so there is nothing to rank.</p>)}
      {r && r.rows.length > 0 && (
        <>
          <p class="takeaway" style={{ margin: '0 0 8px' }} data-testid="rank-summary">
            {counts[0]} go, {counts[1]} marginal and {counts[2]} no-go of {r.rows.length} {plural(r.rows.length, 'site', 'sites')}.{' '}
            {anyPass
              ? <>Best: {r.rows[0].name}.</>
              : <>No ranked site meets the rules for this stay. Highest score: {r.rows[0].name} (still no-go).</>}
          </p>
          <ol class="rank-list" data-testid="rank-list" aria-label="Sites ranked for this date">
            {r.rows.map((x, i) => (
              <li key={x.id} class={`rank-row ${x.verdict}`} data-testid="rank-row" data-site={x.id} data-verdict={x.verdict} data-score={x.score}>
                <span class="rank-n" data-testid="rank-n">{i + 1}</span>
                <div class="rank-body">
                  <p style={{ margin: 0 }}>
                    <strong data-testid="rank-name">{x.name}</strong>{' '}<VerdictBadge v={x.verdict} small />{' '}
                    <span class="small muted">score {x.score.toFixed(0)}</span>
                  </p>
                  <p class="small" style={{ margin: 0 }} data-testid="rank-reason">{x.reason}</p>
                  <p class="small muted" style={{ margin: 0 }} data-testid="rank-horizon">{x.horizonLabel}</p>
                </div>
                <button type="button" aria-label={`Open the report card for ${x.name}`} onClick={() => open(x.id)}>Report card</button>
              </li>
            ))}
          </ol>
        </>
      )}
      {r && (r.unranked > 0 || r.failed.length > 0) && (
        <p class="small muted" style={{ margin: '8px 0 0' }} data-testid="rank-unranked">
          {r.unranked === 1 && <>1 {other}curated site has no terrain horizon masks in this data set and is not ranked; its smooth-horizon answer is on its own report card.</>}
          {r.unranked > 1 && <>{r.unranked} {other}curated sites have no terrain horizon masks in this data set and are not ranked; their smooth-horizon answers are on their own report cards.</>}
          {r.failed.length === 1 && <> The terrain file for {r.failed[0]} could not be loaded, so it is not ranked.</>}
          {r.failed.length > 1 && <> The terrain files for {r.failed.join(', ')} could not be loaded, so they are not ranked.</>}
        </p>
      )}
    </section>
  );
}
