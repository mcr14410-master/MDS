const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

/**
 * Get all machines with optional filtering
 * GET /api/machines?machine_type=milling&is_active=true
 */
exports.getAllMachines = async (req, res) => {
  try {
    const { machine_type_id, control_type_id, is_active, search, sort_by, sort_order } = req.query;

    let query = `
      SELECT
        m.*,
        mt.name     AS machine_type_name,
        mt.color    AS machine_type_color,
        mt.sequence AS machine_type_sequence,
        mt.custom_field_definitions AS machine_type_field_definitions,
        ct.name     AS control_type_name,
        ct.color    AS control_type_color,
        -- Legacy-Kompatibilitaet: control_type/machine_type aus FK, falls vorhanden
        COALESCE(ct.name, m.control_type) AS control_type,
        COALESCE(mt.name, m.machine_type) AS machine_type,
        (SELECT COUNT(*) FROM programs pr
         JOIN operations o ON pr.operation_id = o.id
         WHERE o.machine_id = m.id) as program_count
      FROM machines m
      LEFT JOIN machine_types mt ON mt.id = m.machine_type_id
      LEFT JOIN control_types ct ON ct.id = m.control_type_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (machine_type_id) {
      query += ` AND m.machine_type_id = $${paramCount}`;
      params.push(parseInt(machine_type_id, 10));
      paramCount++;
    }

    if (control_type_id) {
      query += ` AND m.control_type_id = $${paramCount}`;
      params.push(parseInt(control_type_id, 10));
      paramCount++;
    }

    if (is_active !== undefined && is_active !== '') {
      query += ` AND m.is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    if (search) {
      query += ` AND (
        m.name ILIKE $${paramCount} OR
        m.manufacturer ILIKE $${paramCount} OR
        m.model ILIKE $${paramCount} OR
        m.serial_number ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Sortierung mit Whitelist (SQL-Injection-Schutz)
    // Schluesselwert -> Spaltenausdruck
    const sortColumnMap = {
      name: 'm.name',
      manufacturer: 'm.manufacturer',
      model: 'm.model',
      machine_type: 'mt.name',
      control_type: 'ct.name'
    };
    const safeSortBy = sortColumnMap[sort_by] || 'm.name';
    const safeSortOrder = String(sort_order).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    // Gruppierung nach Maschinentyp (sequence) kommt immer zuerst
    if (sort_by === 'machine_type') {
      query += ` ORDER BY mt.sequence ${safeSortOrder} NULLS LAST, mt.name ${safeSortOrder} NULLS LAST, m.name ASC`;
    } else {
      query += ` ORDER BY mt.sequence ASC NULLS LAST, mt.name ASC NULLS LAST, ${safeSortBy} ${safeSortOrder} NULLS LAST, m.name ASC`;
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching machines:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch machines',
      message: error.message
    });
  }
};

/**
 * Get single machine by ID
 * GET /api/machines/:id
 */
exports.getMachineById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        m.*,
        mt.name  AS machine_type_name,
        mt.color AS machine_type_color,
        mt.custom_field_definitions AS machine_type_field_definitions,
        ct.name  AS control_type_name,
        ct.color AS control_type_color,
        COALESCE(ct.name, m.control_type) AS control_type,
        COALESCE(mt.name, m.machine_type) AS machine_type,
        (SELECT COUNT(*) FROM programs pr
         JOIN operations o ON pr.operation_id = o.id
         WHERE o.machine_id = m.id) as program_count,
        (SELECT COUNT(*) FROM operations WHERE machine_id = m.id) as operation_count
      FROM machines m
      LEFT JOIN machine_types mt ON mt.id = m.machine_type_id
      LEFT JOIN control_types ct ON ct.id = m.control_type_id
      WHERE m.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Machine not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching machine:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch machine',
      message: error.message
    });
  }
};

/**
 * Helper function: Convert empty strings to null for numeric fields
 */
const sanitizeNumericField = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  return value;
};

/**
 * Create new machine
 * POST /api/machines
 */
exports.createMachine = async (req, res) => {
  try {
    const {
      name,
      manufacturer,
      model,
      serial_number,
      machine_type_id,
      control_type_id,
      control_version,
      year_built,
      custom_fields,
      location,
      network_path,
      postprocessor_name,
      notes,
      is_active = true,
      operating_hours = 0
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Machine name is required'
      });
    }

    const checkResult = await pool.query('SELECT id FROM machines WHERE name = $1', [name]);
    if (checkResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Machine with this name already exists'
      });
    }

    const query = `
      INSERT INTO machines (
        name, manufacturer, model, serial_number,
        machine_type_id, control_type_id, control_version, year_built,
        custom_fields,
        location, network_path, postprocessor_name,
        notes, is_active, operating_hours
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      name,
      manufacturer || null,
      model || null,
      serial_number || null,
      machine_type_id ? parseInt(machine_type_id, 10) : null,
      control_type_id ? parseInt(control_type_id, 10) : null,
      control_version || null,
      sanitizeNumericField(year_built),
      custom_fields ? JSON.stringify(custom_fields) : '{}',
      location || null,
      network_path || null,
      postprocessor_name || null,
      notes || null,
      is_active,
      sanitizeNumericField(operating_hours) || 0
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Machine created successfully'
    });
  } catch (error) {
    console.error('Error creating machine:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create machine',
      message: error.message
    });
  }
};

