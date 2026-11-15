// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Note 009, M2 "Land it yourself". Until the horizon shell mounts the game, this file starts its own Vite
// dev server and plays the game on the temporary test-only page src/horizon/game/devMount.html (real data
// from public/data). Key check: the game's verdict for a chosen point equals the Miss map's verdict for it.
// The dev page rewrites the address bar without game_pt, as the app does: the shared-link test proves the
// game reads game_pt on its first render.
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

const WEB = new URL('../../', import.meta.url).pathname;
const PORT = Number(process.env.SUNSIGHT_GAME_DEV_PORT ?? 4352);
const PAGE = `http://localhost:${PORT}/src/horizon/game/devMount.html`;
const DEFAULT = 'site=shackleton_ridge_rim&start=2029-07-24T00:00Z&preset=crew';
const SHOTS = process.env.SUNSIGHT_GAME_SHOTS;

test.describe.configure({ mode: 'serial' });
let server: ViteDevServer | null = null;

test.beforeAll(async () => {
  server = await createServer({
    root: WEB, configFile: WEB + 'vite.config.ts', logLevel: 'error',
    server: { port: PORT, strictPort: true },
    optimizeDeps: { include: ['preact', 'preact/hooks', 'preact/jsx-runtime'] },
  });
  await server.listen();
});
test.afterAll(async () => { await server?.close(); });

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

async function waitResult(page: Page, n: number) {
  await expect(page.getByTestId('game-try-list').locator('li')).toHaveCount(n, { timeout: 90_000 });
  await expect(page.getByTestId('game-result')).toBeVisible({ timeout: 30_000 });
  const r = page.getByTestId('game-result');
  return { id: (await r.getAttribute('data-point-id'))!, verdict: (await r.getAttribute('data-verdict'))! };
}

