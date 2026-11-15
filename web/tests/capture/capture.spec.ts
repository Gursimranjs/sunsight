// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Real screenshots and raw screen recordings of the built app with the shipped data, for the people
// making the demo and the project page. Nothing here is edited or generated afterwards.
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = new URL('../../../docs/submission/', import.meta.url).pathname;
mkdirSync(OUT + 'shots', { recursive: true });
mkdirSync(OUT + 'clips', { recursive: true });

// The classic interface is asked for by name, so these shots stay the same whichever interface is the default.
async function open(page: Page, query: string) {
  await page.goto('./?' + query + '&ui=classic');
  await expect(page.getByTestId('verdict-reason')).not.toBeEmpty();
}

async function tab(page: Page, name: string) {
  await page.getByRole('tab', { name }).click();
}

test.describe('screenshots', () => {
  test('report card, panorama, miss map, validation (desktop)', async ({ page }) => {
    await open(page, 'site=shackleton_ridge_rim&start=2028-06-01T00:00Z&days=14&preset=robotic');
    await page.waitForTimeout(800);
    await page.screenshot({ path: OUT + 'shots/1_report_card.png', fullPage: false });
    await tab(page, 'Sky panorama');
    await page.waitForTimeout(800);
    await page.screenshot({ path: OUT + 'shots/2_sky_panorama.png', fullPage: true });
    await page.goto('./?ui=classic'); // the default link (note 003 B)
    await expect(page.getByTestId('verdict-miss-share')).toBeVisible({ timeout: 90_000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: OUT + 'shots/0_first_screen.png', fullPage: false });
    await expect(page.getByTestId('miss-shares')).toBeVisible();
    await page.waitForTimeout(800);
    await page.screenshot({ path: OUT + 'shots/3_miss_map.png', fullPage: true });
    await tab(page, 'Validation');
    await page.waitForTimeout(800);
    await page.screenshot({ path: OUT + 'shots/4_validation.png', fullPage: true });
  });

  test('ranking and 3D views (desktop)', async ({ page }) => {
    await open(page, 'site=shackleton_ridge_rim&start=2027-10-13T00:00Z&preset=crew&view=rank');
    await expect(page.getByTestId('rank-list')).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: OUT + 'shots/7_which_sites_work.png', fullPage: true });
    await open(page, 'site=shackleton_ridge_rim&start=2027-10-13T00:00Z&preset=crew&view=3d&t_h=30');
    await expect(page.getByTestId('scene3d-canvas')).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(2500);
    await page.getByTestId('hero3d').scrollIntoViewIfNeeded();
    await page.getByTestId('hero3d').screenshot({ path: OUT + 'shots/8_3d_lit.png' });
    await open(page, 'site=shackleton_crater&start=2027-06-01T00:00Z&view=3d&t_h=24');
    await expect(page.getByTestId('fill-light-label')).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(2500);
    await page.getByTestId('hero3d').scrollIntoViewIfNeeded();
    await page.getByTestId('hero3d').screenshot({ path: OUT + 'shots/9_3d_night_fill_light.png' });
  });

  test('phone views (375 px)', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.goto('./?ui=classic'); // the default link: verdict card with the miss line on the first phone screen
    await expect(page.getByTestId('verdict-miss-share')).toBeVisible({ timeout: 90_000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: OUT + 'shots/5_phone_first_screen.png' });
    await open(page, 'site=im2_athena_target&start=2027-03-01T00:00Z&days=14&preset=robotic');
    await page.waitForTimeout(800);
    await page.screenshot({ path: OUT + 'shots/5_phone_report_card.png' });
    await tab(page, 'Athena story');
    await page.waitForTimeout(800);
    await page.screenshot({ path: OUT + 'shots/6_phone_story.png' });
    await ctx.close();
  });
});

async function recorded(browser: import('@playwright/test').Browser, name: string, run: (p: Page) => Promise<void>) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: OUT + 'clips/tmp', size: { width: 1280, height: 720 } }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  await run(page);
  await page.waitForTimeout(1200);
  const v = page.video()!;
  await ctx.close();
  await v.saveAs(OUT + `clips/${name}.webm`);
  await v.delete();
}

