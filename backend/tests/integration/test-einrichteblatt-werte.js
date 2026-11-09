/**
 * Integrations-Tests: Einrichteblatt-Werte – Preset/Nullpunkt 0 beim Anlegen, Notizen und
 * Bildunterschrift leerbar (Befunde 07.11.2026, ROADMAP „Offene Fixes“).
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
  const machineId = (await pool.query("INSERT INTO machines (name) VALUES ('Werte-Maschine') RETURNING id")).rows[0].id;
  const partId = (await pool.query(
    "INSERT INTO parts (part_number, part_name) VALUES ('TEIL-0030', 'Testteil Werte') RETURNING id")).rows[0].id;
  const opId = (await pool.query(
    "INSERT INTO operations (part_id, op_number, op_name, machine_id) VALUES ($1, 'OP10', 'Fräsen', $2) RETURNING id",
    [partId, machineId])).rows[0].id;

  await test('Anlegen mit Preset 0 und Nullpunkt 0 speichert 0 (nicht leer)', async () => {
    const res = await call(sheets.createSetupSheet, {
      body: { operation_id: opId, preset_number: 0, wcs_x: 0, wcs_y: 0, wcs_z: 0 }, user });
    assert.equal(res.statusCode, 201, JSON.stringify(res.body));
    const row = (await pool.query(
      'SELECT preset_number, wcs_x::float AS x, wcs_y::float AS y, wcs_z::float AS z FROM setup_sheets WHERE id = $1',
      [res.body.data.id])).rows[0];
    assert.deepEqual(row, { preset_number: 0, x: 0, y: 0, z: 0 });
  });

  const sheetId = (await call(sheets.createSetupSheet, { body: { operation_id: opId }, user })).body.data.id;

  const device = (await pool.query(
    `INSERT INTO clamping_devices (inventory_number, name, type_id)
     VALUES ('S-W1', 'Spanner W1', (SELECT id FROM clamping_device_types LIMIT 1)) RETURNING id`)).rows[0].id;
  const clampingId = (await pool.query(
    `INSERT INTO setup_sheet_clamping_devices (setup_sheet_id, clamping_device_id, quantity, notes)
     VALUES ($1, $2, 2, 'Backen weich') RETURNING id`, [sheetId, device])).rows[0].id;
  const fixture = (await pool.query(
    `INSERT INTO fixtures (fixture_number, type_id) VALUES ('V-W1', (SELECT id FROM fixture_types LIMIT 1)) RETURNING id`)).rows[0].id;
  const fixtureId = (await pool.query(
    `INSERT INTO setup_sheet_fixtures (setup_sheet_id, fixture_id, quantity, notes)
     VALUES ($1, $2, 1, 'Anschlag links') RETURNING id`, [sheetId, fixture])).rows[0].id;
  const photoId = (await pool.query(
    `INSERT INTO setup_sheet_photos (setup_sheet_id, file_path, file_name, file_size, mime_type, uploaded_by, caption)
     VALUES ($1, 'x/foto.jpg', 'foto.jpg', 1, 'image/jpeg', $2, 'Ansicht vorne') RETURNING id`, [sheetId, adminId])).rows[0].id;

  const wert = async (table, col, id) => (await pool.query(`SELECT ${col} AS v FROM ${table} WHERE id = $1`, [id])).rows[0].v;

  for (const [label, fn, table, col, id, quantityCol] of [
    ['Spannmittel-Notiz', sheets.updateClampingDevice, 'setup_sheet_clamping_devices', 'notes', clampingId, true],
    ['Vorrichtungs-Notiz', sheets.updateFixture, 'setup_sheet_fixtures', 'notes', fixtureId, true],
    ['Bildunterschrift', sheets.updatePhoto, 'setup_sheet_photos', 'caption', photoId, false],
  ]) {
    const params = table === 'setup_sheet_photos' ? { id: sheetId, photoId: id } : { id: sheetId, itemId: id };
    await test(`${label}: fehlt im Request → bleibt`, async () => {
      const before = await wert(table, col, id);
      const body = quantityCol ? { quantity: 3 } : { sort_order: 2 };
      const res = await call(fn, { params, body, user });
      assert.equal(res.statusCode, 200, JSON.stringify(res.body));
      assert.equal(await wert(table, col, id), before);
    });
    await test(`${label}: null leert`, async () => {
      const res = await call(fn, { params, body: { [col]: null }, user });
      assert.equal(res.statusCode, 200, JSON.stringify(res.body));
      assert.equal(await wert(table, col, id), null);
    });
    await test(`${label}: neuer Text gilt, '' leert`, async () => {
      await call(fn, { params, body: { [col]: 'neu' }, user });
      assert.equal(await wert(table, col, id), 'neu');
      await call(fn, { params, body: { [col]: '' }, user });
      assert.equal(await wert(table, col, id), null);
    });
  }

  await test('Menge und Reihenfolge bleiben, wenn nur die Notiz geändert wird', async () => {
    await call(sheets.updateClampingDevice, { params: { id: sheetId, itemId: clampingId }, body: { notes: 'x' }, user });
    assert.equal(await wert('setup_sheet_clamping_devices', 'quantity', clampingId), 3);
  });

  console.log(`\n${passed} Tests bestanden`);
  await pool.end();
})().catch(err => { console.error(err); process.exit(1); });
