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

// Helper: Nächste Version ermitteln
const getNextVersion = async (programId) => {
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
  const newPatch = latest.version_patch + 1;
  
  return {
    major: latest.version_major,
    minor: latest.version_minor,
    patch: newPatch,
    string: `${latest.version_major}.${latest.version_minor}.${newPatch}`
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

module.exports = exports;
