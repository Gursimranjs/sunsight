// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Note 009 M2/M3 polish on ?ui=horizon: the load motion and its reduced-motion path, Play as a stepped
// slider, page keys that leave other controls alone, strip labels, the quiet clock and focus rings.
import { expect, test, type Page } from '@playwright/test';
import { watchErrors } from './helpers';

const LINK = 'site=shackleton_ridge_rim&start=2029-07-24T00:00Z&preset=crew';
const SHOTS = process.env.SUNSIGHT_SHOTS_DIR;

async function openHz(page: Page, query = LINK) {
  await page.goto(`./?${query}&ui=horizon`);
  await expect(page.getByTestId('hz-app')).toBeVisible();
  await expect(page.getByTestId('verdict-word')).toBeVisible({ timeout: 60_000 });
}

/** The Sun marker's drawn x in two consecutive animation frames. */
const sunTwoFrames = (page: Page) => page.evaluate(() => new Promise<[string | null, string | null]>((done) => {
  const read = () => document.querySelector('[data-testid=hz-sun]')?.getAttribute('data-cx') ?? null;
  const a = read();
  requestAnimationFrame(() => requestAnimationFrame(() => done([a, read()])));
}));

test('reduced motion: nothing animates on load, the Sun is drawn at its place at once, and Play still steps', async ({ page }) => {
  const errors = watchErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHz(page);
  await expect(page.getByTestId('hz-sun')).toHaveAttribute('data-settled', 'true');
  await expect(page.getByTestId('hz-hero')).toHaveAttribute('data-run', 'settled');
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  const [a, b] = await sunTwoFrames(page);
  expect(a).not.toBeNull();
  expect(b).toBe(a);
  // Nothing moves on its own: still the same a second later.
  await page.waitForTimeout(1000);
  expect(await page.getByTestId('hz-sun').getAttribute('data-cx')).toBe(a);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);

  // Play: a stepped slider. The time jumps in coarse steps on the 10-minute grid, Sun and clock follow.
  const slider = page.getByLabel('Time in the stay');
  const clock0 = await page.getByTestId('hz-clock').textContent();
  await page.getByTestId('hz-play').click();
  await expect.poll(async () => Number(await slider.inputValue()), { timeout: 10_000 }).toBeGreaterThan(0);
  const t1_s = Number(await slider.inputValue());
  expect(t1_s % 600).toBe(0);
  await expect.poll(async () => page.getByTestId('hz-sun').getAttribute('data-cx'), { timeout: 10_000 }).not.toBe(a);
  await expect.poll(async () => page.getByTestId('hz-clock').textContent()).not.toBe(clock0);
  await page.getByTestId('hz-play').click();
  await expect(page.getByTestId('hz-play')).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  expect(errors).toEqual([]);
});

test('load motion: the Sun runs in along its path and settles; the call fades in with it; a new date runs it again', async ({ page }) => {
  await openHz(page);
  const sun = page.getByTestId('hz-sun');
  await expect(sun).toHaveAttribute('data-settled', 'true', { timeout: 5_000 });
  const settled = await sun.getAttribute('data-cx');
  expect(await page.getByTestId('verdict-word').evaluate((el) => getComputedStyle(el).animationName)).toBe('hz-call-in');
  // Time moving inside the stay does not rerun it.
  await page.locator('body').click({ position: { x: 2, y: 2 } });
  await page.keyboard.press('ArrowRight');
  await expect(sun).toHaveAttribute('data-settled', 'true');
  // A new date does: the run starts, then ends on the new position.
  await page.getByTestId('hz-date-button').click();
  const input = page.getByLabel('Start (UTC)');
  if (await input.count()) {
    await input.fill('2029-08-03T00:00');
    await input.dispatchEvent('change');
    await expect(page.getByTestId('hz-hero')).toHaveAttribute('data-run', 'running', { timeout: 60_000 });
    await expect(sun).toHaveAttribute('data-settled', 'true', { timeout: 5_000 });
    expect(await sun.getAttribute('data-cx')).not.toBe(settled);
  }
});

