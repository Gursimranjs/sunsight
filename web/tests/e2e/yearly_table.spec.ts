// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Review note 004, item 1 (speed): the app fetches the Sun and Earth table one year at a time.
// First load of the default link fetches only the year it needs (2029), never the 2.5 MB 2027-2030 file;
// the other years follow in the background after the first answer is on screen.
import { expect, test, type Page } from '@playwright/test';
import { openApp, tab, watchErrors } from './helpers';

const YEAR_FILE = /\/data\/ephemeris\/(\d{4})\.bin$/;
const FULL_TABLE = /\/data\/ephemeris\/2027_2030\.bin$/;

/** Every response the page receives, in order, with its bytes on the wire (CDP encodedDataLength). */
async function recordTraffic(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  const urls = new Map<string, string>();
  const log: { url: string; bytes: number }[] = [];
  const order: string[] = [];
  cdp.on('Network.requestWillBeSent', (e) => { urls.set(e.requestId, e.request.url); order.push(e.request.url); });
  cdp.on('Network.loadingFinished', (e) => log.push({ url: urls.get(e.requestId) ?? '?', bytes: e.encodedDataLength }));
  return { log, order };
}

/**
 * Records, in the page, when the miss headline first shows its answer (performance.now(), ms), so request
 * start times from Resource Timing can be compared with it without a race against the test runner.
 */
async function markMissHeadline(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __missShownAt?: number };
    const check = () => {
      if (w.__missShownAt !== undefined) return;
      const h = document.querySelector('[data-testid="miss-headline"]');
      if (h && h.textContent && h.textContent.includes('Land within')) w.__missShownAt = performance.now();
    };
    new MutationObserver(check).observe(document, { subtree: true, childList: true, characterData: true });
  });
}

test('first load of the default link fetches the 2029 year file and not the 2027-2030 table', async ({ page }) => {
  const errors = watchErrors(page);
  await markMissHeadline(page);
  const { log, order } = await recordTraffic(page);
  await openApp(page);
  await expect(page).toHaveURL(/start=2029-07-24/);
  await expect(page.getByTestId('verdict-word')).toHaveText(/GO|MARGINAL/, { timeout: 60_000 });
  await expect(page.getByTestId('miss-headline')).toContainText('Land within 250 m', { timeout: 90_000 });
  // The first screen is complete. Bytes so far, without the background prefetch of other years.
  const firstScreen = log.filter((r) => !(YEAR_FILE.test(r.url) && !r.url.endsWith('/2029.bin')));
  const bytes = firstScreen.reduce((a, r) => a + r.bytes, 0);
  const table = firstScreen.filter((r) => /\/data\/ephemeris\/[^/]+\.bin$/.test(r.url)).reduce((a, r) => a + r.bytes, 0);
  console.log(`first-load bytes (default link, first screen, no cache): ${bytes} total, of which ${table} ephemeris`);
  console.log(firstScreen.slice().sort((a, b) => b.bytes - a.bytes).slice(0, 8).map((r) => `  ${r.bytes}  ${r.url.replace(/^.*\/sunsight\//, '')}`).join('\n'));
  expect(order.filter((u) => YEAR_FILE.test(u)).map((u) => YEAR_FILE.exec(u)![1])[0]).toBe('2029');
  // Background prefetch fills the other years once the page is idle.
  await expect.poll(() => new Set(order.filter((u) => YEAR_FILE.test(u))).size, { timeout: 30_000 }).toBe(4);
  const years = order.filter((u) => YEAR_FILE.test(u)).map((u) => YEAR_FILE.exec(u)![1]);
  // The prefetch never competes with the first screen: no other year file starts before the miss headline.
  const timing = await page.evaluate(() => ({
    shown_ms: (window as unknown as { __missShownAt?: number }).__missShownAt ?? null,
    starts: performance.getEntriesByType('resource').filter((r) => /\/data\/ephemeris\/\d{4}\.bin$/.test(r.name))
      .map((r) => ({ name: r.name, start_ms: r.startTime })),
  }));
  expect(timing.shown_ms).not.toBeNull();
  const others = timing.starts.filter((r) => !r.name.endsWith('/2029.bin'));
  expect(others.length).toBe(3);
  for (const r of others) expect(r.start_ms, r.name).toBeGreaterThan(timing.shown_ms!);
  await page.waitForLoadState('networkidle');
  expect(order.filter((u) => FULL_TABLE.test(u))).toEqual([]);
  // Each year file is fetched once: exactly four year-file requests in all.
  expect(order.filter((u) => YEAR_FILE.test(u)).length).toBe(4);
  expect(years.slice().sort()).toEqual(['2027', '2028', '2029', '2030']);
  expect(errors).toEqual([]);
});

