// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Sunlight and Earth-contact maths: a line-by-line TypeScript port of pipeline/sunsight/light.py
// (the reference). tests/unit/light_vectors.test.ts holds both to the shared vectors within 1e-6.
// Keep the order of operations identical to the Python. Angles in degrees, distances in km
// unless a name says otherwise.
import { BIN_COUNT, EARTH_RADIUS_KM, MOON_RADIUS_KM, N_COLS, SUN_RADIUS_KM } from '../data/contracts';
import { az_el, D2R, local_frame, pymod, R2D, site_vector, type Frame } from './geometry';

export { az_el, local_frame, site_vector, type Frame } from './geometry';

export const SAMPLE_STEP_S = 600.0;
export const EVENT_RESOLUTION_S = 60.0;
export const STATION_NAMES = ['goldstone', 'madrid', 'canberra'] as const;
export type StationName = (typeof STATION_NAMES)[number];
export type Grade = 'blocked' | 'grazing' | 'clear';
export const CONTACT_RANK: Record<Grade, number> = { blocked: 0, grazing: 1, clear: 2 };

export type Mask = ArrayLike<number>;

/** The hourly table: row-major, `rows` x 18 columns (see data contracts). */
export interface Table { data: ArrayLike<number>; rows: number; step_s: number }

// ---------------------------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------------------------

export function angular_radius(radius_km: number, dist_km: number): number {
  return Math.asin(Math.min(1.0, radius_km / dist_km)) * R2D;
}

/** Horizon elevation on a perfectly smooth Moon for an observer h_m above the surface (negative). */
export function smooth_horizon_deg(h_m: number): number {
  return -Math.acos(MOON_RADIUS_KM / (MOON_RADIUS_KM + h_m / 1000.0)) * R2D;
}

export function flat_mask(value_deg: number): number[] {
  return new Array<number>(BIN_COUNT).fill(value_deg);
}

// ---------------------------------------------------------------------------------------------
// Table interpolation
// ---------------------------------------------------------------------------------------------

/**
 * Row of `table` at t_s seconds after row 0, by 4-point Lagrange interpolation.
 * Rows i-1..i+2 are used with i = floor(t/step), clamped to [1, n-3] so the stencil stays inside.
 * Writes into `out` (length 18) when given, to avoid allocation in hot loops.
 */
export function interp(table: Table, t_s: number, step_s = 3600.0, out?: number[]): number[] {
  const n = table.rows;
  const x = t_s / step_s;
  let i = Math.floor(x);
  i = Math.max(1, Math.min(n - 3, i));
  const u = x - i;
  const w0 = (-u * (u - 1.0) * (u - 2.0)) / 6.0;
  const w1 = ((u + 1.0) * (u - 1.0) * (u - 2.0)) / 2.0;
  const w2 = (-(u + 1.0) * u * (u - 2.0)) / 2.0;
  const w3 = ((u + 1.0) * u * (u - 1.0)) / 6.0;
  const d = table.data;
  const r0 = (i - 1) * N_COLS, r1 = i * N_COLS, r2 = (i + 1) * N_COLS, r3 = (i + 2) * N_COLS;
  const res = out ?? new Array<number>(N_COLS);
  for (let c = 0; c < N_COLS; c++) {
    res[c] = w0 * d[r0 + c] + w1 * d[r1 + c] + w2 * d[r2 + c] + w3 * d[r3 + c];
  }
  return res;
}

// ---------------------------------------------------------------------------------------------
// Horizon and light
// ---------------------------------------------------------------------------------------------

export function horizon_at(mask: Mask, az_deg: number): number {
  const n = mask.length;
  const x = (pymod(az_deg, 360.0) * n) / 360.0;
  let k0 = Math.floor(x);
  const f = x - k0;
  k0 = pymod(k0, n);
  const k1 = (k0 + 1) % n;
  return (1.0 - f) * mask[k0] + f * mask[k1];
}

export function overlap(lo: number, hi: number, a: number, b: number): number {
  return Math.max(0.0, Math.min(hi, b) - Math.max(lo, a));
}

export function wrap180(x_deg: number): number {
  return pymod(x_deg + 180.0, 360.0) - 180.0;
}

