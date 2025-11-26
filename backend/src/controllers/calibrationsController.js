/**
 * Calibrations Controller
 * 
 * Manages calibrations and certificates for measuring equipment
 * 
 * Routes:
 * - GET    /api/calibrations                     - Get all calibrations
 * - GET    /api/calibrations/:id                 - Get calibration by ID
 * - POST   /api/calibrations                     - Create calibration
 * - PUT    /api/calibrations/:id                 - Update calibration
 * - DELETE /api/calibrations/:id                 - Delete calibration
 * 
 * - POST   /api/calibrations/:id/certificates    - Upload certificate
 * - GET    /api/calibrations/:id/certificates    - Get certificates
 * - DELETE /api/calibrations/certificates/:certId - Delete certificate
 */

const pool = require('../config/db');
const path = require('path');
const fs = require('fs').promises;

// ============================================================================
// CALIBRATIONS
// ============================================================================

/**
 * GET /api/calibrations
 * Get all calibrations with optional filters
 */
exports.getAllCalibrations = async (req, res) => {
  try {
    const { 
      equipment_id,
      result,
      provider,
      from_date,
      to_date,
      sort_by = 'calibration_date',
      sort_order = 'desc'
    } = req.query;

    let queryText = `
      SELECT 
        c.*,
        me.inventory_number,
        me.name as equipment_name,
        met.name as equipment_type,
        u.username as performed_by_name,
        (SELECT COUNT(*) FROM calibration_certificates cc WHERE cc.calibration_id = c.id) as certificate_count
      FROM calibrations c
      JOIN measuring_equipment me ON c.equipment_id = me.id
      LEFT JOIN measuring_equipment_types met ON me.type_id = met.id
      LEFT JOIN users u ON c.performed_by = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (equipment_id) {
      queryText += ` AND c.equipment_id = $${paramCount}`;
      params.push(equipment_id);
      paramCount++;
    }

    if (result) {
      queryText += ` AND c.result = $${paramCount}`;
      params.push(result);
      paramCount++;
    }

    if (provider) {
      queryText += ` AND c.provider ILIKE $${paramCount}`;
      params.push(`%${provider}%`);
      paramCount++;
    }

    if (from_date) {
      queryText += ` AND c.calibration_date >= $${paramCount}`;
      params.push(from_date);
      paramCount++;
    }

    if (to_date) {
      queryText += ` AND c.calibration_date <= $${paramCount}`;
      params.push(to_date);
      paramCount++;
    }

    // Sorting
    const validSortFields = ['calibration_date', 'valid_until', 'result', 'provider', 'created_at'];
    const sortField = validSortFields.includes(sort_by) ? `c.${sort_by}` : 'c.calibration_date';
    const order = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    queryText += ` ORDER BY ${sortField} ${order}`;

    const result_query = await pool.query(queryText, params);

    res.json({
      success: true,
      count: result_query.rows.length,
      data: result_query.rows
    });

  } catch (error) {
    console.error('Error getting calibrations:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Kalibrierungen',
      error: error.message
    });
  }
};

/**
 * GET /api/calibrations/:id
 * Get calibration by ID with certificates
 */
exports.getCalibrationById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        c.*,
        me.inventory_number,
        me.name as equipment_name,
        met.name as equipment_type,
        u.username as performed_by_name,
        cu.username as created_by_name
      FROM calibrations c
      JOIN measuring_equipment me ON c.equipment_id = me.id
      LEFT JOIN measuring_equipment_types met ON me.type_id = met.id
      LEFT JOIN users u ON c.performed_by = u.id
      LEFT JOIN users cu ON c.created_by = cu.id
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kalibrierung nicht gefunden'
      });
    }

    // Get certificates
    const certificates = await pool.query(`
      SELECT 
        cc.*,
        u.username as uploaded_by_name
      FROM calibration_certificates cc
      LEFT JOIN users u ON cc.uploaded_by = u.id
      WHERE cc.calibration_id = $1
      ORDER BY cc.uploaded_at DESC
    `, [id]);

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        certificates: certificates.rows
      }
    });

  } catch (error) {
    console.error('Error getting calibration:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Kalibrierung',
      error: error.message
    });
  }
};

/**
 * POST /api/calibrations
 * Create new calibration
 * Note: Trigger updates measuring_equipment automatically
 */
exports.createCalibration = async (req, res) => {
  try {
    const {
      equipment_id,
      calibration_date,
      valid_until,
      result,
      measured_values,
      deviation,
      provider,
      certificate_number,
      cost,
      notes,
      performed_by
    } = req.body;

    // Validation
    if (!equipment_id || !calibration_date || !valid_until || !result) {
      return res.status(400).json({
        success: false,
        message: 'Messmittel, Datum, Gültig bis und Ergebnis sind erforderlich'
      });
    }

    const validResults = ['passed', 'failed', 'adjusted', 'limited'];
    if (!validResults.includes(result)) {
      return res.status(400).json({
        success: false,
        message: `Ungültiges Ergebnis. Erlaubt: ${validResults.join(', ')}`
      });
    }

    // Check if equipment exists
    const equipmentCheck = await pool.query(
      'SELECT id FROM measuring_equipment WHERE id = $1 AND deleted_at IS NULL',
      [equipment_id]
    );
    if (equipmentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Messmittel nicht gefunden'
      });
    }

    const insertResult = await pool.query(`
      INSERT INTO calibrations (
        equipment_id, calibration_date, valid_until, result,
        measured_values, deviation, provider, certificate_number,
        cost, notes, performed_by, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      equipment_id, calibration_date, valid_until, result,
      measured_values ? JSON.stringify(measured_values) : null,
      deviation, provider, certificate_number,
      cost, notes, performed_by, req.user?.id
    ]);

    // If calibration failed, optionally lock the equipment
    if (result === 'failed') {
      await pool.query(`
        UPDATE measuring_equipment SET
          status = 'locked',
          lock_reason = 'Kalibrierung nicht bestanden',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [equipment_id]);
    } else if (result === 'passed' || result === 'adjusted') {
      // Ensure equipment is active after successful calibration
      await pool.query(`
        UPDATE measuring_equipment SET
          status = 'active',
          lock_reason = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 'in_calibration'
      `, [equipment_id]);
    }

    // Fetch complete data
    const fullResult = await pool.query(`
      SELECT 
        c.*,
        me.inventory_number,
        me.name as equipment_name
      FROM calibrations c
      JOIN measuring_equipment me ON c.equipment_id = me.id
      WHERE c.id = $1
    `, [insertResult.rows[0].id]);

    res.status(201).json({
      success: true,
      message: 'Kalibrierung erfasst',
      data: fullResult.rows[0]
    });

  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Messmittel nicht gefunden'
      });
    }
    console.error('Error creating calibration:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erfassen der Kalibrierung',
      error: error.message
    });
  }
};

/**
 * PUT /api/calibrations/:id
 * Update calibration
 */
exports.updateCalibration = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      calibration_date,
      valid_until,
      result,
      measured_values,
      deviation,
      provider,
      certificate_number,
      cost,
      notes,
      performed_by
    } = req.body;

    const updateResult = await pool.query(`
      UPDATE calibrations SET
        calibration_date = COALESCE($1, calibration_date),
        valid_until = COALESCE($2, valid_until),
        result = COALESCE($3, result),
        measured_values = COALESCE($4, measured_values),
        deviation = COALESCE($5, deviation),
        provider = COALESCE($6, provider),
        certificate_number = COALESCE($7, certificate_number),
        cost = COALESCE($8, cost),
        notes = COALESCE($9, notes),
        performed_by = COALESCE($10, performed_by)
      WHERE id = $11
      RETURNING *
    `, [
      calibration_date, valid_until, result,
      measured_values ? JSON.stringify(measured_values) : null,
      deviation, provider, certificate_number,
      cost, notes, performed_by, id
    ]);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kalibrierung nicht gefunden'
      });
    }

    // If this is the latest calibration, update equipment dates
    const calibration = updateResult.rows[0];
    const latestCheck = await pool.query(`
      SELECT id FROM calibrations 
      WHERE equipment_id = $1 
      ORDER BY calibration_date DESC 
      LIMIT 1
    `, [calibration.equipment_id]);

    if (latestCheck.rows[0]?.id === calibration.id) {
      await pool.query(`
        UPDATE measuring_equipment SET
          last_calibration_date = $1,
          next_calibration_date = $2,
          calibration_provider = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [calibration.calibration_date, calibration.valid_until, calibration.provider, calibration.equipment_id]);
    }

    res.json({
      success: true,
      message: 'Kalibrierung aktualisiert',
      data: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Error updating calibration:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Kalibrierung',
      error: error.message
    });
  }
};

