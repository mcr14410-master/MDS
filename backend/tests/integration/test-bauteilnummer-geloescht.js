/**
 * Integrations-Tests: Bauteilnummern gelöschter Bauteile bleiben vergeben
 * (Befund 09.11.2026: „# Auto“ schlug die Nummer eines gelöschten Bauteils vor,
 * Anlegen scheiterte mit der rohen Meldung zu parts_part_number_key).
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
    "INSERT INTO customers (name, customer_number) VALUES ('Testkunde Nummern', 'KD00001') RETURNING id")).rows[0].id;

  const anlegen = (part_number) => {
    const body = { customer_id: customerId, part_name: 'Testteil Nummer', revision: 'A' };
    if (part_number) body.part_number = part_number;
    return call(parts.createPart, { body, user });
  };
  const loeschen = (id) => call(parts.deletePart, { params: { id }, user });

  // Ausgangslage: KD00001-00001 aktiv, KD00001-00002 gelöscht (höchste Nummer)
  const erstes = await anlegen();
  assert.equal(erstes.statusCode, 201, JSON.stringify(erstes.body));
  assert.equal(erstes.body.part.part_number, 'KD00001-00001');
  const zweites = await anlegen();
  assert.equal(zweites.body.part.part_number, 'KD00001-00002');
  assert.equal((await loeschen(zweites.body.part.id)).statusCode, 200);

  await test('„# Auto“ überspringt die Nummer eines gelöschten Bauteils', async () => {
    const res = await call(parts.generatePartNumber, { body: { customer_id: customerId }, user });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.part_number, 'KD00001-00003');
  });

  await test('Anlegen ohne Nummer vergibt die nächste freie, nicht die gelöschte', async () => {
    const res = await anlegen();
    assert.equal(res.statusCode, 201, JSON.stringify(res.body));
    assert.equal(res.body.part.part_number, 'KD00001-00003');
  });

  await test('Anlegen mit der Nummer eines gelöschten Bauteils: 409 mit Hinweis', async () => {
    const res = await anlegen('KD00001-00002');
    assert.equal(res.statusCode, 409, JSON.stringify(res.body));
    assert.match(res.body.error, /gelöscht/);
  });

  await test('Ändern auf die Nummer eines gelöschten Bauteils: 409 mit Hinweis', async () => {
    const res = await call(parts.updatePart, {
      params: { id: erstes.body.part.id }, body: { part_number: 'KD00001-00002' }, user,
    });
    assert.equal(res.statusCode, 409, JSON.stringify(res.body));
    assert.match(res.body.error, /gelöscht/);
  });

  await test('Anlegen mit der Nummer eines aktiven Bauteils: 409 wie bisher', async () => {
    const res = await anlegen('KD00001-00001');
    assert.equal(res.statusCode, 409);
    assert.match(res.body.error, /existiert bereits/);
  });

  console.log(`\n${passed} Tests bestanden`);
  await pool.end();
})().catch(err => { console.error(err); process.exit(1); });
