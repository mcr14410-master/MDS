/**
 * Integrations-Tests: Stände des Einrichteblatts ansehen und zurückgehen, Löschschutz
 * (Spec docs/konzepte/EINRICHTEBLATT_FREIGABE_SPEC.md, Abschnitt 2 „Zurückgehen“)
 * Läuft nur über tests/integration/run.js (Wegwerf-Datenbank).
 */
if (!(process.env.DB_NAME || '').includes('test')) {
  console.error('Abbruch: nur gegen eine Test-Datenbank (DB_NAME mit „test“) – Aufruf über tests/integration/run.js');
  process.exit(1);
}

const assert = require('node:assert/strict');
const fs = require('fs').promises;
const path = require('path');
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
  headers: {},
  status(c) { this.statusCode = c; return this; },
  json(d) { this.body = d; return this; },
  setHeader(k, v) { this.headers[k] = v; },
  sendFile(p) { this.file = p; return this; },
});
const call = async (fn, req) => { const res = fakeRes(); await fn(req, res); return res; };

(async () => {
  const adminId = (await pool.query("SELECT id FROM users WHERE username = 'admin'")).rows[0].id;
  const user = { id: adminId };
  const machineId = (await pool.query("INSERT INTO machines (name) VALUES ('Stand-Maschine') RETURNING id")).rows[0].id;
  const partId = (await pool.query(
    "INSERT INTO parts (part_number, part_name) VALUES ('TEIL-0013', 'Testteil Stände') RETURNING id")).rows[0].id;
  const opId = (await pool.query(
    "INSERT INTO operations (part_id, op_number, op_name, machine_id) VALUES ($1, 'OP10', 'Fräsen', $2) RETURNING id",
    [partId, machineId])).rows[0].id;
  const state = {};
  for (const r of (await pool.query('SELECT id, name FROM workflow_states')).rows) state[r.name] = r.id;
  const UPLOADS = path.join(__dirname, '../../uploads/setup-sheets');

  const neuesBlatt = async (body = {}) => {
    const res = await call(sheets.createSetupSheet, { body: { operation_id: opId, ...body }, user });
    assert.equal(res.statusCode, 201);
    return res.body.data.id;
  };
  const holeBlatt = async (id) => (await call(sheets.getSetupSheetById, { params: { id } })).body.data;
  const freigeben = async (id) => {
    for (const ziel of ['review', 'approved', 'released']) {
      const res = await call(workflow.changeWorkflowState, {
        body: { entityType: 'setup_sheet', entityId: id, toStateId: state[ziel] }, user,
      });
      assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    }
  };
  const aendern = (id, body) => call(sheets.updateSetupSheet, { params: { id }, body, user });
  const liste = async (id) => (await call(sheets.getVersions, { params: { id } })).body.data;
  const zurueck = (id, versionId) => call(sheets.restoreVersion, { params: { id, versionId }, user });
  const hochladen = async (id, name) => {
    const dir = path.join(UPLOADS, String(id));
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), 'bild');
    const res = await call(sheets.uploadPhoto, {
      params: { id }, body: { caption: name }, user,
      file: { filename: name, originalname: name, size: 4, mimetype: 'image/jpeg' },
    });
    assert.equal(res.statusCode, 201);
    return res.body.data.id;
  };

  await test('Liste der Stände mit Nummer, Art und Freigabe-Kennzeichen', async () => {
    const id = await neuesBlatt({ reference_point: 'A' });
    await freigeben(id);
    const v = await liste(id);
    assert.equal(v.length, 1);
    assert.equal(v[0].version_number, 1);
    assert.equal(v[0].kind, 'release');
    assert.equal(v[0].is_released, true);
    assert.ok(v[0].created_by_name);
  });

  await test('Zurück auf zuletzt freigegebenen Stand: wieder Freigegeben', async () => {
    const id = await neuesBlatt({ reference_point: 'A', special_notes: 'alt' });
    await freigeben(id);
    await aendern(id, { reference_point: 'B', special_notes: null });
    assert.equal((await holeBlatt(id)).workflow_state, 'draft');
    const [stand] = await liste(id);
    const res = await zurueck(id, stand.id);
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.state, 'released');
    const blatt = await holeBlatt(id);
    assert.equal(blatt.workflow_state, 'released');
    assert.equal(blatt.reference_point, 'A');
    assert.equal(blatt.special_notes, 'alt');
  });

  await test('Zurück auf älteren Stand: Entwurf, Zeiger bleibt', async () => {
    const id = await neuesBlatt({ reference_point: 'S1' });
    await freigeben(id);
    await aendern(id, { reference_point: 'S2' });
    await freigeben(id);
    const vorher = await holeBlatt(id);
    const stand1 = (await liste(id)).find(v => v.version_number === 1);
    const res = await zurueck(id, stand1.id);
    assert.equal(res.body.data.state, 'draft');
    const blatt = await holeBlatt(id);
    assert.equal(blatt.workflow_state, 'draft');
    assert.equal(blatt.reference_point, 'S1');
    assert.equal(blatt.released_version_id, vorher.released_version_id);
  });

  await test('Vorher wird gesichert, wenn es Unterschiede gibt', async () => {
    const id = await neuesBlatt({ reference_point: 'A' });
    await freigeben(id);
    await aendern(id, { reference_point: 'Entwurf' });
    const [stand] = await liste(id);
    const res = await zurueck(id, stand.id);
    assert.ok(res.body.data.backupVersionId);
    const backup = (await liste(id)).find(v => v.id === res.body.data.backupVersionId);
    assert.equal(backup.kind, 'backup');
    assert.equal(backup.version_number, null);
    const detail = await call(sheets.getVersion, { params: { id, versionId: backup.id } });
    assert.equal(detail.body.data.snapshot.fields.reference_point, 'Entwurf');
  });

  await test('Ohne Unterschied keine Sicherung', async () => {
    const id = await neuesBlatt({ reference_point: 'A' });
    await freigeben(id);
    const [stand] = await liste(id);
    const res = await zurueck(id, stand.id);
    assert.equal(res.body.data.backupVersionId, null);
    assert.equal((await liste(id)).length, 1);
  });

  await test('Gelöschtes Spannmittel und Programm: Warnung, Rest hergestellt', async () => {
    const prog = (await pool.query(
      `INSERT INTO programs (operation_id, program_number, program_name, workflow_state_id)
       VALUES ($1, 'TEIL-0013-1', 'Test', $2) RETURNING id`, [opId, state.draft])).rows[0].id;
    const device = (await pool.query(
      `INSERT INTO clamping_devices (inventory_number, name, type_id)
       VALUES ('S-T6', 'Spanner T6', (SELECT id FROM clamping_device_types LIMIT 1)) RETURNING id`)).rows[0].id;
    const id = await neuesBlatt({ program_id: prog, reference_point: 'A' });
    await call(sheets.addClampingDevice, { params: { id }, body: { clamping_device_id: device, quantity: 2 }, user });
    await freigeben(id);
    await aendern(id, { reference_point: 'B' });
    await pool.query('DELETE FROM programs WHERE id = $1', [prog]);
    await pool.query('UPDATE clamping_devices SET deleted_at = now() WHERE id = $1', [device]);
    const [stand] = await liste(id);
    const res = await zurueck(id, stand.id);
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.warnings.length, 2, JSON.stringify(res.body.data.warnings));
    assert.ok(res.body.data.warnings.some(w => /Programm/.test(w)));
    assert.ok(res.body.data.warnings.some(w => /Spannmittel/.test(w)));
    const blatt = await holeBlatt(id);
    assert.equal(blatt.reference_point, 'A');
    assert.equal(blatt.program_id, null);
    assert.equal(blatt.clamping_devices.length, 0);
  });

  await test('Foto seit dem Stand gelöscht: wieder da und abrufbar', async () => {
    const id = await neuesBlatt();
    const photoId = await hochladen(id, 'stand.jpg');
    await freigeben(id);
    await call(sheets.deletePhoto, { params: { id, photoId }, user });
    assert.equal((await holeBlatt(id)).photos.length, 0);
    const [stand] = await liste(id);
    await zurueck(id, stand.id);
    const blatt = await holeBlatt(id);
    assert.equal(blatt.photos.length, 1);
    assert.equal(blatt.photos[0].caption, 'stand.jpg');
    const view = await call(sheets.viewPhoto, { params: { id, photoId: blatt.photos[0].id } });
    assert.equal(view.statusCode, 200);
    assert.ok(view.file.endsWith('stand.jpg'));
    await fs.rm(path.join(UPLOADS, String(id)), { recursive: true, force: true });
  });

  await test('Foto aus Stand per /view, fremder Pfad im Snapshot: 403', async () => {
    const id = await neuesBlatt();
    await hochladen(id, 'v.jpg');
    await freigeben(id);
    const [stand] = await liste(id);
    const ok = await call(sheets.viewVersionPhoto, { params: { id, versionId: stand.id, index: 0 } });
    assert.equal(ok.statusCode, 200);
    assert.ok(ok.file.endsWith('v.jpg'));
    await pool.query(
      `UPDATE setup_sheet_versions SET snapshot = jsonb_set(snapshot, '{photos,0,file_path}', '"uploads/../../../etc/passwd"')
       WHERE id = $1`, [stand.id]);
    const boese = await call(sheets.viewVersionPhoto, { params: { id, versionId: stand.id, index: 0 } });
    assert.equal(boese.statusCode, 403);
    const fehlt = await call(sheets.viewVersionPhoto, { params: { id, versionId: stand.id, index: 5 } });
    assert.equal(fehlt.statusCode, 404);
    await fs.rm(path.join(UPLOADS, String(id)), { recursive: true, force: true });
  });

  await test('Zurückgehen steht im Ablauf', async () => {
    const id = await neuesBlatt({ reference_point: 'A' });
    await freigeben(id);
    await aendern(id, { reference_point: 'B' });
    const [stand] = await liste(id);
    await zurueck(id, stand.id);
    const { rows } = await pool.query(
      `SELECT change_reason FROM workflow_history WHERE entity_type = 'setup_sheet' AND entity_id = $1 ORDER BY id DESC LIMIT 1`, [id]);
    assert.equal(rows[0].change_reason, 'Zurück auf Stand 1');
  });

  await test('Archiviertes Blatt: Zurückgehen 409', async () => {
    const id = await neuesBlatt();
    await freigeben(id);
    await call(workflow.changeWorkflowState, { body: { entityType: 'setup_sheet', entityId: id, toStateId: state.archived }, user });
    const [stand] = await liste(id);
    assert.equal((await zurueck(id, stand.id)).statusCode, 409);
  });

  await test('Stand eines anderen Blatts: 404', async () => {
    const a = await neuesBlatt();
    await freigeben(a);
    const b = await neuesBlatt();
    const [standA] = await liste(a);
    assert.equal((await zurueck(b, standA.id)).statusCode, 404);
    assert.equal((await call(sheets.getVersion, { params: { id: b, versionId: standA.id } })).statusCode, 404);
  });

  await test('Blatt mit Stand: Löschen 409, ohne Stand: 200', async () => {
    const mit = await neuesBlatt();
    await freigeben(mit);
    assert.equal((await call(sheets.deleteSetupSheet, { params: { id: mit }, user })).statusCode, 409);
    const ohne = await neuesBlatt();
    assert.equal((await call(sheets.deleteSetupSheet, { params: { id: ohne }, user })).statusCode, 200);
  });

  console.log(`\n${passed} Tests bestanden`);
  await pool.end();
})().catch(err => { console.error(err); process.exit(1); });
