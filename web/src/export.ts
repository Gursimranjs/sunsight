// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// CSV and JSON exports of exactly what the report card shows: metrics, verdict and the 10-minute series.
import type { Series, WindowAnswer } from './engine/compute';
import type { Rules } from './engine/light';

const GRADES = ['blocked', 'grazing', 'clear'] as const;

export interface ExportContext {
  fixture: boolean;
  site: { id: string | null; name: string; lat_deg: number; lon_deg: number; h_m: number; horizon: string };
  start_utc: string;
  stay_s: number;
  preset: string;
  rules: Rules;
  link: string;
  epoch_ms: number;
}

const iso = (ms: number) => new Date(ms).toISOString().replace('.000Z', 'Z');

export function seriesRows(series: Series, rules: Rules, epoch_ms: number): (string | number)[][] {
  const rows: (string | number)[][] = [];
  for (let i = 0; i < series.t_s.length; i++) {
    rows.push([
      iso(epoch_ms + series.t_s[i] * 1000), series.t_s[i],
      series.sun_az_deg[i], series.sun_el_deg[i], series.sun_r_deg[i], series.sun_frac[i],
      series.sun_frac[i] >= rules.lit_threshold ? 1 : 0,
      series.earth_az_deg[i], series.earth_el_deg[i], series.earth_r_deg[i], series.earth_frac[i],
      GRADES[series.contact[i]],
    ]);
  }
  return rows;
}

export const SERIES_HEADER = [
  'time_utc', 't_s', 'sun_az_deg', 'sun_el_deg', 'sun_r_deg', 'sun_visible_fraction', 'lit',
  'earth_az_deg', 'earth_el_deg', 'earth_r_deg', 'earth_visible_fraction', 'contact',
];

function csvCell(v: string | number): string {
  const s = typeof v === 'number' ? String(v) : v;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(a: WindowAnswer, ctx: ExportContext): string {
  const lines: string[] = [];
  lines.push(`# SunSight export${ctx.fixture ? ' - FIXTURE DATA: made up for development, not real' : ''}`);
  lines.push(`# site,${csvCell(ctx.site.name)},lat_deg,${ctx.site.lat_deg},lon_deg,${ctx.site.lon_deg},horizon,${csvCell(ctx.site.horizon)}`);
  lines.push(`# start_utc,${ctx.start_utc},stay_s,${ctx.stay_s},preset,${ctx.preset}`);
  lines.push(`# verdict,${a.verdict.verdict},reason,${csvCell(a.verdict.reason)}`);
  const m = a.metrics as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(m)) if (typeof v === 'number' || v === null) lines.push(`# ${k},${v ?? ''}`);
  lines.push(`# link,${csvCell(ctx.link)}`);
  lines.push(SERIES_HEADER.join(','));
  for (const r of seriesRows(a.series, ctx.rules, ctx.epoch_ms)) lines.push(r.map(csvCell).join(','));
  return lines.join('\n') + '\n';
}

export function toJson(a: WindowAnswer, ctx: ExportContext): string {
  const { epoch_ms, ...meta } = ctx;
  return JSON.stringify({
    generated_with: 'SunSight web app; code written by Claude Code (Anthropic)',
    ...meta,
    verdict: a.verdict,
    metrics: a.metrics,
    series: { columns: SERIES_HEADER, rows: seriesRows(a.series, ctx.rules, epoch_ms) },
  }, null, 1);
}

export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
