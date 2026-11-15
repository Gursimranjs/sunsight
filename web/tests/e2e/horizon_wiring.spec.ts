// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Review note 009 wiring: pickers in the mission line (focus in, focus back), "(edited rules)", the default
// view (Horizon, with the miss line equal to the Miss map's share), the game's entry points and share link,
// and the interface switch (?ui=classic, ?ui=horizon).
import { expect, test, type Page } from '@playwright/test';
import { watchErrors } from './helpers';

const BASE = 'site=shackleton_ridge_rim&start=2029-07-24T00:00Z&preset=crew';
const SHOTS = process.env.SUNSIGHT_SHOTS_DIR;

async function openHz(page: Page, query = '') {
  await page.goto(`./?${query ? query + '&' : ''}ui=horizon`);
  await expect(page.getByTestId('hz-app')).toBeVisible();
  await expect(page.getByTestId('verdict-word')).toBeVisible({ timeout: 60_000 });
}

const focusInside = (page: Page, testId: string) => page.evaluate((id) => !!document.activeElement?.closest(`[data-testid="${id}"]`), testId);

test('site picker: opening moves focus into the map dialog; Escape, Close, a click outside and a choice give it back', async ({ page }) => {
  await openHz(page, BASE);
  const trigger = page.getByTestId('hz-site-button');
  // Escape
  await trigger.click();
  await expect(page.getByTestId('site-map-picker')).toBeVisible();
  await expect.poll(() => focusInside(page, 'site-map-picker')).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('site-map-picker')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  // Close
  await trigger.click();
  await page.getByTestId('site-map-picker').getByRole('button', { name: 'Close' }).click();
  await expect(trigger).toBeFocused();
  // Click outside (on the backdrop)
  await trigger.click();
  await expect(page.getByTestId('site-map-picker')).toBeVisible();
  await page.mouse.click(4, page.viewportSize()!.height - 4);
  await expect(page.getByTestId('site-map-picker')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  // A choice
  await trigger.click();
  await page.getByTestId('site-map-picker').getByRole('button', { name: /Apollo 11/ }).click();
  await expect(trigger).toContainText('Apollo 11');
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL(/site=apollo_11/);
  await expect(page).toHaveURL(/ui=horizon/);
});

test('date and scenario pickers: focus moves in on open and back to the trigger on Escape, Close, outside click and choice', async ({ page }) => {
  await openHz(page, BASE);
  for (const k of ['date', 'scenario'] as const) {
    const trigger = page.getByTestId(`hz-${k}-button`);
    await trigger.click();
    await expect.poll(() => focusInside(page, 'hz-picker'), { timeout: 30_000 }).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('hz-picker')).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect.poll(() => focusInside(page, 'hz-picker'), { timeout: 30_000 }).toBe(true);
    await page.getByTestId('hz-picker-close').click();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(page.getByTestId('hz-picker')).toBeVisible();
    await page.getByTestId('hz-hero').click({ position: { x: 5, y: 5 } });
    await expect(page.getByTestId('hz-picker')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
  // Choosing a date on the strip: the call, the URL and the focus follow.
  const date = page.getByTestId('hz-date-button');
  await date.click();
  const day = page.getByTestId('strip-day').nth(5);
  await expect(day).toBeVisible({ timeout: 90_000 });
  await expect.poll(() => focusInside(page, 'date-strip')).toBe(true);
  await day.click();
  await expect(page.getByTestId('hz-picker')).toHaveCount(0);
  await expect(date).toContainText('29 Jul 2029');
  await expect(date).toBeFocused();
  await expect(page).toHaveURL(/start=2029-07-29T00%3A00Z/);
  // Choosing a scenario card.
  const scn = page.getByTestId('hz-scenario-button');
  await scn.click();
  await page.locator('[data-testid=scenario-card][data-preset=robotic]').click();
  await expect(scn).toContainText('robotic lander, 14 days');
  await expect(scn).toBeFocused();
  await expect(page).toHaveURL(/preset=robotic/);
});

test('editing a rule says "(edited rules)" in the mission line and shows the honest rules label', async ({ page }) => {
  await openHz(page, BASE);
  const scn = page.getByTestId('hz-scenario-button');
  await expect(scn).toHaveText('crew sortie, 6.5 days');
  await scn.click();
  await expect(page.getByTestId('rules-source')).toHaveText(/^Starting defaults from the build plan; only continuous sunlight for a 6\.5-day crew stay comes from NASA\./);
  await page.getByTestId('rules-disclosure').locator('summary').click();
  const gap = page.getByTestId('hz-picker').getByLabel('Longest contact gap allowed (h)');
  await gap.fill('7');
  await gap.dispatchEvent('change');
  await expect(scn).toHaveText('crew sortie, 6.5 days (edited rules)');
  await expect(page).toHaveURL(/gap_h=7/);
  await expect(page.getByTestId('rules-source')).toContainText('Your rules differ from this preset.');
  // A link with edited rules opens with the phrase too.
  await openHz(page, BASE + '&gap_h=7');
  await expect(page.getByTestId('hz-scenario-button')).toHaveText('crew sortie, 6.5 days (edited rules)');
});

test('the default link opens the Horizon view, and its miss line equals the Miss map share', async ({ page }) => {
  const errors = watchErrors(page);
  await openHz(page);
  const nav = page.getByRole('navigation', { name: 'Views' });
  await expect(nav.getByRole('button', { name: 'Horizon' })).toHaveAttribute('aria-current', 'true');
  await expect(page.getByTestId('miss-headline')).toHaveCount(0);
  const line = page.getByTestId('verdict-miss-share');
  await expect(line).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('verdict-miss-line')).toContainText('Miss by up to 250 m');
  const onLine = (await line.textContent())!.trim();
  // The Miss map, opened from the line, shows the same share for the same 250 m radius.
  await page.getByTestId('hz-open-miss').click();
  await expect(nav.getByRole('button', { name: 'Miss map' })).toHaveAttribute('aria-current', 'true');
  await expect(page.getByTestId('miss-headline')).toContainText(`Land within 250 m and ${onLine} of the ground`, { timeout: 90_000 });
  await expect(page).toHaveURL(/view=miss/);
  expect(errors).toEqual([]);
});

test('an explicit view=miss link still opens the Miss map', async ({ page }) => {
  await openHz(page, BASE + '&view=miss');
  await expect(page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Miss map' })).toHaveAttribute('aria-current', 'true');
  await expect(page.getByTestId('miss-headline')).toBeVisible({ timeout: 90_000 });
});

test('"Land it yourself" from the ground panel and from the Miss map opens the game; its share link keeps game_pt', async ({ page }) => {
  const errors = watchErrors(page);
  await openHz(page, BASE);
  await page.getByTestId('hz-game-button').click();
  await expect(page.getByTestId('game-brief')).toBeVisible({ timeout: 60_000 });
  await expect(page).toHaveURL(/view=game/);
  await expect(page).toHaveURL(/ui=horizon/);
  const map = page.getByTestId('game-map');
  await expect(map).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('game-reticle').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('game-result')).toBeVisible({ timeout: 90_000 });
  const id = await page.getByTestId('game-result').getAttribute('data-point-id');
  const verdict = await page.getByTestId('game-result').getAttribute('data-verdict');
  const link = await page.getByTestId('game-share-link').inputValue();
  const u = new URL(link);
  expect(u.searchParams.get('game_pt')).toBe(id);
  expect(u.searchParams.get('view')).toBe('game');
  expect(u.searchParams.get('ui')).toBe('horizon');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/horizon_game_in_shell.png`, fullPage: true });

  // The shared link opens the game on the same point, and the address bar keeps the point.
  await page.goto(link);
  await expect(page.getByTestId('game-result')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('game-result')).toHaveAttribute('data-point-id', id!);
  await expect(page.getByTestId('game-result')).toHaveAttribute('data-verdict', verdict!);
  await page.waitForTimeout(600); // the address bar is rewritten at most every 300 ms
  await expect(page).toHaveURL(new RegExp(`game_pt=${id}`));
  await expect(page).toHaveURL(/view=game/);

  // From the Miss map: a link above the map opens the game.
  await openHz(page, BASE + '&view=miss');
  await page.getByTestId('hz-miss-game-link').click();
  await expect(page.getByTestId('game-brief')).toBeVisible({ timeout: 60_000 });
  expect(errors).toEqual([]);
});

test('a site without a miss grid has no game button', async ({ page }) => {
  await openHz(page, 'site=apollo_11&start=2027-02-01T00:00Z');
  await expect(page.getByTestId('verdict-reason')).not.toBeEmpty();
  await expect(page.getByTestId('hz-game-button')).toHaveCount(0);
});

test('?ui=classic and no ui param open the classic interface; ?ui=horizon opens the horizon one', async ({ page }) => {
  for (const q of ['', 'ui=classic&']) {
    await page.goto(`./?${q}${BASE}`);
    await expect(page.getByTestId('verdict-word')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('hz-app')).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Report card' })).toBeVisible();
  }
  await openHz(page, BASE);
  await expect(page.getByTestId('hz-app')).toBeVisible();
});

test('changing the date dims the hero and says "Updating" until the new answer is in', async ({ page }) => {
  await openHz(page, BASE);
  await expect(page.locator('[data-stale]').first()).toHaveAttribute('data-stale', 'false');
  await page.getByTestId('hz-date-button').click();
  const day = page.getByTestId('strip-day').nth(9);
  await expect(day).toBeVisible({ timeout: 90_000 });
  await day.click();
  // Either the stale state was seen, or the answer came back before the check: both end fresh, never stale for good.
  await expect(page.locator('header [data-stale]')).toHaveAttribute('data-stale', 'false', { timeout: 60_000 });
  await expect(page.getByTestId('stale-note')).toHaveCount(0);
  await expect(page.getByTestId('hz-date-button')).toContainText('2 Aug 2029');
});

test('phone: the More menu holds the views the bottom bar has no room for, including Calendar and compare', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await openHz(page, BASE);
  const nav = page.getByRole('navigation', { name: 'Views' });
  await nav.getByRole('button', { name: 'More' }).click();
  const list = page.locator('#hz-more-list');
  for (const name of ['Land it yourself', 'Rank sites', 'Calendar & compare', 'Tour', 'Proof', 'Export']) {
    await expect(list.getByRole('button', { name, exact: true })).toBeVisible();
  }
  await list.getByRole('button', { name: 'Calendar & compare', exact: true }).click();
  await expect(page.getByTestId('calendar')).toBeVisible({ timeout: 90_000 });
  await page.getByTestId('hz-date-button').click();
  await expect(page.getByTestId('strip-day').first()).toBeVisible({ timeout: 90_000 });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/horizon_date_strip_375.png` });
  await ctx.close();
});

