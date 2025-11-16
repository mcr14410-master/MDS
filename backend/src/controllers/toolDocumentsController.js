/**
 * Tool Documents Controller
 *
 * Handles document uploads, downloads, and management for tools
 * Supports: datasheets, drawings, certificates, manuals, photos, other
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
const uploadDir = path.join(__dirname, '../../uploads/tool-documents');
if (!fsSync.existsSync(uploadDir)) {
  fsSync.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-randomstring-originalname
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
    'application/iges',
    'application/igs',
    // Archives
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    // Text
    'text/plain',
    'text/csv',
  ];

  // Also allow by extension for CAD files that might have generic mime types
  const allowedExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp',
    '.dxf', '.dwg', '.step', '.stp', '.iges', '.igs',
    '.zip', '.rar', '.7z',
    '.txt', '.csv'
  ];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed types: PDF, DOC, XLS, Images, CAD files (DXF, DWG, STEP), Archives`));
  }
};

// Multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

// Export upload middleware
exports.uploadMiddleware = upload.single('file');

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Get all documents for a tool
 * GET /api/tools/:toolId/documents
 */
exports.getDocumentsByTool = async (req, res) => {
  const client = await pool.connect();
  try {
    const { toolId } = req.params;

    const query = `
      SELECT
        td.*,
        u.username as uploaded_by_username
      FROM tool_documents td
      LEFT JOIN users u ON u.id = td.uploaded_by
      WHERE td.tool_master_id = $1 AND td.is_deleted = false
      ORDER BY td.is_primary DESC NULLS LAST, td.uploaded_at DESC
    `;

    const result = await client.query(query, [toolId]);

    res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('getDocumentsByTool error:', error);
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
 * GET /api/tool-documents/:id
 */
exports.getDocumentById = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const query = `
      SELECT
        td.*,
        u.username as uploaded_by_username,
        tm.tool_number,
        tm.tool_name
      FROM tool_documents td
      LEFT JOIN users u ON u.id = td.uploaded_by
      LEFT JOIN tool_master tm ON tm.id = td.tool_master_id
      WHERE td.id = $1 AND td.is_deleted = false
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
 * POST /api/tools/:toolId/documents/upload
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

    const { toolId } = req.params;
    const { document_type, description } = req.body;
    const userId = req.user.id;

    // Validate document_type
    const validTypes = ['datasheet', 'drawing', 'certificate', 'manual', 'photo', 'other'];
    if (!document_type || !validTypes.includes(document_type)) {
      // Delete uploaded file if validation fails
      await fs.unlink(req.file.path).catch(err => console.error('Error deleting file:', err));
      return res.status(400).json({
        success: false,
        error: `document_type muss einer der folgenden Werte sein: ${validTypes.join(', ')}`
      });
    }

    // Verify tool exists
    const toolCheck = await client.query(
      'SELECT id FROM tool_master WHERE id = $1 AND is_deleted = false',
      [toolId]
    );

    if (toolCheck.rows.length === 0) {
      // Delete uploaded file
      await fs.unlink(req.file.path).catch(err => console.error('Error deleting file:', err));
      return res.status(404).json({
        success: false,
        error: 'Werkzeug nicht gefunden'
      });
    }

    // Insert document record
    const insertQuery = `
      INSERT INTO tool_documents (
        tool_master_id,
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

    const relativePath = `uploads/tool-documents/${req.file.filename}`;

    const result = await client.query(insertQuery, [
      toolId,
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
        td.*,
        u.username as uploaded_by_username
      FROM tool_documents td
      LEFT JOIN users u ON u.id = td.uploaded_by
      WHERE td.id = $1
    `;
    const fullRecord = await client.query(selectQuery, [result.rows[0].id]);

    res.status(201).json({
      success: true,
      message: 'Dokument erfolgreich hochgeladen',
      data: fullRecord.rows[0]
    });
  } catch (error) {
    console.error('uploadDocument error:', error);

    // Delete uploaded file on error
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(err => console.error('Error deleting file:', err));
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Datei ist zu groß (max. 50MB)'
      });
    }

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
 * GET /api/tool-documents/:id/download
 */
exports.downloadDocument = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const query = `
      SELECT * FROM tool_documents
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
    } catch (err) {
      return res.status(404).json({
        success: false,
        error: 'Datei nicht gefunden auf dem Server'
      });
    }

    // Set proper headers for download or inline viewing
    res.setHeader('Content-Type', doc.mime_type);
    
    // If view=true in query, use inline (opens in browser)
    // Otherwise use attachment (forces download)
    const disposition = req.query.view === 'true' ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(doc.file_name)}"`);
    res.setHeader('Content-Length', doc.file_size);

    // Stream file
    const fileStream = fsSync.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Fehler beim Herunterladen der Datei'
        });
      }
    });
  } catch (error) {
    console.error('downloadDocument error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Fehler beim Herunterladen des Dokuments',
        message: error.message
      });
    }
  } finally {
    client.release();
  }
};

