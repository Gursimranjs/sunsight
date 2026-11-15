// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Note 003 part D: the 3D view at a dark moment is not black, says why, opens at the first lit
// moment when the stay has one, and Play sweeps the time.
import { expect, test, type Page } from '@playwright/test';
import { openApp, watchErrors } from './helpers';

const FILL_LABEL = 'Sun below the horizon: terrain shown with a faint fill light';
const H = 3600;
/** The 3D slider's step: one engine sample. */
const STEP_S = 600;
/** The robotic preset's lit threshold (half the disc), in percent. */
const LIT_THRESHOLD_PCT = 50;

/** Mean of R, G and B (0-255) over the 3D canvas, from a screenshot of it. */
async function canvasMean(page: Page): Promise<number> {
  const png = await page.getByTestId('scene3d-canvas').screenshot();
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d')!;
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2];
    return sum / ((d.length / 4) * 3);
  }, png.toString('base64'));
}

async function sliderValue(page: Page): Promise<number> {
  return Number(await page.getByTestId('time3d').inputValue());
}

/** The horizon engine's visible share of the Sun's disc at the selected moment, in percent. */
async function sunSharePct(page: Page): Promise<number> {
  const text = (await page.getByTestId('engine-numbers').textContent()) ?? '';
  const m = /([\d.]+)% of the Sun’s disc visible/.exec(text);
  if (!m) throw new Error(`no Sun share in: ${text}`);
  return Number(m[1]);
}

test('a dark stay shows the terrain with a fill light and says so', async ({ page }) => {
  const errors = watchErrors(page);
  // Shackleton crater floor, June 2027: the engine sees none of the Sun for the whole stay and the
  // Sun is under the level horizon, so there is no lit moment to jump to.
  await openApp(page, 'site=shackleton_crater&start=2027-06-01T00:00Z&view=3d&t_h=24');
  await expect(page.getByTestId('fps')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('fill-light-label')).toHaveText(FILL_LABEL);
  await expect(page.getByTestId('engine-numbers')).toContainText('0% of the Sun’s disc visible');
  // The canvas's screen-reader text says why the terrain is visible.
  await expect(page.getByTestId('scene3d-canvas')).toHaveAttribute('aria-label', /the Sun is below the horizon, so a faint fill light shows the terrain/);
  // No jump: the stay has no lit moment.
  await expect(page).toHaveURL(/t_h=24(&|$)/);
  await page.waitForTimeout(500);
  // Baseline, measured 2026-11-15 on this scene (Chromium, Playwright's Desktop Chrome viewport) by
  // building with the fill light forced off in Scene3D.tsx (a temporary local edit, not shipped):
  // mean 12.85 out of 255, from the 0.06 ambient light alone. With the fill light on: 49.6. The bar
  // sits at more than twice the baseline, so the ambient light alone cannot pass it.
  expect(await canvasMean(page)).toBeGreaterThan(30);
  expect(errors.filter((e) => !/GPU stall|GL Driver/.test(e))).toEqual([]);
});

test('opening on a dark moment jumps once to the first lit moment of the stay', async ({ page }) => {
  // Athena target, robotic stay from 2027-01-01: dark at the start, first lit sample later.
  await openApp(page, 'site=im2_athena_target&start=2027-01-01T00:00Z&view=3d');
  await expect(page.getByTestId('fps')).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => sliderValue(page)).toBeGreaterThan(0);
  const jumped_s = await sliderValue(page);
  // At the lit moment the Sun is up: no fill light, no label, and at least half the disc (the robotic
  // preset's lit threshold) is visible.
  await expect(page.getByTestId('engine-numbers')).not.toContainText(' 0% of the Sun’s disc visible');
  await expect(page.getByTestId('fill-light-label')).toHaveCount(0);
  expect(await sunSharePct(page)).toBeGreaterThanOrEqual(LIT_THRESHOLD_PCT);
  // It is the first lit sample: one slider step (600 s) earlier the share is below the threshold.
  await page.getByTestId('time3d').fill(String(jumped_s - STEP_S));
  await expect.poll(() => sliderValue(page)).toBe(jumped_s - STEP_S);
  await expect.poll(() => sunSharePct(page)).toBeLessThan(LIT_THRESHOLD_PCT);
  // Moving the time back to the dark start does not jump again; the label returns.
  await page.getByTestId('time3d').fill('0');
  await expect(page.getByTestId('fill-light-label')).toHaveText(FILL_LABEL);
  await page.waitForTimeout(1000);
  expect(await sliderValue(page)).toBe(0);
  expect(jumped_s).toBeGreaterThan(H);
});

