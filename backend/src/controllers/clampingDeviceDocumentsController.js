/**
 * Clamping Device Documents Controller
 *
 * Handles document uploads, downloads, and management for clamping devices
 * Supports: drawing, photo, manual, datasheet, other
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
const uploadDir = path.join(__dirname, '../../uploads/clamping-device-documents');
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
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/webp',
    'application/dxf',
    'application/dwg',
    'application/step',
    'application/stp',
    'application/zip',
    'application/x-zip-compressed',
    'text/plain',
  ];

  const allowedExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp',
    '.dxf', '.dwg', '.step', '.stp',
    '.zip', '.rar', '.7z',
    '.txt'
  ];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Dateityp nicht erlaubt. Erlaubt: PDF, DOC, XLS, Bilder, CAD-Dateien'));
  }
};

// Multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  }
});

// Export upload middleware
exports.uploadMiddleware = upload.single('file');

// ============================================================================
// DOCUMENT OPERATIONS
// ============================================================================

/**
 * Get all documents for a clamping device
 * GET /api/clamping-devices/:deviceId/documents
 */
exports.getDocumentsByDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;

    const result = await pool.query(`
      SELECT 
        id,
        clamping_device_id,
        document_type,
        file_name,
        file_path,
        file_size,
        mime_type,
        description,
        uploaded_by,
        uploaded_at
      FROM clamping_device_documents
      WHERE clamping_device_id = $1
      ORDER BY document_type, uploaded_at DESC
    `, [deviceId]);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting clamping device documents:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Dokumente',
      message: error.message
    });
  }
};

/**
 * Upload document for a clamping device
 * POST /api/clamping-devices/:deviceId/documents/upload
 */
exports.uploadDocument = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { document_type = 'other', description } = req.body;
    const userId = req.user.id;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Keine Datei hochgeladen'
      });
    }

    // Verify clamping device exists
    const deviceCheck = await pool.query(
      'SELECT id, name FROM clamping_devices WHERE id = $1 AND deleted_at IS NULL',
      [deviceId]
    );

    if (deviceCheck.rows.length === 0) {
      // Delete uploaded file
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({
        success: false,
        error: 'Spannmittel nicht gefunden'
      });
    }

    // Validate document_type
    const validTypes = ['drawing', 'photo', 'manual', 'datasheet', 'other'];
    if (!validTypes.includes(document_type)) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        error: `Ungültiger Dokumenttyp. Erlaubt: ${validTypes.join(', ')}`
      });
    }

    // Insert document record
    const result = await pool.query(`
      INSERT INTO clamping_device_documents (
        clamping_device_id,
        document_type,
        file_name,
        file_path,
        file_size,
        mime_type,
        description,
        uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      deviceId,
      document_type,
      req.file.originalname,
      req.file.filename,
      req.file.size,
      req.file.mimetype,
      description || null,
      userId
    ]);

    res.status(201).json({
      success: true,
      message: 'Dokument hochgeladen',
      data: result.rows[0]
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    console.error('Error uploading document:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Hochladen',
      message: error.message
    });
  }
};

/**
 * Get document by ID
 * GET /api/clamping-device-documents/:id
 */
exports.getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        d.*,
        cd.name as device_name,
        cd.inventory_number
      FROM clamping_device_documents d
      JOIN clamping_devices cd ON d.clamping_device_id = cd.id
      WHERE d.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Dokument nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error getting document:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden des Dokuments',
      message: error.message
    });
  }
};

/**
 * Download document
 * GET /api/clamping-device-documents/:id/download
 */
exports.downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT file_name, file_path, mime_type FROM clamping_device_documents WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Dokument nicht gefunden'
      });
    }

    const doc = result.rows[0];
    const filePath = path.join(uploadDir, doc.file_path);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Datei nicht gefunden'
      });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.file_name)}"`);
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    
    const fileStream = fsSync.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Download',
      message: error.message
    });
  }
};

/**
 * Update document metadata
 * PUT /api/clamping-device-documents/:id
 */
exports.updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { document_type, description } = req.body;

    const validTypes = ['drawing', 'photo', 'manual', 'datasheet', 'other'];
    if (document_type && !validTypes.includes(document_type)) {
      return res.status(400).json({
        success: false,
        error: `Ungültiger Dokumenttyp. Erlaubt: ${validTypes.join(', ')}`
      });
    }

    const result = await pool.query(`
      UPDATE clamping_device_documents SET
        document_type = COALESCE($1, document_type),
        description = $2
      WHERE id = $3
      RETURNING *
    `, [document_type, description, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Dokument nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Dokument aktualisiert',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren',
      message: error.message
    });
  }
};

/**
 * Delete document
 * DELETE /api/clamping-device-documents/:id
 */
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    // Get file path before deletion
    const docResult = await pool.query(
      'SELECT file_path FROM clamping_device_documents WHERE id = $1',
      [id]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Dokument nicht gefunden'
      });
    }

    const filePath = path.join(uploadDir, docResult.rows[0].file_path);

    // Delete database record
    await pool.query('DELETE FROM clamping_device_documents WHERE id = $1', [id]);

    // Delete file
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.warn('Could not delete file:', err.message);
    }

    res.json({
      success: true,
      message: 'Dokument gelöscht'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen',
      message: error.message
    });
  }
};
