// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Test helpers: read the committed data files from disk the way the app fetches them.
import { readFileSync } from 'node:fs';
import { decodeEphemeris, loadManifest } from '../../src/data/loaders';
import type { EphemerisMeta, Manifest } from '../../src/data/types';
import type { Table } from '../../src/engine/light';

export const DATA = new URL('../fixtures/data/', import.meta.url).pathname;

export function fileFetcher(url: string): Promise<Response> {
  try {
    const body = readFileSync(url);
    return Promise.resolve(new Response(body, { status: 200 }));
  } catch {
    return Promise.resolve(new Response('not found', { status: 404 }));
  }
}

export function readBuf(rel: string): ArrayBuffer {
  const b = readFileSync(DATA + rel);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

export function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(DATA + rel, 'utf8')) as T;
}

export function manifest(): Promise<Manifest> {
  return loadManifest(fileFetcher, DATA);
}

/** The made-up fixture manifest, always (even once real data exists), for tests with fixed answers. */
export function fixtureManifest(): Manifest {
  return readJson<Manifest>('fixture_manifest.json');
}

export async function fixtureTable(): Promise<Table> {
  const m = fixtureManifest();
  const eph = decodeEphemeris(readJson<EphemerisMeta>(m.files.ephemeris.meta), readBuf(m.files.ephemeris.bin));
  return { data: eph.data, rows: eph.meta.row_count, step_s: eph.meta.step_s };
}

/** Answers from the Python reference on fixture data (web/scripts/py_reference.py). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PY: any = JSON.parse(readFileSync(new URL('./fixtures/py_reference.json', import.meta.url), 'utf8'));
