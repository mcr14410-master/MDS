/**
 * Integrations-Tests: Einrichteblatt mit Freigabe wie bei Programmen
 * (Spec docs/konzepte/EINRICHTEBLATT_FREIGABE_SPEC.md)
 * Läuft nur über tests/integration/run.js (Wegwerf-Datenbank).
 */
if (!(process.env.DB_NAME || '').includes('test')) {
  console.error('Abbruch: nur gegen eine Test-Datenbank (DB_NAME mit „test“) – Aufruf über tests/integration/run.js');
  process.exit(1);
}

const assert = require('node:assert/strict');
const pool = require('../../src/config/db');
const sheets = require('../../src/controllers/setupSheetsController');

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
  status(c) { this.statusCode = c; return this; },
  json(d) { this.body = d; return this; },
});
const call = async (fn, req) => { const res = fakeRes(); await fn(req, res); return res; };

(async () => {
  const adminId = (await pool.query("SELECT id FROM users WHERE username = 'admin'")).rows[0].id;
  const user = { id: adminId };
  const machineId = (await pool.query("INSERT INTO machines (name) VALUES ('Testmaschine') RETURNING id")).rows[0].id;
  const partId = (await pool.query(
    "INSERT INTO parts (part_number, part_name) VALUES ('TEIL-0010', 'Testteil Einrichteblatt') RETURNING id")).rows[0].id;
  const opId = (await pool.query(
    "INSERT INTO operations (part_id, op_number, op_name, machine_id) VALUES ($1, 'OP10', 'Fräsen', $2) RETURNING id",
    [partId, machineId])).rows[0].id;

  const neuesBlatt = async (body = {}) => {
    const res = await call(sheets.createSetupSheet, { body: { operation_id: opId, ...body }, user });
    assert.equal(res.statusCode, 201);
    return res.body.data;
  };
  const holeBlatt = async (id) => (await call(sheets.getSetupSheetById, { params: { id } })).body.data;

  await test('neues Blatt ist Entwurf, Status im Body zählt nicht', async () => {
    const sheet = await holeBlatt((await neuesBlatt({ status: 'released' })).id);
    assert.equal(sheet.workflow_state, 'draft');
  });

  await test('Liste filtert über den Status-Namen', async () => {
    await neuesBlatt();
    const res = await call(sheets.getSetupSheets, { query: { status: 'draft', operation_id: opId } });
    assert.ok(res.body.data.length >= 1);
    assert.ok(res.body.data.every(s => s.workflow_state === 'draft'));
    const leer = await call(sheets.getSetupSheets, { query: { status: 'released', operation_id: opId } });
    assert.equal(leer.body.data.length, 0);
  });

  await test('Status lässt sich nicht über das Formular setzen', async () => {
    const { id } = await neuesBlatt();
    const res = await call(sheets.updateSetupSheet, { params: { id }, body: { status: 'released' }, user });
    assert.equal(res.statusCode, 200);
    assert.equal((await holeBlatt(id)).workflow_state, 'draft');
  });

  console.log(`\n${passed} Tests bestanden`);
  await pool.end();
})().catch(err => { console.error(err); process.exit(1); });
