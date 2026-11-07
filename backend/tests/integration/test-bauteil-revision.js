/**
 * Integrations-Tests: Revision des Bauteils ist Pflicht und wird nie still mit „A“ belegt
 * (Befund 08.11.2026, ROADMAP „Offene Fixes“).
 * Läuft nur über tests/integration/run.js (Wegwerf-Datenbank).
 */
if (!(process.env.DB_NAME || '').includes('test')) {
  console.error('Abbruch: nur gegen eine Test-Datenbank (DB_NAME mit „test“) – Aufruf über tests/integration/run.js');
  process.exit(1);
}

const assert = require('node:assert/strict');
const pool = require('../../src/config/db');
const parts = require('../../src/controllers/partsController');

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
  const customerId = (await pool.query(
    "INSERT INTO customers (name, customer_number) VALUES ('Testkunde Revision', 'KD00000') RETURNING id")).rows[0].id;
  let n = 0;
  const anlegen = (revision) => {
    n++;
    const body = { customer_id: customerId, part_number: `TEIL-00${30 + n}`, part_name: 'Testteil Revision' };
    if (revision !== undefined) body.revision = revision;
    return call(parts.createPart, { body, user });
  };
  const revisionVon = async (id) => (await pool.query('SELECT revision FROM parts WHERE id = $1', [id])).rows[0].revision;

  await test('Anlegen ohne Revision: 400, kein „A“', async () => {
    const res = await anlegen(undefined);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /Revision/);
  });

  await test('Anlegen mit leerer Revision: 400', async () => {
    assert.equal((await anlegen('   ')).statusCode, 400);
  });

  await test('Anlegen mit Revision speichert sie (getrimmt)', async () => {
    const res = await anlegen(' B ');
    assert.equal(res.statusCode, 201, JSON.stringify(res.body));
    assert.equal(await revisionVon(res.body.part.id), 'B');
  });

  await test('Ändern: leere Revision 400, fehlendes Feld bleibt, neue Revision gilt', async () => {
    const { id } = (await anlegen('C')).body.part;
    const leer = await call(parts.updatePart, { params: { id }, body: { revision: '' }, user });
    assert.equal(leer.statusCode, 400);
    assert.equal(await revisionVon(id), 'C');
    const ohne = await call(parts.updatePart, { params: { id }, body: { part_name: 'Neu' }, user });
    assert.equal(ohne.statusCode, 200, JSON.stringify(ohne.body));
    assert.equal(await revisionVon(id), 'C');
    const neu = await call(parts.updatePart, { params: { id }, body: { revision: 'D' }, user });
    assert.equal(neu.statusCode, 200);
    assert.equal(await revisionVon(id), 'D');
  });

  console.log(`\n${passed} Tests bestanden`);
  await pool.end();
})().catch(err => { console.error(err); process.exit(1); });
