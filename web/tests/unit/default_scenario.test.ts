// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Review note 003 B: the default link is the scenario pipeline/sunsight/default_scenario.py found, not a hand pick.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_QUERY, DEFAULT_SITE_ID } from '../../src/state/scenario';
import { decodeScenario } from '../../src/state/url';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REC: any = JSON.parse(readFileSync(new URL('../../../docs/submission/default_scenario.json', import.meta.url), 'utf8'));

describe('default scenario (note 003 B)', () => {
  it('matches the recorded search result', () => {
    const c = REC.chosen;
    expect(c).toBeTruthy();
    expect(c.exact_target_verdict.verdict).toBe('go');
    expect(c.exact_share_250m).toBeGreaterThan(0);
    expect(c.exact_share_250m).toBeLessThan(0.9);
    const q = new URLSearchParams(DEFAULT_QUERY);
    expect(q.get('site')).toBe(c.target);
    expect(DEFAULT_SITE_ID).toBe(c.target);
    expect(q.get('start')).toBe(c.start_utc);
    expect(q.get('preset')).toBe(c.preset);
  });

  it('decodes to that site, date and preset', () => {
    const epoch = Date.parse('2027-01-01T00:00:00Z');
    const s = decodeScenario(DEFAULT_QUERY, epoch, null, [DEFAULT_SITE_ID]);
    expect(s.site_id).toBe(DEFAULT_SITE_ID);
    expect(s.preset).toBe(REC.chosen.preset);
    expect(s.start_s).toBe(REC.chosen.start_s);
    expect(s.view).toBe('miss');
  });
});
