// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Miss test: if the lander comes down anywhere near the target, how much of that ground still works?
import { useEffect, useRef, useState } from 'preact/hooks';
import type { MaskSet } from '../data/sites';
import type { Site } from '../data/types';
import type { MissAnswer } from '../engine/compute';
import { formatPct } from '../format';
import type { AppData } from '../state/data';
import type { Scenario } from '../state/scenario';
import { MISS_RADII_M, MISS_TOLERANT_SHARE, missJob, nearestGridPoint, stepGridPoint } from './missGeometry';
import { VerdictBadge } from './ReportCard';
import { Term } from './Term';
import { useWidth } from './useWidth';

interface Props {
  data: AppData;
  site: Site | null;
  scn: Scenario;
  onSite: (id: string) => void;
}

function Cross({ x, y, r, col }: { x: number; y: number; r: number; col: string }) {
  return (
    <g stroke={col} stroke-width="3" stroke-linecap="round">
      <line x1={x - r} y1={y - r} x2={x + r} y2={y + r} />
      <line x1={x - r} y1={y + r} x2={x + r} y2={y - r} />
    </g>
  );
}

export function MissView({ data, site, scn, onSite }: Props) {
  const [set, setSet] = useState<MaskSet | null>(null);
  const [answer, setAnswer] = useState<{ key: string; a: MissAnswer } | null>(null);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [pin, setPin] = useState<number | null>(null);
  const [radius, setRadius] = useState(250);
  const [ref, W] = useWidth<HTMLDivElement>();
  const dragging = useRef(false);
  const targetId = site?.miss_target_id ?? null;

  useEffect(() => {
    setSet(null); setErr(null); setPin(null);
    if (!targetId) return;
    let live = true;
    data.missGrid(targetId).then((s) => live && setSet(s)).catch((e) => live && setErr(String(e)));
    return () => { live = false; };
  }, [targetId]);

  const key = set ? JSON.stringify([set.meta.id, scn.start_s, scn.stay_s, scn.rules]) : '';
  useEffect(() => {
    if (!set) return;
    let live = true;
    setProgress(0);
    data.engine.miss(missJob(set, scn.start_s, scn.start_s + scn.stay_s, scn.rules), (f) => live && setProgress(f))
      .then((a) => live && setAnswer({ key, a }))
      .catch((e) => live && setErr(String(e)));
    return () => { live = false; };
  }, [key]);

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
  if (!set) return <section class="card"><p>Loading the miss-test grid…</p></section>;

  const pts = set.meta.points;
  const a = answer && answer.key === key ? answer.a : null;
  const R = Math.max(set.meta.radius_m ?? 500, ...pts.map((p) => Math.hypot(p.east_m ?? 0, p.north_m ?? 0)));
  const size = Math.min(W, 560);
  const pad = 52;
  const plot = size - pad - 16;
  const ppm = plot / (2 * R * 1.08);
  const cx = pad + plot / 2, cy = 12 + plot / 2;
  const X = (e: number) => cx + e * ppm, Y = (n: number) => cy - n * ppm;
  const spacing = set.meta.spacing_m ?? 50;
  const dotR = Math.max(3, Math.min(8, spacing * ppm * 0.32));
  const ri = MISS_RADII_M.indexOf(radius);
  const share = a ? a.shares[ri] : NaN;
  const tolerant = share >= MISS_TOLERANT_SHARE;
  const pinI = pin ?? nearestGridPoint(pts, 0, 0);
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
      <div class={`verdict ${a ? (tolerant ? 'go' : 'no-go') : ''}`} style={{ display: 'block', borderLeftWidth: 8, borderLeftStyle: 'solid', paddingLeft: 10, marginBottom: 10 }}>
        <h3 style={{ margin: 0 }} data-testid="miss-headline">
          {a ? <VerdictBadge v={tolerant ? 'go' : 'no-go'} small label={tolerant ? 'MISS-TOLERANT' : 'NOT MISS-TOLERANT'} /> : null}{' '}
          {a ? <>Land within {radius} m and {formatPct(share)} of the ground still meets the rules</> : <>Testing {pts.length} landing points… {formatPct(progress)}</>}
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
        <svg width={size} height={H} viewBox={`0 0 ${size} ${H}`} data-testid="miss-map" role="img"
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
          <g tabIndex={0} role="slider" aria-label="Landing pin" aria-valuetext={where(pinP)} onKeyDown={onKey} data-testid="miss-pin" class="pin">
            <circle cx={X(pinP.east_m ?? 0)} cy={Y(pinP.north_m ?? 0)} r={dotR + 6} fill="none" stroke="#fff" stroke-width="3" />
            <path d={`M${X(pinP.east_m ?? 0)},${Y(pinP.north_m ?? 0) - dotR - 6} l-7,-16 a8,8 0 1,1 14,0 z`} fill="#fff" stroke="#000" />
          </g>
        </svg>
      </div>
      <ul class="legend">
        <li><svg width="14" height="14" style={{ display: 'inline', verticalAlign: '-2px' }}><circle cx="7" cy="7" r="6" fill="var(--go)" /></svg> Passes every rule (go or marginal)</li>
        <li><svg width="14" height="14" style={{ display: 'inline', verticalAlign: '-2px' }}><g stroke="var(--nogo)" stroke-width="3"><line x1="2" y1="2" x2="12" y2="12" /><line x1="2" y1="12" x2="12" y2="2" /></g></svg> Fails a rule (no-go)</li>
        <li>+ Target. Drag the white pin, or focus it and use the arrow keys.</li>
      </ul>
      {a && (
        <p class="takeaway" data-testid="miss-pin-verdict">
          <strong>Landing pin {where(pinP)}:</strong> <VerdictBadge v={a.verdicts[pinI]} small /> {a.reasons[pinI]}
        </p>
      )}

      {a && (
        <div class="scroll-x" style={{ marginTop: 10 }}>
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
