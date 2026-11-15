// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Time logic for the 3D view (note 003 part D): when the scene needs a fill light because the Sun is
// down, where the view jumps when it opens on a dark moment, and how the Play button steps the time.
// Pure functions, so unit tests call them directly.
import type { Series } from '../engine/compute';

/** The 3D card's time slider moves in steps of this many seconds (one engine sample). */
export const TIME3D_STEP_S = 600;
/** Play advances the time once per tick. */
export const PLAY_TICK_MS = 100;
/** Play sweeps a whole stay in about this long. */
export const PLAY_SWEEP_MS = 20_000;

export const FILL_LIGHT_LABEL = 'Sun below the horizon: terrain shown with a faint fill light';

/**
 * True when the Sun lights nothing at the selected moment, so the scene adds a faint fill light: the
 * whole disc is under the level horizon, or the horizon engine sees none of the disc (sunFrac 0).
 * `sunFrac` is null when the engine has no answer yet.
 */
export function needsFillLight(sunLevel: { el_deg: number; r_deg: number }, sunFrac: number | null): boolean {
  return sunLevel.el_deg + sunLevel.r_deg < 0 || sunFrac === 0;
}

type SunSeries = Pick<Series, 't_s' | 'sun_frac' | 'sun_el_deg' | 'sun_r_deg'>;

/**
 * Where the 3D view jumps when it opens: if the sample nearest the selected moment is dark (as
 * `needsFillLight` defines it), the offset of the stay's first lit sample (visible share at least
 * `lit_threshold`); otherwise, or when no sample is lit, null. A series for another start is ignored.
 */
export function firstLitJump_s(s: SunSeries, start_s: number, t_off_s: number, lit_threshold: number): number | null {
  const n = s.t_s.length;
  if (n === 0 || Math.abs(s.t_s[0] - start_s) >= 1) return null;
  const step_s = n > 1 ? s.t_s[1] - s.t_s[0] : TIME3D_STEP_S;
  const i = Math.max(0, Math.min(n - 1, Math.round((start_s + t_off_s - s.t_s[0]) / step_s)));
  if (!needsFillLight({ el_deg: s.sun_el_deg[i], r_deg: s.sun_r_deg[i] }, s.sun_frac[i])) return null;
  for (let k = 0; k < n; k++) {
    if (s.sun_frac[k] > 0 && s.sun_frac[k] >= lit_threshold) return s.t_s[k] - start_s;
  }
  return null;
}

/** Seconds Play adds per tick: whole slider steps, so a stay takes about PLAY_SWEEP_MS. */
export function playStep_s(stay_s: number): number {
  const raw_s = (stay_s * PLAY_TICK_MS) / PLAY_SWEEP_MS;
  return Math.max(TIME3D_STEP_S, Math.round(raw_s / TIME3D_STEP_S) * TIME3D_STEP_S);
}

/** The next offset while playing, stopping exactly at the end of the stay. */
export function nextPlayOffset_s(t_off_s: number, stay_s: number, step_s: number): number {
  return Math.min(stay_s, t_off_s + step_s);
}
