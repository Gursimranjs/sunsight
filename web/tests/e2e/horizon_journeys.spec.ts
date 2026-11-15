// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Review note 009, M4: the three user journeys of the build plan in the horizon interface (?ui=horizon),
// the game against the Miss map in the real shell, and keyboard reach of every control including the map
// reticles. Play moving the Sun and the clocks is tested in horizon_shell.spec.ts and horizon_polish.spec.ts.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { shippedSites, watchErrors } from './helpers';

const BASE = 'site=shackleton_ridge_rim&start=2029-07-24T00:00Z&preset=crew';
const LABEL: Record<string, string> = { go: 'GO', marginal: 'MARGINAL', 'no-go': 'NO-GO' };

async function openHz(page: Page, query = '') {
  await page.goto(`./?${query ? query + '&' : ''}ui=horizon`);
  await expect(page.getByTestId('hz-app')).toBeVisible();
  await expect(page.getByTestId('verdict-word')).toBeVisible({ timeout: 60_000 });
}

const views = (page: Page) => page.getByRole('navigation', { name: 'Views' });
const openView = (page: Page, name: string) => views(page).getByRole('button', { name, exact: true }).click();

/** The call shows this verdict kind (go, marginal or no-go): its badge carries the kind as a class. */
async function expectCall(page: Page, kind: string) {
  await expect(page.getByTestId('hz-hero-group')).toHaveAttribute('data-stale', 'false', { timeout: 60_000 });
  await expect(page.getByTestId('verdict-word').locator('.vbadge')).toHaveClass(new RegExp(`(^|\\s)${kind}(\\s|$)`), { timeout: 60_000 });
  await expect(page.getByTestId('verdict-word')).toContainText(LABEL[kind]);
}

/** The verdict kind of a badge inside `loc` (go, marginal or no-go). */
async function badgeKind(loc: Locator) {
  const cls = (await loc.locator('.vbadge').first().getAttribute('class')) ?? '';
  return /(^|\s)(no-go|marginal|go)(\s|$)/.exec(cls)?.[2] ?? '';
}

test('journey (a) date to sites: pick a date in the mission line, rank the sites, open one from the ranking', async ({ page }) => {
  const errors = watchErrors(page);
  await openHz(page, BASE);
  // The date picker in the mission line: choose a day on the strip.
  const date = page.getByTestId('hz-date-button');
  await date.click();
  const day = page.getByTestId('strip-day').nth(4);
  await expect(day).toBeVisible({ timeout: 90_000 });
  const dayLabel = (await day.getAttribute('aria-label'))!;
  expect(dayLabel).toMatch(/^Stay starting 2029-07-28 00:00 UTC: /);
  await day.click();
  await expect(date).toContainText('28 Jul 2029');
  await expect(page).toHaveURL(/start=2029-07-28T00%3A00Z/);

  // Rank sites for that date, read the verdicts.
  await openView(page, 'Rank sites');
  await expect(page).toHaveURL(/view=rank/);
  const list = page.getByTestId('rank-list');
  await expect(list).toBeVisible({ timeout: 90_000 });
  const rows = page.getByTestId('rank-row');
  expect(await rows.count()).toBeGreaterThan(2);
  for (let k = 0; k < 3; k++) {
    const row = rows.nth(k);
    const v = (await row.getAttribute('data-verdict'))!;
    expect(Object.keys(LABEL)).toContain(v);
    expect(await badgeKind(row)).toBe(v);
    await expect(row.getByTestId('rank-name')).not.toBeEmpty();
  }
  // Open the second-ranked site's report from the ranking: the call is for that site on the chosen date.
  const row = rows.nth(1);
  const id = (await row.getAttribute('data-site'))!;
  const name = (await row.getByTestId('rank-name').textContent())!.trim();
  const v = (await row.getAttribute('data-verdict'))!;
  await row.getByRole('button', { name: /report card/i }).click();
  await expect(views(page).getByRole('button', { name: 'Horizon', exact: true })).toHaveAttribute('aria-current', 'true');
  await expect(page).toHaveURL(new RegExp(`site=${id}(&|$)`));
  await expect(page).toHaveURL(/start=2029-07-28T00%3A00Z/);
  await expect(page).toHaveURL(/ui=horizon/);
  await expect(page.getByTestId('hz-site-button')).toHaveAccessibleName(name);
  await expectCall(page, v);
  await expect(page.getByTestId('metrics')).toBeVisible({ timeout: 60_000 });
  expect(errors).toEqual([]);
});

