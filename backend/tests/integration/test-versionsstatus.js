/**
 * Integrations-Test: Status je Programmversion (program_revisions.workflow_state_id)
 * Statuswechsel am Programm gilt für die aktuelle Version; Rollback auf die freigegebene Version → „Freigegeben“,
 * auf jede andere → „Entwurf“ (ROADMAP „Versionsstatus je Revision wird nie gepflegt“, Befund 30.10.2026).
 * Läuft nur über tests/integration/run.js (Wegwerf-Datenbank).
 */
if (!(process.env.DB_NAME || '').includes('test')) {
  console.error('Abbruch: nur gegen eine Test-Datenbank (DB_NAME mit „test“) – Aufruf über tests/integration/run.js');
  process.exit(1);
}

const assert = require('node:assert/strict');
const pool = require('../../src/config/db');
const workflow = require('../../src/controllers/workflowController');
const programs = require('../../src/controllers/programsController');

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

(async () => {
  const adminId = (await pool.query("SELECT id FROM users WHERE username = 'admin'")).rows[0].id;
  const state = {};
  for (const r of (await pool.query('SELECT id, name FROM workflow_states')).rows) state[r.name] = r.id;
  const nameOf = (id) => Object.keys(state).find(k => state[k] === id);

  const partId = (await pool.query(
    "INSERT INTO parts (part_number, part_name) VALUES ('TEIL-0002', 'Testteil Versionsstatus') RETURNING id")).rows[0].id;
  const opId = (await pool.query(
    "INSERT INTO operations (part_id, op_number, op_name) VALUES ($1, 'OP10', 'Fräsen') RETURNING id", [partId])).rows[0].id;
  const progId = (await pool.query(
    `INSERT INTO programs (operation_id, program_number, program_name, workflow_state_id)
     VALUES ($1, 'TEIL-0002-OP10', 'Schruppen', $2) RETURNING id`, [opId, state.draft])).rows[0].id;

  // Neue Version wie beim Hochladen: Entwurf, wird aktuelle Version, Programm zurück auf Entwurf
  async function upload(version) {
    const [major, minor, patch] = version.split('.').map(Number);
    const id = (await pool.query(
      `INSERT INTO program_revisions (program_id, version_major, version_minor, version_patch, version_string,
         filename, filepath, workflow_state_id)
       VALUES ($1, $2, $3, $4, $5, 'TEIL-0002.h', '/nicht/vorhanden', $6) RETURNING id`,
      [progId, major, minor, patch, version, state.draft])).rows[0].id;
    await pool.query('UPDATE programs SET current_revision_id = $1, workflow_state_id = $2 WHERE id = $3', [id, state.draft, progId]);
    return id;
  }
  const change = (to) => call(workflow.changeWorkflowState, {
    body: { entityType: 'program', entityId: progId, toStateId: state[to] }, user: { id: adminId },
  });
  const rollback = (to) => call(programs.rollbackToRevision, { params: { id: progId }, query: { to }, user: { id: adminId } });
  const revState = async (id) => nameOf((await pool.query('SELECT workflow_state_id FROM program_revisions WHERE id = $1', [id])).rows[0].workflow_state_id);
  const progState = async () => nameOf((await pool.query('SELECT workflow_state_id FROM programs WHERE id = $1', [progId])).rows[0].workflow_state_id);

  const v1 = await upload('1.0.0');

  await test('Statuswechsel am Programm gilt für die aktuelle Version', async () => {
    for (const to of ['review', 'approved', 'released']) {
      assert.equal((await change(to)).statusCode, 200);
      assert.equal(await revState(v1), to);
    }
  });

  const v2 = await upload('1.0.1');

  await test('Neue Version freigeben: die alte behält „released“ als Verlauf', async () => {
    assert.equal(await revState(v2), 'draft');
    assert.equal((await change('released')).statusCode, 200);
    assert.equal(await revState(v2), 'released');
    assert.equal(await revState(v1), 'released');
  });

  await test('Rollback auf eine abgelöste Version → Programm „Entwurf“', async () => {
    const res = await rollback('1.0.0');
    assert.equal(res.statusCode, 200);
    assert.equal(await progState(), 'draft');
    assert.equal(await revState(v1), 'released');   // Version selbst bleibt unverändert
  });

  await test('Rollback auf die freigegebene Version → Programm wieder „Freigegeben“', async () => {
    assert.equal((await rollback('1.0.1')).statusCode, 200);
    assert.equal(await progState(), 'released');
  });

  console.log(`\n${passed} Tests bestanden`);
  await pool.end();
})();
