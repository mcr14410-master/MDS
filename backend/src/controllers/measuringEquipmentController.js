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
 * - GET    /api/measuring-equipment/:id/label    - Generate label PDF
 */

const pool = require('../config/db');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

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
        COUNT(*) FILTER (WHERE calibration_status = 'unknown') as unknown_count,
        COUNT(*) as total_count
      FROM measuring_equipment_with_status
    `);

    // Aktive Entnahmen zählen
    const checkoutResult = await pool.query(`
      SELECT COUNT(*) as checked_out_count
      FROM measuring_equipment_checkouts
      WHERE returned_at IS NULL
    `);

    // Equipment due in next 30 days + unknown (keine Kalibrierung)
    const upcomingResult = await pool.query(`
      SELECT 
        id, inventory_number, name, type_name, 
        next_calibration_date, days_until_calibration, calibration_status
      FROM measuring_equipment_with_status
      WHERE calibration_status IN ('due_soon', 'overdue', 'unknown')
      ORDER BY 
        CASE calibration_status 
          WHEN 'overdue' THEN 1 
          WHEN 'due_soon' THEN 2 
          WHEN 'unknown' THEN 3 
        END,
        next_calibration_date ASC NULLS LAST
      LIMIT 15
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

    // Equipment mit User-Namen und Lagerort-Codes
    const result = await pool.query(`
      SELECT 
        mews.*,
        uc.username as created_by_name,
        uu.username as updated_by_name,
        sc.code as compartment_code,
        sl.code as location_code
      FROM measuring_equipment_with_status mews
      LEFT JOIN users uc ON mews.created_by = uc.id
      LEFT JOIN users uu ON mews.updated_by = uu.id
      LEFT JOIN storage_items si ON si.measuring_equipment_id = mews.id 
        AND si.is_deleted = false AND si.is_active = true
      LEFT JOIN storage_compartments sc ON sc.id = si.compartment_id
      LEFT JOIN storage_locations sl ON sl.id = sc.location_id
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
        manufacturer = $4,
        model = $5,
        serial_number = $6,
        measuring_range_min = $7,
        measuring_range_max = $8,
        resolution = $9,
        accuracy = $10,
        unit = COALESCE($11, unit),
        nominal_value = $12,
        tolerance_class = $13,
        thread_standard = $14,
        thread_size = $15,
        thread_pitch = $16,
        accuracy_class = $17,
        calibration_interval_months = $18,
        calibration_provider = $19,
        status = COALESCE($20, status),
        lock_reason = $21,
        storage_location_id = $22,
        purchase_date = $23,
        purchase_price = $24,
        supplier_id = $25,
        notes = $26,
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
 * POST /api/measuring-equipment/bulk-status
 * Bulk update status for multiple equipment IDs in a single transaction.
 * Body: { ids: number[], status: string, lock_reason?: string }
 */
exports.bulkUpdateStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    const { ids, status, lock_reason = null } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keine Messmittel ausgewählt (ids fehlen oder leer)'
      });
    }

    const validStatuses = ['active', 'locked', 'in_calibration', 'repair', 'retired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Ungültiger Status. Erlaubt: ${validStatuses.join(', ')}`
      });
    }

    await client.query('BEGIN');

    const result = await client.query(`
      UPDATE measuring_equipment SET
        status = $1,
        lock_reason = $2,
        updated_by = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($4::int[]) AND deleted_at IS NULL
      RETURNING id
    `, [status, lock_reason, req.user?.id, ids]);

    await client.query('COMMIT');

    // Fetch updated rows with full view
    const fullResult = await pool.query(`
      SELECT * FROM measuring_equipment_with_status WHERE id = ANY($1::int[])
    `, [result.rows.map(r => r.id)]);

    res.json({
      success: true,
      message: `${result.rowCount} Messmittel auf Status "${status}" geändert`,
      updated_count: result.rowCount,
      data: fullResult.rows
    });

  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error bulk updating equipment status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Status',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * POST /api/measuring-equipment/calibration-report
 * Generate PDF "Kalibrier-Laufzettel" for a list of selected equipment IDs.
 * Body: { ids: number[] }
 */