test.describe('raw clips of the three journeys', () => {
  test('first visit: default link, then "I have a date"', async ({ browser }) => {
    await recorded(browser, 'journey_0_first_visit', async (page) => {
      await page.goto('./?ui=classic');
      await expect(page.getByTestId('verdict-miss-share')).toBeVisible({ timeout: 90_000 });
      await page.waitForTimeout(3000);
      await page.getByRole('button', { name: 'I have a date: which sites work?' }).click();
      await expect(page.getByTestId('rank-list')).toBeVisible({ timeout: 60_000 });
      await page.waitForTimeout(3000);
    });
  });

  test('journey a: date to sites', async ({ browser }) => {
    await recorded(browser, 'journey_a_date_to_sites', async (page) => {
      await open(page, 'site=a3_malapert_massif&start=2027-10-13T00:00Z&days=14&preset=robotic');
      await page.waitForTimeout(1500);
      await tab(page, 'Compare & calendar');
      const ids = ['a3_malapert_massif', 'shackleton_ridge_rim', 'a3_de_gerlache_rim'];
      for (const [k, id] of ids.entries()) {
        await page.getByRole('combobox', { name: new RegExp(`^Site ${k + 1}\\b`) }).selectOption(id);
        await page.waitForTimeout(900);
      }
      await expect(page.getByTestId('compare-row')).toHaveCount(3);
      await page.waitForTimeout(2500);
    });
  });

  test('journey b: site to dates', async ({ browser }) => {
    await recorded(browser, 'journey_b_site_to_dates', async (page) => {
      await open(page, 'site=shackleton_ridge_rim&start=2027-02-01T00:00Z');
      await page.waitForTimeout(1200);
      await tab(page, 'Compare & calendar');
      await page.getByLabel('Days shown').selectOption('7');
      const cal = page.getByTestId('calendar');
      await expect(cal).toBeVisible();
      await page.waitForTimeout(2000);
      await cal.getByTestId('cal-cell').nth(3).click();
      await page.waitForTimeout(3000);
    });
  });

  test('journey c: miss test', async ({ browser }) => {
    await recorded(browser, 'journey_c_miss_test', async (page) => {
      await open(page, 'site=shackleton_ridge_rim&start=2027-10-13T00:00Z&preset=crew&view=miss');
      await expect(page.getByTestId('miss-shares')).toBeVisible();
      await page.waitForTimeout(1500);
      const pin = page.getByTestId('miss-pin');
      await pin.focus();
      for (const k of ['ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowLeft', 'ArrowDown']) {
        await page.keyboard.press(k);
        await page.waitForTimeout(450);
      }
      await page.waitForTimeout(2500);
    });
  });
});

// ---------------------------------------------------------------------------------------------------
// The horizon interface (note 009 M4): the same build and data, asked for with ?ui=horizon.

async function hzContext(browser: import('@playwright/test').Browser, phone = false) {
  return browser.newContext(phone
    ? { viewport: { width: 375, height: 812 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: 'dark' }
    : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2, colorScheme: 'dark' });
}

/** Opens a horizon link and waits until the Sun load run has settled and the fonts are loaded. */
async function openHz(page: Page, query = '') {
  await page.goto('./?' + (query ? query + '&' : '') + 'ui=horizon');
  await expect(page.getByTestId('hz-app')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('verdict-word')).toBeVisible({ timeout: 90_000 });
  await expect(page.locator('[data-testid=hz-hero][data-run=settled]')).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

/** Waits until no finite animation is running (the lander drop, the reveal fade). */
async function still(page: Page, extra_ms = 400) {
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getComputedTiming().iterations === Infinity), undefined, { timeout: 20_000 });
  await page.waitForTimeout(extra_ms);
}

/** Starts Play and pauses it once the playhead has passed `share` of the stay. */
async function playTo(page: Page, share: number) {
  await page.getByTestId('hz-play').click();
  await page.waitForFunction((f) => {
    const s = document.querySelector<HTMLInputElement>('input[aria-label="Time in the stay"]');
    return !!s && Number(s.value) >= Number(s.max) * f;
  }, share, { polling: 'raf', timeout: 30_000 });
  await page.getByTestId('hz-play').click();
  await expect(page.getByTestId('hz-play')).toHaveAttribute('aria-pressed', 'false');
}

/** Moves the game's reticle by keyboard, lands, and waits for the n-th result. */
async function landByKeys(page: Page, keys: string[], n: number) {
  await page.getByTestId('game-reticle').focus();
  for (const k of keys) { await page.keyboard.press(k); await page.waitForTimeout(150); }
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('game-try-list').locator('li')).toHaveCount(n, { timeout: 90_000 });
  await expect(page.getByTestId('game-result')).toBeVisible({ timeout: 30_000 });
}

async function openGame(page: Page) {
  await openHz(page);
  await page.getByTestId('hz-game-button').click();
  await expect(page.getByTestId('game-brief')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('game-map')).toBeVisible({ timeout: 60_000 });
}

const TRY1 = ['ArrowRight', 'ArrowRight', 'ArrowUp'];
const TRY2 = ['ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowDown'];
const TRY3 = ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowRight'];
const SHARE_LINE = /^\d of your 3 landings held\. Within 250 m, \d+% of the ground holds\.$/;

