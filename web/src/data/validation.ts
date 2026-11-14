// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Validation summary (validation/summary.json) and its CSV files: loading, checking and formatting.
import { DATA_BASE } from './loaders';
import type { Manifest } from './types';

export type CheckStatus = 'pass' | 'fail' | 'partial' | 'not run';

export interface ValidationCheck {
  id: string;
  title: string;
  /** One sentence: what is compared. */
  what: string;
  value: number | null;
  unit: string;
  value_label: string;
  pass_mark: string;
  status: CheckStatus;
  explanation: string;
  /** Path under data/ of the check's CSV, or null. */
  data: string | null;
  rows: number;
}

export interface ValidationSummary {
  generated_utc: string | null;
  checks: ValidationCheck[];
  limits: string[];
}

export type ValidationLoad =
  | { state: 'missing' }
  | { state: 'error'; message: string }
  | { state: 'ok'; summary: ValidationSummary; fixture: boolean };

/** Status shown by shape, word and colour (never colour alone). */
export const STATUS_INFO: Record<CheckStatus, { sym: string; label: string; cls: string }> = {
  pass: { sym: '✓', label: 'PASS', cls: 'go' },
  fail: { sym: '✕', label: 'FAIL', cls: 'no-go' },
  partial: { sym: '!', label: 'PARTIAL', cls: 'marginal' },
  'not run': { sym: '–', label: 'NOT RUN', cls: 'notrun' },
};

const str = (x: unknown, dflt = '') => (typeof x === 'string' ? x : dflt);

/** Turn whatever JSON arrived into the schema, with honest defaults for anything missing. */
export function normalizeSummary(raw: unknown): ValidationSummary {
  const r = (raw ?? {}) as Record<string, unknown>;
  const checks = Array.isArray(r.checks) ? r.checks : [];
  return {
    generated_utc: typeof r.generated_utc === 'string' ? r.generated_utc : null,
    limits: Array.isArray(r.limits) ? r.limits.filter((x): x is string => typeof x === 'string') : [],
    checks: checks.map((c0, i) => {
      const c = (c0 ?? {}) as Record<string, unknown>;
      const status = (str(c.status) in STATUS_INFO ? c.status : 'not run') as CheckStatus;
      const value = typeof c.value === 'number' && Number.isFinite(c.value) ? c.value : null;
      return {
        id: str(c.id, `check_${i + 1}`),
        title: str(c.title, str(c.id, `Check ${i + 1}`)),
        what: str(c.what),
        value,
        unit: str(c.unit),
        value_label: str(c.value_label, 'result'),
        pass_mark: str(c.pass_mark, 'not stated'),
        status,
        explanation: str(c.explanation) || 'No explanation was recorded for this check.',
        data: typeof c.data === 'string' && c.data ? c.data : null,
        rows: typeof c.rows === 'number' ? c.rows : 0,
      };
    }),
  };
}

type Fetcher = (url: string) => Promise<Response>;

export async function loadValidation(m: Manifest, fetcher: Fetcher = fetch, base = DATA_BASE): Promise<ValidationLoad> {
  const path = m.files.validation;
  if (!path) return { state: 'missing' };
  let res: Response;
  try {
    res = await fetcher(base + path);
  } catch {
    return { state: 'missing' };
  }
  if (!res.ok) return { state: 'missing' };
  try {
    const raw = (await res.json()) as Record<string, unknown>;
    return { state: 'ok', summary: normalizeSummary(raw), fixture: raw.fixture === true };
  } catch (e) {
    return { state: 'error', message: String(e) };
  }
}

export function checkCounts(checks: ValidationCheck[]): Record<CheckStatus, number> {
  const n: Record<CheckStatus, number> = { pass: 0, fail: 0, partial: 0, 'not run': 0 };
  for (const c of checks) n[c.status]++;
  return n;
}

/** "0.000026°", "3.4 percentage points", "1.5%". Three significant figures, never exponent notation for common sizes. */
export function formatCheckValue(c: Pick<ValidationCheck, 'value' | 'unit'>): string {
  if (c.value === null) return 'no number yet';
  const v = c.value;
  const a = Math.abs(v);
  const num = a === 0 ? '0' : a >= 100 ? v.toFixed(0) : String(Number(v.toPrecision(3)));
  const u = c.unit.trim();
  if (u === 'deg' || u === '°') return `${num}°`;
  if (u === '%') return `${num}%`;
  return u ? `${num} ${u}` : num;
}

/** Minimal RFC 4180 CSV parser: quoted fields, doubled quotes, CRLF. Returns the header, the first maxRows rows and the total row count. */
export function parseCsv(text: string, maxRows: number): { header: string[]; rows: string[][]; total: number } {
  const records: string[][] = [];
  let field = '', rec: string[] = [], q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else q = false;
      } else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { rec.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      rec.push(field); field = '';
      if (rec.length > 1 || rec[0] !== '') records.push(rec);
      rec = [];
    } else field += ch;
  }
  if (field !== '' || rec.length) { rec.push(field); records.push(rec); }
  const [header = [], ...body] = records;
  return { header, rows: body.slice(0, maxRows), total: body.length };
}

export async function loadCsvHead(path: string, maxRows: number, fetcher: Fetcher = fetch, base = DATA_BASE) {
  const res = await fetcher(base + path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return parseCsv(await res.text(), maxRows);
}
