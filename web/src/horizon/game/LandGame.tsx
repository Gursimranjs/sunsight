// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// "Land it yourself" (review note 009, M2): pick a landing point on a miss-test grid, watch the stay
// replay there, and read what the engine says. Every number comes from the engine's window and miss
// jobs on shipped data; nothing is stored and nothing is sent anywhere.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { MaskSet } from '../../data/sites';
import type { Site } from '../../data/types';
import type { MissAnswer, WindowAnswer } from '../../engine/compute';
import { local_frame, sample_at, site_vector } from '../../engine/light';
import { formatPct } from '../../format';
import type { AppData } from '../../state/data';
import type { Scenario } from '../../state/scenario';
import { MISS_RADII_M, missJob, nearestGridPoint, stepGridPoint } from '../../views/missGeometry';
import { Panorama } from '../../views/Panorama';
import { VerdictBadge } from '../../views/ReportCard';
import { Timeline } from '../../views/Timeline';
import { firstFailure, resultLine, type FirstFailure } from './firstFailure';
import {
  ATHENA_TARGET_ID, distanceFromTarget_m, distanceText, DROP_MS, GAME_POINT_PARAM, gameBrief, gameGridId, gamePointJob,
  gameShareLink, gameTargetIndex, gridRadius_m, MAX_TRIES, parseGamePoint, REPLAY_MS, REVEAL_RADIUS_M, revealDelay_ms,
} from './gameLogic';
import './game.css';

export interface LandGameProps {
  data: AppData;
  scn: Scenario;
  site: Site | null;
  update: (patch: Partial<Scenario>) => void;
  onShowMissMap?: () => void;
}

interface Try {
  i: number;
  answer: WindowAnswer;
  mask: Float64Array;
  failure: FirstFailure | null;
}

/** The landing being played: dropping, waiting for the engine, replaying, or done. */
interface Active { i: number; phase: 'drop' | 'compute' | 'replay' | 'done'; t_off_s: number }

const VB = 360, PAD = 14;
const NO_TRIES = 'No tries left. Show the whole ground to see every point.';

function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function Lander({ x, y, n, dropping }: { x: number; y: number; n: number; dropping: boolean }) {
  return (
    <g class={`hz-game-lander${dropping ? ' dropping' : ''}`} data-testid="game-lander">
      <path d={`M${x},${y - 18} l-7,12 h14 z`} fill="#FFFFFF" stroke="#000" stroke-width="1" />
      <line x1={x - 6} y1={y - 6} x2={x - 9} y2={y} stroke="#FFFFFF" stroke-width="2" />
      <line x1={x + 6} y1={y - 6} x2={x + 9} y2={y} stroke="#FFFFFF" stroke-width="2" />
      <text x={x + 10} y={y - 10} class="hz-game-try-n">{n}</text>
    </g>
  );
}

