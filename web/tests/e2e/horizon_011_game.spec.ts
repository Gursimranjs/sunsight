// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Review note 011, items 1 and 3 to 6, against the built site in the horizon interface: no sky chart in the
// game (only the strip, with the failure marked), the site map's longitude labels inside the drawing, the
// two copy changes, the busy state while a try plays, and the Sun and Earth markers on the game map.
import { expect, test, type Page } from '@playwright/test';
import { watchErrors } from './helpers';

const BASE = 'site=shackleton_ridge_rim&start=2029-07-24T00:00Z&preset=crew';

async function openHz(page: Page, query = '') {
  await page.goto(`./?${query ? query + '&' : ''}ui=horizon`);
  await expect(page.getByTestId('hz-app')).toBeVisible();
}

test('g161: no "Now the Sun is" in the game; the strip marks the failure at touchdown; the reason says "hidden"', async ({ page }) => {
  const errors = watchErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHz(page, `${BASE}&view=game&game_pt=g161`);
  const result = page.getByTestId('game-result');
  await expect(result).toBeVisible({ timeout: 90_000 });
  await expect(result).toHaveAttribute('data-point-id', 'g161');
  await expect(page.getByTestId('game-result-line')).toHaveText('Power lost at touchdown: the site is in shadow');
  const game = page.getByTestId('land-game');
  await expect(game.getByText('Now the Sun is')).toHaveCount(0);
  expect(await game.textContent()).not.toContain('Now the Sun is');
  await expect(game.getByText('Sunlight and Earth contact at your landing spot')).toBeVisible();
  // The failure mark sits at firstFailure.at_s = 0: on the left edge of the strip's plot area.
  const mark = page.getByTestId('game-failure-marker');
  await expect(mark).toHaveAttribute('data-at-s', '0');
  await expect(mark).toHaveAttribute('data-kind', 'power');
  const plot = (await game.locator('.hz-game-strip svg rect').first().boundingBox())!;
  const mb = (await mark.boundingBox())!;
  expect(Math.abs(mb.x - plot.x)).toBeLessThan(3);
  await expect(page.getByTestId('game-failure-text')).toHaveText('Red line on the strip: power lost at touchdown.');
  await expect(page.getByTestId('game-reason')).toHaveText(/^The Sun is hidden at touchdown for the first [\d.]+ (h|days \([\d.]+ h\))\. This scenario needs continuous sunlight\./);
  expect(errors).toEqual([]);
});

test('375 px, reduced motion: the failure mark sits on the strip plot at touchdown, measured at the real strip width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHz(page, `${BASE}&view=game&game_pt=g161`);
  await expect(page.getByTestId('game-result')).toBeVisible({ timeout: 90_000 });
  const game = page.getByTestId('land-game');
  const mark = page.getByTestId('game-failure-marker');
  await expect(mark).toBeVisible();
  await page.waitForTimeout(500);
  const plot = (await game.locator('.hz-game-strip svg rect').first().boundingBox())!;
  const mb = (await mark.boundingBox())!;
  expect(Math.abs(mb.x - plot.x)).toBeLessThan(3);
  // No sideways scroll on the phone.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('g117: the reason says the Sun never rises and no station is in view; the failure is marked', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHz(page, `${BASE}&view=game&game_pt=g117`);
  await expect(page.getByTestId('game-result')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('game-reason')).toHaveText(
    'The Sun never rises here during the stay. This scenario needs continuous sunlight. No ground station is in view at any time during the stay.');
  await expect(page.getByTestId('game-failure-marker')).toHaveCount(1);
});

test('the game map shows the Sun at touchdown and Earth on the outer ring, and its text says so', async ({ page }) => {
  await openHz(page, `${BASE}&view=game`);
  const map = page.getByTestId('game-map');
  await expect(map).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('game-sun-marker')).toContainText('Sun at touchdown');
  await expect(page.getByTestId('game-earth-marker')).toContainText('Earth');
  await expect(map).toHaveAttribute('aria-label', /Sun at touchdown at azimuth \d+°, Earth at azimuth \d+°, marked on the \d+ m ring\.$/);
  // Both markers and their labels are inside the map.
  const mb = (await map.boundingBox())!;
  for (const id of ['game-sun-marker', 'game-earth-marker']) {
    const b = (await page.getByTestId(id).boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(mb.x - 0.5);
    expect(b.x + b.width).toBeLessThanOrEqual(mb.x + mb.width + 0.5);
  }
});

