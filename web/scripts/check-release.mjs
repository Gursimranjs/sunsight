// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Release builds must not contain fixture data (AGENTS.md hard rule 5).
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../public/data/', import.meta.url).pathname;
const bad = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.startsWith('fixture_')) bad.push(p.slice(root.length));
  }
})(root);
if (bad.length) {
  console.error('Release build refused: fixture data present:\n  ' + bad.join('\n  '));
  process.exit(1);
}
console.log('Release check: no fixture data.');
