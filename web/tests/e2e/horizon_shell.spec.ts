// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Review note 009 M1: the horizon interface behind ?ui=horizon (shell, first screen, Play, pickers, parity).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { openApp, watchErrors } from './helpers';

const SHOTS = process.env.SUNSIGHT_SHOTS_DIR;
const PARITY = 'site=shackleton_ridge_rim&start=2029-07-24T00:00Z&preset=crew&view=miss';

async function openHz(page: Page, query = '') {
  await page.goto(`./?${query ? query + '&' : ''}ui=horizon`);
  await expect(page.getByTestId('hz-app')).toBeVisible();
  await expect(page.getByTestId('verdict-word')).toBeVisible({ timeout: 60_000 });
}

/** The element's box lies inside the viewport (no scrolling needed to see it). */
async function inViewport(page: Page, testId: string) {
  const vp = page.viewportSize()!;
  const el = page.getByTestId(testId).first();
  await expect(el).toBeVisible();
  const b = (await el.boundingBox())!;
  expect(b, testId).not.toBeNull();
  expect(b.y, `${testId} top`).toBeGreaterThanOrEqual(0);
  expect(b.x, `${testId} left`).toBeGreaterThanOrEqual(0);
  expect(b.y + b.height, `${testId} bottom`).toBeLessThanOrEqual(vp.height);
  expect(b.x + b.width, `${testId} right`).toBeLessThanOrEqual(vp.width + 0.5);
}

