// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Note 011: #8 the Sun and Earth labels stay in the sky and do not overlap at 375 px on the default link;
// the capture finding (a label near the left or right edge cut to "arth"); #9 a link with no place opens
// the default link in both interfaces; and a link exported from the classic interface carries ui=classic.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { openApp } from './helpers';

interface LabelCheck { kind: string; x0: number; x1: number; y0: number; y1: number; W: number; inSky: boolean }

/** Each drawn label's box in SVG units, the SVG width, and whether the box's bottom edge is clear of the terrain. */
async function labelChecks(page: Page): Promise<LabelCheck[]> {
  return page.evaluate(() => {
    const svg = document.querySelector('[data-testid=hz-hero] svg') as SVGSVGElement;
    const terrain = document.querySelector('[data-testid=hz-terrain]') as SVGGeometryElement;
    const W = svg.viewBox.baseVal.width;
    return ['sun', 'earth'].flatMap((kind) => {
      const t = document.querySelector(`[data-testid=hz-${kind}-label]`) as SVGTextElement | null;
      if (!t) return [];
      const b = t.getBBox();
      const pts = [b.x, b.x + b.width / 2, b.x + b.width].map((x) => new DOMPoint(x, b.y + b.height));
      const inSky = pts.every((p) => !terrain.isPointInFill(p));
      return [{ kind, x0: b.x, x1: b.x + b.width, y0: b.y, y1: b.y + b.height, W, inSky }];
    });
  });
}

test('375 px default link: both labels are above the terrain line and do not overlap (note 011 #8)', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  await page.goto('./?ui=horizon');
  await expect(page.getByTestId('verdict-word')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('hz-hero')).toHaveAttribute('data-run', 'settled', { timeout: 10_000 });
  await expect(page.getByTestId('hz-earth-label')).toBeVisible();
  const boxes = await labelChecks(page);
  expect(boxes.map((b) => b.kind).sort()).toEqual(['earth', 'sun']);
  for (const b of boxes) {
    expect(b.inSky, `${b.kind} label is above the terrain line`).toBe(true);
    expect(b.x0).toBeGreaterThanOrEqual(0);
    expect(b.x1).toBeLessThanOrEqual(b.W);
  }
  const [a, c] = boxes;
  expect(a.x0 < c.x1 && c.x0 < a.x1 && a.y0 < c.y1 && c.y0 < a.y1, 'the two labels overlap').toBe(false);
  // On this link the two would collide (note 011 #8): one label is raised with its leader line.
  const raised = await page.locator('[data-testid$=-label][data-raised=true]').count();
  expect(raised).toBe(1);
  await expect(page.locator('[data-testid$=-leader]')).toHaveCount(1);
  // The halo is light: a thin sky-coloured stroke, not a heavy outline.
  const sw = await page.getByTestId('hz-earth-label').evaluate((el) => parseFloat(getComputedStyle(el).strokeWidth));
  expect(sw).toBeLessThanOrEqual(2);
  await ctx.close();
});

for (const width of [375, 1280]) {
  test(`${width} px: a label near azimuth 0/360 stays whole inside the drawing (capture "arth")`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width, height: width === 375 ? 812 : 720 } });
    const page = await ctx.newPage();
    // The journey-a link of the capture: Malapert massif, where Earth stands near north (the drawing's edges).
    await page.goto('./?site=a3_malapert_massif&start=2027-10-13T00:00Z&days=14&preset=robotic&ui=horizon');
    await expect(page.getByTestId('verdict-word')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('hz-hero')).toHaveAttribute('data-run', 'settled', { timeout: 10_000 });
    const earth = page.getByTestId('hz-earth');
    const cx = Number(await earth.getAttribute('data-cx'));
    const boxes = await labelChecks(page);
    const W = boxes[0]?.W ?? 0;
    // Guard that this link still exercises the edge: the Earth disc is within 30 px of one side.
    expect(Math.min(cx, W - cx)).toBeLessThan(30);
    for (const b of boxes) {
      expect(b.x0, `${b.kind} label left edge`).toBeGreaterThanOrEqual(0);
      expect(b.x1, `${b.kind} label right edge`).toBeLessThanOrEqual(b.W);
      expect(b.inSky, `${b.kind} label is above the terrain line`).toBe(true);
    }
    await ctx.close();
  });
}

for (const search of ['?foo=1&ui=classic', '?ui=horizon&foo=1']) {
  test(`${search} opens the default link's site, date and preset (note 011 #9)`, async ({ page }) => {
    await page.goto('./' + search);
    await expect(page.getByTestId('verdict-word')).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => page.evaluate(() => new URLSearchParams(location.search).get('site'))).toBe('shackleton_ridge_rim');
    const q = await page.evaluate(() => Object.fromEntries(new URLSearchParams(location.search)));
    expect(q.start).toBe('2029-07-24T00:00Z');
    expect(q.preset).toBe('crew');
    expect(q.foo).toBeUndefined();
    await expect(page.getByTestId('hz-app')).toHaveCount(search.includes('horizon') ? 1 : 0);
  });
}

test('the link exported from the classic interface carries ui=classic and reopens it', async ({ page }) => {
  await openApp(page, 'site=shackleton_ridge_rim&start=2029-07-24T00:00Z&preset=crew');
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  const file = await (await dl).path();
  const line = readFileSync(file, 'utf8').split('\n').find((l) => l.startsWith('# link,'))!;
  const link = new URL(line.slice('# link,'.length).replace(/^"|"$/g, ''));
  expect(link.searchParams.get('ui')).toBe('classic');
  expect(link.searchParams.get('site')).toBe('shackleton_ridge_rim');
  await page.goto(link.toString());
  await expect(page.getByTestId('verdict-word')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('hz-app')).toHaveCount(0);
});
