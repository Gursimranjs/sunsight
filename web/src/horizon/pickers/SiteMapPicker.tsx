// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Site picker dialog: a south-polar stereographic map with one pin (a button) per site south of 80°S,
// a list for every other site, and optionally custom coordinates. Focus is trapped; Escape closes.
import { useEffect, useRef, useState } from 'preact/hooks';
import { validLatLon } from '../../data/sites';
import type { Site } from '../../data/types';

/** Map edge: sites south of this latitude get a pin on the polar map. */
export const MAP_EDGE_LAT_DEG = -80;

/**
 * South-polar stereographic projection, scaled so the circle at `edge_lat_deg` has radius 1.
 * Longitude 0° points up and 90°E to the right (the Moon seen from below its south pole).
 * rho is proportional to tan((90° + lat) / 2); the pole maps to (0, 0).
 */
export function polarXY(lat_deg: number, lon_deg: number, edge_lat_deg = MAP_EDGE_LAT_DEG): { x: number; y: number } {
  const rad = Math.PI / 180;
  const rho = Math.tan(((90 + lat_deg) / 2) * rad) / Math.tan(((90 + edge_lat_deg) / 2) * rad);
  const lon_rad = lon_deg * rad;
  return { x: rho * Math.sin(lon_rad), y: -rho * Math.cos(lon_rad) };
}

/** Sites on the polar map (south of the edge), in list order, and every other site. */
export function splitSites(sites: Site[], edge_lat_deg = MAP_EDGE_LAT_DEG): { polar: Site[]; other: Site[] } {
  const polar = sites.filter((s) => s.lat_deg < edge_lat_deg);
  const other = sites.filter((s) => !(s.lat_deg < edge_lat_deg));
  return { polar, other };
}

/** The plain headings of the site list (note 010 #9), in order. */
export const SITE_GROUPS = ['South pole candidates', 'Commercial landers', 'Apollo', 'Other countries', 'Other'] as const;
export type SiteGroup = (typeof SITE_GROUPS)[number];

/**
 * A site's heading, from its id and name in sites.json: Apollo missions; commercial landers (Intuitive
 * Machines IM-1 and IM-2, Firefly Blue Ghost, ispace HAKUTO-R); other countries' landers (Chandrayaan,
 * SLIM, Chang'e, Luna); any other site south of the map edge is a south pole candidate; the rest is Other.
 */
