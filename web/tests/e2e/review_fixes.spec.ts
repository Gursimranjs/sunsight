// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Pre-freeze review fixes, checked in the built app with the shipped data.
import { expect, test } from '@playwright/test';
import { openApp, tab, watchErrors } from './helpers';

test('Shackleton ridge uses the 10 m miss-grid point at the cited site and names its source', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'site=shackleton_ridge_rim');
  await expect(page.getByTestId('horizon-label')).toHaveText('Terrain horizon from the miss-test grid (10 m map), point g158');
  const src = page.getByTestId('site-source').getByRole('link');
  await expect(src).toHaveText('LROC (NASA/GSFC/ASU)');
  await expect(src).toHaveAttribute('href', 'https://lroc.im-ldi.com/images/1247');
  await expect(src).toHaveAttribute('rel', 'noopener');
  await expect(page.getByTestId('site-source')).toContainText('computed by SunSight');
  const about = page.getByTestId('about-data');
  await expect(about.getByRole('link', { name: /PGDA product 90/ })).toHaveAttribute('href', 'https://pgda.gsfc.nasa.gov/products/90');
  await expect(about.getByRole('link', { name: /NAIF SPICE/ })).toHaveAttribute('href', 'https://naif.jpl.nasa.gov/');
  await expect(about).toContainText('NASA/GSFC/Arizona State University');
  await expect(about.getByRole('link', { name: /PGDA product 69/ })).toBeVisible();
  await expect(about.getByRole('link', { name: /JPL Horizons/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('Shackleton crater says how far its region point is from the cited site', async ({ page }) => {
  await openApp(page, 'site=shackleton_crater');
  await expect(page.getByTestId('horizon-label')).toContainText('nearest region point p338, 214 m from the cited site');
});

for (const preset of ['constructor', '__proto__', 'toString']) {
  test(`?preset=${preset} loads the default preset instead of hanging`, async ({ page }) => {
    const errors = watchErrors(page);
    await openApp(page, `site=apollo_11&preset=${preset}`);
    await expect(page).toHaveURL(/preset=robotic/);
    expect(errors).toEqual([]);
  });
}

test('after a site switch the old verdict never shows under the new name', async ({ page }) => {
  await openApp(page, 'site=shackleton_ridge_rim&start=2027-03-01T00:00Z');
  // Record every state of the verdict card from here on.
  await page.evaluate(() => {
    const w = window as unknown as { __snaps: string[][] };
    w.__snaps = [];
    const card = document.querySelector('[data-testid="verdict"]')!;
    const snap = () => w.__snaps.push([
      card.querySelector('p')?.textContent ?? '',
      card.querySelector('[data-testid="verdict-reason"]')?.textContent ?? '',
      card.querySelector('[data-testid="sun-el"]')?.textContent ?? '',
    ]);
    new MutationObserver(snap).observe(card, { subtree: true, childList: true, characterData: true });
  });
  await page.getByRole('combobox', { name: 'Site', exact: true }).selectOption('apollo_11');
  await expect(page.getByTestId('horizon-label')).toHaveText(/^No terrain: smooth horizon/);
  await expect(page.getByTestId('verdict-reason')).toBeVisible();
  const final = [await page.getByTestId('verdict-reason').textContent(), await page.getByTestId('sun-el').textContent()];
  const snaps = await page.evaluate(() => (window as unknown as { __snaps: string[][] }).__snaps);
  const underNewName = snaps.filter(([line]) => line.startsWith('Apollo 11'));
  expect(underNewName.length).toBeGreaterThan(0);
  for (const [, reason, sunEl] of underNewName) {
    if (reason) expect(reason).toBe(final[0]);
    if (sunEl !== '—') expect(sunEl).toBe(final[1]);
  }
});

test('the station-elevation rule is capped at 20°', async ({ page }) => {
  await openApp(page, 'site=apollo_11&moon_el_deg=45');
  await expect(page).toHaveURL(/moon_el_deg=20/);
  await page.getByText('Rules (all adjustable)').click();
  const input = page.getByLabel(/Moon at least this high at the station/);
  await expect(input).toHaveAttribute('max', '20');
  await expect(input).toHaveAttribute('min', '0');
  await input.fill('35');
  await input.dispatchEvent('change');
  await expect(input).toHaveValue('20');
});

test('duplicate compare slots in a link are dropped', async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, 'site=apollo_11&view=compare&cmp=apollo_11,apollo_11,apollo_12');
  await expect(page.getByTestId('compare-row')).toHaveCount(2);
  await expect(page).toHaveURL(/cmp=apollo_11%2Capollo_12(&|$)/);
  expect(errors).toEqual([]);
});

test('the miss and 3D views credit the terrain', async ({ page }) => {
  await openApp(page, 'site=a3_malapert_massif');
  await tab(page, 'Miss test');
  await expect(page.getByTestId('terrain-credit')).toContainText('PGDA product 90 (Barker et al. 2023)');
  await tab(page, '3D view');
  await expect(page.getByTestId('terrain-credit')).toContainText('PGDA product 90 (Barker et al. 2023)');
});

test("a site inside another target's grid gets that grid's miss view, pin at the site", async ({ page }) => {
  await page.goto('./?site=im2_athena_actual&start=2027-03-01T00:00Z&view=miss');
  await expect(page.getByTestId('miss-borrowed-grid')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('miss-borrowed-grid')).toContainText('IM-2 Athena target');
  await expect(page.getByTestId('miss-pin')).not.toHaveAttribute('aria-valuetext', 'on the target');
});
