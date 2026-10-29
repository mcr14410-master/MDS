/**
 * Messprogramme (KMG / PC-DMIS) – Dateigruppen je Revision
 *
 * Schritt 2 aus docs/konzepte/MESSPROGRAMME_KONZEPT.md. Messprogramme sind `programs` mit
 * kind = 'cmm'; Versionierung, Workflow und Rollback laufen über die bestehenden
 * Programm-Endpunkte. Hier: Anlegen und neue Revision mit mehreren Dateien, Dateiliste,
 * Anzeige/Download einzeln und als ZIP. Mit ?dry_run=true prüfen beide Uploads nur und
 * melden die geplante Dateigruppe (Vorschau), ohne etwas zu speichern.
 *
 * program_revisions.filename/filepath/file_hash = Hauptdatei (.prg), alle Dateien der Gruppe
 * zusätzlich in program_revision_files (filename = Originalname).
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');
const { XMLValidator } = require('fast-xml-parser');
const pool = require('../config/db');
const { CMM_UPLOAD_DIR } = require('../middleware/uploadMiddleware');
const { suggestProgramNumber } = require('../utils/programNumber');
const {
  ROLE_LABELS, decodeOriginalName, classifyFile, hasCustomMiniRoutines, planRevision,
} = require('../services/cmmProgramFiles');

const VERSION_TYPES = ['patch', 'minor', 'major'];

const sha256 = (filepath) => new Promise((resolve, reject) => {
  const hash = crypto.createHash('sha256');
  fsSync.createReadStream(filepath)
    .on('data', (d) => hash.update(d))
    .on('end', () => resolve(hash.digest('hex')))
    .on('error', reject);
});

const removeFiles = (paths) => Promise.all(paths.map(p => fs.unlink(p).catch(() => {})));
const uploadedPaths = (req) => (req.files || []).map(f => f.path);

// Pfad muss im Messprogramm-Verzeichnis liegen (Path-Traversal-Schutz)
function insideCmmDir(filepath) {
  const resolved = path.resolve(filepath);
  const dir = path.resolve(CMM_UPLOAD_DIR);
  return resolved.startsWith(dir + path.sep);
}

const toList = (value) => {
  if (value === undefined || value === null || value === '') return [];
  return (Array.isArray(value) ? value : String(value).split(','))
    .map(v => String(v).trim()).filter(Boolean);
};

const parseExcelReport = (value) => {
  if (value === undefined || value === '') return undefined;
  return value === true || value === 'true';
};

/**
 * Hochgeladene Dateien einordnen. Nebendateien werden sofort gelöscht und als Hinweis
 * gemeldet; unbekannte Dateien und ungültiges XML sind Fehler.
 */
