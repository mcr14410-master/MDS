/**
 * Integrations-Tests: Messprogramm-Probelauf ohne Arbeitsgang (Altbestand-Import, Spec 8).
 * Der Helfer prüft die Dateien, bevor er Bauteil und Arbeitsgang anlegt.
 * Läuft nur über tests/integration/run.js (Wegwerf-Datenbank).
 */
if (!(process.env.DB_NAME || '').includes('test')) {
  console.error('Abbruch: nur gegen eine Test-Datenbank (DB_NAME mit „test“) – Aufruf über tests/integration/run.js');
  process.exit(1);
}

const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const pool = require('../../src/config/db');
const cmm = require('../../src/controllers/cmmProgramsController');

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

const fakeRes = () => ({ statusCode: 200, status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } });
const call = async (fn, req) => { const res = fakeRes(); await fn(req, res); return res; };

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mds-probelauf-'));
let fileNo = 0;
// Temporäre Datei wie von multer: der Controller räumt sie beim Probelauf selbst weg
function upload(originalname, content = 'x') {
  const p = path.join(tmpDir, `upload-${++fileNo}`);
  fs.writeFileSync(p, content);
  return { originalname, path: p, size: fs.statSync(p).size, mimetype: 'application/octet-stream' };
}
const LAYOUT = '<?xml version="1.0" encoding="utf-8"?><Layout></Layout>';

(async () => {
  const adminId = (await pool.query("SELECT id FROM users WHERE username = 'admin'")).rows[0].id;
  const user = { id: adminId, username: 'admin' };
  const dryRun = (files, body = {}) => call(cmm.createCmmProgram, { query: { dry_run: 'true' }, body, files, user });

  await test('Probelauf ohne Arbeitsgang mit .prg ist gültig', async () => {
    const r = await dryRun({ files: [upload('TEIL-0050.prg')] });
    assert.equal(r.statusCode, 200, JSON.stringify(r.body));
    assert.equal(r.body.data.valid, true, JSON.stringify(r.body.data.errors));
  });

  await test('Probelauf ohne Arbeitsgang nur mit .cad meldet Fehler', async () => {
    const r = await dryRun({ files: [upload('TEIL-0050.cad')] });
    assert.equal(r.statusCode, 200, JSON.stringify(r.body));
    assert.equal(r.body.data.valid, false);
    assert.ok(r.body.data.errors.length > 0);
  });

  await test('Probelauf ohne Arbeitsgang erkennt vergebenen Vorlagennamen', async () => {
    const partId = (await pool.query(
      "INSERT INTO parts (part_number, part_name, revision) VALUES ('TEIL-0051', 'Testteil Probelauf', 'A') RETURNING id")).rows[0].id;
    const opId = (await pool.query(
      "INSERT INTO operations (part_id, op_number, op_name) VALUES ($1, 'OP90', 'Messen') RETURNING id", [partId])).rows[0].id;
    const first = await call(cmm.createCmmProgram, {
      query: {},
      body: { operation_id: opId, program_name: 'Erstes' },
      files: { files: [upload('TEIL-0051.prg')], template_files: [upload('KD00000_TEIL-0051_A.xlsx'), upload('KD00000_TEIL-0051_A.layout.xml', LAYOUT)] },
      user,
    });
    assert.equal(first.statusCode, 201, JSON.stringify(first.body));
    const r = await dryRun({
      files: [upload('TEIL-0052.prg')],
      template_files: [upload('KD00000_TEIL-0051_A.xlsx'), upload('KD00000_TEIL-0051_A.layout.xml', LAYOUT)],
    });
    assert.equal(r.body.data.valid, false);
    assert.ok(r.body.data.errors.some(e => /Vorlagenname/.test(e)), JSON.stringify(r.body.data.errors));
  });

  await test('Ohne Probelauf bleibt der Arbeitsgang Pflicht', async () => {
    const r = await call(cmm.createCmmProgram, {
      query: {}, body: { program_name: 'Ohne Arbeitsgang' }, files: { files: [upload('TEIL-0053.prg')] }, user,
    });
    assert.equal(r.statusCode, 400);
  });

  console.log(`\n${passed} Tests bestanden`);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  await pool.end();
})();
