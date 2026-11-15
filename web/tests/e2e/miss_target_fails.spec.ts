// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Note 003 part C: when the target itself fails, the miss test says so in one line instead of three
// 0% rows, and "Jump to this site's best date" moves the start to a date where the target passes.
import { expect, test } from '@playwright/test';
import { openApp, watchErrors } from './helpers';

const FAIL_LINE = 'The target itself fails on this date, so every miss fails too.';
/** A verdict badge reading GO or MARGINAL (its symbol first), never NO-GO. */
const PASSING = /^[^A-Z]*(GO|MARGINAL)$/;

test('a failing target shows one line and a jump button; the jump finds a date where the target passes', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'site=im2_athena_target&start=2027-01-01T00:00Z&view=miss');
  await expect(page).toHaveURL(/preset=robotic/);
  const fails = page.getByTestId('miss-target-fails');
  await expect(fails).toBeVisible({ timeout: 90_000 });
  await expect(fails.locator('p').first()).toHaveText(FAIL_LINE);
  // The one line replaces the share table (no three 0% rows).
  await expect(page.getByTestId('miss-shares')).toHaveCount(0);
  const button = page.getByRole('button', { name: "Jump to this site's best date" });
  await expect(button).toBeVisible();

  const start = page.getByLabel('Start (UTC)');
  const before = await start.inputValue();
  expect(before).toBe('2027-01-01T00:00');
  await button.click();
  await expect(start).not.toHaveValue(before, { timeout: 90_000 });
  const after = await start.inputValue();
  // A daily start at 00:00 UTC inside the 2027-2030 table.
  expect(after).toMatch(/^20(27|28|29|30)-\d\d-\d\dT00:00$/);
  await expect(page).toHaveURL(new RegExp(`start=${after.replace(':', '%3A')}Z`));

  // The miss test reruns for the new date: the target passes, so no fail line and the share rows are back.
  const shares = page.getByTestId('miss-shares');
  await expect(shares).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('miss-target-fails')).toHaveCount(0);
  await expect(page.getByTestId('miss-target-fails-some')).toHaveCount(0);
  await expect(shares.locator('tbody tr')).toHaveCount(3);
  await expect(page.getByTestId('miss-best-note')).toContainText(after.slice(0, 10));
  // The site's report card is scored at the same grid point (the target): it passes too.
  await expect(page.getByTestId('verdict-word')).toHaveText(PASSING);
  // On the pin (it starts on the target) the verdict is go or marginal.
  await expect(page.getByTestId('miss-pin-verdict').locator('.vbadge')).toHaveText(PASSING);
  expect(errors).toEqual([]);
});

test('the jump also works for a site that uses another target\'s grid', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'site=im2_athena_actual&start=2027-01-01T00:00Z&view=miss');
  await expect(page.getByTestId('miss-borrowed-grid')).toBeVisible();
  // Athena's resting point (its own point in the target's grid) fails on this date, like the target.
  await expect(page.getByTestId('miss-target-fails').or(page.getByTestId('miss-target-fails-some'))).toBeVisible({ timeout: 90_000 });
  const button = page.getByRole('button', { name: "Jump to this site's best date" });
  await expect(button).toBeVisible();
  const start = page.getByLabel('Start (UTC)');
  const before = await start.inputValue();
  await button.click();
  await expect(start).not.toHaveValue(before, { timeout: 90_000 });
  await expect(page.getByTestId('miss-best-note')).toBeVisible();
  // The report card uses the site's own grid point, which is what the search scored.
  await expect(page.getByTestId('verdict-word')).toHaveText(PASSING);
  // The pin starts on the site's own point.
  await expect(page.getByTestId('miss-pin-verdict').locator('.vbadge')).toHaveText(PASSING, { timeout: 90_000 });
  expect(errors).toEqual([]);
});