/**
 * DELETE /api/calibrations/:id
 * Delete calibration and its certificates
 */
exports.deleteCalibration = async (req, res) => {
  try {
    const { id } = req.params;

    // Get certificates to delete files
    const certificates = await pool.query(
      'SELECT file_path FROM calibration_certificates WHERE calibration_id = $1',
      [id]
    );

    // Delete calibration (cascades to certificates)
    const result = await pool.query(
      'DELETE FROM calibrations WHERE id = $1 RETURNING equipment_id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kalibrierung nicht gefunden'
      });
    }

    // Delete certificate files
    for (const cert of certificates.rows) {
      try {
        await fs.unlink(cert.file_path);
      } catch (err) {
        console.warn('Could not delete certificate file:', cert.file_path);
      }
    }

    // Update equipment with previous calibration data
    const equipmentId = result.rows[0].equipment_id;
    const previousCal = await pool.query(`
      SELECT calibration_date, valid_until, provider
      FROM calibrations 
      WHERE equipment_id = $1 
      ORDER BY calibration_date DESC 
      LIMIT 1
    `, [equipmentId]);

    if (previousCal.rows.length > 0) {
      await pool.query(`
        UPDATE measuring_equipment SET
          last_calibration_date = $1,
          next_calibration_date = $2,
          calibration_provider = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [
        previousCal.rows[0].calibration_date,
        previousCal.rows[0].valid_until,
        previousCal.rows[0].provider,
        equipmentId
      ]);
    } else {
      await pool.query(`
        UPDATE measuring_equipment SET
          last_calibration_date = NULL,
          next_calibration_date = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [equipmentId]);
    }

    res.json({
      success: true,
      message: 'Kalibrierung gelöscht'
    });

  } catch (error) {
    console.error('Error deleting calibration:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Kalibrierung',
      error: error.message
    });
  }
};