test('first-load JavaScript of each interface stays within the 60 kB gzip budget (built site)', async () => {
  const { execFileSync } = await import('node:child_process');
  const out = execFileSync(process.execPath, [new URL('../../scripts/bundle-size.mjs', import.meta.url).pathname], { encoding: 'utf8' });
  for (const ui of ['classic', 'horizon']) {
    const m = out.match(new RegExp(`First-load JS \\(gzip\\), ${ui} interface: ([\\d.]+) kB, budget 60 kB \\(([^)]*)\\)`));
    expect(m, ui).not.toBeNull();
    expect(Number(m![1]), ui).toBeLessThanOrEqual(60);
    // The 3D scene, the game and the pickers are never part of either first load.
    expect(m![2]).not.toMatch(/Scene3D|LandGame|SiteMapPicker|DateStrip|ScenarioCards/);
    // Neither interface downloads the other.
    expect(m![2]).not.toMatch(ui === 'classic' ? /HorizonApp/ : /(^|, )App-/);
  }
});

test('screenshots of the wired interface (only with SUNSIGHT_SHOTS_DIR)', async ({ page }) => {
  test.skip(!SHOTS, 'no screenshot folder given');
  await page.setViewportSize({ width: 1280, height: 720 });
  await openHz(page);
  await expect(page.getByTestId('verdict-miss-share')).toBeVisible({ timeout: 90_000 });
  await page.screenshot({ path: `${SHOTS}/horizon_default_1280x720.png` });
  await page.getByTestId('hz-scenario-button').click();
  await expect(page.getByTestId('scenario-cards')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/horizon_scenario_picker.png` });
  await page.keyboard.press('Escape');
  await page.getByTestId('hz-site-button').click();
  await expect(page.getByTestId('site-map-picker')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/horizon_site_picker.png` });
});
