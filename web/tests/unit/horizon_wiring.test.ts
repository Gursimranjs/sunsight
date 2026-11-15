// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Review note 009 wiring: the horizon interface's first view, the game's address-bar params, the
// "(edited rules)" phrase and the miss line's grid choice (pure helpers).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { makeRules, PRESETS } from '../../src/engine/light';
import { RULES_SOURCE_TEXT, rulesEdited, scenarioPhrase } from '../../src/horizon/MissionLine';
import { GAME_POINT_PARAM } from '../../src/horizon/game/gameLogic';
import { GAME_PT_PARAM, horizonQuery, initialView, MISS_LINE_RADIUS_M, missGridIdOf, stripUi } from '../../src/horizon/useHorizonState';
import { DEFAULT_QUERY, defaultScenario } from '../../src/state/scenario';
import { MISS_RADII_M } from '../../src/views/missGeometry';

describe('first view of the horizon interface', () => {
  it('is Horizon for the default link and for any link without a view param', () => {
    expect(initialView(stripUi('?ui=horizon'))).toEqual({ scnView: 'report', local: null });
    expect(initialView('site=shackleton_ridge_rim&preset=crew')).toEqual({ scnView: 'report', local: null });
  });
  it('keeps an explicit view, including view=miss from the default link written out in full', () => {
    expect(initialView(DEFAULT_QUERY)).toEqual({ scnView: null, local: null });
    expect(initialView('view=rank')).toEqual({ scnView: null, local: null });
  });
  it('opens the game for view=game', () => {
    expect(initialView('site=a&view=game&game_pt=p1')).toEqual({ scnView: 'report', local: 'game' });
  });
});

describe('address bar', () => {
  it('keeps ui=horizon, and view=game with game_pt only while the game is open', () => {
    expect(horizonQuery('site=a&preset=crew', null, '?site=a&game_pt=p7&ui=horizon')).toBe('?site=a&preset=crew&ui=horizon');
    const q = new URLSearchParams(horizonQuery('site=a&preset=crew', 'game', '?site=a&view=game&game_pt=p7&ui=horizon').slice(1));
    expect(q.get('ui')).toBe('horizon');
    expect(q.get('view')).toBe('game');
    expect(q.get('game_pt')).toBe('p7');
    expect(new URLSearchParams(horizonQuery('site=a', 'game', '?ui=horizon').slice(1)).has('game_pt')).toBe(false);
  });
  it("uses the game module's parameter name", () => {
    expect(GAME_PT_PARAM).toBe(GAME_POINT_PARAM);
  });
});

describe('scenario phrase', () => {
  const epochMs = Date.UTC(2027, 0, 1);
  it('says "(edited rules)" when any rule differs from the preset', () => {
    const s = defaultScenario('a');
    s.preset = 'crew';
    s.rules = makeRules(PRESETS.crew);
    s.stay_s = s.rules.stay_s;
    expect(rulesEdited(s, epochMs)).toBe(false);
    expect(scenarioPhrase(s.preset, s.stay_s, rulesEdited(s, epochMs))).toBe('crew sortie, 6.5 days');
    const patches = [
      { max_gap_s: s.rules.max_gap_s + 3600 }, { observer_height_m: s.rules.observer_height_m + 8 },
      { contact_mode: s.rules.contact_mode === 'earth' ? 'stations' as const : 'earth' as const }, { weights: [9, 9, 9] as [number, number, number] },
    ];
    for (const patch of patches) {
      const e = { ...s, rules: { ...s.rules, ...patch } };
      expect(rulesEdited(e, epochMs)).toBe(true);
      expect(scenarioPhrase(e.preset, e.stay_s, true)).toBe('crew sortie, 6.5 days (edited rules)');
    }
    // A longer stay is not a rule: the phrase already says the days.
    expect(rulesEdited({ ...s, stay_s: 10 * 86400 }, epochMs)).toBe(false);
  });
  it("shows the classic rules editor's honest label word for word", () => {
    const classic = readFileSync(new URL('../../src/views/RulesEditor.tsx', import.meta.url), 'utf8');
    expect(classic).toContain(RULES_SOURCE_TEXT);
  });
});

describe('miss line', () => {
  it("uses the Miss map's default radius, which is one of the computed radii", () => {
    expect(MISS_LINE_RADIUS_M).toBe(250);
    expect(MISS_RADII_M).toContain(MISS_LINE_RADIUS_M);
    const mv = readFileSync(new URL('../../src/views/MissView.tsx', import.meta.url), 'utf8');
    expect(mv).toContain(`useState(${MISS_LINE_RADIUS_M})`);
  });
  it('picks the same grid as the Miss map: own target first, else the grid the site lies in', () => {
    expect(missGridIdOf(null)).toBeNull();
    expect(missGridIdOf({ miss_target_id: 't', miss_grid_id: 'g' } as never)).toBe('t');
    expect(missGridIdOf({ miss_target_id: null, miss_grid_id: 'g' } as never)).toBe('g');
    expect(missGridIdOf({ miss_target_id: null, miss_grid_id: null } as never)).toBeNull();
  });
});
