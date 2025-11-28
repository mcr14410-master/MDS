/**
 * Clamping Devices Controller
 * 
 * Manages clamping devices (Spannmittel) and types
 * Mengenbasierte Lagerverwaltung ohne Kalibrierung
 * 
 * Routes:
 * - GET    /api/clamping-devices/types        - Get all types
 * - GET    /api/clamping-devices/types/:id    - Get type by ID
 * - POST   /api/clamping-devices/types        - Create type
 * - PUT    /api/clamping-devices/types/:id    - Update type
 * - DELETE /api/clamping-devices/types/:id    - Delete type
 * 
 * - GET    /api/clamping-devices              - Get all devices
 * - GET    /api/clamping-devices/stats        - Get statistics
 * - GET    /api/clamping-devices/:id          - Get device by ID
 * - POST   /api/clamping-devices              - Create device
 * - PUT    /api/clamping-devices/:id          - Update device
 * - DELETE /api/clamping-devices/:id          - Soft delete device
 * - PATCH  /api/clamping-devices/:id/status   - Update status
 */

const pool = require('../config/db');

// ============================================================================
// TYPES
// ============================================================================

/**
 * GET /api/clamping-devices/types
 * Get all clamping device types
 */
exports.getAllTypes = async (req, res) => {
  try {
    const { is_active } = req.query;

    let queryText = `
      SELECT 
        cdt.*,
        (SELECT COUNT(*) FROM clamping_devices cd 
         WHERE cd.type_id = cdt.id AND cd.deleted_at IS NULL) as device_count
      FROM clamping_device_types cdt
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (is_active !== undefined) {
      queryText += ` AND cdt.is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    queryText += ` ORDER BY cdt.sort_order, cdt.name`;

    const result = await pool.query(queryText, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Error getting clamping device types:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Spannmitteltypen',
      error: error.message
    });
  }
};

/**
 * GET /api/clamping-devices/types/:id
 * Get type by ID
 */
exports.getTypeById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        cdt.*,
        (SELECT COUNT(*) FROM clamping_devices cd 
         WHERE cd.type_id = cdt.id AND cd.deleted_at IS NULL) as device_count
      FROM clamping_device_types cdt
      WHERE cdt.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Spannmitteltyp nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error getting clamping device type:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Spannmitteltyps',
      error: error.message
    });
  }
};

/**
 * POST /api/clamping-devices/types
 * Create new type
 */
exports.createType = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      icon, 
      sort_order = 0,
      is_active = true 
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name ist erforderlich'
      });
    }

    const result = await pool.query(`
      INSERT INTO clamping_device_types 
        (name, description, icon, sort_order, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, description, icon, sort_order, is_active]);

    res.status(201).json({
      success: true,
      message: 'Spannmitteltyp erstellt',
      data: result.rows[0]
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Ein Spannmitteltyp mit diesem Namen existiert bereits'
      });
    }
    console.error('Error creating clamping device type:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Spannmitteltyps',
      error: error.message
    });
  }
};

/**
 * PUT /api/clamping-devices/types/:id
 * Update type
 */
exports.updateType = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      icon, 
      sort_order,
      is_active 
    } = req.body;

    const result = await pool.query(`
      UPDATE clamping_device_types SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        icon = COALESCE($3, icon),
        sort_order = COALESCE($4, sort_order),
        is_active = COALESCE($5, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [name, description, icon, sort_order, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Spannmitteltyp nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Spannmitteltyp aktualisiert',
      data: result.rows[0]
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Ein Spannmitteltyp mit diesem Namen existiert bereits'
      });
    }
    console.error('Error updating clamping device type:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Spannmitteltyps',
      error: error.message
    });
  }
};

/**
 * DELETE /api/clamping-devices/types/:id
 * Delete type (only if no devices use it)
 */
