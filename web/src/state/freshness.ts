// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Which resolved place and which window answer belong to the scenario on screen right now.
// A place is tagged with the request it was resolved for; an answer with the key of the inputs
// it was computed from. Anything that does not match is stale in the same render.
import type { Resolved } from '../data/sites';
import type { Scenario } from './scenario';

/** What a place was resolved for: the site id or the custom coordinates, and the observer height. */
export function placeRequestKey(s: Pick<Scenario, 'site_id' | 'lat_deg' | 'lon_deg' | 'rules'>): string {
  const h_m = s.rules.observer_height_m;
  return JSON.stringify(s.site_id ? ['site', s.site_id, h_m] : ['custom', s.lat_deg, s.lon_deg, h_m]);
}

export interface TaggedPlace { req: string; place: Resolved }

/** The resolved place if it was resolved for this request, else null (still resolving). */
export function currentPlace(tagged: TaggedPlace | null, req: string): Resolved | null {
  return tagged && tagged.req === req ? tagged.place : null;
}

/** Key of a window job: request, the mask actually used, the point, dates and rules. */
export function windowKey(req: string, place: Resolved, s: Pick<Scenario, 'start_s' | 'stay_s' | 'rules'>): string {
  return JSON.stringify([req, place.maskKey, place.pointId, place.lat_deg, place.lon_deg, place.h_m, s.start_s, s.stay_s, s.rules]);
}

/** The answer if it was computed under this key, else null. An empty key is never fresh. */
export function freshAnswer<T>(result: { key: string; answer: T } | null, key: string): T | null {
  return key && result && result.key === key ? result.answer : null;
}
