// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// "Play the stay": the playhead runs the whole stay in about 8 s, three speeds, Space toggles, arrow keys
// step 10 minutes. With prefers-reduced-motion, Play is a stepped slider: it moves in coarse jumps on a
// timer, and only after the user pressed Play.
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
export const REDUCED_STEPS = 16;
const REDUCED_TICK_MS = 500;
const DAY_S = 86400;

const snap = (t_s: number) => Math.round(t_s / TIME_STEP_S) * TIME_STEP_S;

/** Playhead after `elapsed_ms` of play that started at t0_s, at speed x (1 = the stay in PLAY_DURATION_MS). */
export function playAt(t0_s: number, stay_s: number, elapsed_ms: number, x: number): number {
  return Math.min(stay_s, Math.max(0, snap(t0_s + (elapsed_ms * x * stay_s) / PLAY_DURATION_MS)));
}

/** One arrow-key step from t_s (dir +1 or -1), on the 10-minute grid, inside [0, stay_s]. */
export function stepTime(t_s: number, stay_s: number, dir: 1 | -1): number {
  const base_s = Math.floor(t_s / TIME_STEP_S) * TIME_STEP_S;
  const next_s = dir > 0 ? base_s + TIME_STEP_S : (base_s === t_s ? base_s - TIME_STEP_S : base_s);
  return Math.max(0, Math.min(stay_s, next_s));
}

/** One reduced-motion jump of the playhead, s: the stay in REDUCED_STEPS, on the 10-minute grid. */
export function reducedJump_s(stay_s: number): number {
  return Math.max(TIME_STEP_S, snap(stay_s / REDUCED_STEPS));
}

/** "day 2, 06:30 into the stay". */
export function intoStay(t_off_s: number): string {
  const day_n = Math.floor(t_off_s / DAY_S);
  const hours_h = Math.floor((t_off_s % DAY_S) / 3600), minutes_min = Math.floor((t_off_s % 3600) / 60);
  return `day ${day_n}, ${String(hours_h).padStart(2, '0')}:${String(minutes_min).padStart(2, '0')} into the stay`;
}

/** Controls that own their keys: the play bar's page-wide shortcuts leave them alone. */
const OWN_KEYS = '[role=region][tabindex],[role=slider],[role=application],[role=dialog],[role=menu],[role=listbox],dialog,canvas,input,select,textarea,a[href],summary,[contenteditable=""],[contenteditable=true]';

/**
 * True when a page-wide Space or arrow key should not move the playhead: another handler already used
 * it, a modifier is held, or focus is on a control that owns those keys (a slider, the 3D canvas, a
 * form field, a dialog, a link, a scrollable table region, or any button other than Play; Space on Play is
 * the button's own click). Otherwise the keys belong to the play bar only when focus is on the page body
 * or inside the play bar or the hero; anywhere else (a focusable region, a table) the browser keeps them.
 */
