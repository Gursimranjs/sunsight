// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// The mission line: "Land at [site] on [date] for a [scenario]." Each bracketed part opens a picker:
// site -> SiteMapPicker (a dialog), date -> DateStrip, scenario -> ScenarioCards. The pickers are loaded on
// demand. Opening a picker moves focus into it; closing it (Escape, Close, a choice, a click outside)
// gives focus back to the button that opened it (review 009 shell #5).
import { useEffect, useRef } from 'preact/hooks';
import type { Site } from '../data/types';
import { PRESET_LABELS, type PresetId } from '../engine/light';
import type { AppData } from '../state/data';
import type { Scenario } from '../state/scenario';
import { encodeScenario } from '../state/url';
import { lazyComponent } from './useHorizonState';

const SiteMapPicker = lazyComponent(() => import('./pickers/SiteMapPicker').then((m) => m.SiteMapPicker), 'Loading the site map…');
const DateStrip = lazyComponent(() => import('./pickers/DateStrip').then((m) => m.DateStrip), 'Loading the calendar…');
const ScenarioCards = lazyComponent(() => import('./pickers/ScenarioCards').then((m) => m.ScenarioCards), 'Loading the mission types…');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "24 Jul 2029, 00:00 UTC". */
export function missionDate(ms: number): string {
  const d = new Date(ms);
  const iso = d.toISOString();
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${iso.slice(11, 16)} UTC`;
}

/** The URL keys encodeScenario writes only when a rule differs from the preset. */
export const RULE_KEYS = ['obs_m', 'dark_h', 'gap_h', 'lit', 'moon_el_deg', 'graze_deg', 'contact', 'load_w', 'w'];

/** True when any rule differs from the preset's (encodeScenario writes a rule key). */
export function rulesEdited(scn: Scenario, epochMs: number): boolean {
  const q = new URLSearchParams(encodeScenario(scn, epochMs));
  return RULE_KEYS.some((k) => q.has(k));
}

/** "crew sortie, 6.5 days", with " (edited rules)" when the rules differ from the preset. */
export function scenarioPhrase(p: PresetId, stay_s: number, edited = false): string {
  return `${PRESET_LABELS[p].toLowerCase()}, ${Number((stay_s / 86400).toFixed(2))} days${edited ? ' (edited rules)' : ''}`;
}

/** The build plan's honest label for the rules (the classic rules editor's sentence). */
export const RULES_SOURCE_TEXT = 'Starting defaults from the build plan; only continuous sunlight for a 6.5-day crew stay comes from NASA.';

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

const triggerOf = (k: PickerKind) => document.querySelector<HTMLElement>(`[data-testid=hz-${k}-button]`);
const FOCUS_FIRST = 'button[aria-current]:not([disabled]), button[aria-pressed=true], button:not([disabled]), input, select, summary, a[href]';

/** Panel style for the date and scenario pickers: ink on the light ground surface, as the pickers expect. */
const LIGHT_PANEL = { background: 'var(--hz-ground, #CFCBC2)', color: 'var(--hz-ink, #17181A)', borderColor: 'var(--hz-ground-shade, #8E8A82)' };
const LIGHT_CLOSE = { color: 'var(--hz-ink, #17181A)', borderColor: 'var(--hz-ink, #17181A)', background: 'transparent' };

export function MissionLine({ data, scn, site, placeName, open, setOpen, update }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const wasOpen = useRef<PickerKind | null>(null);

  // Close: after the picker is gone, focus goes back to its trigger unless the user put it somewhere else
  // (a click outside on another control keeps that control focused).
  const close = () => {
    const k = open;
    if (!k) return;
    const inside = panel.current;
    const active = document.activeElement;
    const hadFocus = !active || active === document.body || (!!inside && inside.contains(active)) || !!active.closest?.('[data-testid=site-map-picker]');
    setOpen(null);
    requestAnimationFrame(() => {
      const now = document.activeElement;
      if (hadFocus || !now || now === document.body) triggerOf(k)?.focus();
    });
  };

  // Escape and click outside close the date and scenario panels (the site dialog handles its own).
  useEffect(() => {
    if (!open || open === 'site') return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
    const outside = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t || panel.current?.contains(t) || triggerOf(open)?.contains(t)) return;
      close();
    };
    addEventListener('keydown', esc);
    document.addEventListener('mousedown', outside);
    return () => { removeEventListener('keydown', esc); document.removeEventListener('mousedown', outside); };
  }, [open]);

  // Opening a panel moves focus into it, to the chosen item when there is one (once the lazy picker is in).
  useEffect(() => {
    const opened = open && open !== wasOpen.current ? open : null;
    wasOpen.current = open;
    if (!opened || opened === 'site') return;
    let tries = 0;
    let raf = 0;
    const focusIn = () => {
      const root = panel.current;
      if (!root) return;
      const content = root.querySelector('[data-testid=date-strip], [data-testid=scenario-cards]');
      if (!content && tries++ < 120) { raf = requestAnimationFrame(focusIn); return; }
      (root.querySelector<HTMLElement>(FOCUS_FIRST))?.focus();
    };
    raf = requestAnimationFrame(focusIn);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const btn = (k: PickerKind, text: string) => (
    <button type="button" class="hz-pick" data-testid={`hz-${k}-button`} aria-expanded={open === k} aria-haspopup={k === 'site' ? 'dialog' : 'true'}
      aria-controls={open === k ? (k === 'site' ? 'hz-site-dialog' : 'hz-picker') : undefined}
      onClick={() => (open === k ? close() : setOpen(k))}>{text}</button>
  );
  const done = (patch: Partial<Scenario>) => { update(patch); close(); };
  const edited = rulesEdited(scn, data.eph.start_ms);
  return (
    <div class="hz-mission-wrap">
      <p class="hz-mission" data-testid="hz-mission">
        Land at {btn('site', placeName)} on {btn('date', missionDate(data.eph.start_ms + scn.start_s * 1000))}{' '}
        for a {btn('scenario', scenarioPhrase(scn.preset, scn.stay_s, edited))}.
      </p>
      {open === 'site' && (
        <div id="hz-site-dialog">
          <SiteMapPicker sites={data.sites} siteId={site?.id ?? null} onSite={(id: string) => update({ site_id: id })} onClose={close}
            lat_deg={scn.lat_deg} lon_deg={scn.lon_deg} onCustom={(lat_deg: number, lon_deg: number) => update({ site_id: null, lat_deg, lon_deg })} />
        </div>
      )}
      {(open === 'date' || open === 'scenario') && (
        <div class="hz-picker" id="hz-picker" data-testid="hz-picker" role="group" aria-label={`Choose the ${open}`} ref={panel} style={LIGHT_PANEL}>
          {open === 'date' && <DateStrip data={data} site={site} scn={scn} onStart={(start_s: number) => done({ start_s, t_off_s: 0 })} />}
          {open === 'scenario' && (
            <>
              <ScenarioCards scn={scn} update={(patch: Partial<Scenario>) => ('preset' in patch ? done(patch) : update(patch))} />
              <p class="small" data-testid="rules-source">{RULES_SOURCE_TEXT}{edited ? ' Your rules differ from this preset.' : ''}</p>
            </>
          )}
          <button type="button" class="hz-close" data-testid="hz-picker-close" style={LIGHT_CLOSE} onClick={close}>Close</button>
        </div>
      )}
    </div>
  );
}
