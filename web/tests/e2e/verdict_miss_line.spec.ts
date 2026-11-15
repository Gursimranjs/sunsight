// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Review note 008: the miss-test result sits on the verdict card, from the same job as the Miss test table.
import { expect, test } from '@playwright/test';
import { openApp, tab, watchErrors } from './helpers';

test('default link: the verdict card shows the same 250 m share as the Miss test table', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  const line = page.getByTestId('verdict-miss-line');
  await expect(line).toContainText('within 250 m', { timeout: 90_000 });
  await expect(line).toContainText('not miss-tolerant');
  const onCard = Number(((await page.getByTestId('verdict-miss-share').textContent()) ?? '').replace('%', ''));
  const row = page.getByTestId('miss-shares').locator('tr', { hasText: '250 m' });
  const inTable = Number(((await row.locator('td').nth(3).textContent()) ?? '').replace('%', ''));
  expect(Number.isFinite(inTable)).toBe(true);
  expect(onCard).toBe(Math.round(inTable));
  // The card's line sits inside the verdict card, above the controls.
  await expect(page.getByTestId('verdict').getByTestId('verdict-miss-line')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the line never shows a share from other dates; it offers to open the Miss test instead', async ({ page }) => {
  await openApp(page);
  await expect(page.getByTestId('verdict-miss-share')).toBeVisible({ timeout: 90_000 });
  await tab(page, 'Report card');
  await page.getByLabel('Start (UTC)').fill('2029-08-10T00:00');
  await page.getByLabel('Start (UTC)').dispatchEvent('change');
  const line = page.getByTestId('verdict-miss-line');
  await expect(line).toContainText('how much ground near the target still passes');
  await expect(page.getByTestId('verdict-miss-share')).toHaveCount(0);
  await line.getByRole('button', { name: 'Open the Miss test' }).click();
  await expect(page.getByRole('tab', { name: 'Miss test' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('verdict-miss-share')).toBeVisible({ timeout: 90_000 });
});

test('a site without a miss grid shows no miss line', async ({ page }) => {
  await openApp(page, 'site=apollo_11&start=2027-02-01T00:00Z');
  await expect(page.getByTestId('verdict-reason')).not.toBeEmpty();
  await expect(page.getByTestId('verdict-miss-line')).toHaveCount(0);
});
