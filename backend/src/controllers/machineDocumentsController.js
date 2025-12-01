/**
 * Machine Documents Controller
 *
 * Handles document uploads, downloads, and management for machines
 * Supports: manual, schematic, maintenance_manual, certificate, other
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

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

// ============================================================================
// MULTER CONFIGURATION
// ============================================================================

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/machine-documents');
if (!fsSync.existsSync(uploadDir)) {
  fsSync.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const safeFilename = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${uniqueSuffix}-${safeFilename}${ext}`);
  }
});

// File filter - allowed types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/webp',
    // CAD files
    'application/dxf',
    'application/dwg',
    'application/step',
    'application/stp',
    // Archives
    'application/zip',
    'application/x-zip-compressed',
    // Text
    'text/plain',
  ];

  const allowedExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp',
    '.dxf', '.dwg', '.step', '.stp',
    '.zip',
    '.txt'
  ];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Dateityp nicht erlaubt. Erlaubte Typen: PDF, DOC, XLS, Bilder, CAD-Dateien, ZIP`));
  }
};

// Multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit (Handbücher können groß sein)
  }
});

// Export upload middleware
exports.uploadMiddleware = upload.single('file');

// Valid document types
const VALID_DOCUMENT_TYPES = ['manual', 'schematic', 'maintenance_manual', 'certificate', 'photo', 'other'];

// Document type labels (German)
const DOCUMENT_TYPE_LABELS = {
  manual: 'Handbuch',
  schematic: 'Schaltplan',
  maintenance_manual: 'Wartungsanleitung',
  certificate: 'Zertifikat',
  photo: 'Foto',
  other: 'Sonstiges'
};

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Get all documents for a machine
 * GET /api/machines/:machineId/documents
 */