test('?ui=horizon opens the default link with no console errors and keeps the flag in the address bar', async ({ page }) => {
  const errors = watchErrors(page);
  await openHz(page);
  await expect(page.getByTestId('hz-mission')).toContainText('Land at');
  await expect(page.getByTestId('hz-site-button')).toContainText('Shackleton');
  await expect(page.getByTestId('hz-scenario-button')).toContainText('crew sortie, 6.5 days');
  await expect(page.getByTestId('verdict-miss-share')).toBeVisible({ timeout: 90_000 });
  expect(page.url()).toContain('ui=horizon');
  expect(page.url()).toContain('site=shackleton_ridge_rim');
  await expect(page.getByTestId('fixture-banner')).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const vp of [{ width: 1280, height: 720 }, { width: 375, height: 812 }]) {
  test(`${vp.width}x${vp.height}: hero with Sun and Earth, the call, the miss line and Play are visible without scrolling`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: vp, ...(vp.width < 600 ? { isMobile: true, hasTouch: true } : {}) });
    const page = await ctx.newPage();
    await openHz(page);
    await expect(page.getByTestId('verdict-miss-share')).toBeVisible({ timeout: 90_000 });
    for (const id of ['hz-hero', 'hz-sun', 'hz-earth', 'hz-call', 'verdict-miss-line', 'hz-play']) await inViewport(page, id);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw).toBeLessThanOrEqual(vp.width);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/horizon_${vp.width}x${vp.height}.png` }).catch(() => undefined);
    await ctx.close();
  });
}

test('Play moves the Sun marker and the clock; Space pauses; arrow keys step 10 minutes', async ({ page }) => {
  await openHz(page, 'site=shackleton_ridge_rim&start=2029-07-24T00:00Z&preset=crew');
  const sun = page.getByTestId('hz-sun');
  const clock = page.getByTestId('hz-clock');
  const x0 = await sun.getAttribute('data-cx');
  const c0 = await clock.textContent();
  await page.getByTestId('hz-play').click();
  await expect(page.getByTestId('hz-play')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => sun.getAttribute('data-cx'), { timeout: 10_000 }).not.toBe(x0);
  await expect.poll(async () => clock.textContent(), { timeout: 10_000 }).not.toBe(c0);
  // Space toggles (focus on the page body, not a control).
  await page.locator('body').click({ position: { x: 2, y: 2 } });
  await page.keyboard.press('Space');
  await expect(page.getByTestId('hz-play')).toHaveAttribute('aria-pressed', 'false');
  const t1 = Number(await page.getByLabel('Time in the stay').inputValue());
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number(await page.getByLabel('Time in the stay').inputValue())).toBe(Math.min(t1 + 600, 6.5 * 86400));
});

test('the three pickers in the mission line change the site, the date and the scenario', async ({ page }) => {
  await openHz(page, 'site=shackleton_ridge_rim&start=2029-07-24T00:00Z&preset=crew');
  // Site
  await page.getByTestId('hz-site-button').click();
  await page.getByTestId('hz-picker').getByRole('button', { name: /Apollo 11/ }).click();
  await expect(page.getByTestId('hz-site-button')).toContainText('Apollo 11');
  await expect(page).toHaveURL(/site=apollo_11/);
  // Date
  await page.getByTestId('hz-date-button').click();
  await page.getByLabel('Start (UTC)').fill('2027-10-13T00:00');
  await page.getByLabel('Start (UTC)').dispatchEvent('change');
  await expect(page.getByTestId('hz-date-button')).toContainText('13 Oct 2027');
  await expect(page).toHaveURL(/start=2027-10-13T00%3A00Z/);
  // Scenario
  await page.getByTestId('hz-scenario-button').click();
  await page.getByTestId('hz-picker').getByRole('button', { name: /Robotic lander/ }).click();
  await expect(page.getByTestId('hz-scenario-button')).toContainText('robotic lander, 14 days');
  await expect(page).toHaveURL(/preset=robotic/);
  await expect(page).toHaveURL(/ui=horizon/);
  await expect(page.getByTestId('verdict-word')).toBeVisible();
});

test('the same link shows the same verdict, Sun elevation and miss share in both interfaces', async ({ page }) => {
  const read = async () => {
    await expect(page.getByTestId('verdict-miss-share')).toBeVisible({ timeout: 90_000 });
    const word = ((await page.getByTestId('verdict-word').textContent()) ?? '').match(/NO-GO|MARGINAL|GO/)?.[0];
    return { word, el: (await page.getByTestId('sun-el').textContent())?.trim(), share: (await page.getByTestId('verdict-miss-share').textContent())?.trim() };
  };
  await openApp(page, PARITY);
  const classic = await read();
  await openHz(page, PARITY);
  const horizon = await read();
  expect(classic.word).toBeTruthy();
  expect(classic.el).toMatch(/°$/);
  expect(horizon).toEqual(classic);
});

test('views: the switch opens Ground, Miss map, Rank sites, Calendar and the More views', async ({ page }) => {
  await openHz(page, 'site=shackleton_ridge_rim&start=2029-07-24T00:00Z&preset=crew');
  const nav = page.getByRole('navigation', { name: 'Views' });
  await nav.getByRole('button', { name: 'Rank sites' }).click();
  await expect(page.getByTestId('rank-list')).toBeVisible({ timeout: 90_000 });
  await nav.getByRole('button', { name: 'Calendar' }).click();
  await expect(page.getByTestId('calendar')).toBeVisible({ timeout: 90_000 });
  await nav.getByRole('button', { name: 'More' }).click();
  await nav.getByRole('button', { name: 'Proof' }).click();
  await expect(page.getByTestId('hz-view').locator('.card').first()).toBeVisible();
  await nav.getByRole('button', { name: 'Horizon' }).click();
  await expect(page.getByTestId('hz-view').locator('svg').first()).toBeVisible();
  // Provenance sits behind one disclosure on the ground panel.
  await page.getByText('Sources and method').click();
  await expect(page.getByTestId('site-source')).toBeVisible();
});

test('axe: no serious or critical findings on ?ui=horizon', async ({ page }) => {
  await openHz(page);
  await expect(page.getByTestId('verdict-miss-share')).toBeVisible({ timeout: 90_000 });
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const bad = r.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical');
  expect(bad.map((x) => `${x.impact} ${x.id}: ${x.help} (${x.nodes.length}) e.g. ${x.nodes[0]?.target.join(' ')}`)).toEqual([]);
});
