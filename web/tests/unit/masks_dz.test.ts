// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { gunzip, undeltaMasks } from '../../src/data/loaders';

const DATA = new URL('../fixtures/data/', import.meta.url).pathname;
const ab = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

it('decodes .masks.dz to exactly the raw .masks.bin (format v2)', async () => {
  const raw = new Uint8Array(ab(readFileSync(DATA + 'regions/fixture_ridge.masks.bin')));
  const dz = ab(readFileSync(DATA + 'regions/fixture_ridge.masks.dz'));
  const back = new Uint8Array(undeltaMasks(await gunzip(dz), 1440));
  expect(back.length).toBe(raw.length);
  expect(Buffer.compare(Buffer.from(back), Buffer.from(raw))).toBe(0);
});
