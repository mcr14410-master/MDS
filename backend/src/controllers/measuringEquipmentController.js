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
      is_active = true,
      field_category = 'measuring_instrument'
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name ist erforderlich'
      });
    }

    const result = await pool.query(`
      INSERT INTO measuring_equipment_types 
        (name, description, icon, default_calibration_interval_months, sort_order, is_active, field_category)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name, description, icon, default_calibration_interval_months, sort_order, is_active, field_category]);

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
      is_active,
      field_category
    } = req.body;

    const result = await pool.query(`
      UPDATE measuring_equipment_types SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        icon = COALESCE($3, icon),
        default_calibration_interval_months = COALESCE($4, default_calibration_interval_months),
        sort_order = COALESCE($5, sort_order),
        is_active = COALESCE($6, is_active),
        field_category = COALESCE($7, field_category),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [name, description, icon, default_calibration_interval_months, sort_order, is_active, field_category, id]);

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
      checkout_status, // NEU: 'checked_out', 'available', oder leer
      search,
      sort_by = 'inventory_number',
      sort_order = 'asc'
    } = req.query;

    let queryText = `
      SELECT 
        me.*,
        -- Aktive Entnahme
        c.id as checkout_id,
        c.checked_out_at,
        c.checked_out_by,
        c.purpose as checkout_purpose,
        c.work_order_number as checkout_work_order,
        c.expected_return_date,
        u.username as checked_out_by_name,
        -- Lagerort aus Storage-System
        si.compartment_id,
        sc.name as compartment_name,
        sc.code as compartment_code,
        sl.name as location_name,
        sl.code as location_code
      FROM measuring_equipment_with_status me
      LEFT JOIN measuring_equipment_checkouts c 
        ON me.id = c.equipment_id AND c.returned_at IS NULL
      LEFT JOIN users u ON c.checked_out_by = u.id
      LEFT JOIN storage_items si ON si.measuring_equipment_id = me.id 
        AND si.is_deleted = false AND si.is_active = true
      LEFT JOIN storage_compartments sc ON sc.id = si.compartment_id
      LEFT JOIN storage_locations sl ON sl.id = sc.location_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    // Filters
    if (type_id) {
      queryText += ` AND me.type_id = $${paramCount}`;
      params.push(type_id);
      paramCount++;
    }

    if (status) {
      queryText += ` AND me.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (calibration_status) {
      queryText += ` AND me.calibration_status = $${paramCount}`;
      params.push(calibration_status);
      paramCount++;
    }

    if (storage_location_id) {
      queryText += ` AND me.storage_location_id = $${paramCount}`;
      params.push(storage_location_id);
      paramCount++;
    }

    // NEU: Checkout-Filter
    if (checkout_status === 'checked_out') {
      queryText += ` AND c.id IS NOT NULL`;
    } else if (checkout_status === 'available') {
      queryText += ` AND c.id IS NULL`;
    }

    if (search) {
      queryText += ` AND (
        me.inventory_number ILIKE $${paramCount} OR 
        me.name ILIKE $${paramCount} OR 
        me.manufacturer ILIKE $${paramCount} OR
        me.serial_number ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Sorting
    const validSortFields = [
      'inventory_number', 'name', 'type_name', 'manufacturer', 
      'status', 'next_calibration_date', 'created_at'
    ];
    const sortField = validSortFields.includes(sort_by) ? `me.${sort_by}` : 'me.inventory_number';
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

    // Aktive Entnahmen zählen
    const checkoutResult = await pool.query(`
      SELECT COUNT(*) as checked_out_count
      FROM measuring_equipment_checkouts
      WHERE returned_at IS NULL
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
        counts: {
          ...result.rows[0],
          checked_out_count: parseInt(checkoutResult.rows[0].checked_out_count)
        },
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
      // Neue Felder
      thread_standard,
      thread_size,
      thread_pitch,
      accuracy_class,
      // Ende neue Felder
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
        nominal_value, tolerance_class,
        thread_standard, thread_size, thread_pitch, accuracy_class,
        calibration_interval_months,
        last_calibration_date, next_calibration_date, calibration_provider,
        status, storage_location_id, purchase_date, purchase_price, supplier_id,
        notes, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
      )
      RETURNING *
    `, [
      inventory_number, name, type_id, manufacturer, model, serial_number,
      measuring_range_min, measuring_range_max, resolution, accuracy, unit,
      nominal_value, tolerance_class,
      thread_standard, thread_size, thread_pitch, accuracy_class,
      interval,
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
      // Neue Felder
      thread_standard,
      thread_size,
      thread_pitch,
      accuracy_class,
      // Ende neue Felder
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
        thread_standard = COALESCE($14, thread_standard),
        thread_size = COALESCE($15, thread_size),
        thread_pitch = COALESCE($16, thread_pitch),
        accuracy_class = COALESCE($17, accuracy_class),
        calibration_interval_months = COALESCE($18, calibration_interval_months),
        calibration_provider = COALESCE($19, calibration_provider),
        status = COALESCE($20, status),
        lock_reason = $21,
        storage_location_id = COALESCE($22, storage_location_id),
        purchase_date = COALESCE($23, purchase_date),
        purchase_price = COALESCE($24, purchase_price),
        supplier_id = COALESCE($25, supplier_id),
        notes = COALESCE($26, notes),
        image_path = COALESCE($27, image_path),
        updated_by = $28,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $29 AND deleted_at IS NULL
      RETURNING *
    `, [
      inventory_number, name, type_id, manufacturer, model, serial_number,
      measuring_range_min, measuring_range_max, resolution, accuracy, unit,
      nominal_value, tolerance_class,
      thread_standard, thread_size, thread_pitch, accuracy_class,
      calibration_interval_months,
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
    const prefix = 'MM-';
    const startNumber = 1000;

    const result = await pool.query(`
      SELECT inventory_number FROM measuring_equipment
      WHERE inventory_number ~ '^MM-[0-9]+$'
      ORDER BY CAST(SUBSTRING(inventory_number FROM 4) AS INTEGER) DESC
      LIMIT 1
    `);

    let nextNumber = startNumber;
    if (result.rows.length > 0) {
      const lastNumber = result.rows[0].inventory_number;
      const match = lastNumber.match(/^MM-(\d+)$/);
      if (match) {
        const lastNum = parseInt(match[1]);
        nextNumber = Math.max(lastNum + 1, startNumber);
      }
    }

    const nextInventoryNumber = `${prefix}${nextNumber}`;

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

// ============================================================================
// CHECKOUTS (Entnahme-System)
// ============================================================================

/**
 * POST /api/measuring-equipment/:id/checkout
 * Messmittel entnehmen
 */
exports.checkoutEquipment = async (req, res) => {
  try {
    const { id } = req.params;
    const { purpose, work_order_number, expected_return_date } = req.body;

    // Prüfen ob Messmittel existiert und entnehmbar ist
    const equipment = await pool.query(`
      SELECT 
        me.*,
        CASE 
          WHEN me.next_calibration_date < CURRENT_DATE THEN 'overdue'
          WHEN me.next_calibration_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
          ELSE 'valid'
        END as calibration_status
      FROM measuring_equipment me
      WHERE me.id = $1 AND me.deleted_at IS NULL
    `, [id]);

    if (equipment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Messmittel nicht gefunden'
      });
    }

    const eq = equipment.rows[0];

    // Prüfungen für Entnahme
    if (eq.status === 'locked') {
      return res.status(400).json({
        success: false,
        message: `Messmittel ist gesperrt: ${eq.lock_reason || 'Kein Grund angegeben'}`
      });
    }

    if (eq.status === 'retired') {
      return res.status(400).json({
        success: false,
        message: 'Messmittel ist ausgemustert und kann nicht entnommen werden'
      });
    }

    if (eq.status === 'in_calibration') {
      return res.status(400).json({
        success: false,
        message: 'Messmittel ist in Kalibrierung und kann nicht entnommen werden'
      });
    }

    if (eq.calibration_status === 'overdue') {
      return res.status(400).json({
        success: false,
        message: 'Messmittel hat überfällige Kalibrierung und kann nicht entnommen werden'
      });
    }

    // Prüfen ob bereits ausgeliehen
    const activeCheckout = await pool.query(`
      SELECT c.*, u.username as checked_out_by_name
      FROM measuring_equipment_checkouts c
      JOIN users u ON c.checked_out_by = u.id
      WHERE c.equipment_id = $1 AND c.returned_at IS NULL
    `, [id]);

    if (activeCheckout.rows.length > 0) {
      const checkout = activeCheckout.rows[0];
      return res.status(400).json({
        success: false,
        message: `Messmittel ist bereits ausgeliehen an ${checkout.checked_out_by_name} seit ${new Date(checkout.checked_out_at).toLocaleDateString('de-DE')}`
      });
    }

    // Entnahme erstellen
    const result = await pool.query(`
      INSERT INTO measuring_equipment_checkouts (
        equipment_id, checked_out_by, purpose, work_order_number, expected_return_date
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, req.user?.id, purpose, work_order_number, expected_return_date]);

    // Mit User-Info zurückgeben
    const fullResult = await pool.query(`
      SELECT 
        c.*,
        u.username as checked_out_by_name
      FROM measuring_equipment_checkouts c
      JOIN users u ON c.checked_out_by = u.id
      WHERE c.id = $1
    `, [result.rows[0].id]);

    res.status(201).json({
      success: true,
      message: 'Messmittel entnommen',
      data: fullResult.rows[0]
    });

  } catch (error) {
    console.error('Error checking out equipment:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Entnahme',
      error: error.message
    });
  }
};

/**
 * POST /api/measuring-equipment/:id/return
 * Messmittel zurückgeben
 */
exports.returnEquipment = async (req, res) => {
  try {
    const { id } = req.params;
    const { return_condition = 'ok', return_notes } = req.body;

    // Aktive Entnahme finden
    const activeCheckout = await pool.query(`
      SELECT * FROM measuring_equipment_checkouts
      WHERE equipment_id = $1 AND returned_at IS NULL
    `, [id]);

    if (activeCheckout.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Messmittel ist nicht ausgeliehen'
      });
    }

    // Rückgabe erfassen
    const result = await pool.query(`
      UPDATE measuring_equipment_checkouts SET
        returned_at = CURRENT_TIMESTAMP,
        returned_by = $1,
        return_condition = $2,
        return_notes = $3
      WHERE id = $4
      RETURNING *
    `, [req.user?.id, return_condition, return_notes, activeCheckout.rows[0].id]);

    // Bei Beschädigung oder Kalibrierungsbedarf: Status setzen
    if (return_condition === 'damaged') {
      await pool.query(`
        UPDATE measuring_equipment SET
          status = 'locked',
          lock_reason = 'Beschädigt bei Rückgabe',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [id]);
    } else if (return_condition === 'needs_calibration') {
      await pool.query(`
        UPDATE measuring_equipment SET
          status = 'in_calibration',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [id]);
    }

    // Mit User-Info zurückgeben
    const fullResult = await pool.query(`
      SELECT 
        c.*,
        u1.username as checked_out_by_name,
        u2.username as returned_by_name
      FROM measuring_equipment_checkouts c
      JOIN users u1 ON c.checked_out_by = u1.id
      LEFT JOIN users u2 ON c.returned_by = u2.id
      WHERE c.id = $1
    `, [result.rows[0].id]);

    res.json({
      success: true,
      message: 'Messmittel zurückgegeben',
      data: fullResult.rows[0]
    });

  } catch (error) {
    console.error('Error returning equipment:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Rückgabe',
      error: error.message
    });
  }
};

/**
 * GET /api/measuring-equipment/:id/checkouts
 * Entnahme-Historie für ein Messmittel
 */
exports.getEquipmentCheckouts = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        c.*,
        u1.username as checked_out_by_name,
        u2.username as returned_by_name
      FROM measuring_equipment_checkouts c
      JOIN users u1 ON c.checked_out_by = u1.id
      LEFT JOIN users u2 ON c.returned_by = u2.id
      WHERE c.equipment_id = $1
      ORDER BY c.checked_out_at DESC
    `, [id]);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Error getting equipment checkouts:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Entnahme-Historie',
      error: error.message
    });
  }
};

