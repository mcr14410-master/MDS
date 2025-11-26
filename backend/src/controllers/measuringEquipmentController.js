/**
 * Measuring Equipment Controller
 * 
 * Manages measuring equipment (Messmittel) and types
 * ISO/Luftfahrt-konform mit Kalibrierungsverwaltung
 * 
 * Routes:
 * - GET    /api/measuring-equipment/types        - Get all types
 * - GET    /api/measuring-equipment/types/:id    - Get type by ID
 * - POST   /api/measuring-equipment/types        - Create type
 * - PUT    /api/measuring-equipment/types/:id    - Update type
 * - DELETE /api/measuring-equipment/types/:id    - Delete type
 * 
 * - GET    /api/measuring-equipment              - Get all equipment
 * - GET    /api/measuring-equipment/stats        - Get statistics
 * - GET    /api/measuring-equipment/:id          - Get equipment by ID
 * - POST   /api/measuring-equipment              - Create equipment
 * - PUT    /api/measuring-equipment/:id          - Update equipment
 * - DELETE /api/measuring-equipment/:id          - Soft delete equipment
 * - PATCH  /api/measuring-equipment/:id/status   - Update status
 */

const pool = require('../config/db');

// ============================================================================
// TYPES
// ============================================================================

/**
 * GET /api/measuring-equipment/types
 * Get all measuring equipment types
 */
exports.getAllTypes = async (req, res) => {
  try {
    const { is_active } = req.query;

    let queryText = `
      SELECT 
        met.*,
        (SELECT COUNT(*) FROM measuring_equipment me 
         WHERE me.type_id = met.id AND me.deleted_at IS NULL) as equipment_count
      FROM measuring_equipment_types met
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (is_active !== undefined) {
      queryText += ` AND met.is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    queryText += ` ORDER BY met.sort_order, met.name`;

    const result = await pool.query(queryText, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Error getting measuring equipment types:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Messmitteltypen',
      error: error.message
    });
  }
};

/**
 * GET /api/measuring-equipment/types/:id
 * Get type by ID
 */
exports.getTypeById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        met.*,
        (SELECT COUNT(*) FROM measuring_equipment me 
         WHERE me.type_id = met.id AND me.deleted_at IS NULL) as equipment_count
      FROM measuring_equipment_types met
      WHERE met.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Messmitteltyp nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error getting measuring equipment type:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Messmitteltyps',
      error: error.message
    });
  }
};

/**
 * POST /api/measuring-equipment/types
 * Create new type
 */
exports.createType = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      icon, 
      default_calibration_interval_months = 12,
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
      INSERT INTO measuring_equipment_types 
        (name, description, icon, default_calibration_interval_months, sort_order, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, description, icon, default_calibration_interval_months, sort_order, is_active]);

    res.status(201).json({
      success: true,
      message: 'Messmitteltyp erstellt',
      data: result.rows[0]
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Ein Messmitteltyp mit diesem Namen existiert bereits'
      });
    }
    console.error('Error creating measuring equipment type:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Messmitteltyps',
      error: error.message
    });
  }
};

/**
 * PUT /api/measuring-equipment/types/:id
 * Update type
 */
exports.updateType = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      icon, 
      default_calibration_interval_months,
      sort_order,
      is_active 
    } = req.body;

    const result = await pool.query(`
      UPDATE measuring_equipment_types SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        icon = COALESCE($3, icon),
        default_calibration_interval_months = COALESCE($4, default_calibration_interval_months),
        sort_order = COALESCE($5, sort_order),
        is_active = COALESCE($6, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [name, description, icon, default_calibration_interval_months, sort_order, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Messmitteltyp nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Messmitteltyp aktualisiert',
      data: result.rows[0]
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Ein Messmitteltyp mit diesem Namen existiert bereits'
      });
    }
    console.error('Error updating measuring equipment type:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Messmitteltyps',
      error: error.message
    });
  }
};

/**
 * DELETE /api/measuring-equipment/types/:id
 * Delete type (only if no equipment uses it)
 */
exports.deleteType = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if type is in use
    const checkResult = await pool.query(`
      SELECT COUNT(*) as count FROM measuring_equipment 
      WHERE type_id = $1 AND deleted_at IS NULL
    `, [id]);

    if (parseInt(checkResult.rows[0].count) > 0) {
      return res.status(409).json({
        success: false,
        message: 'Messmitteltyp wird noch verwendet und kann nicht gelöscht werden'
      });
    }

    const result = await pool.query(`
      DELETE FROM measuring_equipment_types WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Messmitteltyp nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Messmitteltyp gelöscht'
    });

  } catch (error) {
    console.error('Error deleting measuring equipment type:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Messmitteltyps',
      error: error.message
    });
  }
};

