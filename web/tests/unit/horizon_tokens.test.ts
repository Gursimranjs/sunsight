// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Horizon tokens (review note 009): the shared custom properties, self-hosted fonts within budget,
// licence and credit present, and the contrast of the colour pairs the interface uses.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const WEB = new URL('../../', import.meta.url).pathname;
const css = readFileSync(WEB + 'src/horizon/tokens.css', 'utf8');
const FONTS = WEB + 'public/fonts/';

function token(name: string): string {
  const m = css.match(new RegExp(`${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`missing ${name}`);
  return m[1].trim();
}

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a: string, b: string): number {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

describe('horizon tokens', () => {
  it('defines the shared contract on the .hz root', () => {
    expect(css).toMatch(/\.hz\s*\{/);
    expect(token('--hz-sky')).toBe('#000000');
    expect(token('--hz-ground')).toBe('#CFCBC2');
    expect(token('--hz-ground-shade')).toBe('#8E8A82');
    expect(token('--hz-ink')).toBe('#17181A');
    expect(token('--hz-sun')).toBe('#FFD27A');
    expect(token('--hz-earth')).toBe('#4F8FD6');
    expect(token('--hz-go')).toBe('#1F7A4D');
    expect(token('--hz-nogo')).toBe('#B4421E');
    expect(token('--hz-fast')).toBe('150ms');
    expect(token('--hz-font-display')).toMatch(/^'Barlow Condensed'/);
    expect(token('--hz-font-body')).toMatch(/^'Barlow'/);
    expect(token('--hz-ease')).toMatch(/cubic-bezier/);
  });

  it('meets WCAG AA for every text pair it uses (go and no-go words use the darker ink variants)', () => {
    const ground = token('--hz-ground'), sky = token('--hz-sky');
    expect(contrast(token('--hz-ink'), ground)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('--hz-go-ink'), ground)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('--hz-nogo-ink'), ground)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('--hz-sun'), sky)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('--hz-earth'), sky)).toBeGreaterThanOrEqual(4.5);
    // Fills and marks: 3:1 against the ground; white labels on the fills: 4.5:1.
    expect(contrast(token('--hz-go'), ground)).toBeGreaterThanOrEqual(3);
    expect(contrast(token('--hz-nogo'), ground)).toBeGreaterThanOrEqual(3);
    expect(contrast('#FFFFFF', token('--hz-go'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#FFFFFF', token('--hz-nogo'))).toBeGreaterThanOrEqual(4.5);
  });

  it('self-hosts three latin woff2 files within 80 kB, with the licence and a README', () => {
    const woff = readdirSync(FONTS).filter((f) => f.endsWith('.woff2')).sort();
    expect(woff).toEqual(['barlow-condensed-latin-700-normal.woff2', 'barlow-latin-400-normal.woff2', 'barlow-latin-600-normal.woff2']);
    const bytes = woff.reduce((n, f) => n + statSync(FONTS + f).size, 0);
    expect(bytes).toBeLessThanOrEqual(80 * 1024);
    for (const f of woff) expect(css).toContain(`url('/fonts/${f}')`);
    expect(css.match(/font-display:\s*swap/g)).toHaveLength(3);
    expect(readFileSync(FONTS + 'OFL.txt', 'utf8')).toContain('SIL Open Font License');
    expect(readFileSync(FONTS + 'README.md', 'utf8')).toContain('@fontsource/barlow');
    // No font CDN anywhere in the tokens.
    expect(css).not.toMatch(/https?:\/\//);
  });

  it('credits the fonts on the About the data card', () => {
    expect(readFileSync(WEB + 'src/views/Credits.tsx', 'utf8')).toContain('Barlow and Barlow Condensed by The Barlow Project Authors, SIL Open Font License 1.1');
  });
});