/**
 * Update machine
 * PUT /api/machines/:id
 */
exports.updateMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      manufacturer,
      model,
      serial_number,
      machine_type_id,
      control_type_id,
      control_version,
      year_built,
      custom_fields,
      location,
      network_path,
      postprocessor_name,
      notes,
      is_active,
      operating_hours,
      last_maintenance,
      next_maintenance
    } = req.body;

    // Check if machine exists
    const checkQuery = 'SELECT id FROM machines WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Machine not found'
      });
    }

    // Check if new name already exists (excluding current machine)
    if (name) {
      const nameCheckQuery = 'SELECT id FROM machines WHERE name = $1 AND id != $2';
      const nameCheckResult = await pool.query(nameCheckQuery, [name, id]);
      
      if (nameCheckResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Machine with this name already exists'
        });
      }
    }

    // COALESCE bewusst weggelassen, wo wir Felder bewusst leeren koennen sollen.
    // year_built, custom_fields, machine_type_id und control_type_id muessen loeschbar sein.
    const query = `
      UPDATE machines SET
        name = COALESCE($1, name),
        manufacturer = COALESCE($2, manufacturer),
        model = COALESCE($3, model),
        serial_number = COALESCE($4, serial_number),
        machine_type_id = $5,
        control_type_id = $6,
        control_version = COALESCE($7, control_version),
        year_built = $8,
        custom_fields = COALESCE($9, custom_fields),
        location = COALESCE($10, location),
        network_path = COALESCE($11, network_path),
        postprocessor_name = COALESCE($12, postprocessor_name),
        notes = COALESCE($13, notes),
        is_active = COALESCE($14, is_active),
        operating_hours = COALESCE($15, operating_hours),
        last_maintenance = COALESCE($16, last_maintenance),
        next_maintenance = COALESCE($17, next_maintenance),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $18
      RETURNING *
    `;

    const values = [
      name || null,
      manufacturer || null,
      model || null,
      serial_number || null,
      machine_type_id !== undefined ? (machine_type_id ? parseInt(machine_type_id, 10) : null) : null,
      control_type_id !== undefined ? (control_type_id ? parseInt(control_type_id, 10) : null) : null,
      control_version || null,
      sanitizeNumericField(year_built),
      custom_fields !== undefined ? JSON.stringify(custom_fields) : null,
      location || null,
      network_path || null,
      postprocessor_name || null,
      notes || null,
      is_active,
      sanitizeNumericField(operating_hours),
      last_maintenance || null,
      next_maintenance || null,
      id
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Machine updated successfully'
    });
  } catch (error) {
    console.error('Error updating machine:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update machine',
      message: error.message
    });
  }
};

/**
 * Delete machine (soft delete by setting is_active = false)
 * DELETE /api/machines/:id
 */
exports.deleteMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const { hard_delete } = req.query; // Optional: ?hard_delete=true

    // Check if machine exists
    const checkQuery = 'SELECT id FROM machines WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Machine not found'
      });
    }

    // Check if machine has operations
    const opsQuery = 'SELECT COUNT(*) as count FROM operations WHERE machine_id = $1';
    const opsResult = await pool.query(opsQuery, [id]);
    
    if (parseInt(opsResult.rows[0].count) > 0 && hard_delete === 'true') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete machine with existing operations. Set is_active=false instead.'
      });
    }

    let query;
    if (hard_delete === 'true' && parseInt(opsResult.rows[0].count) === 0) {
      // Hard delete only if no operations exist
      query = 'DELETE FROM machines WHERE id = $1 RETURNING *';
    } else {
      // Soft delete (default)
      query = 'UPDATE machines SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *';
    }

    const result = await pool.query(query, [id]);

    res.json({
      success: true,
      data: result.rows[0],
      message: hard_delete === 'true' ? 'Machine deleted permanently' : 'Machine deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting machine:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete machine',
      message: error.message
    });
  }
};

/**
 * Get machine statistics
 * GET /api/machines/:id/stats
 */
exports.getMachineStats = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        m.name,
        m.operating_hours,
        m.last_maintenance,
        m.next_maintenance,
        COUNT(DISTINCT o.id) as operation_count,
        COUNT(DISTINCT pr.id) as program_count
      FROM machines m
      LEFT JOIN operations o ON o.machine_id = m.id
      LEFT JOIN programs pr ON pr.operation_id = o.id
      WHERE m.id = $1
      GROUP BY m.id, m.name, m.operating_hours, m.last_maintenance, m.next_maintenance
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Machine not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching machine stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch machine statistics',
      message: error.message
    });
  }
};

/**
 * Get all operations for a machine
 * GET /api/machines/:id/operations
 */
exports.getMachineOperations = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        o.*,
        p.part_number,
        p.part_name,
        (SELECT COUNT(*) FROM programs WHERE operation_id = o.id) as program_count
      FROM operations o
      JOIN parts p ON o.part_id = p.id
      WHERE o.machine_id = $1
      ORDER BY o.operation_number ASC
    `;

    const result = await pool.query(query, [id]);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching machine operations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch machine operations',
      message: error.message
    });
  }
};
