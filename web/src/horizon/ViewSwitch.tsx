// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// The view switch that replaces the eight tabs: Horizon, Ground, Miss map, Rank sites, Calendar and
// More (Compare, Tour, Proof, Export). On a phone, a bottom bar: Horizon, Ground, Miss map, More.
import { useState } from 'preact/hooks';
import type { HzView } from './useHorizonState';

const MAIN: { id: HzView; label: string }[] = [
  { id: 'horizon', label: 'Horizon' }, { id: 'ground', label: 'Ground' }, { id: 'miss', label: 'Miss map' },
  { id: 'rank', label: 'Rank sites' }, { id: 'calendar', label: 'Calendar' },
];
const MORE: { id: HzView; label: string }[] = [
  { id: 'compare', label: 'Compare' }, { id: 'tour', label: 'Tour' }, { id: 'proof', label: 'Proof' }, { id: 'export', label: 'Export' },
];
/** On a phone the bottom bar keeps the first three; the rest live under More. */
const PHONE_MAIN = 3;

export function ViewSwitch({ view, onView }: { view: HzView; onView: (v: HzView) => void }) {
  const [more, setMore] = useState(false);
  const item = (v: { id: HzView; label: string }, cls = '') => (
    <li key={v.id} class={cls}>
      <button type="button" aria-current={view === v.id ? 'true' : undefined} onClick={() => { setMore(false); onView(v.id); }}>{v.label}</button>
    </li>
  );
  const inMore = MORE.some((m) => m.id === view);
  const phoneMore = inMore || MAIN.slice(PHONE_MAIN).some((m) => m.id === view);
  return (
    <nav class="hz-views" aria-label="Views">
      <ul>
        {MAIN.map((v, i) => item(v, i >= PHONE_MAIN ? 'hz-wide' : ''))}
        <li class="hz-more">
          <button type="button" aria-expanded={more} aria-controls="hz-more-list" class={inMore ? 'hz-more-on' : phoneMore ? 'hz-more-phone' : ''}
            onClick={() => setMore(!more)}>More</button>
          {more && (
            <ul id="hz-more-list" class="hz-more-list">
              {MAIN.slice(PHONE_MAIN).map((v) => item(v, 'hz-narrow'))}
              {MORE.map((v) => item(v))}
            </ul>
          )}
        </li>
      </ul>
    </nav>
  );
}