exports.getDocumentsByMachine = async (req, res) => {
  const client = await pool.connect();
  try {
    const { machineId } = req.params;

    const query = `
      SELECT
        md.*,
        u.username as uploaded_by_username
      FROM machine_documents md
      LEFT JOIN users u ON u.id = md.uploaded_by
      WHERE md.machine_id = $1 AND md.is_deleted = false
      ORDER BY md.is_primary DESC NULLS LAST, md.document_type, md.uploaded_at DESC
    `;

    const result = await client.query(query, [machineId]);

    res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('getDocumentsByMachine error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Dokumente',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get single document by ID
 * GET /api/machine-documents/:id
 */
exports.getDocumentById = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const query = `
      SELECT
        md.*,
        u.username as uploaded_by_username,
        m.name as machine_name
      FROM machine_documents md
      LEFT JOIN users u ON u.id = md.uploaded_by
      LEFT JOIN machines m ON m.id = md.machine_id
      WHERE md.id = $1 AND md.is_deleted = false
    `;

    const result = await client.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Dokument nicht gefunden'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('getDocumentById error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden des Dokuments',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Upload document
 * POST /api/machines/:machineId/documents/upload
 */
exports.uploadDocument = async (req, res) => {
  const client = await pool.connect();
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Keine Datei hochgeladen'
      });
    }

    const { machineId } = req.params;
    const { document_type, description } = req.body;
    const userId = req.user.id;

    // Validate document_type
    if (!document_type || !VALID_DOCUMENT_TYPES.includes(document_type)) {
      await fs.unlink(req.file.path).catch(err => console.error('Error deleting file:', err));
      return res.status(400).json({
        success: false,
        error: `document_type muss einer der folgenden Werte sein: ${VALID_DOCUMENT_TYPES.join(', ')}`
      });
    }

    // Verify machine exists
    const machineCheck = await client.query(
      'SELECT id FROM machines WHERE id = $1',
      [machineId]
    );

    if (machineCheck.rows.length === 0) {
      await fs.unlink(req.file.path).catch(err => console.error('Error deleting file:', err));
      return res.status(404).json({
        success: false,
        error: 'Maschine nicht gefunden'
      });
    }

    // Insert document record
    const insertQuery = `
      INSERT INTO machine_documents (
        machine_id,
        document_type,
        file_name,
        file_path,
        file_size,
        mime_type,
        description,
        uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const relativePath = `uploads/machine-documents/${req.file.filename}`;

    const result = await client.query(insertQuery, [
      machineId,
      document_type,
      req.file.originalname,
      relativePath,
      req.file.size,
      req.file.mimetype,
      description || null,
      userId
    ]);

    // Fetch complete record with username
    const selectQuery = `
      SELECT
        md.*,
        u.username as uploaded_by_username
      FROM machine_documents md
      LEFT JOIN users u ON u.id = md.uploaded_by
      WHERE md.id = $1
    `;
    const fullRecord = await client.query(selectQuery, [result.rows[0].id]);

    res.status(201).json({
      success: true,
      message: 'Dokument erfolgreich hochgeladen',
      data: fullRecord.rows[0]
    });
  } catch (error) {
    // Delete uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(err => console.error('Error deleting file:', err));
    }
    console.error('uploadDocument error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Hochladen des Dokuments',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Download document
 * GET /api/machine-documents/:id/download
 */
exports.downloadDocument = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const query = `
      SELECT * FROM machine_documents
      WHERE id = $1 AND is_deleted = false
    `;
    const result = await client.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Dokument nicht gefunden'
      });
    }

    const doc = result.rows[0];
    const filePath = path.join(__dirname, '../..', doc.file_path);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Datei nicht gefunden auf dem Server'
      });
    }

    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.file_name)}"`);
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');

    // Stream file
    const fileStream = fsSync.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('downloadDocument error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Herunterladen des Dokuments',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * View document inline (for images)
 * GET /api/machine-documents/:id/view
 */
exports.viewDocument = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const query = `
      SELECT * FROM machine_documents
      WHERE id = $1 AND is_deleted = false
    `;
    const result = await client.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Dokument nicht gefunden'
      });
    }

    const doc = result.rows[0];
    const filePath = path.join(__dirname, '../..', doc.file_path);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Datei nicht gefunden auf dem Server'
      });
    }

    // Set headers for inline viewing
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.file_name)}"`);
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=3600');

    // Stream file
    const fileStream = fsSync.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('viewDocument error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Anzeigen des Dokuments',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Update document metadata
 * PUT /api/machine-documents/:id
 */
exports.updateDocument = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { document_type, description } = req.body;

    // Validate document_type if provided
    if (document_type && !VALID_DOCUMENT_TYPES.includes(document_type)) {
      return res.status(400).json({
        success: false,
        error: `document_type muss einer der folgenden Werte sein: ${VALID_DOCUMENT_TYPES.join(', ')}`
      });
    }

    // Check if document exists
    const checkQuery = 'SELECT id FROM machine_documents WHERE id = $1 AND is_deleted = false';
    const checkResult = await client.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Dokument nicht gefunden'
      });
    }

    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (document_type !== undefined) {
      updates.push(`document_type = $${paramCount++}`);
      values.push(document_type);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Keine Felder zum Aktualisieren angegeben'
      });
    }

    values.push(id);

    const updateQuery = `
      UPDATE machine_documents
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    await client.query(updateQuery, values);

    // Fetch complete record
    const selectQuery = `
      SELECT
        md.*,
        u.username as uploaded_by_username
      FROM machine_documents md
      LEFT JOIN users u ON u.id = md.uploaded_by
      WHERE md.id = $1
    `;
    const fullRecord = await client.query(selectQuery, [id]);

    res.status(200).json({
      success: true,
      message: 'Dokument erfolgreich aktualisiert',
      data: fullRecord.rows[0]
    });
  } catch (error) {
    console.error('updateDocument error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren des Dokuments',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Delete document (soft delete + remove file)
 * DELETE /api/machine-documents/:id
 */
exports.deleteDocument = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await client.query('BEGIN');

    // Get document info
    const selectQuery = `
      SELECT * FROM machine_documents
      WHERE id = $1 AND is_deleted = false
    `;
    const docResult = await client.query(selectQuery, [id]);

    if (docResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Dokument nicht gefunden'
      });
    }

    const doc = docResult.rows[0];

    // Soft delete in database
    const deleteQuery = `
      UPDATE machine_documents
      SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
      WHERE id = $2
    `;
    await client.query(deleteQuery, [userId, id]);

    // Delete physical file
    const filePath = path.join(__dirname, '../..', doc.file_path);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.error('Error deleting physical file:', err);
    }

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Dokument erfolgreich gelöscht'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('deleteDocument error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen des Dokuments',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Set document as primary
 * PUT /api/machine-documents/:id/set-primary
 */
exports.setPrimaryDocument = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Check if document exists
    const docCheck = await client.query(
      'SELECT id, machine_id, file_name FROM machine_documents WHERE id = $1 AND is_deleted = false',
      [id]
    );

    if (docCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Dokument nicht gefunden'
      });
    }

    const document = docCheck.rows[0];
    const machineId = document.machine_id;

    // Unset any existing primary
    await client.query(
      'UPDATE machine_documents SET is_primary = false WHERE machine_id = $1 AND is_primary = true',
      [machineId]
    );

    // Set this document as primary
    await client.query(
      'UPDATE machine_documents SET is_primary = true WHERE id = $1',
      [id]
    );

    await client.query('COMMIT');

    // Fetch updated record
    const selectQuery = `
      SELECT
        md.*,
        u.username as uploaded_by_username
      FROM machine_documents md
      LEFT JOIN users u ON u.id = md.uploaded_by
      WHERE md.id = $1
    `;
    const result = await client.query(selectQuery, [id]);

    res.status(200).json({
      success: true,
      message: `Dokument "${document.file_name}" als Hauptdokument markiert`,
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('setPrimaryDocument error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Setzen des Hauptdokuments',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get document statistics for a machine
 * GET /api/machines/:machineId/documents/stats
 */
exports.getDocumentStats = async (req, res) => {
  const client = await pool.connect();
  try {
    const { machineId } = req.params;

    const query = `
      SELECT
        COUNT(*) as total_documents,
        COUNT(*) FILTER (WHERE document_type = 'manual') as manuals,
        COUNT(*) FILTER (WHERE document_type = 'schematic') as schematics,
        COUNT(*) FILTER (WHERE document_type = 'maintenance_manual') as maintenance_manuals,
        COUNT(*) FILTER (WHERE document_type = 'certificate') as certificates,
        COUNT(*) FILTER (WHERE document_type = 'other') as other,
        COALESCE(SUM(file_size), 0) as total_size_bytes
      FROM machine_documents
      WHERE machine_id = $1 AND is_deleted = false
    `;

    const result = await client.query(query, [machineId]);

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('getDocumentStats error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Statistiken',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get document type labels
 * GET /api/machine-documents/types
 */
exports.getDocumentTypes = (req, res) => {
  res.status(200).json({
    success: true,
    data: DOCUMENT_TYPE_LABELS
  });
};
