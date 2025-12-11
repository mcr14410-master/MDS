/**
 * Part Documents Controller
 * 
 * Verwaltet Dokumente für Bauteile:
 * - CAD-Modelle (.step, .stp, .stl, .obj, .iges, .igs, .3ds, .gltf, .glb)
 * - Zeichnungen (.pdf, .png, .jpg, .jpeg, .tif, .tiff, .dxf, .dwg)
 * - Sonstige Dokumente
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

// Upload-Verzeichnis
const UPLOAD_DIR = process.env.PART_DOCUMENTS_PATH || path.join(__dirname, '../../uploads/part-documents');

// Erlaubte Dateitypen nach Kategorie
const ALLOWED_TYPES = {
  cad_model: ['.step', '.stp', '.stl', '.obj', '.iges', '.igs', '.3ds', '.gltf', '.glb', '.x_t', '.x_b', '.sat'],
  drawing: ['.pdf', '.png', '.jpg', '.jpeg', '.tif', '.tiff', '.dxf', '.dwg', '.svg'],
  other: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.zip', '.rar', '.7z']
};

// Max Dateigröße (100 MB)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Hilfsfunktion: Upload-Verzeichnis sicherstellen
 */
async function ensureUploadDir(partId) {
  const partDir = path.join(UPLOAD_DIR, String(partId));
  await fs.mkdir(partDir, { recursive: true });
  return partDir;
}

/**
 * Hilfsfunktion: Dokument-Typ aus Dateiendung ermitteln
 */
function getDocumentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  
  if (ALLOWED_TYPES.cad_model.includes(ext)) return 'cad_model';
  if (ALLOWED_TYPES.drawing.includes(ext)) return 'drawing';
  return 'other';
}

/**
 * Hilfsfunktion: Prüfen ob Dateiendung erlaubt
 */
function isAllowedExtension(filename, documentType = null) {
  const ext = path.extname(filename).toLowerCase();
  
  if (documentType) {
    return ALLOWED_TYPES[documentType]?.includes(ext) || false;
  }
  
  // Alle erlaubten Typen prüfen
  return Object.values(ALLOWED_TYPES).flat().includes(ext);
}

/**
 * GET /api/parts/:partId/documents
 * Alle Dokumente eines Bauteils abrufen
 */
exports.getPartDocuments = async (req, res) => {
  try {
    const { partId } = req.params;
    const { type } = req.query;

    let query = `
      SELECT 
        pd.*,
        u.username as uploaded_by_name
      FROM part_documents pd
      LEFT JOIN users u ON pd.uploaded_by = u.id
      WHERE pd.part_id = $1
    `;
    const params = [partId];

    if (type) {
      query += ` AND pd.document_type = $2`;
      params.push(type);
    }

    query += ` ORDER BY pd.document_type, pd.created_at DESC`;

    const result = await pool.query(query, params);

    // Gruppieren nach Typ
    const grouped = {
      cad_model: [],
      drawing: [],
      other: []
    };

    result.rows.forEach(doc => {
      if (grouped[doc.document_type]) {
        grouped[doc.document_type].push(doc);
      } else {
        grouped.other.push(doc);
      }
    });

    res.json({
      success: true,
      documents: result.rows,
      grouped,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching part documents:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Dokumente'
    });
  }
};

/**
 * POST /api/parts/:partId/documents
 * Dokument hochladen
 */
