// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
import { useEffect, useState } from 'preact/hooks';
import { loadEphemeris, loadManifest, loadSites } from './data/loaders';
import type { Ephemeris, Manifest, Site } from './data/types';
import { az_el, local_frame, site_vector, type Vec3 } from './engine/geometry';

interface Loaded { manifest: Manifest; eph: Ephemeris; sites: Site[]; fixture: boolean }

export function App() {
  const [state, setState] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const manifest = await loadManifest();
      const [eph, s] = await Promise.all([loadEphemeris(manifest), loadSites(manifest)]);
      const fixture = manifest.fixture || eph.meta.fixture === true || s.fixture;
      setState({ manifest, eph, sites: s.sites, fixture });
    })().catch((e) => setError(String(e)));
  }, []);

  if (error) return <main><p role="alert">Could not load data: {error}</p></main>;
  if (!state) return <main><p>Loading SunSight…</p></main>;

  const site = state.sites[0];
  const row = state.eph.data.subarray(0, 18);
  const sun: Vec3 = [row[0], row[1], row[2]];
  const p = site_vector(site.lat_deg, site.lon_deg, site.height_m);
  const { el_deg } = az_el(sun, p, local_frame(site.lat_deg, site.lon_deg));

  return (
    <>
      {state.fixture && (
        <div class="fixture-banner" role="status" data-testid="fixture-banner">
          Fixture data: these numbers are made up for development and are not real.
        </div>
      )}
      <main>
        <h1>SunSight</h1>
        <p>Sunlight and Earth contact for lunar landing sites.</p>
        <p>
          Sun elevation at <strong>{site.name}</strong> on {state.eph.meta.start_utc} UTC:{' '}
          <strong data-testid="first-number">{el_deg.toFixed(3)}°</strong>
        </p>
      </main>
    </>
  );
}
