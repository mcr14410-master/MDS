/**
 * Integrations-Tests: Gleicher OP-Code an einem Bauteil ist erlaubt (Befund 08.11.2026).
 * Der Unique-Constraint fiel mit Migration 1737000072000, der Controller prüfte trotzdem weiter.
 * Läuft nur über tests/integration/run.js (Wegwerf-Datenbank).
 */
if (!(process.env.DB_NAME || '').includes('test')) {
  console.error('Abbruch: nur gegen eine Test-Datenbank (DB_NAME mit „test“) – Aufruf über tests/integration/run.js');
  process.exit(1);
}

const assert = require('node:assert/strict');
const pool = require('../../src/config/db');
const operations = require('../../src/controllers/operationsController');

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
  const user = { id: adminId, username: 'admin' };
  const partId = (await pool.query(
    "INSERT INTO parts (part_number, part_name, revision) VALUES ('TEIL-0040', 'Testteil OP-Code', 'A') RETURNING id")).rows[0].id;
  const anlegen = (op_number, op_name) => call(operations.createOperation, { body: { part_id: partId, op_number, op_name }, user });

  await test('Zwei Arbeitsgänge mit gleichem OP-Code lassen sich anlegen', async () => {
    const a = await anlegen('CNC-M', 'Messen Seite 1');
    const b = await anlegen('CNC-M', 'Messen Seite 2');
    assert.equal(a.statusCode, 201, JSON.stringify(a.body));
    assert.equal(b.statusCode, 201, JSON.stringify(b.body));
    const { rows } = await pool.query("SELECT sequence FROM operations WHERE part_id = $1 AND op_number = 'CNC-M' ORDER BY id", [partId]);
    assert.equal(rows.length, 2);
    assert.notEqual(rows[0].sequence, rows[1].sequence);
  });

  await test('Ändern auf einen vorhandenen OP-Code ist erlaubt', async () => {
    const c = await anlegen('OP20', 'Fräsen');
    const res = await call(operations.updateOperation, { params: { id: c.body.data.id }, body: { op_number: 'CNC-M' }, user });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal((await pool.query('SELECT op_number FROM operations WHERE id = $1', [c.body.data.id])).rows[0].op_number, 'CNC-M');
  });

  console.log(`\n${passed} Tests bestanden`);
  await pool.end();
})().catch(err => { console.error(err); process.exit(1); });
