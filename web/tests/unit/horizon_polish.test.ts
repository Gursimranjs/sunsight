// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Note 009 M2/M3 polish: play-bar keys and labels, the hero's load run, the game's reveal timing, the
// pickers' fixes (midnight anchoring, smooth-horizon label, chosen pin, edited rules) and token contrast.
import { readFileSync } from 'node:fs';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { decodeEphemeris } from '../../src/data/loaders';
import type { Site } from '../../src/data/types';
import { runCalendar, type CalendarJob } from '../../src/engine/compute';
import { makeRules, PRESETS } from '../../src/engine/light';
import { revealDelay_ms, REVEAL_SPREAD_MS } from '../../src/horizon/game/gameLogic';
import { runIndex, sampleIndex } from '../../src/horizon/HorizonHero';
import { ignorePlayKey, intoStay, reducedJump_s, REDUCED_STEPS, TIME_STEP_S } from '../../src/horizon/PlayBar';
import { DateStrip, dayFloor_s } from '../../src/horizon/pickers/DateStrip';
import { rulesEdited, ScenarioCards } from '../../src/horizon/pickers/ScenarioCards';
import { CHOSEN_RING, SiteMapPicker } from '../../src/horizon/pickers/SiteMapPicker';
import type { AppData } from '../../src/state/data';
import { defaultScenario, type Scenario } from '../../src/state/scenario';
import { byAttr, findAll, installDom, text } from './horizon_pickers_dom';
import { fixtureManifest, readBuf, readJson } from './helpers';

const WEB = new URL('../../', import.meta.url).pathname;
const SITES = (readJson<{ sites: Site[] }>('fixture_sites.json')).sites;
const DAY_S = 86400;

