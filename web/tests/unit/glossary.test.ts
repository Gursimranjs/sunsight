// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Review fix 6: tooltip and caption numbers come from the rules in force, not from fixed text.
import { describe, expect, it } from 'vitest';
import * as L from '../../src/engine/light';
import { glossaryText, isGlossaryKey, litRuleText } from '../../src/views/glossary';

describe('glossary built from the current rules', () => {
  it('default rules give the default numbers', () => {
    const r = L.PRESETS.robotic;
    expect(glossaryText('lit', r)).toContain('at least 50% of the Sun');
    expect(glossaryText('contact', r)).toContain('at least 10° above its own horizon');
    expect(glossaryText('grazing', r)).toContain('less than 2° above the lunar terrain');
    expect(glossaryText('score', r)).toBe('Score = 100 × (0.5 × average share of the Sun visible + 0.3 × share of time with Earth contact − 0.2 × longest darkness ÷ stay), clamped to 0–100.');
    expect(glossaryText('battery', r)).toContain('100 W');
  });

  it('edited rules change every number', () => {
    const r = L.makeRules({ lit_threshold: 0.75, min_moon_el_deg: 15, grazing_deg: 3.5, weights: [0.6, 0.25, 0.15], load_w: 250 });
    expect(glossaryText('lit', r)).toContain('at least 75% of the Sun');
    expect(glossaryText('contact', r)).toContain('at least 15° above its own horizon');
    expect(glossaryText('grazing', r)).toContain('less than 3.5° above the lunar terrain');
    expect(glossaryText('score', r)).toContain('100 × (0.6 × average share of the Sun visible + 0.25 × share of time with Earth contact − 0.15 × longest darkness');
    expect(glossaryText('battery', r)).toContain('250 W');
    for (const k of ['lit', 'contact', 'grazing', 'score'] as const) {
      expect(glossaryText(k, r)).not.toMatch(/\b50%|\b10°|\b2°|0\.5 ×|0\.3 ×|0\.2 ×/);
    }
  });

  it('the contact mode changes the contact and grazing text', () => {
    const r = L.makeRules({ contact_mode: 'earth' });
    expect(glossaryText('contact', r)).toContain('any part of Earth');
    expect(glossaryText('contact', r)).not.toContain('Deep Space Network');
    expect(glossaryText('grazing', r)).toContain('never graded as grazing');
  });

  it('lit rule text for captions, and own keys only', () => {
    expect(litRuleText(L.makeRules({ lit_threshold: 0.5 }))).toBe('at least 50% of the Sun’s disc above the terrain');
    expect(litRuleText(L.makeRules({ lit_threshold: 0.125 }))).toBe('at least 12.5% of the Sun’s disc above the terrain');
    expect(isGlossaryKey('lit')).toBe(true);
    expect(isGlossaryKey('toString')).toBe(false);
    expect(isGlossaryKey('constructor')).toBe(false);
  });
});
