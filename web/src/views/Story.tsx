// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Guided Athena story: five short steps, built for a 375 px phone. Facts come only from the cited
// sources (LROC images 1401 and 1408, SpacePolicyOnline); distances are computed here from the
// cited coordinates.
import { TableStatus, useTableRange } from './useTableRange';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Site } from '../data/types';
import { formatUtc, fromInputUtc, toInputUtc } from '../format';
import type { AppData } from '../state/data';
import { tableRange, type Scenario } from '../state/scenario';
import { litRuleText } from './glossary';
import { missJob } from './missGeometry';
import { MissView } from './MissView';
import { athenaMiss, ATHENA_TARGET_ID, litRange, missRange, roundingHalfStep, type AthenaMiss } from './storyNumbers';

const SPO_URL = 'https://spacepolicyonline.com/news/im-2-mission-ends-one-day-after-lunar-landing/';
const STEPS = ['The target', 'The miss', 'The shadow', 'The lost power', 'What SunSight shows'] as const;

interface Props {
  data: AppData;
  scn: Scenario;
  update: (patch: Partial<Scenario>) => void;
}

const m0 = (x: number) => `${Math.round(x)} m`;
const r10 = (x: number) => `${Math.round(x / 10) * 10} m`;

function Src({ href, children }: { href: string; children: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
}

/** Map of the quoted target, its rounding box and the resting place, in metres. */
function MissMap({ m }: { m: AthenaMiss }) {
  const box = roundingHalfStep(m.target.lat_deg, 2);
  const W = 320, H = 260, pad = 30;
  // Fit the rounding box and the resting place, centred between them.
  const n_lo = Math.min(-box.ns_m, m.north_m), n_hi = Math.max(box.ns_m, m.north_m);
  const e_lo = Math.min(-box.ew_m, m.east_m), e_hi = Math.max(box.ew_m, m.east_m);
  const k = Math.min((H - 2 * pad) / (n_hi - n_lo), (W - 2 * pad - 110) / Math.max(e_hi - e_lo, 1));
  const cx = pad + 70 - e_lo * k, cy = pad + n_hi * k;
  const X = (e: number) => cx + e * k, Y = (n: number) => cy - n * k;
  const bar_m = 100;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 420 }} role="img" data-testid="story-miss-map"
      aria-label={`Map: the resting place is ${m0(m.dist_m)} from the quoted target, toward the ${m.north_m < 0 ? 'south' : 'north'}-${m.east_m > 0 ? 'east' : 'west'}. The dashed box shows where the true target could be, given the two-decimal coordinates.`}>
      <rect x={X(-box.ew_m)} y={Y(box.ns_m)} width={2 * box.ew_m * k} height={2 * box.ns_m * k} fill="none" stroke="var(--muted)" stroke-dasharray="4 3" />
      <line x1={X(0)} y1={Y(0)} x2={X(m.east_m)} y2={Y(m.north_m)} stroke="var(--fg)" stroke-width="2" />
      <g stroke="var(--oi-sky)" stroke-width="3"><line x1={X(0) - 8} x2={X(0) + 8} y1={Y(0)} y2={Y(0)} /><line x1={X(0)} x2={X(0)} y1={Y(0) - 8} y2={Y(0) + 8} /></g>
      <text x={X(0) - 12} y={Y(0) - 10} text-anchor="end">Target</text>
      <rect x={X(m.east_m) - 7} y={Y(m.north_m) - 7} width="14" height="14" fill="var(--oi-orange)" />
      <text x={X(m.east_m) + 12} y={Y(m.north_m) + 5}>Resting place</text>
      <text x={(X(0) + X(m.east_m)) / 2 + 8} y={(Y(0) + Y(m.north_m)) / 2}>{m0(m.dist_m)}</text>
      <text x={X(box.ew_m) + 6} y={Y(box.ns_m) + 14} style={{ fill: 'var(--muted)' }}>rounding box</text>
      <g transform={`translate(${W - pad - 80} ${H - 14})`}>
        <line x1="0" x2={bar_m * k} y1="0" y2="0" stroke="var(--fg)" stroke-width="2" />
        <text x={bar_m * k + 6} y="5">{bar_m} m</text>
      </g>
      <text x={W - 30} y={22} text-anchor="middle">N ↑</text>
    </svg>
  );
}

