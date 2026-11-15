// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Real screenshots and raw screen recordings of the built app with the shipped data, for the people
// making the demo and the project page. Nothing here is edited or generated afterwards.
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = new URL('../../../docs/submission/', import.meta.url).pathname;
mkdirSync(OUT + 'shots', { recursive: true });
mkdirSync(OUT + 'clips', { recursive: true });

async function open(page: Page, query: string) {
  await page.goto('./?' + query);
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
    await page.goto('./'); // the default link (note 003 B)
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
    await page.goto('./'); // the default link: verdict card with the miss line on the first phone screen
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
      await page.goto('./');
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
