// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Horizon pickers (review note 009, M3): site map, date strip and scenario cards, rendered with Preact
// into a minimal DOM with the fixture data; roles, labels, callbacks, projection and verdict cells.
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { decodeEphemeris } from '../../src/data/loaders';
import type { Site } from '../../src/data/types';
import { runCalendar, type CalendarJob } from '../../src/engine/compute';
import { PRESET_LABELS, PRESETS } from '../../src/engine/light';
import { DateStrip, STRIP_DAYS, STRIP_WORD, stripFrom } from '../../src/horizon/pickers/DateStrip';
import { ScenarioCards, presetPatch } from '../../src/horizon/pickers/ScenarioCards';
import { polarXY, SiteMapPicker, splitSites, spreadPins } from '../../src/horizon/pickers/SiteMapPicker';
import type { AppData } from '../../src/state/data';
import { defaultScenario, type Scenario } from '../../src/state/scenario';
import { dayStarts } from '../../src/views/calendar';
import { byAttr, byTag, findAll, installDom, makeEvent, text } from './horizon_pickers_dom';
import { fixtureManifest, readBuf, readJson } from './helpers';

const SITES = (readJson<{ sites: Site[] }>('fixture_sites.json')).sites;

let doc: any; // eslint-disable-line @typescript-eslint/no-explicit-any
let root: any; // eslint-disable-line @typescript-eslint/no-explicit-any
beforeEach(() => {
  doc = installDom();
  root = doc.createElement('div');
  doc.body.appendChild(root);
});
afterEach(async () => { await act(() => render(null, root)); });

const flush = async () => { for (let i = 0; i < 5; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };

describe('polar stereographic projection', () => {
  it('puts the pole at the centre, 80°S on the unit circle and 0° longitude up', () => {
    expect(polarXY(-90, 0)).toEqual({ x: 0, y: -0 });
    const edge = polarXY(-80, 0);
    expect(edge.x).toBeCloseTo(0, 12);
    expect(edge.y).toBeCloseTo(-1, 12);
    const east = polarXY(-80, 90);
    expect(east.x).toBeCloseTo(1, 12);
    expect(east.y).toBeCloseTo(0, 12);
  });
  it('is the stereographic radius tan((90° + lat) / 2), not a linear one', () => {
    const p = polarXY(-85, 180);
    const want = Math.tan((2.5 * Math.PI) / 180) / Math.tan((5 * Math.PI) / 180);
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(want, 12);
    expect(p.y).toBeGreaterThan(0); // 180° points down
  });
  it('spreads overlapping pins apart and leaves distant ones where they are', () => {
    const pts = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 50, y: 50 }];
    const out = spreadPins(pts, 10);
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) expect(Math.hypot(out[i].x - out[j].x, out[i].y - out[j].y)).toBeGreaterThanOrEqual(10 - 1e-6);
    }
    expect(out[3]).toEqual({ x: 50, y: 50 });
    expect(pts[0]).toEqual({ x: 0, y: 0 }); // input untouched
  });
  it('splits sites at 80°S', () => {
    const { polar, other } = splitSites(SITES);
    expect(polar.map((s) => s.id)).toEqual(['fixture_ridge', 'fixture_target']);
    expect(other.map((s) => s.id)).toEqual(['fixture_equator']);
  });
});

