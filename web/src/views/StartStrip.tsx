// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// The three plain entry choices under the header (note 003 A), always visible.
import { uniqueCompareIds, type Scenario } from '../state/scenario';
import { requestChosenRowScroll } from './Compare';

interface Props {
  scn: Scenario;
  /** Site ids the compare view shows when none are chosen. */
  defaultCompare: string[];
  update: (patch: Partial<Scenario>) => void;
}

/** Scroll a panel into view once the new view has rendered. */
function scrollToLabel(label: string) {
  setTimeout(() => document.querySelector(`[aria-label="${label}"]`)?.scrollIntoView?.({ block: 'start' }), 0);
}

export function StartStrip({ scn, defaultCompare, update }: Props) {
  const byDate = () => { update({ view: 'rank' }); scrollToLabel('Which sites work on this date'); };
  const bySite = () => {
    // Put the current site first in the compare slots; the calendar shows its row first and scrolls
    // to it once computed. A custom point is not in the calendar, which says so.
    const compare = scn.site_id ? uniqueCompareIds([scn.site_id, ...(scn.compare.length ? scn.compare : defaultCompare)]) : scn.compare;
    update({ view: 'compare', compare });
    // Panel first, then the chosen row (timeouts fire in order), so the row scroll is not undone.
    scrollToLabel('Calendar');
    if (scn.site_id) requestChosenRowScroll();
  };
  const tour = () => { update({ view: 'story' }); scrollToLabel('Athena story'); };
  return (
    <nav class="start-strip" aria-label="Start here">
      <div class="start-choices">
        <button type="button" onClick={byDate}>I have a date: which sites work?</button>
        <button type="button" onClick={bySite}>I have a site: which dates work?</button>
        <button type="button" onClick={tour}>Take the Athena tour</button>
      </div>
      <p class="small muted start-lead" data-testid="start-lead">
        A miss of a few hundred metres can matter a lot on the Shackleton ridge and hardly at all around Athena's target; the Miss test shows where.
      </p>
    </nav>
  );
}
