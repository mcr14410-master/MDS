/**
 * Bereitstellungen – Messprogramme auf einem Gerät (MDS-Agent) bereitstellen und abschließen
 *
 * Spec docs/konzepte/MESSPROGRAMME_AGENT_SPEC.md 5.2 (PR 4.4). Lesen für alle Angemeldeten,
 * Ändern mit program.deploy. Die Version je Programm wird beim Bereitstellen festgehalten
 * (agent_deployment_programs) und nur per „Aktualisieren“ umgestellt. Den Abgleich am Gerät
 * und die Statuswechsel active/closed übernimmt die Agent-API (PR 4.5).
 */

const pool = require('../config/db');
const { localDirFor, deviceLocation } = require('../services/cmmProgramFiles');
const {
  OPEN_STATUSES, selectPrograms, templateConflicts, localDirConflicts, newerRelease,
} = require('../services/deploymentChecks');

const isId = (v) => /^\d+$/.test(String(v));

const DEPLOYMENT_SELECT = `
  SELECT d.*, a.name AS agent_name, a.is_active AS agent_is_active, a.last_seen_at AS agent_last_seen_at,
         o.op_number, o.op_name, o.part_id, pt.part_number, pt.part_name,
         ur.username AS requested_by_username,
         uc.username AS close_requested_by_username,
         ux.username AS discard_local_by_username
  FROM agent_deployments d
  JOIN agents a ON a.id = d.agent_id
  JOIN operations o ON o.id = d.operation_id
  LEFT JOIN parts pt ON pt.id = o.part_id
  LEFT JOIN users ur ON ur.id = d.requested_by
  LEFT JOIN users uc ON uc.id = d.close_requested_by
  LEFT JOIN users ux ON ux.id = d.discard_local_by
`;

/** Programme, Dateien (Soll + gemeldeter Ist-Stand) zu Bereitstellungen hängen */
async function attachDetails(db, deployments) {
  if (deployments.length === 0) return deployments;
  const ids = deployments.map(d => d.id);

  const programs = await db.query(
    `SELECT dp.deployment_id, dp.program_id, dp.revision_id, dp.local_dir, dp.updated_at,
            uu.username AS updated_by_username,
            p.program_number, p.program_name, r.version_string AS version,
            p.released_revision_id, rel.version_string AS released_version, ws.name AS workflow_state
     FROM agent_deployment_programs dp
     JOIN programs p ON p.id = dp.program_id
     JOIN program_revisions r ON r.id = dp.revision_id
     LEFT JOIN program_revisions rel ON rel.id = p.released_revision_id
     LEFT JOIN workflow_states ws ON ws.id = p.workflow_state_id
     LEFT JOIN users uu ON uu.id = dp.updated_by
     WHERE dp.deployment_id = ANY($1)
     ORDER BY p.program_number`,
    [ids]
  );
  const files = await db.query(
    `SELECT dp.deployment_id, f.id AS file_id, f.revision_id, f.role, f.target, f.filename, f.file_hash, f.filesize
     FROM agent_deployment_programs dp
     JOIN program_revision_files f ON f.revision_id = dp.revision_id
     WHERE dp.deployment_id = ANY($1)
     ORDER BY f.id`,
    [ids]
  );
  const states = await db.query(
    `SELECT deployment_id, file_id, target, rel_path, expected_hash, local_hash, state, message, reported_at
     FROM agent_file_states WHERE deployment_id = ANY($1)
     ORDER BY rel_path`,
    [ids]
  );

  return deployments.map(d => {
    const own = (rows) => rows.filter(r => r.deployment_id === d.id);
    const stateRows = own(states.rows);
    const progs = own(programs.rows).map(p => ({
      ...p,
      newer_release: newerRelease(p.revision_id, p.released_revision_id, p.released_version),
      files: own(files.rows).filter(f => f.revision_id === p.revision_id).map(f => {
        const location = deviceLocation(f, p.local_dir);
        const reported = stateRows.find(s => s.file_id === f.file_id);
        return {
          file_id: f.file_id,
          role: f.role,
          filename: f.filename,
          filesize: f.filesize,
          file_hash: f.file_hash,
          ...location,
          state: reported ? reported.state : null,
          local_hash: reported ? reported.local_hash : null,
          message: reported ? reported.message : null,
          reported_at: reported ? reported.reported_at : null,
        };
      }),
    }));
    const knownFileIds = new Set(progs.flatMap(p => p.files.map(f => f.file_id)));
    return {
      ...d,
      programs: progs,
      // vom Agenten gemeldet, aber keine Soll-Datei (fremd, beschädigt, alte Version nach Aktualisieren)
      other_files: stateRows.filter(s => !s.file_id || !knownFileIds.has(s.file_id)),
    };
  });
}

