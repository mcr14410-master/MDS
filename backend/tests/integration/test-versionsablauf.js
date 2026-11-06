/**
 * Integrations-Test: Ablauf je Programmversion (workflow_history.revision_id, released_by/at)
 * Statuswechsel merken die aktuelle Version, die Freigabe steht an der Version, und die Versionsliste
 * liefert den Ablauf je Version mit echten Zeitpunkten.
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

  const partId = (await pool.query(
    "INSERT INTO parts (part_number, part_name) VALUES ('TEIL-0003', 'Testteil Versionsablauf') RETURNING id")).rows[0].id;
  const opId = (await pool.query(
    "INSERT INTO operations (part_id, op_number, op_name) VALUES ($1, 'OP10', 'Fräsen') RETURNING id", [partId])).rows[0].id;
  const progId = (await pool.query(
    `INSERT INTO programs (operation_id, program_number, program_name, workflow_state_id)
     VALUES ($1, 'TEIL-0003-1', 'Schruppen', $2) RETURNING id`, [opId, state.draft])).rows[0].id;

  // Neue NC-Version wie beim Hochladen; created_at wie vom programsController (Pool ohne Zeitzone → UTC)
  async function upload(version) {
    const [major, minor, patch] = version.split('.').map(Number);
    const id = (await pool.query(
      `INSERT INTO program_revisions (program_id, version_major, version_minor, version_patch, version_string,
         filename, filepath, workflow_state_id, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, 'TEIL-0003.h', '/nicht/vorhanden', $6, $7, now() AT TIME ZONE 'UTC') RETURNING id`,
      [progId, major, minor, patch, version, state.draft, adminId])).rows[0].id;
    await pool.query('UPDATE programs SET current_revision_id = $1, workflow_state_id = $2 WHERE id = $3', [id, state.draft, progId]);
    return id;
  }
  const change = (to, changeReason) => call(workflow.changeWorkflowState, {
    body: { entityType: 'program', entityId: progId, toStateId: state[to], changeReason }, user: { id: adminId },
  });
  const nearNow = (value) => Math.abs(new Date(value).getTime() - Date.now()) < 2 * 60 * 1000;

  const r1 = await upload('1.0.0');
  for (const to of ['review', 'approved', 'released']) assert.equal((await change(to)).statusCode, 200);
  const r2 = await upload('1.0.1');
  assert.equal((await change('review')).statusCode, 200);
  assert.equal((await change('rejected', 'Bohrbild nicht gemessen')).statusCode, 200);

  await test('Statuswechsel merken die aktuelle Version', async () => {
    const { rows } = await pool.query(
      "SELECT revision_id FROM workflow_history WHERE entity_type = 'program' AND entity_id = $1 ORDER BY id", [progId]);
    assert.deepEqual(rows.map(r => r.revision_id), [r1, r1, r1, r2, r2]);
  });

  await test('Freigabe steht an der Version (released_by/at)', async () => {
    const { rows } = await pool.query('SELECT id, released_by, released_at FROM program_revisions WHERE program_id = $1 ORDER BY id', [progId]);
    assert.equal(rows[0].released_by, adminId);
    assert.ok(rows[0].released_at);
    assert.equal(rows[1].released_by, null);
  });

  await test('Versionsliste liefert den Ablauf je Version', async () => {
    const res = await call(programs.getProgramRevisions, { params: { id: progId } });
    assert.equal(res.statusCode, 200);
    const byVersion = Object.fromEntries(res.body.data.revisions.map(r => [r.version_string, r]));
    assert.deepEqual(byVersion['1.0.0'].history.map(h => h.to_state), ['review', 'approved', 'released']);
    assert.deepEqual(byVersion['1.0.1'].history.map(h => h.to_state), ['review', 'rejected']);
    assert.equal(byVersion['1.0.1'].history[1].change_reason, 'Bohrbild nicht gemessen');
    assert.equal(byVersion['1.0.1'].history[1].changed_by_username, 'admin');
    assert.equal(byVersion['1.0.0'].released_by_username, 'admin');
  });

  await test('Zeitpunkte sind echte Zeitpunkte (nicht um die Zeitzone verschoben)', async () => {
    const res = await call(programs.getProgramRevisions, { params: { id: progId } });
    for (const r of res.body.data.revisions) {
      assert.ok(nearNow(r.created_at), `created_at ${r.created_at}`);
      for (const h of r.history) assert.ok(nearNow(h.created_at), `history ${h.created_at}`);
    }
    assert.ok(nearNow(res.body.data.revisions.find(r => r.version_string === '1.0.0').released_at));
  });

  console.log(`\n${passed} Tests bestanden`);
  await pool.end();
  process.exit(process.exitCode || 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