/** A 20 m crater drawn over the 10 m terrain-map cells used near the target. */
function PixelPicture() {
  const px = 40, n = 6, o = 10;
  return (
    <svg viewBox={`0 0 ${n * px + 2 * o} ${n * px + 2 * o}`} width="100%" style={{ maxWidth: 260 }} role="img" data-testid="story-pixels"
      aria-label="Grid of 10 metre terrain-map cells with a 20 metre crater drawn on it: the crater is only two cells across.">
      {Array.from({ length: n * n }, (_, i) => (
        <rect key={i} x={o + (i % n) * px} y={o + Math.floor(i / n) * px} width={px} height={px} fill="var(--panel2)" stroke="var(--muted)" />
      ))}
      <circle cx={o + 2.5 * px} cy={o + 2.5 * px} r={px} fill="none" stroke="var(--oi-orange)" stroke-width="3" />
      <text x={o + 2.5 * px} y={o + 2.5 * px + 5} text-anchor="middle">20 m</text>
      <text x={o + 5.5 * px} y={o + 5.5 * px + 5} text-anchor="middle" style={{ fill: 'var(--muted)' }}>10 m</text>
    </svg>
  );
}

const RIDGE_ID = 'shackleton_ridge_rim';
const pct = (x: number) => `${(100 * x).toFixed(1)}%`;

/**
 * Athena's target next to the Shackleton ridge: lit share at the target and its range within 250 m
 * and 500 m, computed live for the chosen stay, then either pass/fail map.
 */
