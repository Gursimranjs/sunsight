// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// "Play the stay": the playhead runs the whole stay in about 8 s, three speeds, Space toggles, arrow keys
// step 10 minutes. With prefers-reduced-motion, Play moves in coarse steps instead of a smooth run.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Series } from '../engine/compute';
import { formatUtc } from '../format';
import { runs } from '../views/Timeline';

/** The engine's sample step; the playhead always sits on it. */
export const TIME_STEP_S = 600;
/** The whole stay at the normal speed. */
export const PLAY_DURATION_MS = 8000;
export const PLAY_SPEEDS = [{ label: 'Slow', x: 0.5 }, { label: 'Normal', x: 1 }, { label: 'Fast', x: 2 }] as const;
/** Reduced motion: the stay in this many jumps, one every REDUCED_TICK_MS. */
const REDUCED_STEPS = 16;
const REDUCED_TICK_MS = 500;

const snap = (t_s: number) => Math.round(t_s / TIME_STEP_S) * TIME_STEP_S;

/** Playhead after `elapsed_ms` of play that started at t0_s, at speed x (1 = the stay in PLAY_DURATION_MS). */
export function playAt(t0_s: number, stay_s: number, elapsed_ms: number, x: number): number {
  return Math.min(stay_s, Math.max(0, snap(t0_s + (elapsed_ms * x * stay_s) / PLAY_DURATION_MS)));
}

/** One arrow-key step from t_s (dir +1 or -1), on the 10-minute grid, inside [0, stay_s]. */
export function stepTime(t_s: number, stay_s: number, dir: 1 | -1): number {
  const base = Math.floor(t_s / TIME_STEP_S) * TIME_STEP_S;
  const next = dir > 0 ? base + TIME_STEP_S : (base === t_s ? base - TIME_STEP_S : base);
  return Math.max(0, Math.min(stay_s, next));
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const typing = (el: EventTarget | null) => el instanceof HTMLElement && (/^(INPUT|SELECT|TEXTAREA|BUTTON|A|SUMMARY)$/.test(el.tagName) || el.isContentEditable);

interface Props {
  t_off_s: number;
  stay_s: number;
  /** Unix ms of the stay's start. */
  startMs: number;
  series: Series | null;
  lit_threshold: number;
  onTime: (t_off_s: number) => void;
}

/** Lit and contact strips under the playhead: one row each, from the engine's series. */
function Strips({ series, lit_threshold }: { series: Series; lit_threshold: number }) {
  const n = series.t_s.length;
  const lit = Array.from(series.sun_frac, (f) => (f >= lit_threshold ? 1 : 0));
  const w = (r: { a: number; b: number }) => (100 * (r.b - r.a)) / Math.max(1, n);
  const row = (vals: ArrayLike<number>, y: number, col: string) => runs(vals).filter((r) => r.v > 0).map((r) => (
    <rect key={`${y}-${r.a}`} x={(100 * r.a) / Math.max(1, n)} y={y} width={w(r)} height={4} fill={col} />
  ));
  return (
    <svg class="hz-strips" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
      <rect x="0" y="0" width="100" height="4" fill="var(--hz-ground-shade, #8E8A82)" />
      <rect x="0" y="6" width="100" height="4" fill="var(--hz-ground-shade, #8E8A82)" />
      {row(lit, 0, 'var(--hz-sun, #FFD27A)')}
      {row(series.contact, 6, 'var(--hz-earth, #4F8FD6)')}
    </svg>
  );
}

export function PlayBar({ t_off_s, stay_s, startMs, series, lit_threshold, onTime }: Props) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  /** Read by the timers: a pause renders before the effect's cleanup runs, so a late tick must not move time. */
  const playingRef = useRef(false);
  playingRef.current = playing;
  const tRef = useRef(t_off_s);
  tRef.current = t_off_s;
  const onTimeRef = useRef(onTime);
  onTimeRef.current = onTime;

  useEffect(() => {
    if (!playing) return;
    const t0 = tRef.current >= stay_s ? 0 : tRef.current;
    const x = PLAY_SPEEDS[speed].x;
    if (reducedMotion()) {
      const jump = Math.max(TIME_STEP_S, snap(stay_s / REDUCED_STEPS));
      let t = t0;
      onTimeRef.current(t);
      const id = setInterval(() => {
        if (!playingRef.current) return;
        t = Math.min(stay_s, t + jump);
        onTimeRef.current(t);
        if (t >= stay_s) setPlaying(false);
      }, REDUCED_TICK_MS / x);
      return () => clearInterval(id);
    }
    let raf = 0;
    const started = performance.now();
    const frame = (nowMs: number) => {
      if (!playingRef.current) return;
      const t = playAt(t0, stay_s, nowMs - started, x);
      if (t !== tRef.current) onTimeRef.current(t);
      if (t >= stay_s) { setPlaying(false); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, stay_s]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (typing(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === ' ') { e.preventDefault(); playingRef.current = !playingRef.current; setPlaying(playingRef.current); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        playingRef.current = false;
        setPlaying(false);
        onTimeRef.current(stepTime(tRef.current, stay_s, e.key === 'ArrowRight' ? 1 : -1));
      }
    };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, [stay_s]);

  const d = Math.floor(t_off_s / 86400);
  const hh = Math.floor((t_off_s % 86400) / 3600), mm = Math.floor((t_off_s % 3600) / 60);
  const into = `day ${d}, ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} into the stay`;
  const clock = formatUtc(startMs + t_off_s * 1000);
  return (
    <div class="hz-playbar">
      <button type="button" class="hz-play" data-testid="hz-play" aria-pressed={playing} onClick={() => { playingRef.current = !playingRef.current; setPlaying(playingRef.current); }}>
        <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span> {playing ? 'Pause' : 'Play the stay'}
      </button>
      <div class="hz-track">
        <input type="range" aria-label="Time in the stay" min={0} max={stay_s} step={TIME_STEP_S} value={t_off_s}
          aria-valuetext={`${clock}, ${into}`}
          onInput={(e) => { playingRef.current = false; setPlaying(false); onTime(Number((e.target as HTMLInputElement).value)); }} />
        {series && <Strips series={series} lit_threshold={lit_threshold} />}
      </div>
      <output class="hz-clock" data-testid="hz-clock">{clock} · {into}</output>
      <label class="hz-speed">
        <span>Speed</span>
        <select value={speed} onChange={(e) => setSpeed(Number((e.target as HTMLSelectElement).value))}>
          {PLAY_SPEEDS.map((s, i) => <option key={s.label} value={i}>{s.label}</option>)}
        </select>
      </label>
    </div>
  );
}
