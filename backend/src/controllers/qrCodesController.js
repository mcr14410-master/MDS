const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

/**
 * Generate or retrieve QR code for a storage item
 * POST /api/storage/items/:id/qr-code
 */
exports.generateOrGetQRCode = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    // Check if storage item exists
    const itemCheck = await client.query(
      'SELECT id FROM storage_items WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Storage Item nicht gefunden' 
      });
    }
    
    // Check if QR code already exists
    const existingQR = await client.query(
      `SELECT qr_code, qr_data, created_at 
       FROM qr_codes 
       WHERE entity_type = $1 AND entity_id = $2 AND is_active = true`,
      ['storage_item', id]
    );
    
    if (existingQR.rows.length > 0) {
      // Return existing QR code
      return res.json({
        success: true,
        data: {
          qrCode: existingQR.rows[0].qr_code,
          qrData: existingQR.rows[0].qr_data,
          createdAt: existingQR.rows[0].created_at,
          isNew: false
        }
      });
    }
    
    // Generate new QR code
    const randomId = crypto.randomBytes(4).toString('hex');
    const qrCodeId = `SI-${id}-${randomId}`;
    const qrData = `mds://storage-item/${id}`;
    
    await client.query(
      `INSERT INTO qr_codes (
        entity_type, 
        entity_id, 
        qr_code, 
        qr_data, 
        description,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'storage_item',
        id,
        qrCodeId,
        qrData,
        `QR-Code für Storage Item #${id}`,
        true
      ]
    );
    
    res.status(201).json({
      success: true,
      message: 'QR-Code erfolgreich generiert',
      data: {
        qrCode: qrCodeId,
        qrData: qrData,
        isNew: true
      }
    });
    
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Generieren des QR-Codes',
      error: error.message 
    });
  } finally {
    client.release();
  }
};

/**
 * Get storage item by QR code
 * GET /api/qr-codes/:code/scan
 */
exports.scanQRCode = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { code } = req.params;
    const userId = req.user?.id;
    
    // Find QR code
    const qrResult = await client.query(
      `SELECT id, entity_type, entity_id, qr_data, scan_count
       FROM qr_codes 
       WHERE qr_code = $1 AND is_active = true`,
      [code]
    );
    
    if (qrResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'QR-Code nicht gefunden' 
      });
    }
    
    const qr = qrResult.rows[0];
    
    // Update scan statistics
    await client.query(
      `UPDATE qr_codes 
       SET scan_count = scan_count + 1,
           last_scanned_at = CURRENT_TIMESTAMP,
           last_scanned_by = $1
       WHERE id = $2`,
      [userId, qr.id]
    );
    
    // Get storage item details based on entity type
    if (qr.entity_type === 'storage_item') {
      const itemResult = await client.query(
        `SELECT 
          si.*,
          tm.tool_number,
          tm.tool_name,
          tm.manufacturer,
          c.name as compartment_name,
          l.name as location_name,
          l.code as location_code
         FROM storage_items si
         LEFT JOIN tool_master tm ON si.tool_master_id = tm.id AND tm.deleted_at IS NULL
         LEFT JOIN storage_compartments c ON si.compartment_id = c.id
         LEFT JOIN storage_locations l ON c.location_id = l.id
         WHERE si.id = $1 AND si.deleted_at IS NULL`,
        [qr.entity_id]
      );
      
      if (itemResult.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Storage Item wurde gelöscht' 
        });
      }
      
      return res.json({
        success: true,
        data: {
          entityType: 'storage_item',
          storageItem: itemResult.rows[0],
          qrData: qr.qr_data,
          scanCount: qr.scan_count + 1
        }
      });
    }
    
    // Fallback for unknown entity types
    res.json({
      success: true,
      data: {
        entityType: qr.entity_type,
        entityId: qr.entity_id,
        qrData: qr.qr_data,
        scanCount: qr.scan_count + 1
      }
    });
    
  } catch (error) {
    console.error('Error scanning QR code:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Scannen des QR-Codes',
      error: error.message 
    });
  } finally {
    client.release();
  }
};

/**
 * Get QR code statistics
 * GET /api/storage/items/:id/qr-code/stats
 */
exports.getQRCodeStats = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    const result = await client.query(
      `SELECT 
        qr_code,
        scan_count,
        last_scanned_at,
        last_scanned_by,
        u.username as last_scanned_by_username,
        created_at
       FROM qr_codes qr
       LEFT JOIN users u ON qr.last_scanned_by = u.id
       WHERE qr.entity_type = $1 AND qr.entity_id = $2 AND qr.is_active = true`,
      ['storage_item', id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Kein QR-Code für dieses Storage Item gefunden' 
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error getting QR code stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Abrufen der QR-Code Statistiken',
      error: error.message 
    });
  } finally {
    client.release();
  }
};

/**
 * Deactivate QR code
 * DELETE /api/storage/items/:id/qr-code
 */
exports.deactivateQRCode = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    const result = await client.query(
      `UPDATE qr_codes 
       SET is_active = false 
       WHERE entity_type = $1 AND entity_id = $2
       RETURNING qr_code`,
      ['storage_item', id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Kein QR-Code für dieses Storage Item gefunden' 
      });
    }
    
    res.json({
      success: true,
      message: 'QR-Code erfolgreich deaktiviert',
      data: { qrCode: result.rows[0].qr_code }
    });
    
  } catch (error) {
    console.error('Error deactivating QR code:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Deaktivieren des QR-Codes',
      error: error.message 
    });
  } finally {
    client.release();
  }
};