test('a stay crossing from 2027 into 2028 loads both years and scores the window', async ({ page }) => {
  const errors = watchErrors(page);
  const { order } = await recordTraffic(page);
  await openApp(page, 'site=shackleton_ridge_rim&start=2027-12-25T00:00Z&days=14&preset=robotic&view=report');
  await expect(page.getByTestId('verdict-word')).toHaveText(/GO|MARGINAL|NO-GO/, { timeout: 60_000 });
  await expect(page.getByTestId('metrics')).toBeVisible();
  const first = order.filter((u) => YEAR_FILE.test(u)).map((u) => YEAR_FILE.exec(u)![1]).slice(0, 2).sort();
  expect(first).toEqual(['2027', '2028']);
  // The main-thread "now" sample works on both sides of the new year.
  const sunEl = page.getByTestId('sun-el');
  await expect(sunEl).toHaveText(/^-?\d+\.\d\d°$/);
  const before = await sunEl.textContent();
  await page.getByRole('slider', { name: 'Time' }).fill(String(8 * 86400));
  await expect(page.getByTestId('time-now')).toContainText('2028-01-02 00:00 UTC');
  await expect(sunEl).toHaveText(/^-?\d+\.\d\d°$/);
  await expect(sunEl).not.toHaveText(before!);
  expect(order.filter((u) => FULL_TABLE.test(u))).toEqual([]);
  expect(errors).toEqual([]);
});

test('the best-date search loads every year first, then scores 2027 to 2030', async ({ page }) => {
  const errors = watchErrors(page);
  // The Athena target fails on this date, so the miss test offers the jump (see miss_target_fails.spec.ts).
  await openApp(page, 'site=im2_athena_target&start=2027-01-01T00:00Z&view=miss');
  await expect(page.getByTestId('miss-target-fails')).toBeVisible({ timeout: 90_000 });
  await page.getByTestId('miss-best-button').click();
  await expect(page.getByTestId('miss-best-note')).toContainText(/from 2027 to 2030/, { timeout: 120_000 });
  expect(errors).toEqual([]);
});

test('switching to a date in another year updates the report card', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'site=shackleton_ridge_rim&start=2030-03-01T00:00Z&preset=robotic&view=report');
  await expect(page.getByTestId('verdict-word')).toHaveText(/GO|MARGINAL|NO-GO/, { timeout: 60_000 });
  await tab(page, 'Compare & calendar');
  await expect(page.getByTestId('calendar')).toBeVisible({ timeout: 90_000 });
  expect(errors).toEqual([]);
});