test('journey (b) site to dates: choose a site, then a day on the date strip and in Calendar & compare; the call follows', async ({ page }) => {
  const errors = watchErrors(page);
  await openHz(page, 'site=apollo_11&start=2027-02-01T00:00Z&preset=crew');
  // The site picker: choose Shackleton's ridge from the list.
  const siteBtn = page.getByTestId('hz-site-button');
  await siteBtn.click();
  await expect(page.getByTestId('site-map-picker')).toBeVisible();
  await page.getByTestId('site-map-picker').locator('button.hz-chip[data-site-id=shackleton_ridge_rim]').click();
  await expect(page.getByTestId('site-map-picker')).toHaveCount(0);
  await expect(page).toHaveURL(/site=shackleton_ridge_rim/);
  await expect(siteBtn).toHaveAccessibleName(/Shackleton–de Gerlache ridge/);

  // The date strip for that site: click a day, the call is that day's.
  const date = page.getByTestId('hz-date-button');
  await date.click();
  const day = page.getByTestId('strip-day').nth(3);
  await expect(day).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('date-strip')).toContainText('Shackleton');
  const dayLabel = (await day.getAttribute('aria-label'))!;
  expect(dayLabel).toMatch(/^Stay starting 2027-02-04 00:00 UTC: /);
  const stripVerdict = (await day.getAttribute('data-verdict'))!;
  await day.click();
  await expect(date).toContainText('4 Feb 2027');
  await expect(page).toHaveURL(/start=2027-02-04T00%3A00Z/);
  await expectCall(page, stripVerdict);

  // Calendar & compare: the row of this site, a later day; clicking it moves the call to that day.
  await openView(page, 'Calendar & compare');
  await page.getByLabel('Days shown').selectOption('7');
  const cal = page.getByTestId('calendar');
  await expect(cal).toBeVisible({ timeout: 90_000 });
  const calRow = cal.locator('tr', { has: page.getByRole('rowheader', { name: /Shackleton–de Gerlache ridge/ }) });
  const cell = calRow.getByTestId('cal-cell').nth(5);
  const label = (await cell.getAttribute('aria-label')) ?? '';
  const when = /stay starting (\d{4}-\d{2}-\d{2})/.exec(label)?.[1];
  expect(when).toBeTruthy();
  const kind = /: (GO|MARGINAL|NO-GO)/.exec(label)![1];
  await cell.click();
  await expect(page).toHaveURL(new RegExp(`start=${when}T00%3A00Z`));
  await expect(page).toHaveURL(/site=shackleton_ridge_rim/);
  await expect(page).toHaveURL(/ui=horizon/);
  const d = new Date(`${when}T00:00:00Z`);
  await expect(date).toContainText(`${d.getUTCDate()} ${d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })} ${d.getUTCFullYear()}`);
  await expectCall(page, { GO: 'go', MARGINAL: 'marginal', 'NO-GO': 'no-go' }[kind]!);
  expect(errors).toEqual([]);
});

