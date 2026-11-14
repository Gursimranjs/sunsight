// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// P10: site library and Anywhere mode.
import { describe, expect, it } from 'vitest';
import { loadSites } from '../../src/data/loaders';
import {
  groupSites, heightIndex, loadMaskSet, maskOf, nearestPoint, NO_TERRAIN_LABEL, resolveCustom, resolveSite,
} from '../../src/data/sites';
import * as L from '../../src/engine/light';
import { skyAt, skySeparation } from '../../src/engine/sky';
import { DATA, fileFetcher, fixtureManifest, fixtureTable } from './helpers';

describe('site library', () => {
  it('groups the manifest sites by category', async () => {
    const m = fixtureManifest();
    const { sites } = await loadSites(m, fileFetcher, DATA);
    const groups = groupSites(sites);
    expect(groups.reduce((a, g) => a + g.sites.length, 0)).toBe(sites.length);
    for (const g of groups) for (const s of g.sites) expect(s.category || 'other').toBe(g.category);
  });

  it('region sites use the nearest region point (or the named one) and its terrain mask', async () => {
    const m = fixtureManifest();
    const { sites } = await loadSites(m, fileFetcher, DATA);
    const site = sites.find((s) => s.region_id)!;
    const region = await loadMaskSet(m, 'regions', site.region_id!, fileFetcher, DATA);
    const r = resolveSite(site, region, 2);
    const i = nearestPoint(region.meta.points, site.lat_deg, site.lon_deg);
    expect(r.terrain).toBe(true);
    expect(r.pointId).toBe(region.meta.points[i].id);
    expect(Array.from(r.mask)).toEqual(Array.from(maskOf(region, i, 0)));
    // Named point wins over nearest.
    const named = resolveSite({ ...site, region_point_id: region.meta.points[8].id }, region, 10);
    expect(named.pointId).toBe(region.meta.points[8].id);
    expect(Array.from(named.mask)).toEqual(Array.from(maskOf(region, 8, 1)));
  });

  it('picks the nearest stored observer height', () => {
    expect(heightIndex([2, 10], 2)).toBe(0);
    expect(heightIndex([2, 10], 10)).toBe(1);
    expect(heightIndex([2, 10], 7)).toBe(1);
  });

  it('sites without terrain use the smooth horizon and say so', async () => {
    const m = fixtureManifest();
    const { sites } = await loadSites(m, fileFetcher, DATA);
    const site = sites.find((s) => !s.region_id)!;
    const r = resolveSite(site, null, 2);
    expect(r.terrain).toBe(false);
    expect(r.horizonLabel).toBe(NO_TERRAIN_LABEL);
    expect(r.mask.length).toBe(1440);
    expect(r.mask[0]).toBeCloseTo(-0.0867, 3); // smooth-Moon dip at 2 m
    expect(resolveCustom(10, 20, 10).mask[700]).toBeCloseTo(-0.194, 3); // and at 10 m
  });
});

describe('Anywhere mode', () => {
  it('returns finite Sun and Earth positions for any latitude and longitude, poles included', async () => {
    const t = await fixtureTable();
    for (const lat of [-90, -89.9, -45, 0, 33.3, 89.9, 90]) {
      for (const lon of [-180, -90, 0, 23.47, 179.99, 270]) {
        const s = skyAt(t, 12345, lat, lon, 0);
        for (const v of [s.sun.az_deg, s.sun.el_deg, s.sun.r_deg, s.earth.az_deg, s.earth.el_deg, s.earth.r_deg]) {
          expect(Number.isFinite(v)).toBe(true);
        }
        expect(s.sun.az_deg).toBeGreaterThanOrEqual(0);
        expect(s.sun.az_deg).toBeLessThan(360);
        expect(Math.abs(s.sun.el_deg)).toBeLessThanOrEqual(90);
      }
    }
  });

  it('at an Apollo-like near-side site (0.67N 23.47E) Earth stays near one spot for 30 days', async () => {
    const t = await fixtureTable();
    const pts: { az: number; el: number }[] = [];
    const sunAz: number[] = [];
    for (let h = 0; h <= 30 * 24; h += 1) {
      const s = skyAt(t, h * 3600, 0.67, 23.47, 0);
      pts.push({ az: s.earth.az_deg, el: s.earth.el_deg });
      sunAz.push(s.sun.el_deg);
    }
    // Mean direction as a unit vector.
    let x = 0, y = 0, z = 0;
    const d = Math.PI / 180;
    for (const p of pts) {
      x += Math.cos(p.el * d) * Math.sin(p.az * d); y += Math.cos(p.el * d) * Math.cos(p.az * d); z += Math.sin(p.el * d);
    }
    const meanEl = Math.atan2(z, Math.hypot(x, y)) / d;
    const meanAz = Math.atan2(x, y) / d;
    const maxOff = Math.max(...pts.map((p) => skySeparation(p.az, p.el, meanAz, meanEl)));
    console.log(`Apollo-like site: Earth mean az ${((meanAz + 360) % 360).toFixed(1)}°, el ${meanEl.toFixed(1)}°, max offset ${maxOff.toFixed(2)}° over 30 days`);
    // Libration in the fixture is +-7 deg in longitude and +-6.7 deg in latitude: Earth wanders within ~10 deg.
    expect(maxOff).toBeLessThan(10.5);
    expect(Math.min(...pts.map((p) => p.el))).toBeGreaterThan(50);
    // The Sun, by contrast, rises and sets over the same 30 days.
    expect(Math.max(...sunAz)).toBeGreaterThan(30);
    expect(Math.min(...sunAz)).toBeLessThan(-30);
  });

  it('a custom point gives a full window result through the same engine', async () => {
    const t = await fixtureTable();
    const r = resolveCustom(0.67, 23.47, 2);
    const m = L.window_metrics(t, r.lat_deg, r.lon_deg, r.h_m, r.mask, 0, 14 * 86400, L.PRESETS.robotic);
    expect(m.n_samples).toBe(2017);
    expect(m.lit_share).toBeGreaterThan(0);
  });
});
