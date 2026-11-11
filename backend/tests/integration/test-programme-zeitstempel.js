/**
 * Integrations-Tests: Zeitstempel im Modul Programme (Programme, Versionen, Ablauf, Einrichteblätter)
 *
 * Teil 1 – Migration 1737000129000: Altdaten liegen je nach Schreiber in Berliner Zeit (zentraler Pool)
 * oder in UTC (eigene Pools). Der Test setzt die Spalten in einer Transaktion auf `timestamp` zurück,
 * legt Altdaten wie in Produktion an, führt die Migration aus und prüft den echten Zeitpunkt. ROLLBACK am Ende.
 * Teil 2 – neue Werte über die API, Node wie im Container in UTC: Anzeige = tatsächlicher Zeitpunkt.
 * Läuft nur über tests/integration/run.js (Wegwerf-Datenbank).
 */
if (!(process.env.DB_NAME || '').includes('test')) {
  console.error('Abbruch: nur gegen eine Test-Datenbank (DB_NAME mit „test“) – Aufruf über tests/integration/run.js');
  process.exit(1);
}
process.env.TZ = 'UTC'; // wie im Docker-Container
process.env.JWT_SECRET = process.env.JWT_SECRET || 'integrationstest';

const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../../src/config/db');
const migration = require('../../migrations/1737000129000_programme-timestamptz');

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

// node-pg-migrate-Ersatz: die Migration schreibt nur pgm.sql
async function runMigration(client, direction) {
  const statements = [];
  migration[direction]({ sql: (s) => statements.push(s) });
  for (const s of statements) await client.query(s);
}

const iso = (d) => new Date(d).toISOString();