async function loadDeployment(db, id) {
  const result = await db.query(`${DEPLOYMENT_SELECT} WHERE d.id = $1`, [id]);
  if (result.rows.length === 0) return null;
  return (await attachDetails(db, result.rows))[0];
}

// Offene Bereitstellungen des Geräts: Vorlagen und Ordner (für die Eindeutigkeitsprüfung)
async function openOnAgent(db, agentId, { excludeDeploymentId = null, excludeProgramId = null } = {}) {
  const result = await db.query(
    `SELECT d.id AS deployment_id, dp.program_id, dp.local_dir, p.program_number, pt.part_number, o.op_number,
            f.filename AS template_filename
     FROM agent_deployments d
     JOIN agent_deployment_programs dp ON dp.deployment_id = d.id
     JOIN programs p ON p.id = dp.program_id
     JOIN operations o ON o.id = d.operation_id
     LEFT JOIN parts pt ON pt.id = o.part_id
     LEFT JOIN program_revision_files f ON f.revision_id = dp.revision_id AND f.role = 'report_xlsx'
     WHERE d.agent_id = $1 AND d.status = ANY($2)
       AND NOT (d.id IS NOT DISTINCT FROM $3::int AND dp.program_id IS NOT DISTINCT FROM $4::int)`,
    [agentId, OPEN_STATUSES, excludeDeploymentId, excludeProgramId]
  );
  return {
    templates: result.rows.filter(r => r.template_filename).map(r => ({ ...r, filename: r.template_filename })),
    dirs: result.rows,
  };
}

async function templatesOf(db, revisionIds) {
  const result = await db.query(
    `SELECT revision_id, filename FROM program_revision_files
     WHERE role = 'report_xlsx' AND revision_id = ANY($1)`,
    [revisionIds]
  );
  return result.rows;
}

// GET /api/deployments?status=open|closed|all&agent_id=&operation_id=
exports.getDeployments = async (req, res) => {
  try {
    const status = req.query.status || 'open';
    if (!['open', 'closed', 'all'].includes(status)) {
      return res.status(400).json({ error: 'Ungültiger Status', allowed: ['open', 'closed', 'all'] });
    }
    for (const f of ['agent_id', 'operation_id']) {
      if (req.query[f] !== undefined && !isId(req.query[f])) return res.status(400).json({ error: `Ungültige ${f}` });
    }
    const statuses = status === 'open' ? OPEN_STATUSES : status === 'closed' ? ['closed'] : [...OPEN_STATUSES, 'closed'];
    const result = await pool.query(
      `${DEPLOYMENT_SELECT}
       WHERE d.status = ANY($1)
         AND ($2::int IS NULL OR d.agent_id = $2)
         AND ($3::int IS NULL OR d.operation_id = $3)
       ORDER BY d.created_at DESC
       LIMIT 200`,
      [statuses, req.query.agent_id || null, req.query.operation_id || null]
    );
    res.json({ success: true, data: await attachDetails(pool, result.rows) });
  } catch (error) {
    console.error('Error fetching deployments:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Bereitstellungen', details: error.message });
  }
};

// GET /api/deployments/:id – mit Dateien und Protokoll
exports.getDeploymentById = async (req, res) => {
  try {
    const deployment = await loadDeployment(pool, req.params.id);
    if (!deployment) return res.status(404).json({ error: 'Bereitstellung nicht gefunden' });
    const transfers = await pool.query(
      `SELECT t.id, t.program_id, t.program_number, t.version_string, t.filename, t.direction, t.result,
              t.file_hash, t.message, t.occurred_at, t.created_at, u.username AS triggered_by_username
       FROM program_transfers t LEFT JOIN users u ON u.id = t.triggered_by
       WHERE t.deployment_id = $1
       ORDER BY t.occurred_at DESC, t.id DESC
       LIMIT 500`,
      [deployment.id]
    );
    res.json({ success: true, data: { ...deployment, transfers: transfers.rows } });
  } catch (error) {
    console.error('Error fetching deployment:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Bereitstellung', details: error.message });
  }
};