// ============================================================================
// CERTIFICATES
// ============================================================================

/**
 * POST /api/calibrations/:id/certificates
 * Upload certificate PDF
 * Expects multipart/form-data with 'file' field
 */
exports.uploadCertificate = async (req, res) => {
  try {
    const { id } = req.params;

    // Check calibration exists
    const calibrationCheck = await pool.query(
      'SELECT id FROM calibrations WHERE id = $1',
      [id]
    );
    if (calibrationCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kalibrierung nicht gefunden'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine Datei hochgeladen'
      });
    }

    const result = await pool.query(`
      INSERT INTO calibration_certificates (
        calibration_id, file_name, file_path, file_size, mime_type, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      id,
      req.file.originalname,
      req.file.path,
      req.file.size,
      req.file.mimetype,
      req.user?.id
    ]);

    res.status(201).json({
      success: true,
      message: 'Zertifikat hochgeladen',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error uploading certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hochladen des Zertifikats',
      error: error.message
    });
  }
};

/**
 * GET /api/calibrations/:id/certificates
 * Get all certificates for a calibration
 */
exports.getCertificates = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        cc.*,
        u.username as uploaded_by_name
      FROM calibration_certificates cc
      LEFT JOIN users u ON cc.uploaded_by = u.id
      WHERE cc.calibration_id = $1
      ORDER BY cc.uploaded_at DESC
    `, [id]);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Error getting certificates:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Zertifikate',
      error: error.message
    });
  }
};

/**
 * DELETE /api/calibrations/certificates/:certId
 * Delete a certificate
 */
exports.deleteCertificate = async (req, res) => {
  try {
    const { certId } = req.params;

    const result = await pool.query(
      'DELETE FROM calibration_certificates WHERE id = $1 RETURNING file_path',
      [certId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Zertifikat nicht gefunden'
      });
    }

    // Delete file
    try {
      await fs.unlink(result.rows[0].file_path);
    } catch (err) {
      console.warn('Could not delete certificate file:', result.rows[0].file_path);
    }

    res.json({
      success: true,
      message: 'Zertifikat gelöscht'
    });

  } catch (error) {
    console.error('Error deleting certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Zertifikats',
      error: error.message
    });
  }
};

/**
 * GET /api/calibrations/certificates/:certId/download
 * Download certificate file
 */
exports.downloadCertificate = async (req, res) => {
  try {
    const { certId } = req.params;

    const result = await pool.query(
      'SELECT file_name, file_path, mime_type FROM calibration_certificates WHERE id = $1',
      [certId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Zertifikat nicht gefunden'
      });
    }

    const cert = result.rows[0];
    res.download(cert.file_path, cert.file_name);

  } catch (error) {
    console.error('Error downloading certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Herunterladen des Zertifikats',
      error: error.message
    });
  }
};
