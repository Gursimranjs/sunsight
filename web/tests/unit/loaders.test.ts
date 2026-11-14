// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EPHEMERIS_COLUMNS } from '../../src/data/contracts';
import { decodeEphemeris, loadManifest, parseUtcMs } from '../../src/data/loaders';

const DATA = new URL('../fixtures/data/', import.meta.url).pathname;

function fileFetcher(url: string): Promise<Response> {
  try {
    const body = readFileSync(url);
    return Promise.resolve(new Response(body, { status: 200 }));
  } catch {
    return Promise.resolve(new Response('not found', { status: 404 }));
  }
}

describe('loaders', () => {
  it('falls back to the fixture manifest and flags it', async () => {
    const m = await loadManifest(fileFetcher, DATA);
    expect(m.format_version).toBeGreaterThanOrEqual(1);
    if (m.fixture) expect(m.files.ephemeris.bin.split('/').pop()!.startsWith('fixture_')).toBe(true);
  });

  it('decodes the ephemeris with the contract column count', async () => {
    const m = await loadManifest(fileFetcher, DATA);
    const meta = JSON.parse(readFileSync(DATA + m.files.ephemeris.meta, 'utf8'));
    expect(meta.columns).toEqual([...EPHEMERIS_COLUMNS]);
    const buf = readFileSync(DATA + m.files.ephemeris.bin);
    const eph = decodeEphemeris(meta, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    expect(eph.data.length).toBe(meta.row_count * 18);
    expect(eph.start_ms).toBe(Date.UTC(2027, 0, 1));
  });

  it('parses naive ISO strings as UTC', () => {
    expect(parseUtcMs('2027-01-01T00:00:00')).toBe(Date.UTC(2027, 0, 1));
  });
});
