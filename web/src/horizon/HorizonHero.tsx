// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// The horizon hero: the 360° terrain line from the place's mask, the Sun's and Earth's paths over the
// stay and their true-size discs at the selected moment, on a black sky. Geometry from panoGeometry.
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

function Body({ s, az, el, r, kind }: { s: PanoScale; az: number; el: number; r: number; kind: 'sun' | 'earth' }) {
  const d = disc(s, az, el, r);
  const col = kind === 'sun' ? 'var(--hz-sun, #FFD27A)' : 'var(--hz-earth, #4F8FD6)';
  const label = kind === 'sun' ? 'Sun' : 'Earth';
  return (
    <g class={`hz-body hz-${kind}`} data-testid={`hz-${kind}`} data-cx={d.cx.toFixed(1)} data-rx={d.rx} data-ry={d.ry}>
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
  let body = null, aria = 'The horizon: computing.';
  if (series && now && mask) {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < mask.length; i++) { lo = Math.min(lo, mask[i]); hi = Math.max(hi, mask[i]); }
    let tLo = Infinity, tHi = -Infinity;
    for (let i = 0; i < series.t_s.length; i++) {
      tLo = Math.min(tLo, series.sun_el_deg[i], series.earth_el_deg[i]);
      tHi = Math.max(tHi, series.sun_el_deg[i], series.earth_el_deg[i]);
    }
    const s = fullScale(box, [lo, hi, Math.max(tLo, lo - 3), tHi, now.sun_el_deg, now.earth_el_deg]);
    const bottom = H - box.padB;
    aria = `The horizon all round, north at the left. Sun ${formatDeg(now.sun_el_deg, 2)} above level at azimuth ${formatDeg(now.sun_az_deg, 0)}; Earth ${formatDeg(now.earth_el_deg, 2)} at azimuth ${formatDeg(now.earth_az_deg, 0)}.`;
    body = (
      <>
        <path d={trackPath(s, series.sun_az_deg, series.sun_el_deg)} fill="none" stroke="var(--hz-sun, #FFD27A)" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.75" />
        <path d={trackPath(s, series.earth_az_deg, series.earth_el_deg)} fill="none" stroke="var(--hz-earth, #4F8FD6)" stroke-width="1.5" stroke-dasharray="2 4" opacity="0.9" />
        <Body s={s} az={now.earth_az_deg} el={now.earth_el_deg} r={now.earth_r_deg} kind="earth" />
        <Body s={s} az={now.sun_az_deg} el={now.sun_el_deg} r={now.sun_r_deg} kind="sun" />
        <path d={terrainPath(s, mask)} fill="var(--hz-ground, #CFCBC2)" />
        <rect x="0" y={bottom} width={W} height={box.padB} fill="var(--hz-ground, #CFCBC2)" />
        {[0, 90, 180, 270].map((az, i) => (
          <text key={az} x={s.x(az) + (az === 0 ? 4 : 0)} y={H - 6} text-anchor={az === 0 ? 'start' : 'middle'} style={{ fill: 'var(--hz-ink, #17181A)' }} class="hz-compass">{'NESW'[i]}</text>
        ))}
        <text x={W - 6} y={14} text-anchor="end" class="hz-exag" style={{ fill: '#BDBDBD' }}>Vertical scale exaggerated ×{s.exaggeration.toFixed(0)}</text>
      </>
    );
  }
  return (
    <div class="hz-hero" ref={ref} data-testid="hz-hero" aria-busy={busy}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria}>
        <rect width={W} height={H} fill="var(--hz-sky, #000000)" />
        {body}
      </svg>
      {horizonLabel && !terrain && <p class="hz-smooth"><Term tip="smooth">{horizonLabel}</Term></p>}
    </div>
  );
}