async function classifyUploads(reqFiles) {
  const uploaded = [];
  const ignored = [];
  const errors = [];
  const discard = [];

  for (const file of reqFiles) {
    const name = decodeOriginalName(file.originalname);
    if (name !== path.basename(name) || /[\\/:*?"<>|\u0000-\u001f]/.test(name)) {
      errors.push(`Ungültiger Dateiname: ${name}`);
      continue;
    }
    let info = classifyFile(name);

    if (info.kind === 'miniroutines') {
      const xml = await fs.readFile(file.path, 'utf8');
      info = hasCustomMiniRoutines(xml)
        ? { kind: 'file', role: 'other', target: 'program_dir' }
        : { kind: 'sidecar' };
    }

    if (info.kind === 'sidecar') {
      ignored.push({ name, reason: 'Von PC-DMIS angelegte Nebendatei – wird nicht versioniert' });
      discard.push(file.path);
      continue;
    }
    if (info.kind === 'corrupt') {
      ignored.push({ name, reason: 'Von PC-DMIS beschädigt gemeldete Datei – nicht übernommen' });
      discard.push(file.path);
      continue;
    }
    if (info.kind === 'cad_import') {
      ignored.push({ name, reason: 'CAD-Import (STEP) – steckt bereits in der .cad, wird nicht versioniert' });
      discard.push(file.path);
      continue;
    }
    if (info.kind === 'unknown') {
      ignored.push({ name, reason: 'Dateityp wird nicht versioniert (nur .prg, .cad, .pdf, .xlsx, .layout.xml, .MiniRoutines.xml)' });
      discard.push(file.path);
      continue;
    }

    if (info.role === 'report_layout') {
      const xml = await fs.readFile(file.path, 'utf8');
      const valid = XMLValidator.validate(xml);
      if (valid !== true) {
        errors.push(`${name} ist kein gültiges XML (${valid.err.msg})`);
        continue;
      }
    }

    uploaded.push({
      name,
      role: info.role,
      target: info.target,
      path: file.path,
      size: file.size,
      mime: file.mimetype,
      hash: await sha256(file.path),
    });
  }

  await removeFiles(discard);
  return { uploaded, ignored, errors };
}

// Gleicher Vorlagenname in einem anderen Messprogramm? (alle Vorlagen liegen in einem Verzeichnis)
async function findTemplateConflict(db, templateName, programId) {
  const result = await db.query(
    `SELECT p.program_number, p.program_name, pt.part_number
     FROM program_revision_files f
     JOIN programs p ON p.current_revision_id = f.revision_id
     LEFT JOIN operations o ON o.id = p.operation_id
     LEFT JOIN parts pt ON pt.id = o.part_id
     WHERE f.role = 'report_xlsx'
       AND lower(f.filename) = lower($1)
       AND ($2::int IS NULL OR p.id <> $2)
     LIMIT 1`,
    [`${templateName}.xlsx`, programId || null]
  );
  return result.rows[0] || null;
}

async function nextVersion(db, programId, versionType) {
  const result = await db.query(
    `SELECT version_major, version_minor, version_patch FROM program_revisions
     WHERE program_id = $1
     ORDER BY version_major DESC, version_minor DESC, version_patch DESC LIMIT 1`,
    [programId]
  );
  if (result.rows.length === 0) return { major: 1, minor: 0, patch: 0, string: '1.0.0' };
  let { version_major: major, version_minor: minor, version_patch: patch } = result.rows[0];
  if (versionType === 'major') { major += 1; minor = 0; patch = 0; }
  else if (versionType === 'minor') { minor += 1; patch = 0; }
  else { patch += 1; }
  return { major, minor, patch, string: `${major}.${minor}.${patch}` };
}

// Übernommene Datei der Vorversion physisch kopieren (jede Revision hat eigene Dateien)
async function copyIntoCmmDir(source) {
  if (!insideCmmDir(source.filepath)) throw new Error(`Ungültiger Dateipfad: ${source.name}`);
  const unique = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${path.basename(source.filepath).replace(/^\d+-\d+-/, '')}`;
  const target = path.join(CMM_UPLOAD_DIR, unique);
  await fs.copyFile(source.filepath, target);
  return target;
}

/** Revision + Dateizeilen schreiben (innerhalb der Transaktion von `client`) */
async function insertRevision(client, { programId, version, files, comment, workflowStateId, userId }) {
  const main = files.find(f => f.role === 'main');
  const revisionResult = await client.query(
    `INSERT INTO program_revisions (
      program_id, version_major, version_minor, version_patch, version_string,
      filename, filepath, filesize, file_hash, mime_type, content,
      comment, is_cam_original, workflow_state_id, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, $11, false, $12, $13)
    RETURNING *`,
    [programId, version.major, version.minor, version.patch, version.string,
      main.name, main.storedPath, main.size, main.hash, main.mime || null,
      comment, workflowStateId, userId]
  );
  const revision = revisionResult.rows[0];

  for (const f of files) {
    await client.query(
      `INSERT INTO program_revision_files
        (revision_id, role, target, filename, filepath, filesize, file_hash, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [revision.id, f.role, f.target, f.name, f.storedPath, f.size, f.hash, f.mime || null]
    );
  }
  return revision;
}

const fileSummary = (f) => ({
  filename: f.name,
  role: f.role,
  role_label: ROLE_LABELS[f.role],
  target: f.target,
  status: f.status,
  filesize: f.size,
  file_hash: f.hash,
});

// Probelauf (?dry_run=true): prüfen und melden, nichts speichern – Vorschau im Upload-Fenster
function previewResponse(res, { errors, plan, ignored, baseVersion = null }) {
  return res.json({
    success: true,
    data: {
      valid: errors.length === 0,
      errors,
      base_version: baseVersion,
      files: plan.files.map(fileSummary),
      removed: plan.removed.map(f => ({ filename: f.name, role: f.role, reason: f.reason })),
      template_name: plan.templateName,
      warnings: plan.warnings,
      ignored,
    },
  });
}

