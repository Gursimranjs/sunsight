// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Review notes 004 and 007: the "Real missions" check shows reported events beside ours, with sources, no pass mark.
import { expect, test } from '@playwright/test';
import { openApp, tab, watchErrors } from './helpers';

test('validation page: real missions are shown beside SunSight with source links and no pass mark', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await tab(page, 'Validation');
  const card = page.getByTestId('check').filter({ hasText: 'Real missions' });
  await expect(card).toBeVisible();
  await expect(card.getByTestId('check-status')).toContainText('REPORTED');
  await expect(card).toContainText('None set');
  const table = card.locator('table.csv-head');
  await expect(table).toContainText('Blue Ghost');
  await expect(table).toContainText('Chandrayaan-3');
  await expect(table).toContainText('last of the disc hidden');
  await expect(table).toContainText('not a fair test');
  expect(await table.locator('a[href^="https://"]').count()).toBeGreaterThan(5);
  await expect(page.getByTestId('validation-summary')).toContainText('compared with reported mission events');
  expect(errors).toEqual([]);
});
