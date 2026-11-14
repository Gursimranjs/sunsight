// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Review fix 5: every site names its source on the verdict card, and the app credits its data.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Site } from '../../src/data/types';
import { dataCredits, safeHttpUrl, siteCredit, TERRAIN_CREDIT } from '../../src/views/sourceCredits';

const real = (JSON.parse(readFileSync(new URL('../../public/data/sites.json', import.meta.url), 'utf8')) as { sites: Site[] }).sites;
const base: Site = { id: 'x', name: 'X', lat_deg: 0, lon_deg: 0, height_m: 0, category: 'c', region_id: null, miss_target_id: null, terrain_id: null, source_url: null };

describe('site source line', () => {
  it('links source_org to source_url with the notes as a tooltip', () => {
    const c = siteCredit({ ...base, source_org: 'LROC (NASA/GSFC/ASU)', source_url: 'https://lroc.im-ldi.com/images/1408', notes: 'Actual.' });
    expect(c).toEqual({ org: 'LROC (NASA/GSFC/ASU)', url: 'https://lroc.im-ldi.com/images/1408', notes: 'Actual.', computed: null });
  });

  it('falls back to the host name, drops unsafe links, and is null with nothing to say', () => {
    expect(siteCredit({ ...base, source_url: 'https://www.nasa.gov/x' })?.org).toBe('www.nasa.gov');
    expect(siteCredit({ ...base, source_org: 'Somebody', source_url: 'javascript:alert(1)' })).toEqual({ org: 'Somebody', url: null, notes: null, computed: null });
    expect(siteCredit(base)).toBeNull();
    expect(safeHttpUrl('ftp://a')).toBeNull();
    expect(safeHttpUrl('http://a.b/c')).toBe('http://a.b/c');
    expect(safeHttpUrl(42)).toBeNull();
  });

  it('a refined point adds the computed text from refined.method', () => {
    const c = siteCredit({ ...base, source_org: 'LROC', source_url: 'https://lroc.im-ldi.com/images/1247', refined: { method: 'highest share of hours lit at 10 m within 300 m' } });
    expect(c?.computed).toBe('Best-lit point nearby computed by SunSight (highest share of hours lit at 10 m within 300 m); not a cited figure.');
  });

  it('every shipped site has a source line with a safe link', () => {
    for (const s of real) {
      const c = siteCredit(s);
      expect(c, s.id).not.toBeNull();
      expect(c!.url, s.id).toMatch(/^https?:\/\//);
    }
    expect(siteCredit(real.find((s) => s.id === 'shackleton_ridge_rim')!)?.computed).toContain('computed by SunSight');
  });
});

describe('about the data', () => {
  it('lists terrain, kernels and validation sources, LROC only when a site cites it', () => {
    const withLroc = dataCredits(real);
    const ids = withLroc.map((c) => c.id);
    expect(ids).toEqual(['lola', 'naif', 'lroc', 'pgda69', 'horizons']);
    expect(withLroc.find((c) => c.id === 'lola')!.url).toBe('https://pgda.gsfc.nasa.gov/products/90');
    expect(withLroc.find((c) => c.id === 'lola')!.text).toContain('Barker et al. 2023');
    expect(withLroc.find((c) => c.id === 'naif')!.url).toBe('https://naif.jpl.nasa.gov/');
    expect(withLroc.find((c) => c.id === 'lroc')!.text).toContain('NASA/GSFC/Arizona State University');
    expect(withLroc.find((c) => c.id === 'pgda69')!.url).toBe('https://pgda.gsfc.nasa.gov/products/69');
    expect(withLroc.find((c) => c.id === 'horizons')!.url).toBe('https://ssd.jpl.nasa.gov/horizons/');
    expect(dataCredits([{ ...base, source_url: 'https://www.nasa.gov/x' }]).map((c) => c.id)).not.toContain('lroc');
    expect(TERRAIN_CREDIT.url).toBe('https://pgda.gsfc.nasa.gov/products/90');
  });
});
