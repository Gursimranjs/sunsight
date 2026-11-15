// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Fixes after the note 009/010 fix round: labels painted above the terrain, the moved-date note clears,
// and focus rings inside the dark cards of the light view area are the Sun colour.
import { expect, test } from '@playwright/test';

test('375 px: both disc labels are painted on top (not under the terrain)', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  await page.goto('./?ui=horizon');
  for (const kind of ['sun', 'earth']) {
    const label = page.getByTestId(`hz-${kind}-label`);
    await expect(label).toBeVisible({ timeout: 60_000 });
    const top = await label.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return hit === el || el.contains(hit);
    });
    expect(top, `${kind} label is the topmost element at its centre`).toBe(true);
  }
  await ctx.close();
});

test('the moved-date note clears once the start date changes', async ({ page }) => {
  await page.goto('./?site=im2_athena_target&start=2025-03-06T17%3A30Z&days=14&preset=robotic&ui=horizon');
  await expect(page.getByTestId('hz-moved')).toBeVisible({ timeout: 60_000 });
  await page.goto('./?site=im2_athena_target&start=2027-02-01T00%3A00Z&days=14&preset=robotic&ui=horizon');
  await expect(page.getByTestId('hz-call')).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(600);
  await expect(page.getByTestId('hz-moved')).toHaveCount(0);
});

test('focus ring inside the Horizon view tiles card is the Sun colour', async ({ page }) => {
  await page.goto('./?ui=horizon');
  const tiles = page.getByTestId('metrics');
  await expect(tiles).toBeVisible({ timeout: 60_000 });
  const focusable = tiles.locator('[tabindex="0"]').first();
  await focusable.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const outline = await focusable.evaluate((el) => getComputedStyle(el).outlineColor);
  expect(outline).toBe('rgb(255, 210, 122)');
});
