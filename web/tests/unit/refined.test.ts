// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// The site card's "best-lit point nearby" line reads the pipeline's `refined` object.
import { describe, expect, it } from 'vitest';
import { asRefined, refinedText } from '../../src/views/ReportCard';

describe('refined best-lit point line', () => {
  it('formats the numbers and the radius from the method text', () => {
    const r = asRefined({
      offset_m: 169.7056, lit_10m_pct: 85.9672, nominal_lit_10m_pct: 85.6685, min_lit_10m_pct_within_radius: 32.0098,
      method: 'highest share of hours ... on a 20 m grid within 300 m of the cited point',
    })!;
    expect(refinedText(r)).toBe('Best-lit point within 300 m (computed): 170 m away, 86.0% vs 85.7% at the cited point; as low as 32.0% within 300 m.');
  });

  it('ignores a missing or incomplete object', () => {
    expect(asRefined(undefined)).toBeNull();
    expect(asRefined({ offset_m: 1 })).toBeNull();
  });
});
