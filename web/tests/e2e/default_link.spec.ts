// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Review note 003 B: the bare link opens on a scenario where the miss test teaches something.
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
