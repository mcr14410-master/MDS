/**
 * Customer Documents Controller
 *
 * Handles document uploads, downloads, and management for customers.
 * Document types: photo, instruction, info, correspondence, agreement, certificate, other
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

const VALID_TYPES = ['photo', 'instruction', 'info', 'correspondence', 'agreement', 'certificate', 'other'];

// ============================================================================
// MULTER CONFIGURATION
// ============================================================================

const uploadDir = path.join(__dirname, '../../uploads/customer-documents');
if (!fsSync.existsSync(uploadDir)) {
  fsSync.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const safeFilename = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${uniqueSuffix}-${safeFilename}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'image/bmp', 'image/tiff', 'image/webp',
    'application/zip', 'application/x-zip-compressed',
    'text/plain',
    'message/rfc822', // .eml Email files
  ];
  const allowedExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp',
    '.zip', '.rar', '.7z', '.txt', '.eml', '.msg'
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Dateityp nicht erlaubt. Erlaubt: PDF, DOC, XLS, Bilder, ZIP, E-Mails, TXT'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
});

exports.uploadMiddleware = upload.single('file');

// ============================================================================
// OPERATIONS
// ============================================================================

/**
 * GET /api/customers/:customerId/documents
 */
exports.getDocumentsByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const result = await pool.query(`
      SELECT
        id, customer_id, document_type,
        file_name, file_path, file_size, mime_type,
        description, is_primary, uploaded_by, uploaded_at
      FROM customer_documents
      WHERE customer_id = $1
      ORDER BY is_primary DESC, document_type, uploaded_at DESC
    `, [customerId]);

    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Error getting customer documents:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Laden der Dokumente', message: error.message });
  }
};

/**
 * POST /api/customers/:customerId/documents/upload
 */
exports.uploadDocument = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { document_type = 'other', description, is_primary = false } = req.body;
    const userId = req.user?.id || null;
    const setPrimary = is_primary === true || is_primary === 'true';

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });
    }

    // Kunde muss existieren
    const customerCheck = await pool.query(
      'SELECT id FROM customers WHERE id = $1',
      [customerId]
    );
    if (customerCheck.rows.length === 0) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ success: false, error: 'Kunde nicht gefunden' });
    }

    if (!VALID_TYPES.includes(document_type)) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        error: `Ungültiger Dokumenttyp. Erlaubt: ${VALID_TYPES.join(', ')}`
      });
    }

    if (setPrimary) {
      await pool.query(
        'UPDATE customer_documents SET is_primary = false WHERE customer_id = $1',
        [customerId]
      );
    }

    const result = await pool.query(`
      INSERT INTO customer_documents (
        customer_id, document_type, file_name, file_path,
        file_size, mime_type, description, is_primary, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      customerId,
      document_type,
      req.file.originalname,
      req.file.filename,
      req.file.size,
      req.file.mimetype,
      description || null,
      setPrimary,
      userId
    ]);

    res.status(201).json({ success: true, message: 'Dokument hochgeladen', data: result.rows[0] });
  } catch (error) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    console.error('Error uploading customer document:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Hochladen', message: error.message });
  }
};

/**
 * GET /api/customer-documents/:id/download
 */
exports.downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT file_name, file_path, mime_type FROM customer_documents WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Dokument nicht gefunden' });
    }

    const doc = result.rows[0];
    const filePath = path.join(uploadDir, doc.file_path);
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(uploadDir);
    if (!resolvedPath.startsWith(resolvedDir + path.sep)) {
      return res.status(403).json({ success: false, error: 'Ungültiger Dateipfad' });
    }

    try {
      await fs.access(resolvedPath);
    } catch {
      return res.status(404).json({ success: false, error: 'Datei nicht gefunden' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.file_name)}"`);
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    fsSync.createReadStream(resolvedPath).pipe(res);
  } catch (error) {
    console.error('Error downloading customer document:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Download', message: error.message });
  }
};

/**
 * GET /api/customer-documents/:id/view
 * Inline view (fuer AuthImage / Lightbox)
 */
exports.viewDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT file_name, file_path, mime_type FROM customer_documents WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Dokument nicht gefunden' });
    }

    const doc = result.rows[0];
    const filePath = path.join(uploadDir, doc.file_path);
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(uploadDir);
    if (!resolvedPath.startsWith(resolvedDir + path.sep)) {
      return res.status(403).json({ success: false, error: 'Ungültiger Dateipfad' });
    }

    try {
      await fs.access(resolvedPath);
    } catch {
      return res.status(404).json({ success: false, error: 'Datei nicht gefunden' });
    }

    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.file_name)}"`);
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    fsSync.createReadStream(resolvedPath).pipe(res);
  } catch (error) {
    console.error('Error viewing customer document:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Anzeigen', message: error.message });
  }
};

/**
 * PUT /api/customer-documents/:id
 * Metadaten-Update (document_type, description, is_primary)
 */
exports.updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { document_type, description, is_primary } = req.body;

    if (document_type && !VALID_TYPES.includes(document_type)) {
      return res.status(400).json({
        success: false,
        error: `Ungültiger Dokumenttyp. Erlaubt: ${VALID_TYPES.join(', ')}`
      });
    }

    const current = await pool.query(
      'SELECT customer_id FROM customer_documents WHERE id = $1',
      [id]
    );
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Dokument nicht gefunden' });
    }

    if (is_primary === true || is_primary === 'true') {
      await pool.query(
        'UPDATE customer_documents SET is_primary = false WHERE customer_id = $1 AND id != $2',
        [current.rows[0].customer_id, id]
      );
    }

    const result = await pool.query(`
      UPDATE customer_documents SET
        document_type = COALESCE($1, document_type),
        description = $2,
        is_primary = COALESCE($3, is_primary)
      WHERE id = $4
      RETURNING *
    `, [document_type, description, is_primary, id]);

    res.json({ success: true, message: 'Dokument aktualisiert', data: result.rows[0] });
  } catch (error) {
    console.error('Error updating customer document:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Aktualisieren', message: error.message });
  }
};

/**
 * DELETE /api/customer-documents/:id
 */
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const docResult = await pool.query(
      'SELECT file_path FROM customer_documents WHERE id = $1',
      [id]
    );
    if (docResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Dokument nicht gefunden' });
    }

    const filePath = path.join(uploadDir, docResult.rows[0].file_path);

    await pool.query('DELETE FROM customer_documents WHERE id = $1', [id]);

    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.warn('Could not delete file:', err.message);
    }

    res.json({ success: true, message: 'Dokument gelöscht' });
  } catch (error) {
    console.error('Error deleting customer document:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Löschen', message: error.message });
  }
};