// ============================================================================
// EQUIPMENT
// ============================================================================

/**
 * GET /api/measuring-equipment
 * Get all measuring equipment with filters
 */
exports.getAllEquipment = async (req, res) => {
  try {
    const { 
      type_id,
      status,
      calibration_status,
      storage_location_id,
      search,
      sort_by = 'inventory_number',
      sort_order = 'asc'
    } = req.query;

    let queryText = `
      SELECT * FROM measuring_equipment_with_status
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    // Filters
    if (type_id) {
      queryText += ` AND type_id = $${paramCount}`;
      params.push(type_id);
      paramCount++;
    }

    if (status) {
      queryText += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (calibration_status) {
      queryText += ` AND calibration_status = $${paramCount}`;
      params.push(calibration_status);
      paramCount++;
    }

    if (storage_location_id) {
      queryText += ` AND storage_location_id = $${paramCount}`;
      params.push(storage_location_id);
      paramCount++;
    }

    if (search) {
      queryText += ` AND (
        inventory_number ILIKE $${paramCount} OR 
        name ILIKE $${paramCount} OR 
        manufacturer ILIKE $${paramCount} OR
        serial_number ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Sorting
    const validSortFields = [
      'inventory_number', 'name', 'type_name', 'manufacturer', 
      'status', 'next_calibration_date', 'created_at'
    ];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'inventory_number';
    const order = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    
    queryText += ` ORDER BY ${sortField} ${order}`;

    const result = await pool.query(queryText, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Error getting measuring equipment:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Messmittel',
      error: error.message
    });
  }
};

/**
 * GET /api/measuring-equipment/stats
 * Get equipment statistics for dashboard
 */
exports.getEquipmentStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE calibration_status = 'ok') as ok_count,
        COUNT(*) FILTER (WHERE calibration_status = 'due_soon') as due_soon_count,
        COUNT(*) FILTER (WHERE calibration_status = 'overdue') as overdue_count,
        COUNT(*) FILTER (WHERE calibration_status = 'locked') as locked_count,
        COUNT(*) FILTER (WHERE calibration_status IN ('in_calibration', 'repair')) as in_service_count,
        COUNT(*) as total_count
      FROM measuring_equipment_with_status
    `);

    // Equipment due in next 30 days
    const upcomingResult = await pool.query(`
      SELECT 
        id, inventory_number, name, type_name, 
        next_calibration_date, days_until_calibration
      FROM measuring_equipment_with_status
      WHERE calibration_status IN ('due_soon', 'overdue')
      ORDER BY next_calibration_date ASC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        counts: result.rows[0],
        upcoming_calibrations: upcomingResult.rows
      }
    });

  } catch (error) {
    console.error('Error getting equipment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Statistiken',
      error: error.message
    });
  }
};

/**
 * GET /api/measuring-equipment/:id
 * Get equipment by ID with full details
 */