describe('SiteMapPicker', () => {
  it('is a labelled dialog with one pin button per polar site and a list for the rest', async () => {
    const picked: string[] = [];
    let closed = 0;
    await act(() => render(h(SiteMapPicker, { sites: SITES, siteId: 'fixture_target', onSite: (id) => picked.push(id), onClose: () => closed++ }), root));
    const dlg = findAll(root, byAttr('role', 'dialog'));
    expect(dlg).toHaveLength(1);
    expect(dlg[0].getAttribute('aria-modal')).toBe('true');
    const title = findAll(root, byAttr('id', dlg[0].getAttribute('aria-labelledby')!));
    expect(text(title[0])).toBe('Choose a landing site');
    const pins = findAll(root, byAttr('data-testid', 'site-pin'));
    expect(pins.map((p) => p.localName)).toEqual(['button', 'button']);
    expect(pins[0].getAttribute('aria-label')).toBe('1. Fixture ridge (made-up), 89.42°S');
    expect(pins[1].getAttribute('aria-current')).toBe('true');
    // The chosen site's pin has focus on open.
    expect(doc.activeElement).toBe(pins[1]);
    const elsewhere = findAll(root, byAttr('aria-label', 'Sites elsewhere on the Moon'));
    expect(text(elsewhere[0])).toBe(SITES[2].name);
    await act(() => { pins[0].click(); });
    expect(picked).toEqual(['fixture_ridge']);
    expect(closed).toBe(1);
    const eq = findAll(elsewhere[0], byTag('button'))[0];
    await act(() => { eq.click(); });
    expect(picked).toEqual(['fixture_ridge', 'fixture_equator']);
  });

  it('closes on Escape and keeps Tab inside the dialog', async () => {
    let closed = 0;
    await act(() => render(h(SiteMapPicker, { sites: SITES, siteId: null, onSite: () => {}, onClose: () => closed++ }), root));
    const dlg = findAll(root, byAttr('role', 'dialog'))[0];
    const buttons = findAll(dlg, byTag('button'));
    expect(doc.activeElement).toBe(buttons[0]); // nothing chosen: the first control (Close)
    buttons[buttons.length - 1].focus();
    const tab = makeEvent('keydown', { key: 'Tab', shiftKey: false });
    await act(() => { doc.activeElement.dispatchEvent(tab); });
    expect(tab.defaultPrevented).toBe(true);
    expect(doc.activeElement).toBe(buttons[0]);
    const back = makeEvent('keydown', { key: 'Tab', shiftKey: true });
    await act(() => { doc.activeElement.dispatchEvent(back); });
    expect(doc.activeElement).toBe(buttons[buttons.length - 1]);
    await act(() => { doc.activeElement.dispatchEvent(makeEvent('keydown', { key: 'Escape' })); });
    expect(closed).toBe(1);
  });

  it('offers custom coordinates only when asked, and passes them on', async () => {
    const got: [number, number][] = [];
    await act(() => render(h(SiteMapPicker, { sites: SITES, siteId: null, onSite: () => {}, onClose: () => {}, lat_deg: 0.67, lon_deg: 23.47, onCustom: (a, b) => got.push([a, b]) }), root));
    const form = findAll(root, byTag('form'))[0];
    const submit = findAll(form, byAttr('type', 'submit'))[0];
    expect(text(submit)).toBe('Use these coordinates');
    expect(submit.disabled).toBe(false);
    await act(() => { form.dispatchEvent(makeEvent('submit')); });
    expect(got).toEqual([[0.67, 23.47]]);
  });
});

/** AppData over the fixture table; the engine's calendar job runs in-process (runCalendar). */
function fixtureData(): AppData {
  const m = fixtureManifest();
  const eph = decodeEphemeris(readJson(m.files.ephemeris.meta), readBuf(m.files.ephemeris.bin));
  const table = { data: eph.data, rows: eph.meta.row_count, step_s: eph.meta.step_s };
  const jobs: CalendarJob[] = [];
  const data = {
    manifest: m, eph, table, sites: SITES, fixtureFiles: new Set(['manifest']),
    hasRange: () => true, ensureRange: () => Promise.resolve(),
    region: () => Promise.reject(new Error('not loaded in this test')),
    missGrid: () => Promise.reject(new Error('not loaded in this test')),
    markFixture: () => {},
    engine: { calendar: (job: CalendarJob) => { jobs.push(job); return Promise.resolve(runCalendar(table, job)); } },
    jobs,
  };
  return data as unknown as AppData;
}

