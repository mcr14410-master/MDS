/**
 * Integrations-Test: weitere Messprogramme zu einer offenen Bereitstellung hinzufügen
 * (POST /api/deployments/:id/programs). M1 ist bereitgestellt, M2 kommt nachträglich dazu;
 * Manifest enthält danach beide. Abgelehnt: schon enthalten, nicht freigegeben, fremder
 * Arbeitsgang, Bereitstellung beim Abschließen.
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
  const draft = (await pool.query("SELECT id FROM workflow_states WHERE name = 'draft'")).rows[0].id;

  const partId = (await pool.query(
    "INSERT INTO parts (part_number, part_name) VALUES ('TEIL-0077', 'Testteil Hinzufügen') RETURNING id")).rows[0].id;
  const newOp = async (nr) => (await pool.query(
    "INSERT INTO operations (part_id, op_number, op_name) VALUES ($1, $2, 'Messen') RETURNING id", [partId, nr])).rows[0].id;
  const opId = await newOp('KMG');
  const otherOpId = await newOp('KMG2');

  // Messprogramm mit Version 1.0.0 (.prg + Excel-Vorlage); freigegeben oder nur Entwurf
  async function addProgram(operationId, number, { release = true, template = `${number}.xlsx` } = {}) {
    const progId = (await pool.query(
      `INSERT INTO programs (operation_id, program_number, program_name, workflow_state_id, kind)
       VALUES ($1, $2, 'Messen', $3, 'cmm') RETURNING id`, [operationId, number, release ? released : draft])).rows[0].id;
    const rev = (await pool.query(
      `INSERT INTO program_revisions (program_id, version_major, version_minor, version_patch, version_string,
         filename, filepath, file_hash, workflow_state_id)
       VALUES ($1, 1, 0, 0, '1.0.0', $2, '/nicht/vorhanden', $3, $4) RETURNING id`,
      [progId, `${number}.prg`, hash(number), release ? released : draft])).rows[0].id;
    const files = [['main', 'program_dir', `${number}.prg`]];
    if (template) files.push(['report_xlsx', 'template_dir', template]);
    for (const [role, target, filename] of files) {
      await pool.query(
        `INSERT INTO program_revision_files (revision_id, role, target, filename, filepath, file_hash)
         VALUES ($1, $2, $3, $4, '/nicht/vorhanden', $5)`, [rev, role, target, filename, hash(number + filename)]);
    }
    await pool.query(
      `UPDATE programs SET current_revision_id = $1, released_revision_id = $2 WHERE id = $3`,
      [rev, release ? rev : null, progId]);
    return progId;
  }
  const m1 = await addProgram(opId, 'TEIL-0077-M1');
  const m2 = await addProgram(opId, 'TEIL-0077-M2');
  const m3 = await addProgram(opId, 'TEIL-0077-M3', { release: false });
  // gleiche Excel-Vorlage wie M1 → darf nicht auf dasselbe Gerät
  const m4 = await addProgram(opId, 'TEIL-0077-M4', { template: 'TEIL-0077-M1.xlsx' });
  const fremd = await addProgram(otherOpId, 'TEIL-0077-M5');

  const agentRes = await call(agentsController.createAgent, { body: { name: 'Mess-PC Hinzufügen', modules: ['cmm_sync'] }, user: admin });
  const agentId = agentRes.body.data.id;
  const key = agentRes.body.data.api_key;
  const add = (id, programIds) => call(deploymentsController.addDeploymentPrograms,
    { params: { id: String(id) }, body: { program_ids: programIds }, user: admin });

  console.log('Programm zur offenen Bereitstellung hinzufügen');
  let depId;
  await test('M1 bereitgestellt, zweite Bereitstellung für den Arbeitsgang weiter abgelehnt (409)', async () => {
    let res = await call(deploymentsController.createDeployment, { body: { agent_id: agentId, operation_id: opId, program_ids: [m1] }, user: admin });
    assert.equal(res.statusCode, 201, JSON.stringify(res.body));
    depId = res.body.data.id;
    res = await call(deploymentsController.createDeployment, { body: { agent_id: agentId, operation_id: opId, program_ids: [m2] }, user: admin });
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.deployment_id, depId);
  });

  await test('M2 hinzufügen → 201, Bereitstellung enthält M1 und M2', async () => {
    const res = await add(depId, [m2]);
    assert.equal(res.statusCode, 201, JSON.stringify(res.body));
    assert.match(res.body.message, /TEIL-0077-M2 hinzugefügt/);
    assert.deepEqual(res.body.data.programs.map(p => p.program_number).sort(), ['TEIL-0077-M1', 'TEIL-0077-M2']);
    const row = (await pool.query(
      'SELECT local_dir, updated_by FROM agent_deployment_programs WHERE deployment_id = $1 AND program_id = $2', [depId, m2])).rows[0];
    assert.equal(row.local_dir, 'TEIL-0077\\TEIL-0077-M2');
    assert.equal(row.updated_by, adminId);
  });

  await test('Manifest: Agent bekommt M2 in derselben Bereitstellung', async () => {
    const res = await asAgent(key, agentApi.getManifest);
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.deployments.length, 1);
    assert.deepEqual(res.body.deployments[0].programs.map(p => p.program_number).sort(), ['TEIL-0077-M1', 'TEIL-0077-M2']);
  });

  await test('Schon enthalten → 400 mit Hinweis', async () => {
    const res = await add(depId, [m1]);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body.details, ['TEIL-0077-M1 ist schon in dieser Bereitstellung']);
  });

  await test('Nicht freigegeben → 400', async () => {
    const res = await add(depId, [m3]);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.details[0], /TEIL-0077-M3: nicht freigegeben/);
  });

  await test('Programm aus anderem Arbeitsgang → 400', async () => {
    const res = await add(depId, [fremd]);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.details[0], /gehört nicht zu diesem Arbeitsgang/);
  });

  await test('Excel-Vorlage schon auf dem Gerät → 400, nichts eingefügt', async () => {
    const res = await add(depId, [m4]);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.details[0], /Excel-Vorlage TEIL-0077-M1\.xlsx ist auf diesem Gerät schon bereitgestellt/);
    const n = (await pool.query('SELECT count(*)::int AS n FROM agent_deployment_programs WHERE deployment_id = $1', [depId])).rows[0].n;
    assert.equal(n, 2);
  });

  await test('Leere oder ungültige Liste → 400, unbekannte Bereitstellung → 404', async () => {
    assert.equal((await add(depId, [])).statusCode, 400);
    assert.equal((await add(depId, ['x'])).statusCode, 400);
    assert.equal((await add(999999, [m2])).statusCode, 404);
  });

  await test('Beim Abschließen → 409', async () => {
    await pool.query("UPDATE agent_deployments SET status = 'closing' WHERE id = $1", [depId]);
    const res = await add(depId, [m4]);
    assert.equal(res.statusCode, 409);
    assert.match(res.body.error, /gerade abgeschlossen/);
  });

  console.log(`\n${passed} Tests bestanden`);
  await pool.end();
})().catch(async (err) => {
  console.error(err);
  process.exitCode = 1;
  await pool.end().catch(() => {});
});
