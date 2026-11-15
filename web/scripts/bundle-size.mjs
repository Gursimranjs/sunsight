// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// First-load budget: report raw and gzip sizes of the built JS/CSS and fail if the first-load
// JavaScript (entry chunk + engine worker) exceeds the budget. Run after `vite build`.
// Also reports the Sun and Earth table bytes a first load fetches: one year file (two when the stay crosses
// a new year), not the whole 2027-2030 table (review note 004). tests/e2e/yearly_table.spec.ts measures the
// whole first load in a browser.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
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
const data = new URL('../dist/data/', import.meta.url).pathname;
if (existsSync(data + 'manifest.json')) {
  const eph = JSON.parse(readFileSync(data + 'manifest.json', 'utf8')).files.ephemeris;
  const full = statSync(data + eph.bin).size;
  if (eph.years) {
    const sizes = eph.years.map((y) => statSync(data + y.bin).size);
    const two = Math.max(...sizes.slice(1).map((b, i) => b + sizes[i]));
    console.log(`Ephemeris on first load: one year file, at most ${Math.max(...sizes)} bytes (${eph.years.map((y, i) => `${y.year}: ${sizes[i]}`).join(', ')}); ` +
      `at most ${two} bytes when the stay crosses a new year. The whole ${eph.bin} (${full} bytes) is not fetched.`);
  } else {
    console.log(`Ephemeris on first load: the whole ${eph.bin}, ${full} bytes (no year files in the manifest).`);
  }
}
if (firstLoad / 1024 > BUDGET_FIRST_LOAD_JS_GZIP_KB) {
  console.error('First-load JavaScript is over budget.');
  process.exit(1);
}
