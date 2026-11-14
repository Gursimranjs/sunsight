// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Review fix 2: an answer is shown as current only when it was computed for the site (or custom
// point), the mask actually resolved and the rules now on screen. Anything else is stale at once.
import { describe, expect, it } from 'vitest';
import { resolveCustom, type Resolved } from '../../src/data/sites';
import * as L from '../../src/engine/light';
import { currentPlace, freshAnswer, placeRequestKey, windowKey, type TaggedPlace } from '../../src/state/freshness';
import { defaultScenario, type Scenario } from '../../src/state/scenario';

const scn = (patch: Partial<Scenario> = {}): Scenario => ({ ...defaultScenario('site_a'), ...patch });
const withHeight = (s: Scenario, h_m: number): Scenario => ({ ...s, rules: L.makeRules({ ...s.rules, observer_height_m: h_m }) });
const gridPlace = (stored_m: number): Resolved => ({
  lat_deg: -84.79, lon_deg: 29.2, h_m: 5000, mask: [stored_m], terrain: true,
  horizonLabel: 'Terrain horizon from the miss-test grid (10 m map), point g40', pointId: 'g40',
  maskKey: `miss:grid/g40@${stored_m}`,
});
const tag = (s: Scenario, place: Resolved): TaggedPlace => ({ req: placeRequestKey(s), place });

describe('place freshness', () => {
  it('a resolved place is current only for the site and observer height it was resolved for', () => {
    const a = scn();
    const tagged = tag(a, gridPlace(2));
    expect(currentPlace(tagged, placeRequestKey(a))).toBe(tagged.place);
    // Switching site: the old place is stale in the same render, before any effect runs.
    expect(currentPlace(tagged, placeRequestKey(scn({ site_id: 'site_b' })))).toBeNull();
    // Changing the observer height: stale until re-resolved, even if it would map to the same stored mask.
    expect(currentPlace(tagged, placeRequestKey(withHeight(a, 3)))).toBeNull();
    expect(currentPlace(tagged, placeRequestKey(withHeight(a, 10)))).toBeNull();
    // Other rule edits keep the place.
    expect(currentPlace(tagged, placeRequestKey({ ...a, rules: { ...a.rules, max_gap_s: 1 } }))).toBe(tagged.place);
    expect(currentPlace(null, placeRequestKey(a))).toBeNull();
  });

  it('custom coordinates are part of the request', () => {
    const c = scn({ site_id: null, lat_deg: -89.45, lon_deg: -137.31 });
    const tagged = tag(c, resolveCustom(c.lat_deg, c.lon_deg, 2));
    expect(currentPlace(tagged, placeRequestKey(c))).not.toBeNull();
    expect(currentPlace(tagged, placeRequestKey({ ...c, lon_deg: -137.3 }))).toBeNull();
    // A site and a custom point at the same coordinates are different requests.
    expect(placeRequestKey({ ...c, site_id: 'x' })).not.toBe(placeRequestKey(c));
  });
});

describe('window key', () => {
  it('includes the request, the resolved mask identity and the rules', () => {
    const a = scn();
    const req = placeRequestKey(a);
    const k2 = windowKey(req, gridPlace(2), a);
    expect(windowKey(req, gridPlace(2), a)).toBe(k2);
    // Same point, same label, same rules, different stored mask: different key (the old bug).
    expect(windowKey(req, gridPlace(10), a)).not.toBe(k2);
    expect(windowKey(placeRequestKey(scn({ site_id: 'site_b' })), gridPlace(2), a)).not.toBe(k2);
    expect(windowKey(req, gridPlace(2), { ...a, rules: { ...a.rules, lit_threshold: 0.6 } })).not.toBe(k2);
    expect(windowKey(req, gridPlace(2), { ...a, start_s: 3600 })).not.toBe(k2);
    expect(windowKey(req, gridPlace(2), { ...a, stay_s: a.stay_s - 3600 })).not.toBe(k2);
    // The selected time does not change the answer.
    const later: Scenario = { ...a, t_off_s: 7200 };
    expect(windowKey(req, gridPlace(2), later)).toBe(k2);
    // Smooth horizons at different heights differ through their dip.
    expect(resolveCustom(0, 0, 2).maskKey).not.toBe(resolveCustom(0, 0, 10).maskKey);
  });

  it('an answer is fresh only under its own key; a stale place gives no key', () => {
    const a = scn();
    const k = windowKey(placeRequestKey(a), gridPlace(2), a);
    const result = { key: k, answer: 'A' };
    expect(freshAnswer(result, k)).toBe('A');
    expect(freshAnswer(result, '')).toBeNull();
    expect(freshAnswer(result, windowKey(placeRequestKey(a), gridPlace(10), a))).toBeNull();
    expect(freshAnswer(null, k)).toBeNull();
    // After a site switch the App has no current place, so no key and nothing fresh.
    const b = scn({ site_id: 'site_b' });
    const place = currentPlace(tag(a, gridPlace(2)), placeRequestKey(b));
    expect(place ? windowKey(placeRequestKey(b), place, b) : '').toBe('');
  });
});