async function draftStateId(db) {
  const result = await db.query(`SELECT id FROM workflow_states WHERE name = 'draft' LIMIT 1`);
  return result.rows[0].id;
}

// POST /api/programs/cmm – Messprogramm mit Dateigruppe anlegen (Version 1.0.0)
exports.createCmmProgram = async (req, res) => {
  const tempPaths = uploadedPaths(req);
  let client;
  try {
    let { operation_id, program_number, program_name, description, comment } = req.body;
    const excelReport = parseExcelReport(req.body.excel_report);
    const dryRun = req.query.dry_run === 'true';

    if (!operation_id || (!program_name && !dryRun)) {
      await removeFiles(tempPaths);
      return res.status(400).json({ error: 'Pflichtfelder fehlen', required: ['operation_id', 'program_name', 'files'] });
    }
    if (tempPaths.length === 0) {
      return res.status(400).json({ error: 'Keine Dateien hochgeladen' });
    }

    const opResult = await pool.query('SELECT id, op_number FROM operations WHERE id = $1', [operation_id]);
    if (opResult.rows.length === 0) {
      await removeFiles(tempPaths);
      return res.status(404).json({ error: 'Arbeitsgang nicht gefunden' });
    }

    const { uploaded, ignored, errors: classifyErrors } = await classifyUploads(req.files);
    const plan = planRevision({ uploaded, previous: null, excelReport });
    const errors = [...classifyErrors, ...plan.errors];
    if (plan.templateName) {
      const conflict = await findTemplateConflict(pool, plan.templateName, null);
      if (conflict) {
        errors.push(`Vorlagenname ${plan.templateName} wird schon verwendet: ${conflict.part_number || ''} ${conflict.program_number} ${conflict.program_name}`.replace(/\s+/g, ' '));
      }
    }
    if (dryRun) {
      await removeFiles(tempPaths);
      return previewResponse(res, { errors, plan, ignored });
    }
    if (errors.length > 0) {
      await removeFiles(tempPaths);
      return res.status(400).json({ error: 'Dateien unvollständig oder ungültig', details: errors, ignored });
    }

    if (!program_number) {
      program_number = await suggestProgramNumber(pool, operation_id, opResult.rows[0].op_number);
    }

    const workflowStateId = await draftStateId(pool);
    const files = plan.files.map(f => ({ ...f, storedPath: f.path }));

    client = await pool.connect();
    await client.query('BEGIN');
    const programResult = await client.query(
      `INSERT INTO programs (operation_id, program_number, program_name, description, workflow_state_id, created_by, kind)
       VALUES ($1, $2, $3, $4, $5, $6, 'cmm') RETURNING *`,
      [operation_id, program_number, program_name, description || null, workflowStateId, req.user?.id || null]
    );
    const program = programResult.rows[0];
    const revision = await insertRevision(client, {
      programId: program.id,
      version: { major: 1, minor: 0, patch: 0, string: '1.0.0' },
      files,
      comment: comment || 'Initiale Version',
      workflowStateId,
      userId: req.user?.id || null,
    });
    await client.query('UPDATE programs SET current_revision_id = $1 WHERE id = $2', [revision.id, program.id]);
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Messprogramm angelegt',
      data: {
        program: { ...program, current_revision_id: revision.id, workflow_state: 'draft' },
        revision: { id: revision.id, version: revision.version_string, comment: revision.comment },
        files: plan.files.map(fileSummary),
        template_name: plan.templateName,
        warnings: plan.warnings,
        ignored,
      },
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    await removeFiles(tempPaths);
    console.error('Error creating cmm program:', error);
    res.status(500).json({ error: 'Fehler beim Anlegen des Messprogramms', details: error.message });
  } finally {
    if (client) client.release();
  }
};

