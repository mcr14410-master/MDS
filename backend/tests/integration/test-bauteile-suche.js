/**
 * Integrations-Tests: Suche auf der Bauteile-Seite findet auch Kunden-Zeichnungsnummer
 * und Zeichnungsnummer (Befund Nutzer 09.11.2026).
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
  const customerId = (await pool.query(
    "INSERT INTO customers (name, customer_number) VALUES ('Testkunde Suche', 'KD00002') RETURNING id")).rows[0].id;
  await pool.query(`
    INSERT INTO parts (customer_id, part_number, part_name, revision, customer_part_number, drawing_number, created_by)
    VALUES ($1, 'TEIL-0101', 'Halter Suche', 'A', 'KZN-4711-03', 'ZN-0815', $2),
           ($1, 'TEIL-0102', 'Deckel Suche', 'A', NULL, NULL, $2)`, [customerId, adminId]);

  const suche = async (search) => {
    const res = await call(parts.getAllParts, { query: { search, customer_id: String(customerId) }, user: { id: adminId } });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    return res.body.parts.map(p => p.part_number).sort();
  };

  await test('Suche nach Kunden-Zeichnungsnummer (Teilstück, Groß/klein egal)', async () => {
    assert.deepEqual(await suche('kzn-4711'), ['TEIL-0101']);
  });

  await test('Suche nach Zeichnungsnummer', async () => {
    assert.deepEqual(await suche('ZN-0815'), ['TEIL-0101']);
  });

  await test('Suche nach Bauteilnummer und Bezeichnung wie bisher', async () => {
    assert.deepEqual(await suche('TEIL-0102'), ['TEIL-0102']);
    assert.deepEqual(await suche('Suche'), ['TEIL-0101', 'TEIL-0102']);
  });

  console.log(`\n${passed} Tests bestanden`);
  await pool.end();
})().catch(err => { console.error(err); process.exit(1); });
