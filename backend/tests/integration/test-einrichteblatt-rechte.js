/**
 * Integrations-Tests: Rechte am Einrichteblatt über echte HTTP-Aufrufe
 * Schreiben braucht setup_sheet.update, Statuswechsel program.release, Lesen nur die Anmeldung.
 * Läuft nur über tests/integration/run.js (Wegwerf-Datenbank).
 */
if (!(process.env.DB_NAME || '').includes('test')) {
  console.error('Abbruch: nur gegen eine Test-Datenbank (DB_NAME mit „test“) – Aufruf über tests/integration/run.js');
  process.exit(1);
}
process.env.JWT_SECRET = process.env.JWT_SECRET || 'integrationstest';

const assert = require('node:assert/strict');
const fs = require('fs').promises;
const path = require('path');
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../../src/config/db');

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

(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/setup-sheets', require('../../src/routes/setupSheetsRoutes'));
  app.use('/api/workflow', require('../../src/routes/workflowRoutes'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const adminId = (await pool.query("SELECT id FROM users WHERE username = 'admin'")).rows[0].id;
  const ohneId = (await pool.query(
    `INSERT INTO users (username, email, password_hash, first_name, last_name, is_active)
     VALUES ('test_ohne_recht', 'test_ohne_recht@example.invalid', 'x', 'Ohne', 'Recht', true) RETURNING id`)).rows[0].id;
  const token = (id) => jwt.sign({ id, userId: id }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const tokenAdmin = token(adminId);
  const tokenOhne = token(ohneId);

  const machineId = (await pool.query("INSERT INTO machines (name) VALUES ('Rechte-Maschine') RETURNING id")).rows[0].id;
  const partId = (await pool.query(
    "INSERT INTO parts (part_number, part_name) VALUES ('TEIL-0012', 'Testteil Rechte') RETURNING id")).rows[0].id;
  const opId = (await pool.query(
    "INSERT INTO operations (part_id, op_number, op_name, machine_id) VALUES ($1, 'OP10', 'Fräsen', $2) RETURNING id",
    [partId, machineId])).rows[0].id;

  const send = (method, url, tok, body) => fetch(base + url, {
    method,
    headers: { Authorization: `Bearer ${tok}`, ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  const neu = await send('POST', '/api/setup-sheets', tokenAdmin, { operation_id: opId });
  assert.equal(neu.status, 201, 'Admin legt an');
  const id = (await neu.json()).data.id;

  // Foto für die Lese-Prüfung direkt anlegen
  const dir = path.join(__dirname, '../../uploads/setup-sheets', String(id));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'r.jpg'), 'bild');
  const photoId = (await pool.query(
    `INSERT INTO setup_sheet_photos (setup_sheet_id, file_path, file_name, file_size, mime_type, uploaded_by)
     VALUES ($1, $2, 'r.jpg', 4, 'image/jpeg', $3) RETURNING id`,
    [id, `uploads/setup-sheets/${id}/r.jpg`, adminId])).rows[0].id;

  const WRITE_ROUTES = [
    ['POST', '/api/setup-sheets'],
    ['PUT', `/api/setup-sheets/${id}`],
    ['DELETE', `/api/setup-sheets/${id}`],
    ['POST', `/api/setup-sheets/${id}/photos`],
    ['PUT', `/api/setup-sheets/${id}/photos/${photoId}`],
    ['DELETE', `/api/setup-sheets/${id}/photos/${photoId}`],
    ['POST', `/api/setup-sheets/${id}/clamping-devices`],
    ['PUT', `/api/setup-sheets/${id}/clamping-devices/1`],
    ['DELETE', `/api/setup-sheets/${id}/clamping-devices/1`],
    ['POST', `/api/setup-sheets/${id}/fixtures`],
    ['PUT', `/api/setup-sheets/${id}/fixtures/1`],
    ['DELETE', `/api/setup-sheets/${id}/fixtures/1`],
  ];
  for (const [method, url] of WRITE_ROUTES) {
    await test(`${method} ${url.replace(String(id), ':id')} ohne Recht: 403`, async () => {
      assert.equal((await send(method, url, tokenOhne, { operation_id: opId })).status, 403);
    });
  }

  await test('Foto-Upload ohne Recht legt keine Datei ab', async () => {
    const form = new FormData();
    form.append('photo', new Blob(['bild'], { type: 'image/jpeg' }), 'x.jpg');
    const vorher = (await fs.readdir(dir)).length;
    assert.equal((await send('POST', `/api/setup-sheets/${id}/photos`, tokenOhne, form)).status, 403);
    assert.equal((await fs.readdir(dir)).length, vorher);
  });

  await test('Lesen ohne Recht: Liste, Detail und Foto 200', async () => {
    assert.equal((await send('GET', `/api/setup-sheets?operation_id=${opId}`, tokenOhne)).status, 200);
    assert.equal((await send('GET', `/api/setup-sheets/${id}`, tokenOhne)).status, 200);
    assert.equal((await send('GET', `/api/setup-sheets/${id}/photos/${photoId}/view`, tokenOhne)).status, 200);
  });

  await test('Statuswechsel ohne program.release: 403', async () => {
    const review = (await pool.query("SELECT id FROM workflow_states WHERE name = 'review'")).rows[0].id;
    const res = await send('POST', '/api/workflow/change', tokenOhne, { entityType: 'setup_sheet', entityId: id, toStateId: review });
    assert.equal(res.status, 403);
  });

  await test('Mit setup_sheet.update darf eine eigene Rolle ändern', async () => {
    const role = (await pool.query("INSERT INTO roles (name) VALUES ('Test-Fräser') RETURNING id")).rows[0].id;
    await pool.query(
      "INSERT INTO role_permissions (role_id, permission_id) SELECT $1, id FROM permissions WHERE name = 'setup_sheet.update'", [role]);
    await pool.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [ohneId, role]);
    assert.equal((await send('PUT', `/api/setup-sheets/${id}`, tokenOhne, { special_notes: 'Hinweis' })).status, 200);
  });

  await fs.rm(dir, { recursive: true, force: true });
  server.close();
  console.log(`\n${passed} Tests bestanden`);
  await pool.end();
})().catch(err => { console.error(err); process.exit(1); });
