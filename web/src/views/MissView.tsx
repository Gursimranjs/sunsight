// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Miss test: if the lander comes down anywhere near the target, how much of that ground still works?
import { LOADING_TABLE_TEXT, TableStatus, useTableRange } from './useTableRange';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { MaskSet } from '../data/sites';
import type { Site } from '../data/types';
import type { MissAnswer } from '../engine/compute';
import { formatPct, formatUtc } from '../format';
import type { AppData } from '../state/data';
import type { VerdictKind } from '../engine/light';
import type { Scenario } from '../state/scenario';
import {
  bestDateJob, bestDayIndex, MISS_RADII_M, MISS_TOLERANT_SHARE, missFailLine, missJob, missTargetIndex, nearestGridPoint, stepGridPoint, missSig, type MissShare,
} from './missGeometry';
import { VerdictBadge } from './ReportCard';
import { Term } from './Term';
import { useWidth } from './useWidth';

interface Props {
  data: AppData;
  site: Site | null;
  scn: Scenario;
  onSite: (id: string) => void;
  /**
   * Scenario update, used by "Jump to this site's best date" to set start_s and t_off_s. Without it
   * (an embedded map whose site is not the scenario's site) the button is not shown.
   */
  update?: (patch: Partial<Scenario>) => void;
  /**
   * Called once the miss test has nothing more to load for the first screen: its answer is shown, it failed,
   * or the site has no grid. The App starts the background fetch of the other table years only after this.
   */
  onSettled?: () => void;
  /** Reports the current share for the selected radius to the verdict card (note 008). */
  onShare?: (m: MissShare | null) => void;
}

/**
 * State of one best-date search. key: the (site, grid, point, stay, rules) it was run for; seq: which
 * click started it; from_start_s: the scenario start when it was clicked.
 */
type BestSearchBase = { key: string; seq: number; from_start_s: number };
type BestSearch =
  | (BestSearchBase & { state: 'running'; progress: number; n_days: number; loading: boolean })
  | (BestSearchBase & { state: 'done'; start_s: number; verdict: VerdictKind; first_s: number; last_s: number })
  | (BestSearchBase & { state: 'failed'; error: string });

function Cross({ x, y, r, col }: { x: number; y: number; r: number; col: string }) {
  return (
    <g stroke={col} stroke-width="3" stroke-linecap="round">
      <line x1={x - r} y1={y - r} x2={x + r} y2={y + r} />
      <line x1={x - r} y1={y + r} x2={x + r} y2={y - r} />
    </g>
  );
}