export function LandGame({ data, scn, site, update, onShowMissMap }: LandGameProps) {
  const gridId = gameGridId(site);
  const [set, setSet] = useState<MaskSet | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [reticle, setReticle] = useState<number | null>(null);
  const [tries, setTries] = useState<Try[]>([]);
  const [active, setActive] = useState<Active | null>(null);
  const [reveal, setReveal] = useState<{ state: 'running'; progress: number } | { state: 'done'; a: MissAnswer } | { state: 'failed'; error: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const seq = useRef(0);
  /** Bumped when a fresh game starts (new grid, date or rules): a reveal from the old game is dropped. */
  const gameEpoch = useRef(0);
  const sharedPointUsed = useRef(false);
  /**
   * The shared point (?game_pt=<id>), read on the first render: the app rewrites the address bar from
   * the scenario as soon as it is set, which drops game_pt long before the grid has loaded.
   */
  const sharedPt = useRef<string | null | undefined>(undefined);
  if (sharedPt.current === undefined) {
    sharedPt.current = typeof location !== 'undefined' ? new URLSearchParams(location.search).get(GAME_POINT_PARAM) : null;
  }
  const reticleRef = useRef<SVGGElement>(null);
  const shareLineRef = useRef<HTMLParagraphElement>(null);
  /** Set when focus must land on the reticle once the (new) grid is in, e.g. after "Try Athena's target". */
  /** The grid id whose load should take focus to the reticle ("Try Athena's target"), or null. */
  const focusReticle = useRef<string | null>(null);
  const showGroundRef = useRef<HTMLButtonElement>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setSet(null); setErr(null);
    // A switch to some other ground than the one asked for drops the pending focus move.
    if (focusReticle.current !== gridId) focusReticle.current = null;
    if (!gridId) return;
    let live = true;
    data.missGrid(gridId).then((s) => live && setSet(s)).catch((e) => { if (live) { focusReticle.current = null; setErr(String(e)); } });
    return () => { live = false; };
  }, [gridId]);

  const grid = set && (set.meta.id === undefined || set.meta.id === gridId) ? set : null;
  // A new grid, date, stay or rules starts a fresh game.
  const key = JSON.stringify([grid?.meta.id ?? null, scn.start_s, scn.stay_s, scn.rules]);
  useEffect(() => {
    seq.current += 1;
    gameEpoch.current += 1;
    setTries([]); setActive(null); setReveal(null); setCopied(false); setNotice('');
    setReticle(grid ? gameTargetIndex(grid) : null);
  }, [key]);
  useEffect(() => () => { seq.current += 1; gameEpoch.current += 1; }, []);

  const land = (i: number) => {
    if (!grid) return;
    if (tries.length >= MAX_TRIES) { setNotice(NO_TRIES); return; }
    if (active && active.phase !== 'done') return;
    setNotice('');
    const my = (seq.current += 1);
    const reduce = reducedMotion();
    setReticle(i);
    setCopied(false);
    setActive({ i, phase: 'drop', t_off_s: 0 });
    const job = gamePointJob(grid, i, scn.start_s, scn.start_s + scn.stay_s, scn.rules);
    const stay_s = scn.stay_s, start_s = scn.start_s, rules = scn.rules;
    setTimeout(() => {
      if (seq.current !== my) return;
      setActive({ i, phase: 'compute', t_off_s: 0 });
      data.engine.windowTimed(job).then(({ answer }) => {
        if (seq.current !== my) return;
        const t: Try = { i, answer, mask: job.mask as Float64Array, failure: firstFailure(answer.metrics, rules, start_s) };
        setTries((xs) => [...xs, t]);
        if (reduce) { setActive({ i, phase: 'done', t_off_s: stay_s }); return; }
        const t0 = performance.now();
        const step = () => {
          if (seq.current !== my) return;
          const f = Math.min(1, (performance.now() - t0) / REPLAY_MS);
          setActive({ i, phase: f >= 1 ? 'done' : 'replay', t_off_s: f * stay_s });
          if (f < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }).catch((e) => { if (seq.current === my) { setActive(null); setErr(String(e)); } });
    }, reduce ? 0 : DROP_MS);
  };

  // A shared link (?game_pt=<point id>) lands on that point once the grid is in.
  useEffect(() => {
    if (!grid || sharedPointUsed.current || typeof location === 'undefined') return;
    sharedPointUsed.current = true;
    const id = sharedPt.current;
    const i = id ? parseGamePoint(`?${GAME_POINT_PARAM}=${encodeURIComponent(id)}`, grid) : null;
    if (i !== null) land(i);
  }, [grid]);

  // Focus goes back to the reticle once a switched-to grid is in.
  useEffect(() => {
    if (grid && reticle !== null && focusReticle.current !== null && focusReticle.current === gridId && reticleRef.current) {
      focusReticle.current = null;
      reticleRef.current.focus();
    }
  });

  const current = tries.length ? tries[tries.length - 1] : null;
  const shownTry = current && active && current.i === active.i && active.phase !== 'drop' && active.phase !== 'compute' ? current : null;
  const t_off_s = active?.t_off_s ?? 0;
  const t_s = scn.start_s + t_off_s;
  const now = useMemo(() => {
    if (!shownTry || !grid || !data.hasRange(t_s, t_s)) return null;
    const p = grid.meta.points[shownTry.i];
    const site_km = site_vector(p.lat_deg, p.lon_deg, p.height_m + scn.rules.observer_height_m);
    return sample_at(data.table, t_s, site_km, local_frame(p.lat_deg, p.lon_deg), shownTry.mask, scn.rules);
  }, [shownTry, t_s, grid]);

  const showWhole = () => {
    if (!grid || reveal?.state === 'running' || reveal?.state === 'done') return;
    const my = gameEpoch.current;
    setReveal({ state: 'running', progress: 0 });
    data.engine.miss(missJob(grid, scn.start_s, scn.start_s + scn.stay_s, scn.rules), (f) => {
      if (gameEpoch.current === my) setReveal({ state: 'running', progress: f });
    }).then((a) => {
      if (gameEpoch.current !== my) return;
      setReveal({ state: 'done', a });
      // The button stays (aria-disabled, so it keeps focus). Focus moves to the share line, which says what
      // the reveal found, only if the user is still on that button (or focus fell to the page body).
      requestAnimationFrame(() => {
        const at = document.activeElement;
        if (at === showGroundRef.current || at === document.body || at === null) shareLineRef.current?.focus();
      });
    })
      .catch((e) => { if (gameEpoch.current === my) setReveal({ state: 'failed', error: String(e) }); });
  };

  const athena = data.sites.find((s) => s.id === ATHENA_TARGET_ID);
  const athenaButton = athena && site?.id !== ATHENA_TARGET_ID && (
    <button type="button" data-testid="game-athena" onClick={() => { focusReticle.current = gameGridId(athena) ?? null; update({ site_id: ATHENA_TARGET_ID }); }}>Try Athena's target</button>
  );
  const label = (
    <p class="hz-game-small" data-testid="game-robustness-label">
      A robustness share, not a landing probability: every grid point counts equally; guidance is not modelled.
    </p>
  );

  if (!gridId) {
    const withGrid = data.sites.filter((s) => gameGridId(s) && s.miss_target_id);
    return (
      <section class="hz-game" aria-label="Land it yourself" data-testid="land-game">
        <h2 class="hz-game-title">Land it yourself</h2>
        <p>The game needs a fine terrain grid round a landing target. Grids exist for:</p>
        <div class="hz-game-row">{withGrid.map((s) => <button key={s.id} type="button" onClick={() => update({ site_id: s.id })}>{s.name}</button>)}</div>
      </section>
    );
  }
  if (err) return <section class="hz-game" data-testid="land-game"><p role="alert">Could not run the game: {err}</p></section>;
  if (!grid || reticle === null) return <section class="hz-game" data-testid="land-game"><p>Loading the landing grid…</p></section>;

  const pts = grid.meta.points;
  const R = gridRadius_m(grid);
  const Rplot = Math.max(R, ...pts.map((p) => Math.hypot(p.east_m ?? 0, p.north_m ?? 0)));
  const ppm = (VB - 2 * PAD) / (2 * Rplot * 1.05);
  const X = (e: number) => VB / 2 + e * ppm, Y = (n: number) => VB / 2 - n * ppm;
  const spacing = grid.meta.spacing_m ?? 50;
  const dotR = Math.max(2, Math.min(7, spacing * ppm * 0.3));
  const targetI = gameTargetIndex(grid);
  const tp = pts[targetI];
  const revealed = reveal?.state === 'done' ? reveal.a : null;
  const busy = !!active && active.phase !== 'done';
  const out = tries.length >= MAX_TRIES;
  const startMs = data.eph.start_ms + scn.start_s * 1000;
  const brief = gameBrief(scn.preset, scn.stay_s, site?.name ?? grid.meta.name ?? gridId, startMs, R);
  const rp = pts[reticle];

  const toMetres = (ev: MouseEvent) => {
    const r = (ev.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * VB, py = ((ev.clientY - r.top) / r.height) * VB;
    return { e: (px - VB / 2) / ppm, n: (VB / 2 - py) / ppm };
  };
  const onKey = (ev: KeyboardEvent) => {
    const dirs: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); land(reticle); return; }
    const d = dirs[ev.key];
    if (!d) return;
    ev.preventDefault();
    // While a landing plays, or with no tries left, the reticle stays put (it is aria-disabled).
    if (busy) return;
    if (out) { setNotice(NO_TRIES); return; }
    setReticle(stepGridPoint(pts, reticle, d[0], d[1]));
  };
  const where = (i: number) => {
    const p = pts[i];
    const e = (p.east_m ?? 0) - (tp.east_m ?? 0), n = (p.north_m ?? 0) - (tp.north_m ?? 0);
    if (Math.hypot(e, n) < 0.5) return 'on the target';
    return `${Math.abs(e).toFixed(0)} m ${e >= 0 ? 'east' : 'west'}, ${Math.abs(n).toFixed(0)} m ${n >= 0 ? 'north' : 'south'} of the target`;
  };
  const done = current && active?.phase === 'done' && active.i === current.i ? current : null;
  const share250 = revealed ? revealed.shares[MISS_RADII_M.indexOf(REVEAL_RADIUS_M)] : NaN;
  const link = done && typeof location !== 'undefined' ? gameShareLink(location.href, pts[done.i].id) : '';
  const nHold = revealed ? revealed.passes.filter(Boolean).length : 0;
  const nFail = revealed ? revealed.passes.length - nHold : 0;
  const groundAt = (i: number) => (revealed ? (revealed.passes[i] ? ', holds' : ', fails') : '');
  const statusText = busy
    ? (active!.phase === 'drop' ? 'Landing…' : active!.phase === 'compute' ? 'Computing the stay at this spot…' : 'Playing the stay…')
    : done ? `${resultLine(done.failure, scn.stay_s)}. Landed ${distanceText(distanceFromTarget_m(grid, done.i))}.` : '';
  const delay_ms = (p: { east_m?: number; north_m?: number }) =>
    revealDelay_ms((p.east_m ?? 0) - (tp.east_m ?? 0), (p.north_m ?? 0) - (tp.north_m ?? 0), Rplot);

  return (
    <section class="hz-game" aria-label="Land it yourself" data-testid="land-game">
      <h2 class="hz-game-title">Land it yourself</h2>
      <p class="hz-game-brief" data-testid="game-brief">{brief}</p>
      <p class="hz-game-small" data-testid="game-tries">
        {out ? 'No tries left.' : `Try ${tries.length + 1} of ${MAX_TRIES}.`} Click the map, or move the reticle with the arrow keys and press Enter.
      </p>
      {/* One live region, always mounted: the landing status, then the result and the distance. */}
      <p class="hz-game-small hz-game-live" role="status" aria-live="polite" data-testid="game-live">{notice || statusText}</p>
      <div class="hz-game-grid">
        <div class="hz-game-map-wrap">
          <svg viewBox={`0 0 ${VB} ${VB}`} class="hz-game-map" data-testid="game-map" role="group"
            aria-label={revealed ? `Map of ${pts.length} landing points. ${nHold} hold, ${nFail} fail.` : `Map of ${pts.length} landing points; pass or fail shows after three tries.`}
            onPointerMove={(ev) => { if (!busy && !out) { const m = toMetres(ev); setReticle(nearestGridPoint(pts, m.e, m.n)); } }}
            onClick={(ev) => { const m = toMetres(ev); land(nearestGridPoint(pts, m.e, m.n)); }}>
            <rect x="0" y="0" width={VB} height={VB} fill="var(--hz-sky, #000000)" />
            <circle cx={X(tp.east_m ?? 0)} cy={Y(tp.north_m ?? 0)} r={R * ppm} fill="none" stroke="#8E8A82" stroke-dasharray="4 4" />
            <circle cx={X(tp.east_m ?? 0)} cy={Y(tp.north_m ?? 0)} r={REVEAL_RADIUS_M * ppm} fill="none" stroke="#8E8A82" stroke-dasharray="2 4" />
            {pts.map((p, i) => {
              const x = X(p.east_m ?? 0), y = Y(p.north_m ?? 0);
              if (!revealed) return <circle key={p.id} cx={x} cy={y} r={1.6} fill="#8E8A82" />;
              const v = revealed.verdicts[i];
              return revealed.passes[i]
                ? <circle key={p.id} cx={x} cy={y} r={dotR} fill="var(--hz-go, #1F7A4D)" data-testid="game-map-point" data-point-id={p.id} data-verdict={v} class="hz-game-reveal" style={{ animationDelay: `${delay_ms(p)}ms` }} />
                : <g key={p.id} stroke="var(--hz-nogo, #B4421E)" stroke-width="2.5" data-testid="game-map-point" data-point-id={p.id} data-verdict={v} class="hz-game-reveal" style={{ animationDelay: `${delay_ms(p)}ms` }}>
                  <line x1={x - dotR * 0.8} y1={y - dotR * 0.8} x2={x + dotR * 0.8} y2={y + dotR * 0.8} />
                  <line x1={x - dotR * 0.8} y1={y + dotR * 0.8} x2={x + dotR * 0.8} y2={y - dotR * 0.8} />
                </g>;
            })}
            <g stroke="#ffffff" stroke-width="2"><line x1={X(tp.east_m ?? 0) - 8} x2={X(tp.east_m ?? 0) + 8} y1={Y(tp.north_m ?? 0)} y2={Y(tp.north_m ?? 0)} /><line x1={X(tp.east_m ?? 0)} x2={X(tp.east_m ?? 0)} y1={Y(tp.north_m ?? 0) - 8} y2={Y(tp.north_m ?? 0) + 8} /></g>
            {tries.map((t, k) => <Lander key={k} x={X(pts[t.i].east_m ?? 0)} y={Y(pts[t.i].north_m ?? 0)} n={k + 1} dropping={false} />)}
            {active && (active.phase === 'drop' || active.phase === 'compute') && (
              <Lander x={X(pts[active.i].east_m ?? 0)} y={Y(pts[active.i].north_m ?? 0)} n={tries.length + 1} dropping />
            )}
            <g tabindex={0} role="slider" class="hz-game-reticle" data-testid="game-reticle" aria-label="Landing reticle" ref={reticleRef}
              aria-valuemin={0} aria-valuemax={pts.length - 1} aria-valuenow={reticle} aria-valuetext={`${where(reticle)}, grid point ${rp.id}${groundAt(reticle)}`}
              aria-disabled={busy || out} onKeyDown={onKey}>
              <circle cx={X(rp.east_m ?? 0)} cy={Y(rp.north_m ?? 0)} r={9} fill="none" stroke="#ffffff" stroke-width="2" />
              <circle cx={X(rp.east_m ?? 0)} cy={Y(rp.north_m ?? 0)} r={2.5} fill="#ffffff" />
              {/* Focus cue: a wide Sun halo outside the ring, shown only on keyboard focus (game.css). */}
              <circle class="hz-game-halo" cx={X(rp.east_m ?? 0)} cy={Y(rp.north_m ?? 0)} r={14} fill="none" stroke="var(--hz-sun, #FFD27A)" stroke-width="3" />
            </g>
          </svg>
          <p class="hz-game-small" data-testid="game-reticle-text">Reticle: grid point {rp.id}, {where(reticle)}{groundAt(reticle)}. Dashed rings: {REVEAL_RADIUS_M} m and {Math.round(R)} m.</p>
          {revealed && (
            <ul class="hz-game-legend" data-testid="game-legend">
              <li><svg aria-hidden="true" width="14" height="14"><circle cx="7" cy="7" r="6" fill="var(--hz-go, #1F7A4D)" /></svg> Holds: every rule met (go or marginal)</li>
              <li><svg aria-hidden="true" width="14" height="14"><g stroke="var(--hz-nogo, #B4421E)" stroke-width="2.5"><line x1="2" y1="2" x2="12" y2="12" /><line x1="2" y1="12" x2="12" y2="2" /></g></svg> Fails a rule (no-go)</li>
            </ul>
          )}
        </div>
        <div class="hz-game-side">
          {busy && <p data-testid="game-status">{statusText}</p>}
          {done && (
            <div class="hz-game-result" data-testid="game-result" data-verdict={done.answer.verdict.verdict} data-point-id={pts[done.i].id}>
              <p class="hz-game-call"><VerdictBadge v={done.answer.verdict.verdict} small /> <span data-testid="game-result-line">{resultLine(done.failure, scn.stay_s)}</span></p>
              <p data-testid="game-distance">Landed {distanceText(distanceFromTarget_m(grid, done.i))} (grid point {pts[done.i].id}).</p>
              <p class="hz-game-small">{done.answer.verdict.reason}</p>
              <div class="hz-game-row">
                <input class="hz-game-link" readOnly value={link} aria-label="Link to this landing" data-testid="game-share-link" />
                <button type="button" onClick={() => { navigator.clipboard?.writeText(link).then(() => setCopied(true), () => setCopied(false)); }}>{copied ? 'Copied' : 'Copy link'}</button>
              </div>
            </div>
          )}
          {tries.length > 0 && (
            <ol class="hz-game-tries" data-testid="game-try-list">
              {tries.map((t, k) => (
                <li key={k}><VerdictBadge v={t.answer.verdict.verdict} small /> {resultLine(t.failure, scn.stay_s)}, {distanceText(distanceFromTarget_m(grid, t.i))}</li>
              ))}
            </ol>
          )}
          {out && !busy && (
            <button type="button" data-testid="game-show-ground" ref={showGroundRef} aria-disabled={reveal?.state === 'running' || !!revealed} onClick={showWhole}>
              {reveal?.state === 'running' ? `Scoring ${pts.length} landing points… ${formatPct(reveal.progress)}` : revealed ? 'Whole ground shown' : 'Show the whole ground'}
            </button>
          )}
          {reveal?.state === 'failed' && <p role="alert">Could not score the ground: {reveal.error}</p>}
          {revealed && (
            <p class="hz-game-call" data-testid="game-share-line" tabIndex={-1} ref={shareLineRef}>Within {REVEAL_RADIUS_M} m, {formatPct(share250)} of the ground holds.</p>
          )}
          {label}
          <div class="hz-game-row">
            {athenaButton}
            {onShowMissMap && <button type="button" onClick={onShowMissMap}>See the Miss map</button>}
          </div>
        </div>
      </div>
      {shownTry && now && (
        <div class="hz-game-replay" data-testid="game-replay">
          <Panorama series={shownTry.answer.series} now={now} mask={shownTry.mask} horizonLabel={`Terrain horizon from the miss-test grid, point ${pts[shownTry.i].id}`} />
          <Timeline series={shownTry.answer.series} metrics={shownTry.answer.metrics} rules={scn.rules} start_s={shownTry.answer.series.t_s[0]}
            stay_s={shownTry.answer.series.t_s[shownTry.answer.series.t_s.length - 1] - shownTry.answer.series.t_s[0]} t_off_s={t_off_s}
            onTime={(t) => { seq.current += 1; setActive({ i: shownTry.i, phase: 'done', t_off_s: t }); }} title="Sunlight and Earth contact at your landing spot" compact />
        </div>
      )}
    </section>
  );
}
