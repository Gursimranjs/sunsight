// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Review fixes 3, 4 and 8: hostile preset names, the 20° cap on the station-elevation rule
// (DECISIONS #24) and duplicate compare slots in a shared link.
import { describe, expect, it } from 'vitest';
import * as L from '../../src/engine/light';
import { clampRules, clampScenario, defaultScenario, MAX_MOON_EL_DEG, uniqueCompareIds } from '../../src/state/scenario';
import { decodeScenario, encodeScenario } from '../../src/state/url';

const epoch = Date.UTC(2027, 0, 1);
const meta = { row_count: 1440, step_s: 3600 };
const ids = ['fixture_ridge', 'fixture_target', 'fixture_equator'];

describe('hostile preset names (finding 3)', () => {
  for (const preset of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf']) {
    it(`?preset=${preset} falls back to the default preset`, () => {
      const s = decodeScenario(`site=fixture_ridge&preset=${preset}&gap_h=5`, epoch, 'fixture_ridge', ids);
      expect(s.preset).toBe('robotic');
      expect(s.rules).toEqual(L.makeRules({ ...L.PRESETS.robotic, max_gap_s: 5 * 3600 }));
      expect(() => encodeScenario(clampScenario(s, meta), epoch)).not.toThrow();
    });
  }
  it('real presets still decode', () => {
    expect(decodeScenario('preset=crew', epoch, null, ids).preset).toBe('crew');
    expect(decodeScenario('preset=long', epoch, null, ids).preset).toBe('long');
  });
});

describe('Moon elevation at the station is capped to 0-20° (finding 4)', () => {
  it('decodeScenario clamps moon_el_deg', () => {
    expect(decodeScenario('moon_el_deg=45', epoch, null, ids).rules.min_moon_el_deg).toBe(MAX_MOON_EL_DEG);
    expect(decodeScenario('moon_el_deg=-5', epoch, null, ids).rules.min_moon_el_deg).toBe(0);
    expect(decodeScenario('moon_el_deg=15', epoch, null, ids).rules.min_moon_el_deg).toBe(15);
    expect(MAX_MOON_EL_DEG).toBe(20);
  });

  it('clampScenario and clampRules clamp it whatever the source', () => {
    const s = defaultScenario('fixture_ridge');
    expect(clampScenario({ ...s, rules: { ...s.rules, min_moon_el_deg: 30 } }, meta).rules.min_moon_el_deg).toBe(20);
    expect(clampScenario({ ...s, rules: { ...s.rules, min_moon_el_deg: -1 } }, meta).rules.min_moon_el_deg).toBe(0);
    expect(clampScenario({ ...s, rules: { ...s.rules, min_moon_el_deg: Number.NaN } }, meta).rules.min_moon_el_deg).toBe(L.PRESETS.robotic.min_moon_el_deg);
    expect(clampRules({ ...s.rules, min_moon_el_deg: 12.5 }).min_moon_el_deg).toBe(12.5);
  });

  it('every preset is inside the cap', () => {
    for (const p of Object.values(L.PRESETS)) expect(p.min_moon_el_deg).toBeLessThanOrEqual(MAX_MOON_EL_DEG);
  });
});

describe('compare list in the URL (finding 8)', () => {
  it('drops duplicate site ids, keeps order, at most three', () => {
    const s = decodeScenario('cmp=fixture_ridge,fixture_ridge,fixture_target,fixture_ridge,fixture_equator', epoch, null, ids);
    expect(s.compare).toEqual(['fixture_ridge', 'fixture_target', 'fixture_equator']);
    expect(decodeScenario('cmp=fixture_target,fixture_target', epoch, null, ids).compare).toEqual(['fixture_target']);
  });

  it('compare slots never hold a duplicate or a hole', () => {
    const slots: (string | undefined)[] = ['a'];
    slots[2] = 'b'; // picking slot 3 while slot 2 is empty
    expect(uniqueCompareIds(slots)).toEqual(['a', 'b']);
    expect(uniqueCompareIds(['a', 'b', 'a', 'c', 'd'])).toEqual(['a', 'b', 'c']);
    expect(uniqueCompareIds(['', 'a', 'a'])).toEqual(['a']);
  });
});
