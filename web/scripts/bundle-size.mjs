// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// First-load budget: report raw and gzip sizes of the built JS/CSS and fail if either interface's first-load
// JavaScript exceeds the budget. Run after `vite build`.
// Each interface (classic, horizon; review note 009) is a dynamic chunk of the entry. Its first load is the
// entry chunk, the interface's own chunk, every chunk those import statically (followed transitively), and the
// engine worker. Chunks reached only through a dynamic import() (Three.js, the game, the pickers, the views the
// horizon interface opens on demand, the other interface) are lazy and not counted.
// Also reports the Sun and Earth table bytes a first load fetches: one year file (two when the stay crosses
// a new year), not the whole 2027-2030 table (review note 004). tests/e2e/yearly_table.spec.ts measures the
// whole first load in a browser.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BUDGET_FIRST_LOAD_JS_GZIP_KB = 60;
const dist = new URL('../dist/', import.meta.url).pathname;
const dir = dist + 'assets/';
const UIS = [{ ui: 'classic', chunk: /^App-[\w-]+\.js$/ }, { ui: 'horizon', chunk: /^HorizonApp-[\w-]+\.js$/ }];

const names = readdirSync(dir).sort();
const gz = new Map();
const rows = [];
for (const name of names) {
  const buf = readFileSync(dir + name);
  const g = gzipSync(buf, { level: 9 }).length;
  gz.set(name, g);
  rows.push([name, buf.length, g]);
}
const js = (name) => readFileSync(dir + name, 'utf8');
/** Chunks a chunk imports statically: `import … from"./x.js"`, `import"./x.js"`, `export … from"./x.js"` (not import()). */
const staticDeps = (name) => [...js(name).matchAll(/\b(?:import|export)\s*(?:[^"'();]*?\bfrom\s*)?["']\.\/([\w.-]+\.js)["']/g)].map((m) => m[1]);
/** Workers a chunk starts: `new URL("…/assets/worker-x.js", import.meta.url)`. */
const workers = (name) => [...js(name).matchAll(/new URL\(\s*["'][^"']*?([\w.-]*worker[\w.-]*\.js)["']/g)].map((m) => m[1]);
function closure(roots) {
  const seen = new Set();
  const visit = (n) => {
    if (seen.has(n) || !existsSync(dir + n)) return;
    seen.add(n);
    for (const d of staticDeps(n)) visit(d);
    for (const w of workers(n)) visit(w);
  };
  roots.forEach(visit);
  return seen;
}

const html = readFileSync(dist + 'index.html', 'utf8');
const entry = html.match(/<script[^>]*type="module"[^>]*src="[^"]*\/assets\/([\w.-]+\.js)"/)?.[1];
if (!entry) { console.error('Could not find the entry script in dist/index.html.'); process.exit(1); }

const firstLoad = UIS.map(({ ui, chunk }) => {
  const own = names.find((n) => chunk.test(n));
  if (!own) { console.error(`No ${ui} interface chunk (${chunk}) in dist/assets.`); process.exit(1); }
  const files = [...closure([entry, own])].sort();
  const bytes = files.reduce((a, f) => a + gz.get(f), 0);
  return { ui, files, bytes };
});
const anyFirst = new Set(firstLoad.flatMap((f) => f.files));

console.log(rows.map(([name, raw, g]) => {
  const tag = !/\.js$/.test(name) ? '' : anyFirst.has(name)
    ? `  (first load: ${firstLoad.filter((f) => f.files.includes(name)).map((f) => f.ui).join(', ')})` : '  (lazy)';
  return `${name.padEnd(32)} ${(raw / 1024).toFixed(1).padStart(7)} kB  gzip ${(g / 1024).toFixed(1).padStart(6)} kB${tag}`;
}).join('\n'));
for (const f of firstLoad) {
  console.log(`First-load JS (gzip), ${f.ui} interface: ${(f.bytes / 1024).toFixed(1)} kB, budget ${BUDGET_FIRST_LOAD_JS_GZIP_KB} kB (${f.files.join(', ')})`);
}
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
const over = firstLoad.filter((f) => f.bytes / 1024 > BUDGET_FIRST_LOAD_JS_GZIP_KB);
if (over.length) {
  console.error(`First-load JavaScript is over budget: ${over.map((f) => f.ui).join(', ')}.`);
  process.exit(1);
}
