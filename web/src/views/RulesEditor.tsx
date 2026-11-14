// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Start date, stay length, preset and every rule, editable.
import { makeRules, PRESET_LABELS, PRESETS, type PresetId, type Rules } from '../engine/light';
import { formatUtc, fromInputUtc, toInputUtc } from '../format';
import { clampMoonElDeg, MAX_MOON_EL_DEG, type Scenario } from '../state/scenario';

interface Props {
  scn: Scenario;
  epochMs: number;
  rangeS: { min_s: number; max_s: number };
  onChange: (patch: Partial<Scenario>) => void;
}

function Num({ label, value, step = 'any', min, max, onSet, unit }: { label: string; value: number; step?: string | number; min?: number; max?: number; unit?: string; onSet: (v: number) => void }) {
  return (
    <label class="field">
      <span>{label}{unit ? ` (${unit})` : ''}</span>
      <input type="number" inputMode="decimal" step={step} min={min} max={max} value={Number(value.toFixed(4))}
        onChange={(e) => { const v = Number((e.target as HTMLInputElement).value); if (Number.isFinite(v)) onSet(v); }} />
    </label>
  );
}

export function ScenarioControls({ scn, epochMs, rangeS, onChange }: Props) {
  const setRules = (patch: Partial<Rules>) => onChange({ rules: { ...scn.rules, ...patch } });
  const minIn = toInputUtc(epochMs + rangeS.min_s * 1000);
  const maxIn = toInputUtc(epochMs + rangeS.max_s * 1000);
  return (
    <>
      <label class="field">
        <span>Start (UTC)</span>
        <input type="datetime-local" step={3600} min={minIn} max={maxIn} value={toInputUtc(epochMs + scn.start_s * 1000)}
          onChange={(e) => {
            const ms = fromInputUtc((e.target as HTMLInputElement).value);
            if (Number.isFinite(ms)) onChange({ start_s: (ms - epochMs) / 1000, t_off_s: 0 });
          }} />
      </label>
      <label class="field">
        <span>Stay (days)</span>
        <input type="number" inputMode="decimal" min={0.5} step={0.5} value={Number((scn.stay_s / 86400).toFixed(2))} style={{ width: '7rem' }}
          onChange={(e) => { const v = Number((e.target as HTMLInputElement).value); if (v > 0) onChange({ stay_s: v * 86400 }); }} />
      </label>
      <label class="field">
        <span>Scenario</span>
        <select value={scn.preset} onChange={(e) => {
          const p = (e.target as HTMLSelectElement).value as PresetId;
          const r = makeRules(PRESETS[p]);
          onChange({ preset: p, rules: r, stay_s: r.stay_s, t_off_s: 0 });
        }}>
          {(Object.keys(PRESETS) as PresetId[]).map((p) => <option key={p} value={p}>{PRESET_LABELS[p]} ({PRESETS[p].stay_s / 86400} days)</option>)}
        </select>
      </label>
      <p class="small muted" style={{ margin: 0, flexBasis: '100%' }}>
        Dates available: {formatUtc(epochMs + rangeS.min_s * 1000)} to {formatUtc(epochMs + rangeS.max_s * 1000)}. Dates outside are moved inside.
      </p>
      <details class="rules">
        <summary>Rules (all adjustable)</summary>
        <div class="rules-grid">
          <Num label="Observer height" unit="m" value={scn.rules.observer_height_m} min={0} onSet={(v) => setRules({ observer_height_m: Math.max(0, v) })} />
          <Num label="Longest darkness allowed" unit="h" value={scn.rules.max_dark_s / 3600} min={0} onSet={(v) => setRules({ max_dark_s: Math.max(0, v) * 3600 })} />
          <Num label="Longest contact gap allowed" unit="h" value={scn.rules.max_gap_s / 3600} min={0} onSet={(v) => setRules({ max_gap_s: Math.max(0, v) * 3600 })} />
          <Num label="Lit when this much disc is visible" unit="%" value={scn.rules.lit_threshold * 100} min={1} onSet={(v) => setRules({ lit_threshold: Math.min(100, Math.max(1, v)) / 100 })} />
          <Num label="Moon at least this high at the station" unit="°, 0–20" value={scn.rules.min_moon_el_deg} min={0} max={MAX_MOON_EL_DEG}
            onSet={(v) => setRules({ min_moon_el_deg: clampMoonElDeg(v) })} />
          <Num label="Grazing below" unit="° above terrain" value={scn.rules.grazing_deg} min={0} onSet={(v) => setRules({ grazing_deg: Math.max(0, v) })} />
          <label class="field">
            <span>Contact rule</span>
            <select value={scn.rules.contact_mode} onChange={(e) => setRules({ contact_mode: (e.target as HTMLSelectElement).value as Rules['contact_mode'] })}>
              <option value="stations">Deep Space Network stations</option>
              <option value="earth">Any part of Earth in view</option>
            </select>
          </label>
          <Num label="Power load" unit="W" value={scn.rules.load_w} min={0} onSet={(v) => setRules({ load_w: Math.max(0, v) })} />
          <Num label="Score weight: Sun" value={scn.rules.weights[0]} onSet={(v) => setRules({ weights: [v, scn.rules.weights[1], scn.rules.weights[2]] })} />
          <Num label="Score weight: Earth" value={scn.rules.weights[1]} onSet={(v) => setRules({ weights: [scn.rules.weights[0], v, scn.rules.weights[2]] })} />
          <Num label="Score weight: night" value={scn.rules.weights[2]} onSet={(v) => setRules({ weights: [scn.rules.weights[0], scn.rules.weights[1], v] })} />
          <div class="field"><span>&nbsp;</span><button type="button" onClick={() => { const r = makeRules(PRESETS[scn.preset]); onChange({ rules: r, stay_s: r.stay_s }); }}>Reset to preset</button></div>
        </div>
        <p class="small muted">Starting defaults from the build plan; only continuous sunlight for a 6.5-day crew stay comes from NASA. Masks exist for 2 m and 10 m observers; other heights use the nearest.</p>
      </details>
    </>
  );
}

export function TimeBar({ scn, epochMs, onTime }: { scn: Scenario; epochMs: number; onTime: (t_off_s: number) => void }) {
  const t_ms = epochMs + (scn.start_s + scn.t_off_s) * 1000;
  const d = Math.floor(scn.t_off_s / 86400);
  const hh = Math.floor((scn.t_off_s % 86400) / 3600), mm = Math.floor((scn.t_off_s % 3600) / 60);
  return (
    <div class="timebar card">
      <label for="time-slider"><strong>Time</strong></label>
      <input id="time-slider" type="range" min={0} max={scn.stay_s} step={600} value={scn.t_off_s}
        aria-valuetext={`${formatUtc(t_ms)}, day ${d} ${hh} hours ${mm} minutes into the stay`}
        onInput={(e) => onTime(Number((e.target as HTMLInputElement).value))} />
      <output for="time-slider" data-testid="time-now">{formatUtc(t_ms)} · day {d}, {String(hh).padStart(2, '0')}:{String(mm).padStart(2, '0')} into the stay</output>
    </div>
  );
}