/** Share of the Sun's disc above the terrain and not behind Earth (the listing in BUILD_PLAN.md). */
export function sun_fraction(
  mask: Mask, az_s: number, el_s: number, r_sun: number, az_e: number, el_e: number, r_earth: number,
): number {
  const cos_el = Math.max(Math.cos(el_s * D2R), 1e-9);
  const delta = wrap180(az_e - az_s) * cos_el;
  let visible = 0.0;
  let total = 0.0;
  for (let i = 0; i < 15; i++) {
    const x = r_sun * ((2.0 * (i + 0.5)) / 15.0 - 1.0);
    const c = Math.sqrt(Math.max(0.0, r_sun * r_sun - x * x));
    const h = horizon_at(mask, az_s + x / cos_el);
    const lo = Math.max(el_s - c, h);
    const hi = el_s + c;
    let lit = Math.max(0.0, hi - lo);
    if (Math.abs(x - delta) < r_earth) {
      const ce = Math.sqrt(r_earth * r_earth - (x - delta) * (x - delta));
      lit = lit - overlap(lo, hi, el_e - ce, el_e + ce);
    }
    visible += Math.max(0.0, lit);
    total += 2.0 * c;
  }
  return visible / total;
}

/** Share of a disc above the terrain, with no occluder (used for Earth's disc). */
export function disc_fraction(mask: Mask, az: number, el: number, r: number): number {
  const cos_el = Math.max(Math.cos(el * D2R), 1e-9);
  let visible = 0.0;
  let total = 0.0;
  for (let i = 0; i < 15; i++) {
    const x = r * ((2.0 * (i + 0.5)) / 15.0 - 1.0);
    const c = Math.sqrt(Math.max(0.0, r * r - x * x));
    const h = horizon_at(mask, az + x / cos_el);
    visible += Math.max(0.0, el + c - Math.max(el - c, h));
    total += 2.0 * c;
  }
  return visible / total;
}

/**
 * 'blocked' if the station is at or below the terrain or the Moon is under the limit at the
 * station; 'grazing' if the station is less than grazing_deg above the terrain; else 'clear'.
 */
export function station_contact(
  station_el_deg: number, terrain_el_deg: number, moon_el_at_station_deg: number,
  min_moon_el_deg = 10.0, grazing_deg = 2.0,
): Grade {
  if (station_el_deg <= terrain_el_deg || moon_el_at_station_deg < min_moon_el_deg) return 'blocked';
  if (station_el_deg - terrain_el_deg < grazing_deg) return 'grazing';
  return 'clear';
}

// ---------------------------------------------------------------------------------------------
// Rules, sampling, events, metrics and verdicts
// ---------------------------------------------------------------------------------------------

export interface Rules {
  stay_s: number;
  observer_height_m: number;
  max_dark_s: number;
  max_gap_s: number;
  lit_threshold: number;
  min_moon_el_deg: number;
  grazing_deg: number;
  contact_mode: 'stations' | 'earth';
  load_w: number;
  depth_of_discharge: number;
  efficiency: number;
  weights: [number, number, number];
  thin_margin: number;
}

export function makeRules(over: Partial<Rules> = {}): Rules {
  return {
    stay_s: 14 * 86400.0,
    observer_height_m: 2.0,
    max_dark_s: 2 * 3600.0,
    max_gap_s: 12 * 3600.0,
    lit_threshold: 0.5,
    min_moon_el_deg: 10.0,
    grazing_deg: 2.0,
    contact_mode: 'stations',
    load_w: 100.0,
    depth_of_discharge: 0.8,
    efficiency: 0.9,
    weights: [0.5, 0.3, 0.2],
    thin_margin: 0.75,
    ...over,
  };
}

export type PresetId = 'robotic' | 'crew' | 'long';
export const PRESETS: Record<PresetId, Rules> = {
  robotic: makeRules({ stay_s: 14 * 86400.0, observer_height_m: 2.0, max_dark_s: 2 * 3600.0, max_gap_s: 12 * 3600.0 }),
  crew: makeRules({ stay_s: 6.5 * 86400.0, observer_height_m: 10.0, max_dark_s: 0.0, max_gap_s: 2 * 3600.0 }),
  long: makeRules({ stay_s: 30 * 86400.0, observer_height_m: 10.0, max_dark_s: 100 * 3600.0, max_gap_s: 24 * 3600.0 }),
};
export const PRESET_LABELS: Record<PresetId, string> = {
  robotic: 'Robotic lander',
  crew: 'Crew sortie',
  long: 'Long stay',
};

