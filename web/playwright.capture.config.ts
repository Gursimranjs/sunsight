// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Screenshots and raw journey clips for docs/submission (not part of `make e2e`). Run: `make capture`.
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.SUNSIGHT_CAPTURE_PORT ?? 4184);

export default defineConfig({
  testDir: 'tests/capture',
  timeout: 300_000,
  expect: { timeout: 90_000 },
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}/sunsight/`,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 } }],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/sunsight/`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
