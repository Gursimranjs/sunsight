// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Compare 2-3 sites on one time axis, and a days x sites calendar of verdicts.
import { useEffect, useState } from 'preact/hooks';
import type { Resolved } from '../data/sites';
import type { Site } from '../data/types';
import type { CalendarAnswer, MissCalendarDay, WindowAnswer } from '../engine/compute';
import { formatHours, formatPct, formatUtc } from '../format';
import { resolveForSite, type AppData } from '../state/data';
import type { Scenario } from '../state/scenario';
import { dayStarts } from './calendar';
import { MISS_RADII_M, MISS_TOLERANT_SHARE, missCalendarJob } from './missGeometry';
import { VERDICT_TEXT, VerdictBadge } from './ReportCard';
import { Term } from './Term';
import { Timeline } from './Timeline';

interface Props {
  data: AppData;
  scn: Scenario;
  update: (patch: Partial<Scenario>) => void;
}

const NONE = '';

function useResolved(data: AppData, sites: Site[], h_m: number): Resolved[] | null {
  const [r, setR] = useState<Resolved[] | null>(null);
  const ids = sites.map((s) => s.id).join('|');
  useEffect(() => {
    let live = true;
    setR(null);
    Promise.all(sites.map((s) => resolveForSite(data, s, h_m))).then((x) => live && setR(x));
    return () => { live = false; };
  }, [ids, h_m]);
  return r;
}

export function Compare({ data, scn, update }: Props) {
  const defaults = data.sites.slice(0, 3).map((s) => s.id);
  const chosenIds = (scn.compare.length ? scn.compare : defaults).slice(0, 3);
  const chosen = chosenIds.map((id) => data.sites.find((s) => s.id === id)).filter((s): s is Site => !!s);
  const places = useResolved(data, chosen, scn.rules.observer_height_m);
  const [answers, setAnswers] = useState<{ key: string; list: WindowAnswer[] } | null>(null);
  const key = places ? JSON.stringify([chosenIds, scn.start_s, scn.stay_s, scn.rules]) : '';

  useEffect(() => {
    if (!places) return;
    let live = true;
    Promise.all(places.map((p) => data.engine.window({
      place: { lat_deg: p.lat_deg, lon_deg: p.lon_deg, h_m: p.h_m }, mask: p.mask,
      start_s: scn.start_s, end_s: scn.start_s + scn.stay_s, rules: scn.rules,
    }))).then((list) => live && setAnswers({ key, list }));
    return () => { live = false; };
  }, [key]);

  const setSlot = (k: number, id: string) => {
    const next = [...chosenIds];
    if (id === NONE) next.splice(k, 1); else next[k] = id;
    update({ compare: [...new Set(next)] });
  };
  const list = answers && answers.key === key ? answers.list : null;

  return (
    <>
      <section class="card" aria-label="Compare sites">
        <h3>Compare sites on one time axis</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
          {[0, 1, 2].map((k) => (
            <label class="field" key={k}>
              <span>Site {k + 1}</span>
              <select value={chosenIds[k] ?? NONE} onChange={(e) => setSlot(k, (e.target as HTMLSelectElement).value)}>
                <option value={NONE}>{k < 2 ? 'Choose a site' : 'None'}</option>
                {data.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          ))}
        </div>
        {!list && <p>Computing…</p>}
        {list && chosen.map((s, i) => (
          <div key={s.id} data-testid="compare-row">
            <p style={{ margin: '8px 0 2px' }}>
              <strong>{s.name}</strong>{' '}<VerdictBadge v={list[i].verdict.verdict} small />{' '}
              <span class="small">{list[i].verdict.reason}</span>
            </p>
            <p class="small muted" style={{ margin: 0 }}>
              Lit {formatPct(list[i].metrics.lit_share)} · longest dark {formatHours(list[i].metrics.longest_dark_s)} · contact {formatPct(list[i].metrics.contact_share)} · longest gap {formatHours(list[i].metrics.longest_gap_s)} · score {list[i].metrics.score.toFixed(0)} · {places?.[i].terrain ? 'terrain horizon' : 'no terrain: smooth horizon'}
            </p>
            <Timeline series={list[i].series} metrics={list[i].metrics} rules={scn.rules} start_s={scn.start_s} stay_s={scn.stay_s}
              t_off_s={scn.t_off_s} onTime={(t_off_s) => update({ t_off_s })} title={`${s.name}: sunlight and contact`} compact />
          </div>
        ))}
        {list && (
          <p class="takeaway">
            Best score: {chosen[list.reduce((b, a, i) => (a.metrics.score > list[b].metrics.score ? i : b), 0)]?.name}. All timelines share the same dates; the white line is the selected time.
          </p>
        )}
      </section>
      <Calendar data={data} scn={scn} update={update} />
    </>
  );
}

/** Miss-tolerant rows: per site with a miss grid, one MissCalendarDay per start date. */
function useMissRows(data: AppData, sites: Site[], on: boolean, starts: number[], scn: Scenario, radius_m: number, min_share: number) {
  const targets = sites.filter((s) => s.miss_target_id);
  const key = on && targets.length && starts.length ? JSON.stringify([targets.map((s) => s.id), starts, scn.stay_s, scn.rules, radius_m, min_share]) : '';
  const [rows, setRows] = useState<{ key: string; bySite: Map<string, MissCalendarDay[]>; failed: string[] } | null>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!key) return;
    let live = true;
    setProgress(0);
    (async () => {
      const bySite = new Map<string, MissCalendarDay[]>();
      const failed: string[] = [];
      for (const [k, s] of targets.entries()) {
        try {
          const set = await data.missGrid(s.miss_target_id!);
          const job = missCalendarJob(set, starts, scn.stay_s, scn.rules, radius_m, min_share);
          const a = await data.engine.missCalendar(job, (f) => live && setProgress((k + f) / targets.length));
          bySite.set(s.id, a.days);
        } catch {
          failed.push(s.name);
        }
        if (!live) return;
      }
      if (live) setRows({ key, bySite, failed });
    })();
    return () => { live = false; };
  }, [key]);
  return { rows: rows && rows.key === key ? rows : null, progress, pending: key !== '' && !(rows && rows.key === key), any: targets.length > 0 };
}

