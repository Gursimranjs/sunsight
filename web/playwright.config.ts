// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// End-to-end tests run against `vite preview` of the built site (base path /sunsight/).
// `make e2e` builds first. Browsers: `npx playwright install chromium` (downloads to the user cache).
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.SUNSIGHT_E2E_PORT ?? 4183);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/sunsight/`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/sunsight/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
