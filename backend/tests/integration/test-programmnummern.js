/**
 * Integrations-Test: Programmnummern nach Schema (docs/konzepte/PROGRAMMNUMMERN_STUFE1_SPEC.md)
 * Zähler je Bauteil und Art, keine Neuvergabe nach dem Löschen, Varianten, Eindeutigkeit, Sperre ab Freigabe.
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
const programs = require('../../src/controllers/programsController');
const { assignProgramNumber } = require('../../src/utils/programNumber');

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

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mds-prognr-'));
let fileNo = 0;
function tempFile() {
  const p = path.join(tmpDir, `upload-${++fileNo}.h`);
  fs.writeFileSync(p, `BEGIN PGM ${fileNo} MM\nEND PGM ${fileNo} MM\n`);
  return { filename: path.basename(p), path: p, size: fs.statSync(p).size, mimetype: 'text/plain' };
}

(async () => {
  const adminId = (await pool.query("SELECT id FROM users WHERE username = 'admin'")).rows[0].id;
  const draftId = (await pool.query("SELECT id FROM workflow_states WHERE name = 'draft'")).rows[0].id;

  const part = async (nr) => (await pool.query(
    "INSERT INTO parts (part_number, part_name) VALUES ($1, 'Testteil Programmnummern') RETURNING id", [nr])).rows[0].id;
  const operation = async (partId, opNumber, variantGroup = null) => (await pool.query(
    `INSERT INTO operations (part_id, op_number, op_name, variant_group_id) VALUES ($1, $2, 'Fräsen', $3) RETURNING id`,
    [partId, opNumber, variantGroup])).rows[0].id;

  // NC-Programm wie über das Upload-Formular
  const createNc = (operationId, programNumber) => call(programs.createProgram, {
    file: tempFile(),
    body: { operation_id: operationId, program_name: 'Test', ...(programNumber !== undefined ? { program_number: programNumber } : {}) },
    user: { id: adminId },
  });
  // Messprogramm: gleiche Vergabe wie createCmmProgram, ohne Dateigruppe
  async function createCmm(operationId, requested) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const nr = await assignProgramNumber(client, { operationId, kind: 'cmm', requested });
      await client.query(
        `INSERT INTO programs (operation_id, program_number, program_name, workflow_state_id, kind)
         VALUES ($1, $2, 'Messen', $3, 'cmm')`, [operationId, nr, draftId]);
      await client.query('COMMIT');
      return nr;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
  const update = (id, body) => call(programs.updateProgram, { params: { id }, body: { program_name: 'Test', ...body }, user: { id: adminId } });
  const suggest = (operationId, kind) => call(programs.suggestNumber, { query: { operation_id: String(operationId), kind } });

  const partA = await part('KD00000-00011');
  const opA = await operation(partA, 'OP10');
  const opA2 = await operation(partA, 'OP20');

  await test('Erstes NC-Programm -1, erstes Messprogramm -M1 (getrennte Zähler)', async () => {
    const r = await createNc(opA);
    assert.equal(r.statusCode, 201, JSON.stringify(r.body));
    assert.equal(r.body.data.program_number, 'KD00000-00011-1');
    assert.equal(await createCmm(opA), 'KD00000-00011-M1');
  });

  await test('Zähler je Bauteil, nicht je Arbeitsgang', async () => {
    const r = await createNc(opA2);
    assert.equal(r.body.data.program_number, 'KD00000-00011-2');
  });

  await test('Vorschlag verbraucht keine Nummer', async () => {
    const s1 = await suggest(opA, 'nc');
    const s2 = await suggest(opA, 'nc');
    assert.equal(s1.body.data.program_number, 'KD00000-00011-3');
    assert.equal(s2.body.data.program_number, 'KD00000-00011-3');
    assert.equal((await suggest(opA, 'cmm')).body.data.program_number, 'KD00000-00011-M2');
  });

  await test('Höchstes gelöscht → nächste Nummer wird nicht neu vergeben', async () => {
    const r = await createNc(opA);
    assert.equal(r.body.data.program_number, 'KD00000-00011-3');
    await pool.query('DELETE FROM programs WHERE id = $1', [r.body.data.id]);
    assert.equal((await createNc(opA)).body.data.program_number, 'KD00000-00011-4');
  });

  await test('Von Hand -7 → nächstes automatisch -8', async () => {
    const r = await createNc(opA, 'KD00000-00011-7');
    assert.equal(r.statusCode, 201, JSON.stringify(r.body));
    assert.equal((await createNc(opA)).body.data.program_number, 'KD00000-00011-8');
  });

  await test('Von Hand eine fremde Nummer: zählt nicht mit', async () => {
    assert.equal((await createNc(opA, 'ALT-4711')).statusCode, 201);
    assert.equal((await createNc(opA)).body.data.program_number, 'KD00000-00011-9');
  });

  await test('Doppelte Nummer → 409 mit Bauteil und Arbeitsgang, auch bei anderer Schreibweise', async () => {
    const r = await createNc(opA2, 'kd00000-00011-1');
    assert.equal(r.statusCode, 409);
    assert.match(r.body.error, /schon vergeben \(KD00000-00011 OP10\)/);
    const partB = await part('KD00000-00012');
    const opB = await operation(partB, 'OP10');
    assert.equal((await createNc(opB, 'KD00000-00011-M1')).statusCode, 409);
  });

  await test('Variante: Nummer aus der Gruppe übernehmen, Messen getrennt', async () => {
    const partV = await part('KD00000-00013');
    const group = (await pool.query('SELECT gen_random_uuid() AS g')).rows[0].g;
    const g350 = await operation(partV, 'OP10', group);
    const c22 = await operation(partV, 'OP10', group);
    assert.equal((await createNc(g350)).body.data.program_number, 'KD00000-00013-1');
    assert.equal((await createNc(g350)).body.data.program_number, 'KD00000-00013-2');
    assert.equal((await suggest(c22, 'nc')).body.data.program_number, 'KD00000-00013-1');
    assert.equal((await createNc(c22)).body.data.program_number, 'KD00000-00013-1');
    assert.equal((await createNc(c22)).body.data.program_number, 'KD00000-00013-2');
    // alle übernommen → neue Nummer vom Zähler
    assert.equal((await createNc(c22)).body.data.program_number, 'KD00000-00013-3');
    // gleiche Nummer im selben Arbeitsgang bleibt verboten
    assert.equal((await createNc(c22, 'KD00000-00013-1')).statusCode, 409);
    // Messprogramm in der Variante bekommt keine NC-Nummer
    assert.equal(await createCmm(c22), 'KD00000-00013-M1');
  });

  await test('Ändern im Entwurf ok, nach erster Freigabe 409', async () => {
    const r = await createNc(opA);
    const id = r.body.data.id;
    const ok = await update(id, { program_number: 'KD00000-00011-20' });
    assert.equal(ok.statusCode, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.data.program_number, 'KD00000-00011-20');
    assert.equal((await createNc(opA)).body.data.program_number, 'KD00000-00011-21');

    const rev = (await pool.query('SELECT current_revision_id FROM programs WHERE id = $1', [id])).rows[0].current_revision_id;
    await pool.query('UPDATE programs SET released_revision_id = $1 WHERE id = $2', [rev, id]);
    const locked = await update(id, { program_number: 'KD00000-00011-22' });
    assert.equal(locked.statusCode, 409);
    assert.match(locked.body.error, /seit der ersten Freigabe fest/);
    // Name ändern geht weiter, Nummer gleich mitschicken auch
    const rename = await update(id, { program_number: 'KD00000-00011-20', program_name: 'Neu' });
    assert.equal(rename.statusCode, 200);
    assert.equal(rename.body.data.program_name, 'Neu');
  });

  await test('Ändern auf eine vergebene Nummer → 409, eigene Nummer → ok', async () => {
    const r = await createNc(opA);
    const id = r.body.data.id;
    assert.equal((await update(id, { program_number: 'KD00000-00011-1' })).statusCode, 409);
    assert.equal((await update(id, { program_number: r.body.data.program_number })).statusCode, 200);
    assert.equal((await update(id, {})).body.data.program_number, r.body.data.program_number);
  });

  await test('Gleichzeitige Anlagen bekommen verschiedene Nummern', async () => {
    const partC = await part('KD00000-00014');
    const opC = await operation(partC, 'OP10');
    const results = await Promise.all([1, 2, 3, 4].map(() => createNc(opC)));
    const numbers = results.map(r => r.body.data.program_number).sort();
    assert.deepEqual(numbers, ['KD00000-00014-1', 'KD00000-00014-2', 'KD00000-00014-3', 'KD00000-00014-4']);
  });

  await test('Bauteilnummer geändert → neues Präfix, Zähler läuft weiter', async () => {
    const partD = await part('KD00000-00015');
    const opD = await operation(partD, 'OP10');
    assert.equal((await createNc(opD)).body.data.program_number, 'KD00000-00015-1');
    await pool.query("UPDATE parts SET part_number = 'KD00000-00016' WHERE id = $1", [partD]);
    assert.equal((await createNc(opD)).body.data.program_number, 'KD00000-00016-2');
  });

  await test('Lange Bauteilnummer: Hinweis ab 24 Zeichen, über 50 von Hand vergeben', async () => {
    const partL = await part('KUNDE-ZEICHNUNG-0001-000');
    const opL = await operation(partL, 'OP10');
    const s = await suggest(opL, 'nc');
    assert.equal(s.body.data.program_number, 'KUNDE-ZEICHNUNG-0001-000-1');
    assert.equal(s.body.data.hints.length, 1);
    const partXL = await part('X'.repeat(49));
    const opXL = await operation(partXL, 'OP10');
    const r = await createNc(opXL);
    assert.equal(r.statusCode, 400);
    assert.match(r.body.error, /von Hand vergeben/);
    assert.equal((await createNc(opXL, 'KURZ-1')).statusCode, 201);
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(`\n${passed} Tests bestanden`);
  await pool.end();
})();
