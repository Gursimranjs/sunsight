// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';

export interface SiteRow { id: string; name: string; miss_target_id: string | null; terrain_id: string | null }

/** The sites the built site ships (dist is a copy of public/data). */
export function shippedSites(): SiteRow[] {
  const dir = new URL('../../public/data/', import.meta.url).pathname;
  const m = JSON.parse(readFileSync(dir + 'manifest.json', 'utf8')) as { files: { sites: string; miss?: { id: string }[] } };
  const s = JSON.parse(readFileSync(dir + m.files.sites, 'utf8')) as { sites: SiteRow[] };
  const grids = new Set((m.files.miss ?? []).map((x) => x.id));
  return s.sites.map((x) => ({ ...x, miss_target_id: x.miss_target_id && grids.has(x.miss_target_id) ? x.miss_target_id : null }));
}

/** Collects console errors and page errors from the moment it is called. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

/** Opens the classic interface (explicit ?ui=classic, so it stays classic whatever the default interface is). */
export async function openApp(page: Page, query = '') {
  await page.goto(`./?${query ? query + '&' : ''}ui=classic`);
  await expect(page.getByTestId('verdict-word')).toBeVisible();
}

export async function tab(page: Page, name: string) {
  await page.getByRole('tab', { name }).click();
}