test('journey (c) miss test: on the Miss map move the landing pin by keyboard and by dragging; the pin verdict follows', async ({ page }) => {
  const target = shippedSites().find((s) => s.id === 'a3_malapert_massif' && s.miss_target_id) ?? shippedSites().find((s) => s.miss_target_id);
  test.skip(!target, 'No miss-test grid ships yet');
  const errors = watchErrors(page);
  // A date where this grid's map is mixed (the classic journey uses the same one).
  await openHz(page, `site=${target!.id}&start=2027-10-13T00:00Z&preset=crew`);
  await openView(page, 'Miss map');
  await expect(page).toHaveURL(/view=miss/);
  await expect(page.getByTestId('miss-shares')).toBeVisible({ timeout: 90_000 });
  const pin = page.getByTestId('miss-pin');
  const verdict = page.getByTestId('miss-pin-verdict');
  expect(await verdict.innerText()).toContain('on the target');

  // Keyboard: sweep the pin across the grid row by row until its verdict changes.
  await pin.focus();
  const start = await badgeKind(verdict);
  const keys: string[] = [...Array(10).fill('ArrowUp'), ...Array(10).fill('ArrowLeft')];
  for (let row = 0; row < 21; row++) keys.push(...Array(20).fill(row % 2 ? 'ArrowLeft' : 'ArrowRight'), 'ArrowDown');
  let changed = '';
  for (const k of keys) {
    await page.keyboard.press(k);
    if ((await badgeKind(verdict)) !== start) { changed = (await pin.getAttribute('aria-valuetext')) ?? ''; break; }
  }
  expect(changed, 'some grid point should have a different verdict on this mixed date').not.toBe('');
  expect(changed).not.toBe('on the target');
  await expect(verdict).toContainText(changed);
  // The arrow keys moved the pin, not the time in the stay.
  await expect(page).not.toHaveURL(/t_h=/);

  // Drag: put the pin up and to the left of the centre; the text names the new point.
  const map = page.getByTestId('miss-map');
  await map.scrollIntoViewIfNeeded();
  const box = (await map.boundingBox())!;
  const before = await verdict.innerText();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3, { steps: 8 });
  await page.mouse.up();
  await expect(verdict).not.toHaveText(before);
  await expect(verdict).toContainText(/west, \d+ m north of the target/);
  expect(await badgeKind(verdict)).toMatch(/^(go|marginal|no-go)$/);
  expect(errors).toEqual([]);
});

test('the game in the shell returns the Miss map verdict for the same grid points', async ({ page }) => {
  const errors = watchErrors(page);
  await openHz(page);
  await expect(page).toHaveURL(/site=shackleton_ridge_rim/);
  await page.getByTestId('hz-game-button').click();
  await expect(page.getByTestId('game-brief')).toBeVisible({ timeout: 60_000 });
  const reticle = page.getByTestId('game-reticle');
  await expect(reticle).toBeVisible({ timeout: 60_000 });
  const startIndex = await reticle.getAttribute('aria-valuenow');

  // Landing 1 on the target; landing 2 at a known grid point reached by keyboard.
  const landings: { index: string; id: string; verdict: string; keys: string[] }[] = [];
  const plan = [[], ['ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowDown', 'ArrowDown']];
  for (const [n, keys] of plan.entries()) {
    await reticle.focus();
    for (const k of keys) await page.keyboard.press(k);
    const index = (await reticle.getAttribute('aria-valuenow'))!;
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('game-try-list').locator('li')).toHaveCount(n + 1, { timeout: 90_000 });
    const r = page.getByTestId('game-result');
    await expect(r).toBeVisible({ timeout: 30_000 });
    landings.push({ index, id: (await r.getAttribute('data-point-id'))!, verdict: (await r.getAttribute('data-verdict'))!, keys });
  }
  expect(landings[0].index).not.toBe(landings[1].index);

  // The Miss map: put its pin on the same grid points with the same keys and read its verdict.
  await openView(page, 'Miss map');
  await expect(page.getByTestId('miss-pin-verdict')).toBeVisible({ timeout: 90_000 });
  const pin = page.getByTestId('miss-pin');
  await expect(pin).toHaveAttribute('aria-valuenow', startIndex!);
  let at = startIndex!;
  for (const l of landings) {
    await pin.focus();
    for (const k of l.keys) await page.keyboard.press(k);
    at = (await pin.getAttribute('aria-valuenow'))!;
    expect(at, `grid point ${l.id}`).toBe(l.index);
    expect(await badgeKind(page.getByTestId('miss-pin-verdict')), `grid point ${l.id}`).toBe(l.verdict);
  }
  expect(errors).toEqual([]);
});

