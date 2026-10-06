// Baut dist/NC-Viewer.html: bündelt app.js (+ three.js) und bettet hh.js,
// occt-import-js und dessen WASM (Base64) ein -> eine Datei, läuft offline.
// Aufruf:  npm install  &&  npm run build
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const occtDir = dirname(require.resolve('occt-import-js'));

const res = await build({
  entryPoints: [join(here, 'src/app.js')], bundle: true, format: 'iife',
  minify: true, target: 'es2020', write: false, logLevel: 'warning'
});
const app = res.outputFiles[0].text;
const safe = s => s.replace(/<\/script/gi, '<\\/script');

let html = readFileSync(join(here, 'src/template.html'), 'utf8');
const parts = {
  '/*HH*/': readFileSync(join(here, 'src/hh.js'), 'utf8'),
  '/*OCCT*/': readFileSync(join(occtDir, 'occt-import-js.js'), 'utf8'),
  '/*WASM*/': readFileSync(join(occtDir, 'occt-import-js.wasm')).toString('base64'),
  '/*APP*/': app
};
for (const [k, v] of Object.entries(parts)) {
  if (!html.includes(k)) throw new Error('Platzhalter fehlt in template.html: ' + k);
  html = html.replace(k, () => safe(v));
}
mkdirSync(join(here, 'dist'), { recursive: true });
writeFileSync(join(here, 'dist/NC-Viewer.html'), html);
console.log('dist/NC-Viewer.html geschrieben (' + (html.length / 1e6).toFixed(1) + ' MB)');
