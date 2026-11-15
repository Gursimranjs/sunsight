// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Review note 003 B: the bare link opens on a scenario where the miss test teaches something (checked in the
// classic interface at ?ui=classic, and on the bare link, which opens the horizon interface since note 009).
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { openApp, watchErrors } from './helpers';

test('default link: the target passes and the 250 m share is strictly between 0% and 90%', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await expect(page).toHaveURL(/site=shackleton_ridge_rim/);
  await expect(page.getByTestId('verdict-word')).toHaveText(/GO|MARGINAL/, { timeout: 60_000 });
  await expect(page.getByTestId('verdict-word')).not.toHaveText(/NO-GO/);
  const headline = page.getByTestId('miss-headline');
  await expect(headline).toContainText('Land within 250 m', { timeout: 90_000 });
  const pct = Number(/(\d+(?:\.\d+)?)% of the ground/.exec((await headline.textContent()) ?? '')?.[1]);
  expect(pct).toBeGreaterThan(0);
  expect(pct).toBeLessThan(90);
  // The browser engine agrees with the Python reference that chose this scenario.
  const rec = JSON.parse(readFileSync(new URL('../../../docs/submission/default_scenario.json', import.meta.url), 'utf8'));
  expect(Math.abs(pct - 100 * rec.chosen.exact_share_250m)).toBeLessThan(0.5);
  expect(errors).toEqual([]);
});

test('the bare link opens the horizon interface on the default scenario, with the same 250 m share', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('./');
  await expect(page.getByTestId('hz-app')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Report card' })).toHaveCount(0);
  await expect(page).toHaveURL(/site=shackleton_ridge_rim/);
  await expect(page).toHaveURL(/start=2029-07-24T00%3A00Z/);
  await expect(page).toHaveURL(/preset=crew/);
  await expect(page.getByTestId('verdict-word')).toHaveText(/GO|MARGINAL/, { timeout: 60_000 });
  await expect(page.getByTestId('verdict-word')).not.toHaveText(/NO-GO/);
  await expect(page.getByTestId('verdict-miss-line')).toContainText('Miss by up to 250 m', { timeout: 90_000 });
  const pct = Number(/(\d+(?:\.\d+)?)%/.exec((await page.getByTestId('verdict-miss-share').textContent()) ?? '')?.[1]);
  expect(pct).toBeGreaterThan(0);
  expect(pct).toBeLessThan(90);
  const rec = JSON.parse(readFileSync(new URL('../../../docs/submission/default_scenario.json', import.meta.url), 'utf8'));
  // The miss line rounds the share to a whole percent at most.
  expect(Math.abs(pct - 100 * rec.chosen.exact_share_250m)).toBeLessThanOrEqual(0.5 + 1e-9);
  expect(errors).toEqual([]);
});