/**
 * Tabs through the page from the top and returns the visible, enabled controls inside `scope` that the
 * keyboard never reached (described by test id or accessible label). Empty when every control is reachable.
 */
async function unreached(page: Page, scope: string, maxTabs = 250): Promise<string[]> {
  const n = await page.evaluate((sel) => {
    document.querySelectorAll('[data-kbd]').forEach((el) => el.removeAttribute('data-kbd'));
    const controls = [...document.querySelectorAll(sel)].flatMap((root) => [...root.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]')])
      .filter((el) => !(el as HTMLButtonElement).disabled && el.getAttribute('tabindex') !== '-1' && el.getClientRects().length > 0
        // checkVisibility: also leaves out what a closed <details> hides (its summary is the control there).
        && el.checkVisibility({ visibilityProperty: true }) && !el.closest('[inert]'));
    controls.forEach((el, i) => el.setAttribute('data-kbd', String(i)));
    return controls.length;
  }, scope);
  expect(n, `controls in ${scope}`).toBeGreaterThan(0);
  await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo(0, 0); });
  const seen = new Set<string>();
  for (let k = 0; k < maxTabs && seen.size < n; k++) {
    await page.keyboard.press('Tab');
    const v = await page.evaluate(() => document.activeElement?.getAttribute('data-kbd') ?? null);
    if (v !== null) seen.add(v);
  }
  return page.evaluate((s) => [...document.querySelectorAll('[data-kbd]')].filter((el) => !s.includes(el.getAttribute('data-kbd')!))
    .map((el) => el.getAttribute('data-testid') || el.getAttribute('aria-label') || (el.textContent ?? '').trim().slice(0, 40)), [...seen]);
}

test('keyboard reaches every control of the mission line, the ground panel, the view switch, the game and the Miss map pin', async ({ page }) => {
  await openHz(page, BASE);
  await expect(page.getByTestId('verdict-miss-share')).toBeVisible({ timeout: 90_000 });
  // Mission line, ground panel (Play, the time slider, the miss line, "Land it yourself") and the view switch.
  expect(await unreached(page, '[data-testid=hz-mission], [data-testid=hz-ground], nav[aria-label=Views]')).toEqual([]);
  // The controls named in note 009 are among them.
  for (const id of ['hz-site-button', 'hz-date-button', 'hz-scenario-button', 'hz-play', 'hz-open-miss', 'hz-game-button']) {
    await expect(page.getByTestId(id)).toHaveAttribute('data-kbd', /\d+/);
  }
  await expect(page.getByRole('slider', { name: 'Time in the stay' })).toHaveAttribute('data-kbd', /\d+/);

  // The game: its reticle (the map) and every button.
  await page.getByTestId('hz-game-button').click();
  await expect(page.getByTestId('game-reticle')).toBeVisible({ timeout: 60_000 });
  expect(await unreached(page, '[data-testid=land-game]')).toEqual([]);
  await expect(page.getByTestId('game-reticle')).toHaveAttribute('data-kbd', /\d+/);
  // Landing by keyboard alone from the reticle.
  await page.getByTestId('game-reticle').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('game-result')).toBeVisible({ timeout: 90_000 });

  // The Miss map pin.
  await openView(page, 'Miss map');
  await expect(page.getByTestId('miss-pin-verdict')).toBeVisible({ timeout: 90_000 });
  expect(await unreached(page, '[data-testid=hz-view]')).toEqual([]);
  await expect(page.getByTestId('miss-pin')).toHaveAttribute('data-kbd', /\d+/);
});
