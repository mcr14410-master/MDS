/**
 * Operation Documents Controller
 * Verwaltet Dokumente für Operationen
 */

const db = require('../config/db');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

// Upload-Verzeichnis
const UPLOAD_DIR = process.env.OPERATION_DOCUMENTS_PATH || path.join(__dirname, '../../uploads/operation-documents');

// Erlaubte Dateitypen
const ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt',
  '.png', '.jpg', '.jpeg', '.gif', '.svg',
  '.dxf', '.dwg', '.step', '.stp',
  '.zip', '.rar', '.7z'
];

// Max Dateigröße (50 MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Hilfsfunktion: Upload-Verzeichnis sicherstellen
 */
async function ensureUploadDir(operationId) {
  const opDir = path.join(UPLOAD_DIR, String(operationId));
  await fs.mkdir(opDir, { recursive: true });
  return opDir;
}

/**
 * Hilfsfunktion: Prüfen ob Dateiendung erlaubt
 */
function isAllowedExtension(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * GET /api/operation-documents?operation_id=xxx
 * Alle Dokumente einer Operation
 */
exports.getAll = async (req, res) => {
  try {
    const { operation_id } = req.query;

    if (!operation_id) {
      return res.status(400).json({
        success: false,
        message: 'operation_id ist erforderlich'
      });
    }

    const result = await db.query(`
      SELECT 
        od.*,
        u.username as uploaded_by_name
      FROM operation_documents od
      LEFT JOIN users u ON od.uploaded_by = u.id
      WHERE od.operation_id = $1
      ORDER BY od.created_at DESC
    `, [operation_id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching operation documents:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Dokumente',
      error: error.message
    });
  }
};

/**
 * GET /api/operation-documents/:id
 * Einzelnes Dokument
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT 
        od.*,
        u.username as uploaded_by_name
      FROM operation_documents od
      LEFT JOIN users u ON od.uploaded_by = u.id
      WHERE od.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dokument nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching operation document:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Dokuments',
      error: error.message
    });
  }
};

/**
 * POST /api/operation-documents
 * Dokument hochladen
 */
exports.upload = async (req, res) => {
  try {
    const { operation_id, document_type, title, description } = req.body;
    const userId = req.user?.id;
    const file = req.file;

    if (!operation_id) {
      return res.status(400).json({
        success: false,
        message: 'operation_id ist erforderlich'
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Keine Datei hochgeladen'
      });
    }

    // Dateiendung prüfen
    if (!isAllowedExtension(file.originalname)) {
      return res.status(400).json({
        success: false,
        message: 'Dateityp nicht erlaubt'
      });
    }

    // Dateigröße prüfen
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        message: 'Datei zu groß (max. 50 MB)'
      });
    }

    // Upload-Verzeichnis erstellen
    const uploadDir = await ensureUploadDir(operation_id);

    // Eindeutigen Dateinamen generieren
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const storedFilename = `${timestamp}_${Math.random().toString(36).substr(2, 9)}${ext}`;
    const filePath = path.join(uploadDir, storedFilename);

    // Datei speichern
    await fs.writeFile(filePath, file.buffer);

    // In DB speichern
    const result = await db.query(`
      INSERT INTO operation_documents 
        (operation_id, document_type, title, description, original_filename, stored_filename, file_path, file_size, mime_type, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      operation_id,
      document_type || 'other',
      title || file.originalname,
      description || '',
      file.originalname,
      storedFilename,
      filePath,
      file.size,
      file.mimetype,
      userId
    ]);

    res.status(201).json({
      success: true,
      message: 'Dokument hochgeladen',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error uploading operation document:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hochladen',
      error: error.message
    });
  }
};

/**
 * PUT /api/operation-documents/:id
 * Dokument-Metadaten aktualisieren
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, document_type } = req.body;

    const result = await db.query(`
      UPDATE operation_documents SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        document_type = COALESCE($3, document_type),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [title, description, document_type, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dokument nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Dokument aktualisiert',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating operation document:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren',
      error: error.message
    });
  }
};

/**
 * DELETE /api/operation-documents/:id
 * Dokument löschen
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    // Erst Datei-Info holen
    const doc = await db.query('SELECT * FROM operation_documents WHERE id = $1', [id]);
    
    if (doc.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dokument nicht gefunden'
      });
    }

    // Datei löschen
    try {
      await fs.unlink(doc.rows[0].file_path);
    } catch (err) {
      console.warn('Could not delete file:', err.message);
    }

    // DB-Eintrag löschen
    await db.query('DELETE FROM operation_documents WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Dokument gelöscht'
    });
  } catch (error) {
    console.error('Error deleting operation document:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen',
      error: error.message
    });
  }
};

/**
 * GET /api/operation-documents/:id/download
 * Dokument herunterladen
 */
exports.download = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('SELECT * FROM operation_documents WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dokument nicht gefunden'
      });
    }

    const doc = result.rows[0];

    // Prüfen ob Datei existiert
    if (!fsSync.existsSync(doc.file_path)) {
      return res.status(404).json({
        success: false,
        message: 'Datei nicht gefunden'
      });
    }

    res.download(doc.file_path, doc.original_filename);
  } catch (error) {
    console.error('Error downloading operation document:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Download',
      error: error.message
    });
  }
};
