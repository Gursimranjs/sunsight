// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Note 003 part D: when the 3D view uses a fill light, where it jumps on opening, and how Play steps.
import { describe, expect, it } from 'vitest';
import {
  firstLitJump_s, needsFillLight, nextPlayOffset_s, PLAY_SWEEP_MS, PLAY_TICK_MS, playStep_s, TIME3D_STEP_S,
} from '../../src/views/hero3dTime';

function series(sun_frac: number[], sun_el_deg: number[], start_s: number, step_s = 600) {
  return {
    t_s: Float64Array.from(sun_frac.map((_, i) => start_s + i * step_s)),
    sun_frac: Float64Array.from(sun_frac),
    sun_el_deg: Float64Array.from(sun_el_deg),
    sun_r_deg: Float64Array.from(sun_frac.map(() => 0.27)),
  };
}

describe('needsFillLight', () => {
  it('is on when the whole disc is below the level horizon', () => {
    expect(needsFillLight({ el_deg: -0.3, r_deg: 0.27 }, null)).toBe(true);
    expect(needsFillLight({ el_deg: -0.3, r_deg: 0.27 }, 0.4)).toBe(true);
  });
  it('is on when no part of the disc is visible above the terrain horizon', () => {
    expect(needsFillLight({ el_deg: 1.2, r_deg: 0.27 }, 0)).toBe(true);
  });
  it('is off while any part of the Sun is up', () => {
    expect(needsFillLight({ el_deg: 1.2, r_deg: 0.27 }, 0.01)).toBe(false);
    expect(needsFillLight({ el_deg: -0.2, r_deg: 0.27 }, null)).toBe(false);
    expect(needsFillLight({ el_deg: 3, r_deg: 0.27 }, 1)).toBe(false);
  });
});

describe('firstLitJump_s', () => {
  const start_s = 86_400;
  it('jumps from a dark moment to the first lit sample of the stay', () => {
    const s = series([0, 0, 0.2, 0.6, 1, 0], [-1, -0.5, 0.1, 0.3, 0.5, -1], start_s);
    expect(firstLitJump_s(s, start_s, 0, 0.5)).toBe(1800);
  });
  it('does not jump when the selected moment already shows the Sun', () => {
    const s = series([0.3, 0, 0.6], [0.2, -1, 0.5], start_s);
    expect(firstLitJump_s(s, start_s, 0, 0.5)).toBeNull();
  });
  it('does not jump when the whole stay is dark', () => {
    const s = series([0, 0, 0], [-1, -1, -1], start_s);
    expect(firstLitJump_s(s, start_s, 600, 0.5)).toBeNull();
  });
  it('uses the sample nearest the selected time', () => {
    const s = series([1, 0, 0, 1], [1, -1, -1, 1], start_s);
    expect(firstLitJump_s(s, start_s, 650, 0.5)).toBe(0);
    expect(firstLitJump_s(s, start_s, 250, 0.5)).toBeNull();
  });
  it('ignores a series that belongs to another start date', () => {
    const s = series([0, 1], [-1, 1], start_s + 3600);
    expect(firstLitJump_s(s, start_s, 0, 0.5)).toBeNull();
  });
  it('ignores an empty series', () => {
    expect(firstLitJump_s(series([], [], start_s), start_s, 0, 0.5)).toBeNull();
  });
});

describe('Play steps', () => {
  it('sweeps a 14-day stay in about the sweep time, in whole slider steps', () => {
    const stay_s = 14 * 86_400;
    const step_s = playStep_s(stay_s);
    expect(step_s % TIME3D_STEP_S).toBe(0);
    const ticks = Math.ceil(stay_s / step_s);
    const sweep_ms = ticks * PLAY_TICK_MS;
    expect(sweep_ms).toBeGreaterThan(0.75 * PLAY_SWEEP_MS);
    expect(sweep_ms).toBeLessThanOrEqual(1.25 * PLAY_SWEEP_MS);
  });
  it('never steps by less than one slider step', () => {
    expect(playStep_s(3600)).toBe(TIME3D_STEP_S);
  });
  it('stops exactly at the end of the stay', () => {
    expect(nextPlayOffset_s(0, 7200, 3000)).toBe(3000);
    expect(nextPlayOffset_s(6000, 7200, 3000)).toBe(7200);
    expect(nextPlayOffset_s(7200, 7200, 3000)).toBe(7200);
  });
});