export interface Sample {
  t_s: number;
  sun_az_deg: number;
  sun_el_deg: number;
  sun_r_deg: number;
  earth_az_deg: number;
  earth_el_deg: number;
  earth_r_deg: number;
  sun_frac: number;
  earth_frac: number;
  /** Best station grade, or Earth-in-view grade in "earth" mode. */
  contact: Grade;
  stations: Record<StationName, Grade>;
}

export function sample_at(table: Table, t_s: number, site: ArrayLike<number>, frame: Frame, mask: Mask, rules: Rules): Sample {
  const row = interp(table, t_s);
  const s = az_el(row, site, frame, 0);
  const e = az_el(row, site, frame, 3);
  const r_s = angular_radius(SUN_RADIUS_KM, s.dist_km);
  const r_e = angular_radius(EARTH_RADIUS_KM, e.dist_km);
  const sf = sun_fraction(mask, s.az_deg, s.el_deg, r_s, e.az_deg, e.el_deg, r_e);
  const ef = disc_fraction(mask, e.az_deg, e.el_deg, r_e);
  const stations = {} as Record<StationName, Grade>;
  let best: Grade = 'blocked';
  for (let k = 0; k < STATION_NAMES.length; k++) {
    const st = az_el(row, site, frame, 6 + 3 * k);
    const g = station_contact(st.el_deg, horizon_at(mask, st.az_deg), row[15 + k], rules.min_moon_el_deg, rules.grazing_deg);
    stations[STATION_NAMES[k]] = g;
    if (CONTACT_RANK[g] > CONTACT_RANK[best]) best = g;
  }
  if (rules.contact_mode === 'earth') best = ef > 0.0 ? 'clear' : 'blocked';
  return {
    t_s, sun_az_deg: s.az_deg, sun_el_deg: s.el_deg, sun_r_deg: r_s,
    earth_az_deg: e.az_deg, earth_el_deg: e.el_deg, earth_r_deg: r_e,
    sun_frac: sf, earth_frac: ef, contact: best, stations,
  };
}

/** Time where f changes from state_a, refined until the bracket is at most 60 s wide. */
export function bisect_event(f: (t: number) => boolean, t_a: number, t_b: number, state_a: boolean): number {
  while (t_b - t_a > EVENT_RESOLUTION_S) {
    const t_m = 0.5 * (t_a + t_b);
    if (f(t_m) === state_a) t_a = t_m;
    else t_b = t_m;
  }
  return 0.5 * (t_a + t_b);
}

export interface LightEvent { t_s: number; to: boolean }

/** Every change of state in a sampled series, refined by bisection. Each event: t_s, to (new state). */
export function events(times_s: ArrayLike<number>, states: ArrayLike<boolean>, f: (t: number) => boolean): LightEvent[] {
  const out: LightEvent[] = [];
  for (let k = 1; k < states.length; k++) {
    if (states[k] !== states[k - 1]) {
      const t = bisect_event(f, times_s[k - 1], times_s[k], states[k - 1]);
      out.push({ t_s: t, to: Boolean(states[k]) });
    }
  }
  return out;
}

/** Intervals inside [start, end] where the state equals `want`. */
export function spells(start_s: number, end_s: number, state0: boolean, evs: LightEvent[], want: boolean): [number, number][] {
  const out: [number, number][] = [];
  let cur = state0;
  let t0 = start_s;
  for (const e of evs) {
    if (cur === want) out.push([t0, e.t_s]);
    cur = e.to;
    t0 = e.t_s;
  }
  if (cur === want) out.push([t0, end_s]);
  return out;
}

export interface Metrics {
  n_samples: number;
  lit_share: number;
  mean_sun_fraction: number;
  min_sun_fraction: number;
  contact_share: number;
  grazing_share: number;
  longest_dark_s: number;
  longest_gap_s: number;
  next_sunset_s: number | null;
  next_sunrise_s: number | null;
  next_earthset_s: number | null;
  next_earthrise_s: number | null;
  next_contact_loss_s: number | null;
  sun_el_now_deg: number;
  sun_az_now_deg: number;
  earth_el_now_deg: number;
  battery_kwh: number;
  score: number;
  lit_events: LightEvent[];
  contact_events: LightEvent[];
  earth_events: LightEvent[];
}

export interface WindowResult { metrics: Metrics; samples: Sample[] }