function MissContrast({ data, scn, update }: Props) {
  const grids = new Set((data.manifest.files.miss ?? []).map((r) => r.id));
  const sites = [ATHENA_TARGET_ID, RIDGE_ID]
    .map((id) => data.sites.find((s) => s.id === id))
    .filter((s): s is Site => !!s && !!s.miss_target_id && grids.has(s.miss_target_id));
  const [rows, setRows] = useState<{ key: string; list: { site: Site; r250: ReturnType<typeof litRange>; r500: ReturnType<typeof litRange> }[] } | null>(null);
  const [show, setShow] = useState(sites[0]?.id ?? '');
  const table = useTableRange(data, scn.start_s, scn.start_s + scn.stay_s);
  const key = JSON.stringify([sites.map((s) => s.id), scn.start_s, scn.stay_s, scn.rules, table.epoch]);
  const [error, setError] = useState<{ key: string; text: string } | null>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      const list = [];
      for (const site of sites) {
        const set = await data.missGrid(site.miss_target_id!);
        const job = missJob(set, scn.start_s, scn.start_s + scn.stay_s, scn.rules);
        const a = await data.engine.miss(job);
        list.push({ site, r250: litRange(a.lit_share, job.east_m, job.north_m, 250), r500: litRange(a.lit_share, job.east_m, job.north_m, 500) });
        if (!live) return;
      }
      if (live) setRows({ key, list });
    })().catch((e) => { if (live) setError({ key, text: String(e) }); });
    return () => { live = false; };
  }, [key]);
  const list = rows && rows.key === key ? rows.list : null;
  const err = error && error.key === key ? error.text : null;
  const shown = sites.find((s) => s.id === show) ?? sites[0];
  const spread = (r: ReturnType<typeof litRange>) => (r ? 100 * (r.max - r.min) : NaN);
  return (
    <>
      <h3 class="chart-title">Share of the stay in sunlight, at the target and anywhere within the miss</h3>
      {!list && table.state !== 'ok' && <p><TableStatus tr={table} /></p>}
      {!list && table.state === 'ok' && (err
        ? <p role="alert" data-testid="story-contrast-error">Could not test the landing points: {err}</p>
        : <p>Testing every landing point around both targets…</p>)}
      {list && (
        <div class="scroll-x" tabIndex={0} role="region" aria-label="Sunlight at both targets (scrolls sideways)">
          <table data-testid="story-contrast">
            <caption class="small muted" style={{ textAlign: 'left' }}>Lit = {litRuleText(scn.rules)}; observer {scn.rules.observer_height_m} m; each point uses its own terrain horizon.</caption>
            <thead><tr><th scope="col">Target</th><th scope="col">At the target</th><th scope="col">Within 250 m</th><th scope="col">Within 500 m</th></tr></thead>
            <tbody>
              {list.map(({ site, r250, r500 }) => (
                <tr key={site.id}>
                  <th scope="row">{site.id === ATHENA_TARGET_ID ? 'Athena’s target' : 'Shackleton ridge'}</th>
                  <td>{r250 ? pct(r250.at_target) : '—'}</td>
                  <td>{r250 ? `${pct(r250.min)} to ${pct(r250.max)}` : '—'}</td>
                  <td>{r500 ? `${pct(r500.min)} to ${pct(r500.max)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list && list.length === 2 && (
        <p class="takeaway" data-testid="story-contrast-takeaway">
          For this stay, a 250 m miss changes the sunlight by up to {spread(list[0].r250).toFixed(1)} points around Athena’s target and by up to {spread(list[1].r250).toFixed(1)} points on the Shackleton ridge.
        </p>
      )}
      <p class="small">Over all of 2027–2030 (hourly, 2 m observer; SunSight pipeline run): Athena’s target is lit 44.4% of the time and anywhere within 250 m 43.1–44.5%, so at map scale the ground there is evenly lit. On the Shackleton ridge the target is lit 73.4%, but within 250 m it ranges from 22.7% to 85.1%: there a 250 m miss can cost most of the sunlight. That is what the miss test is for.</p>
      {sites.length > 1 && (
        <div class="btnrow" role="group" aria-label="Map to show">
          {sites.map((s) => (
            <button key={s.id} type="button" aria-pressed={s.id === shown?.id} onClick={() => setShow(s.id)}>
              Map: {s.id === ATHENA_TARGET_ID ? 'Athena’s target' : 'Shackleton ridge'}
            </button>
          ))}
        </div>
      )}
      {shown && <MissView key={shown.id} data={data} site={shown} scn={scn} onSite={(id) => update({ site_id: id })} />}
      {shown && <button type="button" class="primary" onClick={() => update({ site_id: shown.id, view: 'miss' })}>Open this in the full miss test</button>}
    </>
  );
}

export function Story({ data, scn, update }: Props) {
  const [step, setStep] = useState(0);
  const top = useRef<HTMLElement>(null);
  const m = athenaMiss(data.sites);
  const go = (k: number) => {
    setStep(Math.max(0, Math.min(STEPS.length - 1, k)));
    top.current?.scrollIntoView?.({ block: 'start' });
  };
  if (!m) {
    return <section class="card"><p>The Athena story needs the IM-2 target and resting-place entries in the site list, which this data set does not have.</p></section>;
  }
  const box = roundingHalfStep(m.target.lat_deg, 2);
  const range = missRange(m, box);
  const target = data.sites.find((s) => s.id === ATHENA_TARGET_ID)!;
  const hasGrid = !!target.miss_target_id && (data.manifest.files.miss ?? []).some((r) => r.id === target.miss_target_id);
  const range_s = tableRange(data.eph.meta);
  const startMs = data.eph.start_ms + scn.start_s * 1000;

  return (
    <section class="card story" aria-label="Guided Athena story" ref={top} data-testid="story">
      <p class="small muted" style={{ margin: 0 }}>Step {step + 1} of {STEPS.length}</p>
      <h2 data-testid="story-title">{STEPS[step]}</h2>
      <ol class="story-steps" aria-label="Story steps">
        {STEPS.map((t, i) => (
          <li key={t}>
            <button type="button" aria-current={i === step ? 'step' : undefined} aria-label={`Step ${i + 1}: ${t}`} onClick={() => go(i)}>{i + 1}</button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div data-testid="story-step-1">
          <p>In March 2025 the lander <strong>Athena</strong> (Intuitive Machines’ IM-2 mission) aimed for a spot on Mons Mouton, a mountain near the Moon’s south pole.</p>
          <p>The Lunar Reconnaissance Orbiter Camera team gives the intended site as <strong>84.78° S, 29.13° E</strong>, about 160 km from the south pole (<Src href="https://lroc.im-ldi.com/images/1401">LROC image 1401</Src>).</p>
          <p class="small muted">Those coordinates are quoted to two decimals. At this latitude that is precise to about ±{Math.round(box.ns_m)} m north–south and ±{Math.round(box.ew_m)} m east–west.</p>
        </div>
      )}

      {step === 1 && (
        <div data-testid="story-step-2">
          <p>LROC later found Athena at <strong>84.7906° S, 29.1957° E</strong> (<Src href="https://lroc.im-ldi.com/images/1408">LROC image 1408</Src>).</p>
          <p>From the two sets of coordinates, SunSight computes a distance of <strong data-testid="story-miss-m">{m0(m.dist_m)}</strong> on the Moon’s 1,737.4 km sphere. Because the target is only quoted to two decimals, the true miss could be anywhere from about {r10(range.min_m)} to {r10(range.max_m)}.</p>
          <MissMap m={m} />
          <p class="small">Published figures differ: Intuitive Machines put Athena about 250 m from its target, NASA more than 400 m (both as reported by <Src href={SPO_URL}>SpacePolicyOnline</Src>). Both fit inside the range above.</p>
        </div>
      )}

      {step === 2 && (
        <div data-testid="story-step-3">
          <p>LROC reports that Athena came down too fast and <q>ended up on its side within a 20-meter diameter crater</q> (<Src href="https://lroc.im-ldi.com/images/1408">LROC image 1408</Src>). Sunlight could not reach into that crater (<Src href={SPO_URL}>SpacePolicyOnline</Src>).</p>
          <PixelPicture />
          <p data-testid="story-limit"><strong>An honest limit:</strong> near the target SunSight’s terrain map (NASA’s LOLA 10 m map) has one height every 10 m, so a crater 20 m across spans only two cells: too few to capture its walls. SunSight cannot see Athena’s crater, so it would <strong>not</strong> have shown that spot going dark. Hazards smaller than the map are exactly why a landing needs a margin.</p>
        </div>
      )}

      {step === 3 && (
        <div data-testid="story-step-4">
          <p>Lying on its side in the dark, Athena’s solar cells could not recharge its batteries. NASA declared the mission over about 13 hours after the landing on 6 March 2025 (<Src href={SPO_URL}>SpacePolicyOnline</Src>).</p>
          <svg viewBox="0 0 320 70" width="100%" style={{ maxWidth: 420 }} role="img" aria-label="Timeline: landing at hour 0, mission ended about 13 hours later.">
            <line x1="20" x2="300" y1="35" y2="35" stroke="var(--muted)" stroke-width="2" />
            <circle cx="20" cy="35" r="7" fill="var(--oi-sky)" /><text x="20" y="62" text-anchor="middle">Landing</text>
            <rect x="273" y="28" width="14" height="14" fill="var(--nogo)" /><text x="280" y="62" text-anchor="middle">Power gone</text>
            <text x="150" y="24" text-anchor="middle">about 13 hours</text>
          </svg>
          <p class="small muted">SunSight cannot replay March 2025: its Sun and Earth table covers 2027 to 2030 only. It does not model a lander lying on its side either; it asks whether the ground around a target gets sunlight.</p>
        </div>
      )}

      {step === 4 && (
        <div data-testid="story-step-5">
          <p>SunSight cannot see Athena’s crater. What it can show is how much the sunlight changes if a lander misses its target by a few hundred metres, on a <strong>future</strong> date you choose.</p>
          <label class="field" style={{ marginBottom: 8 }}>
            <span>Future start date (UTC, within 2027–2030)</span>
            <input type="datetime-local" step={3600} data-testid="story-date"
              min={toInputUtc(data.eph.start_ms + range_s.min_s * 1000)} max={toInputUtc(data.eph.start_ms + range_s.max_s * 1000)}
              value={toInputUtc(startMs)}
              onChange={(e) => {
                const ms = fromInputUtc((e.target as HTMLInputElement).value);
                if (Number.isFinite(ms)) update({ start_s: (ms - data.eph.start_ms) / 1000, t_off_s: 0 });
              }} />
          </label>
          <p class="future-label" data-testid="story-future-label">Future date: a {Number((scn.stay_s / 86400).toFixed(2))}-day stay starting {formatUtc(startMs)}, not the 2025 landing.</p>
          {hasGrid ? <MissContrast data={data} scn={scn} update={update} /> : (
            <p data-testid="story-no-grid"><strong>The miss-test grid for Athena’s target is not available in this build</strong>, so this step cannot show the map yet.</p>
          )}
        </div>
      )}

      <div class="story-nav">
        <button type="button" onClick={() => go(step - 1)} disabled={step === 0}>← Back</button>
        {step < STEPS.length - 1
          ? <button type="button" class="primary" data-testid="story-next" onClick={() => go(step + 1)}>Next: {STEPS[step + 1]} →</button>
          : <button type="button" onClick={() => go(0)}>Start again</button>}
      </div>
      <p class="small muted" style={{ marginBottom: 0 }}>
        Credits: coordinates and the crater description from the Lunar Reconnaissance Orbiter Camera (LROC; NASA/GSFC/Arizona State University), <Src href="https://lroc.im-ldi.com/images/1401">image 1401</Src> and <Src href="https://lroc.im-ldi.com/images/1408">image 1408</Src>; mission timeline from <Src href={SPO_URL}>SpacePolicyOnline</Src>. These links leave SunSight.
      </p>
    </section>
  );
}