exports.generateCalibrationReport = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keine Messmittel ausgewählt'
      });
    }

    const result = await pool.query(`
      SELECT me.*,
        (SELECT MAX(calibration_date) FROM calibrations
          WHERE equipment_id = me.id) as last_calibration_date
      FROM measuring_equipment_with_status me
      WHERE me.id = ANY($1::int[]) AND me.deleted_at IS NULL
      ORDER BY me.inventory_number ASC
    `, [ids]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Keine passenden Messmittel gefunden'
      });
    }

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('de-DE') : '-';
    const formatDateTime = (d) => d ? new Date(d).toLocaleString('de-DE') : '-';

    const creator = req.user?.full_name || req.user?.username || '-';

    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Kalibrier-Laufzettel_${new Date().toISOString().slice(0, 10)}.pdf`);
    doc.pipe(res);

    // Page geometry (A4: 595 x 842 pt, margin 40 → usable 515 x 762)
    const PAGE_LEFT = 40;
    const PAGE_RIGHT = 555;
    const PAGE_WIDTH = PAGE_RIGHT - PAGE_LEFT; // 515

    // Column layout
    const COLS = [
      { key: 'pos',           label: 'Pos.',          x: 40,  w: 28 },
      { key: 'inv',           label: 'Inventar-Nr.',  x: 68,  w: 70 },
      { key: 'name',          label: 'Bezeichnung',   x: 138, w: 115 },
      { key: 'type',          label: 'Typ',           x: 253, w: 70 },
      { key: 'manufacturer',  label: 'Hersteller',    x: 323, w: 70 },
      { key: 'serial',        label: 'Serien-Nr.',    x: 393, w: 60 },
      { key: 'last_cal',      label: 'Letzte Kal.',   x: 453, w: 48 },
      { key: 'done',          label: 'OK',            x: 501, w: 54 },
    ];
    const ROW_HEIGHT = 28;

    let pageNum = 1;

    const drawHeader = () => {
      // Title
      doc.fontSize(16).font('Helvetica-Bold')
         .fillColor('#000000')
         .text('Kalibrier-Laufzettel', PAGE_LEFT, 40);

      // Meta block
      doc.fontSize(9).font('Helvetica');
      doc.text(`Erstellt am: ${formatDateTime(new Date())}`, PAGE_LEFT, 65);
      doc.text(`Ersteller: ${creator}`, PAGE_LEFT, 78);
      doc.text(`Anzahl Messmittel: ${result.rows.length}`, PAGE_LEFT, 91);

      // Separator
      doc.moveTo(PAGE_LEFT, 108).lineTo(PAGE_RIGHT, 108).lineWidth(0.8).stroke();
    };

    const drawTableHeader = (y) => {
      doc.rect(PAGE_LEFT, y, PAGE_WIDTH, 18).fillColor('#f3f4f6').fill();
      doc.fillColor('#000000').fontSize(8).font('Helvetica-Bold');
      for (const col of COLS) {
        doc.text(col.label, col.x + 2, y + 5, { width: col.w - 4, align: 'left' });
      }
      // Borders
      doc.lineWidth(0.5).strokeColor('#000000');
      doc.rect(PAGE_LEFT, y, PAGE_WIDTH, 18).stroke();
      return y + 18;
    };

    const drawFooter = () => {
      const savedY = doc.y;
      doc.fontSize(7).font('Helvetica').fillColor('#000000');
      doc.text(`Seite ${pageNum}  –  MDS Manufacturing Data System`, PAGE_LEFT, 780, {
        align: 'center', width: PAGE_WIDTH, lineBreak: false
      });
      doc.y = savedY;
    };

    const drawSignatureBlock = (y) => {
      const boxY = y + 20;
      const colW = (PAGE_WIDTH - 20) / 2;

      // Ausgabe
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000')
         .text('Ausgabe an Kalibrierdienst', PAGE_LEFT, boxY);
      doc.moveTo(PAGE_LEFT, boxY + 30).lineTo(PAGE_LEFT + colW, boxY + 30).lineWidth(0.5).stroke();
      doc.fontSize(7).font('Helvetica')
         .text('Datum, Unterschrift', PAGE_LEFT, boxY + 33);

      // Rückgabe
      const rX = PAGE_LEFT + colW + 20;
      doc.fontSize(9).font('Helvetica-Bold')
         .text('Rückgabe / Eingangsprüfung', rX, boxY);
      doc.moveTo(rX, boxY + 30).lineTo(rX + colW, boxY + 30).stroke();
      doc.fontSize(7).font('Helvetica')
         .text('Datum, Unterschrift', rX, boxY + 33);
    };

    // Start first page
    drawHeader();
    let y = 120;
    y = drawTableHeader(y);

    const MAX_Y = 690; // leave room for signature block + footer

    doc.fontSize(8).font('Helvetica').fillColor('#000000');

    result.rows.forEach((eq, idx) => {
      // Need new page?
      if (y + ROW_HEIGHT > MAX_Y) {
        drawFooter();
        doc.addPage();
        pageNum++;
        drawHeader();
        y = 120;
        y = drawTableHeader(y);
        doc.fontSize(8).font('Helvetica').fillColor('#000000');
      }

      // Alternate row background
      if (idx % 2 === 1) {
        doc.rect(PAGE_LEFT, y, PAGE_WIDTH, ROW_HEIGHT).fillColor('#fafafa').fill();
        doc.fillColor('#000000');
      }

      const values = {
        pos: String(idx + 1),
        inv: eq.inventory_number || '-',
        name: eq.name || '-',
        type: eq.type_name || '-',
        manufacturer: eq.manufacturer || '-',
        serial: eq.serial_number || '-',
        last_cal: formatDate(eq.last_calibration_date),
        done: '', // leeres Häkchenfeld
      };

      for (const col of COLS) {
        doc.fontSize(8).font('Helvetica').fillColor('#000000');
        doc.text(values[col.key] || '', col.x + 2, y + 4, {
          width: col.w - 4,
          height: ROW_HEIGHT - 8,
          ellipsis: true,
          lineBreak: true
        });
      }

      // Checkbox in "OK" column
      const cbSize = 10;
      const cbCol = COLS[COLS.length - 1];
      const cbX = cbCol.x + 6;
      const cbY = y + 8;
      doc.lineWidth(0.6).rect(cbX, cbY, cbSize, cbSize).stroke();

      // Row separator
      doc.lineWidth(0.3).strokeColor('#cccccc')
         .moveTo(PAGE_LEFT, y + ROW_HEIGHT).lineTo(PAGE_RIGHT, y + ROW_HEIGHT).stroke();
      doc.strokeColor('#000000');

      y += ROW_HEIGHT;
    });

    // Table outer border
    doc.lineWidth(0.5).rect(PAGE_LEFT, 120, PAGE_WIDTH, y - 120).stroke();

    // Vertical column separators (over last table region only — simple approach: redraw over full last region)
    // (skipped to keep it simple; horizontal separation + header bg is enough visual structure)

    // Signature block + footer on last page
    drawSignatureBlock(y);
    drawFooter();

    doc.end();

  } catch (error) {
    console.error('Error generating calibration report:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Kalibrier-Laufzettels',
      error: error.message
    });
  }
};

/**
 * POST /api/measuring-equipment/datasheets
 * Generate PDF "Messmittel-Datenblätter" for a list of selected equipment IDs.
 * Body: { ids: number[], layout?: 'full' | 'compact' }
 *   - 'full':    1 Messmittel pro Seite (ausführlich)
 *   - 'compact': 4 Messmittel pro Seite (2x2 Raster)
 */
exports.generateDataSheets = async (req, res) => {
  try {
    const { ids, layout = 'full' } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keine Messmittel ausgewählt'
      });
    }

    if (!['full', 'compact'].includes(layout)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiges Layout (erlaubt: full, compact)'
      });
    }

    const result = await pool.query(`
      SELECT me.*,
        (SELECT MAX(calibration_date) FROM calibrations
          WHERE equipment_id = me.id) as last_calibration_date,
        sl.name as location_name_full,
        sc.name as compartment_name_full
      FROM measuring_equipment_with_status me
      LEFT JOIN storage_items si ON si.measuring_equipment_id = me.id
        AND si.is_deleted = false AND si.is_active = true
      LEFT JOIN storage_compartments sc ON sc.id = si.compartment_id
      LEFT JOIN storage_locations sl ON sl.id = sc.location_id
      WHERE me.id = ANY($1::int[]) AND me.deleted_at IS NULL
      ORDER BY me.inventory_number ASC
    `, [ids]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Keine passenden Messmittel gefunden'
      });
    }

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('de-DE') : '-';
    const formatDateTime = (d) => d ? new Date(d).toLocaleString('de-DE') : '-';

    const statusTextMap = {
      ok: 'OK',
      due_soon: 'Fällig (≤30 Tage)',
      overdue: 'Überfällig',
      locked: 'Gesperrt',
      in_calibration: 'In Kalibrierung',
      repair: 'In Reparatur',
      retired: 'Ausgemustert',
      active: 'Aktiv',
      unknown: 'Unbekannt'
    };
    const statusText = (s) => statusTextMap[s] || s || '-';

    const getSpec = (eq) => {
      const num = (v) => v !== null && v !== undefined ? parseFloat(v).toString() : null;
      switch (eq.type_field_category) {
        case 'measuring_instrument':
          if (eq.measuring_range_min !== null && eq.measuring_range_max !== null)
            return `${num(eq.measuring_range_min)}-${num(eq.measuring_range_max)} ${eq.unit || 'mm'}`;
          break;
        case 'gauge':
          if (eq.nominal_value)
            return `Ø${num(eq.nominal_value)} ${eq.tolerance_class || ''}`.trim();
          break;
        case 'thread_gauge':
          if (eq.thread_size) {
            const parts = [eq.thread_standard || '', eq.thread_size || ''].filter(Boolean).join('');
            const pitch = eq.thread_pitch ? `x${eq.thread_pitch}` : '';
            const tol = eq.tolerance_class ? ` ${eq.tolerance_class}` : '';
            return `${parts}${pitch}${tol}`.trim();
          }
          break;
        case 'gauge_block':
          if (eq.nominal_value) {
            const klass = eq.accuracy_class ? ` Kl.${eq.accuracy_class}` : '';
            return `${num(eq.nominal_value)} ${eq.unit || 'mm'}${klass}`;
          }
          break;
        case 'angle_gauge':
          if (eq.nominal_value) {
            const tol = eq.tolerance_class ? ` ${eq.tolerance_class}` : '';
            return `${num(eq.nominal_value)}°${tol}`;
          }
          break;
        case 'surface_tester':
          if (eq.measuring_range_min !== null && eq.measuring_range_max !== null)
            return `${num(eq.measuring_range_min)}-${num(eq.measuring_range_max)} µm`;
          break;
      }
      return '-';
    };

    const getLocation = (eq) => {
      const loc = eq.location_name_full || '';
      const comp = eq.compartment_name_full || '';
      if (loc && comp) return `${loc} / ${comp}`;
      return loc || '-';
    };

    const creator = req.user?.full_name || req.user?.username || '-';

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Messmittel-Datenblaetter_${layout}_${new Date().toISOString().slice(0, 10)}.pdf`
    );
    doc.pipe(res);

    const PAGE_LEFT = 40;
    const PAGE_RIGHT = 555;
    const PAGE_WIDTH = PAGE_RIGHT - PAGE_LEFT;

    const drawFooter = (pageNum) => {
      const savedY = doc.y;
      doc.fontSize(7).font('Helvetica').fillColor('#000000');
      doc.text(
        `Seite ${pageNum}  –  Erstellt: ${formatDateTime(new Date())}  –  Ersteller: ${creator}  –  MDS`,
        PAGE_LEFT, 790,
        { align: 'center', width: PAGE_WIDTH, lineBreak: false }
      );
      doc.y = savedY;
    };

    // ----------------------------------------------------------------
    // LAYOUT 'full': 1 Messmittel pro Seite
    // ----------------------------------------------------------------
    const renderFullCard = (eq, origin = { x: PAGE_LEFT, y: 50, w: PAGE_WIDTH, h: 730 }) => {
      const { x, y, w } = origin;

      // Header stripe
      doc.rect(x, y, w, 40).fillColor('#1e40af').fill();
      doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold')
         .text('MESSMITTEL-DATENBLATT', x + 10, y + 8);
      doc.fontSize(18).font('Helvetica-Bold')
         .text(eq.inventory_number || '-', x + 10, y + 20, { width: w - 20 });

      // Name row
      doc.fillColor('#000000').fontSize(13).font('Helvetica-Bold')
         .text(eq.name || '-', x + 10, y + 52, { width: w - 20 });
      doc.fontSize(10).font('Helvetica').fillColor('#666666')
         .text(eq.type_name || '-', x + 10, y + 72, { width: w - 20 });

      doc.moveTo(x, y + 92).lineTo(x + w, y + 92).lineWidth(0.5).strokeColor('#cccccc').stroke();

      // Data grid (2 columns)
      const col1X = x + 10;
      const col2X = x + w / 2 + 5;
      const colW = w / 2 - 15;
      let rowY = y + 104;
      const rowH = 22;

      const field = (label, value, fx, fy) => {
        doc.fontSize(7).font('Helvetica').fillColor('#888888')
           .text(label.toUpperCase(), fx, fy, { width: colW });
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000')
           .text(value || '-', fx, fy + 9, { width: colW, ellipsis: true, lineBreak: false });
      };

      // Row 1: Typ | Status
      field('Typ', eq.type_name, col1X, rowY);
      field('Status', statusText(eq.calibration_status), col2X, rowY);
      rowY += rowH;

      // Row 2: Hersteller | Modell
      field('Hersteller', eq.manufacturer, col1X, rowY);
      field('Modell', eq.model, col2X, rowY);
      rowY += rowH;

      // Row 3: Serien-Nr. | Kaufdatum
      field('Serien-Nr.', eq.serial_number, col1X, rowY);
      field('Kaufdatum', formatDate(eq.purchase_date), col2X, rowY);
      rowY += rowH;

      // Row 4: Spezifikation | Einheit
      field('Spezifikation', getSpec(eq), col1X, rowY);
      field('Einheit', eq.unit, col2X, rowY);
      rowY += rowH;

      // Row 5: Lagerort | Kal.-Intervall
      field('Lagerort', getLocation(eq), col1X, rowY);
      const interval = eq.calibration_interval_months
        ? `${eq.calibration_interval_months} Monate`
        : '-';
      field('Kal.-Intervall', interval, col2X, rowY);
      rowY += rowH;

      // Row 6: Letzte Kal. | Nächste Kal.
      field('Letzte Kalibrierung', formatDate(eq.last_calibration_date), col1X, rowY);
      field('Nächste Kalibrierung', formatDate(eq.next_calibration_date), col2X, rowY);
      rowY += rowH;

      // Separator
      doc.moveTo(x, rowY + 5).lineTo(x + w, rowY + 5).lineWidth(0.5).strokeColor('#cccccc').stroke();
      rowY += 15;

      // Notes
      if (eq.notes) {
        doc.fontSize(7).font('Helvetica').fillColor('#888888')
           .text('BEMERKUNGEN', x + 10, rowY);
        doc.fontSize(9).font('Helvetica').fillColor('#000000')
           .text(eq.notes, x + 10, rowY + 10, { width: w - 20, height: 100 });
      }
    };

    // ----------------------------------------------------------------
    // LAYOUT 'compact': 4 Messmittel pro Seite (2x2 Raster)
    // ----------------------------------------------------------------
    const renderCompactCard = (eq, origin) => {
      const { x, y, w, h } = origin;

      // Border
      doc.lineWidth(0.5).strokeColor('#999999').rect(x, y, w, h).stroke();

      // Header stripe
      doc.rect(x, y, w, 26).fillColor('#1e40af').fill();
      doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold')
         .text(eq.inventory_number || '-', x + 8, y + 8, { width: w - 16, lineBreak: false });

      // Status badge (right side of header)
      const statusLabel = statusText(eq.calibration_status);
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff')
         .text(statusLabel, x + w - 110, y + 9, { width: 100, align: 'right', lineBreak: false });

      // Name + Typ
      doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold')
         .text(eq.name || '-', x + 8, y + 32, { width: w - 16, ellipsis: true, lineBreak: false });
      doc.fontSize(8).font('Helvetica').fillColor('#666666')
         .text(eq.type_name || '-', x + 8, y + 48, { width: w - 16, ellipsis: true, lineBreak: false });

      doc.moveTo(x + 8, y + 62).lineTo(x + w - 8, y + 62).lineWidth(0.4).strokeColor('#cccccc').stroke();

      // Fields (2 columns, compact)
      const col1X = x + 8;
      const col2X = x + w / 2 + 4;
      const colW = w / 2 - 12;
      let rowY = y + 70;
      const rowH = 20;

      const field = (label, value, fx, fy) => {
        doc.fontSize(6.5).font('Helvetica').fillColor('#888888')
           .text(label.toUpperCase(), fx, fy, { width: colW, lineBreak: false });
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000000')
           .text(value || '-', fx, fy + 8, { width: colW, ellipsis: true, lineBreak: false });
      };

      field('Hersteller', eq.manufacturer, col1X, rowY);
      field('Serien-Nr.', eq.serial_number, col2X, rowY);
      rowY += rowH;

      field('Spezifikation', getSpec(eq), col1X, rowY);
      field('Modell', eq.model, col2X, rowY);
      rowY += rowH;

      field('Lagerort', getLocation(eq), col1X, rowY);
      field('Letzte Kal.', formatDate(eq.last_calibration_date), col2X, rowY);
      rowY += rowH;

      field('Nächste Kalibrierung', formatDate(eq.next_calibration_date), col1X, rowY);
      const interval = eq.calibration_interval_months
        ? `${eq.calibration_interval_months} Mon.`
        : '-';
      field('Kal.-Intervall', interval, col2X, rowY);
    };

    // ----------------------------------------------------------------
    // Seiten aufbauen
    // ----------------------------------------------------------------
    let pageNum = 1;

    if (layout === 'full') {
      result.rows.forEach((eq, idx) => {
        if (idx > 0) {
          drawFooter(pageNum);
          doc.addPage();
          pageNum++;
        }
        renderFullCard(eq);
      });
      drawFooter(pageNum);
    } else {
      // compact: 2x2 pro Seite
      const CARD_W = PAGE_WIDTH / 2 - 6;   // 2 Spalten mit 12pt Gap
      const CARD_H = 355;                   // 2 Zeilen, Platz für Footer
      const GAP = 12;

      const positions = [
        { x: PAGE_LEFT,                    y: 40 },
        { x: PAGE_LEFT + CARD_W + GAP,     y: 40 },
        { x: PAGE_LEFT,                    y: 40 + CARD_H + GAP },
        { x: PAGE_LEFT + CARD_W + GAP,     y: 40 + CARD_H + GAP },
      ];

      result.rows.forEach((eq, idx) => {
        const slot = idx % 4;
        if (idx > 0 && slot === 0) {
          drawFooter(pageNum);
          doc.addPage();
          pageNum++;
        }
        const pos = positions[slot];
        renderCompactCard(eq, { x: pos.x, y: pos.y, w: CARD_W, h: CARD_H });
      });
      drawFooter(pageNum);
    }

    doc.end();

  } catch (error) {
    console.error('Error generating datasheets:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Datenblätter',
      error: error.message
    });
  }
};