// POST /api/programs/:id/cmm-revisions – neue Revision: hochladen, was man hat; Rest wird übernommen
exports.createCmmRevision = async (req, res) => {
  const tempPaths = uploadedPaths(req);
  const copiedPaths = [];
  let client;
  try {
    const { id } = req.params;
    const versionType = VERSION_TYPES.includes(req.body.version_type) ? req.body.version_type : 'patch';
    const excelReport = parseExcelReport(req.body.excel_report);
    const remove = toList(req.body.remove);
    const dryRun = req.query.dry_run === 'true';

    const programResult = await pool.query(
      'SELECT id, kind, program_number, program_name, current_revision_id FROM programs WHERE id = $1', [id]
    );
    if (programResult.rows.length === 0) {
      await removeFiles(tempPaths);
      return res.status(404).json({ error: 'Programm nicht gefunden' });
    }
    const program = programResult.rows[0];
    if (program.kind !== 'cmm') {
      await removeFiles(tempPaths);
      return res.status(400).json({ error: 'Kein Messprogramm – neue Versionen von NC-Programmen über /revisions hochladen' });
    }

    const prevResult = await pool.query(
      `SELECT f.id, f.role, f.target, f.filename AS name, f.filepath, f.filesize AS size,
              f.file_hash AS hash, f.mime_type AS mime, r.version_string
       FROM program_revision_files f JOIN program_revisions r ON r.id = f.revision_id
       WHERE f.revision_id = $1`,
      [program.current_revision_id]
    );
    const previous = prevResult.rows;
    const baseVersion = previous[0]?.version_string || null;

    const { uploaded, ignored, errors: classifyErrors } = await classifyUploads(req.files || []);
    const plan = planRevision({ uploaded, previous, remove, excelReport });
    const errors = [...classifyErrors, ...plan.errors];
    if (plan.templateName) {
      const conflict = await findTemplateConflict(pool, plan.templateName, program.id);
      if (conflict) {
        errors.push(`Vorlagenname ${plan.templateName} wird schon verwendet: ${conflict.part_number || ''} ${conflict.program_number} ${conflict.program_name}`.replace(/\s+/g, ' '));
      }
    }
    if (dryRun) {
      await removeFiles(tempPaths);
      return previewResponse(res, { errors, plan, ignored, baseVersion });
    }
    if (errors.length > 0) {
      await removeFiles(tempPaths);
      return res.status(400).json({ error: 'Neue Version nicht möglich', details: errors, ignored, base_version: baseVersion });
    }

    // Übernommene Dateien kopieren, hochgeladene liegen schon im Verzeichnis
    const files = [];
    for (const f of plan.files) {
      if (f.source === 'previous') {
        const storedPath = await copyIntoCmmDir(f);
        copiedPaths.push(storedPath);
        files.push({ ...f, storedPath });
      } else {
        files.push({ ...f, storedPath: f.path });
      }
    }

    const workflowStateId = await draftStateId(pool);
    client = await pool.connect();
    await client.query('BEGIN');
    const version = await nextVersion(client, program.id, versionType);
    const revision = await insertRevision(client, {
      programId: program.id,
      version,
      files,
      comment: req.body.comment || `Version ${version.string}`,
      workflowStateId,
      userId: req.user?.id || null,
    });
    await client.query(
      `UPDATE programs SET current_revision_id = $1, workflow_state_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [revision.id, workflowStateId, program.id]
    );
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Version ${version.string} angelegt`,
      data: {
        program_id: program.id,
        revision: { id: revision.id, version: revision.version_string, comment: revision.comment },
        base_version: baseVersion,
        files: plan.files.map(fileSummary),
        removed: plan.removed.map(f => ({ filename: f.name, role: f.role, reason: f.reason })),
        template_name: plan.templateName,
        warnings: plan.warnings,
        ignored,
      },
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    await removeFiles([...tempPaths, ...copiedPaths]);
    console.error('Error creating cmm revision:', error);
    res.status(500).json({ error: 'Fehler beim Anlegen der Version', details: error.message });
  } finally {
    if (client) client.release();
  }
};

// Revision bestimmen: ?version=1.2.0, sonst aktuelle
async function resolveRevision(programId, version) {
  const programResult = await pool.query(
    `SELECT p.id, p.kind, p.program_number, p.current_revision_id, pt.part_number
     FROM programs p
     LEFT JOIN operations o ON o.id = p.operation_id
     LEFT JOIN parts pt ON pt.id = o.part_id
     WHERE p.id = $1`,
    [programId]
  );
  if (programResult.rows.length === 0) return { error: [404, 'Programm nicht gefunden'] };
  const program = programResult.rows[0];
  if (program.kind !== 'cmm') return { error: [400, 'Kein Messprogramm'] };

  const revisionResult = version
    ? await pool.query('SELECT id, version_string FROM program_revisions WHERE program_id = $1 AND version_string = $2', [programId, version])
    : await pool.query('SELECT id, version_string FROM program_revisions WHERE id = $1', [program.current_revision_id]);
  if (revisionResult.rows.length === 0) return { error: [404, 'Version nicht gefunden'] };
  return { program, revision: revisionResult.rows[0] };
}

// GET /api/programs/:id/files?version=1.2.0 – Dateien einer Revision (Standard: aktuelle)
exports.getCmmFiles = async (req, res) => {
  try {
    const { program, revision, error } = await resolveRevision(req.params.id, req.query.version);
    if (error) return res.status(error[0]).json({ error: error[1] });

    const result = await pool.query(
      `SELECT id, role, target, filename, filesize, file_hash, mime_type, created_at
       FROM program_revision_files WHERE revision_id = $1
       ORDER BY CASE role WHEN 'main' THEN 1 WHEN 'cad' THEN 2 WHEN 'drawing' THEN 3
                WHEN 'report_xlsx' THEN 4 WHEN 'report_layout' THEN 5 ELSE 6 END, filename`,
      [revision.id]
    );
    res.json({
      success: true,
      data: {
        program_id: program.id,
        revision_id: revision.id,
        version: revision.version_string,
        excel_report: result.rows.some(f => f.role === 'report_xlsx'),
        files: result.rows.map(f => ({ ...f, role_label: ROLE_LABELS[f.role] })),
      },
    });
  } catch (error) {
    console.error('Error fetching cmm files:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Dateien', details: error.message });
  }
};