/**
 * Update document metadata
 * PUT /api/tool-documents/:id
 */
exports.updateDocument = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { document_type, description } = req.body;

    // Validate document_type if provided
    if (document_type) {
      const validTypes = ['datasheet', 'drawing', 'certificate', 'manual', 'photo', 'other'];
      if (!validTypes.includes(document_type)) {
        return res.status(400).json({
          success: false,
          error: `document_type muss einer der folgenden Werte sein: ${validTypes.join(', ')}`
        });
      }
    }

    // Check if document exists
    const checkQuery = 'SELECT id FROM tool_documents WHERE id = $1 AND is_deleted = false';
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
      UPDATE tool_documents
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await client.query(updateQuery, values);

    // Fetch complete record with username
    const selectQuery = `
      SELECT
        td.*,
        u.username as uploaded_by_username
      FROM tool_documents td
      LEFT JOIN users u ON u.id = td.uploaded_by
      WHERE td.id = $1
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
 * DELETE /api/tool-documents/:id
 */
exports.deleteDocument = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await client.query('BEGIN');

    // Get document info
    const selectQuery = `
      SELECT * FROM tool_documents
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
      UPDATE tool_documents
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
      // Continue even if file deletion fails (file might already be gone)
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
 * Get document statistics for a tool
 * GET /api/tools/:toolId/documents/stats
 */
exports.getDocumentStats = async (req, res) => {
  const client = await pool.connect();
  try {
    const { toolId } = req.params;

    const query = `
      SELECT
        COUNT(*) as total_documents,
        COUNT(*) FILTER (WHERE document_type = 'datasheet') as datasheets,
        COUNT(*) FILTER (WHERE document_type = 'drawing') as drawings,
        COUNT(*) FILTER (WHERE document_type = 'certificate') as certificates,
        COUNT(*) FILTER (WHERE document_type = 'manual') as manuals,
        COUNT(*) FILTER (WHERE document_type = 'photo') as photos,
        COUNT(*) FILTER (WHERE document_type = 'other') as other,
        COALESCE(SUM(file_size), 0) as total_size_bytes
      FROM tool_documents
      WHERE tool_master_id = $1 AND is_deleted = false
    `;

    const result = await client.query(query, [toolId]);

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

// ============================================================================
// SET PRIMARY DOCUMENT
// ============================================================================

/**
 * Set a document as primary (main document)
 * PUT /api/tool-documents/:id/set-primary
 * 
 * - Automatically unsets any existing primary document for the same tool
 * - Only ONE primary document allowed per tool (enforced by DB constraint)
 */
exports.setPrimaryDocument = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await client.query('BEGIN');

    // 1. Check if document exists and get tool_master_id
    const docCheck = await client.query(
      'SELECT id, tool_master_id, file_name FROM tool_documents WHERE id = $1 AND is_deleted = false',
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
    const toolMasterId = document.tool_master_id;

    // 2. Unset any existing primary document for this tool
    await client.query(
      'UPDATE tool_documents SET is_primary = false WHERE tool_master_id = $1 AND is_primary = true',
      [toolMasterId]
    );

    // 3. Set this document as primary
    const updateQuery = `
      UPDATE tool_documents
      SET is_primary = true
      WHERE id = $1
      RETURNING 
        id, 
        tool_master_id, 
        document_type, 
        file_name, 
        file_path,
        file_size,
        mime_type,
        description,
        is_primary,
        uploaded_by,
        uploaded_at,
        (SELECT username FROM users WHERE id = tool_documents.uploaded_by) as uploaded_by_username
    `;

    const result = await client.query(updateQuery, [id]);

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: `Dokument "${document.file_name}" als Hauptdokument markiert`,
      data: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('setPrimaryDocument error:', error);
    
    // Check for unique index violation (Partial Unique Index)
    // Error code 23505 = unique violation
    if (error.code === '23505') {
      // Check if it's our primary index (name might be in constraint or detail)
      const isPrimaryConflict = 
        error.constraint === 'tool_documents_unique_primary_per_tool' ||
        (error.detail && error.detail.includes('tool_documents_unique_primary_per_tool'));
      
      if (isPrimaryConflict) {
        return res.status(409).json({
          success: false,
          error: 'Es existiert bereits ein Hauptdokument für dieses Werkzeug'
        });
      }
    }

    res.status(500).json({
      success: false,
      error: 'Fehler beim Setzen des Hauptdokuments',
      message: error.message
    });
  } finally {
    client.release();
  }
};
