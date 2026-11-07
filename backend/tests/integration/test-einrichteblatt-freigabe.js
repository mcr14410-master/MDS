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
const workflow = require('../../src/controllers/workflowController');

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

  const state = {};
  for (const r of (await pool.query('SELECT id, name FROM workflow_states')).rows) state[r.name] = r.id;
  const wechsel = (id, ziel, changeReason) => call(workflow.changeWorkflowState, {
    body: { entityType: 'setup_sheet', entityId: id, toStateId: state[ziel], changeReason }, user,
  });
  const freigeben = async (id) => {
    for (const ziel of ['review', 'approved', 'released']) {
      const res = await wechsel(id, ziel);
      assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    }
    return holeBlatt(id);
  };
  const staende = async (id) => (await pool.query(
    'SELECT * FROM setup_sheet_versions WHERE setup_sheet_id = $1 ORDER BY id', [id])).rows;

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

  await test('Freigabe legt Stand an und setzt Zeiger', async () => {
    const { id } = await neuesBlatt({ reference_point: 'Mitte' });
    const blatt = await freigeben(id);
    assert.equal(blatt.workflow_state, 'released');
    const v = await staende(id);
    assert.equal(v.length, 1);
    assert.equal(v[0].version_number, 1);
    assert.equal(v[0].kind, 'release');
    assert.equal(v[0].created_by, adminId);
    assert.equal(v[0].snapshot.fields.reference_point, 'Mitte');
    assert.equal(blatt.released_version_id, v[0].id);
  });

  await test('Stand enthält Fotos, Spannmittel und Vorrichtungen', async () => {
    const { id } = await neuesBlatt();
    await pool.query(
      `INSERT INTO setup_sheet_photos (setup_sheet_id, file_path, file_name, file_size, mime_type, caption, uploaded_by)
       VALUES ($1, 'uploads/setup-sheets/x/a.jpg', 'a.jpg', 10, 'image/jpeg', 'Bild', $2)`, [id, adminId]);
    const device = (await pool.query(
      `INSERT INTO clamping_devices (inventory_number, name, type_id)
       VALUES ('S-T2', 'Spanner', (SELECT id FROM clamping_device_types LIMIT 1)) RETURNING id`)).rows[0].id;
    const fixture = (await pool.query(
      `INSERT INTO fixtures (fixture_number, type_id)
       VALUES ('V-T2', (SELECT id FROM fixture_types LIMIT 1)) RETURNING id`)).rows[0].id;
    await pool.query('INSERT INTO setup_sheet_clamping_devices (setup_sheet_id, clamping_device_id, quantity) VALUES ($1, $2, 2)', [id, device]);
    await pool.query('INSERT INTO setup_sheet_fixtures (setup_sheet_id, fixture_id, quantity) VALUES ($1, $2, 1)', [id, fixture]);
    await freigeben(id);
    const [v] = await staende(id);
    assert.equal(v.snapshot.photos[0].caption, 'Bild');
    assert.equal(v.snapshot.clamping_devices[0].clamping_device_id, device);
    assert.equal(v.snapshot.clamping_devices[0].quantity, 2);
    assert.equal(v.snapshot.fixtures[0].fixture_id, fixture);
    assert.equal(v.snapshot.photos[0].id, undefined);
  });

  await test('Nächste Freigabe zählt den Stand hoch', async () => {
    const { id } = await neuesBlatt();
    await freigeben(id);
    await pool.query("UPDATE setup_sheets SET workflow_state_id = $1 WHERE id = $2", [state.draft, id]);
    const blatt = await freigeben(id);
    const v = await staende(id);
    assert.deepEqual(v.map(x => x.version_number), [1, 2]);
    assert.equal(blatt.released_version_id, v[1].id);
  });

  await test('Ungültiger Schritt beim Blatt wird abgelehnt', async () => {
    const { id } = await neuesBlatt();
    const res = await wechsel(id, 'released');
    assert.equal(res.statusCode, 409);
    assert.equal((await holeBlatt(id)).workflow_state, 'draft');
    assert.equal((await staende(id)).length, 0);
  });

  await test('Statuswechsel steht mit Grund im Ablauf', async () => {
    const { id } = await neuesBlatt();
    await wechsel(id, 'review', 'Bitte prüfen');
    const { rows } = await pool.query(
      "SELECT change_reason FROM workflow_history WHERE entity_type = 'setup_sheet' AND entity_id = $1", [id]);
    assert.deepEqual(rows.map(r => r.change_reason), ['Bitte prüfen']);
  });

  await test('Programm: Schritte bleiben wie bisher ungeprüft', async () => {
    const prog = (await pool.query(
      `INSERT INTO programs (operation_id, program_number, program_name, workflow_state_id)
       VALUES ($1, 'TEIL-0010-9', 'Test', $2) RETURNING id`, [opId, state.draft])).rows[0].id;
    const res = await call(workflow.changeWorkflowState, {
      body: { entityType: 'program', entityId: prog, toStateId: state.released }, user,
    });
    assert.equal(res.statusCode, 200);
  });

  console.log(`\n${passed} Tests bestanden`);
  await pool.end();
})().catch(err => { console.error(err); process.exit(1); });
