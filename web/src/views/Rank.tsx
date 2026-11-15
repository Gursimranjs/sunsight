// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// "I have a date: which sites work?": every curated site with terrain masks, scored for the
// scenario's start date, stay and rules, ranked by verdict and then score.
import { useEffect, useState } from 'preact/hooks';
import type { Resolved } from '../data/sites';
import type { Site } from '../data/types';
import { PRESET_LABELS, type VerdictKind } from '../engine/light';
import { formatPct, formatUtc } from '../format';
import { resolveForSite, type AppData } from '../state/data';
import type { Scenario } from '../state/scenario';
import { sortRanked } from './rankOrder';
import { VerdictBadge } from './ReportCard';

interface Props {
  data: AppData;
  scn: Scenario;
  update: (patch: Partial<Scenario>) => void;
}

interface RankedSite { id: string; name: string; verdict: VerdictKind; reason: string; score: number }
interface Ranking { key: string; rows: RankedSite[]; unranked: number; failed: string[] }
interface Progress { phase: 'masks' | 'score'; done: number; total: number }

export function RankView({ data, scn, update }: Props) {
  const h_m = scn.rules.observer_height_m;
  const key = JSON.stringify([scn.start_s, scn.stay_s, scn.rules]);
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [progress, setProgress] = useState<Progress>({ phase: 'masks', done: 0, total: data.sites.length });
  const [error, setError] = useState<{ key: string; text: string } | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      // Resolve every curated site; region and miss-grid files load in parallel and are cached.
      let resolved = 0;
      setProgress({ phase: 'masks', done: 0, total: data.sites.length });
      const places: Resolved[] = await Promise.all(data.sites.map((s) => resolveForSite(data, s, h_m).then((p) => {
        resolved += 1;
        if (live) setProgress({ phase: 'masks', done: resolved, total: data.sites.length });
        return p;
      })));
      if (!live) return;
      const withTerrain = data.sites.map((site, i) => ({ site, place: places[i] })).filter((x) => x.place.terrain);
      // A site whose terrain file failed to load is labelled so by resolveForSite and is not ranked.
      const failed = data.sites.filter((_, i) => !places[i].terrain && /missing/i.test(places[i].horizonLabel)).map((s: Site) => s.name);
      let scored = 0;
      setProgress({ phase: 'score', done: 0, total: withTerrain.length });
      const answers = await Promise.all(withTerrain.map(({ place }) => data.engine.window({
        place: { lat_deg: place.lat_deg, lon_deg: place.lon_deg, h_m: place.h_m }, mask: place.mask,
        start_s: scn.start_s, end_s: scn.start_s + scn.stay_s, rules: scn.rules,
      }).then((a) => {
        scored += 1;
        if (live) setProgress({ phase: 'score', done: scored, total: withTerrain.length });
        return a;
      })));
      if (!live) return;
      const rows = withTerrain.map(({ site }, i) => ({
        id: site.id, name: site.name, verdict: answers[i].verdict.verdict, reason: answers[i].verdict.reason, score: answers[i].metrics.score,
      }));
      setRanking({ key, rows: sortRanked(rows), unranked: data.sites.length - withTerrain.length, failed });
    })().catch((e) => { if (live) setError({ key, text: String(e) }); });
    return () => { live = false; };
  }, [key]);

  const r = ranking && ranking.key === key ? ranking : null;
  const err = error && error.key === key ? error.text : null;
  const startText = formatUtc(data.eph.start_ms + scn.start_s * 1000);
  const days = Number((scn.stay_s / 86400).toFixed(2));
  const open = (id: string) => { update({ site_id: id, view: 'report', t_off_s: 0 }); window.scrollTo({ top: 0 }); };
  const counts = r ? (['go', 'marginal', 'no-go'] as VerdictKind[]).map((v) => r.rows.filter((x) => x.verdict === v).length) : [];

  return (
    <section class="card" aria-label="Which sites work on this date" data-testid="rank">
      <h3>Which sites work for a {days}-day stay starting {startText}?</h3>
      <p class="small muted" style={{ margin: '0 0 8px' }}>
        Every curated site with terrain horizon masks, scored with the current rules ({PRESET_LABELS[scn.preset]} preset, observer {scn.rules.observer_height_m} m).
        Sorted by verdict, then by score. Change the date, stay or rules above and the ranking follows.
      </p>
      {err && <p role="alert">The ranking failed: {err}</p>}
      {!r && !err && (
        <p role="status" data-testid="rank-progress">
          {progress.phase === 'masks'
            ? <>Loading horizon masks… {progress.done} of {progress.total} sites</>
            : <>Scoring {progress.total} sites… {formatPct(progress.total ? progress.done / progress.total : 0)}</>}
        </p>
      )}
      {r && r.rows.length === 0 && <p>No curated site in this data set has terrain horizon masks, so there is nothing to rank.</p>}
      {r && r.rows.length > 0 && (
        <>
          <p class="takeaway" style={{ margin: '0 0 8px' }} data-testid="rank-summary">
            {counts[0]} go, {counts[1]} marginal and {counts[2]} no-go of {r.rows.length} sites. Best: {r.rows[0].name}.
          </p>
          <ol class="rank-list" data-testid="rank-list" aria-label="Sites ranked for this date">
            {r.rows.map((x, i) => (
              <li key={x.id} class={`rank-row ${x.verdict}`} data-testid="rank-row" data-site={x.id} data-verdict={x.verdict}>
                <span class="rank-n" data-testid="rank-n">{i + 1}</span>
                <div class="rank-body">
                  <p style={{ margin: 0 }}>
                    <strong data-testid="rank-name">{x.name}</strong>{' '}<VerdictBadge v={x.verdict} small />{' '}
                    <span class="small muted">score {x.score.toFixed(0)}</span>
                  </p>
                  <p class="small" style={{ margin: 0 }} data-testid="rank-reason">{x.reason}</p>
                </div>
                <button type="button" aria-label={`Open the report card for ${x.name}`} onClick={() => open(x.id)}>Report card</button>
              </li>
            ))}
          </ol>
        </>
      )}
      {r && (
        <p class="small muted" style={{ margin: '8px 0 0' }}>
          {r.unranked} other curated sites have no terrain horizon masks in this data set and are not ranked; their smooth-horizon answers are on their own report cards.
          {r.failed.length > 0 && <> The terrain file for {r.failed.join(', ')} could not be loaded.</>}
        </p>
      )}
    </section>
  );
}
