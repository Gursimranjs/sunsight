// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// TEMPORARY, test only (note 009, M2): mounts LandGame on its own page so the end-to-end test can play it
// before the horizon shell exists. Served only by the Vite dev server (devMount.html); never part of a build.
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { loadAppData, type AppData } from '../../state/data';
import { clampScenario, type Scenario } from '../../state/scenario';
import { decodeScenario, encodeScenario } from '../../state/url';
import { GAME_POINT_PARAM } from './gameLogic';
import { LandGame } from './LandGame';
import '../../styles.css';

function GameDev() {
  const [data, setData] = useState<AppData | null>(null);
  const [scn, setScn] = useState<Scenario | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadAppData(() => undefined).then((d) => {
      setData(d);
      const s0 = decodeScenario(location.search, d.eph.start_ms, d.sites[0]?.id ?? null, d.sites.map((x) => x.id));
      setScn(clampScenario(s0, d.eph.meta));
    }).catch((e) => setError(String(e)));
  }, []);
  // Keep the scenario in the address bar (with the game point, if any) like the app does.
  useEffect(() => {
    if (!scn || !data) return;
    const pt = new URLSearchParams(location.search).get(GAME_POINT_PARAM);
    const q = new URLSearchParams(encodeScenario(scn, data.eph.start_ms));
    if (pt) q.set(GAME_POINT_PARAM, pt);
    history.replaceState(null, '', '?' + q.toString());
  }, [scn, data]);
  if (error) return <p role="alert">Could not load data: {error}</p>;
  if (!data || !scn) return <p>Loading…</p>;
  const site = scn.site_id ? data.sites.find((s) => s.id === scn.site_id) ?? null : null;
  const update = (patch: Partial<Scenario>) => setScn((s) => (s ? clampScenario({ ...s, ...patch }, data.eph.meta) : s));
  return <main><h1>SunSight game (development page)</h1><LandGame data={data} scn={scn} site={site} update={update} /></main>;
}

/** Render the game into `el`. */
export function mountGameDev(el: HTMLElement): void {
  render(<GameDev />, el);
}
