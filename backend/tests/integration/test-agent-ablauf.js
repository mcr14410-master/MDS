/**
 * Integrations-Test MDS-Agent: Ablauf mit simuliertem Agenten (Spec MESSPROGRAMME_AGENT_SPEC.md 5.2/5.4)
 * Agent anlegen → Bereitstellen → Manifest → Berichte (requested → active) → Aktualisieren →
 * Fertig im Tray → bearbeitete Datei hält auf → Verwerfen im MDS → closed. Dazu Abgrenzung
 * zwischen zwei Agenten. Datei-Download wird im .http-Test gegen ein laufendes Backend geprüft.
 * Läuft nur über tests/integration/run.js (Wegwerf-Datenbank).
 */
if (!(process.env.DB_NAME || '').includes('test')) {
  console.error('Abbruch: nur gegen eine Test-Datenbank (DB_NAME mit „test“) – Aufruf über tests/integration/run.js');
  process.exit(1);
}

const assert = require('node:assert/strict');
const crypto = require('crypto');
const pool = require('../../src/config/db');
const agentsController = require('../../src/controllers/agentsController');
const deploymentsController = require('../../src/controllers/deploymentsController');
const agentApi = require('../../src/controllers/agentApiController');
const { authenticateAgent } = require('../../src/middleware/agentAuth');

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

const fakeRes = () => ({ statusCode: 200, status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } });
const call = async (fn, req) => { const res = fakeRes(); await fn(req, res); return res; };
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
const uuid = () => crypto.randomUUID();

// Simulierter Agent: authenticateAgent + Endpunkt, wie es der Router tut
async function asAgent(key, fn, { params = {}, body = {} } = {}) {
  const req = { headers: { 'x-agent-key': key, 'x-agent-version': '0.9.0-sim' }, params, body, ip: '127.0.0.1' };
  const res = fakeRes();
  let nextCalled = false;
  await authenticateAgent(req, res, () => { nextCalled = true; });
  if (!nextCalled) return res;
  await fn(req, res);
  return res;
}

