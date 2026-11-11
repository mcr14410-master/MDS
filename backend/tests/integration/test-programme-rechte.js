/**
 * Integrations-Tests: Rechte an Programmen und Bauteil-Dokumenten über echte HTTP-Aufrufe
 * Anlegen program.create, neue Version program.upload, Ändern/Zurückrollen program.update,
 * Löschen program.delete; Bauteil-Dokumente schreiben part.update. Lesen nur die Anmeldung.
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
  app.use('/api/programs', require('../../src/routes/programsRoutes'));
  app.use('/api/parts/:partId/documents', require('../../src/routes/partDocumentsRoutes'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const adminId = (await pool.query("SELECT id FROM users WHERE username = 'admin'")).rows[0].id;
  const userId = (await pool.query(
    `INSERT INTO users (username, email, password_hash, first_name, last_name, is_active)
     VALUES ('test_programm_rechte', 'test_programm_rechte@example.invalid', 'x', 'Ohne', 'Recht', true) RETURNING id`)).rows[0].id;
  const token = (id) => jwt.sign({ id, userId: id }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const tokenAdmin = token(adminId);
  const tokenUser = token(userId);

  const roleId = (await pool.query("INSERT INTO roles (name) VALUES ('Test-Programmrechte') RETURNING id")).rows[0].id;
  await pool.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);
  const grant = (name) => pool.query(
    'INSERT INTO role_permissions (role_id, permission_id) SELECT $1, id FROM permissions WHERE name = $2',
    [roleId, name]);

  const machineId = (await pool.query("INSERT INTO machines (name) VALUES ('Rechte-Maschine-P') RETURNING id")).rows[0].id;
  const partId = (await pool.query(
    "INSERT INTO parts (part_number, part_name) VALUES ('TEIL-0913', 'Testteil Programmrechte') RETURNING id")).rows[0].id;
  const opId = (await pool.query(
    "INSERT INTO operations (part_id, op_number, op_name, machine_id) VALUES ($1, 'OP10', 'Fräsen', $2) RETURNING id",
    [partId, machineId])).rows[0].id;

  const send = (method, url, tok, body) => fetch(base + url, {
    method,
    headers: { Authorization: `Bearer ${tok}`, ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const ncForm = (name = 'O1000.H') => {
    const form = new FormData();
    form.append('file', new Blob(['BEGIN PGM 1000 MM\nEND PGM 1000 MM\n'], { type: 'text/plain' }), name);
    form.append('operation_id', String(opId));
    form.append('program_name', 'Testprogramm');
    return form;
  };
  const docForm = () => {
    const form = new FormData();
    form.append('file', new Blob(['%PDF-1.4'], { type: 'application/pdf' }), 'zeichnung.pdf');
    form.append('document_type', 'drawing');
    return form;
  };

  // Programm und Dokument als Admin anlegen (Admin hat alle Rechte über die Migrationen)
  const neu = await send('POST', '/api/programs', tokenAdmin, ncForm());
  assert.equal(neu.status, 201, `Admin legt Programm an (${neu.status} ${await neu.clone().text()})`);
  const programId = (await neu.json()).data.id;
  const doc = await send('POST', `/api/parts/${partId}/documents`, tokenAdmin, docForm());
  assert.equal(doc.status, 201, `Admin lädt Dokument hoch (${doc.status} ${await doc.clone().text()})`);
  const docId = (await doc.json()).document.id;

  const WRITE_ROUTES = [
    ['POST', '/api/programs', 'program.create'],
    ['POST', '/api/programs/cmm', 'program.create'],
    ['POST', `/api/programs/${programId}/revisions`, 'program.upload'],
    ['POST', `/api/programs/${programId}/cmm-revisions`, 'program.upload'],
    ['PUT', `/api/programs/${programId}`, 'program.update'],
    ['POST', `/api/programs/${programId}/rollback?to=1.0.0`, 'program.update'],
    ['DELETE', `/api/programs/${programId}`, 'program.delete'],
    ['POST', `/api/parts/${partId}/documents`, 'part.update'],
    ['PATCH', `/api/parts/${partId}/documents/${docId}`, 'part.update'],
    ['DELETE', `/api/parts/${partId}/documents/${docId}`, 'part.update'],
    ['POST', `/api/parts/${partId}/documents/${docId}/set-primary`, 'part.update'],
    ['POST', `/api/parts/${partId}/documents/${docId}/set-primary-drawing`, 'part.update'],
  ];
  const label = (url) => url.replace(String(programId), ':id').replace(String(partId), ':partId').replace(String(docId), ':docId');

  for (const [method, url, permission] of WRITE_ROUTES) {
    await test(`${method} ${label(url)} ohne ${permission}: 403`, async () => {
      const res = await send(method, url, tokenUser, { program_name: 'x' });
      assert.equal(res.status, 403);
      assert.match((await res.json()).message, new RegExp(permission.replace('.', '\\.')));
    });
  }

  await test('Upload ohne Recht legt keine Datei ab und kein Programm an', async () => {
    const tempDir = process.env.TEMP_UPLOAD_PATH || path.join(__dirname, '../../uploads/temp');
    const vorherTemp = (await fs.readdir(tempDir).catch(() => [])).length;
    const vorher = Number((await pool.query('SELECT count(*) FROM programs')).rows[0].count);
    assert.equal((await send('POST', '/api/programs', tokenUser, ncForm('O2000.H'))).status, 403);
    assert.equal((await send('POST', `/api/parts/${partId}/documents`, tokenUser, docForm())).status, 403);
    assert.equal(Number((await pool.query('SELECT count(*) FROM programs')).rows[0].count), vorher);
    assert.equal((await fs.readdir(tempDir).catch(() => [])).length, vorherTemp);
  });

  await test('Lesen ohne Recht: Programme, Versionen, Dokumente 200', async () => {
    assert.equal((await send('GET', `/api/programs?operation_id=${opId}`, tokenUser)).status, 200);
    assert.equal((await send('GET', `/api/programs/${programId}`, tokenUser)).status, 200);
    assert.equal((await send('GET', `/api/programs/${programId}/revisions`, tokenUser)).status, 200);
    assert.equal((await send('GET', `/api/parts/${partId}/documents`, tokenUser)).status, 200);
  });

  await test('Nur program.upload (wie CNC-Fräser): neue Version 201, anlegen und ändern 403', async () => {
    await grant('program.upload');
    const rev = await send('POST', `/api/programs/${programId}/revisions`, tokenUser, ncForm());
    assert.equal(rev.status, 201, `neue Version (${rev.status} ${await rev.clone().text()})`);
    assert.equal((await send('POST', '/api/programs', tokenUser, ncForm('O3000.H'))).status, 403);
    assert.equal((await send('PUT', `/api/programs/${programId}`, tokenUser, { program_name: 'x' })).status, 403);
  });

  await test('Mit program.update und part.update: ändern 200, Dokument ändern 200', async () => {
    await grant('program.update');
    await grant('part.update');
    assert.equal((await send('PUT', `/api/programs/${programId}`, tokenUser, { program_name: 'Umbenannt' })).status, 200);
    assert.equal((await send('PATCH', `/api/parts/${partId}/documents/${docId}`, tokenUser, { description: 'neu' })).status, 200);
  });

  server.close();
  console.log(`\n${passed} Tests bestanden`);
  await pool.end();
})().catch(err => { console.error(err); process.exit(1); });