test('three landings, then the whole ground: each landing has the Miss map verdict for its point', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(`${PAGE}?${DEFAULT}`);
  await expect(page.getByTestId('game-brief')).toHaveText(
    /^You are landing a crew for 6\.5 days on .+ on 24 July 2029\. Pick your spot within \d+ m of the target\.$/, { timeout: 60_000 });
  await expect(page.getByTestId('game-robustness-label')).toContainText('A robustness share, not a landing probability');
  // No pass/fail marks before the reveal.
  await expect(page.getByTestId('game-map-point')).toHaveCount(0);

  // Try 1: keyboard reticle.
  const reticle = page.getByTestId('game-reticle');
  await reticle.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');
  const aimed = await reticle.getAttribute('aria-valuetext');
  await page.keyboard.press('Enter');
  const t1 = await waitResult(page, 1);
  expect(aimed).toContain(`grid point ${t1.id}`);
  // One live region, always there, now holding the result and the distance.
  await expect(page.getByTestId('game-live')).toHaveAttribute('role', 'status');
  await expect(page.getByTestId('game-live')).toHaveText(/^(Mission holds for all 6\.5 days|Power lost .+|Out of contact for .+ on day \d+)\. Landed (on the target|\d+ m from the target)\.$/);
  await expect(page.getByTestId('game-result-line')).toHaveText(/^(Mission holds for all 6\.5 days|Power lost .+|Out of contact for .+ on day \d+)$/);
  await expect(page.getByTestId('game-distance')).toContainText(/m from the target|on the target/);
  await expect(page.getByTestId('game-replay')).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/game_result.png`, fullPage: true });

  // Try 2: click the map left of the centre. Try 3: click near the bottom.
  const map = page.getByTestId('game-map');
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.5);
  const t2 = await waitResult(page, 2);
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.75);
  const t3 = await waitResult(page, 3);
  await expect(page.getByTestId('game-tries')).toContainText('No tries left.');

  // Note 011 item 7: the whole ground is shown without a further click, with one line above the map.
  const held = [t1, t2, t3].filter((t) => t.verdict !== 'no-go').length;
  await expect(page.getByTestId('game-share-line')).toHaveText(
    new RegExp(`^${held} of your 3 landings held\\. Within 250 m, \\d+% of the ground holds\\.$`), { timeout: 120_000 });
  const lineBox = (await page.getByTestId('game-share-line').boundingBox())!;
  expect(lineBox.y + lineBox.height).toBeLessThanOrEqual((await map.boundingBox())!.y + 1);
  await expect(page.getByTestId('game-robustness-label')).toBeVisible();
  // The button stays, for keyboard users who want to see the reveal again; it moves focus to the line.
  await expect(page.getByTestId('game-show-ground')).toHaveText('Show the whole ground again');
  await page.getByTestId('game-show-ground').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('game-share-line')).toBeFocused();
  // The reveal fades in; with reduced motion the same marks have no animation at all (polish review #5).
  const revealAnim = () => page.locator('.hz-game-reveal').first().evaluate((el) => getComputedStyle(el).animationName);
  expect(await revealAnim()).toBe('hz-game-fade');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await revealAnim()).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // Legend and a text alternative with the counts; the reticle now says whether its point holds.
  await expect(page.getByTestId('game-legend')).toContainText('Holds');
  await expect(page.getByTestId('game-map')).toHaveAttribute('aria-label',
    /^Map of \d+ landing points\. \d+ hold, \d+ fail\. Sun at touchdown at azimuth \d+°, Earth at azimuth \d+°, marked on the \d+ m ring\.$/);
  await expect(page.getByTestId('game-reticle')).toHaveAttribute('aria-valuetext', /, (holds|fails)$/);
  for (const t of [t1, t2, t3]) {
    await expect(page.locator(`[data-testid="game-map-point"][data-point-id="${t.id}"]`)).toHaveAttribute('data-verdict', t.verdict);
  }
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/game_reveal.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test('a shared link lands on the same point; Athena\'s target switches the ground; reduced motion has no drop', async ({ page }) => {
  const errors = watchErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${PAGE}?${DEFAULT}`);
  const map = page.getByTestId('game-map');
  await expect(map).toBeVisible({ timeout: 60_000 });
  const box = (await map.boundingBox())!;
  // Watch the dropping lander from the moment it is mounted: with reduced motion it must not animate.
  await page.evaluate(() => {
    const w = window as unknown as { dropSeen: { anim: string; n: number }[] };
    w.dropSeen = [];
    const look = () => {
      const el = document.querySelector('.hz-game-lander.dropping');
      if (el && !w.dropSeen.length) w.dropSeen.push({ anim: getComputedStyle(el).animationName, n: document.getAnimations().length });
    };
    new MutationObserver(look).observe(document.body, { subtree: true, childList: true, attributes: true });
  });
  await page.mouse.click(box.x + box.width * 0.62, box.y + box.height * 0.4);
  // During the drop: the lander is there, with no CSS animation and no Web Animations on the page.
  await expect.poll(() => page.evaluate(() => (window as unknown as { dropSeen: unknown[] }).dropSeen.length)).toBe(1);
  expect(await page.evaluate(() => (window as unknown as { dropSeen: unknown[] }).dropSeen[0])).toEqual({ anim: 'none', n: 0 });
  const t = await waitResult(page, 1);
  const link = await page.getByTestId('game-share-link').inputValue();
  expect(new URL(link).searchParams.get('game_pt')).toBe(t.id);
  // Reduced motion: the replay ends at once and nothing animates (no CSS or Web Animations at all).
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await expect(page.getByTestId('game-replay')).toBeVisible();

  await page.goto(link);
  const t2 = await waitResult(page, 1);
  expect(t2).toEqual(t);

  await page.getByTestId('game-athena').click();
  await expect(page.getByTestId('game-brief')).toContainText('Athena', { timeout: 60_000 });
  // Focus is put back on the reticle of the new ground.
  await expect(page.getByTestId('game-reticle')).toBeFocused();
  await expect(page.getByTestId('game-brief')).toContainText('24 July 2029');
  await expect(page.getByTestId('game-try-list')).toHaveCount(0);
  await page.getByTestId('game-reticle').focus();
  await page.keyboard.press('Enter');
  await waitResult(page, 1);
  expect(errors).toEqual([]);
});