/** A stand-in event target: `closest` matches a tag, a role, a class or a contenteditable flag. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function target(tag: string, attrs: Record<string, string> = {}, parent?: any): any {
  const self = {
    tag, attrs, parent, isContentEditable: false,
    classList: { contains: (c: string) => (attrs.class ?? '').split(' ').includes(c) },
    matches(sel: string): boolean {
      return sel.split(',').map((x) => x.trim()).some((x) => {
        if (x === tag) return true;
        const m = x.match(/^([a-z]*)\[([a-z-]+)(?:=["']?([^\]"']*)["']?)?\]$/);
        if (!m) return false;
        if (m[1] && m[1] !== tag) return false;
        return attrs[m[2]] !== undefined && (m[3] === undefined || attrs[m[2]] === m[3]);
      });
    },
    closest(sel: string): unknown {
      for (let n: typeof self | undefined = self; n; n = n.parent as typeof self | undefined) if (n.matches(sel)) return n;
      return null;
    },
  };
  return self;
}
const key = (k: string, t: unknown, extra: Partial<KeyboardEvent> = {}) =>
  ({ key: k, target: t as EventTarget, defaultPrevented: false, altKey: false, ctrlKey: false, metaKey: false, ...extra });

describe('play bar keys (shell review #1)', () => {
  const body = target('body');
  it('acts on the page body and on Play (arrows only: Space on Play is its own click)', () => {
    expect(ignorePlayKey(key(' ', body))).toBe(false);
    expect(ignorePlayKey(key('ArrowRight', body))).toBe(false);
    const play = target('button', { class: 'hz-play' });
    expect(ignorePlayKey(key('ArrowLeft', play))).toBe(false);
    expect(ignorePlayKey(key(' ', play))).toBe(true);
  });
  it('leaves keys alone when another handler used them, or a modifier is held', () => {
    expect(ignorePlayKey(key(' ', body, { defaultPrevented: true }))).toBe(true);
    expect(ignorePlayKey(key('ArrowRight', body, { ctrlKey: true }))).toBe(true);
  });
  it('leaves keys alone on sliders, the 3D canvas, form fields, other buttons and dialogs (SVG too)', () => {
    const svg = target('svg');
    expect(ignorePlayKey(key('ArrowRight', target('circle', {}, target('g', { role: 'slider' }, svg))))).toBe(true);
    expect(ignorePlayKey(key(' ', target('g', { role: 'slider' })))).toBe(true);
    expect(ignorePlayKey(key('ArrowLeft', target('canvas')))).toBe(true);
    expect(ignorePlayKey(key('ArrowLeft', target('div', { role: 'application' })))).toBe(true);
    for (const t of ['input', 'select', 'textarea']) expect(ignorePlayKey(key('ArrowLeft', target(t)))).toBe(true);
    expect(ignorePlayKey(key(' ', target('button', { class: 'hz-pick' })))).toBe(true);
    expect(ignorePlayKey(key('ArrowRight', target('span', {}, target('button', { class: 'hz-chip' }))))).toBe(true);
    expect(ignorePlayKey(key('ArrowRight', target('p', {}, target('div', { role: 'dialog' }))))).toBe(true);
  });
  it('says the time into the stay with units in words, and steps in reduced motion on the 10-minute grid', () => {
    expect(intoStay(0)).toBe('day 0, 00:00 into the stay');
    expect(intoStay(DAY_S + 6 * 3600 + 30 * 60)).toBe('day 1, 06:30 into the stay');
    const stay_s = 6.5 * DAY_S;
    const jump_s = reducedJump_s(stay_s);
    expect(jump_s % TIME_STEP_S).toBe(0);
    expect(Math.abs(jump_s * REDUCED_STEPS - stay_s)).toBeLessThanOrEqual(REDUCED_STEPS * TIME_STEP_S / 2);
    expect(reducedJump_s(1200)).toBe(TIME_STEP_S);
  });
});

describe('hero load run', () => {
  it('finds the selected sample and runs along the path to it', () => {
    const t_s = Float64Array.from({ length: 10 }, (_, i) => 1000 + i * 600);
    expect(sampleIndex(t_s, 1000)).toBe(0);
    expect(sampleIndex(t_s, 1000 + 3 * 600)).toBe(3);
    expect(sampleIndex(t_s, 1e9)).toBe(9);
    // From the first sample to the selected one, ending exactly there.
    expect(runIndex(10, 6, 0)).toBe(0);
    expect(runIndex(10, 6, 1)).toBe(6);
    // At the start of the stay it runs back from the last sample.
    expect(runIndex(10, 0, 0)).toBe(9);
    expect(runIndex(10, 0, 1)).toBe(0);
    let prev = -1;
    for (let f = 0; f <= 1; f += 0.05) { const i = runIndex(100, 80, f); expect(i).toBeGreaterThanOrEqual(prev); prev = i; }
  });
});

describe('game reveal timing (game review #9)', () => {
  it('spreads outward from the target over 200 ms (300 ms with the 100 ms fade)', () => {
    expect(revealDelay_ms(0, 0, 500)).toBe(0);
    expect(revealDelay_ms(300, 400, 500)).toBe(REVEAL_SPREAD_MS);
    expect(revealDelay_ms(150, 0, 300)).toBe(REVEAL_SPREAD_MS / 2);
    expect(revealDelay_ms(900, 0, 300)).toBe(REVEAL_SPREAD_MS);
    const css = readFileSync(WEB + 'src/horizon/game/game.css', 'utf8');
    expect(css).toMatch(/\.hz-game-reveal \{ animation: hz-game-fade 100ms/);
    expect(css).toMatch(/\.hz-game :focus-visible \{ outline: 3px solid var\(--hz-ink/);
  });
  it('the game reads game_pt on its first render and the dev page no longer copies it back', () => {
    const src = readFileSync(WEB + 'src/horizon/game/LandGame.tsx', 'utf8');
    expect(src).toMatch(/sharedPt\.current = typeof location/);
    expect(src).not.toMatch(/parseGamePoint\(location\.search/);
    expect(readFileSync(WEB + 'src/horizon/game/devMount.tsx', 'utf8')).not.toMatch(/GAME_POINT_PARAM/);
  });
});

let doc: any; // eslint-disable-line @typescript-eslint/no-explicit-any
let root: any; // eslint-disable-line @typescript-eslint/no-explicit-any
beforeEach(() => { doc = installDom(); root = doc.createElement('div'); doc.body.appendChild(root); });
afterEach(async () => { await act(() => render(null, root)); });
const flush = async () => { for (let i = 0; i < 5; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };

function fixtureData(): AppData {
  const m = fixtureManifest();
  const eph = decodeEphemeris(readJson(m.files.ephemeris.meta), readBuf(m.files.ephemeris.bin));
  const table = { data: eph.data, rows: eph.meta.row_count, step_s: eph.meta.step_s };
  return {
    manifest: m, eph, table, sites: SITES, fixtureFiles: new Set(['manifest']),
    hasRange: () => true, ensureRange: () => Promise.resolve(),
    region: () => Promise.reject(new Error('not loaded in this test')),
    missGrid: () => Promise.reject(new Error('not loaded in this test')),
    markFixture: () => {},
    engine: { calendar: (job: CalendarJob) => Promise.resolve(runCalendar(table, job)) },
  } as unknown as AppData;
}

describe('date strip (tokens review #2, #3)', () => {
  it('anchors on the UTC midnight at or before the start', () => {
    expect(dayFloor_s(10 * DAY_S + 3600, 0)).toBe(10 * DAY_S);
    expect(dayFloor_s(10 * DAY_S, 0)).toBe(10 * DAY_S);
    // Table starting at 06:00 UTC: midnights sit 18 h after each table day boundary.
    const epoch_ms = 6 * 3600 * 1000;
    expect(dayFloor_s(0, epoch_ms)).toBe(-6 * 3600);
    expect(dayFloor_s(20 * 3600, epoch_ms)).toBe(18 * 3600);
  });
  it('keeps a 01:00 start on its own day, says so, and labels the smooth horizon of a custom point', async () => {
    const data = fixtureData();
    const midnight_s = dayFloor_s(10 * DAY_S, data.eph.start_ms);
    const scn: Scenario = { ...defaultScenario(null), lat_deg: 0.67, lon_deg: 23.47, start_s: midnight_s + 3600 };
    await act(() => render(h(DateStrip, { data, site: null, scn, onStart: () => {} }), root));
    await flush();
    const days = findAll(root, byAttr('data-testid', 'strip-day'));
    expect(days.length).toBeGreaterThan(0);
    expect(days[0].getAttribute('aria-current')).toBe('date');
    expect(text(findAll(root, byAttr('data-testid', 'strip-offset'))[0])).toBe('Your start, 01:00 UTC, is scored in the call; these days start at 00:00 UTC.');
    expect(findAll(root, byAttr('data-testid', 'strip-horizon'))).toHaveLength(1);
    expect(root.firstChild.getAttribute('class')).toContain('hz-surface');
    expect(text(root)).toContain('Site point only; the miss test is in Calendar.');
  });
});

describe('site map picker (tokens review #1, #4, #5, #7, #11)', () => {
  it('marks the chosen pin by shape, uses 24 px pins and the renamed list, and does not repeat the name aloud', async () => {
    await act(() => render(h(SiteMapPicker, { sites: SITES, siteId: 'fixture_target', onSite: () => {}, onClose: () => {} }), root));
    const pins = findAll(root, byAttr('data-testid', 'site-pin'));
    expect(pins[1].style.boxShadow).toBe(CHOSEN_RING);
    expect(pins[0].style.boxShadow ?? '').toBe('');
    expect(pins[0].style.width).toMatch(/^24/);
    expect(findAll(root, byAttr('class', 'hz-map-list')).length).toBeGreaterThan(0);
    expect(findAll(root, byAttr('class', 'hz-site-list'))).toHaveLength(0);
    expect(findAll(root, byAttr('data-testid', 'site-map-name'))[0].getAttribute('aria-live')).toBeNull();
    const css = readFileSync(WEB + 'src/horizon/tokens.css', 'utf8');
    expect(css).not.toMatch(/hz-pin-ring/);
    expect(css).toMatch(/\.hz \.hz-dialog \.hz-pins \.hz-pin:focus-visible \{\s*outline: 3px solid var\(--hz-sun/);
  });
});

describe('scenario cards (tokens review #6)', () => {
  it('says on the pressed card when the rules differ from its preset', async () => {
    const scn = defaultScenario(null);
    expect(rulesEdited(scn)).toBe(false);
    const edited = { ...scn, rules: { ...scn.rules, max_dark_s: scn.rules.max_dark_s + 3600 } };
    expect(rulesEdited(edited)).toBe(true);
    expect(rulesEdited({ ...scn, stay_s: scn.stay_s + DAY_S })).toBe(true);
    expect(rulesEdited({ ...scn, preset: 'crew', rules: makeRules(PRESETS.crew), stay_s: PRESETS.crew.stay_s })).toBe(false);
    await act(() => render(h(ScenarioCards, { scn, update: () => {} }), root));
    expect(findAll(root, byAttr('data-testid', 'scenario-edited'))).toHaveLength(0);
    await act(() => render(h(ScenarioCards, { scn: edited, update: () => {} }), root));
    const marks = findAll(root, byAttr('data-testid', 'scenario-edited'));
    expect(marks).toHaveLength(1);
    expect(text(marks[0])).toBe('Edited: your rules differ from this preset');
  });
});

/** WCAG 2.x contrast ratio of two #RRGGBB colours. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe('tokens on both surfaces (M3)', () => {
  const css = readFileSync(WEB + 'src/horizon/horizon.css', 'utf8');
  const SKY = '#000000', GROUND = '#CFCBC2', SHADE = '#8E8A82', INK = '#17181A', SUN = '#FFD27A';
  it('focus rings reach 3:1: Sun on the sky, ink on the ground and its shade', () => {
    expect(contrast(SUN, SKY)).toBeGreaterThanOrEqual(3);
    expect(contrast(INK, GROUND)).toBeGreaterThanOrEqual(3);
    expect(contrast(INK, SHADE)).toBeGreaterThanOrEqual(3);
    // The rejected pairs: Sun ring on the ground, white (classic) ring on the ground.
    expect(contrast(SUN, GROUND)).toBeLessThan(3);
    expect(contrast('#FFFFFF', GROUND)).toBeLessThan(3);
    expect(css).toMatch(/\.hz \.hz-ground :focus-visible[^{]*\{\s*outline: 3px solid var\(--hz-ink/);
  });
  it('text and marks on the sky: light text 4.5:1, go and no-go marks 3:1, the marginal mark light and hatched', () => {
    expect(contrast('#F2F2F2', SKY)).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#B5B2AB', '#0E0F10')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#1F7A4D', SKY)).toBeGreaterThanOrEqual(3);
    expect(contrast('#B4421E', SKY)).toBeGreaterThanOrEqual(3);
    expect(contrast(GROUND, SKY)).toBeGreaterThanOrEqual(3);
    expect(contrast('#FFFFFF', '#1F7A4D')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#FFFFFF', '#B4421E')).toBeGreaterThanOrEqual(4.5);
    expect(css).toMatch(/\.hz \.vbadge\.marginal \.sym \{ background: var\(--hz-hatch-sky\)/);
    expect(css).toMatch(/table\.calendar td\.cal\.go button, \.hz table\.calendar td\.cal\.no-go button \{ color: #FFFFFF; \}/);
  });
  it('no automatic motion with reduced motion: the call, the views and the miss-map dots', () => {
    const rm = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(rm).toMatch(/\.hz-call-enter \{ animation: none; \}/);
    expect(rm).toMatch(/\.hz-view \{ animation: none; \}/);
    expect(rm).toMatch(/miss-map\] > g\[stroke='var\(--nogo\)'\] \{ animation: none; \}/);
    expect(css.startsWith('/* SI-generated')).toBe(true);
    expect(css).toMatch(/@import '\.\/tokens\.css';/);
  });
});
