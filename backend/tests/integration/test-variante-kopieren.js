/**
 * Integrations-Tests: Variante anlegen mit „Einrichteblätter kopieren“ und „Prüfplan kopieren“
 * (Befund 05./07./08.11.2026: alle Kopierpfade schrieben in alte Spalten, Variante scheiterte).
 * Entscheidung Nutzer 09.11.2026: Prüfplan und Einrichteblatt (als Entwurf, ohne Programm) kopieren,
 * NC-Programme und Werkzeuglisten nicht (maschinenspezifisch).
 * Läuft nur über tests/integration/run.js (Wegwerf-Datenbank).
 */
if (!(process.env.DB_NAME || '').includes('test')) {
  console.error('Abbruch: nur gegen eine Test-Datenbank (DB_NAME mit „test“) – Aufruf über tests/integration/run.js');
  process.exit(1);
}

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
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
const BACKEND = path.join(__dirname, '..', '..');
const createdDirs = [];

(async () => {
  const adminId = (await pool.query("SELECT id FROM users WHERE username = 'admin'")).rows[0].id;
  const user = { id: adminId };
  const q1 = async (sql, params) => (await pool.query(sql, params)).rows[0];
  const machineA = (await q1("INSERT INTO machines (name) VALUES ('Fräse A') RETURNING id")).id;
  const machineB = (await q1("INSERT INTO machines (name) VALUES ('Fräse B') RETURNING id")).id;
  const machineC = (await q1("INSERT INTO machines (name) VALUES ('Fräse C') RETURNING id")).id;
  const partId = (await q1("INSERT INTO parts (part_number, part_name) VALUES ('TEIL-0090', 'Testteil Variante') RETURNING id")).id;
  const opId = (await q1(
    "INSERT INTO operations (part_id, op_number, op_name, machine_id) VALUES ($1, 'OP20', 'Fräsen', $2) RETURNING id",
    [partId, machineA])).id;
  const state = {};
  for (const r of (await pool.query('SELECT id, name FROM workflow_states')).rows) state[r.name] = r.id;

  // Ausgangslage: Programm, freigegebenes Einrichteblatt mit Spannmittel, Vorrichtung, Foto; Prüfplan mit 2 Merkmalen
  const progId = (await q1(
    `INSERT INTO programs (operation_id, program_number, program_name, workflow_state_id)
     VALUES ($1, 'TEIL-0090-1', 'Schruppen', $2) RETURNING id`, [opId, state.released])).id;
  const sheetId = (await q1(
    `INSERT INTO setup_sheets (operation_id, machine_id, program_id, preset_number, wcs_x, reference_point,
       setup_instructions, special_notes, workflow_state_id, created_by)
     VALUES ($1, $2, $3, 0, 12.5, 'Mitte Rohteil', 'Spannen auf 40 mm', 'Grat entfernen', $4, $5) RETURNING id`,
    [opId, machineA, progId, state.released, adminId])).id;
  const device = (await q1(
    `INSERT INTO clamping_devices (inventory_number, name, type_id)
     VALUES ('S-V1', 'Spanner V1', (SELECT id FROM clamping_device_types LIMIT 1)) RETURNING id`)).id;
  const deviceGone = (await q1(
    `INSERT INTO clamping_devices (inventory_number, name, type_id, deleted_at)
     VALUES ('S-V2', 'Spanner V2 alt', (SELECT id FROM clamping_device_types LIMIT 1), now()) RETURNING id`)).id;
  await pool.query(`INSERT INTO setup_sheet_clamping_devices (setup_sheet_id, clamping_device_id, quantity, notes, sort_order)
                    VALUES ($1, $2, 2, 'Backen weich', 1), ($1, $3, 1, NULL, 2)`, [sheetId, device, deviceGone]);
  const fixture = (await q1(
    `INSERT INTO fixtures (fixture_number, type_id) VALUES ('V-V1', (SELECT id FROM fixture_types LIMIT 1)) RETURNING id`)).id;
  await pool.query(`INSERT INTO setup_sheet_fixtures (setup_sheet_id, fixture_id, quantity, notes)
                    VALUES ($1, $2, 1, 'Anschlag links')`, [sheetId, fixture]);
  const srcDir = path.join(BACKEND, 'uploads', 'setup-sheets', String(sheetId));
  fs.mkdirSync(srcDir, { recursive: true }); createdDirs.push(srcDir);
  fs.writeFileSync(path.join(srcDir, '111-foto.jpg'), 'BILDDATEN');
  await pool.query(`INSERT INTO setup_sheet_photos (setup_sheet_id, file_path, file_name, file_size, mime_type, caption, photo_type, sort_order, uploaded_by)
                    VALUES ($1, $2, 'Aufspannung.jpg', 9, 'image/jpeg', 'Ansicht vorne', 'setup', 1, $3),
                           ($1, $4, 'Fehlt.jpg', 9, 'image/jpeg', NULL, 'general', 2, $3)`,
    [sheetId, `uploads/setup-sheets/${sheetId}/111-foto.jpg`, adminId, `uploads/setup-sheets/${sheetId}/fehlt.jpg`]);
  const planId = (await q1("INSERT INTO inspection_plans (operation_id, notes, created_by) VALUES ($1, 'Erstmuster 100 %', $2) RETURNING id", [opId, adminId])).id;
  await pool.query(`INSERT INTO inspection_plan_items (inspection_plan_id, sequence_number, measurement_description, nominal_value, min_value, max_value, measuring_tool)
                    VALUES ($1, 1, 'Bohrung Ø10 H7', 10, 10, 10.015, 'Messdorn'), ($1, 2, 'Länge 40 ±0,1', 40, 39.9, 40.1, 'Messschieber')`, [planId]);

  let variant;
  await test('Variante mit Einrichteblatt + Prüfplan: 201, NC-Programme/Werkzeuge ignoriert', async () => {
    const res = await call(operations.createVariant, {
      params: { id: String(opId) },
      body: { machine_id: machineB, copy_setup_sheets: true, copy_inspection_plans: true, copy_programs: true, copy_tools: true },
      user,
    });
    assert.equal(res.statusCode, 201, JSON.stringify(res.body));
    variant = res.body.data;
    assert.equal(variant.machine_id, machineB);
    assert.equal((await q1('SELECT count(*)::int AS n FROM programs WHERE operation_id = $1', [variant.id])).n, 0);
  });

  await test('Einrichteblatt: Entwurf, neue Maschine, ohne Programm, Werte übernommen (Preset 0 bleibt)', async () => {
    const rows = (await pool.query(
      `SELECT ss.*, ws.name AS ws FROM setup_sheets ss JOIN workflow_states ws ON ws.id = ss.workflow_state_id
       WHERE operation_id = $1`, [variant.id])).rows;
    assert.equal(rows.length, 1);
    const s = rows[0];
    assert.equal(s.ws, 'draft');
    assert.equal(s.machine_id, machineB);
    assert.equal(s.program_id, null);
    assert.equal(s.released_version_id, null);
    assert.equal(s.preset_number, 0);
    assert.equal(parseFloat(s.wcs_x), 12.5);
    assert.deepEqual([s.reference_point, s.setup_instructions, s.special_notes], ['Mitte Rohteil', 'Spannen auf 40 mm', 'Grat entfernen']);
  });

  await test('Spannmittel und Vorrichtung kopiert (gelöschtes Spannmittel nicht)', async () => {
    const newSheet = (await q1('SELECT id FROM setup_sheets WHERE operation_id = $1', [variant.id])).id;
    const cd = (await pool.query('SELECT clamping_device_id, quantity, notes FROM setup_sheet_clamping_devices WHERE setup_sheet_id = $1', [newSheet])).rows;
    assert.deepEqual(cd, [{ clamping_device_id: device, quantity: 2, notes: 'Backen weich' }]);
    const fx = (await pool.query('SELECT fixture_id, quantity, notes FROM setup_sheet_fixtures WHERE setup_sheet_id = $1', [newSheet])).rows;
    assert.deepEqual(fx, [{ fixture_id: fixture, quantity: 1, notes: 'Anschlag links' }]);
  });

  await test('Foto als eigene Datei im Ordner des neuen Blatts; fehlende Datei übersprungen', async () => {
    const newSheet = (await q1('SELECT id FROM setup_sheets WHERE operation_id = $1', [variant.id])).id;
    createdDirs.push(path.join(BACKEND, 'uploads', 'setup-sheets', String(newSheet)));
    const photos = (await pool.query('SELECT file_path, file_name, caption, photo_type, sort_order FROM setup_sheet_photos WHERE setup_sheet_id = $1', [newSheet])).rows;
    assert.equal(photos.length, 1);
    assert.match(photos[0].file_path, new RegExp(`^uploads/setup-sheets/${newSheet}/`));
    assert.deepEqual([photos[0].file_name, photos[0].caption, photos[0].photo_type, photos[0].sort_order], ['Aufspannung.jpg', 'Ansicht vorne', 'setup', 1]);
    assert.equal(fs.readFileSync(path.join(BACKEND, photos[0].file_path), 'utf8'), 'BILDDATEN');
  });

  await test('Prüfplan mit beiden Merkmalen kopiert', async () => {
    const plan = await q1('SELECT id, notes FROM inspection_plans WHERE operation_id = $1', [variant.id]);
    assert.equal(plan.notes, 'Erstmuster 100 %');
    const items = (await pool.query(
      'SELECT sequence_number, measurement_description, max_value::float AS max, measuring_tool FROM inspection_plan_items WHERE inspection_plan_id = $1 ORDER BY sequence_number', [plan.id])).rows;
    assert.deepEqual(items, [
      { sequence_number: 1, measurement_description: 'Bohrung Ø10 H7', max: 10.015, measuring_tool: 'Messdorn' },
      { sequence_number: 2, measurement_description: 'Länge 40 ±0,1', max: 40.1, measuring_tool: 'Messschieber' },
    ]);
  });

  await test('Original unverändert (Blatt freigegeben, Programm, Foto-Datei)', async () => {
    const s = await q1('SELECT program_id, workflow_state_id FROM setup_sheets WHERE id = $1', [sheetId]);
    assert.deepEqual([s.program_id, s.workflow_state_id], [progId, state.released]);
    assert.ok(fs.existsSync(path.join(srcDir, '111-foto.jpg')));
  });

  await test('Variante ohne Haken: nichts kopiert', async () => {
    const res = await call(operations.createVariant, { params: { id: String(opId) }, body: { machine_id: machineC }, user });
    assert.equal(res.statusCode, 201, JSON.stringify(res.body));
    assert.equal((await q1('SELECT count(*)::int AS n FROM setup_sheets WHERE operation_id = $1', [res.body.data.id])).n, 0);
    assert.equal((await q1('SELECT count(*)::int AS n FROM inspection_plans WHERE operation_id = $1', [res.body.data.id])).n, 0);
  });

  for (const d of createdDirs) fs.rmSync(d, { recursive: true, force: true });
  console.log(`\n${passed} Tests bestanden`);
  await pool.end();
  process.exit(process.exitCode || 0);
})().catch(err => { console.error(err); for (const d of createdDirs) fs.rmSync(d, { recursive: true, force: true }); process.exit(1); });
