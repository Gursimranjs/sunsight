// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Countdowns at any moment of the window, read straight from the event lists of window_metrics,
// so the numbers on screen are the event times.
import type { LightEvent, Metrics } from './light';

/** State at t_s: the starting state flipped by every event at or before t_s. */
export function stateAt(state0: boolean, evs: LightEvent[], t_s: number): boolean {
  let s = state0;
  for (const e of evs) {
    if (e.t_s <= t_s) s = e.to;
    else break;
  }
  return s;
}

/** First event strictly after t_s that switches to `to`, or null. */
export function nextEvent(evs: LightEvent[], t_s: number, to: boolean): LightEvent | null {
  for (const e of evs) if (e.t_s > t_s && e.to === to) return e;
  return null;
}

export interface Countdown {
  /** Is the body / state up (lit, Earth in view, in contact) now? */
  up: boolean;
  /** Seconds until it changes, or null if it does not change before the window ends. */
  in_s: number | null;
  /** Absolute event time in seconds after row 0, or null. */
  at_s: number | null;
}

export function countdown(state0: boolean, evs: LightEvent[], t_s: number): Countdown {
  const up = stateAt(state0, evs, t_s);
  const e = nextEvent(evs, t_s, !up);
  return { up, in_s: e ? e.t_s - t_s : null, at_s: e ? e.t_s : null };
}

export interface Countdowns { sun: Countdown; earth: Countdown; contact: Countdown }

/**
 * Sunset/sunrise, Earthset/Earthrise and contact countdowns at t_s for a window that starts at
 * start_s. state0 values are the states of the first 10-minute sample.
 */
export function countdownsAt(
  m: Metrics, start: { lit0: boolean; earth0: boolean; contact0: boolean }, t_s: number,
): Countdowns {
  return {
    sun: countdown(start.lit0, m.lit_events, t_s),
    earth: countdown(start.earth0, m.earth_events, t_s),
    contact: countdown(start.contact0, m.contact_events, t_s),
  };
}
