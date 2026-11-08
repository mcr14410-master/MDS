/**
 * Tests für Dateinamen mit Umlauten beim Hochladen (utils/multer.js)
 * multer/busboy liefern `originalname` als latin1 – der Helfer rechnet vor Filter und Speicherung um.
 * Ausführen: node backend/tests/test-upload-filename.js
 */
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// Kleiner Server, der die Middleware eines Tests ausführt und das Ergebnis als JSON zurückgibt
async function post(middleware, files, field = 'file') {
  const app = express();
  app.post('/u', middleware, (req, res) => {
    const list = req.file ? [req.file] : Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat();
    res.json({ names: list.map(f => f.originalname), extra: req.extra || null });
  });
  app.use((err, req, res, next) => res.status(400).json({ error: err.message })); // eslint-disable-line no-unused-vars
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  try {
    const form = new FormData();
    for (const [name, f = field] of files.map(x => (Array.isArray(x) ? x : [x]))) form.append(f, new Blob(['x']), name);
    const res = await fetch(`http://127.0.0.1:${server.address().port}/u`, { method: 'POST', body: form });
    return { status: res.status, body: await res.json() };
  } finally {
    server.close();
  }
}

(async () => {
  const multer = require('../src/utils/multer');

  console.log('\nHochladen: Dateinamen mit Umlauten');

  await test('decodeOriginalName: latin1 → UTF-8, ASCII und schon korrekte Namen bleiben', () => {
    assert.equal(multer.decodeOriginalName(Buffer.from('Rückseite.jpg').toString('latin1')), 'Rückseite.jpg');
    assert.equal(multer.decodeOriginalName('Rueckseite.jpg'), 'Rueckseite.jpg');
    assert.equal(multer.decodeOriginalName('Prüf.pdf'), 'Prüf.pdf');
  });

  await test('single + Arbeitsspeicher: Name mit Umlauten und ß', async () => {
    const upload = multer({ storage: multer.memoryStorage() });
    const r = await post(upload.single('file'), ['Rückseite Größe ß.jpg']);
    assert.deepEqual(r.body.names, ['Rückseite Größe ß.jpg'], JSON.stringify(r));
  });

  await test('array + Festplatte: Filter und Dateiname sehen schon den richtigen Namen', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mds-upload-'));
    const seen = [];
    const upload = multer({
      storage: multer.diskStorage({
        destination: dir,
        filename: (req, file, cb) => { seen.push(`speichern:${file.originalname}`); cb(null, `${Date.now()}-${seen.length}.bin`); },
      }),
      fileFilter: (req, file, cb) => {
        seen.push(`filter:${file.originalname}`);
        cb(null, !file.originalname.startsWith('Übersprungen'));
      },
    });
    const r = await post(upload.array('files'), ['Bohrung Ø12.pdf', 'Übersprungen.pdf', 'plain.pdf'], 'files');
    fs.rmSync(dir, { recursive: true, force: true });
    assert.deepEqual(r.body.names, ['Bohrung Ø12.pdf', 'plain.pdf'], JSON.stringify(r));
    assert.ok(seen.includes('filter:Übersprungen.pdf'), seen.join('|'));
    assert.ok(seen.includes('speichern:Bohrung Ø12.pdf'), seen.join('|'));
  });

  await test('fields: mehrere Felder', async () => {
    const upload = multer({ storage: multer.memoryStorage() });
    const r = await post(upload.fields([{ name: 'a' }, { name: 'b' }]), [['Ä.txt', 'a'], ['ö.txt', 'b']]);
    assert.deepEqual(r.body.names.sort(), ['Ä.txt', 'ö.txt'], JSON.stringify(r));
  });

  await test('Ablehnung durch den eigenen Filter bleibt ein Fehler', async () => {
    const upload = multer({ storage: multer.memoryStorage(), fileFilter: (req, file, cb) => cb(new Error(`nicht erlaubt: ${file.originalname}`)) });
    const r = await post(upload.single('file'), ['Maß.exe']);
    assert.equal(r.status, 400);
    assert.equal(r.body.error, 'nicht erlaubt: Maß.exe');
  });

  await test('MulterError, diskStorage und memoryStorage wie bei multer', () => {
    assert.equal(multer.MulterError, require('multer').MulterError);
    assert.equal(typeof multer.diskStorage, 'function');
    assert.equal(typeof multer.memoryStorage, 'function');
  });

  await test('Kein Modul unter src/ lädt multer direkt (nur utils/multer.js)', () => {
    const offenders = [];
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      const p = path.join(d, e.name);
      if (e.isDirectory()) return walk(p);
      if (!p.endsWith('.js') || p.endsWith(path.join('utils', 'multer.js'))) return;
      if (/require\(\s*['"]multer['"]\s*\)/.test(fs.readFileSync(p, 'utf8'))) offenders.push(path.relative(path.join(__dirname, '..'), p));
    });
    walk(path.join(__dirname, '../src'));
    assert.deepEqual(offenders, []);
  });

  console.log(`\n${passed} Tests bestanden`);
})();