/**
 * Metrics for one site over [start_s, end_s] (seconds after the table's first row), plus the
 * 10-minute samples they were computed from. window_metrics() returns only the metrics.
 * The site's ground height is h_m; the observer stands rules.observer_height_m above it.
 */
export function window_compute(
  table: Table, lat_deg: number, lon_deg: number, h_m: number, mask: Mask, start_s: number, end_s: number, rules: Rules,
): WindowResult {
  const site = site_vector(lat_deg, lon_deg, h_m + rules.observer_height_m);
  const frame = local_frame(lat_deg, lon_deg);
  const n = Math.floor((end_s - start_s) / SAMPLE_STEP_S) + 1;
  const times: number[] = [];
  for (let k = 0; k < n; k++) times.push(start_s + k * SAMPLE_STEP_S);
  const samples = times.map((t) => sample_at(table, t, site, frame, mask, rules));

  const is_lit = (t: number) => sample_at(table, t, site, frame, mask, rules).sun_frac >= rules.lit_threshold;
  const has_contact = (t: number) => sample_at(table, t, site, frame, mask, rules).contact !== 'blocked';
  const earth_up = (t: number) => sample_at(table, t, site, frame, mask, rules).earth_frac > 0.0;

  const lit = samples.map((s) => s.sun_frac >= rules.lit_threshold);
  const con = samples.map((s) => s.contact !== 'blocked');
  const eup = samples.map((s) => s.earth_frac > 0.0);
  const lit_ev = events(times, lit, is_lit);
  const con_ev = events(times, con, has_contact);
  const eup_ev = events(times, eup, earth_up);
  const t_end = times[times.length - 1];

  const dark = spells(start_s, t_end, lit[0], lit_ev, false);
  const gaps = spells(start_s, t_end, con[0], con_ev, false);
  let longest_dark_s = 0.0;
  if (dark.length) longest_dark_s = Math.max(...dark.map(([a, b]) => b - a));
  let longest_gap_s = 0.0;
  if (gaps.length) longest_gap_s = Math.max(...gaps.map(([a, b]) => b - a));

  const first = (evs: LightEvent[], to: boolean): number | null => {
    for (const e of evs) if (e.to === to) return e.t_s - start_s;
    return null;
  };

  let sumSun = 0.0;
  for (const s of samples) sumSun += s.sun_frac;
  const mean_sun = sumSun / n;
  const count = (xs: boolean[]) => xs.reduce((a, b) => a + (b ? 1 : 0), 0);
  const lit_share = count(lit) / n;
  const contact_share = count(con) / n;
  const grazing_share = samples.reduce((a, s) => a + (s.contact === 'grazing' ? 1 : 0), 0) / n;
  const stay_s = Math.max(t_end - start_s, 1.0);
  const [w_s, w_e, w_n] = rules.weights;
  let score = 100.0 * (w_s * mean_sun + w_e * contact_share - (w_n * longest_dark_s) / stay_s);
  score = Math.max(0.0, Math.min(100.0, score));
  const battery_kwh =
    (rules.load_w * (longest_dark_s / 3600.0)) / (rules.depth_of_discharge * rules.efficiency) / 1000.0;
  let min_frac = Infinity;
  for (const s of samples) min_frac = Math.min(min_frac, s.sun_frac);
  const metrics: Metrics = {
    n_samples: n,
    lit_share,
    mean_sun_fraction: mean_sun,
    min_sun_fraction: min_frac,
    contact_share,
    grazing_share,
    longest_dark_s,
    longest_gap_s,
    next_sunset_s: lit[0] ? first(lit_ev, false) : null,
    next_sunrise_s: !lit[0] ? first(lit_ev, true) : null,
    next_earthset_s: eup[0] ? first(eup_ev, false) : null,
    next_earthrise_s: !eup[0] ? first(eup_ev, true) : null,
    next_contact_loss_s: con[0] ? first(con_ev, false) : null,
    sun_el_now_deg: samples[0].sun_el_deg,
    sun_az_now_deg: samples[0].sun_az_deg,
    earth_el_now_deg: samples[0].earth_el_deg,
    battery_kwh,
    score,
    lit_events: lit_ev,
    contact_events: con_ev,
    earth_events: eup_ev,
  };
  return { metrics, samples };
}

