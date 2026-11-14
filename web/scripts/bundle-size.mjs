// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// First-load budget: report raw and gzip sizes of the built JS/CSS and fail if the first-load
// JavaScript (entry chunk + engine worker) exceeds the budget. Run after `vite build`.
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BUDGET_FIRST_LOAD_JS_GZIP_KB = 60;
const dir = new URL('../dist/assets/', import.meta.url).pathname;
let firstLoad = 0;
const rows = [];
for (const name of readdirSync(dir).sort()) {
  const buf = readFileSync(dir + name);
  const gz = gzipSync(buf, { level: 9 }).length;
  const lazy = /^Scene3D-/.test(name); // Three.js: only fetched when the 3D tab opens
  if (/\.js$/.test(name) && !lazy) firstLoad += gz;
  rows.push(`${name.padEnd(28)} ${(buf.length / 1024).toFixed(1).padStart(7)} kB  gzip ${(gz / 1024).toFixed(1).padStart(6)} kB${lazy ? '  (lazy)' : ''}`);
}
console.log(rows.join('\n'));
console.log(`First-load JS (gzip): ${(firstLoad / 1024).toFixed(1)} kB, budget ${BUDGET_FIRST_LOAD_JS_GZIP_KB} kB`);
if (firstLoad / 1024 > BUDGET_FIRST_LOAD_JS_GZIP_KB) {
  console.error('First-load JavaScript is over budget.');
  process.exit(1);
}
