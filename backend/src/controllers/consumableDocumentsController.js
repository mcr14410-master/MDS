/**
 * Consumable Documents Controller
 * 
 * Manages consumable documents (SDS, TDS, Images)
 * 
 * Routes:
 * - GET    /api/consumables/:consumableId/documents     - Get all documents
 * - POST   /api/consumables/:consumableId/documents     - Upload document
 * - GET    /api/consumable-documents/:id                - Get document by ID
 * - PUT    /api/consumable-documents/:id                - Update document metadata
 * - DELETE /api/consumable-documents/:id                - Delete document
 * - PUT    /api/consumable-documents/:id/primary        - Set as primary image
 */

const pool = require('../config/db');
const path = require('path');
const fs = require('fs').promises;

// Upload directory
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const CONSUMABLE_DOCS_DIR = path.join(UPLOAD_DIR, 'consumables');

/**
 * GET /api/consumables/:consumableId/documents
 * Get all documents for a consumable
 */
exports.getDocuments = async (req, res) => {
  try {
    const { consumableId } = req.params;
    const { document_type } = req.query;

    let queryText = `
      SELECT 
        cd.*,
        u.username AS uploaded_by_name
      FROM consumable_documents cd
      LEFT JOIN users u ON cd.uploaded_by = u.id
      WHERE cd.consumable_id = $1
    `;
    
    const params = [consumableId];
    let paramCount = 2;

    if (document_type) {
      queryText += ` AND cd.document_type = $${paramCount}`;
      params.push(document_type);
      paramCount++;
    }

    queryText += ` ORDER BY cd.is_primary DESC, cd.uploaded_at DESC`;

    const result = await pool.query(queryText, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching consumable documents:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Dokumente',
      error: error.message
    });
  }
};

/**
 * POST /api/consumables/:consumableId/documents
 * Upload document
 */
exports.uploadDocument = async (req, res) => {
  try {
    const { consumableId } = req.params;
    const { document_type, title, is_primary } = req.body;

    // Check if consumable exists
    const checkConsumable = await pool.query(
      'SELECT id FROM consumables WHERE id = $1 AND is_deleted = false',
      [consumableId]
    );

    if (checkConsumable.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Verbrauchsmaterial nicht gefunden'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine Datei hochgeladen'
      });
    }

    // Validate document_type
    const validTypes = ['sds', 'tds', 'image', 'other'];
    const docType = document_type || 'other';
    
    if (!validTypes.includes(docType)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger Dokumenttyp. Erlaubt: sds, tds, image, other'
      });
    }

    // Create directory if not exists
    const consumableDir = path.join(CONSUMABLE_DOCS_DIR, consumableId.toString());
    await fs.mkdir(consumableDir, { recursive: true });

    // Generate unique filename
    const ext = path.extname(req.file.originalname);
    const filename = `${docType}_${Date.now()}${ext}`;
    const filePath = path.join(consumableDir, filename);
    const relativePath = path.join('consumables', consumableId.toString(), filename);

    // Move file
    await fs.writeFile(filePath, req.file.buffer);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // If setting as primary, unset other primaries
      if (is_primary && docType === 'image') {
        await client.query(
          'UPDATE consumable_documents SET is_primary = false WHERE consumable_id = $1 AND document_type = $2',
          [consumableId, 'image']
        );
      }

      const insertQuery = `
        INSERT INTO consumable_documents (
          consumable_id, document_type, title,
          file_path, original_filename, mime_type, file_size,
          is_primary, uploaded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        consumableId,
        docType,
        title || req.file.originalname,
        relativePath,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        is_primary && docType === 'image' ? true : false,
        req.user?.id
      ]);

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Dokument hochgeladen',
        data: result.rows[0]
      });

    } catch (err) {
      await client.query('ROLLBACK');
      // Clean up file on error
      await fs.unlink(filePath).catch(() => {});
      throw err;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hochladen des Dokuments',
      error: error.message
    });
  }
};

/**
 * GET /api/consumable-documents/:id
 * Get document by ID
 */
exports.getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT cd.*, u.username AS uploaded_by_name
       FROM consumable_documents cd
       LEFT JOIN users u ON cd.uploaded_by = u.id
       WHERE cd.id = $1`,
      [id]
    );

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
    console.error('Error fetching document:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Dokuments',
      error: error.message
    });
  }
};

