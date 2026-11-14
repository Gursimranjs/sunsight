// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Sky panorama: the 360° terrain horizon with the Sun's and Earth's tracks over the stay and
// true-size discs at the selected moment, plus a close-up with equal scales.
import { useState } from 'preact/hooks';
import type { Series } from '../engine/compute';
import type { Sample } from '../engine/light';
import { compass, formatDeg, formatPct } from '../format';
import { closeScale, disc, fullScale, meanAz, niceStep, terrainPath, trackPath, type PanoBox, type PanoScale } from './panoGeometry';
import { Term } from './Term';
import { useWidth } from './useWidth';

interface Props {
  series: Series;
  now: Sample;
  mask: ArrayLike<number>;
  horizonLabel: string;
}

const Y_TITLE_W = 22;

function Axes({ s, xTicks, yStep, xLabel }: { s: PanoScale; xTicks: { az: number; label: string }[]; yStep: number; xLabel: string }) {
  const b = s.box;
  const bottom = b.height_px - b.padB;
  const ys: number[] = [];
  for (let e = Math.ceil(s.el0_deg / yStep) * yStep; e <= s.el1_deg + 1e-9; e += yStep) ys.push(Number(e.toFixed(6)));
  return (
    <g class="axis">
      {ys.map((e) => (
        <g key={e}>
          <line x1={b.padL} x2={b.width_px - b.padR} y1={s.y(e)} y2={s.y(e)} stroke={e === 0 ? 'var(--muted)' : 'var(--line)'} stroke-dasharray={e === 0 ? '6 4' : undefined} />
          <text x={b.padL - 6} y={s.y(e) + 5} text-anchor="end">{Number.isInteger(e) ? e : e.toFixed(1)}</text>
        </g>
      ))}
      {xTicks.map((t) => (
        <g key={t.label + t.az}>
          <line x1={s.x(t.az)} x2={s.x(t.az)} y1={bottom} y2={bottom + 5} />
          <text x={s.x(t.az)} y={bottom + 20} text-anchor="middle">{t.label}</text>
        </g>
      ))}
      <text x={(b.padL + b.width_px - b.padR) / 2} y={b.height_px - 4} text-anchor="middle" style={{ fill: 'var(--muted)' }}>{xLabel}</text>
      <text transform={`translate(14 ${(b.padT + bottom) / 2}) rotate(-90)`} text-anchor="middle" style={{ fill: 'var(--muted)' }}>Elevation (°)</text>
    </g>
  );
}

function Body({ s, az, el, r, kind, label }: { s: PanoScale; az: number; el: number; r: number; kind: 'sun' | 'earth'; label: string }) {
  const d = disc(s, az, el, r);
  const col = kind === 'sun' ? 'var(--sun)' : 'var(--earth)';
  return (
    <g data-testid={`disc-${kind}`} data-rx={d.rx} data-ry={d.ry}>
      <ellipse cx={d.cx} cy={d.cy} rx={Math.max(d.rx, 1.5)} ry={Math.max(d.ry, 0.75)} fill={col} />
      <text x={d.cx + Math.max(d.rx, 2) + 4} y={d.cy - Math.max(d.ry, 2) - 2} style={{ fontWeight: 700 }}>{label}</text>
    </g>
  );
}

