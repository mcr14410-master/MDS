/**
 * Integrations-Tests: Bauteil-Dokumente im Browser ansehen (/view, inline) mit Path-Traversal-Schutz
 * (Befund 08.11.2026: Vorschau für Bauteil-Dokumente).
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
const docs = require('../../src/controllers/partDocumentsController');

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
  download(p) { this.downloaded = p; return this; },
});
const call = async (fn, req) => { const res = fakeRes(); await fn(req, res); return res; };

(async () => {
  const partId = (await pool.query(
    "INSERT INTO parts (part_number, part_name, revision) VALUES ('TEIL-0041', 'Testteil Ansicht', 'A') RETURNING id")).rows[0].id;
  const otherPartId = (await pool.query(
    "INSERT INTO parts (part_number, part_name, revision) VALUES ('TEIL-0042', 'Anderes Teil', 'A') RETURNING id")).rows[0].id;
  const dir = path.join(__dirname, '../../uploads/part-documents', String(partId));
  await fs.mkdir(dir, { recursive: true });
  const abs = path.join(dir, 'zeichnung.pdf');
  await fs.writeFile(abs, '%PDF-1.4');
  const addDoc = async (filePath, mime = 'application/pdf') => (await pool.query(
    `INSERT INTO part_documents (part_id, original_filename, stored_filename, file_path, mime_type, document_type)
     VALUES ($1, 'zeichnung.pdf', 'zeichnung.pdf', $2, $3, 'drawing') RETURNING id`, [partId, filePath, mime])).rows[0].id;
  const docId = await addDoc(abs);

  await test('Ansicht liefert die Datei inline mit Dateityp', async () => {
    const res = await call(docs.viewDocument, { params: { partId, documentId: docId } });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.file, abs);
    assert.equal(res.headers['content-type'], 'application/pdf');
    assert.match(res.headers['content-disposition'], /^inline/);
  });

  await test('Dokument eines anderen Bauteils: 404', async () => {
    const res = await call(docs.viewDocument, { params: { partId: otherPartId, documentId: docId } });
    assert.equal(res.statusCode, 404);
  });

  await test('Pfad außerhalb von uploads: 403', async () => {
    const boese = await addDoc('/etc/passwd', 'text/plain');
    const res = await call(docs.viewDocument, { params: { partId, documentId: boese } });
    assert.equal(res.statusCode, 403);
    assert.equal(res.file, undefined);
  });

  await fs.rm(dir, { recursive: true, force: true });
  console.log(`\n${passed} Tests bestanden`);
  await pool.end();
})().catch(err => { console.error(err); process.exit(1); });