export function siteGroup(s: Pick<Site, 'id' | 'name' | 'lat_deg'>, edge_lat_deg = MAP_EDGE_LAT_DEG): SiteGroup {
  const id = s.id.toLowerCase(), name = s.name.toLowerCase();
  if (/^apollo_/.test(id) || /^apollo\b/.test(name)) return 'Apollo';
  if (/^(im\d|blue_ghost|hakuto)/.test(id) || /\b(im-\d|blue ghost|hakuto)/.test(name)) return 'Commercial landers';
  if (/^(chandrayaan|slim|change_|luna_|luna\d)/.test(id) || /\b(chandrayaan|slim|chang'e|luna \d)/.test(name)) return 'Other countries';
  if (s.lat_deg < edge_lat_deg) return 'South pole candidates';
  return 'Other';
}

/** Sites under their headings, in SITE_GROUPS order, each keeping list order; empty groups left out. */
export function groupSites(sites: Site[]): { group: SiteGroup; sites: Site[] }[] {
  return SITE_GROUPS.map((group) => ({ group, sites: sites.filter((s) => siteGroup(s) === group) })).filter((g) => g.sites.length > 0);
}

/**
 * Where to draw each pin so that no two overlap: start at the true positions and push pairs closer
 * than min_dist apart, a few rounds. The true position keeps its own dot, with a leader line to the
 * pin, so a moved pin never misplaces a site. Units are those of the input points.
 */
export function spreadPins(points: { x: number; y: number }[], min_dist: number, rounds = 60): { x: number; y: number }[] {
  const out = points.map((p) => ({ x: p.x, y: p.y }));
  for (let r = 0; r < rounds; r++) {
    let moved = false;
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        let dx = out[j].x - out[i].x, dy = out[j].y - out[i].y;
        let d = Math.hypot(dx, dy);
        if (d >= min_dist) continue;
        if (d < 1e-9) { dx = Math.cos(j); dy = Math.sin(j); d = 1; } // identical points: a fixed direction per index
        const push = (min_dist - d) / 2 + 1e-6;
        out[i].x -= (dx / d) * push; out[i].y -= (dy / d) * push;
        out[j].x += (dx / d) * push; out[j].y += (dy / d) * push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return out;
}

const FOCUSABLE = new Set(['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A']);

/** Focusable descendants in document order (a small walk; no selector engine needed). */
function focusables(root: Element): HTMLElement[] {
  const out: HTMLElement[] = [];
  const walk = (n: Element) => {
    const el = n as HTMLElement;
    const tag = (el.tagName || '').toUpperCase();
    if (FOCUSABLE.has(tag) && !(el as HTMLButtonElement).disabled && (tag !== 'A' || el.getAttribute('href') !== null)) out.push(el);
    else if (el.getAttribute && el.getAttribute('tabindex') === '0') out.push(el);
    for (const c of Array.from(n.children ?? [])) walk(c);
  };
  for (const c of Array.from(root.children ?? [])) walk(c);
  return out;
}

interface Props {
  sites: Site[];
  siteId: string | null;
  onSite: (id: string) => void;
  onClose: () => void;
  /** Optional custom-coordinates entry (Anywhere mode): shown only when onCustom is given. */
  lat_deg?: number;
  lon_deg?: number;
  onCustom?: (lat_deg: number, lon_deg: number) => void;
}

// SVG half-size; the 80°S circle has radius 100. Note 011 item 3: room for "90°W" and "90°E" beside the circle.
const VIEW = 138;
const R = 100;
/** Pin size, px: at least the 24 px target size of WCAG 2.2 (2.5.8). */
const PIN_PX = 24;
/** Pin spacing in SVG units: a 24 px pin is ~14 units on the 420 px map and ~19 on a 311 px phone map. */
const PIN_D = 20;
/** Double ring round the chosen pin (black then Sun), its shape cue. */
export const CHOSEN_RING = '0 0 0 2px #000000, 0 0 0 4px #FFD27A';

export function SiteMapPicker({ sites, siteId, onSite, onClose, lat_deg, lon_deg, onCustom }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const { polar } = splitSites(sites);
  const customLat = useRef<HTMLInputElement>(null);
  const [lat, setLat] = useState(lat_deg !== undefined ? String(lat_deg) : '');
  const [lon, setLon] = useState(lon_deg !== undefined ? String(lon_deg) : '');
  const [hover, setHover] = useState<string | null>(null);
  const latN = Number(lat), lonN = Number(lon);
  const customOk = lat.trim() !== '' && lon.trim() !== '' && validLatLon(latN, lonN);

  // Focus the chosen site (or the first control) on open; give focus back on close.
  useEffect(() => {
    const before = (typeof document !== 'undefined' ? document.activeElement : null) as HTMLElement | null;
    const root = box.current;
    if (root) {
      const list = focusables(root);
      const chosen = list.find((el) => el.getAttribute('data-site-id') === siteId && siteId !== null);
      (chosen ?? list[0])?.focus();
    }
    return () => { before?.focus?.(); };
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab' || !box.current) return;
    const list = focusables(box.current);
    if (!list.length) return;
    const first = list[0], last = list[list.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !list.includes(active as HTMLElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (active === last || !list.includes(active as HTMLElement))) { e.preventDefault(); first.focus(); }
  };

  const pick = (id: string) => { onSite(id); onClose(); };
  const ring = [-85, -80].map((l) => Math.hypot(polarXY(l, 0).x, polarXY(l, 0).y) * R);
  const truePos = polar.map((s) => { const p = polarXY(s.lat_deg, s.lon_deg); return { x: p.x * R, y: p.y * R }; });
  const pinPos = spreadPins(truePos, PIN_D);
  const ring85Label = polarXY(-85, 135);
  const named = hover ?? siteId;

  return (
    <div class="hz-dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="hz-dialog" role="dialog" aria-modal="true" aria-labelledby="hz-site-title" ref={box} onKeyDown={onKeyDown} data-testid="site-map-picker">
        <button type="button" class="hz-dialog-close" onClick={onClose}>Close</button>
        <h2 id="hz-site-title">Choose a landing site</h2>
        <p style={{ margin: '0 0 8px' }} data-testid="site-map-caption">Map of the south pole. Rings at 85°S and 80°S; 0° longitude, the side that faces Earth, is up.</p>
        <div style={{ position: 'relative', maxWidth: 420, margin: '0 auto' }}>
          <svg class="hz-polar-map" viewBox={`${-VIEW} ${-VIEW} ${2 * VIEW} ${2 * VIEW}`} aria-hidden="true" focusable="false">
            <circle cx={0} cy={0} r={ring[1]} fill="#000000" stroke="#8E8A82" stroke-width={1} />
            <circle cx={0} cy={0} r={ring[0]} fill="none" stroke="#8E8A82" stroke-width={0.5} stroke-dasharray="2 3" />
            {[0, 30, 60, 90, 120, 150].map((lon_deg) => {
              const a = polarXY(MAP_EDGE_LAT_DEG, lon_deg), b = polarXY(MAP_EDGE_LAT_DEG, lon_deg + 180);
              return <line key={lon_deg} x1={a.x * R} y1={a.y * R} x2={b.x * R} y2={b.y * R} stroke="#8E8A82" stroke-width={0.4} />;
            })}
            {([[0, '0°'], [90, '90°E'], [180, '180°'], [-90, '90°W']] as [number, string][]).map(([l, t]) => {
              const p = polarXY(MAP_EDGE_LAT_DEG, l);
              // Side labels start just outside the circle and run outward, inside the drawing.
              const anchor = p.x > 0.5 ? 'start' : p.x < -0.5 ? 'end' : 'middle';
              const off = anchor === 'middle' ? 10 : 4;
              return <text key={t} x={p.x * (R + off)} y={p.y * (R + off) + 3} fill="#CFCBC2" style={{ fontSize: '12px' }} text-anchor={anchor} data-testid="site-map-lon-label">{t}</text>;
            })}
            <text x={ring85Label.x * R + 3} y={ring85Label.y * R + 8} fill="#8E8A82" font-size={7}>85°S</text>
            {truePos.map((p, i) => (
              <g key={polar[i].id}>
                <line x1={p.x} y1={p.y} x2={pinPos[i].x} y2={pinPos[i].y} stroke="#CFCBC2" stroke-width={0.6} />
                {polar[i].id === siteId
                  ? <circle cx={p.x} cy={p.y} r={2.6} fill="#FFD27A" stroke="#FFFFFF" stroke-width={0.8} data-testid="site-true-chosen" />
                  : <circle cx={p.x} cy={p.y} r={1.6} fill="#CFCBC2" />}
              </g>
            ))}
          </svg>
          <ol class="hz-pins" style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label="Sites near the south pole">
            {polar.map((s, i) => {
              const p = pinPos[i];
              const left = ((p.x + VIEW) / (2 * VIEW)) * 100, top = ((p.y + VIEW) / (2 * VIEW)) * 100;
              const chosen = s.id === siteId;
              return (
                <li key={s.id} style={{ position: 'absolute', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, -50%)' }}>
                  <button type="button" class="hz-pin" data-site-id={s.id} data-testid="site-pin"
                    aria-label={`${i + 1}. ${s.name}, ${Math.abs(s.lat_deg).toFixed(2)}°S`}
                    aria-current={chosen ? 'true' : undefined}
                    onClick={() => pick(s.id)} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(s.id)} onBlur={() => setHover(null)}
                    style={{ minHeight: 0, padding: 0, width: PIN_PX, height: PIN_PX, borderRadius: '50%', fontSize: 12, lineHeight: `${PIN_PX - 2}px`,
                      background: chosen ? '#FFD27A' : '#CFCBC2', color: '#17181A', border: '1px solid #17181A',
                      // The chosen pin also differs in shape (a double ring), not by colour alone.
                      boxShadow: chosen ? CHOSEN_RING : undefined, fontWeight: chosen ? 700 : 400 }}>
                    {i + 1}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <p data-testid="site-map-name" style={{ minHeight: '1.4em', margin: '4px 0 8px', fontWeight: 600 }}>
          {named ? sites.find((s) => s.id === named)?.name ?? '' : ''}
        </p>
        {onCustom && (
          <p style={{ margin: '0 0 6px' }}>
            <button type="button" class="hz-chip" data-testid="site-custom-jump" onClick={() => customLat.current?.focus()}>Custom latitude and longitude</button>
          </p>
        )}
        {groupSites(sites).map(({ group, sites: list }, g) => (
          <section key={group} class="hz-site-group" data-testid="site-group" data-group={group} aria-labelledby={`hz-site-group-${g}`}>
            <h3 id={`hz-site-group-${g}`} style={{ margin: '12px 0 6px', fontSize: '1rem' }}>{group}</h3>
            <ul class="hz-map-list">
              {list.map((s) => {
                const pin = polar.indexOf(s);
                return (
                  <li key={s.id}>
                    <button type="button" class="hz-chip" data-site-id={s.id} aria-current={s.id === siteId ? 'true' : undefined} onClick={() => pick(s.id)}>
                      {pin >= 0 ? `${pin + 1}. ` : ''}{s.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {onCustom && (
          <h3 id="hz-site-custom" style={{ margin: '12px 0 0', fontSize: '1rem' }}>Custom latitude and longitude</h3>
        )}
        {onCustom && (
          <form class="hz-custom" aria-labelledby="hz-site-custom" onSubmit={(e) => { e.preventDefault(); if (customOk) { onCustom(latN, lonN); onClose(); } }}>
            <label>
              <span>Latitude (°, south negative)</span>
              <input ref={customLat} type="number" inputMode="decimal" step="any" min={-90} max={90} value={lat} onInput={(e) => setLat((e.target as HTMLInputElement).value)} />
            </label>
            <label>
              <span>Longitude (°, east positive)</span>
              <input type="number" inputMode="decimal" step="any" min={-180} max={360} value={lon} onInput={(e) => setLon((e.target as HTMLInputElement).value)} />
            </label>
            <button type="submit" disabled={!customOk}>Use these coordinates</button>
          </form>
        )}
      </div>
    </div>
  );
}