export function Panorama({ series, now, mask, horizonLabel }: Props) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [focus, setFocus] = useState<'sun' | 'earth'>('sun');
  const narrow = W < 560;
  const box: PanoBox = { width_px: W, height_px: narrow ? 260 : 300, padL: 32 + Y_TITLE_W, padR: 12, padT: 12, padB: 44 };

  let maskMin = Infinity, maskMax = -Infinity;
  for (let i = 0; i < mask.length; i++) { maskMin = Math.min(maskMin, mask[i]); maskMax = Math.max(maskMax, mask[i]); }
  let trackLo = Infinity, trackHi = -Infinity;
  for (let i = 0; i < series.t_s.length; i++) {
    trackLo = Math.min(trackLo, series.sun_el_deg[i], series.earth_el_deg[i]);
    trackHi = Math.max(trackHi, series.sun_el_deg[i], series.earth_el_deg[i]);
  }
  // Show the terrain and the tracks; tracks far below the terrain are cut at 3° under its lowest point.
  const s = fullScale(box, [maskMin, maskMax, Math.max(trackLo, maskMin - 3), trackHi, now.sun_el_deg, now.earth_el_deg]);
  const earthMean = meanAz(series.earth_az_deg);
  const step = narrow ? 90 : 45;
  const xTicks: { az: number; label: string }[] = [];
  for (let a = 0; a <= 360; a += step) xTicks.push({ az: a, label: `${a}° ${compass(a)}` });
  const yStep = niceStep(s.el1_deg - s.el0_deg, narrow ? 4 : 6);
  const bottom = box.height_px - box.padB;

  // Close-up with equal scales.
  const cBox: PanoBox = { width_px: W, height_px: narrow ? 220 : 240, padL: 32 + Y_TITLE_W, padR: 12, padT: 12, padB: 44 };
  const fAz = focus === 'sun' ? now.sun_az_deg : now.earth_az_deg;
  const fEl = focus === 'sun' ? now.sun_el_deg : now.earth_el_deg;
  const half = focus === 'sun' ? 2 : 4;
  const c = closeScale(cBox, fAz, fEl, half);
  const cStep = niceStep(2 * half, narrow ? 4 : 8);
  const cTicks: { az: number; label: string }[] = [];
  for (let a = Math.ceil((fAz - half) / cStep) * cStep; a <= fAz + half + 1e-9; a += cStep) cTicks.push({ az: a, label: `${(((a % 360) + 360) % 360).toFixed(cStep < 1 ? 1 : 0)}°` });
  const cY = niceStep(c.el1_deg - c.el0_deg, 4);

  const sunAbove = now.sun_frac;
  const earthClear = now.earth_frac;
  return (
    <section class="card" aria-label="Sky panorama">
      <h3 class="chart-title">Sky panorama: the horizon all the way round, with the Sun's and Earth's paths over the stay</h3>
      <p class="small muted" style={{ margin: '0 0 4px' }}>{horizonLabel}. Vertical scale exaggerated ×{s.exaggeration.toFixed(0)}; discs are drawn true to the vertical scale.</p>
      <div ref={ref}>
        <svg width={W} height={box.height_px} viewBox={`0 0 ${W} ${box.height_px}`} role="img" data-testid="panorama"
          data-px-per-deg-y={s.px_per_deg_y}
          aria-label={`Panorama. Sun at azimuth ${formatDeg(now.sun_az_deg, 1)}, elevation ${formatDeg(now.sun_el_deg, 2)}, ${formatPct(sunAbove)} of its disc visible. Earth at azimuth ${formatDeg(now.earth_az_deg, 1)}, elevation ${formatDeg(now.earth_el_deg, 2)}.`}>
          <defs>
            <clipPath id="pano-clip"><rect x={box.padL} y={box.padT} width={W - box.padL - box.padR} height={bottom - box.padT} /></clipPath>
          </defs>
          <rect x={box.padL} y={box.padT} width={W - box.padL - box.padR} height={bottom - box.padT} fill="#05070b" />
          <Axes s={s} xTicks={xTicks} yStep={yStep} xLabel="Azimuth (°, clockwise from north)" />
          <g clip-path="url(#pano-clip)">
            <Body s={s} az={now.sun_az_deg} el={now.sun_el_deg} r={now.sun_r_deg} kind="sun" label="Sun" />
            <Body s={s} az={now.earth_az_deg} el={now.earth_el_deg} r={now.earth_r_deg} kind="earth" label="Earth" />
            <path d={terrainPath(s, mask)} fill="var(--terrain)" stroke="#c9b8a3" stroke-width="1" />
            {/* Tracks and outlines on top so paths and hidden bodies still show where they are. */}
            <path d={trackPath(s, series.sun_az_deg, series.sun_el_deg)} fill="none" stroke="var(--sun)" stroke-width="2" opacity="0.8" />
            <path d={trackPath(s, series.earth_az_deg, series.earth_el_deg)} fill="none" stroke="var(--earth)" stroke-width="2" stroke-dasharray="6 4" opacity="0.9" />
            <ellipse cx={s.x(now.sun_az_deg)} cy={s.y(now.sun_el_deg)} rx={Math.max(now.sun_r_deg * s.px_per_deg_x, 0.75)} ry={now.sun_r_deg * s.px_per_deg_y} fill="none" stroke="var(--sun)" stroke-dasharray="3 2" />
            <ellipse cx={s.x(now.earth_az_deg)} cy={s.y(now.earth_el_deg)} rx={Math.max(now.earth_r_deg * s.px_per_deg_x, 0.75)} ry={now.earth_r_deg * s.px_per_deg_y} fill="none" stroke="var(--earth)" stroke-dasharray="3 2" />
          </g>
          <g>
            <line x1={s.x(earthMean)} x2={s.x(earthMean)} y1={box.padT} y2={box.padT + 10} stroke="var(--earth)" stroke-width="2" />
            <text x={Math.min(Math.max(s.x(earthMean), box.padL + 50), W - 60)} y={box.padT + 24} text-anchor="middle" style={{ fill: 'var(--earth)' }}>toward Earth</text>
          </g>
        </svg>
      </div>
      <ul class="legend">
        <li><span class="sw" style={{ background: 'var(--terrain)' }} />Terrain (highest point in each direction)</li>
        <li><span class="sw" style={{ background: 'var(--sun)' }} />Sun's path (solid) and disc</li>
        <li><span class="sw" style={{ background: 'var(--earth)' }} />Earth's path (dashed) and disc</li>
        <li>Dashed horizontal line: level horizon (0°)</li>
      </ul>
      <p class="takeaway" data-testid="pano-takeaway">
        Now the Sun is {formatDeg(now.sun_el_deg, 2)} up at <Term tip="azimuth">azimuth</Term> {formatDeg(now.sun_az_deg, 1)} with {formatPct(sunAbove)} of its disc above the terrain;
        Earth is {formatDeg(now.earth_el_deg, 2)} up with {formatPct(earthClear)} of its disc clear. Over the stay the Sun moves between {formatDeg(Math.min(...series.sun_el_deg), 1)} and {formatDeg(Math.max(...series.sun_el_deg), 1)} of elevation.
      </p>

      <h3 class="chart-title" style={{ marginTop: 16 }}>Close-up, same scale on both axes</h3>
      <div role="group" aria-label="Close-up on" style={{ display: 'flex', gap: 8, margin: '4px 0 6px' }}>
        <button type="button" aria-pressed={focus === 'sun'} class={focus === 'sun' ? 'primary' : ''} onClick={() => setFocus('sun')}>Sun</button>
        <button type="button" aria-pressed={focus === 'earth'} class={focus === 'earth' ? 'primary' : ''} onClick={() => setFocus('earth')}>Earth</button>
      </div>
      <svg width={W} height={cBox.height_px} viewBox={`0 0 ${W} ${cBox.height_px}`} role="img" data-testid="closeup"
        data-px-per-deg={c.px_per_deg_y}
        aria-label={`Close-up of the ${focus} with equal scales: ${formatPct(focus === 'sun' ? sunAbove : earthClear)} of its disc above the terrain.`}>
        <defs>
          <clipPath id="close-clip"><rect x={cBox.padL} y={cBox.padT} width={W - cBox.padL - cBox.padR} height={cBox.height_px - cBox.padB - cBox.padT} /></clipPath>
        </defs>
        <rect x={cBox.padL} y={cBox.padT} width={W - cBox.padL - cBox.padR} height={cBox.height_px - cBox.padB - cBox.padT} fill="#05070b" />
        <Axes s={c} xTicks={cTicks} yStep={cY} xLabel="Azimuth (°)" />
        <g clip-path="url(#close-clip)">
          <Body s={c} az={now.sun_az_deg} el={now.sun_el_deg} r={now.sun_r_deg} kind="sun" label="Sun" />
          <Body s={c} az={now.earth_az_deg} el={now.earth_el_deg} r={now.earth_r_deg} kind="earth" label="Earth" />
          <path d={terrainPath(c, mask)} fill="var(--terrain)" stroke="#c9b8a3" stroke-width="1" />
          <circle cx={c.x(fAz)} cy={c.y(fEl)} r={(focus === 'sun' ? now.sun_r_deg : now.earth_r_deg) * c.px_per_deg_y} fill="none" stroke={focus === 'sun' ? 'var(--sun)' : 'var(--earth)'} stroke-dasharray="3 2" />
        </g>
      </svg>
      <p class="takeaway">
        The {focus === 'sun' ? 'Sun' : 'Earth'} is {formatDeg(2 * (focus === 'sun' ? now.sun_r_deg : now.earth_r_deg), 3)} across; here 1° is {c.px_per_deg_y.toFixed(0)} px both ways, so the terrain cuts the disc exactly as it does in the engine.
      </p>
    </section>
  );
}
