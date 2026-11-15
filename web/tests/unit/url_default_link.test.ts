// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Note 011 #9: a link without a place (only unknown parameters such as fbclid) opens the default link,
// in the classic interface and in the horizon interface.
import { describe, expect, it } from 'vitest';
import { stripUi } from '../../src/horizon/useHorizonState';
import { DEFAULT_QUERY, DEFAULT_SITE_ID } from '../../src/state/scenario';
import { decodeScenario, hasPlace, startQuery } from '../../src/state/url';

const epoch = Date.UTC(2027, 0, 1);
const ids = [DEFAULT_SITE_ID, 'a3_malapert_massif', 'im2_athena_target'];
const first = 'im2_athena_target';
const open = (search: string) => decodeScenario(startQuery(stripUi(search), DEFAULT_QUERY), epoch, first, ids);
const dflt = decodeScenario(DEFAULT_QUERY, epoch, first, ids);

describe('default link when the address names no place (note 011 #9)', () => {
  for (const search of ['?foo=1&ui=classic', '?ui=horizon&foo=1', '?r=6', '?ui=horizon&r=1526', '?fbclid=abc&utm_source=x', '']) {
    it(`${search || '(empty)'} opens the default link's site, date and preset`, () => {
      const s = open(search);
      expect(s.site_id).toBe(DEFAULT_SITE_ID);
      expect(s.start_s).toBe(dflt.start_s);
      expect(new Date(epoch + s.start_s * 1000).toISOString().slice(0, 16)).toBe('2029-07-24T00:00');
      expect(s.preset).toBe(dflt.preset);
      expect(s.rules).toEqual(dflt.rules);
      expect(s.stay_s).toBe(dflt.stay_s);
    });
  }

  it('a link that names a site or a point is opened as it is', () => {
    expect(hasPlace('site=a3_malapert_massif')).toBe(true);
    expect(hasPlace('lat=-89&lon=10')).toBe(true);
    expect(hasPlace('lat=-89')).toBe(false);
    expect(hasPlace('foo=1')).toBe(false);
    const s = open('?site=a3_malapert_massif&start=2027-10-13T00:00Z&preset=robotic&foo=1');
    expect(s.site_id).toBe('a3_malapert_massif');
    expect(s.preset).toBe('robotic');
    const c = open('?lat=-89.5&lon=12&ui=horizon');
    expect(c.site_id).toBeNull();
    expect(c.lat_deg).toBe(-89.5);
  });

  it('scenario parameters of a site-less link are laid over the default link', () => {
    const s = open('?start=2027-01-01T00:00Z&preset=robotic&view=rank&ui=classic');
    expect(s.site_id).toBe(DEFAULT_SITE_ID);
    expect(s.start_s).toBe(0);
    expect(s.preset).toBe('robotic');
    expect(s.view).toBe('rank');
  });

  it('without a shipped default site the query is used as it is', () => {
    expect(startQuery('foo=1', '')).toBe('foo=1');
    expect(startQuery('', '')).toBe('');
  });
});
