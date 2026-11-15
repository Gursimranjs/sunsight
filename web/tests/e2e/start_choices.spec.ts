// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Note 003 A: the start strip's three entry choices and the "which sites work?" ranking.
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { openApp, shippedSites, watchErrors } from './helpers';

// Crew sortie from 2027-10-13: the shipped data gives both go and no-go sites here, so the order is exercised.
const DATE = 'start=2027-10-13T00:00Z&preset=crew';
const ORDER: Record<string, number> = { go: 0, marginal: 1, 'no-go': 2 };

/**
 * Ids of the shipped sites that have terrain horizon masks, by the same rules the app resolves them:
 * a miss grid listed in the manifest with the site's point at most 40 m away, a listed region, or a
 * listed miss-grid target (for a site with no miss_grid_id).
 */
function expectedRanked(): Set<string> {
  const dir = new URL('../../public/data/', import.meta.url).pathname;
  const m = JSON.parse(readFileSync(dir + 'manifest.json', 'utf8')) as { files: { sites: string; miss?: { id: string }[]; regions?: { id: string }[] } };
  const s = JSON.parse(readFileSync(dir + m.files.sites, 'utf8')) as { sites: Record<string, unknown>[] };
  const grids = new Set((m.files.miss ?? []).map((x) => x.id));
  const regions = new Set((m.files.regions ?? []).map((x) => x.id));
  const str = (x: unknown) => (typeof x === 'string' && x !== '' ? x : null);
  return new Set(s.sites.filter((x) => {
    const grid = str(x.miss_grid_id), region = str(x.region_id), target = str(x.miss_target_id);
    const offset_m = typeof x.miss_point_offset_m === 'number' ? x.miss_point_offset_m : 0;
    return (grid && grids.has(grid) && offset_m <= 40) || (region && regions.has(region)) || (!grid && target && grids.has(target));
  }).map((x) => x.id as string));
}

test('the start strip shows three choices and the honest miss contrast', async ({ page }) => {
  await openApp(page);
  const strip = page.getByRole('navigation', { name: 'Start here' });
  await expect(strip.getByRole('button', { name: 'I have a date: which sites work?' })).toBeVisible();
  await expect(strip.getByRole('button', { name: 'I have a site: which dates work?' })).toBeVisible();
  await expect(strip.getByRole('button', { name: 'Take the Athena tour' })).toBeVisible();
  await expect(page.getByTestId('start-lead')).toHaveText(
    "A miss of a few hundred metres can matter a lot on the Shackleton ridge and hardly at all around Athena's target; the Miss test shows where.");
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
  // Exactly the sites with terrain masks are ranked: no more, no fewer.
  const expected = expectedRanked();
  const n = await rows.count();
  expect(n).toBe(expected.size);
  const verdicts: string[] = [];
  const scores: number[] = [];
  const ids = new Set<string>();
  for (let i = 0; i < n; i++) {
    const r = rows.nth(i);
    await expect(r.getByTestId('rank-n')).toHaveText(String(i + 1));
    await expect(r.locator('.vbadge')).toHaveText(/GO|MARGINAL|NO-GO/);
    await expect(r.getByTestId('rank-reason')).not.toBeEmpty();
    await expect(r.getByTestId('rank-horizon')).toContainText('Terrain horizon');
    verdicts.push((await r.getAttribute('data-verdict')) ?? '');
    scores.push(Number(await r.getAttribute('data-score')));
    ids.add((await r.getAttribute('data-site')) ?? '');
  }
  expect([...ids].sort()).toEqual([...expected].sort());
  // Verdict order (go, marginal, no-go); within one verdict the score never increases.
  for (let i = 1; i < n; i++) {
    expect(ORDER[verdicts[i - 1]]).toBeLessThanOrEqual(ORDER[verdicts[i]]);
    if (verdicts[i - 1] === verdicts[i]) expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
  }
  // The footnote counts the other curated sites, none of which failed to load.
  const others = shippedSites().length - expected.size;
  await expect(page.getByTestId('rank-unranked')).toHaveText(new RegExp(`^${others} other curated sites? ha(s|ve) no terrain horizon masks`));
  await expect(page.getByTestId('rank-unranked')).not.toContainText('could not be loaded');
  expect(errors).toEqual([]);
});

test('when every ranked site is no-go, the summary names no "best" site', async ({ page }) => {
  const errors = watchErrors(page);
  // Robotic preset from 2027-01-01 (the old default link): the shipped data gives no go or marginal site.
  await openApp(page, 'start=2027-01-01T00:00Z&preset=robotic&view=rank');
  await expect(page.getByTestId('rank-list')).toBeVisible({ timeout: 30_000 });
  const verdicts = await page.getByTestId('rank-row').evaluateAll((els) => els.map((e) => e.getAttribute('data-verdict')));
  expect(verdicts.length).toBeGreaterThan(0);
  expect(verdicts.every((v) => v === 'no-go')).toBe(true);
  const summary = page.getByTestId('rank-summary');
  await expect(summary).not.toContainText('Best:');
  const top = await page.getByTestId('rank-name').first().textContent();
  await expect(summary).toContainText(`No ranked site meets the rules for this stay. Highest score: ${top} (still no-go).`);
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

test('"I have a site" opens the calendar with the chosen site as its first, marked row', async ({ page }) => {
  await openApp(page, `site=shackleton_ridge_rim&${DATE}`);
  await page.getByRole('button', { name: 'I have a site: which dates work?' }).click();
  await expect(page.getByRole('tab', { name: 'Compare & calendar' })).toHaveAttribute('aria-selected', 'true');
  const cal = page.getByTestId('calendar');
  await expect(cal).toBeVisible({ timeout: 90_000 });
  // shackleton_ridge_rim is not first in sites.json, so this row order comes from the choice.
  expect(shippedSites()[0].id).not.toBe('shackleton_ridge_rim');
  await expect(cal.getByRole('rowheader').first()).toHaveText(/Shackleton–de Gerlache ridge/);
  const marked = cal.locator('tbody tr[aria-current="true"]');
  await expect(marked).toHaveCount(1);
  await expect(marked.getByRole('rowheader')).toHaveText(/Shackleton–de Gerlache ridge/);
  await expect(marked).toBeInViewport();
  await expect(page.getByTestId('cal-custom-note')).toHaveCount(0);
  await expect(page.getByTestId('compare-row').first()).toContainText('Shackleton–de Gerlache ridge');
});

test('"I have a site" with a custom point says the calendar lists curated sites only', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, `lat=-60.5&lon=20.25&${DATE}`);
  await page.getByRole('button', { name: 'I have a site: which dates work?' }).click();
  await expect(page.getByRole('tab', { name: 'Compare & calendar' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('cal-custom-note')).toHaveText('The calendar lists curated sites only; your custom point is not in it.');
  const cal = page.getByTestId('calendar');
  await expect(cal).toBeVisible({ timeout: 90_000 });
  await expect(cal.locator('tbody tr[aria-current="true"]')).toHaveCount(0);
  await expect(cal.getByRole('rowheader').first()).toHaveText(shippedSites()[0].name);
  expect(errors).toEqual([]);
});

test('"Take the Athena tour" opens the Athena story', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Take the Athena tour' }).click();
  await expect(page.getByRole('tab', { name: 'Athena story' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('story')).toBeVisible();
});

// Axe, 375 px layout and minimum text size for "Which sites work?" run in quality.spec.ts with the other views.