exports.deleteType = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if type is in use
    const checkResult = await pool.query(`
      SELECT COUNT(*) as count FROM clamping_devices 
      WHERE type_id = $1 AND deleted_at IS NULL
    `, [id]);

    if (parseInt(checkResult.rows[0].count) > 0) {
      return res.status(409).json({
        success: false,
        message: 'Spannmitteltyp wird noch verwendet und kann nicht gelöscht werden'
      });
    }

    const result = await pool.query(`
      DELETE FROM clamping_device_types WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Spannmitteltyp nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Spannmitteltyp gelöscht'
    });

  } catch (error) {
    console.error('Error deleting clamping device type:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Spannmitteltyps',
      error: error.message
    });
  }
};

// ============================================================================
// CLAMPING DEVICES (Stammdaten)
// ============================================================================

/**
 * GET /api/clamping-devices
 * Get all clamping devices with optional filters
 */
exports.getAll = async (req, res) => {
  try {
    const { 
      type_id, 
      status, 
      machine_id,
      search,
      include_deleted = 'false'
    } = req.query;

    let queryText = `
      SELECT * FROM clamping_devices_with_stock
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    // Soft-Delete Filter
    if (include_deleted !== 'true') {
      // View filtert bereits deleted_at IS NULL
    }

    // Typ-Filter
    if (type_id) {
      queryText += ` AND type_id = $${paramCount}`;
      params.push(type_id);
      paramCount++;
    }

    // Status-Filter
    if (status) {
      queryText += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    // Maschinen-Filter
    if (machine_id) {
      queryText += ` AND machine_id = $${paramCount}`;
      params.push(machine_id);
      paramCount++;
    }

    // Suche
    if (search) {
      queryText += ` AND (
        name ILIKE $${paramCount} OR 
        inventory_number ILIKE $${paramCount} OR
        manufacturer ILIKE $${paramCount} OR
        model ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    queryText += ` ORDER BY type_name, name`;

    const result = await pool.query(queryText, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Error getting clamping devices:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Spannmittel',
      error: error.message
    });
  }
};

/**
 * GET /api/clamping-devices/stats
 * Get statistics
 */
exports.getStats = async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE deleted_at IS NULL) as total,
        COUNT(*) FILTER (WHERE status = 'active' AND deleted_at IS NULL) as active,
        COUNT(*) FILTER (WHERE status = 'in_repair' AND deleted_at IS NULL) as in_repair,
        COUNT(*) FILTER (WHERE status = 'retired' AND deleted_at IS NULL) as retired
      FROM clamping_devices
    `);

    // Nach Typ gruppiert
    const byTypeResult = await pool.query(`
      SELECT 
        cdt.name as type_name,
        COUNT(cd.id) as count
      FROM clamping_device_types cdt
      LEFT JOIN clamping_devices cd ON cd.type_id = cdt.id AND cd.deleted_at IS NULL
      WHERE cdt.is_active = true
      GROUP BY cdt.id, cdt.name, cdt.sort_order
      ORDER BY cdt.sort_order
    `);

    res.json({
      success: true,
      data: {
        ...statsResult.rows[0],
        by_type: byTypeResult.rows
      }
    });

  } catch (error) {
    console.error('Error getting clamping device stats:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Statistiken',
      error: error.message
    });
  }
};

/**
 * GET /api/clamping-devices/:id
 * Get device by ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT * FROM clamping_devices_with_stock
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Spannmittel nicht gefunden'
      });
    }

    // Lagerorte laden
    const storageResult = await pool.query(`
      SELECT 
        si.*,
        sc.code as compartment_code,
        sc.name as compartment_name,
        sl.name as location_name,
        sl.code as location_code
      FROM storage_items si
      JOIN storage_compartments sc ON si.compartment_id = sc.id
      JOIN storage_locations sl ON sc.location_id = sl.id
      WHERE si.clamping_device_id = $1
      ORDER BY sl.name, sc.code
    `, [id]);

    // Dokumente laden
    const docsResult = await pool.query(`
      SELECT * FROM clamping_device_documents
      WHERE clamping_device_id = $1
      ORDER BY document_type, uploaded_at DESC
    `, [id]);

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        storage_locations: storageResult.rows,
        documents: docsResult.rows
      }
    });

  } catch (error) {
    console.error('Error getting clamping device:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Spannmittels',
      error: error.message
    });
  }
};

/**
 * POST /api/clamping-devices
 * Create new device
 */
