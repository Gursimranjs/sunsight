// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Fixes after the second polish review and note 010: play-bar keys on scrollable regions, Sun and Earth
// label collision, the below-the-horizon marker text, the grouped site list and the font budget.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Site } from '../../src/data/types';
import { belowHorizon, belowText, labelSides, labelY } from '../../src/horizon/HorizonHero';
import { ignorePlayKey } from '../../src/horizon/PlayBar';
import { groupSites, SITE_GROUPS, siteGroup } from '../../src/horizon/pickers/SiteMapPicker';

const WEB = new URL('../../', import.meta.url).pathname;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function el(tag: string, attrs: Record<string, string> = {}, parent?: any): any {
  const self = {
    tag, attrs, parent, isContentEditable: false,
    classList: { contains: (c: string) => (attrs.class ?? '').split(' ').includes(c) },
    matches(sel: string): boolean {
      return sel.split(',').map((x) => x.trim()).some((x) => {
        if (x === tag) return true;
        if (x.startsWith('.')) return (attrs.class ?? '').split(' ').includes(x.slice(1));
        const parts = [...x.matchAll(/\[([a-z-]+)(?:=["']?([^\]"']*)["']?)?\]/g)];
        const head = x.replace(/\[.*$/, '');
        if (!parts.length || (head && head !== tag)) return false;
        return parts.every((m) => attrs[m[1]] !== undefined && (m[2] === undefined || attrs[m[1]] === m[2]));
      });
    },
    closest(sel: string): unknown {
      for (let n: typeof self | undefined = self; n; n = n.parent as typeof self | undefined) if (n.matches(sel)) return n;
      return null;
    },
  };
  return self;
}
const key = (k: string, t: unknown) => ({ key: k, target: t as EventTarget, defaultPrevented: false, altKey: false, ctrlKey: false, metaKey: false });

describe('play-bar keys (polish review 2 #1)', () => {
  const body = el('body');
  const main = el('main', {}, body);
  it('leaves arrows and Space to a focusable scroll region (a table that scrolls sideways)', () => {
    const region = el('div', { role: 'region', tabindex: '0', class: 'scroll-x' }, main);
    expect(ignorePlayKey(key('ArrowRight', region))).toBe(true);
    expect(ignorePlayKey(key(' ', el('td', {}, region)))).toBe(true);
  });
  it('acts only on the page body, the play bar and the hero', () => {
    expect(ignorePlayKey(key('ArrowRight', body))).toBe(false);
    const bar = el('div', { class: 'hz-playbar' }, main);
    expect(ignorePlayKey(key('ArrowRight', el('p', {}, bar)))).toBe(false);
    const hero = el('div', { class: 'hz-hero' }, main);
    expect(ignorePlayKey(key('ArrowLeft', el('svg', {}, hero)))).toBe(false);
    // Anywhere else (a focusable paragraph in a view, say) the browser keeps the key.
    expect(ignorePlayKey(key('ArrowRight', el('p', { tabindex: '-1' }, main)))).toBe(true);
  });
});

describe('Sun and Earth labels (note 010 #6)', () => {
  // The default link (Shackleton ridge, 24 Jul 2029 00:00 UTC, crew) at 375 px wide, read off the built page.
  const sun = { cx: 195.1, cy: 88.5, ry: 2.33 };
  const earth = { cx: 174.8, cy: 89.2, ry: 8.6 };
  it('puts one label above its disc and the other below when the two boxes overlap', () => {
    const sides = labelSides(sun, earth);
    expect(sides).toEqual({ sun: 'above', earth: 'below' });
    expect(labelY(earth.cy, earth.ry, 'below')).toBeGreaterThan(earth.cy);
    expect(labelY(sun.cy, sun.ry, 'above')).toBeLessThan(sun.cy);
  });
  it('keeps both above when they are apart', () => {
    expect(labelSides(sun, { ...earth, cx: 40 })).toEqual({ sun: 'above', earth: 'above' });
    expect(labelSides(sun, { ...earth, cy: 20 })).toEqual({ sun: 'above', earth: 'above' });
  });
  it('the higher disc keeps its label above', () => {
    expect(labelSides({ ...sun, cy: 95 }, earth)).toEqual({ sun: 'below', earth: 'above' });
  });
});

describe('a body below the horizon (note 010 #8)', () => {
  it('says how far below level, from the engine sample, one decimal', () => {
    expect(belowText('sun', -2.06)).toBe('Sun 2.1° below');
    expect(belowText('earth', -0.44)).toBe('Earth 0.4° below');
    expect(belowText('sun', 0.3)).toBe('Sun behind the terrain');
  });
  it('is hidden only when the whole disc is under the terrain line at its azimuth', () => {
    const mask = new Float64Array(3600).fill(1);
    expect(belowHorizon(mask, 120, 0.5, 0.27)).toBe(true);
    expect(belowHorizon(mask, 120, 0.8, 0.27)).toBe(false);
  });
});

describe('site list headings (note 010 #9)', () => {
  const sites = (JSON.parse(readFileSync(WEB + 'public/data/sites.json', 'utf8')) as { sites: Site[] }).sites;
  const byId = (id: string) => sites.find((s) => s.id === id)!;
  it('groups by id and name: Apollo, commercial landers, other countries, the pole, the rest', () => {
    expect(siteGroup(byId('apollo_11'))).toBe('Apollo');
    expect(siteGroup(byId('im2_athena_target'))).toBe('Commercial landers');
    expect(siteGroup(byId('blue_ghost_m1'))).toBe('Commercial landers');
    expect(siteGroup(byId('hakuto_r_m2_target'))).toBe('Commercial landers');
    expect(siteGroup(byId('chandrayaan3_vikram'))).toBe('Other countries');
    expect(siteGroup(byId('change_4'))).toBe('Other countries');
    expect(siteGroup(byId('slim'))).toBe('Other countries');
    expect(siteGroup(byId('shackleton_ridge_rim'))).toBe('South pole candidates');
    expect(siteGroup(byId('a3_haworth'))).toBe('South pole candidates');
    expect(siteGroup({ id: 'x', name: 'Somewhere', lat_deg: 10 })).toBe('Other');
  });
  it('lists every site exactly once, the groups in the fixed order', () => {
    const groups = groupSites(sites);
    expect(groups.flatMap((g) => g.sites).length).toBe(sites.length);
    const order = groups.map((g) => SITE_GROUPS.indexOf(g.group));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(groups.slice(0, 4).map((g) => g.group)).toEqual(['South pole candidates', 'Commercial landers', 'Apollo', 'Other countries']);
  });
});

describe('fonts (note 010 #1)', () => {
  it('the self-hosted faces stay within the 80 kB budget', () => {
    const dir = WEB + 'public/fonts/';
    const total = readdirSync(dir).filter((f) => f.endsWith('.woff2')).reduce((n, f) => n + statSync(dir + f).size, 0);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(80 * 1024);
  });
});
