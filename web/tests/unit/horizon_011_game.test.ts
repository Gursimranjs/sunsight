// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Review note 011, item 2: the game's reason line in four wordings, from the same events as the verdict.
// Two cases are hand-made; two are g117 and g161 on the default link, computed by the engine on the
// shipped data in public/data (the expected text is built from the engine's own events, not typed in).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeEphemeris } from '../../src/data/loaders';
import { loadMaskSet } from '../../src/data/sites';
import type { EphemerisMeta, Manifest } from '../../src/data/types';
import { runWindow } from '../../src/engine/compute';
import * as L from '../../src/engine/light';
import { failures, gameReason, sunSentence, contactSentence } from '../../src/horizon/game/firstFailure';
import { gamePointJob } from '../../src/horizon/game/gameLogic';
import { fileFetcher } from './helpers';

const H = 3600, D = 86400;
const ev = (t_s: number, to: boolean): L.LightEvent => ({ t_s, to });
const crew = L.PRESETS.crew;
function m(stay_s: number, lit: L.LightEvent[], con: L.LightEvent[], lit0 = true, con0 = true) {
  return {
    n_samples: stay_s / L.SAMPLE_STEP_S + 1, lit_events: lit, contact_events: con,
    lit_share: lit.length ? 0.5 : lit0 ? 1 : 0, contact_share: con.length ? 0.5 : con0 ? 1 : 0,
    longest_gap_s: 0,
  };
}

describe('the four wordings on hand-made stays', () => {
  it('light at touchdown, dark later: "The Sun sets after 31.0 h and stays down for 4.2 h."', () => {
    const x = m(6.5 * D, [ev(31 * H, false), ev(31 * H + 4.2 * H, true)], []);
    const f = failures(x, crew, 0).power!;
    expect(sunSentence(f, 6.5 * D)).toBe('The Sun sets after 31.0 h and stays down for 4.2 h.');
    expect(gameReason(x, crew, 0, 'engine')).toBe('The Sun sets after 31.0 h and stays down for 4.2 h. This scenario needs continuous sunlight.');
  });

  it('dark at touchdown, light later: the first spell\'s own length, not the longest one', () => {
    // Dark for 20.5 h from touchdown, then a longer 30 h night later on.
    const x = m(6.5 * D, [ev(20.5 * H, true), ev(60 * H, false), ev(90 * H, true)], []);
    expect(sunSentence(failures(x, crew, 0).power!, 6.5 * D)).toBe('The Sun is hidden at touchdown for the first 20.5 h.');
  });

  it('dark for the whole stay, and no contact for the whole stay', () => {
    const x = { ...m(6.5 * D, [], [], false, false), longest_gap_s: 6.5 * D };
    const { power, contact, stay_s } = failures(x, crew, 0);
    expect(stay_s).toBe(6.5 * D);
    expect(sunSentence(power!, stay_s)).toBe('The Sun never rises here during the stay.');
    expect(contactSentence(contact!, stay_s, x.longest_gap_s, crew.max_gap_s)).toBe('No ground station is in view at any time during the stay.');
  });

  it('a stay that holds keeps the engine\'s reason', () => {
    expect(gameReason(m(6.5 * D, [], []), crew, 0, 'Sunlight and Earth contact meet every rule with margin.'))
      .toBe('Sunlight and Earth contact meet every rule with margin.');
  });
});

describe('g117 and g161 on the default link, from the engine on the shipped data', () => {
  const PUB = new URL('../../public/data/', import.meta.url).pathname;
  const man = JSON.parse(readFileSync(PUB + 'manifest.json', 'utf8')) as Manifest;
  const meta = JSON.parse(readFileSync(PUB + man.files.ephemeris.meta, 'utf8')) as EphemerisMeta;
  const buf = readFileSync(PUB + man.files.ephemeris.bin);
  const eph = decodeEphemeris(meta, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const table: L.Table = { data: eph.data, rows: eph.meta.row_count, step_s: eph.meta.step_s };
  // Default link: site=shackleton_ridge_rim&start=2029-07-24T00:00Z&preset=crew. Row 0 is 2027-01-01 00:00 UTC.
  const start_s = (Date.UTC(2029, 6, 24) - Date.UTC(2027, 0, 1)) / 1000;
  const rules = L.makeRules(L.PRESETS.crew);
  const end_s = start_s + rules.stay_s;

  async function point(id: string) {
    const set = await loadMaskSet(man, 'miss', 'shackleton_ridge_rim', fileFetcher, PUB);
    const i = set.meta.points.findIndex((p) => p.id === id);
    expect(i).toBeGreaterThanOrEqual(0);
    return runWindow(table, gamePointJob(set, i, start_s, end_s, rules));
  }

  it('g117: the Sun never rises and no station is in view (the engine: lit 0%, contact 0%)', async () => {
    const a = await point('g117');
    expect(a.verdict.verdict).toBe('no-go');
    expect(a.metrics.lit_share).toBe(0);
    expect(a.metrics.contact_share).toBe(0);
    expect(gameReason(a.metrics, rules, start_s, a.verdict.reason)).toBe(
      'The Sun never rises here during the stay. This scenario needs continuous sunlight. '
      + 'No ground station is in view at any time during the stay.');
    // The engine's own reason says "sets" here; the game no longer does.
    expect(a.verdict.reason).toContain('The Sun sets for up to');
    expect(gameReason(a.metrics, rules, start_s, a.verdict.reason)).not.toContain('sets');
  });

  it('g161: the Sun is hidden at touchdown for the length of the first dark spell', async () => {
    const a = await point('g161');
    expect(a.verdict.verdict).toBe('no-go');
    const ev0 = a.metrics.lit_events[0];
    // Dark at touchdown, light later: the first event is a sunrise inside the stay.
    expect(ev0.to).toBe(true);
    const first_s = ev0.t_s - start_s;
    expect(first_s).toBeGreaterThan(0);
    const reason = gameReason(a.metrics, rules, start_s, a.verdict.reason);
    expect(reason.startsWith(`The Sun is hidden at touchdown for the first ${L.formatHoursText(first_s)}. This scenario needs continuous sunlight.`)).toBe(true);
  });
});