(async () => {
  const adminId = (await pool.query("SELECT id FROM users WHERE username = 'admin'")).rows[0].id;
  const admin = { id: adminId };
  const released = (await pool.query("SELECT id FROM workflow_states WHERE name = 'released'")).rows[0].id;

  // Testdaten: Teil, zwei Arbeitsgänge, Messprogramm mit Version 1.0.0 (freigegeben) und Dateigruppe
  const partId = (await pool.query(
    "INSERT INTO parts (part_number, part_name) VALUES ('TEIL-0001', 'Testteil Agent') RETURNING id")).rows[0].id;
  const opId = (await pool.query(
    "INSERT INTO operations (part_id, op_number, op_name) VALUES ($1, 'OP30', 'Messen') RETURNING id", [partId])).rows[0].id;
  const progId = (await pool.query(
    `INSERT INTO programs (operation_id, program_number, program_name, workflow_state_id, kind)
     VALUES ($1, 'KD00000-00004-M1', 'Messen', $2, 'cmm') RETURNING id`, [opId, released])).rows[0].id;
  async function addRevision(version, names) {
    const [major, minor, patch] = version.split('.').map(Number);
    const rev = (await pool.query(
      `INSERT INTO program_revisions (program_id, version_major, version_minor, version_patch, version_string,
         filename, filepath, file_hash, workflow_state_id)
       VALUES ($1, $2, $3, $4, $5, $6, '/nicht/vorhanden', $7, $8) RETURNING id`,
      [progId, major, minor, patch, version, names.main, hash(version + names.main), released])).rows[0].id;
    const files = {};
    for (const [role, target, filename] of [
      ['main', 'program_dir', names.main], ['cad', 'program_dir', 'KD00000-00004-M1.cad'],
      ['calibration', 'program_dir', 'KD00000-00004-M1_KAL.prg'],
      ['report_layout', 'template_dir', 'KD00000-00004-M1.layout.xml'], ['report_xlsx', 'template_dir', 'KD00000-00004-M1.xlsx'],
    ]) {
      files[role] = (await pool.query(
        `INSERT INTO program_revision_files (revision_id, role, target, filename, filepath, file_hash)
         VALUES ($1, $2, $3, $4, '/nicht/vorhanden', $5) RETURNING id, file_hash`,
        [rev, role, target, filename, hash(version + filename)])).rows[0];
    }
    await pool.query('UPDATE programs SET current_revision_id = $1, released_revision_id = $1 WHERE id = $2', [rev, progId]);
    return { rev, files };
  }
  const v1 = await addRevision('1.0.0', { main: 'KD00000-00004-M1.prg' });

  // --- Agenten ---
  let key; let agentId; let otherKey;
  console.log('Agenten');
  await test('Mess-PC und zweiter Agent angelegt', async () => {
    let res = await call(agentsController.createAgent, { body: { name: 'Mess-PC Test', modules: ['cmm_sync'] }, user: admin });
    assert.equal(res.statusCode, 201, JSON.stringify(res.body));
    key = res.body.data.api_key; agentId = res.body.data.id;
    res = await call(agentsController.createAgent, { body: { name: 'Mess-PC Zwei', modules: ['cmm_sync'] }, user: admin });
    otherKey = res.body.data.api_key;
  });

  // --- Bereitstellen ---
  let depId;
  console.log('Bereitstellen und Manifest');
  await test('Bereitstellen hält Version 1.0.0 fest', async () => {
    const res = await call(deploymentsController.createDeployment, { body: { agent_id: agentId, operation_id: opId }, user: admin });
    assert.equal(res.statusCode, 201, JSON.stringify(res.body));
    depId = res.body.data.id;
    assert.equal(res.body.data.programs[0].version, '1.0.0');
  });

  let manifest;
  await test('Manifest: Bereitstellung mit Dateien, Pfaden, Hash und URL', async () => {
    const res = await asAgent(key, agentApi.getManifest);
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    manifest = res.body;
    assert.equal(manifest.config.agent_id, agentId);
    assert.equal(manifest.deployments.length, 1);
    const d = manifest.deployments[0];
    assert.equal(d.id, depId); assert.equal(d.status, 'requested'); assert.equal(d.part_number, 'TEIL-0001');
    assert.equal(d.discard_local, false);
    const u = (await pool.query("SELECT COALESCE(NULLIF(trim(concat_ws(' ', first_name, last_name)), ''), username) AS name FROM users WHERE id = $1", [adminId])).rows[0];
    assert.equal(d.requested_by, u.name, 'voller Name, sonst Benutzername');
    const p = d.programs[0];
    assert.equal(p.local_dir, 'TEIL-0001\\KD00000-00004-M1');
    const byRole = Object.fromEntries(p.files.map(f => [f.role, f]));
    assert.equal(byRole.main.rel_path, 'TEIL-0001\\KD00000-00004-M1\\KD00000-00004-M1.prg');
    assert.equal(byRole.calibration.rel_path, 'TEIL-0001\\KD00000-00004-M1\\Kalibrierung\\KD00000-00004-M1_KAL.prg');
    assert.equal(byRole.report_xlsx.target, 'template_dir');
    assert.equal(byRole.report_xlsx.rel_path, 'KD00000-00004-M1.xlsx');
    assert.equal(byRole.main.hash, v1.files.main.file_hash);
    assert.equal(byRole.main.url, `/api/agent/files/${v1.files.main.id}`);
  });

  await test('Zweiter Agent sieht die Bereitstellung nicht', async () => {
    const res = await asAgent(otherKey, agentApi.getManifest);
    assert.deepEqual(res.body.deployments, []);
  });

  // --- Berichte ---
  const stateOf = (role, state, localHash) => {
    const f = manifest.deployments[0].programs[0].files.find(x => x.role === role);
    return { target: f.target, rel_path: f.rel_path, deployment_id: depId, file_id: f.file_id, local_hash: localHash ?? f.hash, state };
  };
  const roles = ['main', 'cad', 'calibration', 'report_layout', 'report_xlsx'];
  const toDevice = roles.map(r => ({
    client_id: uuid(), deployment_id: depId, file_id: v1.files[r].id, filename: `datei-${r}`,
    direction: 'to_device', result: 'ok', file_hash: v1.files[r].file_hash, occurred_at: new Date().toISOString(),
  }));

  console.log('Berichte');
  await test('Halb abgelegt (eine Datei gesperrt) → bleibt requested', async () => {
    const res = await asAgent(key, agentApi.postReport, {
      body: { files: [...roles.slice(0, 4).map(r => stateOf(r, 'current')), stateOf('report_xlsx', 'locked', null)] },
    });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.deepEqual(res.body.status_changes, []);
    const d = (await pool.query('SELECT status FROM agent_deployments WHERE id = $1', [depId])).rows[0];
    assert.equal(d.status, 'requested');
  });

  await test('Alles abgelegt + Transfers → active, Protokoll mit Schnappschuss und Auslöser', async () => {
    const res = await asAgent(key, agentApi.postReport, {
      body: { files: roles.map(r => stateOf(r, 'current')), transfers: toDevice, deployments: [{ id: depId }] },
    });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.transfers_new, 5);
    assert.deepEqual(res.body.status_changes, [{ id: depId, status: 'active' }]);
    const t = (await pool.query(
      "SELECT program_number, version_string, triggered_by, program_id FROM program_transfers WHERE deployment_id = $1 AND file_id = $2",
      [depId, v1.files.main.id])).rows[0];
    assert.deepEqual(t, { program_number: 'KD00000-00004-M1', version_string: '1.0.0', triggered_by: adminId, program_id: progId });
    const agent = (await pool.query('SELECT agent_version, last_seen_at FROM agents WHERE id = $1', [agentId])).rows[0];
    assert.equal(agent.agent_version, '0.9.0-sim');
    assert.ok(agent.last_seen_at);
  });

  await test('Gleicher Bericht nochmal (Outbox-Wiederholung) → Transfers nicht doppelt', async () => {
    const res = await asAgent(key, agentApi.postReport, { body: { files: roles.map(r => stateOf(r, 'current')), transfers: toDevice } });
    assert.equal(res.body.transfers_new, 0);
    assert.equal(res.body.transfers_known, 5);
    const n = (await pool.query('SELECT count(*)::int AS n FROM program_transfers WHERE deployment_id = $1', [depId])).rows[0].n;
    assert.equal(n, 5);
  });

  await test('Messlauf: .prg run_saved + Aktivität → last_activity_at, Zustand im MDS sichtbar', async () => {
    const at = new Date().toISOString();
    const res = await asAgent(key, agentApi.postReport, {
      body: { files: [stateOf('main', 'run_saved', 'b'.repeat(64)), ...roles.slice(1).map(r => stateOf(r, 'current'))], deployments: [{ id: depId, activity_at: at }] },
    });
    assert.equal(res.statusCode, 200);
    const d = await call(deploymentsController.getDeploymentById, { params: { id: depId } });
    const main = d.body.data.programs[0].files.find(f => f.role === 'main');
    assert.equal(main.state, 'run_saved');
    assert.equal(main.local_hash, 'b'.repeat(64));
    assert.ok(new Date(d.body.data.last_activity_at) >= new Date(at));
  });

  await test('Zweiter Agent kann fremde Bereitstellung nicht melden oder schließen', async () => {
    let res = await asAgent(otherKey, agentApi.postReport, { body: { deployments: [{ id: depId, closed: true }], files: [stateOf('main', 'current')] } });
    assert.equal(res.body.ignored.length, 2);
    res = await asAgent(otherKey, agentApi.closeDeployment, { params: { id: depId } });
    assert.equal(res.statusCode, 404);
    const states = (await pool.query('SELECT count(*)::int AS n FROM agent_file_states WHERE agent_id = $1', [agentId])).rows[0].n;
    assert.equal(states, 5, 'Ist-Stand des Mess-PCs unverändert');
  });

  // --- Aktualisieren ---
  console.log('Aktualisieren');
  let v2;
  await test('Neue Freigabe → Manifest zeigt newer_release; nach Aktualisieren neue Dateien', async () => {
    v2 = await addRevision('1.1.0', { main: 'KD00000-00004-M1.prg' });
    let res = await asAgent(key, agentApi.getManifest);
    assert.equal(res.body.deployments[0].programs[0].newer_release, '1.1.0');
    assert.equal(res.body.deployments[0].programs[0].version, '1.0.0');
    res = await call(deploymentsController.updateDeploymentProgram, { params: { id: depId, programId: progId }, user: admin });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    res = await asAgent(key, agentApi.getManifest);
    const p = res.body.deployments[0].programs[0];
    assert.equal(p.version, '1.1.0'); assert.equal(p.newer_release, null);
    assert.equal(p.files.find(f => f.role === 'main').file_id, v2.files.main.id);
  });

  // --- Abschließen ---
  console.log('Abschließen');
  await test('Fertig im Tray → closing; nochmal → 409', async () => {
    let res = await asAgent(key, agentApi.closeDeployment, { params: { id: depId } });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.status, 'closing');
    res = await asAgent(key, agentApi.closeDeployment, { params: { id: depId } });
    assert.equal(res.statusCode, 409);
    const d = (await pool.query('SELECT close_requested_by FROM agent_deployments WHERE id = $1', [depId])).rows[0];
    assert.equal(d.close_requested_by, null, 'am Gerät ausgelöst');
  });

  await test('„Bearbeitet – behalten“: closed gemeldet, aber .prg noch da → bleibt closing mit Warnung', async () => {
    const res = await asAgent(key, agentApi.postReport, {
      body: {
        files: [{ target: 'program_dir', rel_path: 'TEIL-0001\\KD00000-00004-M1\\KD00000-00004-M1.prg', deployment_id: depId, file_id: v2.files.main.id, local_hash: 'c'.repeat(64), state: 'modified' }],
        deployments: [{ id: depId, closed: true }],
        transfers: [{ client_id: uuid(), deployment_id: depId, file_id: v2.files.main.id, filename: 'KD00000-00004-M1.prg', direction: 'kept_modified', result: 'ok', occurred_at: new Date().toISOString() }],
      },
    });
    assert.deepEqual(res.body.status_changes, []);
    const a = (await pool.query('SELECT last_warnings FROM agents WHERE id = $1', [agentId])).rows[0];
    assert.match(a.last_warnings[0].text, /bleibt beim Abschließen/);
    const d = (await pool.query('SELECT status FROM agent_deployments WHERE id = $1', [depId])).rows[0];
    assert.equal(d.status, 'closing');
  });

  await test('Verwerfen im MDS → Manifest discard_local; danach closed, Auslöser = wer verworfen hat', async () => {
    let res = await call(deploymentsController.discardLocal, { params: { id: depId }, user: admin });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    res = await asAgent(key, agentApi.getManifest);
    assert.equal(res.body.deployments[0].discard_local, true);
    const clientId = uuid();
    res = await asAgent(key, agentApi.postReport, {
      body: {
        files: [{ target: 'program_dir', rel_path: 'Kopie\\fremd.prg', state: 'unknown' }],
        deployments: [{ id: depId, closed: true }],
        transfers: [{ client_id: clientId, deployment_id: depId, file_id: v2.files.main.id, filename: 'KD00000-00004-M1.prg', direction: 'discarded', result: 'ok', occurred_at: new Date().toISOString() }],
      },
    });
    assert.deepEqual(res.body.status_changes, [{ id: depId, status: 'closed' }]);
    const t = (await pool.query('SELECT triggered_by FROM program_transfers WHERE client_id = $1', [clientId])).rows[0];
    assert.equal(t.triggered_by, adminId);
    const d = (await pool.query('SELECT status, closed_at, close_reason FROM agent_deployments WHERE id = $1', [depId])).rows[0];
    assert.equal(d.status, 'closed'); assert.ok(d.closed_at); assert.equal(d.close_reason, 'manual');
  });

  await test('Nach dem Abschluss: Manifest leer, fremde Datei bleibt als unknown gemeldet, Wiederholung harmlos', async () => {
    let res = await asAgent(key, agentApi.getManifest);
    assert.deepEqual(res.body.deployments, []);
    const s = (await pool.query('SELECT state, deployment_id FROM agent_file_states WHERE agent_id = $1', [agentId])).rows;
    assert.deepEqual(s, [{ state: 'unknown', deployment_id: null }]);
    res = await asAgent(key, agentApi.postReport, { body: { deployments: [{ id: depId, closed: true }] } });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.status_changes, []);
  });

  await test('Modul abgewählt → Manifest ohne Bereitstellungen', async () => {
    await call(deploymentsController.createDeployment, { body: { agent_id: agentId, operation_id: opId }, user: admin });
    await call(agentsController.updateAgent, { params: { id: agentId }, body: { modules: [] }, user: admin });
    const res = await asAgent(key, agentApi.getManifest);
    assert.deepEqual(res.body.config.modules, []);
    assert.deepEqual(res.body.deployments, []);
  });

  await test('Falscher Schlüssel → 401', async () => {
    const res = await asAgent('mdsa_' + 'x'.repeat(43), agentApi.getManifest);
    assert.equal(res.statusCode, 401);
  });

  console.log(`\n${passed} Tests bestanden`);
  await pool.end();
})();