function Calendar({ data, scn, update }: Props) {
  const [days, setDays] = useState(14);
  const [missOn, setMissOn] = useState(false);
  const [missRadius, setMissRadius] = useState(250);
  const [missPct, setMissPct] = useState(MISS_TOLERANT_SHARE * 100);
  const sites = data.sites.slice(0, 30);
  const places = useResolved(data, sites, scn.rules.observer_height_m);
  const starts = dayStarts(scn.start_s, days, scn.stay_s, data.eph.meta, data.eph.start_ms);
  const [ans, setAns] = useState<{ key: string; a: CalendarAnswer } | null>(null);
  const [progress, setProgress] = useState(0);
  const key = places ? JSON.stringify([sites.map((s) => s.id), starts, scn.stay_s, scn.rules]) : '';
  const minShare = Math.min(1, Math.max(0, missPct / 100));
  const miss = useMissRows(data, sites, missOn, starts, scn, missRadius, minShare);

  useEffect(() => {
    if (!places || !starts.length) return;
    let live = true;
    setProgress(0);
    data.engine.calendar({
      sites: places.map((p) => ({ place: { lat_deg: p.lat_deg, lon_deg: p.lon_deg, h_m: p.h_m }, mask: p.mask })),
      day_starts_s: starts, stay_s: scn.stay_s, rules: scn.rules,
    }, (f) => live && setProgress(f)).then((a) => live && setAns({ key, a }));
    return () => { live = false; };
  }, [key]);

  const a = ans && ans.key === key ? ans.a : null;
  const dayLabel = (s: number) => formatUtc(data.eph.start_ms + s * 1000).slice(5, 10);
  const missDays = (id: string) => (missOn ? miss.rows?.bySite.get(id) ?? null : null);
  const passCount = a ? sites.map((s, i) => {
    const md = missDays(s.id);
    return md ? md.filter((d) => d.tolerant).length : a.cells[i].filter((c) => c.verdict !== 'no-go').length;
  }) : [];
  const pctLabel = formatPct(minShare);
  return (
    <section class="card" aria-label="Calendar">
      <h3 class="chart-title">Calendar: which start dates work at which sites</h3>
      <p class="small muted" style={{ margin: '0 0 6px' }}>
        Each cell is a {Number((scn.stay_s / 86400).toFixed(2))}-day stay starting at 00:00 UTC on that day (month-day), scored with the current rules. Click a cell to open its report card.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
        <label class="field" style={{ display: 'inline-flex' }}>
          <span>Days shown</span>
          <select value={days} onChange={(e) => setDays(Number((e.target as HTMLSelectElement).value))}>
            {[7, 14, 28].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label class="check">
          <input type="checkbox" checked={missOn} data-testid="cal-miss-toggle" onChange={(e) => setMissOn((e.target as HTMLInputElement).checked)} />
          <span>Miss test on <Term tip="miss">(?)</Term></span>
        </label>
        {missOn && (
          <>
            <label class="field" style={{ display: 'inline-flex' }}>
              <span>Miss radius</span>
              <select value={missRadius} onChange={(e) => setMissRadius(Number((e.target as HTMLSelectElement).value))}>
                {MISS_RADII_M.map((r) => <option key={r} value={r}>{r} m</option>)}
              </select>
            </label>
            <label class="field" style={{ display: 'inline-flex' }}>
              <span>Share that must pass (%)</span>
              <input type="number" min={1} max={100} step={1} value={missPct} style={{ width: '7rem' }}
                onChange={(e) => { const v = Number((e.target as HTMLInputElement).value); if (Number.isFinite(v) && v > 0 && v <= 100) setMissPct(v); }} />
            </label>
          </>
        )}
      </div>
      {missOn && (
        <p class="small" style={{ margin: '0 0 6px' }} data-testid="cal-miss-note">
          {miss.any
            ? <>Rows marked ◎ have a miss-test grid: a date is good there only if at least {pctLabel} of the grid points within {missRadius} m pass. Other rows still score the single site point.</>
            : <>No site in this calendar has a miss-test grid yet, so every row scores the single site point.</>}
          {miss.pending && <> Testing landing points… {formatPct(miss.progress)}</>}
          {miss.rows && miss.rows.failed.length > 0 && <> Could not load the grid for {miss.rows.failed.join(', ')}; those rows score the single point.</>}
        </p>
      )}
      {!starts.length && <p>The stay is too long to fit any start date after the selected one in the table.</p>}
      {!a && starts.length > 0 && <p>Computing {sites.length * starts.length} stays… {formatPct(progress)}</p>}
      {a && (
        <div class="scroll-x" tabIndex={0} role="region" aria-label="Calendar table (scrolls sideways)">
          <table class="calendar" data-testid="calendar">
            <thead>
              <tr><th scope="col">Site \ start (UTC)</th>{starts.map((s) => <th key={s} scope="col" class="small">{dayLabel(s)}</th>)}</tr>
            </thead>
            <tbody>
              {sites.map((site, i) => {
                const md = missDays(site.id);
                return (
                  <tr key={site.id} data-miss={md ? 'on' : undefined}>
                    <th scope="row" class="small">{md ? '◎ ' : ''}{site.name}</th>
                    {a.cells[i].map((c, j) => {
                      const open = () => { update({ site_id: site.id, start_s: starts[j], t_off_s: 0, view: 'report' }); window.scrollTo({ top: 0 }); };
                      const when = formatUtc(data.eph.start_ms + starts[j] * 1000);
                      if (md) {
                        const d = md[j];
                        const v = d.tolerant ? 'go' : 'no-go';
                        const words = `${d.tolerant ? 'miss-tolerant' : 'not miss-tolerant'}: ${d.n_pass} of ${d.n_inside} points within ${missRadius} m pass (${formatPct(d.share)}, need ${pctLabel})`;
                        return (
                          <td key={j} class={`cal ${v} miss`}>
                            <button type="button" data-testid="cal-cell" data-miss="on" aria-label={`${site.name}, stay starting ${when}: ${words}`} title={words} onClick={open}>
                              {VERDICT_TEXT[v].sym}
                            </button>
                          </td>
                        );
                      }
                      return (
                        <td key={j} class={`cal ${c.verdict}`}>
                          <button type="button" data-testid="cal-cell"
                            aria-label={`${site.name}, stay starting ${when}: ${VERDICT_TEXT[c.verdict].label}, score ${c.score.toFixed(0)}`}
                            title={`${VERDICT_TEXT[c.verdict].label}, score ${c.score.toFixed(0)}, lit ${formatPct(c.lit_share)}, contact ${formatPct(c.contact_share)}`}
                            onClick={open}>
                            {VERDICT_TEXT[c.verdict].sym}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ul class="legend">
        <li><VerdictBadge v="go" small /> every rule met with margin</li>
        <li><VerdictBadge v="marginal" small /> rules met, thin margin</li>
        <li><VerdictBadge v="no-go" small /> a rule fails</li>
        {missOn && miss.any && <li>◎ row, outlined cells: ✓ miss-tolerant, ✕ not (share of landing points)</li>}
      </ul>
      {a && (
        <p class="takeaway">
          {sites.map((s, i) => `${s.name}: ${passCount[i]} of ${starts.length} start dates ${missDays(s.id) ? 'miss-tolerant' : 'pass'}`).join('; ')}.
        </p>
      )}
    </section>
  );
}