/**
 * PUT /api/consumable-documents/:id
 * Update document metadata
 */
exports.updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, document_type } = req.body;

    // Check if exists
    const checkExisting = await pool.query(
      'SELECT * FROM consumable_documents WHERE id = $1',
      [id]
    );

    if (checkExisting.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dokument nicht gefunden'
      });
    }

    // Validate document_type if provided
    if (document_type) {
      const validTypes = ['sds', 'tds', 'image', 'other'];
      if (!validTypes.includes(document_type)) {
        return res.status(400).json({
          success: false,
          message: 'Ungültiger Dokumenttyp'
        });
      }
    }

    const result = await pool.query(
      `UPDATE consumable_documents 
       SET title = COALESCE($1, title),
           document_type = COALESCE($2, document_type)
       WHERE id = $3
       RETURNING *`,
      [title, document_type, id]
    );

    res.json({
      success: true,
      message: 'Dokument aktualisiert',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Dokuments',
      error: error.message
    });
  }
};

/**
 * DELETE /api/consumable-documents/:id
 * Delete document
 */
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    // Get document info
    const docResult = await pool.query(
      'SELECT * FROM consumable_documents WHERE id = $1',
      [id]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dokument nicht gefunden'
      });
    }

    const doc = docResult.rows[0];

    // Delete from database
    await pool.query('DELETE FROM consumable_documents WHERE id = $1', [id]);

    // Delete file
    const filePath = path.join(UPLOAD_DIR, doc.file_path);
    await fs.unlink(filePath).catch(err => {
      console.warn('Could not delete file:', err.message);
    });

    res.json({
      success: true,
      message: 'Dokument gelöscht'
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Dokuments',
      error: error.message
    });
  }
};

/**
 * PUT /api/consumable-documents/:id/primary
 * Set document as primary image
 */
exports.setPrimaryImage = async (req, res) => {
  try {
    const { id } = req.params;

    // Get document info
    const docResult = await pool.query(
      'SELECT * FROM consumable_documents WHERE id = $1',
      [id]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dokument nicht gefunden'
      });
    }

    const doc = docResult.rows[0];

    if (doc.document_type !== 'image') {
      return res.status(400).json({
        success: false,
        message: 'Nur Bilder können als Hauptbild gesetzt werden'
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Unset all primaries for this consumable
      await client.query(
        'UPDATE consumable_documents SET is_primary = false WHERE consumable_id = $1 AND document_type = $2',
        [doc.consumable_id, 'image']
      );

      // Set this one as primary
      await client.query(
        'UPDATE consumable_documents SET is_primary = true WHERE id = $1',
        [id]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Hauptbild gesetzt'
      });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error setting primary image:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Setzen des Hauptbilds',
      error: error.message
    });
  }
};

/**
 * GET /api/consumable-documents/:id/download
 * Download document file
 */
/**
 * Interne Helper-Funktion: Document ausliefern (DRY für view + download)
 */
async function serveDocument(req, res, disposition) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM consumable_documents WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dokument nicht gefunden'
      });
    }

    const doc = result.rows[0];
    const absPath = path.resolve(UPLOAD_DIR, doc.file_path);
    const uploadsRoot = path.resolve(UPLOAD_DIR);

    // Path-Traversal-Schutz
    if (!absPath.startsWith(uploadsRoot + path.sep)) {
      return res.status(403).json({ success: false, message: 'Ungültiger Pfad' });
    }

    // Datei-Existenz prüfen
    try {
      await fs.access(absPath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'Datei auf dem Server nicht gefunden'
      });
    }

    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${encodeURIComponent(doc.original_filename)}"`
    );
    res.sendFile(absPath);
  } catch (error) {
    console.error('Error serving document:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Ausliefern des Dokuments',
      error: error.message
    });
  }
}

/**
 * GET /api/consumable-documents/:id/view
 * Document inline anzeigen (für AuthImage)
 */
exports.viewDocument = (req, res) => serveDocument(req, res, 'inline');

/**
 * GET /api/consumable-documents/:id/download
 * Download document file
 */
exports.downloadDocument = (req, res) => serveDocument(req, res, 'attachment');
