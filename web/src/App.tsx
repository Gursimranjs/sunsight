// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { resolveCustom, resolveSite, type Resolved } from './data/sites';
import { skyAt } from './engine/sky';
import { formatDeg, formatUtc, compass } from './format';
import { loadAppData, type AppData } from './state/data';
import { clampScenario, defaultScenario, type Scenario } from './state/scenario';
import { SitePicker } from './views/SitePicker';
import { Term } from './views/Term';

export function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fixtureTick, setFixtureTick] = useState(0);
  const [scn, setScn] = useState<Scenario | null>(null);
  const [place, setPlace] = useState<Resolved | null>(null);

  useEffect(() => {
    loadAppData(() => setFixtureTick((x) => x + 1))
      .then((d) => {
        setData(d);
        setScn(clampScenario(defaultScenario(d.sites[0]?.id ?? null), d.eph.meta));
      })
      .catch((e) => setError(String(e)));
  }, []);

  const update = (patch: Partial<Scenario>) => setScn((s) => (s && data ? clampScenario({ ...s, ...patch }, data.eph.meta) : s));
  const site = data && scn?.site_id ? data.sites.find((s) => s.id === scn.site_id) ?? null : null;

  // Resolve the site to coordinates and a horizon mask (loads the region file when needed).
  useEffect(() => {
    if (!data || !scn) return;
    let live = true;
    const h = scn.rules.observer_height_m;
    if (!site) setPlace(resolveCustom(scn.lat_deg, scn.lon_deg, h));
    else if (!site.region_id) setPlace(resolveSite(site, null, h));
    else {
      data.region(site.region_id)
        .then((r) => live && setPlace(resolveSite(site, r, h)))
        .catch(() => live && setPlace({ ...resolveSite(site, null, h), horizonLabel: 'Terrain file missing: smooth horizon used' }));
    }
    return () => { live = false; };
  }, [data, site, scn?.lat_deg, scn?.lon_deg, scn?.rules.observer_height_m]);

  const t_s = scn ? scn.start_s + scn.t_off_s : 0;
  const sky = useMemo(() => {
    if (!data || !place || !scn) return null;
    return skyAt(data.table, t_s, place.lat_deg, place.lon_deg, place.h_m + scn.rules.observer_height_m);
  }, [data, place, t_s, scn?.rules.observer_height_m]);

  if (error) return <main><p role="alert">Could not load data: {error}</p></main>;
  if (!data || !scn) return <main><p>Loading SunSight…</p></main>;
  void fixtureTick;
  const fixture = data.fixtureFiles.size > 0;
  const now_ms = data.eph.start_ms + t_s * 1000;

  return (
    <>
      {fixture && (
        <div class="fixture-banner" role="status" data-testid="fixture-banner">
          Fixture data: these numbers are made up for development and are not real.
        </div>
      )}
      <header class="top">
        <h1>SunSight</h1>
        <p class="tagline">Will a lunar landing site have sunlight for power and a line of sight to Earth?</p>
      </header>
      <main>
        <section class="controls" aria-label="Scenario">
          <SitePicker
            sites={data.sites}
            siteId={scn.site_id}
            lat_deg={scn.lat_deg}
            lon_deg={scn.lon_deg}
            onSite={(id) => update({ site_id: id })}
            onCustom={(lat_deg, lon_deg) => update({ site_id: null, lat_deg, lon_deg })}
          />
        </section>
        {place && sky && (
          <section class="card" aria-label="Sun and Earth now" data-testid="sky-now">
            <h2>Sun and Earth on {formatUtc(now_ms)}</h2>
            <p class="muted">
              {site ? site.name : 'Custom point'} at {formatDeg(place.lat_deg, 3)} latitude, {formatDeg(place.lon_deg, 3)} longitude.{' '}
              <span data-testid="horizon-label">{place.terrain ? place.horizonLabel : <Term tip="smooth">{place.horizonLabel}</Term>}</span>
            </p>
            <ul class="pos">
              <li>Sun: <Term tip="azimuth">azimuth</Term> {formatDeg(sky.sun.az_deg, 1)} ({compass(sky.sun.az_deg)}), <Term tip="elevation">elevation</Term> {formatDeg(sky.sun.el_deg, 2)}</li>
              <li>Earth: azimuth {formatDeg(sky.earth.az_deg, 1)} ({compass(sky.earth.az_deg)}), elevation {formatDeg(sky.earth.el_deg, 2)}</li>
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
