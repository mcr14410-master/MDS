/**
 * Agent-API – Endpunkte für den MDS-Agenten selbst (Header X-Agent-Key, siehe middleware/agentAuth.js)
 *
 * Spec docs/konzepte/MESSPROGRAMME_AGENT_SPEC.md 5.4 (PR 4.5):
 * - Manifest: Konfiguration + Soll-Stand aller offenen Bereitstellungen (festgehaltene Versionen)
 * - Datei: nur aus festgehaltenen Versionen offener Bereitstellungen dieses Agenten
 * - Bericht: vollständiger Ist-Stand, Transfers (idempotent über client_id), Warnungen;
 *   daraus requested → active und closing → closed
 * - Fertig im Tray: eigene Bereitstellung → closing
 * Der Agent darf nur lesen, was ihm bereitgestellt ist, und nur den eigenen Zustand melden.
 */

const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { version: SERVER_VERSION } = require('../../package.json');
const { insideCmmDir } = require('../middleware/uploadMiddleware');
const { deviceLocation } = require('../services/cmmProgramFiles');
const { OPEN_STATUSES, newerRelease } = require('../services/deploymentChecks');
const { validateReport, nextStatus, triggeredBy } = require('../services/agentReport');

const hasModule = (agent, key) => Array.isArray(agent.modules) && agent.modules.includes(key);

// GET /api/agent/manifest
exports.getManifest = async (req, res) => {
  try {
    const { agent } = req;
    const config = {
      agent_id: agent.id,
      name: agent.name,
      modules: agent.modules,
      poll_interval_sec: agent.poll_interval_sec,
      server_version: SERVER_VERSION,
    };
    // Modul aus → keine Bereitstellungen; der Agent löscht dann nichts von selbst (Spec 6.5)
    if (!hasModule(agent, 'cmm_sync')) return res.json({ config, deployments: [] });

    const deployments = await pool.query(
      `SELECT d.id, d.status, d.created_at, d.discard_local_at,
              pt.part_number, o.op_number, o.op_name AS operation_name,
              COALESCE(NULLIF(trim(concat_ws(' ', u.first_name, u.last_name)), ''), u.username) AS requested_by
       FROM agent_deployments d
       JOIN operations o ON o.id = d.operation_id
       LEFT JOIN parts pt ON pt.id = o.part_id
       LEFT JOIN users u ON u.id = d.requested_by
       WHERE d.agent_id = $1 AND d.status = ANY($2)
       ORDER BY d.created_at`,
      [agent.id, OPEN_STATUSES]
    );
    const ids = deployments.rows.map(d => d.id);
    const programs = await pool.query(
      `SELECT dp.deployment_id, dp.program_id, dp.revision_id, dp.local_dir,
              p.program_number, r.version_string AS version,
              p.released_revision_id, rel.version_string AS released_version
       FROM agent_deployment_programs dp
       JOIN programs p ON p.id = dp.program_id
       JOIN program_revisions r ON r.id = dp.revision_id
       LEFT JOIN program_revisions rel ON rel.id = p.released_revision_id
       WHERE dp.deployment_id = ANY($1)
       ORDER BY p.program_number`,
      [ids]
    );
    const files = await pool.query(
      `SELECT f.id AS file_id, f.revision_id, f.role, f.target, f.filename, f.file_hash, f.filesize
       FROM program_revision_files f
       WHERE f.revision_id = ANY($1)
       ORDER BY f.id`,
      [programs.rows.map(p => p.revision_id)]
    );

    res.json({
      config,
      deployments: deployments.rows.map(d => ({
        id: d.id,
        status: d.status,
        part_number: d.part_number,
        op_number: d.op_number,
        operation_name: d.operation_name,
        requested_by: d.requested_by,
        created_at: d.created_at,
        discard_local: d.discard_local_at !== null,
        programs: programs.rows.filter(p => p.deployment_id === d.id).map(p => ({
          program_id: p.program_id,
          program_number: p.program_number,
          version: p.version,
          revision_id: p.revision_id,
          newer_release: newerRelease(p.revision_id, p.released_revision_id, p.released_version),
          local_dir: p.local_dir,
          files: files.rows.filter(f => f.revision_id === p.revision_id).map(f => ({
            file_id: f.file_id,
            role: f.role,
            ...deviceLocation(f, p.local_dir),
            hash: f.file_hash,
            size: f.filesize,
            url: `/api/agent/files/${f.file_id}`,
          })),
        })),
      })),
    });
  } catch (error) {
    console.error('Error building agent manifest:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Manifests' });
  }
};