test('a click while a try plays shows the busy state and skips to the result', async ({ page }) => {
  await openHz(page, `${BASE}&view=game`);
  const map = page.getByTestId('game-map');
  await expect(map).toBeVisible({ timeout: 90_000 });
  await map.scrollIntoViewIfNeeded();
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.5);
  await expect(map).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByTestId('game-status')).toContainText('Playing the stay…');
  await page.waitForTimeout(1000);
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.5);
  // The second click skips: the first try ends with its result, well before the 5 s replay is over
  // (a click that was ignored would only show the result after the full replay).
  await expect(page.getByTestId('game-result')).toBeVisible({ timeout: 3000 });
  await expect(map).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByTestId('game-try-list').locator('li')).toHaveCount(1);
  await expect(page.getByTestId('game-tries')).toContainText('Try 2 of 3.');
  // Enter during a try skips too.
  await page.getByTestId('game-reticle').focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await expect(map).toHaveAttribute('aria-busy', 'true');
  await page.waitForTimeout(1000);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('game-try-list').locator('li')).toHaveCount(2, { timeout: 90_000 });
  await expect(map).toHaveAttribute('aria-busy', 'false', { timeout: 3000 });
});

for (const size of [{ width: 1280, height: 720 }, { width: 375, height: 812 }]) {
  test(`site picker at ${size.width}: the four longitude labels lie inside the map, and the caption is plain`, async ({ page }) => {
    await page.setViewportSize(size);
    await openHz(page, BASE);
    await page.getByTestId('hz-site-button').click();
    const dlg = page.getByTestId('site-map-picker');
    await expect(dlg).toBeVisible();
    await expect(page.getByTestId('site-map-caption')).toHaveText(
      'Map of the south pole. Rings at 85°S and 80°S; 0° longitude, the side that faces Earth, is up.');
    const svg = (await dlg.locator('svg.hz-polar-map').boundingBox())!;
    const labels = dlg.getByTestId('site-map-lon-label');
    await expect(labels).toHaveText(['0°', '90°E', '180°', '90°W']);
    for (let k = 0; k < 4; k++) {
      const b = (await labels.nth(k).boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(svg.x);
      expect(b.y).toBeGreaterThanOrEqual(svg.y);
      expect(b.x + b.width).toBeLessThanOrEqual(svg.x + svg.width);
      expect(b.y + b.height).toBeLessThanOrEqual(svg.y + svg.height);
    }
  });
}

test('scenario cards: the rules note says the limits are our own starting assumptions', async ({ page }) => {
  await openHz(page, BASE);
  await page.getByTestId('hz-scenario-button').click();
  await expect(page.getByTestId('scenario-rules-source')).toHaveText(
    /^These limits are our own starting assumptions\. Only continuous sunlight for a 6\.5-day crew stay comes from NASA\./);
});

test('the Sun and Earth labels on the game map do not overlap on the default link', async ({ page }) => {
  await openHz(page, `${BASE}&view=game`);
  await expect(page.getByTestId('game-map')).toBeVisible({ timeout: 90_000 });
  const s = (await page.getByTestId('game-sun-marker').locator('text').boundingBox())!;
  const e = (await page.getByTestId('game-earth-marker').locator('text').boundingBox())!;
  const overlap = s.x < e.x + e.width && e.x < s.x + s.width && s.y < e.y + e.height && e.y < s.y + s.height;
  expect(overlap).toBe(false);
});

test('note 012: after the last try "No tries left." with Play again, which gives three new tries', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHz(page, `${BASE}&view=game`);
  const reticle = page.getByTestId('game-reticle');
  await expect(reticle).toBeVisible({ timeout: 90_000 });
  for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowDown']) {
    await reticle.focus();
    await page.keyboard.press(k);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('game-map')).toHaveAttribute('aria-busy', 'false', { timeout: 90_000 });
  }
  const line = page.getByTestId('game-tries');
  await expect(line).toHaveText(/^No tries left\.\s*Play again$/, { timeout: 90_000 });
  await page.getByTestId('game-play-again').click();
  await expect(line).toContainText('Try 1 of 3.');
  await expect(page.getByTestId('game-try-list').locator('li')).toHaveCount(0);
});

test('note 012: on a touch screen the game says "Tap the map"', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await openHz(page, `${BASE}&view=game`);
  await expect(page.getByTestId('game-tries')).toContainText('Tap the map', { timeout: 90_000 });
  await ctx.close();
});
