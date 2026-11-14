// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// 3D hero view shell: loads the terrain cut, checks WebGL and imports the Three.js scene on demand.
import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { DATA_BASE } from '../data/loaders';
import type { Resolved } from '../data/sites';
import type { Manifest, Site } from '../data/types';
import type { Sample } from '../engine/light';
import { skyAt } from '../engine/sky';
import { formatDeg, formatPct, formatUtc } from '../format';
import type { AppData } from '../state/data';
import type { Scenario } from '../state/scenario';
import type { Scene3DProps } from './Scene3D';
import { decodeTerrain, latLonToMap, mapToScene, terrainCentreMap, type TerrainMeta } from './terrain3d';

export const ILLUSTRATIVE_LABEL = 'Illustrative: shadows come from the graphics engine and nearby terrain only; the numbers come from the horizon engine.';

interface Props {
  data: AppData;
  site: Site | null;
  place: Resolved | null;
  scn: Scenario;
  now: Sample | null;
  update: (patch: Partial<Scenario>) => void;
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

async function loadTerrain(m: Manifest, id: string): Promise<{ meta: TerrainMeta; heights: Int16Array }> {
  const ref = (m.files.terrain ?? []).find((r) => r.id === id);
  if (!ref || !ref.bin) throw new Error(`No terrain entry "${id}" in the manifest`);
  const meta = (await (await fetch(DATA_BASE + ref.meta)).json()) as TerrainMeta;
  const res = await fetch(DATA_BASE + ref.bin);
  if (!res.ok) throw new Error(`terrain ${id}: HTTP ${res.status}`);
  return { meta, heights: decodeTerrain(await res.arrayBuffer(), meta) };
}

let sceneModule: Promise<{ default: ComponentType<Scene3DProps> }> | null = null;

export function Hero3D({ data, site, place, scn, now, update }: Props) {
  const terrainId = site?.terrain_id ?? null;
  const [terrain, setTerrain] = useState<{ id: string; meta: TerrainMeta; heights: Int16Array } | null>(null);
  const [Scene, setScene] = useState<ComponentType<Scene3DProps> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<'overview' | 'astronaut'>('overview');
  const [look, setLook] = useState<{ body: 'sun' | 'earth'; n: number }>({ body: 'sun', n: 0 });
  const [fps, setFps] = useState<number | null>(null);
  const [webgl] = useState(() => hasWebGL());

  useEffect(() => {
    if (!terrainId || !webgl) return;
    let live = true;
    setErr(null);
    loadTerrain(data.manifest, terrainId)
      .then((t) => { if (!live) return; if (t.meta.fixture) data.markFixture(`terrain/${terrainId}`); setTerrain({ id: terrainId, ...t }); })
      .catch((e) => live && setErr(`Could not load the terrain: ${String(e)}`));
    sceneModule ??= import('./Scene3D');
    sceneModule.then((mod) => live && setScene(() => mod.default)).catch((e) => live && setErr(`Could not load the 3D engine: ${String(e)}`));
    return () => { live = false; };
  }, [terrainId, webgl]);

  if (!terrainId) {
    const withTerrain = data.sites.filter((s) => s.terrain_id);
    return (
      <section class="card" data-testid="no-terrain">
        <h3>No 3D terrain for this site</h3>
        <p>The 3D view needs a terrain cut around the site. {withTerrain.length ? 'Cuts exist for:' : 'None are loaded yet.'}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {withTerrain.map((s) => <button key={s.id} type="button" onClick={() => update({ site_id: s.id })}>{s.name}</button>)}
        </div>
      </section>
    );
  }
  if (!webgl) {
    return (
      <section class="card" data-testid="no-webgl">
        <h3>3D view unavailable</h3>
        <p>This browser cannot draw 3D graphics (WebGL is turned off or unsupported). Every number in SunSight still works: the report card, sky panorama and miss test do not need it.</p>
      </section>
    );
  }
  if (err) return <section class="card"><p role="alert">{err}</p></section>;
  if (!terrain || terrain.id !== terrainId || !Scene) return <section class="card"><p>Loading the 3D terrain…</p></section>;

  const meta = terrain.meta;
  const t_s = scn.start_s + scn.t_off_s;
  const sky = skyAt(data.table, t_s, meta.center.lat_deg, meta.center.lon_deg, 0);
  const halfExtent_m = ((meta.size - 1) / 2) * meta.spacing_m;
  let landing: [number, number] | null = null;
  if (place) {
    const [x, , z] = mapToScene(latLonToMap(place.lat_deg, place.lon_deg), terrainCentreMap(meta));
    if (Math.abs(x) <= halfExtent_m && Math.abs(z) <= halfExtent_m) landing = [x, z];
  }
  const size_km = (2 * halfExtent_m) / 1000;
  return (
    <section class="card" aria-label="3D view" data-testid="hero3d">
      <p class="illustrative" data-testid="illustrative-label"><strong>{ILLUSTRATIVE_LABEL}</strong></p>
      <div class="btnrow" role="group" aria-label="Camera">
        <button type="button" aria-pressed={mode === 'overview'} onClick={() => setMode('overview')}>Overview</button>
        <button type="button" aria-pressed={mode === 'astronaut'} data-testid="astronaut-btn" disabled={!landing}
          onClick={() => { setMode('astronaut'); setLook({ body: 'sun', n: look.n + 1 }); }}>Astronaut’s eye (2 m)</button>
        {mode === 'astronaut' && (
          <>
            <button type="button" onClick={() => setLook({ body: 'sun', n: look.n + 1 })}>Face the Sun</button>
            <button type="button" onClick={() => setLook({ body: 'earth', n: look.n + 1 })}>Face Earth</button>
          </>
        )}
      </div>
      <Scene heights={terrain.heights} meta={meta} landing={landing} sun={sky.sun} earth={sky.earth} lon_deg={meta.center.lon_deg}
        mode={landing ? mode : 'overview'} look={look} missRadius_m={250} onFps={setFps} onError={setErr} />
      <label class="field" style={{ marginTop: 8 }}>
        <span>Time in the stay: {formatUtc(data.eph.start_ms + t_s * 1000)}</span>
        <input type="range" min={0} max={scn.stay_s} step={600} value={scn.t_off_s} data-testid="time3d"
          aria-valuetext={formatUtc(data.eph.start_ms + t_s * 1000)}
          onInput={(e) => update({ t_off_s: Number((e.target as HTMLInputElement).value) })} />
      </label>
      <ul class="legend">
        <li>Sun in the sky (true size): azimuth {formatDeg(sky.sun.az_deg, 1)}, elevation {formatDeg(sky.sun.el_deg, 2)} at the cut’s centre{sky.sun.el_deg + sky.sun.r_deg < 0 ? ' (below the level horizon, so the scene is dark)' : ''}</li>
        <li>Blue disc: Earth (true size), elevation {formatDeg(sky.earth.el_deg, 2)}</li>
        {landing && <li>White pin and ring: landing point and a 250 m miss radius</li>}
      </ul>
      {now && (
        <p class="takeaway" data-testid="engine-numbers">
          From the horizon engine at the landing point: Sun elevation {formatDeg(now.sun_el_deg, 2)}, {formatPct(now.sun_frac)} of the Sun’s disc visible, {formatPct(now.earth_frac)} of Earth’s disc visible.
        </p>
      )}
      <p class="small muted">
        Terrain: {size_km.toFixed(1)} km × {size_km.toFixed(1)} km cut at {meta.spacing_m} m spacing, true vertical scale. Beyond the cut there is no terrain in this picture, so distant ridges that the horizon engine includes (out to 20–300 km) are missing here.
        {!landing && place && ' The selected landing point lies outside this terrain cut.'}
        {fps !== null && <> Drawing at <span data-testid="fps">{fps.toFixed(0)}</span> frames per second.</>}
        {mode === 'astronaut' && ' Drag or use the arrow keys (canvas focused) to look around.'}
      </p>
    </section>
  );
}