export function MissView({ data, site, scn, onSite, update, onSettled, onShare }: Props) {
  const [set, setSet] = useState<MaskSet | null>(null);
  const [answer, setAnswer] = useState<{ key: string; a: MissAnswer } | null>(null);
  const [progress, setProgress] = useState(0);
  /** The grid file could not be loaded (per target). */
  const [err, setErr] = useState<string | null>(null);
  /** The miss job failed for `key` only: another date, stay or rules (or the table year arriving) tries again. */
  const [jobErr, setJobErr] = useState<{ key: string; text: string } | null>(null);
  const [pin, setPin] = useState<number | null>(null);
  const [radius, setRadius] = useState(250);
  const [ref, W] = useWidth<HTMLDivElement>();
  const dragging = useRef(false);
  const [best, setBest] = useState<BestSearch | null>(null);
  // What the view shows now, read when a best-date search finishes: it may only set the start date if
  // the view still shows the same site, grid, point, stay and rules, the start has not changed since the
  // click, no newer click started another search, and the view is still mounted.
  const liveKey = useRef('');
  const startNow = useRef(scn.start_s);
  const searchSeq = useRef(0);
  const statusRef = useRef<HTMLDivElement>(null);
  useEffect(() => () => { liveKey.current = ''; searchSeq.current += 1; }, []);
  // A site with its own grid uses it; a site that lies inside another target's grid (miss_grid_id, e.g. Athena's
  // resting place inside the Athena-target grid) uses that grid, with the pin starting at the site's own point.
  const ownGrid = site?.miss_target_id ?? null;
  const targetId = ownGrid ?? (typeof site?.miss_grid_id === 'string' ? site.miss_grid_id : null);

  useEffect(() => {
    setSet(null); setErr(null); setPin(null);
    if (!targetId) return;
    let live = true;
    data.missGrid(targetId).then((s) => live && setSet(s)).catch((e) => live && setErr(String(e)));
    return () => { live = false; };
  }, [targetId]);

  // Right after a site change the first render still holds the previous site's grid: treat it as loading.
  const grid = set && (set.meta.id === undefined || set.meta.id === targetId) ? set : null;
  // The point the best-date search scores: the site's own point in a borrowed grid, else the grid centre.
  const sitePointI = grid && !ownGrid && typeof site?.miss_point_id === 'string' ? grid.meta.points.findIndex((p) => p.id === site.miss_point_id) : -1;
  const searchI = grid ? missTargetIndex(grid, sitePointI) : -1;
  const bestKey = JSON.stringify([site?.id ?? null, targetId, grid?.meta.id ?? null, searchI, scn.stay_s, scn.rules]);
  liveKey.current = bestKey;
  startNow.current = scn.start_s;

  const table = useTableRange(data, scn.start_s, scn.start_s + scn.stay_s);
  const key = set ? JSON.stringify([set.meta.id, scn.start_s, scn.stay_s, scn.rules, table.epoch]) : '';
  useEffect(() => {
    if (!set) return;
    let live = true;
    setProgress(0);
    data.engine.miss(missJob(set, scn.start_s, scn.start_s + scn.stay_s, scn.rules), (f) => live && setProgress(f))
      .then((a) => live && setAnswer({ key, a }))
      .catch((e) => live && setJobErr({ key, text: String(e) }));
    return () => { live = false; };
  }, [key]);
  const jobError = jobErr && jobErr.key === key ? jobErr.text : null;
  const answered = !!(answer && answer.key === key);
  const settled = !targetId || !!err || answered || !!jobError || table.state === 'error';
  useEffect(() => { if (settled) onSettled?.(); }, [settled]);
  const sig = missSig(site?.id ?? null, scn.start_s, scn.stay_s, scn.rules);
  const shareNow = answer && answer.key === key ? answer.a.shares[MISS_RADII_M.indexOf(radius)] : NaN;
  useEffect(() => {
    if (!onShare) return;
    onShare(Number.isFinite(shareNow) ? { sig, share: shareNow, radius_m: radius } : null);
  }, [sig, shareNow, radius]);

  if (!targetId) {
    const withGrid = data.sites.filter((s) => s.miss_target_id);
    return (
      <section class="card">
        <h3>No miss-test grid for this site</h3>
        <p>The miss test needs a fine terrain grid around a named target. {withGrid.length ? 'Grids exist for:' : 'No grids are loaded yet.'}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {withGrid.map((s) => <button key={s.id} type="button" onClick={() => onSite(s.id)}>{s.name}</button>)}
        </div>
      </section>
    );
  }
  if (err) return <section class="card"><p role="alert">Could not run the miss test: {err}</p></section>;
  if (!grid) return <section class="card"><p>Loading the miss-test grid…</p></section>;

  const pts = grid.meta.points;
  const a = answer && answer.key === key ? answer.a : null;
  const R = Math.max(grid.meta.radius_m ?? 500, ...pts.map((p) => Math.hypot(p.east_m ?? 0, p.north_m ?? 0)));
  const size = Math.min(W, 560);
  const pad = 52;
  const plot = size - pad - 16;
  const ppm = plot / (2 * R * 1.08);
  const cx = pad + plot / 2, cy = 12 + plot / 2;
  const X = (e: number) => cx + e * ppm, Y = (n: number) => cy - n * ppm;
  const spacing = grid.meta.spacing_m ?? 50;
  const dotR = Math.max(3, Math.min(8, spacing * ppm * 0.32));
  const ri = MISS_RADII_M.indexOf(radius);
  const share = a ? a.shares[ri] : NaN;
  const tolerant = share >= MISS_TOLERANT_SHARE;
  const pinI = pin ?? (sitePointI >= 0 ? sitePointI : nearestGridPoint(pts, 0, 0));
  // The fail lines are judged at the grid centre, the point the share circles and "+ Target" are drawn around.
  const centreI = missTargetIndex(grid, -1);
  const failLine = a ? missFailLine(a, centreI, sitePointI) : null;
  const searchWhat = searchI !== centreI ? "this site's point" : 'the target';
  const search = best && best.key === bestKey ? best : null;
  const running = search?.state === 'running' && search.from_start_s === scn.start_s ? search : null;
  const failed = search?.state === 'failed' && search.from_start_s === scn.start_s ? search : null;
  // The result note holds only while the start is still the date the search set.
  const found = search?.state === 'done' && search.start_s === scn.start_s ? search : null;
  const jumpToBest = (ev: MouseEvent) => {
    const btn = ev.currentTarget as HTMLElement | null;
    const seq = (searchSeq.current += 1);
    const k0 = bestKey, s0 = scn.start_s;
    const base = { key: k0, seq, from_start_s: s0 };
    const noDays = 'no start date fits in the table for this stay';
    const job = bestDateJob(grid, searchI, scn.stay_s, scn.rules, data.eph.meta, data.eph.start_ms);
    if (!job.day_starts_s.length) { setBest({ ...base, state: 'failed', error: noDays }); return; }
    const live = () => searchSeq.current === seq && liveKey.current === k0 && startNow.current === s0;
    // The search spans every year: load the whole range first (shared with the background prefetch).
    const days = job.day_starts_s;
    const first_s = days[0], last_s = days[days.length - 1] + job.stay_s;
    setBest({ ...base, state: 'running', progress: 0, n_days: days.length, loading: !data.hasRange(first_s, last_s) });
    data.ensureRange(first_s, last_s).then(() => {
      if (live()) setBest((b) => (b && b.seq === seq && b.state === 'running' ? { ...b, loading: false } : b));
      return data.engine.calendar(job, (f) => {
        if (live()) setBest((b) => (b && b.seq === seq && b.state === 'running' ? { ...b, progress: f } : b));
      });
    }).then((ans) => {
      if (!live()) return;
      const cells = ans.cells[0];
      const k = bestDayIndex(cells);
      if (k < 0) { setBest({ ...base, state: 'failed', error: noDays }); return; }
      const start_s = job.day_starts_s[k];
      // The jump re-renders the miss test and removes the button: keep keyboard focus on the result instead.
      const focusNote = typeof document !== 'undefined' && (document.activeElement === btn || document.activeElement === document.body || !document.activeElement);
      setBest({ ...base, state: 'done', start_s, verdict: cells[k].verdict, first_s: job.day_starts_s[0], last_s: job.day_starts_s[job.day_starts_s.length - 1] });
      update?.({ start_s, t_off_s: 0 });
      if (focusNote) statusRef.current?.focus();
    }).catch((e) => { if (live()) setBest({ ...base, state: 'failed', error: String(e) }); });
  };
  const year = (s: number) => formatUtc(data.eph.start_ms + s * 1000).slice(0, 4);
  const bestBox = update && (
    <div data-testid="miss-best-date">
      <button type="button" data-testid="miss-best-button" disabled={!!running || !!found} onClick={jumpToBest}>Jump to this site's best date</button>
    </div>
  );
  // Always mounted (while the view can jump), so screen readers announce what is put in it.
  const bestStatus = update && (
    <div ref={statusRef} role="status" aria-live="polite" tabIndex={-1} class="small" data-testid="miss-best-status" style={{ margin: '4px 0 0' }}>
      {running && (
        <p data-testid="miss-best-progress" style={{ margin: 0 }}>
          {running.loading
            ? LOADING_TABLE_TEXT
            : <>Scoring {searchWhat} for {running.n_days.toLocaleString('en-US')} start dates… <span aria-hidden="true">{formatPct(running.progress)}</span></>}
        </p>
      )}
      {failed && <p style={{ margin: 0 }}>Could not search for the best date: {failed.error}</p>}
      {found && (
        <p data-testid="miss-best-note" style={{ margin: 0 }}>
          {found.verdict === 'no-go'
            ? <>No start date from {year(found.first_s)} to {year(found.last_s)} passes at {searchWhat} with these rules; the start was set to its highest-scoring date, {formatUtc(data.eph.start_ms + found.start_s * 1000)}.</>
            : <>Best start date for {searchWhat} from {year(found.first_s)} to {year(found.last_s)} with these rules: {formatUtc(data.eph.start_ms + found.start_s * 1000)} (best verdict, then best score, earliest on ties).</>}
        </p>
      )}
    </div>
  );
  const pinP = pts[pinI];
  const ticks = [-500, -250, 0, 250, 500].filter((t) => Math.abs(t) <= R * 1.05);

  const toMetres = (ev: PointerEvent) => {
    const svg = (ev.currentTarget as SVGSVGElement);
    const r = svg.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * size, py = ((ev.clientY - r.top) / r.height) * (plot + 12 + 44);
    return { e: (px - cx) / ppm, n: (cy - py) / ppm };
  };
  const onDown = (ev: PointerEvent) => {
    dragging.current = true;
    (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId);
    const m = toMetres(ev); setPin(nearestGridPoint(pts, m.e, m.n));
  };
  const onMove = (ev: PointerEvent) => {
    if (!dragging.current) return;
    const m = toMetres(ev); setPin(nearestGridPoint(pts, m.e, m.n));
  };
  const onKey = (ev: KeyboardEvent) => {
    const dirs: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    const d = dirs[ev.key];
    if (!d) return;
    ev.preventDefault();
    setPin(stepGridPoint(pts, pinI, d[0], d[1]));
  };
  const H = plot + 12 + 44;
  const where = (p: typeof pinP) => {
    const e = p.east_m ?? 0, n = p.north_m ?? 0;
    if (e === 0 && n === 0) return 'on the target';
    return `${Math.abs(e).toFixed(0)} m ${e >= 0 ? 'east' : 'west'}, ${Math.abs(n).toFixed(0)} m ${n >= 0 ? 'north' : 'south'} of the target`;
  };

  return (
    <section class="card" aria-label="Miss test">
      {!ownGrid && (
        <p class="small" data-testid="miss-borrowed-grid">
          This site lies inside the miss-test grid around <strong>{grid.meta.name ?? targetId}</strong>. The shares below are for landing
          around that target; the pin starts at the grid point nearest this site
          {typeof site?.miss_point_offset_m === 'number' ? ` (${Math.round(site.miss_point_offset_m)} m from the cited coordinates)` : ''}.
        </p>
      )}
      <div class={`verdict ${a ? (tolerant ? 'go' : 'no-go') : ''}`} style={{ display: 'block', borderLeftWidth: 8, borderLeftStyle: 'solid', paddingLeft: 10, marginBottom: 10 }}>
        <h3 style={{ margin: 0 }} data-testid="miss-headline">
          {a ? <VerdictBadge v={tolerant ? 'go' : 'no-go'} small label={tolerant ? 'MISS-TOLERANT' : 'NOT MISS-TOLERANT'} /> : null}{' '}
          {a ? <>Land within {radius} m and {formatPct(share)} of the ground still meets the rules</>
            : table.state !== 'ok' ? <TableStatus tr={table} />
            : jobError ? <span role="alert">Could not run the miss test: {jobError}</span>
            : <>Testing {pts.length} landing points… {formatPct(progress)}</>}
        </h3>
        <p style={{ margin: '4px 0 0' }}>
          {a ? (tolerant ? `That is at least ${formatPct(MISS_TOLERANT_SHARE)}, so this date is miss-tolerant.` : `Below the ${formatPct(MISS_TOLERANT_SHARE)} needed for a miss-tolerant date.`) : ' '}{' '}
          <Term tip="miss">What is this?</Term>
        </p>
      </div>
      <label class="field" style={{ display: 'inline-flex', marginBottom: 8 }}>
        <span>Miss radius</span>
        <select value={radius} onChange={(e) => setRadius(Number((e.target as HTMLSelectElement).value))}>
          {MISS_RADII_M.map((r) => <option key={r} value={r}>{r} m{r === 250 ? ' (Athena’s reported miss)' : ''}</option>)}
        </select>
      </label>

      <h3 class="chart-title">Pass/fail map around the target</h3>
      <div ref={ref}>
        <svg width={size} height={H} viewBox={`0 0 ${size} ${H}`} data-testid="miss-map" role="group"
          aria-label={a ? `Map of ${pts.length} landing points. ${a.passes.filter(Boolean).length} pass, ${a.passes.filter((x) => !x).length} fail.` : 'Map of landing points, computing.'}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => (dragging.current = false)} style={{ touchAction: 'none', cursor: 'pointer', height: 'auto' }}>
          <rect x={pad} y={12} width={plot} height={plot} fill="#05070b" />
          <g class="axis">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={X(t)} x2={X(t)} y1={12 + plot} y2={12 + plot + 5} />
                <text x={X(t)} y={12 + plot + 20} text-anchor="middle">{t}</text>
                <line x1={pad - 5} x2={pad} y1={Y(t)} y2={Y(t)} />
                <text x={pad - 8} y={Y(t) + 5} text-anchor="end">{t}</text>
              </g>
            ))}
            <text x={pad + plot / 2} y={H - 4} text-anchor="middle" style={{ fill: 'var(--muted)' }}>East of target (m)</text>
            <text transform={`translate(12 ${12 + plot / 2}) rotate(-90)`} text-anchor="middle" style={{ fill: 'var(--muted)' }}>North of target (m)</text>
          </g>
          {MISS_RADII_M.map((r) => (
            <g key={r}>
              <circle cx={cx} cy={cy} r={r * ppm} fill="none" stroke={r === radius ? 'var(--fg)' : 'var(--muted)'} stroke-width={r === radius ? 2 : 1} stroke-dasharray={r === radius ? undefined : '4 4'} />
              <text x={cx + r * ppm * 0.707 + 3} y={cy - r * ppm * 0.707 - 3} style={{ fill: r === radius ? 'var(--fg)' : 'var(--muted)' }}>{r} m</text>
            </g>
          ))}
          {pts.map((p, i) => {
            const x = X(p.east_m ?? 0), y = Y(p.north_m ?? 0);
            if (!a) return <circle key={p.id} cx={x} cy={y} r={2} fill="var(--muted)" />;
            return a.passes[i]
              ? <circle key={p.id} cx={x} cy={y} r={dotR} fill="var(--go)" />
              : <Cross key={p.id} x={x} y={y} r={dotR * 0.8} col="var(--nogo)" />;
          })}
          <g stroke="var(--fg)" stroke-width="2"><line x1={cx - 9} x2={cx + 9} y1={cy} y2={cy} /><line x1={cx} x2={cx} y1={cy - 9} y2={cy + 9} /></g>
          <g tabindex={0} role="slider" aria-valuemin={0} aria-valuemax={pts.length - 1} aria-valuenow={pinI} aria-label="Landing pin" aria-valuetext={where(pinP)} onKeyDown={onKey} data-testid="miss-pin" class="pin">
            <circle cx={X(pinP.east_m ?? 0)} cy={Y(pinP.north_m ?? 0)} r={dotR + 6} fill="none" stroke="#fff" stroke-width="3" />
            <path d={`M${X(pinP.east_m ?? 0)},${Y(pinP.north_m ?? 0) - dotR - 6} l-7,-16 a8,8 0 1,1 14,0 z`} fill="#fff" stroke="#000" />
          </g>
        </svg>
      </div>
      <ul class="legend">
        <li><svg aria-hidden="true" width="14" height="14" style={{ display: 'inline', verticalAlign: '-2px' }}><circle cx="7" cy="7" r="6" fill="var(--go)" /></svg> Passes every rule (go or marginal)</li>
        <li><svg aria-hidden="true" width="14" height="14" style={{ display: 'inline', verticalAlign: '-2px' }}><g stroke="var(--nogo)" stroke-width="3"><line x1="2" y1="2" x2="12" y2="12" /><line x1="2" y1="12" x2="12" y2="2" /></g></svg> Fails a rule (no-go)</li>
        <li>+ Target. Drag the white pin, or focus it and use the arrow keys.</li>
      </ul>
      {a && (
        <p class="takeaway" data-testid="miss-pin-verdict">
          <strong>Landing pin {where(pinP)}:</strong> <VerdictBadge v={a.verdicts[pinI]} small /> {a.reasons[pinI]}
        </p>
      )}

      {failLine === 'all' && (
        <div class="takeaway" data-testid="miss-target-fails" style={{ marginTop: 10 }}>
          <p style={{ margin: '0 0 6px' }}>The target itself fails on this date, so every miss fails too.</p>
          {bestBox}
        </div>
      )}
      {failLine === 'some' && (
        <div class="small" data-testid="miss-target-fails-some" style={{ marginTop: 10 }}>
          <p style={{ margin: '0 0 6px' }}>The target itself fails on this date; some landing points near it pass.</p>
          {bestBox}
        </div>
      )}
      {failLine === 'site' && (
        <div class="small" data-testid="miss-site-point-fails" style={{ marginTop: 10 }}>
          <p style={{ margin: '0 0 6px' }}>This site's point fails on this date; the target at the centre of the grid passes.</p>
          {bestBox}
        </div>
      )}
      {bestStatus}
      {a && failLine !== 'all' && (
        <div class="scroll-x" style={{ marginTop: 10 }} tabIndex={0} role="region" aria-label="Shares by miss radius (scrolls sideways)">
          <table data-testid="miss-shares">
            <caption class="small muted" style={{ textAlign: 'left' }}>Share of landing points that meet the rules, by miss radius</caption>
            <thead><tr><th>Within</th><th>Points</th><th>Pass</th><th>Share</th><th>Miss-tolerant (≥{formatPct(MISS_TOLERANT_SHARE)})</th></tr></thead>
            <tbody>
              {MISS_RADII_M.map((r, k) => {
                const inside = pts.map((p) => Math.hypot(p.east_m ?? 0, p.north_m ?? 0) <= r + 1e-9);
                const n = inside.filter(Boolean).length, ok = inside.filter((x, i) => x && a.passes[i]).length;
                return (
                  <tr key={r}>
                    <td>{r} m</td><td>{n}</td><td>{ok}</td><td>{formatPct(a.shares[k], 1)}</td>
                    <td>{a.shares[k] >= MISS_TOLERANT_SHARE ? '✓ yes' : '✕ no'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p class="small muted">A robustness share, not a landing probability: every point in the circle counts equally and the lander's guidance is not modelled. Grid spacing {spacing} m; each point has its own terrain horizon.</p>
    </section>
  );
}