async function loadFile(programId, fileId) {
  const result = await pool.query(
    `SELECT f.filename, f.filepath, f.mime_type
     FROM program_revision_files f
     JOIN program_revisions r ON r.id = f.revision_id
     WHERE f.id = $1 AND r.program_id = $2`,
    [fileId, programId]
  );
  return result.rows[0] || null;
}

async function sendFile(req, res, inline) {
  try {
    const file = await loadFile(req.params.id, req.params.fileId);
    if (!file) return res.status(404).json({ error: 'Datei nicht gefunden' });
    if (!insideCmmDir(file.filepath)) return res.status(403).json({ error: 'Ungültiger Dateipfad' });
    try {
      await fs.access(file.filepath);
    } catch {
      return res.status(404).json({ error: 'Datei nicht auf dem Server gefunden' });
    }

    if (!inline) {
      return res.download(path.resolve(file.filepath), file.filename);
    }
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.filename)}"`);
    fsSync.createReadStream(path.resolve(file.filepath)).pipe(res);
  } catch (error) {
    console.error('Error sending cmm file:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Fehler beim Laden der Datei', details: error.message });
  }
}

// GET /api/programs/:id/files/:fileId/view | /download
exports.viewCmmFile = (req, res) => sendFile(req, res, true);
exports.downloadCmmFile = (req, res) => sendFile(req, res, false);

// GET /api/programs/:id/files/zip?version=1.2.0 – alle Dateien einer Revision;
// Vorlagen (Zielort PC-DMIS-Vorlagenverzeichnis) im Unterordner
exports.downloadCmmZip = async (req, res) => {
  try {
    const { program, revision, error } = await resolveRevision(req.params.id, req.query.version);
    if (error) return res.status(error[0]).json({ error: error[1] });

    const result = await pool.query(
      'SELECT filename, filepath, target FROM program_revision_files WHERE revision_id = $1 ORDER BY id',
      [revision.id]
    );
    for (const f of result.rows) {
      if (!insideCmmDir(f.filepath)) return res.status(403).json({ error: 'Ungültiger Dateipfad' });
      try {
        await fs.access(f.filepath);
      } catch {
        return res.status(404).json({ error: `Datei nicht auf dem Server gefunden: ${f.filename}` });
      }
    }

    const zipName = [program.part_number, program.program_number, `v${revision.version_string}`]
      .filter(Boolean).join('_').replace(/[^a-zA-Z0-9._-]/g, '_') + '.zip';
    res.attachment(zipName);
    res.setHeader('Content-Type', 'application/zip');

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => {
      console.error('Error creating cmm zip:', err);
      res.destroy(err);
    });
    archive.pipe(res);
    for (const f of result.rows) {
      const name = f.target === 'template_dir' ? `PC-DMIS-Vorlagen/${f.filename}` : f.filename;
      archive.file(path.resolve(f.filepath), { name });
    }
    await archive.finalize();
  } catch (error) {
    console.error('Error downloading cmm zip:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Fehler beim ZIP-Download', details: error.message });
  }
};