(async () => {
  const adminId = (await pool.query("SELECT id FROM users WHERE username = 'admin'")).rows[0].id;
  const state = async (name) => (await pool.query('SELECT id FROM workflow_states WHERE name = $1', [name])).rows[0].id;
  const draft = await state('draft');
  const released = await state('released');

  // ---------- Teil 1: Altdaten umrechnen ----------
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await runMigration(client, 'down'); // Spalten wieder timestamp ohne Zeitzone (Stand vor der Migration)

    const q = async (sql, params) => (await client.query(sql, params)).rows[0];
    const machine = await q("INSERT INTO machines (name) VALUES ('Zeit-Maschine') RETURNING id");
    const part = await q("INSERT INTO parts (part_number, part_name) VALUES ('TEIL-0914', 'Testteil Zeitstempel') RETURNING id");
    const op = await q(
      `INSERT INTO operations (part_id, op_number, op_name, machine_id, created_at)
       VALUES ($1, 'OP10', 'Fräsen', $2, '2026-10-01 07:00:00') RETURNING id`, [part.id, machine.id]);
    // Variante: Arbeitsgang und kopiertes Blatt in einer Transaktion des eigenen Pools (UTC) → gleicher Wert
    const variantOp = await q(
      `INSERT INTO operations (part_id, op_number, op_name, machine_id, created_at)
       VALUES ($1, 'OP10', 'Fräsen B', $2, '2026-11-10 09:15:00') RETURNING id`, [part.id, machine.id]);

    // NC-Programm (eigener Pool, UTC): angelegt 22:30 UTC, Freigabe 23:10 UTC
    const nc = await q(
      `INSERT INTO programs (operation_id, program_number, program_name, workflow_state_id, kind, created_at, updated_at)
       VALUES ($1, 'Z-1', 'NC', $2, 'nc', '2026-11-10 22:30:00', '2026-11-10 23:10:00') RETURNING id`, [op.id, released]);
    const ncRev = await q(
      `INSERT INTO program_revisions (program_id, version_string, filename, filepath, workflow_state_id, created_at, released_at)
       VALUES ($1, '1.0.0', 'a.h', 'x', $2, '2026-11-10 22:30:00', '2026-11-10 23:10:00') RETURNING id`, [nc.id, released]);
    const wfNc = await q(
      `INSERT INTO workflow_history (entity_type, entity_id, to_state_id, changed_by, created_at)
       VALUES ('program', $1, $2, $3, '2026-11-10 23:10:00') RETURNING id`, [nc.id, released, adminId]);

    // Messprogramm (zentraler Pool, Berlin): angelegt 10.11. 23:30 Berliner Zeit = 22:30 UTC
    const cmmNew = await q(
      `INSERT INTO programs (operation_id, program_number, program_name, workflow_state_id, kind, created_at, updated_at)
       VALUES ($1, 'Z-M1', 'Messen', $2, 'cmm', '2026-11-10 23:30:00', '2026-11-10 23:30:00') RETURNING id`, [op.id, draft]);
    const cmmRev = await q(
      `INSERT INTO program_revisions (program_id, version_string, filename, filepath, workflow_state_id, created_at)
       VALUES ($1, '1.0.0', 'a.prg', 'x', $2, '2026-11-10 23:30:00') RETURNING id`, [cmmNew.id, draft]);
    // Messprogramm mit neuer Version (Berlin, Sommerzeit): updated_at = Zeit der Version
    const cmmV2 = await q(
      `INSERT INTO programs (operation_id, program_number, program_name, workflow_state_id, kind, created_at, updated_at)
       VALUES ($1, 'Z-M2', 'Messen 2', $2, 'cmm', '2026-07-01 08:00:00', '2026-07-02 14:00:00') RETURNING id`, [op.id, draft]);
    await q(
      `INSERT INTO program_revisions (program_id, version_string, filename, filepath, workflow_state_id, created_at)
       VALUES ($1, '1.0.1', 'a.prg', 'x', $2, '2026-07-02 14:00:00') RETURNING id`, [cmmV2.id, draft]);
    // Messprogramm, zuletzt per Statuswechsel geschrieben (Workflow-Controller, UTC): 21:00 UTC
    const cmmStatus = await q(
      `INSERT INTO programs (operation_id, program_number, program_name, workflow_state_id, kind, created_at, updated_at)
       VALUES ($1, 'Z-M3', 'Messen 3', $2, 'cmm', '2026-11-10 20:00:00', '2026-11-10 21:00:00') RETURNING id`, [op.id, released]);
    await q(
      `INSERT INTO workflow_history (entity_type, entity_id, to_state_id, changed_by, created_at)
       VALUES ('program', $1, $2, $3, '2026-11-10 21:00:00')`, [cmmStatus.id, released, adminId]);

    // Einrichteblätter (zentraler Pool, Berlin)
    const sheet = await q(
      `INSERT INTO setup_sheets (operation_id, machine_id, created_by, workflow_state_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, '2026-07-01 12:00:00', '2026-07-03 09:00:00') RETURNING id`, [op.id, machine.id, adminId, draft]);
    const sheetStatus = await q(
      `INSERT INTO setup_sheets (operation_id, machine_id, created_by, workflow_state_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, '2026-11-02 10:00:00', '2026-11-03 08:00:00') RETURNING id`, [op.id, machine.id, adminId, released]);
    await q(
      `INSERT INTO workflow_history (entity_type, entity_id, to_state_id, changed_by, created_at)
       VALUES ('setup_sheet', $1, $2, $3, '2026-11-03 08:00:00')`, [sheetStatus.id, released, adminId]);
    const sheetCopy = await q(
      `INSERT INTO setup_sheets (operation_id, machine_id, created_by, workflow_state_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, '2026-11-10 09:15:00', '2026-11-10 09:15:00') RETURNING id`, [variantOp.id, machine.id, adminId, draft]);
    const photo = await q(
      `INSERT INTO setup_sheet_photos (setup_sheet_id, file_path, file_name, file_size, mime_type, uploaded_by, uploaded_at)
       VALUES ($1, 'p', 'p.jpg', 1, 'image/jpeg', $2, '2026-07-01 12:05:00') RETURNING id`, [sheet.id, adminId]);
    const photoCopy = await q(
      `INSERT INTO setup_sheet_photos (setup_sheet_id, file_path, file_name, file_size, mime_type, uploaded_by, uploaded_at)
       VALUES ($1, 'p', 'p.jpg', 1, 'image/jpeg', $2, '2026-11-10 09:15:00') RETURNING id`, [sheetCopy.id, adminId]);

    await runMigration(client, 'up');

    const at = async (table, col, id) => iso((await q(`SELECT ${col} AS v FROM ${table} WHERE id = $1`, [id])).v);

    await test('Spalten sind timestamptz', async () => {
      const { rows } = await client.query(
        `SELECT table_name || '.' || column_name AS c, data_type FROM information_schema.columns
          WHERE (table_name, column_name) IN (('programs','created_at'), ('programs','updated_at'),
            ('program_revisions','created_at'), ('program_revisions','released_at'), ('workflow_history','created_at'),
            ('setup_sheets','created_at'), ('setup_sheets','updated_at'), ('setup_sheet_photos','uploaded_at'))`);
      assert.equal(rows.length, 8);
      for (const r of rows) assert.equal(r.data_type, 'timestamp with time zone', r.c);
    });
    await test('NC-Programm: Anlage, Version, Freigabe und Ablauf bleiben UTC', async () => {
      assert.equal(await at('programs', 'created_at', nc.id), '2026-11-10T22:30:00.000Z');
      assert.equal(await at('programs', 'updated_at', nc.id), '2026-11-10T23:10:00.000Z');
      assert.equal(await at('program_revisions', 'created_at', ncRev.id), '2026-11-10T22:30:00.000Z');
      assert.equal(await at('program_revisions', 'released_at', ncRev.id), '2026-11-10T23:10:00.000Z');
      assert.equal(await at('workflow_history', 'created_at', wfNc.id), '2026-11-10T23:10:00.000Z');
    });
    await test('Messprogramm 23:30 Berliner Zeit → 22:30 UTC (Anlage, updated_at, Version)', async () => {
      assert.equal(await at('programs', 'created_at', cmmNew.id), '2026-11-10T22:30:00.000Z');
      assert.equal(await at('programs', 'updated_at', cmmNew.id), '2026-11-10T22:30:00.000Z');
      assert.equal(await at('program_revisions', 'created_at', cmmRev.id), '2026-11-10T22:30:00.000Z');
    });
    await test('Messprogramm mit neuer Version im Sommer: updated_at Berlin (−2 h)', async () => {
      assert.equal(await at('programs', 'created_at', cmmV2.id), '2026-07-01T06:00:00.000Z');
      assert.equal(await at('programs', 'updated_at', cmmV2.id), '2026-07-02T12:00:00.000Z');
    });
    await test('Messprogramm zuletzt per Statuswechsel: updated_at bleibt UTC, Anlage Berlin', async () => {
      assert.equal(await at('programs', 'created_at', cmmStatus.id), '2026-11-10T19:00:00.000Z');
      assert.equal(await at('programs', 'updated_at', cmmStatus.id), '2026-11-10T21:00:00.000Z');
    });
    await test('Einrichteblatt: Anlage, Änderung und Foto Berlin', async () => {
      assert.equal(await at('setup_sheets', 'created_at', sheet.id), '2026-07-01T10:00:00.000Z');
      assert.equal(await at('setup_sheets', 'updated_at', sheet.id), '2026-07-03T07:00:00.000Z');
      assert.equal(await at('setup_sheet_photos', 'uploaded_at', photo.id), '2026-07-01T10:05:00.000Z');
    });
    await test('Einrichteblatt zuletzt per Statuswechsel: updated_at bleibt UTC', async () => {
      assert.equal(await at('setup_sheets', 'created_at', sheetStatus.id), '2026-11-02T09:00:00.000Z');
      assert.equal(await at('setup_sheets', 'updated_at', sheetStatus.id), '2026-11-03T08:00:00.000Z');
    });
    await test('Als Variante kopiertes Blatt samt Foto bleibt UTC, Arbeitsgang unverändert', async () => {
      assert.equal(await at('setup_sheets', 'created_at', sheetCopy.id), '2026-11-10T09:15:00.000Z');
      assert.equal(await at('setup_sheets', 'updated_at', sheetCopy.id), '2026-11-10T09:15:00.000Z');
      assert.equal(await at('setup_sheet_photos', 'uploaded_at', photoCopy.id), '2026-11-10T09:15:00.000Z');
      const { rows: [o] } = await client.query('SELECT created_at::text AS v FROM operations WHERE id = $1', [variantOp.id]);
      assert.equal(o.v, '2026-11-10 09:15:00');
    });
    await test('Neue Zeile nach der Migration bekommt den echten Zeitpunkt', async () => {
      const row = await q(
        `INSERT INTO programs (operation_id, program_number, program_name, workflow_state_id, kind)
         VALUES ($1, 'Z-M9', 'Neu', $2, 'cmm') RETURNING created_at`, [op.id, draft]);
      assert.ok(Math.abs(new Date(row.created_at) - Date.now()) < 60_000, iso(row.created_at));
    });
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }

  // ---------- Teil 2: neue Werte über die API (Node in UTC wie im Container) ----------
  const app = express();
  app.use(express.json());
  app.use('/api/programs', require('../../src/routes/programsRoutes'));
  app.use('/api/workflow', require('../../src/routes/workflowRoutes'));
  app.use('/api/setup-sheets', require('../../src/routes/setupSheetsRoutes'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const token = jwt.sign({ id: adminId, userId: adminId }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const send = async (method, url, body) => {
    const res = await fetch(base + url, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) },
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    assert.ok(res.ok, `${method} ${url}: ${res.status} ${JSON.stringify(json)}`);
    return json;
  };
  const near = (value, label) => {
    const diff = Math.abs(new Date(value) - Date.now());
    assert.ok(diff < 60_000, `${label}: ${value} weicht ${Math.round(diff / 60000)} min ab`);
  };

  const machineId = (await pool.query("INSERT INTO machines (name) VALUES ('Zeit-Maschine-2') RETURNING id")).rows[0].id;
  const partId = (await pool.query(
    "INSERT INTO parts (part_number, part_name) VALUES ('TEIL-0915', 'Testteil Zeitstempel API') RETURNING id")).rows[0].id;
  const opId = (await pool.query(
    "INSERT INTO operations (part_id, op_number, op_name, machine_id) VALUES ($1, 'OP10', 'Fräsen', $2) RETURNING id",
    [partId, machineId])).rows[0].id;

  const ncForm = new FormData();
  ncForm.append('file', new Blob(['BEGIN PGM 1 MM\nEND PGM 1 MM\n']), 'O1.H');
  ncForm.append('operation_id', String(opId));
  ncForm.append('program_name', 'NC Zeit');
  const ncId = (await send('POST', '/api/programs', ncForm)).data.id;

  const cmmForm = new FormData();
  cmmForm.append('files', new Blob(['PCDMIS']), 'TEIL-0915.prg');
  cmmForm.append('operation_id', String(opId));
  cmmForm.append('program_name', 'Mess Zeit');
  const cmmId = (await send('POST', '/api/programs/cmm', cmmForm)).data.program.id;

  const review = await state('review');
  await send('POST', '/api/workflow/change', { entityType: 'program', entityId: cmmId, toStateId: review });

  await test('Liste: Anlage und Änderung von NC- und Messprogramm = jetzt', async () => {
    const list = (await send('GET', `/api/programs?operation_id=${opId}`)).data;
    for (const p of list) {
      near(p.created_at, `${p.kind} created_at`);
      near(p.updated_at, `${p.kind} updated_at`);
    }
    assert.equal(list.length, 2);
  });
  await test('Versionsverlauf: Version und Ablauf = jetzt (NC und Messprogramm)', async () => {
    for (const id of [ncId, cmmId]) {
      const { revisions } = (await send('GET', `/api/programs/${id}/revisions`)).data;
      near(revisions[0].created_at, `Version ${id}`);
      for (const h of revisions[0].history) near(h.created_at, `Ablauf ${id}`);
    }
  });
  await test('Ablauf-Historie = jetzt', async () => {
    const history = (await send('GET', `/api/workflow/program/${cmmId}/history`)).data;
    assert.ok(history.length >= 1);
    for (const h of history) near(h.created_at, 'Historie');
  });
  await test('Einrichteblatt: Anlage = jetzt', async () => {
    const created = (await send('POST', '/api/setup-sheets', { operation_id: opId })).data;
    const sheet = (await send('GET', `/api/setup-sheets/${created.id}`)).data;
    near(sheet.created_at, 'Einrichteblatt created_at');
    near(sheet.updated_at, 'Einrichteblatt updated_at');
  });

  server.close();
  console.log(`\n${passed} Tests bestanden`);
  await pool.end();
})().catch(err => { console.error(err); process.exit(1); });
