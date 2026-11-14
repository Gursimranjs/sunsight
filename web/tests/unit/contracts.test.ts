// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import * as C from '../../src/data/contracts';

const py = readFileSync(new URL('../../../pipeline/sunsight/contracts.py', import.meta.url), 'utf8');
const num = (name: string) => Number(new RegExp(`^${name} = ([0-9_.]+)`, 'm').exec(py)![1].replace(/_/g, ''));

it('TypeScript contracts mirror the Python ones', () => {
  expect(num('BIN_COUNT')).toBe(C.BIN_COUNT);
  expect(num('MASK_SCALE_DEG')).toBe(C.MASK_SCALE_DEG);
  expect(num('MOON_RADIUS_KM')).toBe(C.MOON_RADIUS_KM);
  expect(num('SUN_RADIUS_KM')).toBe(C.SUN_RADIUS_KM);
  expect(num('EARTH_RADIUS_KM')).toBe(C.EARTH_RADIUS_KM);
  for (const c of C.EPHEMERIS_COLUMNS) expect(py).toContain(`"${c}"`);
});