/**
 * GET /api/measuring-equipment/checkouts/active
 * Alle aktiven Entnahmen (systemweit)
 */
exports.getActiveCheckouts = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        me.inventory_number,
        me.name as equipment_name,
        met.name as equipment_type,
        u1.username as checked_out_by_name,
        sl.name as storage_location_name
      FROM measuring_equipment_checkouts c
      JOIN measuring_equipment me ON c.equipment_id = me.id
      LEFT JOIN measuring_equipment_types met ON me.type_id = met.id
      JOIN users u1 ON c.checked_out_by = u1.id
      LEFT JOIN storage_locations sl ON me.storage_location_id = sl.id
      WHERE c.returned_at IS NULL
      ORDER BY c.checked_out_at DESC
    `);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Error getting active checkouts:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der aktiven Entnahmen',
      error: error.message
    });
  }
};

/**
 * GET /api/measuring-equipment/:id/availability
 * Prüft ob Messmittel entnehmbar ist
 */
exports.checkAvailability = async (req, res) => {
  try {
    const { id } = req.params;

    const equipment = await pool.query(`
      SELECT 
        me.*,
        met.name as type_name,
        CASE 
          WHEN me.next_calibration_date < CURRENT_DATE THEN 'overdue'
          WHEN me.next_calibration_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
          ELSE 'valid'
        END as calibration_status
      FROM measuring_equipment me
      LEFT JOIN measuring_equipment_types met ON me.type_id = met.id
      WHERE me.id = $1 AND me.deleted_at IS NULL
    `, [id]);

    if (equipment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Messmittel nicht gefunden'
      });
    }

    const eq = equipment.rows[0];

    // Aktive Entnahme prüfen
    const activeCheckout = await pool.query(`
      SELECT c.*, u.username as checked_out_by_name
      FROM measuring_equipment_checkouts c
      JOIN users u ON c.checked_out_by = u.id
      WHERE c.equipment_id = $1 AND c.returned_at IS NULL
    `, [id]);

    const isCheckedOut = activeCheckout.rows.length > 0;
    const checkout = isCheckedOut ? activeCheckout.rows[0] : null;

    // Verfügbarkeit bestimmen
    let available = true;
    let reason = null;

    if (eq.status === 'locked') {
      available = false;
      reason = `Gesperrt: ${eq.lock_reason || 'Kein Grund angegeben'}`;
    } else if (eq.status === 'retired') {
      available = false;
      reason = 'Ausgemustert';
    } else if (eq.status === 'in_calibration') {
      available = false;
      reason = 'In Kalibrierung';
    } else if (eq.calibration_status === 'overdue') {
      available = false;
      reason = 'Kalibrierung überfällig';
    } else if (isCheckedOut) {
      available = false;
      reason = `Ausgeliehen an ${checkout.checked_out_by_name}`;
    }

    res.json({
      success: true,
      data: {
        equipment_id: eq.id,
        inventory_number: eq.inventory_number,
        name: eq.name,
        available,
        reason,
        status: eq.status,
        calibration_status: eq.calibration_status,
        current_checkout: checkout
      }
    });

  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Verfügbarkeitsprüfung',
      error: error.message
    });
  }
};
