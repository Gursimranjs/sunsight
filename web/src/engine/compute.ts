// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// The jobs the Web Worker runs. Pure functions, so unit tests call them directly in node.
import { BIN_COUNT } from '../data/contracts';
import {
  CONTACT_RANK, miss_share, verdict, window_compute,
  type Grade, type Mask, type Metrics, type Rules, type Table, type Verdict, type VerdictKind,
} from './light';

/** The 10-minute series behind a window, as flat arrays (cheap to transfer from the worker). */
export interface Series {
  t_s: Float64Array;
  sun_az_deg: Float64Array;
  sun_el_deg: Float64Array;
  sun_r_deg: Float64Array;
  earth_az_deg: Float64Array;
  earth_el_deg: Float64Array;
  earth_r_deg: Float64Array;
  sun_frac: Float64Array;
  earth_frac: Float64Array;
  /** 0 blocked, 1 grazing, 2 clear (CONTACT_RANK). */
  contact: Int8Array;
}

export interface Place { lat_deg: number; lon_deg: number; h_m: number }

export interface WindowJob { place: Place; mask: Mask; start_s: number; end_s: number; rules: Rules }
export interface WindowAnswer { metrics: Metrics; verdict: Verdict; series: Series }

export function runWindow(table: Table, job: WindowJob): WindowAnswer {
  const { place, mask, start_s, end_s, rules } = job;
  const { metrics, samples } = window_compute(table, place.lat_deg, place.lon_deg, place.h_m, mask, start_s, end_s, rules);
  const n = samples.length;
  const s: Series = {
    t_s: new Float64Array(n), sun_az_deg: new Float64Array(n), sun_el_deg: new Float64Array(n),
    sun_r_deg: new Float64Array(n), earth_az_deg: new Float64Array(n), earth_el_deg: new Float64Array(n),
    earth_r_deg: new Float64Array(n), sun_frac: new Float64Array(n), earth_frac: new Float64Array(n),
    contact: new Int8Array(n),
  };
  samples.forEach((x, i) => {
    s.t_s[i] = x.t_s; s.sun_az_deg[i] = x.sun_az_deg; s.sun_el_deg[i] = x.sun_el_deg; s.sun_r_deg[i] = x.sun_r_deg;
    s.earth_az_deg[i] = x.earth_az_deg; s.earth_el_deg[i] = x.earth_el_deg; s.earth_r_deg[i] = x.earth_r_deg;
    s.sun_frac[i] = x.sun_frac; s.earth_frac[i] = x.earth_frac; s.contact[i] = CONTACT_RANK[x.contact as Grade];
  });
  return { metrics, verdict: verdict(metrics, rules), series: s };
}

/** Every grid point of a miss-test target, scored over one window. */
export interface MissJob {
  places: Place[];
  /** Masks in degrees, places.length x BIN_COUNT, for the chosen observer height. */
  masks: Float64Array;
  east_m: number[];
  north_m: number[];
  start_s: number;
  end_s: number;
  rules: Rules;
  radii_m: number[];
}
export interface MissAnswer {
  verdicts: VerdictKind[];
  reasons: string[];
  passes: boolean[];
  /** miss_share at each radius in radii_m. */
  shares: number[];
}

/** A grid point passes when no rule fails (go or marginal). */
export const passes = (v: VerdictKind) => v !== 'no-go';

export function runMiss(table: Table, job: MissJob, progress?: (done: number, total: number) => void): MissAnswer {
  const verdicts: VerdictKind[] = [];
  const reasons: string[] = [];
  job.places.forEach((p, i) => {
    const mask = job.masks.subarray(i * BIN_COUNT, (i + 1) * BIN_COUNT);
    const m = window_compute(table, p.lat_deg, p.lon_deg, p.h_m, mask, job.start_s, job.end_s, job.rules).metrics;
    const v = verdict(m, job.rules);
    verdicts.push(v.verdict);
    reasons.push(v.reason);
    if (progress && i % 16 === 15) progress(i + 1, job.places.length);
  });
  const ok = verdicts.map(passes);
  return { verdicts, reasons, passes: ok, shares: job.radii_m.map((r) => miss_share(ok, job.east_m, job.north_m, r)) };
}

/** Days x sites: a verdict and score for a stay starting on each day. */
export interface CalendarJob {
  sites: { place: Place; mask: Mask }[];
  day_starts_s: number[];
  stay_s: number;
  rules: Rules;
}
export interface CalendarCell { verdict: VerdictKind; score: number; lit_share: number; contact_share: number }
export interface CalendarAnswer { cells: CalendarCell[][] }

export function runCalendar(table: Table, job: CalendarJob, progress?: (done: number, total: number) => void): CalendarAnswer {
  const cells: CalendarCell[][] = [];
  const total = job.sites.length * job.day_starts_s.length;
  let done = 0;
  for (const s of job.sites) {
    const row: CalendarCell[] = [];
    for (const d of job.day_starts_s) {
      const m = window_compute(table, s.place.lat_deg, s.place.lon_deg, s.place.h_m, s.mask, d, d + job.stay_s, job.rules).metrics;
      row.push({ verdict: verdict(m, job.rules).verdict, score: m.score, lit_share: m.lit_share, contact_share: m.contact_share });
      done += 1;
      if (progress && done % 8 === 0) progress(done, total);
    }
    cells.push(row);
  }
  return { cells };
}

/**
 * Miss-tolerant calendar for one miss-test target: for each start day, the share of grid points
 * inside the miss radius that pass (go or marginal). A day is tolerant when share >= min_share.
 * The job carries only the points inside the radius; the others cannot change the share.
 */
export interface MissCalendarJob {
  places: Place[];
  /** Masks in degrees, places.length x BIN_COUNT, for the chosen observer height. */
  masks: Float64Array;
  day_starts_s: number[];
  stay_s: number;
  rules: Rules;
  radius_m: number;
  min_share: number;
}
export interface MissCalendarDay { n_inside: number; n_pass: number; share: number; tolerant: boolean }
export interface MissCalendarAnswer { days: MissCalendarDay[] }

export function runMissCalendar(table: Table, job: MissCalendarJob, progress?: (done: number, total: number) => void): MissCalendarAnswer {
  const n = job.places.length;
  const total = n * job.day_starts_s.length;
  let done = 0;
  const days = job.day_starts_s.map((d) => {
    let n_pass = 0;
    job.places.forEach((p, i) => {
      const mask = job.masks.subarray(i * BIN_COUNT, (i + 1) * BIN_COUNT);
      const m = window_compute(table, p.lat_deg, p.lon_deg, p.h_m, mask, d, d + job.stay_s, job.rules).metrics;
      if (passes(verdict(m, job.rules).verdict)) n_pass++;
      done++;
      if (progress && done % 16 === 0) progress(done, total);
    });
    const share = n ? n_pass / n : NaN;
    return { n_inside: n, n_pass, share, tolerant: n > 0 && share >= job.min_share };
  });
  return { days };
}