test('Play moves the Sun and both clocks; the strips are labelled; the clock is not a live region', async ({ page }) => {
  await openHz(page);
  await expect(page.getByTestId('hz-sun')).toHaveAttribute('data-settled', 'true', { timeout: 5_000 });
  const bar = page.locator('.hz-playbar');
  await expect(bar.getByText('Lit', { exact: true })).toBeVisible();
  await expect(bar.getByText('Contact', { exact: true })).toBeVisible();
  const clock = page.getByTestId('hz-clock');
  expect(await clock.evaluate((el) => el.tagName)).toBe('P');
  await expect(clock).toHaveAttribute('aria-live', 'off');
  const x0 = await page.getByTestId('hz-sun').getAttribute('data-cx');
  const c0 = await clock.textContent();
  const cd0 = await page.getByTestId('hz-contact').textContent();
  await page.getByTestId('hz-play').click();
  await expect.poll(async () => page.getByTestId('hz-sun').getAttribute('data-cx'), { timeout: 10_000 }).not.toBe(x0);
  await expect.poll(async () => clock.textContent(), { timeout: 10_000 }).not.toBe(c0);
  await expect.poll(async () => page.getByTestId('hz-contact').textContent(), { timeout: 10_000 }).not.toBe(cd0);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/horizon_polish_play.png` }).catch(() => undefined);
});

test('arrow keys on the Miss map pin move the pin, not the playhead', async ({ page }) => {
  await openHz(page, `${LINK}&view=miss`);
  const pin = page.getByTestId('miss-pin');
  await expect(pin).toBeVisible({ timeout: 90_000 });
  const slider = page.getByLabel('Time in the stay');
  const t0 = await slider.inputValue();
  const v0 = await pin.getAttribute('aria-valuenow');
  await pin.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect.poll(async () => pin.getAttribute('aria-valuenow')).not.toBe(v0);
  expect(await slider.inputValue()).toBe(t0);
  await expect(page.getByTestId('hz-play')).toHaveAttribute('aria-pressed', 'false');
});

test('focus rings: ink on the light ground, Sun on the sky', async ({ page }) => {
  await openHz(page);
  await page.getByTestId('hz-play').focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const ground = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const cs = getComputedStyle(el);
    return { id: el.getAttribute('data-testid'), color: cs.outlineColor, style: cs.outlineStyle };
  });
  expect(ground.id).toBe('hz-play');
  expect(ground.style).toBe('solid');
  expect(ground.color).toBe('rgb(23, 24, 26)');
  await page.getByTestId('hz-site-button').focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const sky = await page.evaluate(() => getComputedStyle(document.activeElement as HTMLElement).outlineColor);
  expect(sky).toBe('rgb(255, 210, 122)');
});

// ---- Second polish review and note 010 ----

test('the load run happens: the first frame with the Sun is already running, then it settles (no flicker)', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { runSeq: string[] };
    w.runSeq = [];
    const look = () => {
      const hero = document.querySelector('[data-testid=hz-hero]');
      if (!hero || !hero.querySelector('[data-testid=hz-sun]')) return;
      const v = hero.getAttribute('data-run') ?? '';
      if (w.runSeq[w.runSeq.length - 1] !== v) w.runSeq.push(v);
    };
    new MutationObserver(look).observe(document, { subtree: true, childList: true, attributes: true });
  });
  await openHz(page);
  await expect(page.getByTestId('hz-hero')).toHaveAttribute('data-run', 'settled', { timeout: 10_000 });
  const seq = await page.evaluate(() => (window as unknown as { runSeq: string[] }).runSeq);
  expect(seq[0]).toBe('running');
  expect(seq).toContain('settled');
});

test('arrow keys on a scrollable table scroll it and leave the playhead alone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openHz(page, `${LINK}&view=miss`);
  const region = page.getByRole('region', { name: /Shares by miss radius/ });
  await expect(region).toBeVisible({ timeout: 90_000 });
  const slider = page.getByLabel('Time in the stay');
  const t0 = await slider.inputValue();
  // The table fits at 375 px; narrow its region so it has to scroll sideways, as on a smaller phone.
  await region.evaluate((el) => { (el as HTMLElement).style.maxWidth = '200px'; });
  expect(await region.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await region.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  expect(await slider.inputValue()).toBe(t0);
  await expect(page.getByTestId('hz-play')).toHaveAttribute('aria-pressed', 'false');
});

test('the Barlow faces are loaded and the call is set in Barlow Condensed', async ({ page }) => {
  await openHz(page);
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.evaluate(() => document.fonts.check('700 1em "Barlow Condensed"'))).toBe(true);
  const ff = await page.getByTestId('verdict-word').evaluate((el) => getComputedStyle(el).fontFamily);
  expect(ff.replace(/["']/g, '')).toMatch(/^Barlow Condensed/);
  const loaded = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/["']/g, '')));
  expect(loaded).toContain('Barlow Condensed');
});

test('Sun and Earth labels do not touch at 375 px on the default link', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openHz(page);
  await expect(page.getByTestId('hz-hero')).toHaveAttribute('data-run', 'settled', { timeout: 10_000 });
  const boxes = await page.evaluate(() => ['sun', 'earth'].map((k) => {
    const r = document.querySelector(`[data-testid=hz-${k}-label]`)!.getBoundingClientRect();
    return { x0: r.left, x1: r.right, y0: r.top, y1: r.bottom };
  }));
  const [a, b] = boxes;
  const touch = a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  expect(touch).toBe(false);
});

test('a Sun below the horizon gets a marker on the horizon line with how far below', async ({ page }) => {
  await openHz(page, 'site=im2_athena_target&start=2027-01-01T00:00Z&days=14&preset=robotic');
  await expect(page.getByTestId('hz-hero')).toHaveAttribute('data-run', 'settled', { timeout: 10_000 });
  const marker = page.getByTestId('hz-sun-below');
  await expect(marker).toHaveAttribute('data-text', 'Sun 2.1° below');
  await expect(marker.locator('text')).toHaveText('Sun 2.1° below');
  // The disc itself is under the terrain, so its own label is not drawn.
  await expect(page.getByTestId('hz-sun')).toHaveAttribute('data-label', 'none');
});

test('the site list is grouped under plain headings, with custom coordinates reachable', async ({ page }) => {
  await openHz(page);
  await page.getByTestId('hz-site-button').click();
  const dlg = page.getByTestId('site-map-picker');
  await expect(dlg).toBeVisible();
  const heads = await dlg.locator('[data-testid=site-group] h3').allTextContents();
  expect(heads.slice(0, 4)).toEqual(['South pole candidates', 'Commercial landers', 'Apollo', 'Other countries']);
  await expect(dlg.locator('[data-group=Apollo]').getByRole('button', { name: /Apollo 11/ })).toBeVisible();
  await expect(dlg.locator('[data-group="Commercial landers"]').getByRole('button', { name: /Athena target/ })).toBeVisible();
  await expect(dlg.getByRole('heading', { name: 'Custom latitude and longitude' })).toBeVisible();
  await dlg.getByTestId('site-custom-jump').click();
  await expect(dlg.getByLabel('Latitude (°, south negative)')).toBeFocused();
});

test('play-bar strips: the off fill is ink, so lit and contact runs stand out (3:1 or more)', async ({ page }) => {
  await openHz(page);
  const fill = await page.locator('.hz-strip-contact rect').first().evaluate((el) => getComputedStyle(el).fill);
  expect(fill).toBe('rgb(23, 24, 26)');
});