exports.uploadDocument = async (req, res) => {
  try {
    const { partId } = req.params;
    const { description, revision, document_type, is_primary_cad, is_primary_drawing } = req.body;

    // Prüfen ob Part existiert
    const partCheck = await pool.query(
      'SELECT id FROM parts WHERE id = $1 AND status != $2',
      [partId, 'deleted']
    );

    if (partCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Bauteil nicht gefunden'
      });
    }

    // Prüfen ob Datei vorhanden
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Keine Datei hochgeladen'
      });
    }

    const file = req.file;
    const originalFilename = file.originalname;
    const fileExtension = path.extname(originalFilename).toLowerCase();

    // Dateiendung prüfen
    if (!isAllowedExtension(originalFilename)) {
      // Datei löschen
      await fs.unlink(file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        error: `Dateityp ${fileExtension} nicht erlaubt`
      });
    }

    // Dokument-Typ ermitteln oder verwenden
    const docType = document_type || getDocumentType(originalFilename);

    // Upload-Verzeichnis erstellen
    const partDir = await ensureUploadDir(partId);

    // Eindeutigen Dateinamen generieren
    const timestamp = Date.now();
    const safeFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedFilename = `${timestamp}_${safeFilename}`;
    const filePath = path.join(partDir, storedFilename);

    // Datei verschieben
    await fs.rename(file.path, filePath);

    // Wenn is_primary_cad = true, vorherige primary CAD auf false setzen
    if (is_primary_cad === 'true' || is_primary_cad === true) {
      await pool.query(
        'UPDATE part_documents SET is_primary_cad = false WHERE part_id = $1 AND is_primary_cad = true',
        [partId]
      );
    }

    // Wenn is_primary_drawing = true, vorherige primary Drawing auf false setzen
    if (is_primary_drawing === 'true' || is_primary_drawing === true) {
      await pool.query(
        'UPDATE part_documents SET is_primary_drawing = false WHERE part_id = $1 AND is_primary_drawing = true',
        [partId]
      );
    }

    // In Datenbank speichern
    const insertResult = await pool.query(`
      INSERT INTO part_documents (
        part_id, document_type, original_filename, stored_filename,
        file_path, file_size, mime_type, file_extension,
        description, revision, is_primary_cad, is_primary_drawing, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      partId,
      docType,
      originalFilename,
      storedFilename,
      filePath,
      file.size,
      file.mimetype,
      fileExtension,
      description || null,
      revision || null,
      is_primary_cad === 'true' || is_primary_cad === true,
      is_primary_drawing === 'true' || is_primary_drawing === true,
      req.user?.id || null
    ]);

    res.status(201).json({
      success: true,
      message: 'Dokument erfolgreich hochgeladen',
      document: insertResult.rows[0]
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    
    // Cleanup bei Fehler
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    res.status(500).json({
      success: false,
      error: 'Fehler beim Hochladen des Dokuments'
    });
  }
};

/**
 * GET /api/parts/:partId/documents/:documentId/download
 * Dokument herunterladen
 */
exports.downloadDocument = async (req, res) => {
  try {
    const { partId, documentId } = req.params;

    const result = await pool.query(
      'SELECT * FROM part_documents WHERE id = $1 AND part_id = $2',
      [documentId, partId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Dokument nicht gefunden'
      });
    }

    const doc = result.rows[0];

    // Prüfen ob Datei existiert
    try {
      await fs.access(doc.file_path);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Datei nicht gefunden'
      });
    }

    // Datei senden
    res.download(doc.file_path, doc.original_filename);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Herunterladen'
    });
  }
};

/**
 * GET /api/parts/:partId/cad-file
 * Primäres CAD-Model für 3D-Viewer servieren
 */
exports.serveCadFile = async (req, res) => {
  try {
    const { partId } = req.params;

    // Primäres CAD-Model suchen
    let result = await pool.query(
      `SELECT * FROM part_documents 
       WHERE part_id = $1 AND is_primary_cad = true`,
      [partId]
    );

    // Fallback: Erstes CAD-Model
    if (result.rows.length === 0) {
      result = await pool.query(
        `SELECT * FROM part_documents 
         WHERE part_id = $1 AND document_type = 'cad_model'
         ORDER BY created_at DESC LIMIT 1`,
        [partId]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kein CAD-Modell gefunden'
      });
    }

    const doc = result.rows[0];

    // Prüfen ob Datei existiert
    try {
      await fs.access(doc.file_path);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'CAD-Datei nicht gefunden'
      });
    }

    // Content-Type basierend auf Dateiendung
    const contentTypes = {
      '.step': 'application/step',
      '.stp': 'application/step',
      '.stl': 'application/sla',
      '.obj': 'application/x-tgif',
      '.gltf': 'model/gltf+json',
      '.glb': 'model/gltf-binary',
      '.iges': 'application/iges',
      '.igs': 'application/iges'
    };

    const ext = doc.file_extension.toLowerCase();
    const contentType = contentTypes[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.original_filename}"`);
    
    // Stream senden
    const fileStream = fsSync.createReadStream(doc.file_path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving CAD file:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der CAD-Datei'
    });
  }
};

/**
 * DELETE /api/parts/:partId/documents/:documentId
 * Dokument löschen
 */
