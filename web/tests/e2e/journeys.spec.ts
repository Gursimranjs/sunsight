// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// The three user journeys from the build plan, against the built site with the shipped data.
import { expect, test } from '@playwright/test';
import { openApp, shippedSites, tab, watchErrors } from './helpers';

test('loads with no console errors and no fixture banner', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await expect(page.getByTestId('verdict-reason')).not.toBeEmpty();
  await expect(page.getByTestId('fixture-banner')).toHaveCount(0);
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('journey (a) date to sites: pick a date, compare three sites, read their verdicts', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await page.getByLabel('Start (UTC)').fill('2027-10-13T00:00');
  await page.getByLabel('Start (UTC)').dispatchEvent('change');
  await expect(page).toHaveURL(/start=2027-10-13T00%3A00Z/);
  await tab(page, 'Compare & calendar');
  const sites = shippedSites();
  const picks = [sites.find((s) => s.id === 'a3_malapert_massif') ?? sites[0], sites.find((s) => s.id === 'shackleton_ridge_rim') ?? sites[1], sites.find((s) => s.id === 'apollo_11') ?? sites[2]];
  for (const [k, s] of picks.entries()) await page.getByRole('combobox', { name: new RegExp(`^Site ${k + 1}\\b`) }).selectOption(s.id);
  const rows = page.getByTestId('compare-row');
  await expect(rows).toHaveCount(3);
  for (const [k, s] of picks.entries()) {
    const row = rows.nth(k);
    await expect(row).toContainText(s.name);
    await expect(row.locator('.vbadge')).toHaveText(/GO|MARGINAL|NO-GO/);
  }
  await expect(page.locator('.takeaway', { hasText: 'Best score' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('journey (b) site to dates: calendar for one site, click a cell, its report card opens', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'site=apollo_11&start=2027-02-01T00:00Z');
  await tab(page, 'Compare & calendar');
  await page.getByLabel('Days shown').selectOption('7');
  const cal = page.getByTestId('calendar');
  await expect(cal).toBeVisible({ timeout: 90_000 });
  const row = cal.locator('tr', { has: page.getByRole('rowheader', { name: /Shackleton–de Gerlache ridge/ }) });
  const cell = row.getByTestId('cal-cell').nth(3);
  const label = (await cell.getAttribute('aria-label')) ?? '';
  const day = /stay starting (\d{4}-\d{2}-\d{2})/.exec(label)?.[1];
  expect(day).toBe('2027-02-04');
  await cell.click();
  await expect(page.getByRole('tab', { name: 'Report card' })).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/site=shackleton_ridge_rim/);
  await expect(page).toHaveURL(/start=2027-02-04T00%3A00Z/);
  await expect(page.getByTestId('verdict-word')).toHaveText(new RegExp(/: (GO|MARGINAL|NO-GO)/.exec(label)![1]));
  await expect(page.getByTestId('metrics')).toBeVisible();
  expect(errors).toEqual([]);
});

test('journey (c) miss test: move the landing pin by keyboard and by dragging, the verdict follows', async ({ page }) => {
  const target = shippedSites().find((s) => s.id === 'a3_malapert_massif' && s.miss_target_id) ?? shippedSites().find((s) => s.miss_target_id);
  test.skip(!target, 'No miss-test grid ships yet');
  const errors = watchErrors(page);
  // A date where this grid's map is mixed (found by scanning 2027 with the crew preset).
  await openApp(page, `site=${target!.id}&start=2027-10-13T00:00Z&preset=crew&view=miss`);
  await expect(page.getByTestId('miss-shares')).toBeVisible({ timeout: 90_000 });
  const pin = page.getByTestId('miss-pin');
  const verdict = page.getByTestId('miss-pin-verdict');
  const first = await verdict.innerText();
  expect(first).toContain('on the target');

  // Keyboard: sweep the pin across the grid (row by row) until its verdict word changes.
  await pin.focus();
  const word = async () => (await verdict.locator('.vbadge').innerText()).trim();
  const start = await word();
  const keys: string[] = [...Array(10).fill('ArrowUp'), ...Array(10).fill('ArrowLeft')];
  for (let row = 0; row < 21; row++) keys.push(...Array(20).fill(row % 2 ? 'ArrowLeft' : 'ArrowRight'), 'ArrowDown');
  let changed = '';
  for (const k of keys) {
    await page.keyboard.press(k);
    if ((await word()) !== start) { changed = (await pin.getAttribute('aria-valuetext')) ?? ''; break; }
  }
  expect(changed, 'some grid point should have a different verdict on this mixed date').not.toBe('');
  expect(changed).not.toBe('on the target');

  // Drag: put the pin on a far corner of the map; the text names the new point.
  const box = (await page.getByTestId('miss-map').boundingBox())!;
  const before = await verdict.innerText();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3, { steps: 8 });
  await page.mouse.up();
  await expect(verdict).not.toHaveText(before);
  await expect(verdict).toContainText(/west, \d+ m north of the target/);
  expect(errors).toEqual([]);
});

test('miss-tolerant calendar marks rows that have a miss grid', async ({ page }) => {
  const sites = shippedSites();
  test.skip(!sites.some((s) => s.miss_target_id), 'No miss-test grid ships yet');
  await openApp(page, 'site=a3_malapert_massif&start=2027-10-13T00:00Z&preset=crew&view=compare');
  await page.getByLabel('Days shown').selectOption('7');
  await expect(page.getByTestId('calendar')).toBeVisible({ timeout: 90_000 });
  await page.getByTestId('cal-miss-toggle').check();
  await expect(page.locator('button[data-miss="on"]').first()).toBeVisible({ timeout: 120_000 });
  const label = await page.locator('button[data-miss="on"]').first().getAttribute('aria-label');
  expect(label).toMatch(/miss-tolerant: \d+ of \d+ points within 250 m pass/);
});
