// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Validation page: every check with its number, pass mark, status and explanation, plus its data.
import { useEffect, useState } from 'preact/hooks';
import { DATA_BASE } from '../data/loaders';
import {
  checkCounts, formatCheckValue, loadCsvHead, loadValidation, STATUS_INFO,
  type CheckStatus, type Sensitivity, type SensitivityRow, type ValidationCheck, type ValidationLoad,
} from '../data/validation';
import type { AppData } from '../state/data';

const HEAD_ROWS = 5;

export function StatusBadge({ s }: { s: CheckStatus }) {
  const t = STATUS_INFO[s];
  return (
    <span class={`vbadge small ${t.cls}`} data-testid="check-status">
      <span class="sym" aria-hidden="true">{t.sym}</span>
      <span>{t.label}</span>
    </span>
  );
}

function CsvHead({ path, title }: { path: string; title: string }) {
  const [t, setT] = useState<{ header: string[]; rows: string[][]; total: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    loadCsvHead(path, HEAD_ROWS).then((x) => live && setT(x)).catch((e) => live && setErr(String(e)));
    return () => { live = false; };
  }, [path]);
  if (err) return <p class="small">The data file could not be read ({err}).</p>;
  if (!t) return <p class="small muted">Reading the data file…</p>;
  return (
    <div class="scroll-x" tabIndex={0} role="region" aria-label={`First rows of the data for ${title} (scrolls sideways)`}>
      <table class="csv-head">
        <caption class="small muted">First {Math.min(HEAD_ROWS, t.total)} of {t.total} rows of the data for “{title}”</caption>
        <thead><tr>{t.header.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead>
        <tbody>{t.rows.map((r, i) => <tr key={i}>{r.map((x, j) => <td key={j}>{x}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function CheckCard({ c }: { c: ValidationCheck }) {
  return (
    <article class={`card vcheck ${STATUS_INFO[c.status].cls}`} data-testid="check" aria-labelledby={`chk-${c.id}`}>
      <h3 id={`chk-${c.id}`} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline' }}>
        <StatusBadge s={c.status} /> <span>{c.title}</span>
      </h3>
      {c.what && <p style={{ margin: '2px 0 6px' }}>{c.what}</p>}
      <dl class="check-nums">
        <div><dt>{c.value_label ? c.value_label[0].toUpperCase() + c.value_label.slice(1) : 'Result'}</dt><dd data-testid="check-value">{formatCheckValue(c)}</dd></div>
        <div><dt>Pass mark</dt><dd>{c.pass_mark}</dd></div>
        <div><dt>Status</dt><dd>{STATUS_INFO[c.status].label.toLowerCase()}</dd></div>
        {c.spread_points !== null && <div><dt>Spread of the differences</dt><dd>{Number(c.spread_points.toPrecision(3))} points</dd></div>}
      </dl>
      <p class="check-why" style={{ margin: '6px 0' }}>
        <strong>{c.status === 'fail' ? 'Why it fails: ' : c.status === 'partial' ? 'Why only partly: ' : c.status === 'not run' ? 'Note: ' : 'In plain words: '}</strong>
        {c.explanation}
      </p>
      {c.data ? (
        <>
          <p class="small" style={{ margin: '4px 0' }}>
            <a href={DATA_BASE + c.data} download>Download the data ({c.data.split('/').pop()}{c.rows ? `, ${c.rows} rows` : ''})</a>
          </p>
          <CsvHead path={c.data} title={c.title} />
        </>
      ) : <p class="small muted" style={{ margin: '4px 0' }}>No data file for this check.</p>}
      {(c.source || c.timing_s !== null) && (
        <p class="small muted" style={{ margin: '4px 0 0' }}>
          {c.source && <>Reference: <a href={c.source} target="_blank" rel="noopener noreferrer">{c.source.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>. </>}
          {c.timing_s !== null && <>Run time {Number(c.timing_s.toPrecision(3))} s.</>}
        </p>
      )}
    </article>
  );
}

function SensitivityTable({ sn }: { sn: Sensitivity }) {
  const base = sn.rows[0];
  const sign = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '±');
  const biggest = sn.rows.slice(1).reduce((b, r) => (Math.abs(r.delta_points) > Math.abs(b?.delta_points ?? 0) ? r : b), null as SensitivityRow | null);
  return (
    <section class="card" aria-labelledby="sens-title" data-testid="validation-sensitivity">
      <h3 id="sens-title">What moves the number (points of sunlight at the best ridge point)</h3>
      {sn.point && (
        <p class="small muted" style={{ margin: '0 0 6px' }}>
          Point: {sn.point.label} ({Math.abs(sn.point.lat_deg).toFixed(4)}° {sn.point.lat_deg < 0 ? 'S' : 'N'}, {Math.abs(sn.point.lon_deg).toFixed(4)}° {sn.point.lon_deg < 0 ? 'W' : 'E'}). Each row changes one thing from the first row.
        </p>
      )}
      <div class="scroll-x" tabIndex={0} role="region" aria-label="Sensitivity table (scrolls sideways)">
        <table class="sens">
          <thead><tr><th scope="col">Change</th><th scope="col">Lit share</th><th scope="col">Change from baseline</th></tr></thead>
          <tbody>
            {sn.rows.map((r, i) => (
              <tr key={i}>
                <td>{r.change}</td>
                <td class="num">{r.lit_pct.toFixed(2)}%</td>
                <td class="num">{i === 0 ? 'baseline' : `${sign(r.delta_points)}${Math.abs(r.delta_points).toFixed(2)} points`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {biggest && (
        <p class="takeaway">
          Baseline {base.lit_pct.toFixed(1)}%. The biggest effect: “{biggest.change}” ({sign(biggest.delta_points)}{Math.abs(biggest.delta_points).toFixed(1)} points).
        </p>
      )}
      {sn.data && <p class="small" style={{ margin: '4px 0 0' }}><a href={DATA_BASE + sn.data} download>Download the data ({sn.data.split('/').pop()})</a></p>}
    </section>
  );
}

export function ValidationView({ data }: { data: AppData }) {
  const [v, setV] = useState<ValidationLoad | null>(null);
  useEffect(() => {
    let live = true;
    loadValidation(data.manifest).then((x) => {
      if (!live) return;
      if (x.state === 'ok' && x.fixture) data.markFixture('validation');
      setV(x);
    });
    return () => { live = false; };
  }, [data]);

  if (!v) return <section class="card"><p>Loading the validation results…</p></section>;
  if (v.state !== 'ok') {
    return (
      <section class="card" data-testid="validation-missing">
        <h2>Validation not run yet</h2>
        <p>
          The eight checks that compare SunSight with independent references (JPL Horizons, NASA’s illumination and
          Earth-visibility maps, a published Shackleton study, NASA’s eclipse tables) have not produced results for this
          build{v.state === 'error' ? `: the results file could not be read (${v.message})` : ''}. Nothing is shown rather than guessed numbers.
        </p>
      </section>
    );
  }
  const s = v.summary;
  const n = checkCounts(s.checks);
  return (
    <>
      <section class="card" aria-label="Validation summary" data-testid="validation-summary">
        <h2>How we check SunSight</h2>
        <p style={{ margin: '0 0 6px' }}>
          {s.checks.length} independent checks. {n.pass} pass, {n.fail} fail, {n.partial} partly pass, {n['not run']} not run yet.
          Failures stay on this page with their likely cause.
        </p>
        <ul class="legend" aria-label="Status key">
          {(Object.keys(STATUS_INFO) as CheckStatus[]).map((k) => <li key={k}><StatusBadge s={k} /> {n[k]}</li>)}
        </ul>
        {s.generated_utc && <p class="small muted" style={{ margin: '6px 0 0' }}>Results generated {s.generated_utc.replace('T', ' ').replace('Z', ' UTC')}.</p>}
      </section>
      {s.checks.map((c) => <CheckCard key={c.id} c={c} />)}
      {s.sensitivity && <SensitivityTable sn={s.sensitivity} />}
      <section class="card" aria-label="Limits" data-testid="validation-limits">
        <h3>Limits</h3>
        {s.limits.length
          ? <ul style={{ margin: 0, paddingLeft: 20 }}>{s.limits.map((l, i) => <li key={i}>{l}</li>)}</ul>
          : <p style={{ margin: 0 }}>No limits were listed with these results.</p>}
      </section>
    </>
  );
}
