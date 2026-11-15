// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// The horizon hero: the 360° terrain line from the place's mask, the Sun's and Earth's paths over the
// stay and their true-size discs at the selected moment, on a black sky. Geometry from panoGeometry.
// Load motion (note 009): on load and on each new site or date, the Sun runs along its own path to its
// position in RUN_MS. With prefers-reduced-motion it is drawn at its position at once.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Series } from '../engine/compute';
import type { Sample } from '../engine/light';
import { formatDeg } from '../format';
import { disc, fullScale, terrainPath, trackPath, type PanoBox, type PanoScale } from '../views/panoGeometry';
import { Term } from '../views/Term';
import { useWidth } from '../views/useWidth';

interface Props {
  series: Series | null;
  now: Sample | null;
  mask: ArrayLike<number> | null;
  /** Terrain horizon (true) or the smooth-Moon horizon (false). */
  terrain: boolean;
  horizonLabel: string;
  busy: boolean;
}

/** Ring drawn round a disc so a true-size disc a pixel wide can still be found. */
const RING_PX = 7;
/** Length of the load run, ms (interface timing only). */
export const RUN_MS = 800;

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Index of the sample at at_s in a series on a fixed step, clamped to the series. */
export function sampleIndex(t_s: ArrayLike<number>, at_s: number): number {
  const n = t_s.length;
  if (n < 2) return 0;
  const step_s = t_s[1] - t_s[0];
  return Math.max(0, Math.min(n - 1, Math.round((at_s - t_s[0]) / step_s)));
}

/**
 * The series index where the Sun is drawn `f` (0 to 1) of the way through the load run. It travels
 * along its own path from the stay's first sample to the selected one, or back from the last sample
 * when the selected moment is the first one, easing out. At f = 1 it is the selected sample.
 */
export function runIndex(n: number, i_now: number, f: number): number {
  if (n < 2) return i_now;
  const from = i_now > 0 ? 0 : n - 1;
  const g = 1 - Math.pow(1 - Math.min(1, Math.max(0, f)), 3);
  return Math.round(from + (i_now - from) * g);
}

/** Fraction of the load run done (1 when settled). Restarts each time `key` changes to a new value. */
function useRun(key: string | null): number {
  const [f, setF] = useState(1);
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (key === null || key === last.current) return;
    last.current = key;
    if (reducedMotion() || typeof requestAnimationFrame !== 'function') { setF(1); return; }
    let raf = 0;
    const started_ms = performance.now();
    const frame = (now_ms: number) => {
      const x = Math.min(1, Math.max(0, (now_ms - started_ms) / RUN_MS));
      setF(x);
      if (x < 1) raf = requestAnimationFrame(frame);
    };
    setF(0);
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); setF(1); };
  }, [key]);
  return f;
}

function Body({ s, az_deg, el_deg, r_deg, kind, settled = true }: {
  s: PanoScale; az_deg: number; el_deg: number; r_deg: number; kind: 'sun' | 'earth'; settled?: boolean;
}) {
  const d = disc(s, az_deg, el_deg, r_deg);
  const col = kind === 'sun' ? 'var(--hz-sun, #FFD27A)' : 'var(--hz-earth, #4F8FD6)';
  const label = kind === 'sun' ? 'Sun' : 'Earth';
  return (
    <g class={`hz-body hz-${kind}`} data-testid={`hz-${kind}`} data-settled={settled ? 'true' : 'false'}
      data-cx={d.cx.toFixed(1)} data-rx={d.rx} data-ry={d.ry}>
      <circle cx={d.cx} cy={d.cy} r={RING_PX + Math.max(d.rx, d.ry)} fill="none" stroke={col} stroke-width="1.5" opacity="0.8" />
      <ellipse cx={d.cx} cy={d.cy} rx={Math.max(d.rx, 1.5)} ry={Math.max(d.ry, 0.75)} fill={col} />
      <text x={d.cx} y={d.cy - RING_PX - Math.max(d.ry, 2) - 5} text-anchor="middle" style={{ fill: col }}>{label}</text>
    </g>
  );
}