exports.getEquipmentById = async (req, res) => {
  try {
    const { id } = req.params;

    // Equipment mit User-Namen für created_by und updated_by
    const result = await pool.query(`
      SELECT 
        mews.*,
        uc.username as created_by_name,
        uu.username as updated_by_name
      FROM measuring_equipment_with_status mews
      LEFT JOIN users uc ON mews.created_by = uc.id
      LEFT JOIN users uu ON mews.updated_by = uu.id
      WHERE mews.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Messmittel nicht gefunden'
      });
    }

    // Get calibration history mit created_by_name
    const calibrations = await pool.query(`
      SELECT 
        c.*,
        u.username as performed_by_name,
        uc.username as created_by_name
      FROM calibrations c
      LEFT JOIN users u ON c.performed_by = u.id
      LEFT JOIN users uc ON c.created_by = uc.id
      WHERE c.equipment_id = $1
      ORDER BY c.calibration_date DESC
    `, [id]);

    // Get certificates for all calibrations
    const calibrationIds = calibrations.rows.map(c => c.id);
    let certificatesMap = {};
    
    if (calibrationIds.length > 0) {
      const certificates = await pool.query(`
        SELECT 
          cc.id,
          cc.calibration_id,
          cc.file_name,
          cc.file_size,
          cc.mime_type,
          cc.uploaded_at,
          u.username as uploaded_by_name
        FROM calibration_certificates cc
        LEFT JOIN users u ON cc.uploaded_by = u.id
        WHERE cc.calibration_id = ANY($1)
        ORDER BY cc.uploaded_at DESC
      `, [calibrationIds]);
      
      // Group certificates by calibration_id
      certificates.rows.forEach(cert => {
        if (!certificatesMap[cert.calibration_id]) {
          certificatesMap[cert.calibration_id] = [];
        }
        certificatesMap[cert.calibration_id].push(cert);
      });
    }

    // Attach certificates to calibrations
    const calibrationsWithCerts = calibrations.rows.map(cal => ({
      ...cal,
      certificates: certificatesMap[cal.id] || []
    }));

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        calibrations: calibrationsWithCerts
      }
    });

  } catch (error) {
    console.error('Error getting measuring equipment:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Messmittels',
      error: error.message
    });
  }
};

/**
 * POST /api/measuring-equipment
 * Create new measuring equipment
 */
exports.createEquipment = async (req, res) => {
  try {
    const {
      inventory_number,
      name,
      type_id,
      manufacturer,
      model,
      serial_number,
      measuring_range_min,
      measuring_range_max,
      resolution,
      accuracy,
      unit = 'mm',
      nominal_value,
      tolerance_class,
      calibration_interval_months,
      last_calibration_date,
      next_calibration_date,
      calibration_provider,
      status = 'active',
      storage_location_id,
      purchase_date,
      purchase_price,
      supplier_id,
      notes
    } = req.body;

    // Validation
    if (!inventory_number || !name || !type_id) {
      return res.status(400).json({
        success: false,
        message: 'Inventar-Nummer, Name und Typ sind erforderlich'
      });
    }

    // Get default calibration interval from type if not provided
    let interval = calibration_interval_months;
    if (!interval) {
      const typeResult = await pool.query(
        'SELECT default_calibration_interval_months FROM measuring_equipment_types WHERE id = $1',
        [type_id]
      );
      if (typeResult.rows.length > 0) {
        interval = typeResult.rows[0].default_calibration_interval_months;
      } else {
        interval = 12;
      }
    }

    // Calculate next_calibration_date if last_calibration_date is provided
    let nextCalDate = next_calibration_date;
    if (last_calibration_date && !nextCalDate) {
      const calcResult = await pool.query(
        `SELECT ($1::date + ($2 || ' months')::interval)::date as next_date`,
        [last_calibration_date, interval]
      );
      nextCalDate = calcResult.rows[0].next_date;
    }

    const result = await pool.query(`
      INSERT INTO measuring_equipment (
        inventory_number, name, type_id, manufacturer, model, serial_number,
        measuring_range_min, measuring_range_max, resolution, accuracy, unit,
        nominal_value, tolerance_class, calibration_interval_months,
        last_calibration_date, next_calibration_date, calibration_provider,
        status, storage_location_id, purchase_date, purchase_price, supplier_id,
        notes, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
      )
      RETURNING *
    `, [
      inventory_number, name, type_id, manufacturer, model, serial_number,
      measuring_range_min, measuring_range_max, resolution, accuracy, unit,
      nominal_value, tolerance_class, interval,
      last_calibration_date, nextCalDate, calibration_provider,
      status, storage_location_id, purchase_date, purchase_price, supplier_id,
      notes, req.user?.id
    ]);

    // Fetch with view for complete data
    const fullResult = await pool.query(`
      SELECT * FROM measuring_equipment_with_status WHERE id = $1
    `, [result.rows[0].id]);

    res.status(201).json({
      success: true,
      message: 'Messmittel erstellt',
      data: fullResult.rows[0]
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Ein Messmittel mit dieser Inventar-Nummer existiert bereits'
      });
    }
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Referenz (Typ, Lagerort oder Lieferant nicht gefunden)'
      });
    }
    console.error('Error creating measuring equipment:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Messmittels',
      error: error.message
    });
  }
};

/**
 * PUT /api/measuring-equipment/:id
 * Update measuring equipment
 */
exports.updateEquipment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      inventory_number,
      name,
      type_id,
      manufacturer,
      model,
      serial_number,
      measuring_range_min,
      measuring_range_max,
      resolution,
      accuracy,
      unit,
      nominal_value,
      tolerance_class,
      calibration_interval_months,
      calibration_provider,
      status,
      lock_reason,
      storage_location_id,
      purchase_date,
      purchase_price,
      supplier_id,
      notes,
      image_path
    } = req.body;

    const result = await pool.query(`
      UPDATE measuring_equipment SET
        inventory_number = COALESCE($1, inventory_number),
        name = COALESCE($2, name),
        type_id = COALESCE($3, type_id),
        manufacturer = COALESCE($4, manufacturer),
        model = COALESCE($5, model),
        serial_number = COALESCE($6, serial_number),
        measuring_range_min = COALESCE($7, measuring_range_min),
        measuring_range_max = COALESCE($8, measuring_range_max),
        resolution = COALESCE($9, resolution),
        accuracy = COALESCE($10, accuracy),
        unit = COALESCE($11, unit),
        nominal_value = COALESCE($12, nominal_value),
        tolerance_class = COALESCE($13, tolerance_class),
        calibration_interval_months = COALESCE($14, calibration_interval_months),
        calibration_provider = COALESCE($15, calibration_provider),
        status = COALESCE($16, status),
        lock_reason = $17,
        storage_location_id = COALESCE($18, storage_location_id),
        purchase_date = COALESCE($19, purchase_date),
        purchase_price = COALESCE($20, purchase_price),
        supplier_id = COALESCE($21, supplier_id),
        notes = COALESCE($22, notes),
        image_path = COALESCE($23, image_path),
        updated_by = $24,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $25 AND deleted_at IS NULL
      RETURNING *
    `, [
      inventory_number, name, type_id, manufacturer, model, serial_number,
      measuring_range_min, measuring_range_max, resolution, accuracy, unit,
      nominal_value, tolerance_class, calibration_interval_months,
      calibration_provider, status, lock_reason, storage_location_id,
      purchase_date, purchase_price, supplier_id, notes, image_path,
      req.user?.id, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Messmittel nicht gefunden'
      });
    }

    // Fetch with view for complete data
    const fullResult = await pool.query(`
      SELECT * FROM measuring_equipment_with_status WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      message: 'Messmittel aktualisiert',
      data: fullResult.rows[0]
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Ein Messmittel mit dieser Inventar-Nummer existiert bereits'
      });
    }
    console.error('Error updating measuring equipment:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Messmittels',
      error: error.message
    });
  }
};