// Failure paths: a year file that cannot be fetched shows an error with a Retry button (never an endless
// "Loading Sun and Earth positions…"), and Retry recovers once the file is reachable again.
test.describe('a year file that fails to load', () => {
  const fail500 = (page: Page, year: number) => page.route(`**/data/ephemeris/${year}.bin`, (r) => r.fulfill({ status: 500, body: 'down' }));

  test('default link: the report card and the miss test show the error, and Retry recovers', async ({ page }) => {
    await fail500(page, 2029);
    await page.goto('./?ui=classic');
    const missErr = page.getByTestId('miss-headline').getByTestId('table-error');
    await expect(missErr).toContainText('Could not load the Sun and Earth positions', { timeout: 60_000 });
    await expect(page.getByTestId('table-status').getByTestId('table-error')).toContainText(/2029\.bin|HTTP|500/);
    await expect(page.getByText('Loading Sun and Earth positions…')).toHaveCount(0);
    // Let every job that was waiting on the failed year settle first, so none of them refetches it after the unroute.
    await page.waitForLoadState('networkidle');
    await page.unroute('**/data/ephemeris/2029.bin');
    await page.getByTestId('table-status').getByTestId('table-retry').click();
    await expect(page.getByTestId('verdict-word')).toHaveText(/GO|MARGINAL/, { timeout: 60_000 });
    await expect(page.getByTestId('miss-headline')).toContainText('Land within 250 m', { timeout: 90_000 });
    await expect(page.getByTestId('table-error')).toHaveCount(0);
  });

  test('miss test: after a failed year, choosing another date tries again without Retry', async ({ page }) => {
    await fail500(page, 2029);
    await page.goto('./?ui=classic');
    await expect(page.getByTestId('miss-headline').getByTestId('table-error')).toBeVisible({ timeout: 60_000 });
    // Let every job that was waiting on the failed year settle first, so none of them refetches it after the unroute.
    await page.waitForLoadState('networkidle');
    await page.unroute('**/data/ephemeris/2029.bin');
    const start = page.getByLabel('Start (UTC)');
    await start.fill('2029-07-25T00:00');
    await start.dispatchEvent('change');
    await expect(page.getByTestId('miss-headline')).toContainText('Land within 250 m', { timeout: 90_000 });
  });

  test('compare and calendar show the error, and Retry recovers', async ({ page }) => {
    await fail500(page, 2030);
    await page.goto('./?site=shackleton_ridge_rim&start=2030-03-01T00:00Z&preset=robotic&view=compare&ui=classic');
    const card = page.getByLabel('Compare sites');
    await expect(card.getByTestId('table-error')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('region', { name: 'Calendar', exact: true }).getByTestId('table-error')).toBeVisible();
    // Let every job that was waiting on the failed year settle first, so none of them refetches it after the unroute.
    await page.waitForLoadState('networkidle');
    await page.unroute('**/data/ephemeris/2030.bin');
    await card.getByTestId('table-retry').click();
    await expect(page.getByTestId('compare-row').first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('calendar')).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('table-error')).toHaveCount(0);
  });

  test('ranking shows the error, and Retry recovers', async ({ page }) => {
    await fail500(page, 2030);
    await page.goto('./?site=shackleton_ridge_rim&start=2030-03-01T00:00Z&preset=robotic&view=rank&ui=classic');
    const rank = page.getByTestId('rank');
    await expect(rank.getByTestId('table-error')).toBeVisible({ timeout: 60_000 });
    // Let every job that was waiting on the failed year settle first, so none of them refetches it after the unroute.
    await page.waitForLoadState('networkidle');
    await page.unroute('**/data/ephemeris/2030.bin');
    await rank.getByTestId('table-retry').click();
    await expect(page.getByTestId('rank-summary')).toBeVisible({ timeout: 90_000 });
    await expect(rank.getByText('The ranking failed')).toHaveCount(0);
  });

  test('3D view shows the App\'s error instead of loading forever, and Retry recovers', async ({ page }) => {
    await fail500(page, 2027);
    await page.goto('./?site=shackleton_ridge_rim&start=2027-10-13T00:00Z&view=3d&ui=classic');
    await expect(page.getByTestId('hero3d-table-error')).toContainText('Could not load the Sun and Earth positions', { timeout: 60_000 });
    // Let every job that was waiting on the failed year settle first, so none of them refetches it after the unroute.
    await page.waitForLoadState('networkidle');
    await page.unroute('**/data/ephemeris/2027.bin');
    await page.getByTestId('hero3d-table-error').getByTestId('table-retry').click();
    await expect(page.getByTestId('hero3d-table-error')).toHaveCount(0, { timeout: 60_000 });
    await expect(page.getByTestId('verdict-word')).toHaveText(/GO|MARGINAL|NO-GO/, { timeout: 60_000 });
  });

  test('Athena story contrast shows the error, and Retry recovers', async ({ page }) => {
    await fail500(page, 2030);
    await page.goto('./?site=shackleton_ridge_rim&start=2030-03-01T00:00Z&view=story&ui=classic');
    await page.getByRole('button', { name: /^Step 5:/ }).click();
    const step = page.getByTestId('story-step-5');
    // The step holds the contrast table and, below it, a miss map: both say the year failed.
    await expect(step.getByTestId('table-error')).toHaveCount(2, { timeout: 60_000 });
    // Let every job that was waiting on the failed year settle first, so none of them refetches it after the unroute.
    await page.waitForLoadState('networkidle');
    await page.unroute('**/data/ephemeris/2030.bin');
    await step.getByTestId('table-retry').first().click();
    await expect(page.getByTestId('story-contrast')).toBeVisible({ timeout: 90_000 });
  });
});