exports.create = async (req, res) => {
  try {
    const { 
      name,
      type_id,
      manufacturer,
      model,
      clamping_range_min,
      clamping_range_max,
      clamping_force,
      dimensions,
      weight,
      machine_id,
      status = 'active',
      purchase_date,
      purchase_price,
      supplier_id,
      notes
    } = req.body;

    const userId = req.user?.id;

    // Validierung
    if (!name || !type_id) {
      return res.status(400).json({
        success: false,
        message: 'Name und Typ sind erforderlich'
      });
    }

    // Inventarnummer generieren: SPANN-YYYY-NNN
    const year = new Date().getFullYear();
    const countResult = await pool.query(`
      SELECT COUNT(*) as count FROM clamping_devices 
      WHERE inventory_number LIKE $1
    `, [`SPANN-${year}-%`]);
    
    const nextNumber = parseInt(countResult.rows[0].count) + 1;
    const inventory_number = `SPANN-${year}-${String(nextNumber).padStart(3, '0')}`;

    const result = await pool.query(`
      INSERT INTO clamping_devices (
        inventory_number, name, type_id, manufacturer, model,
        clamping_range_min, clamping_range_max, clamping_force,
        dimensions, weight, machine_id, status,
        purchase_date, purchase_price,
        supplier_id, notes, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17
      )
      RETURNING *
    `, [
      inventory_number, name, type_id, manufacturer, model,
      clamping_range_min || null, clamping_range_max || null, clamping_force || null,
      dimensions, weight || null, machine_id || null, status,
      purchase_date || null, purchase_price || null,
      supplier_id || null, notes, userId
    ]);

    // Mit View-Daten zurückgeben
    const fullResult = await pool.query(`
      SELECT * FROM clamping_devices_with_stock WHERE id = $1
    `, [result.rows[0].id]);

    res.status(201).json({
      success: true,
      message: 'Spannmittel erstellt',
      data: fullResult.rows[0]
    });

  } catch (error) {
    console.error('Error creating clamping device:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Spannmittels',
      error: error.message
    });
  }
};

/**
 * PUT /api/clamping-devices/:id
 * Update device
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name,
      type_id,
      manufacturer,
      model,
      clamping_range_min,
      clamping_range_max,
      clamping_force,
      dimensions,
      weight,
      machine_id,
      purchase_date,
      purchase_price,
      supplier_id,
      notes
    } = req.body;

    const userId = req.user?.id;

    const result = await pool.query(`
      UPDATE clamping_devices SET
        name = COALESCE($1, name),
        type_id = COALESCE($2, type_id),
        manufacturer = $3,
        model = $4,
        clamping_range_min = $5,
        clamping_range_max = $6,
        clamping_force = $7,
        dimensions = $8,
        weight = $9,
        machine_id = $10,
        purchase_date = $11,
        purchase_price = $12,
        supplier_id = $13,
        notes = $14,
        updated_by = $15,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16 AND deleted_at IS NULL
      RETURNING *
    `, [
      name, type_id, manufacturer, model,
      clamping_range_min, clamping_range_max, clamping_force,
      dimensions, weight, machine_id,
      purchase_date, purchase_price,
      supplier_id, notes, userId, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Spannmittel nicht gefunden'
      });
    }

    // Mit View-Daten zurückgeben
    const fullResult = await pool.query(`
      SELECT * FROM clamping_devices_with_stock WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      message: 'Spannmittel aktualisiert',
      data: fullResult.rows[0]
    });

  } catch (error) {
    console.error('Error updating clamping device:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Spannmittels',
      error: error.message
    });
  }
};

/**
 * DELETE /api/clamping-devices/:id
 * Soft delete device
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await pool.query(`
      UPDATE clamping_devices SET
        deleted_at = CURRENT_TIMESTAMP,
        updated_by = $1
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING *
    `, [userId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Spannmittel nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Spannmittel gelöscht'
    });

  } catch (error) {
    console.error('Error deleting clamping device:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Spannmittels',
      error: error.message
    });
  }
};

/**
 * PATCH /api/clamping-devices/:id/status
 * Update status
 */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    const validStatuses = ['active', 'in_repair', 'retired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Ungültiger Status. Erlaubt: ${validStatuses.join(', ')}`
      });
    }

    const result = await pool.query(`
      UPDATE clamping_devices SET
        status = $1,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND deleted_at IS NULL
      RETURNING *
    `, [status, userId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Spannmittel nicht gefunden'
      });
    }

    // Mit View-Daten zurückgeben
    const fullResult = await pool.query(`
      SELECT * FROM clamping_devices_with_stock WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      message: 'Status aktualisiert',
      data: fullResult.rows[0]
    });

  } catch (error) {
    console.error('Error updating clamping device status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Status',
      error: error.message
    });
  }
};

/**
 * POST /api/clamping-devices/:id/generate-inventory-number
 * Generate next inventory number (for preview)
 */
exports.generateInventoryNumber = async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const countResult = await pool.query(`
      SELECT COUNT(*) as count FROM clamping_devices 
      WHERE inventory_number LIKE $1
    `, [`SPANN-${year}-%`]);
    
    const nextNumber = parseInt(countResult.rows[0].count) + 1;
    const inventory_number = `SPANN-${year}-${String(nextNumber).padStart(3, '0')}`;

    res.json({
      success: true,
      data: { inventory_number }
    });

  } catch (error) {
    console.error('Error generating inventory number:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren der Inventarnummer',
      error: error.message
    });
  }
};
