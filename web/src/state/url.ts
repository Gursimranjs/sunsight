// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// The scenario in the URL query string, so a shared link reopens the same view on a static host.
import { makeRules, PRESETS, type PresetId, type Rules } from '../engine/light';
import { defaultScenario, VIEWS, type Scenario, type View } from './scenario';

const H = 3600;
const num = (v: string | null) => (v === null || v.trim() === '' ? NaN : Number(v));
const fmt = (x: number) => String(Number(x.toFixed(6)));

/** Query string for a scenario. Rules are written only where they differ from the preset. */
export function encodeScenario(s: Scenario, epoch_ms: number): string {
  const q = new URLSearchParams();
  if (s.site_id) q.set('site', s.site_id);
  else { q.set('lat', fmt(s.lat_deg)); q.set('lon', fmt(s.lon_deg)); }
  q.set('start', new Date(epoch_ms + s.start_s * 1000).toISOString().slice(0, 16) + 'Z');
  q.set('days', fmt(s.stay_s / 86400));
  q.set('preset', s.preset);
  const p = PRESETS[s.preset];
  const r = s.rules;
  if (r.observer_height_m !== p.observer_height_m) q.set('obs_m', fmt(r.observer_height_m));
  if (r.max_dark_s !== p.max_dark_s) q.set('dark_h', fmt(r.max_dark_s / H));
  if (r.max_gap_s !== p.max_gap_s) q.set('gap_h', fmt(r.max_gap_s / H));
  if (r.lit_threshold !== p.lit_threshold) q.set('lit', fmt(r.lit_threshold));
  if (r.min_moon_el_deg !== p.min_moon_el_deg) q.set('moon_el_deg', fmt(r.min_moon_el_deg));
  if (r.grazing_deg !== p.grazing_deg) q.set('graze_deg', fmt(r.grazing_deg));
  if (r.contact_mode !== p.contact_mode) q.set('contact', r.contact_mode);
  if (r.load_w !== p.load_w) q.set('load_w', fmt(r.load_w));
  if (r.weights.some((w, i) => w !== p.weights[i])) q.set('w', r.weights.map(fmt).join(','));
  if (s.view !== 'report') q.set('view', s.view);
  if (s.t_off_s) q.set('t_h', fmt(s.t_off_s / H));
  if (s.compare.length) q.set('cmp', s.compare.join(','));
  return q.toString();
}

/** Scenario from a query string; anything missing or invalid falls back to the defaults. */
export function decodeScenario(query: string, epoch_ms: number, fallbackSite: string | null, siteIds: string[]): Scenario {
  const q = new URLSearchParams(query);
  const s = defaultScenario(fallbackSite);
  const site = q.get('site');
  const lat = num(q.get('lat')), lon = num(q.get('lon'));
  if (site && siteIds.includes(site)) s.site_id = site;
  else if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90) { s.site_id = null; s.lat_deg = lat; s.lon_deg = lon; }
  const preset = q.get('preset') as PresetId | null;
  if (preset && preset in PRESETS) s.preset = preset;
  const base = PRESETS[s.preset];
  const r: Rules = makeRules(base);
  const set = (key: string, f: (v: number) => void) => { const v = num(q.get(key)); if (Number.isFinite(v)) f(v); };
  set('obs_m', (v) => (r.observer_height_m = Math.max(0, v)));
  set('dark_h', (v) => (r.max_dark_s = Math.max(0, v) * H));
  set('gap_h', (v) => (r.max_gap_s = Math.max(0, v) * H));
  set('lit', (v) => (r.lit_threshold = Math.min(1, Math.max(0.01, v))));
  set('moon_el_deg', (v) => (r.min_moon_el_deg = v));
  set('graze_deg', (v) => (r.grazing_deg = Math.max(0, v)));
  set('load_w', (v) => (r.load_w = Math.max(0, v)));
  const c = q.get('contact');
  if (c === 'earth' || c === 'stations') r.contact_mode = c;
  const w = (q.get('w') ?? '').split(',').map(Number);
  if (w.length === 3 && w.every(Number.isFinite)) r.weights = [w[0], w[1], w[2]];
  s.rules = r;
  s.stay_s = base.stay_s;
  set('days', (v) => (s.stay_s = v * 86400));
  const start = q.get('start');
  if (start) {
    const ms = Date.parse(start.endsWith('Z') ? start : start + 'Z');
    if (Number.isFinite(ms)) s.start_s = (ms - epoch_ms) / 1000;
  }
  const view = q.get('view') as View | null;
  if (view && VIEWS.some((v) => v.id === view)) s.view = view;
  set('t_h', (v) => (s.t_off_s = v * H));
  const cmp = (q.get('cmp') ?? '').split(',').filter((id) => siteIds.includes(id));
  if (cmp.length) s.compare = cmp.slice(0, 3);
  return s;
}
