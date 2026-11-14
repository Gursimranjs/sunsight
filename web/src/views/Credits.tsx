// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Source line on the verdict card, terrain credit for the 3D and miss views, "About the data".
import type { Site } from '../data/types';
import { dataCredits, siteCredit, TERRAIN_CREDIT, type DataCredit } from './sourceCredits';

function CreditLink({ c }: { c: DataCredit }) {
  return c.url ? <a href={c.url} rel="noopener">{c.text}</a> : <>{c.text}</>;
}

/** "Source: LROC (NASA/GSFC/ASU)" linked to the cited page, notes on hover, plus any computed point. */
export function SiteSource({ site }: { site: Site }) {
  const c = siteCredit(site);
  if (!c) return null;
  return (
    <p class="small muted" style={{ margin: '4px 0 0' }} data-testid="site-source">
      Site coordinates: {c.url
        ? <a href={c.url} rel="noopener" title={c.notes ?? undefined}>{c.org}</a>
        : <span title={c.notes ?? undefined}>{c.org}</span>}
      {c.notes && <span class="sr-only"> ({c.notes})</span>}
      .{c.computed && <> {c.computed}</>}
    </p>
  );
}

export function TerrainCredit() {
  return <p class="small muted" data-testid="terrain-credit" style={{ margin: '6px 0 0' }}><CreditLink c={TERRAIN_CREDIT} />.</p>;
}

export function AboutData({ sites, fixture }: { sites: Site[]; fixture: boolean }) {
  return (
    <section class="card" aria-labelledby="about-data-h" data-testid="about-data">
      <h3 id="about-data-h">About the data</h3>
      {fixture && <p class="small"><strong>Fixture data is loaded: the numbers on screen are made up and do not come from these sources.</strong></p>}
      <ul class="small" style={{ margin: 0, paddingLeft: '1.2em' }}>
        {dataCredits(sites).map((c) => <li key={c.id}><CreditLink c={c} /></li>)}
      </ul>
    </section>
  );
}
