/**
 * Fixture Documents Controller
 * 
 * Manages document uploads for fixtures (Vorrichtungen)
 * 
 * Routes:
 * - GET    /api/fixtures/:id/documents            - Get documents for fixture
 * - POST   /api/fixtures/:id/documents/upload     - Upload document
 * - GET    /api/fixtures/documents/:id/download   - Download document
 * - PUT    /api/fixtures/documents/:id            - Update document metadata
 * - DELETE /api/fixtures/documents/:id            - Delete document
 */

const pool = require('../config/db');
const path = require('path');
const fs = require('fs').promises;

// Upload directory
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const FIXTURES_DIR = path.join(UPLOAD_DIR, 'fixtures');

// Ensure directory exists
const ensureDir = async (dir) => {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
};

/**
 * GET /api/fixtures/:id/documents
 * Get all documents for a fixture
 */
exports.getDocuments = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        fd.*,
        u.username as uploaded_by_name
      FROM fixture_documents fd
      LEFT JOIN users u ON u.id = fd.uploaded_by
      WHERE fd.fixture_id = $1
      ORDER BY fd.is_primary DESC, fd.document_type, fd.created_at DESC
    `, [id]);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Error getting fixture documents:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Dokumente',
      error: error.message
    });
  }
};

/**
 * POST /api/fixtures/:id/documents/upload
 * Upload a document
 */
exports.uploadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { document_type = 'other', description, is_primary = false } = req.body;
    const userId = req.user?.id;

    // Check if fixture exists
    const fixtureCheck = await pool.query(`
      SELECT id, fixture_number FROM fixtures WHERE id = $1 AND deleted_at IS NULL
    `, [id]);

    if (fixtureCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vorrichtung nicht gefunden'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine Datei hochgeladen'
      });
    }

    // Ensure upload directory exists
    await ensureDir(FIXTURES_DIR);

    // Generate unique filename
    const ext = path.extname(req.file.originalname);
    const filename = `fixture-${id}-${Date.now()}${ext}`;
    const filePath = path.join(FIXTURES_DIR, filename);

    // Move file
    await fs.rename(req.file.path, filePath);

    // If is_primary, reset other primary docs of same type
    if (is_primary) {
      await pool.query(`
        UPDATE fixture_documents 
        SET is_primary = false 
        WHERE fixture_id = $1 AND document_type = $2
      `, [id, document_type]);
    }

    // Save to database
    const result = await pool.query(`
      INSERT INTO fixture_documents (
        fixture_id, document_type, file_name, file_path,
        file_size, mime_type, description, is_primary, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      id,
      document_type,
      req.file.originalname,
      filePath,
      req.file.size,
      req.file.mimetype,
      description,
      is_primary,
      userId
    ]);

    res.status(201).json({
      success: true,
      message: 'Dokument hochgeladen',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error uploading fixture document:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hochladen des Dokuments',
      error: error.message
    });
  }
};

/**
 * GET /api/fixtures/documents/:id/download
 * Download a document
 */
exports.downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT * FROM fixture_documents WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dokument nicht gefunden'
      });
    }

    const doc = result.rows[0];

    // Check if file exists
    try {
      await fs.access(doc.file_path);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'Datei nicht gefunden'
      });
    }

    res.download(doc.file_path, doc.file_name);

  } catch (error) {
    console.error('Error downloading fixture document:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Herunterladen des Dokuments',
      error: error.message
    });
  }
};

/**
 * PUT /api/fixtures/documents/:id
 * Update document metadata
 */
exports.updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { document_type, description, is_primary } = req.body;

    // Get current document
    const currentDoc = await pool.query(`
      SELECT * FROM fixture_documents WHERE id = $1
    `, [id]);

    if (currentDoc.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dokument nicht gefunden'
      });
    }

    const doc = currentDoc.rows[0];

    // If setting as primary, reset other primary docs
    if (is_primary) {
      await pool.query(`
        UPDATE fixture_documents 
        SET is_primary = false 
        WHERE fixture_id = $1 AND document_type = $2 AND id != $3
      `, [doc.fixture_id, document_type || doc.document_type, id]);
    }

    const result = await pool.query(`
      UPDATE fixture_documents SET
        document_type = COALESCE($1, document_type),
        description = $2,
        is_primary = COALESCE($3, is_primary)
      WHERE id = $4
      RETURNING *
    `, [document_type, description, is_primary, id]);

    res.json({
      success: true,
      message: 'Dokument aktualisiert',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating fixture document:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Dokuments',
      error: error.message
    });
  }
};

/**
 * DELETE /api/fixtures/documents/:id
 * Delete a document
 */
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM fixture_documents WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dokument nicht gefunden'
      });
    }

    // Delete file from disk
    try {
      await fs.unlink(result.rows[0].file_path);
    } catch (err) {
      console.warn('Could not delete file:', err.message);
    }

    res.json({
      success: true,
      message: 'Dokument gelöscht'
    });

  } catch (error) {
    console.error('Error deleting fixture document:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Dokuments',
      error: error.message
    });
  }
};