export function ignorePlayKey(e: Pick<KeyboardEvent, 'defaultPrevented' | 'altKey' | 'ctrlKey' | 'metaKey' | 'key' | 'target'>): boolean {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return true;
  const t = e.target as { closest?: (sel: string) => Element | null; isContentEditable?: boolean } | null;
  if (!t || typeof t.closest !== 'function') return false;
  if (t.isContentEditable || t.closest(OWN_KEYS)) return true;
  const b = t.closest('button');
  if (b) return !b.classList.contains('hz-play') || e.key === ' ' || e.key === 'Enter';
  if (typeof (t as Element).matches === 'function' && (t as Element).matches('body,html')) return false;
  return !t.closest('.hz-playbar,.hz-hero');
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Props {
  t_off_s: number;
  stay_s: number;
  /** Unix ms of the stay's start. */
  startMs: number;
  series: Series | null;
  lit_threshold: number;
  onTime: (t_off_s: number) => void;
}

/** Lit and contact strips under the playhead: one row each, from the engine's series, with visible labels. */
function Strips({ series, lit_threshold }: { series: Series; lit_threshold: number }) {
  const n = series.t_s.length;
  const lit = Array.from(series.sun_frac, (f) => (f >= lit_threshold ? 1 : 0));
  const w = (r: { a: number; b: number }) => (100 * (r.b - r.a)) / Math.max(1, n);
  const row = (vals: ArrayLike<number>, col: string, cls: string) => (
    <svg class={`hz-strip-row ${cls}`} viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true">
      {/* Off: ink, so the Sun (12.6:1) and Earth (5.3:1) runs stand out on any surface (WCAG 1.4.11). */}
      <rect x="0" y="0" width="100" height="4" fill="var(--hz-ink, #17181A)" />
      {runs(vals).filter((r) => r.v > 0).map((r) => (
        <rect key={r.a} x={(100 * r.a) / Math.max(1, n)} y={0} width={w(r)} height={4} fill={col} />
      ))}
    </svg>
  );
  return (
    <>
      <span class="hz-strip-k" aria-hidden="true">Lit</span>
      {row(lit, 'var(--hz-sun, #FFD27A)', 'hz-strip-lit')}
      <span class="hz-strip-k" aria-hidden="true">Contact</span>
      {row(series.contact, 'var(--hz-earth, #4F8FD6)', 'hz-strip-contact')}
    </>
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
    const t0_s = tRef.current >= stay_s ? 0 : tRef.current;
    const x = PLAY_SPEEDS[speed].x;
    if (reducedMotion()) {
      // Stepped slider: one jump now (the user's press), then one per tick until the end or a pause.
      const jump_s = reducedJump_s(stay_s);
      let t_s = t0_s;
      onTimeRef.current(t_s);
      const id = setInterval(() => {
        if (!playingRef.current) return;
        t_s = Math.min(stay_s, t_s + jump_s);
        onTimeRef.current(t_s);
        if (t_s >= stay_s) setPlaying(false);
      }, REDUCED_TICK_MS / x);
      return () => clearInterval(id);
    }
    let raf = 0;
    const started_ms = performance.now();
    const frame = (now_ms: number) => {
      if (!playingRef.current) return;
      const t_s = playAt(t0_s, stay_s, now_ms - started_ms, x);
      if (t_s !== tRef.current) onTimeRef.current(t_s);
      if (t_s >= stay_s) { setPlaying(false); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, stay_s]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (ignorePlayKey(e)) return;
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

  const into = intoStay(t_off_s);
  const clock = formatUtc(startMs + t_off_s * 1000);
  return (
    <div class="hz-playbar">
      <button type="button" class="hz-play" data-testid="hz-play" aria-pressed={playing}
        onClick={() => { playingRef.current = !playingRef.current; setPlaying(playingRef.current); }}>
        <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span> {playing ? 'Pause' : 'Play the stay'}
      </button>
      <div class="hz-track">
        <span class="hz-strip-k" aria-hidden="true" />
        <input type="range" aria-label="Time in the stay" min={0} max={stay_s} step={TIME_STEP_S} value={t_off_s}
          aria-valuetext={`${clock}, ${into}`}
          onInput={(e) => { playingRef.current = false; setPlaying(false); onTime(Number((e.target as HTMLInputElement).value)); }} />
        {series && <Strips series={series} lit_threshold={lit_threshold} />}
      </div>
      {/* Not a live region: during Play it changes many times a second. The slider's value text carries it. */}
      <p class="hz-clock" data-testid="hz-clock" aria-live="off">{clock} · {into}</p>
      <label class="hz-speed">
        <span>Speed</span>
        <select value={speed} onChange={(e) => setSpeed(Number((e.target as HTMLSelectElement).value))}>
          {PLAY_SPEEDS.map((s, i) => <option key={s.label} value={i}>{s.label}</option>)}
        </select>
      </label>
    </div>
  );
}