export function window_metrics(
  table: Table, lat_deg: number, lon_deg: number, h_m: number, mask: Mask, start_s: number, end_s: number, rules: Rules,
): Metrics {
  return window_compute(table, lat_deg, lon_deg, h_m, mask, start_s, end_s, rules).metrics;
}

/**
 * Python's `format(x, '.Nf')` for N = 0 or 1. JS toFixed rounds exact ties up, Python rounds them
 * to even; ties are only possible when x * 2 * 10^N is an odd integer (exact in binary).
 */
export function pyFixed(x: number, digits: 0 | 1): string {
  const tie = digits === 0 ? x * 2 : x * 4; // exact multiplications by powers of two
  if (Number.isInteger(tie) && Math.abs(tie) % 2 === 1) {
    const y = x * 10 ** digits; // exact for these ties
    const fl = Math.floor(y);
    const even = fl % 2 === 0 ? fl : fl + 1;
    return (even / 10 ** digits).toFixed(digits);
  }
  return x.toFixed(digits);
}

export const LONG_DURATION_S = 48 * 3600.0;

/** "4.5 h"; over 48 hours also in days: "13.0 days (311.6 h)". Same text as format_hours in light.py. */
export function formatHoursText(s: number): string {
  const hours = `${pyFixed(s / 3600.0, 1)} h`;
  return s > LONG_DURATION_S ? `${pyFixed(s / 86400.0, 1)} days (${hours})` : hours;
}

const _hours = formatHoursText;

export type VerdictKind = 'go' | 'marginal' | 'no-go';
export interface Verdict { verdict: VerdictKind; reason: string }

/** 'no-go' if any rule fails; 'marginal' if all pass but a margin is thin; 'go' otherwise. */
export function verdict(metrics: Metrics, rules: Rules): Verdict {
  const dark = metrics.longest_dark_s;
  const gap = metrics.longest_gap_s;
  const fails: string[] = [];
  if (dark > rules.max_dark_s) {
    if (rules.max_dark_s === 0.0) {
      fails.push(`The Sun sets for up to ${_hours(dark)}; this scenario needs continuous sunlight.`);
    } else {
      fails.push(`Longest darkness is ${_hours(dark)}, over the ${_hours(rules.max_dark_s)} limit.`);
    }
  }
  if (gap > rules.max_gap_s) {
    fails.push(`Longest gap in Earth contact is ${_hours(gap)}, over the ${_hours(rules.max_gap_s)} limit.`);
  }
  if (fails.length) return { verdict: 'no-go', reason: fails.join(' ') };
  const thin: string[] = [];
  if (rules.max_dark_s > 0.0 && dark > rules.thin_margin * rules.max_dark_s) {
    thin.push(`Longest darkness of ${_hours(dark)} is close to the ${_hours(rules.max_dark_s)} limit.`);
  }
  if (rules.max_dark_s === 0.0 && metrics.min_sun_fraction < 0.75) {
    thin.push(
      `The Sun stays up, but at times only ${pyFixed(100 * metrics.min_sun_fraction, 0)}% of its disc clears the terrain.`,
    );
  }
  if (rules.max_gap_s > 0.0 && gap > rules.thin_margin * rules.max_gap_s) {
    thin.push(`Longest contact gap of ${_hours(gap)} is close to the ${_hours(rules.max_gap_s)} limit.`);
  }
  if (metrics.contact_share > 0 && metrics.grazing_share > 0.5 * metrics.contact_share) {
    thin.push('Earth contact is mostly at grazing angles, where links fade.');
  }
  if (thin.length) return { verdict: 'marginal', reason: thin.join(' ') };
  return { verdict: 'go', reason: 'Sunlight and Earth contact meet every rule with margin.' };
}

/** Passing points inside the radius divided by all points inside the radius (NaN if none). */
export function miss_share(point_passes: ArrayLike<boolean>, east_m: ArrayLike<number>, north_m: ArrayLike<number>, radius_m: number): number {
  if (point_passes.length !== east_m.length || east_m.length !== north_m.length) {
    throw new Error('miss_share: arrays differ in length');
  }
  let inside = 0;
  let pass = 0;
  for (let i = 0; i < point_passes.length; i++) {
    if (Math.hypot(east_m[i], north_m[i]) <= radius_m + 1e-9) {
      inside += 1;
      if (point_passes[i]) pass += 1;
    }
  }
  if (!inside) return NaN;
  return pass / inside;
}