// GET /api/agent/files/:fileId – nur Dateien festgehaltener Versionen offener Bereitstellungen
exports.getFile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.filename, f.filepath, f.file_hash
       FROM program_revision_files f
       WHERE f.id = $1
         AND EXISTS (SELECT 1 FROM agent_deployment_programs dp
                     JOIN agent_deployments d ON d.id = dp.deployment_id
                     WHERE dp.revision_id = f.revision_id AND d.agent_id = $2 AND d.status = ANY($3))`,
      [req.params.fileId, req.agent.id, OPEN_STATUSES]
    );
    // Gleiche Antwort für „gibt es nicht“ und „nicht bereitgestellt“
    if (result.rows.length === 0 || !hasModule(req.agent, 'cmm_sync')) {
      return res.status(404).json({ error: 'Datei nicht gefunden' });
    }
    const file = result.rows[0];
    if (!insideCmmDir(file.filepath)) return res.status(403).json({ error: 'Ungültiger Dateipfad' });

    let stat;
    try {
      stat = await fs.promises.stat(file.filepath);
    } catch {
      return res.status(404).json({ error: 'Datei nicht auf dem Server gefunden' });
    }
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`);
    res.setHeader('X-File-Hash', file.file_hash);
    fs.createReadStream(path.resolve(file.filepath))
      .on('error', (err) => {
        console.error('Error streaming agent file:', err);
        res.destroy(err);
      })
      .pipe(res);
  } catch (error) {
    console.error('Error sending agent file:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Fehler beim Laden der Datei' });
  }
};

