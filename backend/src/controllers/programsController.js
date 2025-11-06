const { Pool } = require('pg');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Helper: File-Hash berechnen (SHA-256)
const calculateFileHash = (filepath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fsSync.createReadStream(filepath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

// Helper: File-Content lesen (für Syntax-Highlighting später)
const readFileContent = async (filepath) => {
  try {
    const content = await fs.readFile(filepath, 'utf8');
    return content;
  } catch (error) {
    console.error('Error reading file content:', error);
    return null;
  }
};

// Helper: Einfacher Line-by-Line Diff (für NC-Programme)
const calculateDiff = (oldContent, newContent) => {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  const diff = [];
  const maxLength = Math.max(oldLines.length, newLines.length);
  
  let addedCount = 0;
  let removedCount = 0;
  let changedCount = 0;
  
  for (let i = 0; i < maxLength; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];
    
    if (oldLine === undefined && newLine !== undefined) {
      // Zeile hinzugefügt
      diff.push({
        type: 'added',
        line_number: i + 1,
        content: newLine
      });
      addedCount++;
    } else if (oldLine !== undefined && newLine === undefined) {
      // Zeile entfernt
      diff.push({
        type: 'removed',
        line_number: i + 1,
        content: oldLine
      });
      removedCount++;
    } else if (oldLine !== newLine) {
      // Zeile geändert
      diff.push({
        type: 'changed',
        line_number: i + 1,
        old_content: oldLine,
        new_content: newLine
      });
      changedCount++;
    } else {
      // Zeile unverändert (nur erste und letzte paar Zeilen für Kontext)
      if (i < 3 || i >= maxLength - 3) {
        diff.push({
          type: 'unchanged',
          line_number: i + 1,
          content: oldLine
        });
      }
    }
  }
  
  return {
    changes: diff,
    summary: {
      added: addedCount,
      removed: removedCount,
      changed: changedCount,
      total_changes: addedCount + removedCount + changedCount
    }
  };
};

// Helper: Nächste Version ermitteln
const getNextVersion = async (programId, versionType = 'patch') => {
  const result = await pool.query(
    `SELECT version_major, version_minor, version_patch 
     FROM program_revisions 
     WHERE program_id = $1 
     ORDER BY created_at DESC 
     LIMIT 1`,
    [programId]
  );

  if (result.rows.length === 0) {
    return { major: 1, minor: 0, patch: 0, string: '1.0.0' };
  }

  const latest = result.rows[0];
  let newMajor = latest.version_major;
  let newMinor = latest.version_minor;
  let newPatch = latest.version_patch;

  // Version inkrementieren basierend auf Type
  if (versionType === 'major') {
    newMajor += 1;
    newMinor = 0;
    newPatch = 0;
  } else if (versionType === 'minor') {
    newMinor += 1;
    newPatch = 0;
  } else {
    // Default: patch
    newPatch += 1;
  }
  
  return {
    major: newMajor,
    minor: newMinor,
    patch: newPatch,
    string: `${newMajor}.${newMinor}.${newPatch}`
  };
};

// POST /api/programs - Programm hochladen + DB-Eintrag erstellen
exports.createProgram = async (req, res) => {
  const client = await pool.connect();
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    let { operation_id, program_number, program_name, description, comment } = req.body;

    // Validierung
    if (!operation_id || !program_name) {
      // Cleanup: Datei löschen bei Fehler
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ 
        error: 'Pflichtfelder fehlen',
        required: ['operation_id', 'program_name']
      });
    }

    // Prüfe ob Operation existiert und hole op_number
    const opCheck = await pool.query(
      'SELECT id, op_number FROM operations WHERE id = $1',
      [operation_id]
    );
    
    if (opCheck.rows.length === 0) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ error: 'Operation nicht gefunden' });
    }

    const operation = opCheck.rows[0];

    // Auto-Generierung von program_number wenn nicht vorhanden
    if (!program_number) {
      // Zähle existierende Programme für diese Operation
      const countResult = await pool.query(
        'SELECT COUNT(*) as count FROM programs WHERE operation_id = $1',
        [operation_id]
      );
      const count = parseInt(countResult.rows[0].count);
      
      // Format: OP10-001, OP10-002, etc.
      // TODO: Format später nochmal überdenken (siehe ROADMAP)
      program_number = `${operation.op_number}-${String(count + 1).padStart(3, '0')}`;
    }

    await client.query('BEGIN');

    // File-Hash berechnen
    const fileHash = await calculateFileHash(req.file.path);
    
    // File-Content lesen
    const content = await readFileContent(req.file.path);

    // Workflow-State "draft" holen
    const workflowResult = await pool.query(
      `SELECT id FROM workflow_states WHERE name = 'draft' LIMIT 1`
    );
    const workflowStateId = workflowResult.rows[0].id;

    // 1. Program erstellen
    const programResult = await client.query(
      `INSERT INTO programs (
        operation_id, program_number, program_name, description,
        workflow_state_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [operation_id, program_number, program_name, description || null, workflowStateId, req.user?.id || null]
    );

    const program = programResult.rows[0];

    // 2. Erste Revision erstellen (1.0.0)
    const revisionResult = await client.query(
      `INSERT INTO program_revisions (
        program_id, version_major, version_minor, version_patch, version_string,
        filename, filepath, filesize, file_hash, mime_type, content,
        comment, is_cam_original, workflow_state_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        program.id, 1, 0, 0, '1.0.0',
        req.file.filename,
        req.file.path,
        req.file.size,
        fileHash,
        req.file.mimetype,
        content,
        comment || 'Initiale Version',
        true, // is_cam_original
        workflowStateId,
        req.user?.id || null
      ]
    );

    const revision = revisionResult.rows[0];

    // 3. Program mit current_revision_id aktualisieren
    await client.query(
      `UPDATE programs SET current_revision_id = $1 WHERE id = $2`,
      [revision.id, program.id]
    );

    await client.query('COMMIT');

    // Vollständiges Program-Objekt mit allen nötigen Feldern
    const programResponse = {
      id: program.id,
      operation_id: program.operation_id,
      program_number: program.program_number,
      program_name: program.program_name,
      description: program.description,
      workflow_state_id: program.workflow_state_id,
      workflow_state: 'draft',
      current_revision_id: revision.id,
      version: revision.version_string,
      filename: revision.filename,
      file_size: revision.filesize,
      file_hash: revision.file_hash,
      created_at: program.created_at,
      updated_at: program.updated_at,
      created_by: program.created_by
    };

    res.status(201).json({
      success: true,
      message: 'Programm erfolgreich hochgeladen',
      data: programResponse
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating program:', error);
    
    // Cleanup: Datei löschen bei Fehler
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    res.status(500).json({ error: 'Fehler beim Erstellen des Programms', details: error.message });
  } finally {
    client.release();
  }
};

