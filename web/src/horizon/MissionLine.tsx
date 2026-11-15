// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// The mission line: "Land at [site] on [date] for a [scenario]." Each bracketed part opens a picker.
// The pickers here are the plain M1 versions; each sits in its own slot so the map picker, the date
// strip and the scenario cards can replace them one at a time.
import { useEffect } from 'preact/hooks';
import type { Site } from '../data/types';
import { makeRules, PRESET_LABELS, PRESETS, type PresetId } from '../engine/light';
import { fromInputUtc, toInputUtc } from '../format';
import type { AppData } from '../state/data';
import { tableRange, type Scenario } from '../state/scenario';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "24 Jul 2029, 00:00 UTC". */
export function missionDate(ms: number): string {
  const d = new Date(ms);
  const iso = d.toISOString();
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${iso.slice(11, 16)} UTC`;
}

/** "crew sortie, 6.5 days". */
export function scenarioPhrase(p: PresetId, stay_s: number): string {
  return `${PRESET_LABELS[p].toLowerCase()}, ${Number((stay_s / 86400).toFixed(2))} days`;
}

export type PickerKind = 'site' | 'date' | 'scenario';

interface Props {
  data: AppData;
  scn: Scenario;
  site: Site | null;
  placeName: string;
  open: PickerKind | null;
  setOpen: (k: PickerKind | null) => void;
  update: (patch: Partial<Scenario>) => void;
}

function PlainSitePicker({ sites, siteId, onSite }: { sites: Site[]; siteId: string | null; onSite: (id: string) => void }) {
  return (
    <ul class="hz-site-list" aria-label="Sites">
      {sites.map((s) => (
        <li key={s.id}><button type="button" aria-current={s.id === siteId} onClick={() => onSite(s.id)}>{s.name}</button></li>
      ))}
    </ul>
  );
}

function PlainDatePicker({ data, scn, onStart }: { data: AppData; scn: Scenario; onStart: (start_s: number) => void }) {
  const epochMs = data.eph.start_ms;
  const r = tableRange(data.eph.meta);
  return (
    <label class="hz-field">
      <span>Start (UTC)</span>
      <input type="datetime-local" step={3600} min={toInputUtc(epochMs + r.min_s * 1000)} max={toInputUtc(epochMs + r.max_s * 1000)}
        value={toInputUtc(epochMs + scn.start_s * 1000)}
        onChange={(e) => { const ms = fromInputUtc((e.target as HTMLInputElement).value); if (Number.isFinite(ms)) onStart((ms - epochMs) / 1000); }} />
    </label>
  );
}

function PlainScenarioPicker({ scn, update }: { scn: Scenario; update: (patch: Partial<Scenario>) => void }) {
  return (
    <div class="hz-scn-list">
      {(Object.keys(PRESETS) as PresetId[]).map((p) => (
        <button key={p} type="button" aria-current={p === scn.preset} onClick={() => {
          const r = makeRules(PRESETS[p]);
          update({ preset: p, rules: r, stay_s: r.stay_s, t_off_s: 0 });
        }}>{PRESET_LABELS[p]}, {PRESETS[p].stay_s / 86400} days</button>
      ))}
    </div>
  );
}

export function MissionLine({ data, scn, site, placeName, open, setOpen, update }: Props) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, [open]);
  const btn = (k: PickerKind, text: string) => (
    <button type="button" class="hz-pick" data-testid={`hz-${k}-button`} aria-expanded={open === k} aria-controls="hz-picker"
      onClick={() => setOpen(open === k ? null : k)}>{text}</button>
  );
  const done = (patch: Partial<Scenario>) => { update(patch); setOpen(null); };
  return (
    <div class="hz-mission-wrap">
      <p class="hz-mission" data-testid="hz-mission">
        Land at {btn('site', placeName)} on {btn('date', missionDate(data.eph.start_ms + scn.start_s * 1000))}{' '}
        for a {btn('scenario', scenarioPhrase(scn.preset, scn.stay_s))}.
      </p>
      {open && (
        <div class="hz-picker" id="hz-picker" data-testid="hz-picker" role="group" aria-label={`Choose the ${open}`}>
          {open === 'site' && <PlainSitePicker sites={data.sites} siteId={site?.id ?? null} onSite={(id) => done({ site_id: id })} />}
          {open === 'date' && <PlainDatePicker data={data} scn={scn} onStart={(start_s) => update({ start_s, t_off_s: 0 })} />}
          {open === 'scenario' && <PlainScenarioPicker scn={scn} update={done} />}
          <button type="button" class="hz-close" onClick={() => setOpen(null)}>Close</button>
        </div>
      )}
    </div>
  );
}
