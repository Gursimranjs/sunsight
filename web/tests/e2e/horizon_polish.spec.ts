// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Note 009 M2/M3 polish on ?ui=horizon: the load motion and its reduced-motion path, Play as a stepped
// slider, page keys that leave other controls alone, strip labels, the quiet clock and focus rings.
import { expect, test, type Page } from '@playwright/test';
import { watchErrors } from './helpers';

const LINK = 'site=shackleton_ridge_rim&start=2029-07-24T00:00Z&preset=crew';
const SHOTS = process.env.SUNSIGHT_SHOTS_DIR;

async function openHz(page: Page, query = LINK) {
  await page.goto(`./?${query}&ui=horizon`);
  await expect(page.getByTestId('hz-app')).toBeVisible();
  await expect(page.getByTestId('verdict-word')).toBeVisible({ timeout: 60_000 });
}

/** The Sun marker's drawn x in two consecutive animation frames. */
const sunTwoFrames = (page: Page) => page.evaluate(() => new Promise<[string | null, string | null]>((done) => {
  const read = () => document.querySelector('[data-testid=hz-sun]')?.getAttribute('data-cx') ?? null;
  const a = read();
  requestAnimationFrame(() => requestAnimationFrame(() => done([a, read()])));
}));

test('reduced motion: nothing animates on load, the Sun is drawn at its place at once, and Play still steps', async ({ page }) => {
  const errors = watchErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHz(page);
  await expect(page.getByTestId('hz-sun')).toHaveAttribute('data-settled', 'true');
  await expect(page.getByTestId('hz-hero')).toHaveAttribute('data-run', 'settled');
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  const [a, b] = await sunTwoFrames(page);
  expect(a).not.toBeNull();
  expect(b).toBe(a);
  // Nothing moves on its own: still the same a second later.
  await page.waitForTimeout(1000);
  expect(await page.getByTestId('hz-sun').getAttribute('data-cx')).toBe(a);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);

  // Play: a stepped slider. The time jumps in coarse steps on the 10-minute grid, Sun and clock follow.
  const slider = page.getByLabel('Time in the stay');
  const clock0 = await page.getByTestId('hz-clock').textContent();
  await page.getByTestId('hz-play').click();
  await expect.poll(async () => Number(await slider.inputValue()), { timeout: 10_000 }).toBeGreaterThan(0);
  const t1_s = Number(await slider.inputValue());
  expect(t1_s % 600).toBe(0);
  await expect.poll(async () => page.getByTestId('hz-sun').getAttribute('data-cx'), { timeout: 10_000 }).not.toBe(a);
  await expect.poll(async () => page.getByTestId('hz-clock').textContent()).not.toBe(clock0);
  await page.getByTestId('hz-play').click();
  await expect(page.getByTestId('hz-play')).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  expect(errors).toEqual([]);
});

test('load motion: the Sun runs in along its path and settles; the call fades in with it; a new date runs it again', async ({ page }) => {
  await openHz(page);
  const sun = page.getByTestId('hz-sun');
  await expect(sun).toHaveAttribute('data-settled', 'true', { timeout: 5_000 });
  const settled = await sun.getAttribute('data-cx');
  expect(await page.getByTestId('verdict-word').evaluate((el) => getComputedStyle(el).animationName)).toBe('hz-call-in');
  // Time moving inside the stay does not rerun it.
  await page.locator('body').click({ position: { x: 2, y: 2 } });
  await page.keyboard.press('ArrowRight');
  await expect(sun).toHaveAttribute('data-settled', 'true');
  // A new date does: the run starts, then ends on the new position.
  await page.getByTestId('hz-date-button').click();
  const input = page.getByLabel('Start (UTC)');
  if (await input.count()) {
    await input.fill('2029-08-03T00:00');
    await input.dispatchEvent('change');
    await expect(page.getByTestId('hz-hero')).toHaveAttribute('data-run', 'running', { timeout: 60_000 });
    await expect(sun).toHaveAttribute('data-settled', 'true', { timeout: 5_000 });
    expect(await sun.getAttribute('data-cx')).not.toBe(settled);
  }
});

test('Play moves the Sun and both clocks; the strips are labelled; the clock is not a live region', async ({ page }) => {
  await openHz(page);
  await expect(page.getByTestId('hz-sun')).toHaveAttribute('data-settled', 'true', { timeout: 5_000 });
  const bar = page.locator('.hz-playbar');
  await expect(bar.getByText('Lit', { exact: true })).toBeVisible();
  await expect(bar.getByText('Contact', { exact: true })).toBeVisible();
  const clock = page.getByTestId('hz-clock');
  expect(await clock.evaluate((el) => el.tagName)).toBe('P');
  await expect(clock).toHaveAttribute('aria-live', 'off');
  const x0 = await page.getByTestId('hz-sun').getAttribute('data-cx');
  const c0 = await clock.textContent();
  const cd0 = await page.getByTestId('hz-contact').textContent();
  await page.getByTestId('hz-play').click();
  await expect.poll(async () => page.getByTestId('hz-sun').getAttribute('data-cx'), { timeout: 10_000 }).not.toBe(x0);
  await expect.poll(async () => clock.textContent(), { timeout: 10_000 }).not.toBe(c0);
  await expect.poll(async () => page.getByTestId('hz-contact').textContent(), { timeout: 10_000 }).not.toBe(cd0);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/horizon_polish_play.png` }).catch(() => undefined);
});

test('arrow keys on the Miss map pin move the pin, not the playhead', async ({ page }) => {
  await openHz(page, `${LINK}&view=miss`);
  const pin = page.getByTestId('miss-pin');
  await expect(pin).toBeVisible({ timeout: 90_000 });
  const slider = page.getByLabel('Time in the stay');
  const t0 = await slider.inputValue();
  const v0 = await pin.getAttribute('aria-valuenow');
  await pin.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect.poll(async () => pin.getAttribute('aria-valuenow')).not.toBe(v0);
  expect(await slider.inputValue()).toBe(t0);
  await expect(page.getByTestId('hz-play')).toHaveAttribute('aria-pressed', 'false');
});

test('focus rings: ink on the light ground, Sun on the sky', async ({ page }) => {
  await openHz(page);
  await page.getByTestId('hz-play').focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const ground = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const cs = getComputedStyle(el);
    return { id: el.getAttribute('data-testid'), color: cs.outlineColor, style: cs.outlineStyle };
  });
  expect(ground.id).toBe('hz-play');
  expect(ground.style).toBe('solid');
  expect(ground.color).toBe('rgb(23, 24, 26)');
  await page.getByTestId('hz-site-button').focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const sky = await page.evaluate(() => getComputedStyle(document.activeElement as HTMLElement).outlineColor);
  expect(sky).toBe('rgb(255, 210, 122)');
});