exports.deleteDocument = async (req, res) => {
  try {
    const { partId, documentId } = req.params;

    // Dokument suchen
    const result = await pool.query(
      'SELECT * FROM part_documents WHERE id = $1 AND part_id = $2',
      [documentId, partId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Dokument nicht gefunden'
      });
    }

    const doc = result.rows[0];

    // Datei löschen
    try {
      await fs.unlink(doc.file_path);
    } catch (err) {
      console.warn('Could not delete file:', err.message);
    }

    // Aus Datenbank löschen
    await pool.query('DELETE FROM part_documents WHERE id = $1', [documentId]);

    res.json({
      success: true,
      message: 'Dokument erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen des Dokuments'
    });
  }
};

/**
 * PATCH /api/parts/:partId/documents/:documentId
 * Dokument-Metadaten aktualisieren
 */
exports.updateDocument = async (req, res) => {
  try {
    const { partId, documentId } = req.params;
    const { description, revision, is_primary_cad, is_primary_drawing } = req.body;

    // Prüfen ob Dokument existiert
    const checkResult = await pool.query(
      'SELECT * FROM part_documents WHERE id = $1 AND part_id = $2',
      [documentId, partId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Dokument nicht gefunden'
      });
    }

    // Wenn is_primary_cad = true, vorherige auf false setzen
    if (is_primary_cad === true) {
      await pool.query(
        'UPDATE part_documents SET is_primary_cad = false WHERE part_id = $1 AND is_primary_cad = true AND id != $2',
        [partId, documentId]
      );
    }

    // Wenn is_primary_drawing = true, vorherige auf false setzen
    if (is_primary_drawing === true) {
      await pool.query(
        'UPDATE part_documents SET is_primary_drawing = false WHERE part_id = $1 AND is_primary_drawing = true AND id != $2',
        [partId, documentId]
      );
    }

    // Update
    const result = await pool.query(`
      UPDATE part_documents SET
        description = COALESCE($1, description),
        revision = COALESCE($2, revision),
        is_primary_cad = COALESCE($3, is_primary_cad),
        is_primary_drawing = COALESCE($4, is_primary_drawing),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [description, revision, is_primary_cad, is_primary_drawing, documentId]);

    res.json({
      success: true,
      message: 'Dokument aktualisiert',
      document: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren'
    });
  }
};

/**
 * POST /api/parts/:partId/documents/:documentId/set-primary
 * Dokument als primäres CAD-Model setzen
 */
exports.setPrimaryCad = async (req, res) => {
  try {
    const { partId, documentId } = req.params;

    // Prüfen ob Dokument existiert und CAD-Model ist
    const checkResult = await pool.query(
      `SELECT * FROM part_documents 
       WHERE id = $1 AND part_id = $2 AND document_type = 'cad_model'`,
      [documentId, partId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'CAD-Dokument nicht gefunden'
      });
    }

    // Alle anderen auf false setzen
    await pool.query(
      'UPDATE part_documents SET is_primary_cad = false WHERE part_id = $1',
      [partId]
    );

    // Dieses auf true setzen
    const result = await pool.query(
      'UPDATE part_documents SET is_primary_cad = true WHERE id = $1 RETURNING *',
      [documentId]
    );

    res.json({
      success: true,
      message: 'Primäres CAD-Model gesetzt',
      document: result.rows[0]
    });
  } catch (error) {
    console.error('Error setting primary CAD:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Setzen des primären CAD-Models'
    });
  }
};

/**
 * POST /api/parts/:partId/documents/:documentId/set-primary-drawing
 * Dokument als primäre Zeichnung setzen
 */
exports.setPrimaryDrawing = async (req, res) => {
  try {
    const { partId, documentId } = req.params;

    // Prüfen ob Dokument existiert und Zeichnung ist
    const checkResult = await pool.query(
      `SELECT * FROM part_documents 
       WHERE id = $1 AND part_id = $2 AND document_type = 'drawing'`,
      [documentId, partId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Zeichnung nicht gefunden'
      });
    }

    // Alle anderen auf false setzen
    await pool.query(
      'UPDATE part_documents SET is_primary_drawing = false WHERE part_id = $1',
      [partId]
    );

    // Dieses auf true setzen
    const result = await pool.query(
      'UPDATE part_documents SET is_primary_drawing = true WHERE id = $1 RETURNING *',
      [documentId]
    );

    res.json({
      success: true,
      message: 'Primäre Zeichnung gesetzt',
      document: result.rows[0]
    });
  } catch (error) {
    console.error('Error setting primary drawing:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Setzen der primären Zeichnung'
    });
  }
};
