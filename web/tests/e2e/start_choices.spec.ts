// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Note 003 A: the start strip's three entry choices and the "which sites work?" ranking.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { openApp, shippedSites, watchErrors } from './helpers';

// Crew sortie from 2027-10-13: the shipped data gives both go and no-go sites here, so the order is exercised.
const DATE = 'start=2027-10-13T00:00Z&preset=crew';
const ORDER: Record<string, number> = { go: 0, marginal: 1, 'no-go': 2 };

test('the start strip shows three choices and the honest miss contrast', async ({ page }) => {
  await openApp(page);
  const strip = page.getByRole('navigation', { name: 'Start here' });
  await expect(strip.getByRole('button', { name: 'I have a date: which sites work?' })).toBeVisible();
  await expect(strip.getByRole('button', { name: 'I have a site: which dates work?' })).toBeVisible();
  await expect(strip.getByRole('button', { name: 'Take the Athena tour' })).toBeVisible();
  await expect(page.getByTestId('start-lead')).toContainText('matter a lot on a ridge and hardly at all on a plain');
});

test('"I have a date" ranks every site with terrain masks within 2 seconds, sorted by verdict', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, DATE);
  const rows = page.getByTestId('rank-row');
  const t0 = Date.now();
  await page.getByRole('button', { name: 'I have a date: which sites work?' }).click();
  await expect(page.getByTestId('rank-list')).toBeVisible({ timeout: 10_000 });
  const elapsed_ms = Date.now() - t0;
  console.log(`ranking shown ${elapsed_ms} ms after the click`);
  expect(elapsed_ms).toBeLessThan(2000);

  await expect(page.getByRole('tab', { name: 'Which sites work?' })).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/view=rank/);
  const n = await rows.count();
  expect(n).toBeGreaterThanOrEqual(5);
  const verdicts: string[] = [];
  for (let i = 0; i < n; i++) {
    const r = rows.nth(i);
    await expect(r.getByTestId('rank-n')).toHaveText(String(i + 1));
    await expect(r.locator('.vbadge')).toHaveText(/GO|MARGINAL|NO-GO/);
    await expect(r.getByTestId('rank-reason')).not.toBeEmpty();
    verdicts.push((await r.getAttribute('data-verdict')) ?? '');
  }
  // No no-go above a marginal or go, and go above marginal.
  for (let i = 1; i < verdicts.length; i++) expect(ORDER[verdicts[i - 1]]).toBeLessThanOrEqual(ORDER[verdicts[i]]);
  // Every ranked site is a curated site that ships terrain (a region or a miss grid).
  type Raw = { id: string; region_id?: string | null; miss_grid_id?: string | null; miss_target_id: string | null };
  const terrainIds = new Set((shippedSites() as unknown as Raw[]).filter((s) => s.region_id || s.miss_grid_id || s.miss_target_id).map((s) => s.id));
  for (let i = 0; i < n; i++) expect(terrainIds.has((await rows.nth(i).getAttribute('data-site')) ?? '')).toBe(true);
  expect(errors).toEqual([]);
});

test('a ranked row opens the report card for that site', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, `${DATE}&view=rank`);
  await expect(page.getByTestId('rank-list')).toBeVisible({ timeout: 30_000 });
  const row = page.getByTestId('rank-row').nth(1);
  const id = (await row.getAttribute('data-site'))!;
  const name = (await row.getByTestId('rank-name').textContent())!;
  const v = (await row.getAttribute('data-verdict'))!;
  await row.getByRole('button', { name: /report card/i }).click();
  await expect(page.getByRole('tab', { name: 'Report card' })).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(new RegExp(`site=${id}(&|$)`));
  await expect(page).toHaveURL(/start=2027-10-13T00%3A00Z/);
  await expect(page.getByTestId('verdict')).toContainText(name);
  await expect(page.getByTestId('verdict-word')).toHaveText(new RegExp(`^.?${{ go: 'GO', marginal: 'MARGINAL', 'no-go': 'NO-GO' }[v]}$`));
  await expect(page.getByTestId('metrics')).toBeVisible();
  expect(errors).toEqual([]);
});

test('"I have a site" opens the calendar with the current site', async ({ page }) => {
  await openApp(page, `site=shackleton_ridge_rim&${DATE}`);
  await page.getByRole('button', { name: 'I have a site: which dates work?' }).click();
  await expect(page.getByRole('tab', { name: 'Compare & calendar' })).toHaveAttribute('aria-selected', 'true');
  const cal = page.getByTestId('calendar');
  await expect(cal).toBeVisible({ timeout: 90_000 });
  await expect(cal.getByRole('rowheader', { name: /Shackleton–de Gerlache ridge/ })).toBeVisible();
  await expect(page.getByTestId('compare-row').first()).toContainText('Shackleton–de Gerlache ridge');
});

test('"Take the Athena tour" opens the Athena story', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Take the Athena tour' }).click();
  await expect(page.getByRole('tab', { name: 'Athena story' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('story')).toBeVisible();
});

test('axe: no serious or critical findings on "Which sites work?"', async ({ page }) => {
  await openApp(page, `${DATE}&view=rank`);
  await expect(page.getByTestId('rank-list')).toBeVisible({ timeout: 30_000 });
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const bad = r.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical');
  const summary = bad.map((x) => `${x.impact} ${x.id}: ${x.help} (${x.nodes.length}) e.g. ${x.nodes[0]?.target.join(' ')}`);
  console.log(`axe "Which sites work?": ${r.violations.length} findings (${r.violations.map((x) => `${x.impact} ${x.id}`).join(', ') || 'none'})`);
  expect(summary).toEqual([]);
});

test('375 px: the start strip and ranking cause no horizontal page scroll', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await openApp(page, `${DATE}&view=rank`);
  await expect(page.getByTestId('rank-list')).toBeVisible({ timeout: 30_000 });
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(sw).toBeLessThanOrEqual(cw);
  await ctx.close();
});