// POST /api/agent/report – Ist-Stand, Transfers, Warnungen
exports.postReport = async (req, res) => {
  const { agent } = req;
  let client;
  try {
    const own = await pool.query(
      `SELECT id, status, requested_by, close_requested_by, discard_local_by
       FROM agent_deployments WHERE agent_id = $1`,
      [agent.id]
    );
    const deploymentsById = new Map(own.rows.map(d => [d.id, d]));
    const { report, ignored } = validateReport(req.body, new Set(deploymentsById.keys()));

    // Dateien nachschlagen: Soll-Hash, Programm/Version für das Protokoll
    const fileIds = [...new Set([...report.files, ...report.transfers].map(x => x.file_id).filter(Boolean))];
    const fileInfo = new Map((await pool.query(
      `SELECT f.id, f.file_hash, r.id AS revision_id, r.version_string, p.id AS program_id, p.program_number
       FROM program_revision_files f
       JOIN program_revisions r ON r.id = f.revision_id
       JOIN programs p ON p.id = r.program_id
       WHERE f.id = ANY($1)`,
      [fileIds]
    )).rows.map(f => [f.id, f]));
    const pinned = await pool.query(
      `SELECT dp.deployment_id, dp.program_id, dp.updated_by, f.id AS file_id
       FROM agent_deployment_programs dp
       JOIN agent_deployments d ON d.id = dp.deployment_id
       JOIN program_revision_files f ON f.revision_id = dp.revision_id
       WHERE d.agent_id = $1 AND d.status = ANY($2)`,
      [agent.id, OPEN_STATUSES]
    );

    client = await pool.connect();
    await client.query('BEGIN');

    // Ist-Stand vollständig ersetzen
    await client.query('DELETE FROM agent_file_states WHERE agent_id = $1', [agent.id]);
    for (const f of report.files) {
      const info = f.file_id ? fileInfo.get(f.file_id) : null;
      const openDeployment = f.deployment_id && OPEN_STATUSES.includes(deploymentsById.get(f.deployment_id)?.status);
      await client.query(
        `INSERT INTO agent_file_states
           (agent_id, target, rel_path, deployment_id, file_id, expected_hash, local_hash, state, message, reported_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`,
        [agent.id, f.target, f.rel_path, openDeployment ? f.deployment_id : null, info ? f.file_id : null,
          info ? info.file_hash : null, f.local_hash, f.state, f.message]
      );
    }

    // Protokoll – schon bekannte client_id überspringen (Wiederholung aus der Outbox)
    let transfersNew = 0;
    for (const t of report.transfers) {
      const info = t.file_id ? fileInfo.get(t.file_id) : null;
      const deployment = t.deployment_id ? deploymentsById.get(t.deployment_id) : null;
      const pin = pinned.rows.find(p => p.deployment_id === t.deployment_id && p.file_id === t.file_id);
      const inserted = await client.query(
        `INSERT INTO program_transfers
           (client_id, agent_id, deployment_id, program_id, revision_id, file_id, program_number, version_string,
            filename, direction, result, file_hash, message, triggered_by, occurred_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (client_id) DO NOTHING`,
        [t.client_id, agent.id, t.deployment_id, info?.program_id ?? null, info?.revision_id ?? null,
          info ? t.file_id : null, info?.program_number ?? null, info?.version_string ?? null,
          t.filename, t.direction, t.result, t.file_hash, t.message,
          triggeredBy(t.direction, deployment, pin?.updated_by ?? null), t.occurred_at]
      );
      transfersNew += inserted.rowCount;
    }

    // Aktivität und Statuswechsel je offener Bereitstellung
    const warnings = [...report.warnings];
    const statusChanges = [];
    for (const d of own.rows.filter(x => OPEN_STATUSES.includes(x.status))) {
      const entry = report.deployments.find(x => x.id === d.id);
      if (entry?.activity_at) {
        await client.query(
          `UPDATE agent_deployments SET last_activity_at = GREATEST(COALESCE(last_activity_at, $2), $2) WHERE id = $1`,
          [d.id, entry.activity_at]
        );
      }
      const expected = pinned.rows.filter(p => p.deployment_id === d.id).map(p => p.file_id);
      const reported = report.files.filter(f => f.deployment_id === d.id)
        .map(f => ({ file_id: fileInfo.has(f.file_id) ? f.file_id : null, state: f.state }));
      const { status, warning } = nextStatus(d, expected, reported, entry?.closed === true);
      if (warning) warnings.push({ code: 'report', deployment_id: d.id, text: warning });
      if (status === 'active') {
        await client.query(
          `UPDATE agent_deployments SET status = 'active', activated_at = now() WHERE id = $1 AND status = 'requested'`,
          [d.id]
        );
        statusChanges.push({ id: d.id, status });
      } else if (status === 'closed') {
        await client.query(
          `UPDATE agent_deployments SET status = 'closed', closed_at = now(), close_reason = COALESCE(close_reason, 'manual')
           WHERE id = $1 AND status = 'closing'`,
          [d.id]
        );
        statusChanges.push({ id: d.id, status });
      }
    }
    // closed: true zu einer schon erledigten Bereitstellung (Wiederholung) wird still ignoriert

    await client.query('UPDATE agents SET last_warnings = $2 WHERE id = $1', [agent.id, JSON.stringify(warnings.slice(0, 120))]);
    await client.query('COMMIT');

    res.json({
      success: true,
      files: report.files.length,
      transfers_new: transfersNew,
      transfers_known: report.transfers.length - transfersNew,
      status_changes: statusChanges,
      ignored,
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Error processing agent report:', error);
    res.status(500).json({ error: 'Fehler beim Verarbeiten des Berichts' });
  } finally {
    if (client) client.release();
  }
};

// POST /api/agent/deployments/:id/close – „Fertig“ im Tray (nur eigene Bereitstellung)
exports.closeDeployment = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE agent_deployments
       SET status = 'closing', close_requested_at = now(), close_reason = 'manual'
       WHERE id = $1 AND agent_id = $2 AND status IN ('requested', 'active')
       RETURNING id`,
      [req.params.id, req.agent.id]
    );
    if (result.rows.length === 0) {
      const current = await pool.query('SELECT status FROM agent_deployments WHERE id = $1 AND agent_id = $2', [req.params.id, req.agent.id]);
      if (current.rows.length === 0) return res.status(404).json({ error: 'Bereitstellung nicht gefunden' });
      return res.status(409).json({ error: 'Bereitstellung ist nicht offen', status: current.rows[0].status });
    }
    res.json({ success: true, id: result.rows[0].id, status: 'closing' });
  } catch (error) {
    console.error('Error closing deployment from agent:', error);
    res.status(500).json({ error: 'Fehler beim Abschließen' });
  }
};
