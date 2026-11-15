// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Plain-language formatting of times, durations and angles.
import { formatHoursText } from './engine/light';

/** "3 d 4 h 12 min", "4 h 12 min", "12 min". Rounds to the minute. */
export function formatDuration(s: number): string {
  if (!Number.isFinite(s)) return '—';
  const total_min = Math.round(Math.abs(s) / 60);
  const d = Math.floor(total_min / 1440);
  const h = Math.floor((total_min % 1440) / 60);
  const m = total_min % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d} d`);
  if (d || h) parts.push(`${h} h`);
  parts.push(`${m} min`);
  return (s < 0 ? '−' : '') + parts.join(' ');
}

/** Hours with one decimal; over 48 hours also in days, "13.0 days (311.6 h)" (same text as the verdict reasons). */
export function formatHours(s: number): string {
  return formatHoursText(s);
}

/** "2027-01-05 13:42 UTC" from Unix milliseconds. */
export function formatUtc(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '—';
  const iso = d.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

/** Value for <input type="datetime-local">, treating the time as UTC. */
export function toInputUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 16);
}

export function fromInputUtc(v: string): number {
  return Date.parse(v.length === 16 ? v + ':00Z' : v + 'Z');
}

export function formatDeg(x: number, digits = 2): string {
  return `${x.toFixed(digits)}°`;
}

export function formatPct(x: number, digits = 0): string {
  return Number.isFinite(x) ? `${(100 * x).toFixed(digits)}%` : '—';
}

export function compass(az_deg: number): string {
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return names[Math.round((((az_deg % 360) + 360) % 360) / 45) % 8];
}
