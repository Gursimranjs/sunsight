// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Timeline strip: share of the Sun visible and Earth-contact grade over the stay.
import type { Series } from '../engine/compute';
import type { Metrics, Rules } from '../engine/light';
import { formatHours, formatPct } from '../format';
import { useWidth } from './useWidth';

interface Run { a: number; b: number; v: number }

/** Consecutive samples with the same value, as index runs [a, b). */
export function runs(values: ArrayLike<number>): Run[] {
  const out: Run[] = [];
  let a = 0;
  for (let i = 1; i <= values.length; i++) {
    if (i === values.length || values[i] !== values[a]) {
      out.push({ a, b: i, v: values[a] });
      a = i;
    }
  }
  return out;
}

const PAD_L = 84, PAD_R = 14, ROW_H = 46, GAP = 14, TOP = 8;

interface Props {
  series: Series;
  metrics: Metrics;
  rules: Rules;
  start_s: number;
  stay_s: number;
  t_off_s: number;
  onTime: (t_off_s: number) => void;
  title?: string;
  compact?: boolean;
}

export function Timeline({ series, metrics, rules, start_s, stay_s, t_off_s, onTime, title = 'Sunlight and Earth contact over the stay', compact }: Props) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const n = series.t_s.length;
  const plotW = W - PAD_L - PAD_R;
  const x = (t_s: number) => PAD_L + ((t_s - start_s) / stay_s) * plotW;
  const sunY0 = TOP + ROW_H, conY0 = TOP + 2 * ROW_H + GAP;
  const H = conY0 + 46;

  // Sun: area whose height is the visible share of the disc.
  let d = `M${x(series.t_s[0]).toFixed(1)},${sunY0}`;
  for (let i = 0; i < n; i++) d += `L${x(series.t_s[i]).toFixed(1)},${(sunY0 - series.sun_frac[i] * ROW_H).toFixed(1)}`;
  d += `L${x(series.t_s[n - 1]).toFixed(1)},${sunY0}Z`;
  const thrY = sunY0 - rules.lit_threshold * ROW_H;

  const dx = n > 1 ? x(series.t_s[1]) - x(series.t_s[0]) : plotW;
  const con = runs(series.contact);
  const days = stay_s / 86400;
  const maxTicks = Math.max(3, Math.floor(plotW / 48));
  const tickEvery = [0.25, 0.5, 1, 2, 5, 10, 20].find((s) => days / s <= maxTicks) ?? 50;
  const ticks: number[] = [];
  for (let k = 0; k <= days + 1e-9; k += tickEvery) ticks.push(k);

  const pick = (ev: MouseEvent) => {
    const svg = ev.currentTarget as SVGSVGElement;
    const r = svg.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * W;
    const f = Math.max(0, Math.min(1, (px - PAD_L) / plotW));
    onTime(Math.round((f * stay_s) / 600) * 600);
  };

  return (
    <figure class="card timeline" style={{ margin: '0 0 12px' }}>
      <h3 class="chart-title">{title}</h3>
      <div ref={ref}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" onClick={pick} style={{ cursor: 'crosshair' }}
        aria-label={`Timeline. Lit ${formatPct(metrics.lit_share)} of the time; longest darkness ${formatHours(metrics.longest_dark_s)}; Earth contact ${formatPct(metrics.contact_share)} of the time; longest contact gap ${formatHours(metrics.longest_gap_s)}.`}>
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--muted)" stroke-width="1.5" />
          </pattern>
        </defs>
        {/* Row backgrounds */}
        <rect x={PAD_L} y={TOP} width={plotW} height={ROW_H} fill="var(--panel2)" />
        <rect x={PAD_L} y={conY0 - ROW_H} width={plotW} height={ROW_H} fill="var(--panel2)" />
        <text x={PAD_L - 8} y={TOP + ROW_H / 2 - 4} text-anchor="end">Sunlight</text>
        <text x={PAD_L - 8} y={TOP + ROW_H / 2 + 14} text-anchor="end" class="small" style={{ fontSize: '14px', fill: 'var(--muted)' }}>% of disc</text>
        <text x={PAD_L - 8} y={conY0 - ROW_H / 2 + 5} text-anchor="end">Contact</text>
        <path d={d} fill="var(--sun)" />
        <line x1={PAD_L} x2={PAD_L + plotW} y1={thrY} y2={thrY} stroke="var(--fg)" stroke-dasharray="4 4" stroke-width="1" />
        {con.map((r) => {
          const x0 = x(series.t_s[r.a]), x1 = r.b < n ? x(series.t_s[r.b]) : x(series.t_s[n - 1]) + dx;
          if (r.v === 0) return <rect key={r.a} x={x0} y={conY0 - ROW_H} width={Math.max(0.5, x1 - x0)} height={ROW_H} fill="url(#hatch)" opacity="0.6" />;
          const h = r.v === 2 ? ROW_H : ROW_H / 2;
          return <rect key={r.a} x={x0} y={conY0 - h} width={Math.max(0.5, x1 - x0)} height={h} fill={r.v === 2 ? 'var(--earth)' : 'var(--oi-purple)'} />;
        })}
        {/* Time axis */}
        <g class="axis">
          <line x1={PAD_L} x2={PAD_L + plotW} y1={conY0} y2={conY0} />
          {ticks.map((k) => (
            <g key={k}>
              <line x1={x(start_s + k * 86400)} x2={x(start_s + k * 86400)} y1={conY0} y2={conY0 + 5} />
              {<text x={x(start_s + k * 86400)} y={conY0 + 20} text-anchor="middle">{tickEvery < 1 ? `${(k * 24).toFixed(0)}` : `${k}`}</text>}
            </g>
          ))}
          <text x={PAD_L + plotW / 2} y={conY0 + 40} text-anchor="middle" style={{ fill: 'var(--muted)' }}>{tickEvery < 1 ? 'Hours into the stay' : 'Days into the stay'}</text>
        </g>
        {/* Selected moment */}
        <line x1={x(start_s + t_off_s)} x2={x(start_s + t_off_s)} y1={TOP - 4} y2={conY0 + 4} stroke="var(--fg)" stroke-width="2" />
      </svg>
      </div>
      {!compact && (
        <ul class="legend">
          <li><span class="sw" style={{ background: 'var(--sun)' }} />Share of the Sun's disc visible (dashed line: "lit" threshold, {formatPct(rules.lit_threshold)})</li>
          <li><span class="sw" style={{ background: 'var(--earth)' }} />Clear contact (full height)</li>
          <li><span class="sw" style={{ background: 'var(--oi-purple)' }} />Grazing contact (half height)</li>
          <li><span class="sw" style={{ background: 'url(#hatch)', backgroundImage: 'repeating-linear-gradient(45deg, var(--muted) 0 2px, transparent 2px 6px)' }} />No contact (hatched)</li>
        </ul>
      )}
      <figcaption class="takeaway">
        Lit {formatPct(metrics.lit_share)} of the time, longest darkness {formatHours(metrics.longest_dark_s)}; Earth contact {formatPct(metrics.contact_share)} of the time, longest gap {formatHours(metrics.longest_gap_s)}. Click the strip to move the time.
      </figcaption>
    </figure>
  );
}
