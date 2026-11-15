// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Note 009, M2 "Land it yourself". Until the horizon shell mounts the game, this file starts its own Vite
// dev server and plays the game on the temporary test-only page src/horizon/game/devMount.html (real data
// from public/data). Key check: the game's verdict for a chosen point equals the Miss map's verdict for it.
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

  await page.getByTestId('game-show-ground').click();
  await expect(page.getByTestId('game-share-line')).toHaveText(/^Within 250 m, \d+% of the ground holds\.$/, { timeout: 120_000 });
  await expect(page.getByTestId('game-robustness-label')).toBeVisible();
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
  await page.mouse.click(box.x + box.width * 0.62, box.y + box.height * 0.4);
  const t = await waitResult(page, 1);
  const link = await page.getByTestId('game-share-link').inputValue();
  expect(new URL(link).searchParams.get('game_pt')).toBe(t.id);
  // Reduced motion: the replay ends at once and nothing animates.
  const anim = await page.getByTestId('game-lander').first().evaluate((el) => getComputedStyle(el).animationName);
  expect(anim).toBe('none');

  await page.goto(link);
  const t2 = await waitResult(page, 1);
  expect(t2).toEqual(t);

  await page.getByTestId('game-athena').click();
  await expect(page.getByTestId('game-brief')).toContainText('Athena', { timeout: 60_000 });
  await expect(page.getByTestId('game-brief')).toContainText('24 July 2029');
  await expect(page.getByTestId('game-try-list')).toHaveCount(0);
  await page.getByTestId('game-reticle').focus();
  await page.keyboard.press('Enter');
  await waitResult(page, 1);
  expect(errors).toEqual([]);
});
