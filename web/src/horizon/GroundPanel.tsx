// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// The lit ground panel: the call, the miss line, three readouts (Sun, sunset or sunrise, contact), the
// timeline with Play, and the provenance small print behind one "Sources and method" disclosure.
// Every number is the classic verdict card's: engine verdict, 'now' sample, countdownsAt, miss share.
import type { ComponentChildren } from 'preact';
import type { Countdown, Countdowns } from '../engine/countdown';
import type { Series } from '../engine/compute';
import type { Sample, Verdict } from '../engine/light';
import { formatDeg, formatDuration, formatPct, formatUtc } from '../format';
import { VerdictBadge } from '../views/ReportCard';
import { PlayBar } from './PlayBar';

interface Props {
  verdict: Verdict | null;
  busy: boolean;
  stay_s: number;
  now: Sample | null;
  lit_threshold: number;
  countdowns: Countdowns | null;
  epochMs: number;
  /** Seconds after row 0 of the stay's start and the selected moment's offset. */
  start_s: number;
  t_off_s: number;
  series: Series | null;
  onTime: (t_off_s: number) => void;
  missLine?: ComponentChildren;
  /** "Land it yourself": shown only for sites with a miss-test grid. */
  gameEntry?: ComponentChildren;
  /** "Sources and method": horizon label, site source, refined note, terrain credit. */
  sources: ComponentChildren;
  status?: ComponentChildren;
}

function Readout({ k, children, id }: { k: string; children: ComponentChildren; id?: string }) {
  return <div class="hz-readout" data-testid={id}><div class="hz-k">{k}</div><div class="hz-v">{children}</div></div>;
}

/** Next change from the playhead on; the test ids match the classic verdict card's (cd-sunset, cd-contact-loss, …). */
function next(c: Countdown, downWord: string, upWord: string, epochMs: number, ids: [string, string]) {
  const word = c.up ? downWord : upWord;
  // Countdowns look forward from the playhead, so mid-stay "none" means none from here to the end (shell #2).
  if (c.in_s === null || c.at_s === null) return <>{word}: none before the stay ends</>;
  const testid = `cd-${c.up ? ids[0] : ids[1]}`;
  return <>{word} in <strong class="hz-num" data-testid={testid}>{formatDuration(c.in_s)}</strong><span class="hz-at">{formatUtc(epochMs + c.at_s * 1000)}</span></>;
}

export function GroundPanel(p: Props) {
  const days = Number((p.stay_s / 86400).toFixed(2));
  const v = p.verdict;
  const dark = !!p.now && p.now.sun_frac < p.lit_threshold;
  const cds = p.countdowns;
  return (
    <section class={`hz-ground ${dark ? 'hz-dark' : ''}`} aria-label="The call" data-testid="hz-ground" data-dark={dark}>
      <div class="hz-call" data-testid="hz-call" aria-live="polite" aria-busy={p.busy}>
        {v ? (
          <>
            <h2 class={`hz-word ${v.verdict}`} data-testid="verdict-word"><VerdictBadge v={v.verdict} />{v.verdict === 'go' ? <span class="hz-for"> for all {days} days</span> : null}</h2>
            <p class="hz-reason" data-testid="verdict-reason">{v.reason}</p>
          </>
        ) : <h2 class="hz-word">Computing…</h2>}
      </div>
      {v && p.missLine}
      {p.status}
      <div class="hz-readouts">
        <Readout k="Sun now">
          <span class="hz-big" data-testid="sun-el">{p.now ? formatDeg(p.now.sun_el_deg, 2) : '—'}</span>
          {p.now && <span class="hz-sub">{formatPct(p.now.sun_frac)} of the disc visible</span>}
        </Readout>
        <Readout k="Sunlight" id="hz-sunset">{cds ? next(cds.sun, 'Sunset', 'Sunrise', p.epochMs, ['sunset', 'sunrise']) : '—'}</Readout>
        <Readout k="Earth contact" id="hz-contact">{cds ? next(cds.contact, 'Contact lost', 'Contact back', p.epochMs, ['contact-loss', 'contact-back']) : '—'}</Readout>
      </div>
      <PlayBar t_off_s={p.t_off_s} stay_s={p.stay_s} startMs={p.epochMs + p.start_s * 1000} series={p.series} lit_threshold={p.lit_threshold} onTime={p.onTime} />
      {/* Beside "Play the stay" (note 010 #5): the game entry, for sites with a miss-test grid. */}
      {v && p.gameEntry}
      <details class="hz-sources">
        <summary>Sources and method</summary>
        {p.sources}
      </details>
    </section>
  );
}
