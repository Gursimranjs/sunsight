// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Entry: picks the interface from ?ui= and loads only that interface's code (review note 009, M4 budget).
// ?ui=classic and ?ui=horizon choose explicitly; with no ui param the DEFAULT_UI is shown. Each interface
// is its own dynamic chunk, so neither downloads the other on first load.
import { render } from 'preact';
import './styles.css';

type Ui = 'classic' | 'horizon';
/** The interface shown when the link has no ui param. The note-009 flip changes this one line to 'horizon'. */
export const DEFAULT_UI: Ui = 'horizon';
const UI_PARAM = 'ui';

function uiOf(search: string): Ui {
  const v = new URLSearchParams(search).get(UI_PARAM);
  return v === 'classic' || v === 'horizon' ? v : DEFAULT_UI;
}

/**
 * Once the default is the horizon interface, an explicit ?ui=classic must survive the classic App's
 * address-bar rewrites (it writes the scenario only). Inactive while the classic interface is the default.
 */
function keepClassicFlag() {
  if (DEFAULT_UI === 'classic') return;
  const replace = history.replaceState.bind(history);
  history.replaceState = (state: unknown, unused: string, url?: string | URL | null) => {
    if (typeof url === 'string' && url.startsWith('?')) {
      const q = new URLSearchParams(url.slice(1));
      if (q.get(UI_PARAM) !== 'classic') { q.set(UI_PARAM, 'classic'); url = '?' + q.toString(); }
    }
    replace(state, unused, url);
  };
}

const root = document.getElementById('app')!;
const ui = typeof location !== 'undefined' ? uiOf(location.search) : DEFAULT_UI;
const show = (e: unknown) => { root.textContent = `Could not load SunSight: ${String(e)}`; };
if (ui === 'horizon') {
  import('./horizon/HorizonApp').then(({ HorizonApp }) => render(<HorizonApp />, root)).catch(show);
} else {
  keepClassicFlag();
  import('./App').then(({ App }) => render(<App />, root)).catch(show);
}