// POST /api/deployments – { agent_id, operation_id, program_ids? }
exports.createDeployment = async (req, res) => {
  let client;
  try {
    const { agent_id, operation_id, program_ids } = req.body || {};
    if (!isId(agent_id) || !isId(operation_id)) {
      return res.status(400).json({ error: 'Pflichtfelder fehlen', required: ['agent_id', 'operation_id'] });
    }
    if (program_ids !== undefined && (!Array.isArray(program_ids) || !program_ids.every(isId))) {
      return res.status(400).json({ error: 'program_ids muss eine Liste von IDs sein' });
    }

    const agentResult = await pool.query('SELECT id, name, is_active, modules FROM agents WHERE id = $1', [agent_id]);
    if (agentResult.rows.length === 0) return res.status(404).json({ error: 'Agent nicht gefunden' });
    const agent = agentResult.rows[0];
    if (!agent.is_active) return res.status(400).json({ error: `Agent ${agent.name} ist deaktiviert` });
    if (!agent.modules.includes('cmm_sync')) {
      return res.status(400).json({ error: `Agent ${agent.name} hat das Modul „Messprogramme (PC-DMIS)“ nicht` });
    }

    const opResult = await pool.query(
      `SELECT o.id, o.op_number, pt.part_number FROM operations o
       LEFT JOIN parts pt ON pt.id = o.part_id WHERE o.id = $1`,
      [operation_id]
    );
    if (opResult.rows.length === 0) return res.status(404).json({ error: 'Arbeitsgang nicht gefunden' });
    const operation = opResult.rows[0];

    const existing = await pool.query(
      'SELECT id, status FROM agent_deployments WHERE agent_id = $1 AND operation_id = $2 AND status = ANY($3)',
      [agent.id, operation.id, OPEN_STATUSES]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'Dieser Arbeitsgang ist auf dem Gerät schon bereitgestellt',
        deployment_id: existing.rows[0].id,
      });
    }

    const programsResult = await pool.query(
      `SELECT p.id, p.program_number, p.released_revision_id, ws.name AS workflow_state
       FROM programs p LEFT JOIN workflow_states ws ON ws.id = p.workflow_state_id
       WHERE p.operation_id = $1 AND p.kind = 'cmm'
       ORDER BY p.program_number`,
      [operation.id]
    );
    const { selected, skipped, errors } = selectPrograms(programsResult.rows, program_ids);

    const candidates = selected.map(p => ({
      ...p,
      local_dir: localDirFor(operation.part_number, p.program_number),
    }));
    if (errors.length === 0) {
      const open = await openOnAgent(pool, agent.id);
      const templates = (await templatesOf(pool, candidates.map(c => c.released_revision_id)))
        .map(t => ({ ...t, program_number: candidates.find(c => c.released_revision_id === t.revision_id).program_number }));
      errors.push(...templateConflicts(templates, open.templates));
      errors.push(...localDirConflicts(candidates, open.dirs));
    }
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Bereitstellen nicht möglich', details: errors, skipped });
    }

    client = await pool.connect();
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO agent_deployments (agent_id, operation_id, requested_by, last_activity_at)
       VALUES ($1, $2, $3, now()) RETURNING id`,
      [agent.id, operation.id, req.user?.id || null]
    );
    const deploymentId = inserted.rows[0].id;
    for (const c of candidates) {
      await client.query(
        `INSERT INTO agent_deployment_programs (deployment_id, program_id, revision_id, local_dir, updated_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [deploymentId, c.id, c.released_revision_id, c.local_dir, req.user?.id || null]
      );
    }
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Bereitgestellt auf ${agent.name} – der Agent legt die Dateien beim nächsten Abgleich ab`,
      data: await loadDeployment(pool, deploymentId),
      skipped,
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (error.code === '23505' && error.constraint === 'agent_deployments_open_key') {
      return res.status(409).json({ error: 'Dieser Arbeitsgang ist auf dem Gerät schon bereitgestellt' });
    }
    console.error('Error creating deployment:', error);
    res.status(500).json({ error: 'Fehler beim Bereitstellen', details: error.message });
  } finally {
    if (client) client.release();
  }
};

// POST /api/deployments/:id/programs/:programId/update – auf die aktuell freigegebene Version umstellen
exports.updateDeploymentProgram = async (req, res) => {
  try {
    const { id, programId } = req.params;
    const result = await pool.query(
      `SELECT d.id, d.agent_id, d.status, dp.revision_id, p.program_number, p.released_revision_id,
              rel.version_string AS released_version, r.version_string AS version, ws.name AS workflow_state
       FROM agent_deployments d
       JOIN agent_deployment_programs dp ON dp.deployment_id = d.id AND dp.program_id = $2
       JOIN programs p ON p.id = dp.program_id
       JOIN program_revisions r ON r.id = dp.revision_id
       LEFT JOIN program_revisions rel ON rel.id = p.released_revision_id
       LEFT JOIN workflow_states ws ON ws.id = p.workflow_state_id
       WHERE d.id = $1`,
      [id, programId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Programm in dieser Bereitstellung nicht gefunden' });
    const row = result.rows[0];

    if (!['requested', 'active'].includes(row.status)) {
      return res.status(409).json({ error: 'Nur offene Bereitstellungen lassen sich aktualisieren (nicht beim Abschließen)' });
    }
    if (row.workflow_state === 'archived') return res.status(400).json({ error: `${row.program_number} ist archiviert` });
    if (!newerRelease(row.revision_id, row.released_revision_id, row.released_version)) {
      return res.status(400).json({ error: `${row.program_number}: keine andere freigegebene Version als ${row.version}` });
    }

    const open = await openOnAgent(pool, row.agent_id, { excludeDeploymentId: row.id, excludeProgramId: Number(programId) });
    const templates = (await templatesOf(pool, [row.released_revision_id]))
      .map(t => ({ ...t, program_number: row.program_number }));
    const errors = templateConflicts(templates, open.templates);
    if (errors.length > 0) return res.status(400).json({ error: 'Aktualisieren nicht möglich', details: errors });

    await pool.query(
      `UPDATE agent_deployment_programs SET revision_id = $3, updated_by = $4, updated_at = now()
       WHERE deployment_id = $1 AND program_id = $2`,
      [row.id, programId, row.released_revision_id, req.user?.id || null]
    );
    await pool.query('UPDATE agent_deployments SET last_activity_at = now() WHERE id = $1', [row.id]);

    res.json({
      success: true,
      message: `${row.program_number}: ${row.version} → ${row.released_version} – der Agent tauscht beim nächsten Abgleich (mit Nachfrage, falls vor Ort gespeichert)`,
      data: await loadDeployment(pool, row.id),
    });
  } catch (error) {
    console.error('Error updating deployment program:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren', details: error.message });
  }
};

// POST /api/deployments/:id/close – „Fertig“
exports.closeDeployment = async (req, res) => {
  try {
    const { id } = req.params;
    const current = await pool.query(
      `SELECT d.status,
              EXISTS (SELECT 1 FROM agent_file_states s WHERE s.deployment_id = d.id)
              OR EXISTS (SELECT 1 FROM program_transfers t WHERE t.deployment_id = d.id) AS device_touched
       FROM agent_deployments d WHERE d.id = $1`,
      [id]
    );
    if (current.rows.length === 0) return res.status(404).json({ error: 'Bereitstellung nicht gefunden' });
    const { status, device_touched: deviceTouched } = current.rows[0];
    if (!['requested', 'active'].includes(status)) {
      return res.status(409).json({ error: status === 'closing' ? 'Wird schon abgeschlossen' : 'Ist schon abgeschlossen' });
    }

    // Noch nie beim Gerät angekommen → gleich erledigt; sonst räumt der Agent auf (closing → closed)
    const cancel = status === 'requested' && !deviceTouched;
    await pool.query(
      `UPDATE agent_deployments
       SET status = $2::varchar, close_requested_by = $3, close_requested_at = now(), close_reason = $4,
           closed_at = CASE WHEN $2::varchar = 'closed' THEN now() ELSE NULL END
       WHERE id = $1 AND status IN ('requested', 'active')`,
      [id, cancel ? 'closed' : 'closing', req.user?.id || null, cancel ? 'cancelled' : 'manual']
    );
    res.json({
      success: true,
      message: cancel
        ? 'Bereitstellung zurückgenommen – auf dem Gerät lag noch nichts'
        : 'Wird abgeschlossen – der Agent räumt beim nächsten Abgleich auf',
      data: await loadDeployment(pool, id),
    });
  } catch (error) {
    console.error('Error closing deployment:', error);
    res.status(500).json({ error: 'Fehler beim Abschließen', details: error.message });
  }
};

// POST /api/deployments/:id/discard-local – vor Ort bearbeitete Dateien verwerfen (nur beim Abschließen)
exports.discardLocal = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE agent_deployments SET discard_local_by = $2, discard_local_at = now()
       WHERE id = $1 AND status = 'closing' RETURNING id`,
      [req.params.id, req.user?.id || null]
    );
    if (result.rows.length === 0) {
      const exists = await pool.query('SELECT status FROM agent_deployments WHERE id = $1', [req.params.id]);
      if (exists.rows.length === 0) return res.status(404).json({ error: 'Bereitstellung nicht gefunden' });
      return res.status(409).json({ error: 'Verwerfen geht nur beim Abschließen (erst „Fertig“)' });
    }
    res.json({
      success: true,
      message: 'Lokale Dateien werden verworfen – der Agent löscht sie beim nächsten Abgleich',
      data: await loadDeployment(pool, req.params.id),
    });
  } catch (error) {
    console.error('Error discarding local files:', error);
    res.status(500).json({ error: 'Fehler beim Verwerfen', details: error.message });
  }
};
