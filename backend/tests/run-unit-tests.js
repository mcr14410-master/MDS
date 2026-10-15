/**
 * Startet alle schnellen Tests ohne Datenbank (tests/test-*.js)
 * Ausführen: npm test   (im Ordner backend/)
 * test-api.js braucht ein laufendes Backend und ist ausgenommen.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const EXCLUDE = new Set(['test-api.js']);
const dir = __dirname;
const files = fs.readdirSync(dir)
  .filter(f => /^test-.*\.js$/.test(f) && !EXCLUDE.has(f))
  .sort();

let failed = 0;
for (const f of files) {
  console.log(`\n▶ ${f}`);
  const r = spawnSync(process.execPath, [path.join(dir, f)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}

console.log(`\n${files.length - failed}/${files.length} Testdateien bestanden`);
process.exit(failed ? 1 : 0);