test('at a lit moment there is no fill-light label', async ({ page }) => {
  await openApp(page, 'site=shackleton_ridge_rim&start=2027-10-13T00:00Z&view=3d&t_h=30');
  await expect(page.getByTestId('fps')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('engine-numbers')).toContainText('100% of the Sun’s disc visible');
  await expect(page.getByTestId('fill-light-label')).toHaveCount(0);
  await expect(page.getByTestId('scene3d-canvas')).not.toHaveAttribute('aria-label', /fill light/);
  // The live region stays in the page, empty, so the label is announced when it appears.
  await expect(page.getByTestId('hero3d').getByRole('status')).toHaveText('');
  await expect(page).toHaveURL(/t_h=30(&|$)/);
});

test('Play sweeps the time and Pause stops it', async ({ page }) => {
  await openApp(page, 'site=shackleton_ridge_rim&start=2027-10-13T00:00Z&view=3d');
  await expect(page.getByTestId('fps')).toBeVisible({ timeout: 30_000 });
  const before = await sliderValue(page);
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.waitForTimeout(2000);
  const during = await sliderValue(page);
  expect(during).toBeGreaterThan(before);
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  const paused = await sliderValue(page);
  await page.waitForTimeout(1000);
  expect(await sliderValue(page)).toBe(paused);
  // Leaving the view stops the sweep.
  await page.getByRole('button', { name: 'Play' }).click();
  await page.getByRole('tab', { name: 'Report card' }).click();
  const left = page.url();
  await page.waitForTimeout(1000);
  expect(page.url()).toBe(left);
});

test('a shared link at a dark moment reopens at that moment, without a jump', async ({ page }) => {
  // Same dark start as the jump test, but the link names a time: the view keeps it.
  await openApp(page, 'site=im2_athena_target&start=2027-01-01T00:00Z&view=3d&t_h=0.5');
  await expect(page.getByTestId('fps')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('fill-light-label')).toHaveText(FILL_LABEL);
  // Give the engine's answer time to arrive; the time must not move.
  await expect(page.getByTestId('verdict-word')).toHaveText(/GO|MARGINAL|NO-GO/, { timeout: 60_000 });
  await page.waitForTimeout(1000);
  expect(await sliderValue(page)).toBe(0.5 * H);
  await expect(page).toHaveURL(/t_h=0\.5(&|$)/);
});

test('without a 3D view the time does not jump, and a terrain site picked afterwards still jumps', async ({ page }) => {
  // A custom point at the Athena target's coordinates: dark at the start of this stay, but it has no
  // terrain cut, so the 3D view is not drawn and the shared time must stay where it is.
  await openApp(page, 'lat=-84.78&lon=29.13&start=2027-01-01T00:00Z&view=3d');
  await expect(page.getByTestId('no-terrain')).toBeVisible();
  await expect(page.getByTestId('verdict-word')).toHaveText(/GO|MARGINAL|NO-GO/, { timeout: 60_000 });
  await page.waitForTimeout(1000);
  await expect(page).not.toHaveURL(/t_h=/);
  // Picking a site with a terrain cut from the card opens the 3D view, which jumps to the first lit moment.
  await page.getByTestId('no-terrain').getByRole('button', { name: 'IM-2 Athena target (Mons Mouton)' }).click();
  await expect(page.getByTestId('fps')).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(/t_h=/, { timeout: 30_000 });
  await expect.poll(() => sliderValue(page)).toBeGreaterThan(0);
});