export function HorizonHero({ series, now, mask, terrain, horizonLabel, busy }: Props) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const H = W < 600 ? 150 : 200;
  const box: PanoBox = { width_px: W, height_px: H, padL: 0, padR: 0, padT: 30, padB: 22 };
  // A new place (a new mask) or a new stay start runs the Sun in again; time moving inside the stay
  // (Play, the slider, arrow keys) does not.
  const maskSeen = useRef<{ mask: ArrayLike<number> | null; n: number }>({ mask: null, n: 0 });
  if (mask && mask !== maskSeen.current.mask) maskSeen.current = { mask, n: maskSeen.current.n + 1 };
  const runKey = series && now && mask && series.t_s.length ? `${maskSeen.current.n}:${series.t_s[0]}` : null;
  const run_f = useRun(runKey);
  let body = null, aria = 'The horizon: computing.';
  if (series && now && mask) {
    let maskLo_deg = Infinity, maskHi_deg = -Infinity;
    for (let i = 0; i < mask.length; i++) { maskLo_deg = Math.min(maskLo_deg, mask[i]); maskHi_deg = Math.max(maskHi_deg, mask[i]); }
    let trackLo_deg = Infinity, trackHi_deg = -Infinity;
    for (let i = 0; i < series.t_s.length; i++) {
      trackLo_deg = Math.min(trackLo_deg, series.sun_el_deg[i], series.earth_el_deg[i]);
      trackHi_deg = Math.max(trackHi_deg, series.sun_el_deg[i], series.earth_el_deg[i]);
    }
    const s = fullScale(box, [maskLo_deg, maskHi_deg, Math.max(trackLo_deg, maskLo_deg - 3), trackHi_deg, now.sun_el_deg, now.earth_el_deg]);
    const settled = run_f >= 1;
    const i_run = settled ? -1 : runIndex(series.t_s.length, sampleIndex(series.t_s, now.t_s), run_f);
    const sunAz_deg = settled ? now.sun_az_deg : series.sun_az_deg[i_run];
    const sunEl_deg = settled ? now.sun_el_deg : series.sun_el_deg[i_run];
    const bottom_px = H - box.padB;
    aria = `The horizon all round, north at the left. Sun ${formatDeg(now.sun_el_deg, 2)} above level at azimuth ${formatDeg(now.sun_az_deg, 0)}; Earth ${formatDeg(now.earth_el_deg, 2)} at azimuth ${formatDeg(now.earth_az_deg, 0)}.`;
    body = (
      <>
        <path d={trackPath(s, series.sun_az_deg, series.sun_el_deg)} fill="none" stroke="var(--hz-sun, #FFD27A)" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.75" />
        <path d={trackPath(s, series.earth_az_deg, series.earth_el_deg)} fill="none" stroke="var(--hz-earth, #4F8FD6)" stroke-width="1.5" stroke-dasharray="2 4" opacity="0.9" />
        <Body s={s} az_deg={now.earth_az_deg} el_deg={now.earth_el_deg} r_deg={now.earth_r_deg} kind="earth" />
        <Body s={s} az_deg={sunAz_deg} el_deg={sunEl_deg} r_deg={now.sun_r_deg} kind="sun" settled={settled} />
        <path d={terrainPath(s, mask)} fill="var(--hz-ground, #CFCBC2)" />
        <rect x="0" y={bottom_px} width={W} height={box.padB} fill="var(--hz-ground, #CFCBC2)" />
        {[0, 90, 180, 270].map((az_deg, i) => (
          <text key={az_deg} x={s.x(az_deg) + (az_deg === 0 ? 4 : 0)} y={H - 6} text-anchor={az_deg === 0 ? 'start' : 'middle'}
            style={{ fill: 'var(--hz-ink, #17181A)' }} class="hz-compass">{'NESW'[i]}</text>
        ))}
        <text x={W - 6} y={14} text-anchor="end" class="hz-exag" style={{ fill: '#BDBDBD' }}>Vertical scale exaggerated ×{s.exaggeration.toFixed(0)}</text>
      </>
    );
  }
  return (
    <div class="hz-hero" ref={ref} data-testid="hz-hero" aria-busy={busy} data-run={run_f >= 1 ? 'settled' : 'running'}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria}>
        <rect width={W} height={H} fill="var(--hz-sky, #000000)" />
        {body}
      </svg>
      {horizonLabel && !terrain && <p class="hz-smooth"><Term tip="smooth">{horizonLabel}</Term></p>}
    </div>
  );
}