/**
 * Generate next inventory number
 * Format: MM-NNNN (findet erste freie Lücke ab 1000)
 */
exports.getNextInventoryNumber = async (req, res) => {
  try {
    const prefix = 'MM-';
    const startNumber = 1000;

    // Alle existierenden Nummern holen (nur nicht-gelöschte)
    const result = await pool.query(`
      SELECT CAST(SUBSTRING(inventory_number FROM 4) AS INTEGER) as num
      FROM measuring_equipment
      WHERE inventory_number ~ '^MM-[0-9]+$'
        AND deleted_at IS NULL
      ORDER BY num ASC
    `);

    // Set für schnelle Lookup
    const existingNumbers = new Set(result.rows.map(r => r.num));

    // Erste freie Nummer ab startNumber finden
    let nextNumber = startNumber;
    while (existingNumbers.has(nextNumber)) {
      nextNumber++;
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

// ============================================================================
// LABEL GENERATOR
// ============================================================================

/**
 * GET /api/measuring-equipment/:id/label
 * Generate label PDF for printing
 * 
 * Query params:
 * - preset: 'multi' | 'multi-name' | 'qr-large' | 'qr-small' | 'compact' | 'full' | 'full-name' (default: 'multi')
 * 
 * Presets:
 * - multi: 4 Labels auf 103mm Rolle (QR groß, QR klein, Typ/Spec, Inv/Lager)
 * - qr-large: Nur QR-Code groß (30x30mm)
 * - qr-small: Nur QR-Code klein (15x15mm)
 * - compact: QR + Inv.Nr + Lagerort (40x20mm)
 * - full: Alles (QR, Typ, Spec, Inv, Lager) (60x35mm)
 */
exports.generateLabel = async (req, res) => {
  try {
    const { id } = req.params;
    const { preset = 'multi' } = req.query;

    // Get equipment with storage location
    const result = await pool.query(`
      SELECT 
        me.*,
        met.name as type_name,
        met.field_category as type_field_category,
        sl.name as location_name,
        sl.code as location_code,
        sc.name as compartment_name,
        sc.code as compartment_code
      FROM measuring_equipment me
      LEFT JOIN measuring_equipment_types met ON me.type_id = met.id
      LEFT JOIN storage_items si ON si.measuring_equipment_id = me.id 
        AND si.is_deleted = false AND si.is_active = true
      LEFT JOIN storage_compartments sc ON sc.id = si.compartment_id
      LEFT JOIN storage_locations sl ON sl.id = sc.location_id
      WHERE me.id = $1 AND me.deleted_at IS NULL
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Messmittel nicht gefunden'
      });
    }

    const eq = result.rows[0];

    // QR code content - Inventarnummer für Stabilität
    const qrContent = `ME:${eq.inventory_number}`;

    // mm to points conversion (1mm = 2.834645669 pt)
    const mm = (val) => val * 2.834645669;

    // Helper: Dezimalstellen nur wenn nötig
    const formatNumber = (num) => {
      if (num === null || num === undefined) return '';
      const n = parseFloat(num);
      return Number.isInteger(n) ? n.toString() : n.toString().replace(/\.?0+$/, '');
    };
    
    // Spezifikation basierend auf Typ-Kategorie
    const getSpecification = () => {
      const category = eq.type_field_category;
      
      switch (category) {
        case 'measuring_instrument':
          if (eq.measuring_range_min !== null && eq.measuring_range_max !== null) {
            return `${formatNumber(eq.measuring_range_min)}-${formatNumber(eq.measuring_range_max)} ${eq.unit || 'mm'}`;
          }
          break;
        case 'gauge':
          if (eq.nominal_value) {
            return `Ø${formatNumber(eq.nominal_value)} ${eq.tolerance_class || ''}`.trim();
          }
          break;
        case 'thread_gauge':
          if (eq.thread_size) {
            const parts = [eq.thread_standard || '', eq.thread_size || ''].filter(Boolean).join('');
            const pitch = eq.thread_pitch ? `x${eq.thread_pitch}` : '';
            const tolerance = eq.tolerance_class ? ` ${eq.tolerance_class}` : '';
            return `${parts}${pitch}${tolerance}`.trim() || '-';
          }
          break;
        case 'gauge_block':
          if (eq.nominal_value) {
            const klass = eq.accuracy_class ? ` Kl.${eq.accuracy_class}` : '';
            return `${formatNumber(eq.nominal_value)} ${eq.unit || 'mm'}${klass}`;
          }
          break;
        case 'angle_gauge':
          if (eq.nominal_value) {
            const tol = eq.tolerance_class ? ` ${eq.tolerance_class}` : '';
            return `${formatNumber(eq.nominal_value)}°${tol}`;
          }
          break;
        case 'surface_tester':
          if (eq.measuring_range_min !== null && eq.measuring_range_max !== null) {
            return `${formatNumber(eq.measuring_range_min)}-${formatNumber(eq.measuring_range_max)} µm`;
          }
          break;
      }
      
      // Fallback
      if (eq.measuring_range_min !== null && eq.measuring_range_max !== null) {
        return `${formatNumber(eq.measuring_range_min)}-${formatNumber(eq.measuring_range_max)} ${eq.unit || 'mm'}`;
      }
      if (eq.nominal_value) {
        return `Ø${formatNumber(eq.nominal_value)} ${eq.tolerance_class || ''}`.trim();
      }
      
      return '';
    };

    // Location code helper
    const getLocationCode = () => {
      return eq.compartment_code 
        ? `${eq.location_code || ''}/${eq.compartment_code}`
        : (eq.location_code || '-');
    };

    // Generate label based on preset
    let doc;
    
    switch (preset) {
      case 'qr-large': {
        // Nur QR-Code groß (30x30mm)
        const qrImage = await QRCode.toDataURL(qrContent, { width: 300, margin: 0, errorCorrectionLevel: 'M' });
        doc = new PDFDocument({ size: [mm(30), mm(30)], margin: 0 });
        doc.image(qrImage, mm(1), mm(1), { width: mm(28), height: mm(28) });
        break;
      }
      
      case 'qr-small': {
        // Nur QR-Code klein (15x15mm)
        const qrImage = await QRCode.toDataURL(qrContent, { width: 150, margin: 0, errorCorrectionLevel: 'M' });
        doc = new PDFDocument({ size: [mm(15), mm(15)], margin: 0 });
        doc.image(qrImage, mm(0.5), mm(0.5), { width: mm(14), height: mm(14) });
        break;
      }
      
      case 'compact': {
        // QR + Inv.Nr + Lagerort (40x20mm)
        const qrImage = await QRCode.toDataURL(qrContent, { width: 150, margin: 0, errorCorrectionLevel: 'M' });
        doc = new PDFDocument({ size: [mm(40), mm(20)], margin: 0 });
        
        // QR links
        doc.image(qrImage, mm(1), mm(1), { width: mm(18), height: mm(18) });
        
        // Inventarnummer rechts oben
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(eq.inventory_number, mm(21), mm(4), { width: mm(17), align: 'center' });
        
        // Lagerort rechts unten
        doc.fontSize(10)
           .font('Helvetica')
           .text(getLocationCode(), mm(21), mm(12), { width: mm(17), align: 'center' });
        break;
      }
      
      case 'full': {
        // Alles (QR, Typ, Spec, Inv, Lager) (60x35mm)
        const qrImage = await QRCode.toDataURL(qrContent, { width: 200, margin: 0, errorCorrectionLevel: 'M' });
        doc = new PDFDocument({ size: [mm(60), mm(35)], margin: 0 });
        
        // QR links
        doc.image(qrImage, mm(2), mm(2), { width: mm(20), height: mm(20) });
        
        // Inventarnummer groß rechts oben
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text(eq.inventory_number, mm(25), mm(3), { width: mm(33), align: 'center' });
        
        // Typ
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .text(eq.type_name || '', mm(25), mm(11), { width: mm(33), align: 'center' });
        
        // Spezifikation
        doc.fontSize(9)
           .font('Helvetica')
           .text(getSpecification(), mm(25), mm(17), { width: mm(33), align: 'center' });
        
        // Trennlinie
        doc.moveTo(mm(2), mm(25)).lineTo(mm(58), mm(25)).lineWidth(0.5).stroke();
        
        // Lagerort unten
        doc.fontSize(10)
           .font('Helvetica')
           .text(`Lagerort: ${getLocationCode()}`, mm(2), mm(28), { width: mm(56), align: 'center' });
        break;
      }

      case 'full-name': {
        // Alles mit Bezeichnung statt Typ (60x35mm)
        const qrImage = await QRCode.toDataURL(qrContent, { width: 200, margin: 0, errorCorrectionLevel: 'M' });
        doc = new PDFDocument({ size: [mm(60), mm(35)], margin: 0 });

        doc.image(qrImage, mm(2), mm(2), { width: mm(20), height: mm(20) });

        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text(eq.inventory_number, mm(25), mm(3), { width: mm(33), align: 'center' });

        doc.fontSize(9)
           .font('Helvetica-Bold')
           .text(eq.name || '', mm(25), mm(11), { width: mm(33), align: 'center' });

        doc.fontSize(9)
           .font('Helvetica')
           .text(getSpecification(), mm(25), mm(17), { width: mm(33), align: 'center' });

        doc.moveTo(mm(2), mm(25)).lineTo(mm(58), mm(25)).lineWidth(0.5).stroke();

        doc.fontSize(10)
           .font('Helvetica')
           .text(`Lagerort: ${getLocationCode()}`, mm(2), mm(28), { width: mm(56), align: 'center' });
        break;
      }

      case 'multi-name': {
        // Multi-Label mit Bezeichnung statt Typ: 4 Labels auf 103mm Rolle
        const qrLarge = await QRCode.toDataURL(qrContent, { width: 200, margin: 0, errorCorrectionLevel: 'M' });
        const qrSmall = await QRCode.toDataURL(qrContent, { width: 100, margin: 0, errorCorrectionLevel: 'M' });

        doc = new PDFDocument({ size: [mm(103), mm(25)], margin: 0 });

        const margin = mm(2.5);
        const gap = mm(2);

        const l1x = margin, l1y = margin, l1w = mm(20), l1h = mm(20);
        const l2x = l1x + l1w + gap, l2y = margin + mm(5), l2w = mm(10), l2h = mm(10);
        const l3x = l2x + l2w + gap, l3y = margin + mm(5), l3w = mm(35), l3h = mm(10);
        const l4x = l3x + l3w + gap, l4y = margin + mm(5), l4w = mm(20), l4h = mm(10);

        doc.strokeColor('#cccccc').lineWidth(0.5).dash(2, { space: 2 });
        [l1x + l1w + gap/2, l2x + l2w + gap/2, l3x + l3w + gap/2].forEach(x => {
          doc.moveTo(x, 0).lineTo(x, mm(25)).stroke();
        });
        doc.undash().strokeColor('#000000');

        doc.rect(l1x, l1y, l1w, l1h).lineWidth(0.25).stroke();
        doc.image(qrLarge, l1x + mm(1), l1y + mm(1), { width: mm(18), height: mm(18) });

        doc.rect(l2x, l2y, l2w, l2h).lineWidth(0.25).stroke();
        doc.image(qrSmall, l2x + mm(0.5), l2y + mm(0.5), { width: mm(9), height: mm(9) });

        doc.rect(l3x, l3y, l3w, l3h).lineWidth(0.25).stroke();
        doc.fontSize(10).font('Helvetica-Bold')
           .text(eq.name || '', l3x + mm(1), l3y + mm(2), { width: l3w - mm(2), align: 'center', lineBreak: false });
        doc.fontSize(10).font('Helvetica')
           .text(getSpecification(), l3x + mm(1), l3y + mm(6), { width: l3w - mm(2), align: 'center', lineBreak: false });

        doc.rect(l4x, l4y, l4w, l4h).lineWidth(0.25).stroke();
        doc.fontSize(10).font('Helvetica-Bold')
           .text(eq.inventory_number, l4x + mm(1), l4y + mm(2), { width: l4w - mm(2), align: 'center', lineBreak: false });
        doc.fontSize(10).font('Helvetica')
           .text(getLocationCode(), l4x + mm(1), l4y + mm(6), { width: l4w - mm(2), align: 'center', lineBreak: false });
        break;
      }

      case 'multi':
      default: {
        // Multi-Label: 4 Labels auf 103mm Rolle
        const qrLarge = await QRCode.toDataURL(qrContent, { width: 200, margin: 0, errorCorrectionLevel: 'M' });
        const qrSmall = await QRCode.toDataURL(qrContent, { width: 100, margin: 0, errorCorrectionLevel: 'M' });
        
        doc = new PDFDocument({ size: [mm(103), mm(25)], margin: 0 });
        
        const margin = mm(2.5);
        const gap = mm(2);

        // Label 1: QR Large (20x20mm)
        const l1x = margin, l1y = margin, l1w = mm(20), l1h = mm(20);
        // Label 2: QR Small (10x10mm)
        const l2x = l1x + l1w + gap, l2y = margin + mm(5), l2w = mm(10), l2h = mm(10);
        // Label 3: Specification (35x10mm)
        const l3x = l2x + l2w + gap, l3y = margin + mm(5), l3w = mm(35), l3h = mm(10);
        // Label 4: Inv + Location (20x10mm)
        const l4x = l3x + l3w + gap, l4y = margin + mm(5), l4w = mm(20), l4h = mm(10);

        // Schnittlinien (gestrichelt)
        doc.strokeColor('#cccccc').lineWidth(0.5).dash(2, { space: 2 });
        [l1x + l1w + gap/2, l2x + l2w + gap/2, l3x + l3w + gap/2].forEach(x => {
          doc.moveTo(x, 0).lineTo(x, mm(25)).stroke();
        });
        doc.undash().strokeColor('#000000');

        // Label 1: QR groß
        doc.rect(l1x, l1y, l1w, l1h).lineWidth(0.25).stroke();
        doc.image(qrLarge, l1x + mm(1), l1y + mm(1), { width: mm(18), height: mm(18) });

        // Label 2: QR klein
        doc.rect(l2x, l2y, l2w, l2h).lineWidth(0.25).stroke();
        doc.image(qrSmall, l2x + mm(0.5), l2y + mm(0.5), { width: mm(9), height: mm(9) });

        // Label 3: Typ + Spec
        doc.rect(l3x, l3y, l3w, l3h).lineWidth(0.25).stroke();
        doc.fontSize(10).font('Helvetica-Bold')
           .text(eq.type_name || '', l3x + mm(1), l3y + mm(2), { width: l3w - mm(2), align: 'center', lineBreak: false });
        doc.fontSize(10).font('Helvetica')
           .text(getSpecification(), l3x + mm(1), l3y + mm(6), { width: l3w - mm(2), align: 'center', lineBreak: false });

        // Label 4: Inv + Lagerort
        doc.rect(l4x, l4y, l4w, l4h).lineWidth(0.25).stroke();
        doc.fontSize(10).font('Helvetica-Bold')
           .text(eq.inventory_number, l4x + mm(1), l4y + mm(2), { width: l4w - mm(2), align: 'center', lineBreak: false });
        doc.fontSize(10).font('Helvetica')
           .text(getLocationCode(), l4x + mm(1), l4y + mm(6), { width: l4w - mm(2), align: 'center', lineBreak: false });
        break;
      }
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=Label_${eq.inventory_number}_${preset}.pdf`);
    
    doc.pipe(res);
    doc.end();

  } catch (error) {
    console.error('Error generating label:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Labels',
      error: error.message
    });
  }
};
