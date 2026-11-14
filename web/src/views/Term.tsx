// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// A jargon word with a plain-language explanation on hover and on keyboard focus.
import type { ComponentChildren } from 'preact';

export const GLOSSARY = {
  azimuth: 'Direction around the horizon, measured clockwise from north: 0° north, 90° east, 180° south, 270° west.',
  elevation: 'Angle above the horizon. 0° is the level horizon; negative means below it.',
  grazing: 'Earth contact where the ground station sits less than 2° above the lunar terrain. Signals at such low angles reflect off the ground and fade.',
  psr: 'Permanently shadowed: a crater floor the Sun never reaches, because the Sun stays within about 1.5° of the horizon near the poles.',
  lit: 'A moment counts as lit when at least half of the Sun’s disc is visible above the terrain.',
  contact: 'Earth contact: at least one Deep Space Network station (Goldstone, Madrid or Canberra) is above the lunar terrain and sees the Moon at least 10° above its own horizon.',
  smooth: 'With no terrain map here, the horizon is that of a perfectly smooth Moon: slightly below level because you stand above the ground.',
  battery: 'Battery = load × longest darkness ÷ (usable depth of discharge × efficiency).',
  score: 'Score = 100 × (0.5 × average share of the Sun visible + 0.3 × share of time with Earth contact − 0.2 × longest darkness ÷ stay), clamped to 0–100.',
  miss: 'If the lander comes down anywhere inside this circle, what share of the ground still meets the rules? A robustness share, not a landing probability.',
} as const;

export function Term({ tip, children }: { tip: keyof typeof GLOSSARY | string; children: ComponentChildren }) {
  const text = tip in GLOSSARY ? GLOSSARY[tip as keyof typeof GLOSSARY] : tip;
  return (
    <span class="term" tabIndex={0}>
      {children}
      <span class="tip" role="tooltip">{text}</span>
    </span>
  );
}
