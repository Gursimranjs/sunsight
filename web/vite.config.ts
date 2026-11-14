// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
import { readFileSync, statSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';

/**
 * Development only: with SUNSIGHT_FIXTURE=1 the dev server answers /data/* from the made-up
 * fixture set in tests/fixtures/data (manifest.json then 404s, so the app loads fixture_manifest.json
 * and shows the fixture banner). Never part of a build: fixtures stay out of public/data.
 */
function fixtureData(): Plugin {
  const root = new URL('./tests/fixtures/data/', import.meta.url).pathname;
  return {
    name: 'sunsight-fixture-data',
    apply: 'serve',
    configureServer(server) {
      if (process.env.SUNSIGHT_FIXTURE !== '1') return;
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0];
        if (!path.startsWith('/data/')) return next();
        const rel = normalize(decodeURIComponent(path.slice('/data/'.length)));
        const file = join(root, rel);
        try {
          if (rel.startsWith('..') || !statSync(file).isFile()) throw new Error('not a file');
          res.setHeader('Content-Type', file.endsWith('.json') ? 'application/json' : 'application/octet-stream');
          res.end(readFileSync(file));
        } catch {
          res.statusCode = 404;
          res.end('not found');
        }
      });
    },
  };
}

// The site is served from https://<user>.github.io/sunsight/, so production builds use that base path.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? (process.env.SUNSIGHT_BASE ?? '/sunsight/') : '/',
  plugins: [preact(), fixtureData()],
  build: { target: 'es2022', sourcemap: false },
  worker: { format: 'es' },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
}));