describe('DateStrip', () => {
  it('shows this site\'s start dates scored by the engine, with a word and a symbol, and calls onStart', async () => {
    const data = fixtureData();
    const scn: Scenario = { ...defaultScenario(null), lat_deg: 0.67, lon_deg: 23.47, start_s: 10 * 86400 };
    const starts: number[] = [];
    await act(() => render(h(DateStrip, { data, site: null, scn, onStart: (s) => starts.push(s) }), root));
    await flush();
    const days = findAll(root, byAttr('data-testid', 'strip-day'));
    const want = dayStarts(scn.start_s, STRIP_DAYS, scn.stay_s, data.eph.meta, data.eph.start_ms);
    expect(days).toHaveLength(want.length);
    expect(want.length).toBe(STRIP_DAYS);
    // Same cells as the engine's calendar for one site.
    const job = (data as unknown as { jobs: CalendarJob[] }).jobs.at(-1)!;
    expect(job.sites).toHaveLength(1);
    expect(job.day_starts_s).toEqual(want);
    const cells = runCalendar(data.table, job).cells[0];
    days.forEach((d, j) => {
      const v = cells[j].verdict;
      expect(d.getAttribute('data-verdict')).toBe(v);
      expect(text(d)).toContain(STRIP_WORD[v].word);
      expect(text(d)).toContain(STRIP_WORD[v].sym);
      expect(d.getAttribute('aria-label')).toContain(`${STRIP_WORD[v].word.toLowerCase()}, score ${cells[j].score.toFixed(0)}`);
    });
    expect(days[0].getAttribute('aria-current')).toBe('date');
    await act(() => { days[3].click(); });
    expect(starts).toEqual([want[3]]);
    expect(text(root)).toContain('Start dates at 0.67°, 23.47°');
  });

  it('pages 30 days earlier, and offers later only while a stay still fits', async () => {
    const data = fixtureData();
    const scn: Scenario = { ...defaultScenario('fixture_equator'), start_s: 40 * 86400 };
    await act(() => render(h(DateStrip, { data, site: SITES[2], scn, onStart: () => {} }), root));
    await flush();
    const nav = findAll(root, byTag('button')).filter((b) => /days$/.test(text(b)));
    expect(nav.map(text)).toEqual(['Earlier 30 days', 'Later 30 days']);
    // The fixture table is short: no later page fits a 14-day stay, so "Later" is off.
    expect(nav[1].disabled).toBe(true);
    expect(nav[0].disabled).toBe(false);
    await act(() => { nav[0].click(); });
    await flush();
    const job = (data as unknown as { jobs: CalendarJob[] }).jobs.at(-1)!;
    const earlier = dayStarts(stripFrom(40 * 86400, -1, Infinity), STRIP_DAYS, scn.stay_s, data.eph.meta, data.eph.start_ms);
    expect(earlier[0]).toBe(10 * 86400);
    expect(job.day_starts_s).toEqual(earlier);
    expect(text(root)).toContain(`Start dates at ${SITES[2].name}`);
    expect(stripFrom(10 * 86400, -1, 1e9)).toBe(0);
  });
});

describe('ScenarioCards', () => {
  it('shows the three presets from PRESETS and switches with the classic patch', async () => {
    const patches: Partial<Scenario>[] = [];
    const scn = defaultScenario(null);
    await act(() => render(h(ScenarioCards, { scn, update: (p) => patches.push(p) }), root));
    const cards = findAll(root, byAttr('data-testid', 'scenario-card'));
    expect(cards.map((c) => c.localName)).toEqual(['button', 'button', 'button']);
    expect(cards.map((c) => c.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
    expect(text(cards[0])).toContain(`${PRESET_LABELS.robotic}14 days`);
    expect(text(cards[1])).toContain(`${PRESET_LABELS.crew}6.5 days`);
    expect(text(cards[2])).toContain(`${PRESET_LABELS.long}30 days`);
    expect(findAll(root, byAttr('role', 'group'))).toHaveLength(1);
    await act(() => { cards[1].click(); });
    expect(patches).toEqual([presetPatch('crew')]);
    expect(patches[0].stay_s).toBe(PRESETS.crew.stay_s);
  });

  it('keeps every rule inside a "Rules" disclosure', async () => {
    const patches: Partial<Scenario>[] = [];
    await act(() => render(h(ScenarioCards, { scn: defaultScenario(null), update: (p) => patches.push(p) }), root));
    const det = findAll(root, byTag('details'))[0];
    expect(text(findAll(det, byTag('summary'))[0])).toBe('Rules');
    const labels = findAll(det, byTag('label')).map((l) => text(findAll(l, byTag('span'))[0]));
    expect(labels).toContain('Longest darkness allowed (h)');
    expect(labels).toContain('Moon at least this high at the station (°, 0–20)');
    const dark = findAll(det, byTag('input'))[2];
    dark.value = '3';
    await act(() => { dark.dispatchEvent(makeEvent('change')); });
    expect(patches.at(-1)!.rules!.max_dark_s).toBe(3 * 3600);
  });
});
