// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Who the data comes from: a source line per site and the data credits for the whole app.
// Links are plain anchors; nothing here is fetched at run time.
import type { Site } from '../data/types';

/** The URL if it is http(s), else null (never render javascript: or data: links from a data file). */
export function safeHttpUrl(u: unknown): string | null {
  if (typeof u !== 'string') return null;
  try {
    const p = new URL(u);
    return p.protocol === 'https:' || p.protocol === 'http:' ? u : null;
  } catch {
    return null;
  }
}

export interface SiteCredit {
  /** Who published the coordinates (sites.json `source_org`, else the link's host name). */
  org: string;
  url: string | null;
  /** sites.json `notes`, shown as a tooltip. */
  notes: string | null;
  /** For a site with a pipeline-refined point: what SunSight computed, from `refined.method`. */
  computed: string | null;
}

const text = (x: unknown) => (typeof x === 'string' && x.trim() !== '' ? x.trim() : null);

export function siteCredit(site: Site): SiteCredit | null {
  const url = safeHttpUrl(site.source_url);
  const org = text(site.source_org) ?? (url ? new URL(url).hostname : null);
  if (!org) return null;
  const method = text((site.refined as { method?: unknown } | undefined)?.method);
  return {
    org, url, notes: text(site.notes),
    computed: method ? `Best-lit point nearby computed by SunSight (${method}); not a cited figure.` : null,
  };
}

export interface DataCredit { id: string; text: string; url: string | null }

export const TERRAIN_CREDIT: DataCredit = {
  id: 'lola',
  text: 'Terrain: LOLA south polar terrain maps, PGDA product 90 (Barker et al. 2023), NASA Goddard',
  url: 'https://pgda.gsfc.nasa.gov/products/90',
};

const citesLroc = (sites: Site[]) => sites.some((s) => {
  const u = safeHttpUrl(s.source_url);
  return !!u && new URL(u).hostname.includes('lroc');
});

/** The "About the data" list. LROC appears only when a site cites an LROC page. */
export function dataCredits(sites: Site[]): DataCredit[] {
  return [
    TERRAIN_CREDIT,
    { id: 'naif', text: 'Sun, Earth and ground-station positions: NAIF SPICE kernels, NASA JPL', url: 'https://naif.jpl.nasa.gov/' },
    ...(citesLroc(sites)
      ? [{ id: 'lroc', text: 'Site coordinates and images cited from LROC pages: NASA/GSFC/Arizona State University (each site card links its page)', url: null }]
      : []),
    { id: 'pgda69', text: 'Validation: lunar south pole illumination maps, PGDA product 69, NASA Goddard', url: 'https://pgda.gsfc.nasa.gov/products/69' },
    { id: 'horizons', text: 'Validation: JPL Horizons ephemerides, NASA JPL', url: 'https://ssd.jpl.nasa.gov/horizons/' },
  ];
}