// GET /api/programs - Liste aller Programme (mit Filter)
exports.getPrograms = async (req, res) => {
  try {
    const { operation_id } = req.query;
    
    let query = `
      SELECT 
        p.*,
        pr.version_string as current_version,
        pr.version_string as version,
        pr.filename,
        pr.filesize as file_size,
        pr.file_hash,
        pr.created_at as revision_created_at,
        ws.name as workflow_state,
        ws.color as workflow_color,
        o.op_number as operation_number,
        o.op_name as operation_name,
        pt.part_number,
        pt.part_name,
        m.name as machine_name,
        u.username as created_by_username
      FROM programs p
      LEFT JOIN program_revisions pr ON p.current_revision_id = pr.id
      LEFT JOIN workflow_states ws ON p.workflow_state_id = ws.id
      LEFT JOIN operations o ON p.operation_id = o.id
      LEFT JOIN parts pt ON o.part_id = pt.id
      LEFT JOIN machines m ON o.machine_id = m.id
      LEFT JOIN users u ON p.created_by = u.id
    `;

    const params = [];
    if (operation_id) {
      query += ` WHERE p.operation_id = $1`;
      params.push(operation_id);
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await pool.query(query, params);

    // Format standardisieren: data statt programs
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Programme', details: error.message });
  }
};

// GET /api/programs/:id - Einzelnes Programm mit allen Revisionen
exports.getProgramById = async (req, res) => {
  try {
    const { id } = req.params;

    // Programm holen
    const programResult = await pool.query(
      `SELECT 
        p.*,
        ws.name as workflow_state,
        ws.color as workflow_color,
        o.op_number as operation_number,
        o.op_name as operation_name,
        pt.part_number,
        pt.part_name,
        m.name as machine_name,
        u.username as created_by_username
      FROM programs p
      LEFT JOIN workflow_states ws ON p.workflow_state_id = ws.id
      LEFT JOIN operations o ON p.operation_id = o.id
      LEFT JOIN parts pt ON o.part_id = pt.id
      LEFT JOIN machines m ON o.machine_id = m.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = $1`,
      [id]
    );

    if (programResult.rows.length === 0) {
      return res.status(404).json({ error: 'Programm nicht gefunden' });
    }

    // Alle Revisionen holen
    const revisionsResult = await pool.query(
      `SELECT 
        pr.*,
        ws.name as workflow_state,
        ws.color as workflow_color,
        u.username as created_by_username
      FROM program_revisions pr
      LEFT JOIN workflow_states ws ON pr.workflow_state_id = ws.id
      LEFT JOIN users u ON pr.created_by = u.id
      WHERE pr.program_id = $1
      ORDER BY pr.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: programResult.rows[0],
      revisions: revisionsResult.rows
    });

  } catch (error) {
    console.error('Error fetching program:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Programms', details: error.message });
  }
};

// PUT /api/programs/:id - Metadaten ändern (nicht File!)
exports.updateProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const { program_number, program_name, description } = req.body;

    // Validierung
    if (!program_number || !program_name) {
      return res.status(400).json({ 
        error: 'Pflichtfelder fehlen',
        required: ['program_number', 'program_name']
      });
    }

    const result = await pool.query(
      `UPDATE programs 
       SET program_number = $1, program_name = $2, description = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [program_number, program_name, description || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Programm nicht gefunden' });
    }

    res.json({
      success: true,
      message: 'Programm aktualisiert',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating program:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren', details: error.message });
  }
};

// DELETE /api/programs/:id - Programm löschen (inkl. Dateien)
exports.deleteProgram = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Alle Revisionen + Dateipfade holen
    const revisionsResult = await client.query(
      'SELECT filepath FROM program_revisions WHERE program_id = $1',
      [id]
    );

    // Programm löschen (CASCADE löscht automatisch alle Revisionen)
    const deleteResult = await client.query(
      'DELETE FROM programs WHERE id = $1 RETURNING *',
      [id]
    );

    if (deleteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Programm nicht gefunden' });
    }

    await client.query('COMMIT');

    // Dateien löschen (nach COMMIT, auch wenn es fehlschlägt)
    for (const revision of revisionsResult.rows) {
      await fs.unlink(revision.filepath).catch(err => {
        console.error(`Fehler beim Löschen der Datei ${revision.filepath}:`, err);
      });
    }

    res.json({
      success: true,
      message: 'Programm und alle Revisionen gelöscht',
      deleted_program: deleteResult.rows[0],
      deleted_files: revisionsResult.rows.length
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting program:', error);
    res.status(500).json({ error: 'Fehler beim Löschen', details: error.message });
  } finally {
    client.release();
  }
};

// GET /api/programs/:id/download - Datei herunterladen
exports.downloadProgram = async (req, res) => {
  try {
    const { id } = req.params;

    // Aktuelle Revision holen
    const result = await pool.query(
      `SELECT pr.filepath, pr.filename, pr.mime_type
       FROM programs p
       JOIN program_revisions pr ON p.current_revision_id = pr.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Programm nicht gefunden' });
    }

    const { filepath, filename, mime_type } = result.rows[0];

    // Prüfe ob Datei existiert
    try {
      await fs.access(filepath);
    } catch {
      return res.status(404).json({ error: 'Datei nicht gefunden auf Server' });
    }

    // Datei zum Download senden
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Fehler beim Download' });
        }
      }
    });

  } catch (error) {
    console.error('Error downloading program:', error);
    res.status(500).json({ error: 'Fehler beim Download', details: error.message });
  }
};

// POST /api/programs/:id/revisions - Neue Revision hochladen
exports.uploadNewRevision = async (req, res) => {
  const client = await pool.connect();
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    const { id } = req.params;
    let { version_type, comment, is_cam_original } = req.body;

    // Default: patch
    if (!version_type || !['patch', 'minor', 'major'].includes(version_type)) {
      version_type = 'patch';
    }

    // Prüfe ob Programm existiert
    const programCheck = await pool.query(
      'SELECT id, program_number, program_name, workflow_state_id FROM programs WHERE id = $1',
      [id]
    );
    
    if (programCheck.rows.length === 0) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ error: 'Programm nicht gefunden' });
    }

    const program = programCheck.rows[0];

    await client.query('BEGIN');

    // File-Hash berechnen
    const fileHash = await calculateFileHash(req.file.path);
    
    // File-Content lesen
    const content = await readFileContent(req.file.path);

    // Workflow-State "draft" holen (neue Revisionen starten immer als Entwurf)
    const workflowResult = await pool.query(
      `SELECT id FROM workflow_states WHERE name = 'draft' LIMIT 1`
    );
    const workflowStateId = workflowResult.rows[0].id;

    // Nächste Version berechnen
    const nextVersion = await getNextVersion(id, version_type);

    // Neue Revision erstellen
    const revisionResult = await client.query(
      `INSERT INTO program_revisions (
        program_id, version_major, version_minor, version_patch, version_string,
        filename, filepath, filesize, file_hash, mime_type, content,
        comment, is_cam_original, workflow_state_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        id,
        nextVersion.major,
        nextVersion.minor,
        nextVersion.patch,
        nextVersion.string,
        req.file.filename,
        req.file.path,
        req.file.size,
        fileHash,
        req.file.mimetype,
        content,
        comment || `Version ${nextVersion.string}`,
        is_cam_original === 'true' || is_cam_original === true ? true : false,
        workflowStateId,
        req.user?.id || null
      ]
    );

    const revision = revisionResult.rows[0];

    // Program mit neuer current_revision_id aktualisieren
    await client.query(
      `UPDATE programs 
       SET current_revision_id = $1, 
           workflow_state_id = $2,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [revision.id, workflowStateId, id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Neue Revision ${nextVersion.string} erfolgreich hochgeladen`,
      data: {
        program_id: id,
        revision: {
          id: revision.id,
          version_string: revision.version_string,
          version_type: version_type,
          filename: revision.filename,
          file_size: revision.filesize,
          file_hash: revision.file_hash,
          comment: revision.comment,
          is_cam_original: revision.is_cam_original,
          workflow_state: 'draft',
          created_at: revision.created_at,
          created_by: req.user?.id || null
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error uploading new revision:', error);
    
    // Cleanup: Datei löschen bei Fehler
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    res.status(500).json({ error: 'Fehler beim Hochladen der Revision', details: error.message });
  } finally {
    client.release();
  }
};

// GET /api/programs/:id/revisions - Alle Revisionen eines Programms
exports.getProgramRevisions = async (req, res) => {
  try {
    const { id } = req.params;

    // Prüfe ob Programm existiert
    const programCheck = await pool.query(
      'SELECT id, program_number, program_name FROM programs WHERE id = $1',
      [id]
    );

    if (programCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Programm nicht gefunden' });
    }

    const program = programCheck.rows[0];

    // Alle Revisionen holen mit Details
    const result = await pool.query(
      `SELECT 
        pr.id,
        pr.program_id,
        pr.version_major,
        pr.version_minor,
        pr.version_patch,
        pr.version_string,
        pr.filename,
        pr.filepath,
        pr.filesize,
        pr.file_hash,
        pr.mime_type,
        pr.comment,
        pr.is_cam_original,
        pr.optimized_by_user_id,
        pr.workflow_state_id,
        pr.released_by,
        pr.released_at,
        pr.created_by,
        pr.created_at,
        ws.name as workflow_state,
        ws.color as workflow_color,
        u_created.username as created_by_username,
        u_optimized.username as optimized_by_username,
        u_released.username as released_by_username,
        p.current_revision_id = pr.id as is_current
      FROM program_revisions pr
      LEFT JOIN workflow_states ws ON pr.workflow_state_id = ws.id
      LEFT JOIN users u_created ON pr.created_by = u_created.id
      LEFT JOIN users u_optimized ON pr.optimized_by_user_id = u_optimized.id
      LEFT JOIN users u_released ON pr.released_by = u_released.id
      LEFT JOIN programs p ON pr.program_id = p.id
      WHERE pr.program_id = $1
      ORDER BY pr.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        program: {
          id: program.id,
          program_number: program.program_number,
          program_name: program.program_name
        },
        revisions: result.rows,
        total: result.rows.length
      }
    });

  } catch (error) {
    console.error('Error getting program revisions:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Revisionen', details: error.message });
  }
};

// GET /api/programs/:id/revisions/:revisionId/compare/:compareToRevisionId - Zwei Versionen vergleichen (ID-basiert)
exports.compareRevisions = async (req, res) => {
  try {
    const { id, revisionId, compareToRevisionId } = req.params;

    // Prüfe ob Programm existiert
    const programCheck = await pool.query(
      'SELECT id, program_number, program_name FROM programs WHERE id = $1',
      [id]
    );

    if (programCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Programm nicht gefunden' });
    }

    // Beide Revisionen holen
    const revisionsResult = await pool.query(
      `SELECT 
        pr.id,
        pr.version_string,
        pr.filename,
        pr.content,
        pr.comment,
        pr.created_at,
        u.username as created_by_username
      FROM program_revisions pr
      LEFT JOIN users u ON pr.created_by = u.id
      WHERE pr.program_id = $1 AND pr.id IN ($2, $3)
      ORDER BY pr.created_at ASC`,
      [id, revisionId, compareToRevisionId]
    );

    if (revisionsResult.rows.length !== 2) {
      return res.status(404).json({ error: 'Eine oder beide Revisionen nicht gefunden' });
    }

    const [revision1, revision2] = revisionsResult.rows;

    // Prüfe ob Content vorhanden ist
    if (!revision1.content || !revision2.content) {
      return res.status(400).json({ 
        error: 'Content nicht verfügbar',
        details: 'Eine oder beide Revisionen haben keinen gespeicherten Content'
      });
    }

    // Diff berechnen
    const diff = calculateDiff(revision1.content, revision2.content);

    res.json({
      success: true,
      data: {
        program: {
          id: programCheck.rows[0].id,
          program_number: programCheck.rows[0].program_number,
          program_name: programCheck.rows[0].program_name
        },
        revision_from: {
          id: revision1.id,
          version: revision1.version_string,
          filename: revision1.filename,
          comment: revision1.comment,
          created_at: revision1.created_at,
          created_by: revision1.created_by_username
        },
        revision_to: {
          id: revision2.id,
          version: revision2.version_string,
          filename: revision2.filename,
          comment: revision2.comment,
          created_at: revision2.created_at,
          created_by: revision2.created_by_username
        },
        diff: diff
      }
    });

  } catch (error) {
    console.error('Error comparing revisions:', error);
    res.status(500).json({ error: 'Fehler beim Vergleichen', details: error.message });
  }
};

// GET /api/programs/:id/compare?from=1.0.0&to=1.0.1 - Zwei Versionen vergleichen (Versions-basiert, benutzerfreundlich)
exports.compareRevisionsByVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    // Validierung
    if (!from || !to) {
      return res.status(400).json({ 
        error: 'Query-Parameter fehlen',
        required: ['from', 'to'],
        example: '/api/programs/1/compare?from=1.0.0&to=1.0.1'
      });
    }

    // Prüfe ob Programm existiert
    const programCheck = await pool.query(
      'SELECT id, program_number, program_name FROM programs WHERE id = $1',
      [id]
    );

    if (programCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Programm nicht gefunden' });
    }

    // Beide Revisionen anhand der version_string holen
    const revisionsResult = await pool.query(
      `SELECT 
        pr.id,
        pr.version_string,
        pr.filename,
        pr.content,
        pr.comment,
        pr.created_at,
        u.username as created_by_username
      FROM program_revisions pr
      LEFT JOIN users u ON pr.created_by = u.id
      WHERE pr.program_id = $1 AND pr.version_string IN ($2, $3)
      ORDER BY pr.created_at ASC`,
      [id, from, to]
    );

    if (revisionsResult.rows.length !== 2) {
      return res.status(404).json({ 
        error: 'Eine oder beide Versionen nicht gefunden',
        details: `Gesucht: ${from} und ${to}`,
        found: revisionsResult.rows.map(r => r.version_string)
      });
    }

    const [revision1, revision2] = revisionsResult.rows;

    // Prüfe ob Content vorhanden ist
    if (!revision1.content || !revision2.content) {
      return res.status(400).json({ 
        error: 'Content nicht verfügbar',
        details: 'Eine oder beide Revisionen haben keinen gespeicherten Content'
      });
    }

    // Diff berechnen
    const diff = calculateDiff(revision1.content, revision2.content);

    res.json({
      success: true,
      data: {
        program: {
          id: programCheck.rows[0].id,
          program_number: programCheck.rows[0].program_number,
          program_name: programCheck.rows[0].program_name
        },
        revision_from: {
          id: revision1.id,
          version: revision1.version_string,
          filename: revision1.filename,
          comment: revision1.comment,
          created_at: revision1.created_at,
          created_by: revision1.created_by_username
        },
        revision_to: {
          id: revision2.id,
          version: revision2.version_string,
          filename: revision2.filename,
          comment: revision2.comment,
          created_at: revision2.created_at,
          created_by: revision2.created_by_username
        },
        diff: diff
      }
    });

  } catch (error) {
    console.error('Error comparing revisions by version:', error);
    res.status(500).json({ error: 'Fehler beim Vergleichen', details: error.message });
  }
};

// POST /api/programs/:id/rollback?to=1.0.1 - Auf alte Version zurückrollen (mit automatischem Backup)
exports.rollbackToRevision = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { to } = req.query;

    // Validierung
    if (!to) {
      return res.status(400).json({ 
        error: 'Query-Parameter fehlt',
        required: 'to',
        example: '/api/programs/1/rollback?to=1.0.1'
      });
    }

    // Prüfe ob Programm existiert
    const programCheck = await pool.query(
      'SELECT id, program_number, program_name, current_revision_id FROM programs WHERE id = $1',
      [id]
    );
    
    if (programCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Programm nicht gefunden' });
    }

    const program = programCheck.rows[0];

    // Ziel-Revision holen
    const targetRevisionResult = await pool.query(
      `SELECT * FROM program_revisions 
       WHERE program_id = $1 AND version_string = $2`,
      [id, to]
    );

    if (targetRevisionResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Ziel-Version nicht gefunden',
        requested: to
      });
    }

    const targetRevision = targetRevisionResult.rows[0];

    // Prüfe ob das nicht schon die aktuelle Version ist
    if (program.current_revision_id === targetRevision.id) {
      return res.status(400).json({ 
        error: 'Version ist bereits aktiv',
        current_version: targetRevision.version_string
      });
    }

    // Aktuelle Revision holen (für Backup-Kommentar)
    const currentRevisionResult = await pool.query(
      `SELECT version_string FROM program_revisions WHERE id = $1`,
      [program.current_revision_id]
    );
    const currentVersion = currentRevisionResult.rows[0]?.version_string || 'unknown';

    await client.query('BEGIN');

    // WICHTIG: Workflow-State der Ziel-Revision beibehalten
    // Program mit neuer current_revision_id aktualisieren
    await client.query(
      `UPDATE programs 
       SET current_revision_id = $1, 
           workflow_state_id = $2,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [targetRevision.id, targetRevision.workflow_state_id, id]
    );

    await client.query('COMMIT');

    // Response mit Details
    res.json({
      success: true,
      message: `Rollback erfolgreich`,
      data: {
        program_id: id,
        rolled_back_from: currentVersion,
        rolled_back_to: targetRevision.version_string,
        active_revision: {
          id: targetRevision.id,
          version: targetRevision.version_string,
          filename: targetRevision.filename,
          comment: targetRevision.comment,
          workflow_state_id: targetRevision.workflow_state_id
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error rolling back revision:', error);
    res.status(500).json({ error: 'Fehler beim Rollback', details: error.message });
  } finally {
    client.release();
  }
};

module.exports = exports;
