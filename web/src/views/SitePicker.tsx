// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Site library (grouped by category) plus Anywhere mode (custom latitude and longitude).
import { useEffect, useState } from 'preact/hooks';
import { categoryLabel, groupSites, validLatLon } from '../data/sites';
import type { Site } from '../data/types';

export const CUSTOM = '__custom__';

interface Props {
  sites: Site[];
  siteId: string | null;
  lat_deg: number;
  lon_deg: number;
  onSite: (id: string) => void;
  onCustom: (lat_deg: number, lon_deg: number) => void;
}

export function SitePicker({ sites, siteId, lat_deg, lon_deg, onSite, onCustom }: Props) {
  const [lat, setLat] = useState(String(lat_deg));
  const [lon, setLon] = useState(String(lon_deg));
  useEffect(() => { setLat(String(lat_deg)); setLon(String(lon_deg)); }, [lat_deg, lon_deg]);
  const custom = siteId === null;
  const latN = Number(lat), lonN = Number(lon);
  const ok = lat.trim() !== '' && lon.trim() !== '' && validLatLon(latN, lonN);

  return (
    <div class="site-picker">
      <label class="field">
        <span>Site</span>
        <select
          value={custom ? CUSTOM : siteId ?? ''}
          onChange={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            if (v === CUSTOM) onCustom(latN, lonN);
            else onSite(v);
          }}
        >
          {groupSites(sites).map((g) => (
            <optgroup key={g.category} label={categoryLabel(g.category)}>
              {g.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </optgroup>
          ))}
          <optgroup label="Anywhere">
            <option value={CUSTOM}>Custom latitude and longitude…</option>
          </optgroup>
        </select>
      </label>
      {custom && (
        <form
          class="custom-coords"
          onSubmit={(e) => { e.preventDefault(); if (ok) onCustom(latN, lonN); }}
        >
          <label class="field small">
            <span>Latitude (°, north +)</span>
            <input type="number" inputMode="decimal" step="any" min={-90} max={90} value={lat}
              onInput={(e) => setLat((e.target as HTMLInputElement).value)} aria-invalid={!ok} />
          </label>
          <label class="field small">
            <span>Longitude (°, east +)</span>
            <input type="number" inputMode="decimal" step="any" min={-180} max={360} value={lon}
              onInput={(e) => setLon((e.target as HTMLInputElement).value)} aria-invalid={!ok} />
          </label>
          <button type="submit" disabled={!ok}>Go</button>
          {!ok && <p class="hint" role="alert">Latitude must be −90 to 90 and longitude −180 to 360.</p>}
        </form>
      )}
    </div>
  );
}
