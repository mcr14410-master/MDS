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
  const holeBlatt = async (id) => (await call(sheets.getSetupSheetById, { params: { id }, user })).body.data;

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

  // --- Änderungen nach der Freigabe ---
  const UPLOADS = path.join(__dirname, '../../uploads/setup-sheets');
  const ablauf = async (id) => (await pool.query(
    `SELECT wh.change_reason, wh.created_at, ws.name AS to_state
       FROM workflow_history wh JOIN workflow_states ws ON ws.id = wh.to_state_id
      WHERE wh.entity_type = 'setup_sheet' AND wh.entity_id = $1 ORDER BY wh.id`, [id])).rows;
  const hochladen = async (id, name = `f${Date.now()}${Math.random()}.jpg`) => {
    const dir = path.join(UPLOADS, String(id));
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), 'bild');
    const res = await call(sheets.uploadPhoto, {
      params: { id }, body: { caption: 'Bild' }, user,
      file: { filename: name, originalname: name, size: 4, mimetype: 'image/jpeg' },
    });
    return { res, abs: path.join(dir, name) };
  };
  const gibtEs = (abs) => fs.access(abs).then(() => true, () => false);
  const spanner = (await pool.query(
    `INSERT INTO clamping_devices (inventory_number, name, type_id)
     VALUES ('S-T3', 'Spanner', (SELECT id FROM clamping_device_types LIMIT 1)) RETURNING id`)).rows[0].id;
  const vorrichtung = (await pool.query(
    `INSERT INTO fixtures (fixture_number, type_id)
     VALUES ('V-T3', (SELECT id FROM fixture_types LIMIT 1)) RETURNING id`)).rows[0].id;

  await test('Änderung am freigegebenen Blatt: Entwurf, ein Ablauf-Eintrag', async () => {
    const { id } = await neuesBlatt({ reference_point: 'Mitte' });
    await freigeben(id);
    const vorher = (await ablauf(id)).length;
    const res = await call(sheets.updateSetupSheet, { params: { id }, body: { reference_point: 'Ecke' }, user });
    assert.equal(res.statusCode, 200);
    const blatt = await holeBlatt(id);
    assert.equal(blatt.workflow_state, 'draft');
    assert.equal(blatt.reference_point, 'Ecke');
    assert.ok(blatt.released_version_id, 'Zeiger auf den letzten freigegebenen Stand bleibt');
    const a = await ablauf(id);
    assert.equal(a.length, vorher + 1);
    assert.equal(a.at(-1).to_state, 'draft');
    assert.equal(a.at(-1).change_reason, 'Geändert nach Freigabe');
  });

  await test('Speichern ohne Änderung bleibt freigegeben', async () => {
    const { id } = await neuesBlatt({ reference_point: 'Mitte', wcs_x: 1.5 });
    const blatt = await freigeben(id);
    const vorher = (await ablauf(id)).length;
    // Wie das Formular: leere Texte als '', dazu Felder, die nichts ändern
    const body = {
      operation_id: opId, machine_id: machineId, program_id: null, reference_point: 'Mitte', wcs_x: 1.5,
      special_notes: '', setup_instructions: '', control_type: blatt.control_type, status: 'draft',
    };
    await call(sheets.updateSetupSheet, { params: { id }, body, user });
    assert.equal((await holeBlatt(id)).workflow_state, 'released');
    assert.equal((await ablauf(id)).length, vorher);
  });

  await test('Zwei Änderungen gleichzeitig: nur ein Eintrag', async () => {
    const { id } = await neuesBlatt();
    await freigeben(id);
    const vorher = (await ablauf(id)).length;
    await Promise.all([
      call(sheets.updateSetupSheet, { params: { id }, body: { reference_point: 'A' }, user }),
      call(sheets.updateSetupSheet, { params: { id }, body: { special_notes: 'B' }, user }),
    ]);
    const blatt = await holeBlatt(id);
    assert.equal(blatt.reference_point, 'A');
    assert.equal(blatt.special_notes, 'B');
    assert.equal((await ablauf(id)).length, vorher + 1);
  });

  await test('Foto, Spannmittel und Vorrichtung lösen den Rückfall aus', async () => {
    const { id } = await neuesBlatt();
    const schritte = [];
    const zuruecksetzen = async () => {
      await pool.query('UPDATE setup_sheets SET workflow_state_id = $1 WHERE id = $2', [state.released, id]);
    };
    const pruefe = async (name, fn) => {
      await zuruecksetzen();
      const out = await fn();
      assert.ok(out.statusCode < 300, `${name}: ${out.statusCode} ${JSON.stringify(out.body)}`);
      assert.equal((await holeBlatt(id)).workflow_state, 'draft', name);
      schritte.push(name);
      return out;
    };
    const foto = await pruefe('Foto hochladen', async () => (await hochladen(id)).res);
    const photoId = foto.body.data.id;
    await pruefe('Foto ändern', () => call(sheets.updatePhoto, { params: { id, photoId }, body: { caption: 'Neu' }, user }));
    await pruefe('Foto löschen', () => call(sheets.deletePhoto, { params: { id, photoId }, user }));
    const sp = await pruefe('Spannmittel hinzufügen', () => call(sheets.addClampingDevice, { params: { id }, body: { clamping_device_id: spanner }, user }));
    const spId = sp.body.data.id;
    await pruefe('Spannmittel ändern', () => call(sheets.updateClampingDevice, { params: { id, itemId: spId }, body: { quantity: 5 }, user }));
    await pruefe('Spannmittel entfernen', () => call(sheets.removeClampingDevice, { params: { id, itemId: spId }, user }));
    const vo = await pruefe('Vorrichtung hinzufügen', () => call(sheets.addFixture, { params: { id }, body: { fixture_id: vorrichtung }, user }));
    const voId = vo.body.data.id;
    await pruefe('Vorrichtung ändern', () => call(sheets.updateFixture, { params: { id, itemId: voId }, body: { quantity: 3 }, user }));
    await pruefe('Vorrichtung entfernen', () => call(sheets.removeFixture, { params: { id, itemId: voId }, user }));
    assert.equal(schritte.length, 9);
    await fs.rm(path.join(UPLOADS, String(id)), { recursive: true, force: true });
  });

  await test('Archiviertes Blatt: Änderungen 409, hochgeladene Datei wird entfernt', async () => {
    const { id } = await neuesBlatt({ reference_point: 'Alt' });
    await wechsel(id, 'archived', 'Fertig');
    const res = await call(sheets.updateSetupSheet, { params: { id }, body: { reference_point: 'Neu' }, user });
    assert.equal(res.statusCode, 409);
    assert.equal((await holeBlatt(id)).reference_point, 'Alt');
    const { res: up, abs } = await hochladen(id);
    assert.equal(up.statusCode, 409);
    assert.equal(await gibtEs(abs), false);
    await fs.rm(path.join(UPLOADS, String(id)), { recursive: true, force: true });
  });

  await test('Unbekanntes Blatt: 404 und keine Datei bleibt liegen', async () => {
    assert.equal((await call(sheets.updateSetupSheet, { params: { id: 999999 }, body: {}, user })).statusCode, 404);
    const { res: up, abs } = await hochladen(999999);
    assert.equal(up.statusCode, 404);
    assert.equal(await gibtEs(abs), false);
    await fs.rm(path.join(UPLOADS, '999999'), { recursive: true, force: true });
  });

  await test('Feld leeren und Programm entfernen wirkt, fehlendes Feld bleibt', async () => {
    const prog = (await pool.query(
      `INSERT INTO programs (operation_id, program_number, program_name, workflow_state_id)
       VALUES ($1, 'TEIL-0010-8', 'Test', $2) RETURNING id`, [opId, state.draft])).rows[0].id;
    const { id } = await neuesBlatt({ program_id: prog, reference_point: 'Mitte', special_notes: 'Hinweis' });
    await call(sheets.updateSetupSheet, { params: { id }, body: { program_id: null, reference_point: '' }, user });
    const blatt = await holeBlatt(id);
    assert.equal(blatt.program_id, null);
    assert.equal(blatt.reference_point, null);
    assert.equal(blatt.special_notes, 'Hinweis');
  });

  await test('Foto aus einem Stand: Zeile weg, Datei bleibt', async () => {
    const { id } = await neuesBlatt();
    const { res, abs } = await hochladen(id);
    await freigeben(id);
    const del = await call(sheets.deletePhoto, { params: { id, photoId: res.body.data.id }, user });
    assert.equal(del.statusCode, 200);
    assert.equal((await holeBlatt(id)).photos.length, 0);
    assert.equal(await gibtEs(abs), true);
    await fs.rm(path.join(UPLOADS, String(id)), { recursive: true, force: true });
  });

  await test('Foto in keinem Stand: Datei wird gelöscht', async () => {
    const { id } = await neuesBlatt();
    const { res, abs } = await hochladen(id);
    await call(sheets.deletePhoto, { params: { id, photoId: res.body.data.id }, user });
    assert.equal(await gibtEs(abs), false);
    await fs.rm(path.join(UPLOADS, String(id)), { recursive: true, force: true });
  });

  await test('Ablauf: Rückfall und Knopf-Wechsel in derselben Zeitbasis', async () => {
    const { id } = await neuesBlatt();
    await freigeben(id);
    await call(sheets.updateSetupSheet, { params: { id }, body: { reference_point: 'X' }, user });
    const a = await ablauf(id);
    assert.equal(a.at(-1).change_reason, 'Geändert nach Freigabe');
    const abstand = Math.abs(new Date(a.at(-1).created_at) - new Date(a.at(-2).created_at));
    assert.ok(abstand < 120000, `Abstand ${abstand} ms`);
  });

  console.log(`\n${passed} Tests bestanden`);
  await pool.end();
})().catch(err => { console.error(err); process.exit(1); });