test.describe('horizon interface screenshots', () => {
  test('first screen, Play mid-stay, pickers and Rank sites (1280 x 720)', async ({ browser }) => {
    const ctx = await hzContext(browser);
    const page = await ctx.newPage();
    await openHz(page); // the default link
    await expect(page.getByTestId('verdict-miss-share')).toBeVisible({ timeout: 90_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: OUT + 'shots/h1_first_screen.png' });

    await playTo(page, 0.5);
    await page.waitForTimeout(500);
    await page.screenshot({ path: OUT + 'shots/h3_play_mid_stay.png' });

    await openHz(page);
    await page.getByTestId('hz-site-button').click();
    await expect(page.getByTestId('site-map-picker')).toBeVisible();
    await expect(page.getByTestId('site-pin').first()).toBeVisible();
    await page.waitForTimeout(600);
    await page.screenshot({ path: OUT + 'shots/h4_site_picker.png' });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('site-map-picker')).toHaveCount(0);

    await page.getByTestId('hz-date-button').click();
    await expect(page.getByTestId('strip-day').first()).toBeVisible({ timeout: 90_000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: OUT + 'shots/h5_date_strip.png' });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('hz-picker')).toHaveCount(0);

    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Rank sites' }).click();
    await expect(page.getByTestId('rank-list')).toBeVisible({ timeout: 90_000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: OUT + 'shots/h8_rank_sites.png', fullPage: true });
    await ctx.close();
  });

  test('first screen on a phone (375 x 812)', async ({ browser }) => {
    const ctx = await hzContext(browser, true);
    const page = await ctx.newPage();
    await openHz(page);
    await expect(page.getByTestId('verdict-miss-share')).toBeVisible({ timeout: 90_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: OUT + 'shots/h2_phone_first_screen.png' });
    await ctx.close();
  });

  test('Land it yourself: one result, then three tries and the whole ground', async ({ browser }) => {
    const ctx = await hzContext(browser);
    const page = await ctx.newPage();
    await openGame(page);
    await landByKeys(page, TRY1, 1);
    await still(page, 600);
    await page.screenshot({ path: OUT + 'shots/h6_game_result.png', fullPage: true });

    await landByKeys(page, TRY2, 2);
    await still(page);
    await landByKeys(page, TRY3, 3);
    await still(page);
    await page.getByTestId('game-show-ground').click();
    await expect(page.getByTestId('game-share-line')).toHaveText(SHARE_LINE, { timeout: 120_000 });
    await still(page, 800);
    await page.screenshot({ path: OUT + 'shots/h7_game_reveal.png', fullPage: true });
    await ctx.close();
  });
});

test.describe('raw clips of the horizon interface', () => {
  test('first visit: default link, Play the stay, then another site from the map', async ({ browser }) => {
    await recorded(browser, 'journey_h1_first_visit', async (page) => {
      await openHz(page);
      await expect(page.getByTestId('verdict-miss-share')).toBeVisible({ timeout: 90_000 });
      await page.waitForTimeout(2500);
      await page.getByTestId('hz-play').click();
      await expect(page.getByTestId('hz-play')).toHaveAttribute('aria-pressed', 'false', { timeout: 30_000 });
      await page.waitForTimeout(1500);
      await page.getByTestId('hz-site-button').click();
      const pin = page.locator('[data-testid=site-pin][data-site-id=a3_malapert_massif]');
      await expect(pin).toBeVisible();
      await page.waitForTimeout(1200);
      await pin.hover();
      await page.waitForTimeout(1000);
      await pin.click();
      await expect(page.getByTestId('hz-site-button')).toContainText('Malapert');
      await expect(page.locator('[data-testid=hz-hero][data-run=settled]')).toBeVisible({ timeout: 60_000 });
      await page.waitForTimeout(3000);
    });
  });

  test('Land it yourself: three landings, the whole ground, then Athena\'s target', async ({ browser }) => {
    await recorded(browser, 'journey_h2_land_it_yourself', async (page) => {
      await openGame(page);
      await page.waitForTimeout(1500);
      await landByKeys(page, TRY1, 1);
      await page.waitForTimeout(2000);
      await landByKeys(page, TRY2, 2);
      await page.waitForTimeout(2000);
      await landByKeys(page, TRY3, 3);
      await page.waitForTimeout(2000);
      await page.getByTestId('game-show-ground').click();
      await expect(page.getByTestId('game-share-line')).toHaveText(SHARE_LINE, { timeout: 120_000 });
      await page.waitForTimeout(3000);
      await page.getByTestId('game-athena').scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      await page.getByTestId('game-athena').click();
      await expect(page.getByTestId('game-brief')).toContainText('Athena', { timeout: 60_000 });
      await page.getByTestId('game-brief').scrollIntoViewIfNeeded();
      await page.waitForTimeout(3000);
    });
  });
});
