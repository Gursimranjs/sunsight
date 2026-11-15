// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Accessibility (axe), phone layout, lazy 3D loading and the no-WebGL path.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { openApp, tab, watchErrors } from './helpers';

/** Each main view, with what to wait for before checking it. */
const VIEWS: { tab: string; query: string; ready: string }[] = [
  { tab: 'Report card', query: 'site=shackleton_ridge_rim&start=2027-10-13T00:00Z', ready: 'metrics' },
  { tab: 'Which sites work?', query: 'start=2027-10-13T00:00Z&preset=crew&view=rank', ready: 'rank-list' },
  { tab: 'Sky panorama', query: 'site=shackleton_ridge_rim&start=2027-10-13T00:00Z&view=sky', ready: 'panorama' },
  { tab: 'Miss test', query: 'site=a3_malapert_massif&start=2027-10-13T00:00Z&preset=crew&view=miss', ready: 'miss-shares' },
  { tab: 'Compare & calendar', query: 'site=apollo_11&start=2027-10-13T00:00Z&view=compare', ready: 'calendar' },
  { tab: '3D view', query: 'site=shackleton_ridge_rim&start=2027-10-13T00:00Z&view=3d', ready: 'hero3d' },
  { tab: 'Athena story', query: 'view=story', ready: 'story' },
  { tab: 'Validation', query: 'view=validation', ready: '' },
];

async function ready(page: Page, v: (typeof VIEWS)[number]) {
  await openApp(page, v.query);
  await expect(page.getByRole('tab', { name: v.tab })).toHaveAttribute('aria-selected', 'true');
  if (v.ready === 'panorama') await expect(page.locator('[role=tabpanel] svg').first()).toBeVisible();
  else if (v.ready) await expect(page.getByTestId(v.ready)).toBeVisible({ timeout: 90_000 });
  else await expect(page.locator('[role=tabpanel] .card').first()).toBeVisible();
}

for (const v of VIEWS) {
  test(`axe: no serious or critical findings on "${v.tab}"`, async ({ page }) => {
    await ready(page, v);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const bad = r.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical');
    const summary = bad.map((x) => `${x.impact} ${x.id}: ${x.help} (${x.nodes.length}) e.g. ${x.nodes[0]?.target.join(' ')}`);
    console.log(`axe "${v.tab}": ${r.violations.length} findings (${r.violations.map((x) => `${x.impact} ${x.id}`).join(', ') || 'none'})`);
    expect(summary).toEqual([]);
  });

  test(`375 px: no horizontal page scroll on "${v.tab}"`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await ready(page, v);
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw).toBeLessThanOrEqual(cw);
    await ctx.close();
  });
}

/** Smallest rendered text size on the page, in CSS px (SVG text scaled by its screen transform). */
async function smallestText(page: Page): Promise<{ px: number; where: string }[]> {
  return page.evaluate(() => {
    const out: { px: number; where: string }[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || !n.textContent?.trim()) continue;
      if (el.closest('[aria-hidden="true"], .tip, script, style, option')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      let px = parseFloat(getComputedStyle(el).fontSize);
      if (el instanceof SVGElement) {
        const m = (el as unknown as SVGGraphicsElement).getScreenCTM?.();
        if (m) px *= Math.hypot(m.a, m.b);
      }
      if (px < 13.95) out.push({ px: Math.round(px * 10) / 10, where: `${el.tagName.toLowerCase()}.${el.getAttribute('class') ?? ''} "${n.textContent.trim().slice(0, 30)}"` });
    }
    return out;
  });
}

for (const v of VIEWS) {
  for (const width of [375, 1200]) {
    test(`text is at least 14 px on "${v.tab}" at ${width} px`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await ctx.newPage();
      await ready(page, v);
      await page.waitForTimeout(300);
      expect(await smallestText(page)).toEqual([]);
      await ctx.close();
    });
  }
}

test('keyboard focus is visible on every focusable control (report card and miss view)', async ({ page }) => {
  for (const q of ['site=shackleton_ridge_rim', 'site=a3_malapert_massif&start=2027-10-13T00:00Z&preset=crew&view=miss']) {
    await openApp(page, q);
    if (q.includes('miss')) await expect(page.getByTestId('miss-shares')).toBeVisible({ timeout: 90_000 });
    const missing: string[] = [];
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab');
      const r = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const ring = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2;
        // SVG pin: ring drawn on its circle instead of an outline.
        const svgRing = el instanceof SVGElement && Array.from(el.querySelectorAll('circle')).some((c) => getComputedStyle(c).stroke.includes('240, 228, 66'));
        return { ok: ring || svgRing, what: `${el.tagName.toLowerCase()} ${el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 24) ?? ''}` };
      });
      if (r && !r.ok) missing.push(r.what);
    }
    expect(missing).toEqual([]);
  }
});

test('Three.js is not loaded on first load, only when the 3D tab opens', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (r) => { if (r.resourceType() === 'script') scripts.push(r.url()); });
  await openApp(page, 'site=shackleton_ridge_rim');
  await page.waitForLoadState('networkidle');
  expect(scripts.some((u) => /Scene3D/.test(u))).toBe(false);
  await tab(page, '3D view');
  await expect(page.getByTestId('illustrative-label')).toContainText('Illustrative: shadows come from the graphics engine and nearby terrain only; the numbers come from the horizon engine.');
  await expect(page.getByTestId('scene3d-canvas')).toBeVisible();
  expect(scripts.some((u) => /Scene3D/.test(u))).toBe(true);
});

test('3D view: astronaut button and frame-rate readout work', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'site=shackleton_ridge_rim&view=3d&t_h=30');
  await expect(page.getByTestId('fps')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('astronaut-btn').click();
  await expect(page.getByRole('button', { name: 'Face Earth' })).toBeVisible();
  // Moving the 3D card's time slider moves the shared time.
  await page.getByTestId('time3d').fill('7200');
  await expect(page).toHaveURL(/t_h=2(&|$)/);
  expect(errors.filter((e) => !/GPU stall|GL Driver/.test(e))).toEqual([]);
});

test('without WebGL the 3D view shows a message, not a crash', async ({ page }) => {
  await page.addInitScript(() => {
    const proto = HTMLCanvasElement.prototype as unknown as { getContext: (this: HTMLCanvasElement, type: string, ...rest: unknown[]) => unknown };
    const orig = proto.getContext;
    proto.getContext = function (type: string, ...rest: unknown[]) {
      if (/webgl/.test(type)) return null;
      return orig.call(this, type, ...rest);
    };
  });
  const errors = watchErrors(page);
  await openApp(page, 'site=shackleton_ridge_rim&view=3d');
  await expect(page.getByTestId('no-webgl')).toContainText('3D view unavailable');
  await expect(page.getByTestId('verdict-word')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Athena story works on a phone from start to finish', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  await openApp(page, 'view=story&start=2027-01-16T00:00Z&preset=crew');
  for (let i = 1; i <= 5; i++) {
    await expect(page.getByTestId(`story-step-${i}`)).toBeVisible();
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw).toBeLessThanOrEqual(cw);
    if (i === 3) await expect(page.getByTestId('story-limit')).toContainText('would not have shown that spot going dark');
    if (i < 5) await page.getByTestId('story-next').tap();
  }
  await expect(page.getByTestId('story-future-label')).toContainText('2027-01-16');
  await expect(page.getByTestId('miss-shares').or(page.getByTestId('story-no-grid'))).toBeVisible({ timeout: 90_000 });
  expect(errors).toEqual([]);
  await ctx.close();
});
