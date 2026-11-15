// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Scenario picker: one card per preset (label, stay and key rules read from PRESETS), plus every rule
// behind a "Rules" disclosure. The rule fields, limits and wording follow the classic rules editor
// (web/src/views/RulesEditor.tsx); the start date lives in the date picker, so it is not repeated here.
import { makeRules, PRESET_LABELS, PRESETS, type PresetId, type Rules } from '../../engine/light';
import { formatHours } from '../../format';
import { clampMoonElDeg, MAX_MOON_EL_DEG, type Scenario } from '../../state/scenario';

interface Props {
  scn: Scenario;
  update: (patch: Partial<Scenario>) => void;
}

export const PRESET_ORDER: PresetId[] = ['robotic', 'crew', 'long'];

/** The patch that switches to a preset: its rules and stay, time back to the start (as the classic editor does). */
export function presetPatch(p: PresetId): Partial<Scenario> {
  const r = makeRules(PRESETS[p]);
  return { preset: p, rules: r, stay_s: r.stay_s, t_off_s: 0 };
}

/** One line of the preset's own rules, all numbers from PRESETS. */
export function presetSummary(p: PresetId): string {
  const r = PRESETS[p];
  const dark = r.max_dark_s === 0 ? 'no darkness allowed' : `darkness up to ${formatHours(r.max_dark_s)}`;
  return `${dark}; contact gaps up to ${formatHours(r.max_gap_s)}; observer ${r.observer_height_m} m up`;
}

function Num({ label, value, min, max, unit, onSet }: { label: string; value: number; min?: number; max?: number; unit?: string; onSet: (v: number) => void }) {
  return (
    <label class="field">
      <span>{label}{unit ? ` (${unit})` : ''}</span>
      <input type="number" inputMode="decimal" step="any" min={min} max={max} value={Number(value.toFixed(4))}
        onChange={(e) => { const v = Number((e.target as HTMLInputElement).value); if (Number.isFinite(v)) onSet(v); }} />
    </label>
  );
}

export function ScenarioCards({ scn, update }: Props) {
  const setRules = (patch: Partial<Rules>) => update({ rules: { ...scn.rules, ...patch } });
  const r = scn.rules;
  return (
    <section aria-labelledby="hz-scn-title" data-testid="scenario-cards">
      <h3 id="hz-scn-title" style={{ margin: '0 0 6px', fontSize: '1rem' }}>Mission type</h3>
      <div class="hz-cards" role="group" aria-labelledby="hz-scn-title">
        {PRESET_ORDER.map((p) => (
          <button key={p} type="button" data-testid="scenario-card" data-preset={p} aria-pressed={scn.preset === p ? 'true' : 'false'}
            onClick={() => update(presetPatch(p))}>
            <span class="hz-card-title">{PRESET_LABELS[p]}</span>
            <span class="hz-num">{PRESETS[p].stay_s / 86400} days</span>
            <span style={{ fontSize: '0.85rem' }}>{presetSummary(p)}</span>
          </button>
        ))}
      </div>
      <details class="hz-rules" data-testid="rules-disclosure">
        <summary>Rules</summary>
        <div class="rules-grid">
          <label class="field">
            <span>Stay (days)</span>
            <input type="number" inputMode="decimal" min={0.5} step={0.5} value={Number((scn.stay_s / 86400).toFixed(2))}
              onChange={(e) => { const v = Number((e.target as HTMLInputElement).value); if (v > 0) update({ stay_s: v * 86400 }); }} />
          </label>
          <Num label="Observer height" unit="m" value={r.observer_height_m} min={0} onSet={(v) => setRules({ observer_height_m: Math.max(0, v) })} />
          <Num label="Longest darkness allowed" unit="h" value={r.max_dark_s / 3600} min={0} onSet={(v) => setRules({ max_dark_s: Math.max(0, v) * 3600 })} />
          <Num label="Longest contact gap allowed" unit="h" value={r.max_gap_s / 3600} min={0} onSet={(v) => setRules({ max_gap_s: Math.max(0, v) * 3600 })} />
          <Num label="Lit when this much disc is visible" unit="%" value={r.lit_threshold * 100} min={1} onSet={(v) => setRules({ lit_threshold: Math.min(100, Math.max(1, v)) / 100 })} />
          <Num label="Moon at least this high at the station" unit="°, 0–20" value={r.min_moon_el_deg} min={0} max={MAX_MOON_EL_DEG}
            onSet={(v) => setRules({ min_moon_el_deg: clampMoonElDeg(v) })} />
          <Num label="Grazing below" unit="° above terrain" value={r.grazing_deg} min={0} onSet={(v) => setRules({ grazing_deg: Math.max(0, v) })} />
          <label class="field">
            <span>Contact rule</span>
            <select value={r.contact_mode} onChange={(e) => setRules({ contact_mode: (e.target as HTMLSelectElement).value as Rules['contact_mode'] })}>
              <option value="stations">Deep Space Network stations</option>
              <option value="earth">Any part of Earth in view</option>
            </select>
          </label>
          <Num label="Power load" unit="W" value={r.load_w} min={0} onSet={(v) => setRules({ load_w: Math.max(0, v) })} />
          <Num label="Score weight: Sun" value={r.weights[0]} onSet={(v) => setRules({ weights: [v, r.weights[1], r.weights[2]] })} />
          <Num label="Score weight: Earth" value={r.weights[1]} onSet={(v) => setRules({ weights: [r.weights[0], v, r.weights[2]] })} />
          <Num label="Score weight: night" value={r.weights[2]} onSet={(v) => setRules({ weights: [r.weights[0], r.weights[1], v] })} />
          <div class="field">
            <span>&nbsp;</span>
            <button type="button" onClick={() => { const x = makeRules(PRESETS[scn.preset]); update({ rules: x, stay_s: x.stay_s }); }}>Reset to preset</button>
          </div>
        </div>
        <p style={{ fontSize: '0.85rem' }}>
          Starting defaults from the build plan; only continuous sunlight for a 6.5-day crew stay comes from NASA. Masks exist for 2 m and 10 m observers; other heights use the nearest.
        </p>
      </details>
    </section>
  );
}