/**
 * DELETE /api/measuring-equipment/:id
 * Soft delete measuring equipment
 */
exports.deleteEquipment = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE measuring_equipment SET
        deleted_at = CURRENT_TIMESTAMP,
        updated_by = $1
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING id, inventory_number, name
    `, [req.user?.id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Messmittel nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Messmittel gelöscht',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error deleting measuring equipment:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Messmittels',
      error: error.message
    });
  }
};

/**
 * PATCH /api/measuring-equipment/:id/status
 * Quick status update (lock/unlock/send to calibration)
 */
exports.updateEquipmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, lock_reason } = req.body;

    const validStatuses = ['active', 'locked', 'in_calibration', 'repair', 'retired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Ungültiger Status. Erlaubt: ${validStatuses.join(', ')}`
      });
    }

    const result = await pool.query(`
      UPDATE measuring_equipment SET
        status = $1,
        lock_reason = $2,
        updated_by = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND deleted_at IS NULL
      RETURNING *
    `, [status, lock_reason, req.user?.id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Messmittel nicht gefunden'
      });
    }

    // Fetch with view
    const fullResult = await pool.query(`
      SELECT * FROM measuring_equipment_with_status WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      message: `Status auf "${status}" geändert`,
      data: fullResult.rows[0]
    });

  } catch (error) {
    console.error('Error updating equipment status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Status',
      error: error.message
    });
  }
};

/**
 * Generate next inventory number
 * Format: MM-YYYY-NNN
 */
exports.getNextInventoryNumber = async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const prefix = `MM-${year}-`;

    const result = await pool.query(`
      SELECT inventory_number FROM measuring_equipment
      WHERE inventory_number LIKE $1
      ORDER BY inventory_number DESC
      LIMIT 1
    `, [prefix + '%']);

    let nextNumber = 1;
    if (result.rows.length > 0) {
      const lastNumber = result.rows[0].inventory_number;
      const match = lastNumber.match(/MM-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const nextInventoryNumber = `${prefix}${nextNumber.toString().padStart(3, '0')}`;

    res.json({
      success: true,
      data: { next_inventory_number: nextInventoryNumber }
    });

  } catch (error) {
    console.error('Error generating inventory number:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren der Inventar-Nummer',
      error: error.message
    });
  }
};
