// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// The site is served from https://<user>.github.io/sunsight/, so production builds use that base path.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? (process.env.SUNSIGHT_BASE ?? '/sunsight/') : '/',
  plugins: [preact()],
  build: { target: 'es2022', sourcemap: false },
  worker: { format: 'es' },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
}));
