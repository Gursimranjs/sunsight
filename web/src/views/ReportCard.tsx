// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Report card: verdict and reason first, the Sun's elevation beside it, countdowns, then metrics.
import type { Countdown, Countdowns } from '../engine/countdown';
import type { Metrics, Rules, Verdict, VerdictKind } from '../engine/light';
import { formatDeg, formatDuration, formatHours, formatPct, formatUtc } from '../format';
import { Term } from './Term';

export const VERDICT_TEXT: Record<VerdictKind, { label: string; sym: string }> = {
  go: { label: 'GO', sym: '✓' },
  marginal: { label: 'MARGINAL', sym: '!' },
  'no-go': { label: 'NO-GO', sym: '✕' },
};

export function VerdictBadge({ v, small, label }: { v: VerdictKind; small?: boolean; label?: string }) {
  const t = { ...VERDICT_TEXT[v], ...(label ? { label } : {}) };
  return (
    <span class={`vbadge ${v}${small ? ' small' : ''}`}>
      <span class="sym" aria-hidden="true">{t.sym}</span>
      <span>{t.label}</span>
    </span>
  );
}

function cdText(c: Countdown, downWord: string, upWord: string, epochMs: number, endText: string) {
  const word = c.up ? downWord : upWord;
  if (c.in_s === null || c.at_s === null) return <span>No {word.toLowerCase()} before the stay ends{endText}</span>;
  return (
    <span>
      {word} in <strong data-testid={`cd-${word.toLowerCase().replace(/\s+/g, '-')}`}>{formatDuration(c.in_s)}</strong>{' '}
      <span class="muted">({formatUtc(epochMs + c.at_s * 1000)})</span>
    </span>
  );
}

interface HeroProps {
  verdict: Verdict | null;
  busy: boolean;
  placeName: string;
  horizonLabel: string;
  terrain: boolean;
  sunElDeg: number | null;
  sunVisible: number | null;
  countdowns: Countdowns | null;
  epochMs: number;
  nowMs: number;
}

export function VerdictHero({ verdict, busy, placeName, horizonLabel, terrain, sunElDeg, sunVisible, countdowns, epochMs, nowMs }: HeroProps) {
  const v = verdict?.verdict;
  return (
    <section class={`card verdict ${v ?? ''}`} aria-live="polite" aria-busy={busy} data-testid="verdict">
      <div>
        <p class="muted small" style={{ margin: 0 }}>
          {placeName} · <span data-testid="horizon-label">{terrain ? horizonLabel : <Term tip="smooth">{horizonLabel}</Term>}</span>
        </p>
        {verdict ? (
          <>
            <h2 class="verdict-badge" data-testid="verdict-word"><VerdictBadge v={verdict.verdict} /></h2>
            <p class="verdict-reason" data-testid="verdict-reason">{verdict.reason}</p>
          </>
        ) : (
          <h2 class="verdict-badge">Computing…</h2>
        )}
      </div>
      <div class="sun-el">
        <div class="muted small">Sun's <Term tip="elevation">elevation</Term> at {formatUtc(nowMs)}</div>
        <div class="big" data-testid="sun-el">{sunElDeg === null ? '—' : formatDeg(sunElDeg, 2)}</div>
        {sunVisible !== null && <div class="small">{formatPct(sunVisible)} of the disc visible</div>}
      </div>
      {countdowns && (
        <ul class="countdowns" data-testid="countdowns">
          <li><span class="cd-k">Sun:</span> {cdText(countdowns.sun, 'Sunset', 'Sunrise', epochMs, '')}</li>
          <li><span class="cd-k">Earth:</span> {cdText(countdowns.earth, 'Earthset', 'Earthrise', epochMs, '')}</li>
          <li><span class="cd-k">Contact:</span> {cdText(countdowns.contact, 'Contact loss', 'Contact back', epochMs, '')}</li>
        </ul>
      )}
    </section>
  );
}

export function scoreParts(m: Metrics, rules: Rules) {
  const stay_s = Math.max((m.n_samples - 1) * 600, 1);
  const [ws, we, wn] = rules.weights;
  return {
    S: m.mean_sun_fraction, E: m.contact_share, N: m.longest_dark_s / stay_s,
    sun: 100 * ws * m.mean_sun_fraction, earth: 100 * we * m.contact_share, night: -100 * wn * (m.longest_dark_s / stay_s),
  };
}

export function MetricTiles({ m, rules }: { m: Metrics; rules: Rules }) {
  const p = scoreParts(m, rules);
  const darkFail = m.longest_dark_s > rules.max_dark_s;
  const gapFail = m.longest_gap_s > rules.max_gap_s;
  return (
    <section class="card" aria-label="Metrics">
      <h3>Over the whole stay</h3>
      <div class="tiles" data-testid="metrics">
        <div class="tile"><div class="k"><Term tip="lit">Lit share</Term></div><div class="v">{formatPct(m.lit_share)}</div></div>
        <div class={`tile ${darkFail ? 'fail' : ''}`}><div class="k">Longest dark spell</div><div class="v">{formatHours(m.longest_dark_s)}</div><div class="small muted">limit {formatHours(rules.max_dark_s)}{darkFail ? ' — fails' : ' — passes'}</div></div>
        <div class={`tile ${gapFail ? 'fail' : ''}`}><div class="k">Longest contact gap</div><div class="v">{formatHours(m.longest_gap_s)}</div><div class="small muted">limit {formatHours(rules.max_gap_s)}{gapFail ? ' — fails' : ' — passes'}</div></div>
        <div class="tile"><div class="k"><Term tip="contact">Contact share</Term></div><div class="v">{formatPct(m.contact_share)}</div></div>
        <div class="tile"><div class="k"><Term tip="grazing">Grazing share</Term></div><div class="v">{formatPct(m.grazing_share)}</div></div>
        <div class="tile"><div class="k"><Term tip="battery">Battery estimate</Term></div><div class="v">{m.battery_kwh.toFixed(1)} kWh</div><div class="small muted">{rules.load_w} W through the longest night</div></div>
        <div class="tile"><div class="k"><Term tip="score">Score</Term></div><div class="v">{m.score.toFixed(0)} / 100</div>
          <div class="small muted">Sun {p.sun.toFixed(1)} + Earth {p.earth.toFixed(1)} − night {Math.abs(p.night).toFixed(1)}</div></div>
      </div>
    </section>
  );
}
