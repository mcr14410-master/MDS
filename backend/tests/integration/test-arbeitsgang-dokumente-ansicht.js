/**
 * Integrations-Tests: Arbeitsgang-Dokumente im Browser ansehen (/view, inline) mit Path-Traversal-Schutz
 * (Wunsch 08.11.2026: Vorschau wie bei Bauteil- und Maschinen-Dokumenten).
 * Läuft nur über tests/integration/run.js (Wegwerf-Datenbank).
 */
if (!(process.env.DB_NAME || '').includes('test')) {
  console.error('Abbruch: nur gegen eine Test-Datenbank (DB_NAME mit „test“) – Aufruf über tests/integration/run.js');
  process.exit(1);
}

const assert = require('node:assert/strict');
const fs = require('fs').promises;
const path = require('path');
const pool = require('../../src/config/db');
const docs = require('../../src/controllers/operationDocumentsController');

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

const fakeRes = () => ({
  statusCode: 200,
  headers: {},
  status(c) { this.statusCode = c; return this; },
  json(d) { this.body = d; return this; },
  setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
  sendFile(p) { this.file = p; return this; },
});
const call = async (fn, req) => { const res = fakeRes(); await fn(req, res); return res; };

(async () => {
  const partId = (await pool.query(
    "INSERT INTO parts (part_number, part_name, revision) VALUES ('TEIL-0043', 'Testteil AG-Dokumente', 'A') RETURNING id")).rows[0].id;
  const opId = (await pool.query(
    "INSERT INTO operations (part_id, op_number, op_name) VALUES ($1, 'OP10', 'Fräsen') RETURNING id", [partId])).rows[0].id;
  const dir = path.join(__dirname, '../../uploads/operation-documents', String(opId));
  await fs.mkdir(dir, { recursive: true });
  const abs = path.join(dir, 'aufspannung.png');
  await fs.writeFile(abs, 'bild');
  const addDoc = async (filePath, mime) => (await pool.query(
    `INSERT INTO operation_documents (operation_id, document_type, title, original_filename, stored_filename, file_path, file_size, mime_type)
     VALUES ($1, 'other', 'Aufspannung', 'aufspannung.png', 'aufspannung.png', $2, 4, $3) RETURNING id`, [opId, filePath, mime])).rows[0].id;
  const docId = await addDoc(abs, 'image/png');

  await test('Ansicht liefert die Datei inline mit Dateityp', async () => {
    const res = await call(docs.view, { params: { id: docId } });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.file, abs);
    assert.equal(res.headers['content-type'], 'image/png');
    assert.match(res.headers['content-disposition'], /^inline/);
  });

  await test('Unbekanntes Dokument: 404', async () => {
    assert.equal((await call(docs.view, { params: { id: 999999 } })).statusCode, 404);
  });

  await test('Pfad außerhalb des Dokumentenordners: 403', async () => {
    const boese = await addDoc('/etc/passwd', 'text/plain');
    const res = await call(docs.view, { params: { id: boese } });
    assert.equal(res.statusCode, 403);
    assert.equal(res.file, undefined);
  });

  await fs.rm(dir, { recursive: true, force: true });
  console.log(`\n${passed} Tests bestanden`);
  await pool.end();
})().catch(err => { console.error(err); process.exit(1); });
