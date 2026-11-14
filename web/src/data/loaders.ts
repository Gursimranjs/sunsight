// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
import { N_COLS } from './contracts';
import type { Ephemeris, EphemerisMeta, Manifest, Site } from './types';

export const DATA_BASE = `${import.meta.env.BASE_URL}data/`;

type Fetcher = (url: string) => Promise<Response>;

async function tryJson<T>(fetcher: Fetcher, url: string): Promise<T | null> {
  try {
    const res = await fetcher(url);
    if (!res.ok) return null;
    return (await res.json()) as T; // a dev server may answer index.html; json() then throws
  } catch {
    return null;
  }
}

/** Real data first; fall back to the made-up fixture, which the app must flag with a banner. */
export async function loadManifest(fetcher: Fetcher = fetch, base = DATA_BASE): Promise<Manifest> {
  const real = await tryJson<Manifest>(fetcher, base + 'manifest.json');
  if (real && typeof real.format_version === 'number') return real;
  const fix = await tryJson<Manifest>(fetcher, base + 'fixture_manifest.json');
  if (fix && typeof fix.format_version === 'number') return fix;
  throw new Error('No data manifest found');
}

export function parseUtcMs(iso: string): number {
  return Date.parse(iso.endsWith('Z') ? iso : iso + 'Z');
}

export function decodeEphemeris(meta: EphemerisMeta, buf: ArrayBuffer): Ephemeris {
  const expected = meta.row_count * N_COLS * 4;
  if (buf.byteLength !== expected) throw new Error(`Ephemeris size ${buf.byteLength} != ${expected}`);
  // Files are little-endian; every browser we target is little-endian, so a direct view is safe.
  return { meta, data: new Float32Array(buf), start_ms: parseUtcMs(meta.start_utc) };
}

export async function loadEphemeris(m: Manifest, fetcher: Fetcher = fetch, base = DATA_BASE): Promise<Ephemeris> {
  const meta = (await (await fetcher(base + m.files.ephemeris.meta)).json()) as EphemerisMeta;
  const buf = await (await fetcher(base + m.files.ephemeris.bin)).arrayBuffer();
  return decodeEphemeris(meta, buf);
}

export async function loadSites(m: Manifest, fetcher: Fetcher = fetch, base = DATA_BASE): Promise<{ fixture: boolean; sites: Site[] }> {
  const j = (await (await fetcher(base + m.files.sites)).json()) as { fixture?: boolean; sites: Site[] };
  return { fixture: j.fixture === true, sites: j.sites };
}

/** Decode int16 horizon masks (units of scale_deg) to degrees: points x heights x bins. */
export function decodeMasks(buf: ArrayBuffer, scaleDeg: number): Float32Array {
  const raw = new Int16Array(buf);
  const out = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw[i] * scaleDeg;
  return out;
}
