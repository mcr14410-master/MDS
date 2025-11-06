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
    const { machine_type, control_type, is_active, search } = req.query;
    
    let query = `
      SELECT 
        m.*,
        (SELECT COUNT(*) FROM programs pr 
         JOIN operations o ON pr.operation_id = o.id 
         WHERE o.machine_id = m.id) as program_count
      FROM machines m
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (machine_type) {
      query += ` AND m.machine_type = $${paramCount}`;
      params.push(machine_type);
      paramCount++;
    }

    if (control_type) {
      query += ` AND m.control_type = $${paramCount}`;
      params.push(control_type);
      paramCount++;
    }

    if (is_active !== undefined) {
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

    query += ' ORDER BY m.name ASC';

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
        (SELECT COUNT(*) FROM programs pr 
         JOIN operations o ON pr.operation_id = o.id 
         WHERE o.machine_id = m.id) as program_count,
        (SELECT COUNT(*) FROM operations WHERE machine_id = m.id) as operation_count
      FROM machines m
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
      machine_type,
      control_type,
      control_version,
      num_axes,
      workspace_x,
      workspace_y,
      workspace_z,
      spindle_power,
      max_rpm,
      tool_capacity,
      location,
      network_path,
      postprocessor_name,
      notes,
      is_active = true,
      operating_hours = 0
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Machine name is required'
      });
    }

    // Check if machine name already exists
    const checkQuery = 'SELECT id FROM machines WHERE name = $1';
    const checkResult = await pool.query(checkQuery, [name]);
    
    if (checkResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Machine with this name already exists'
      });
    }

    const query = `
      INSERT INTO machines (
        name, manufacturer, model, serial_number, machine_type,
        control_type, control_version, num_axes,
        workspace_x, workspace_y, workspace_z,
        spindle_power, max_rpm, tool_capacity,
        location, network_path, postprocessor_name,
        notes, is_active, operating_hours
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;

    const values = [
      name,
      manufacturer || null,
      model || null,
      serial_number || null,
      machine_type,
      control_type,
      control_version || null,
      sanitizeNumericField(num_axes),
      sanitizeNumericField(workspace_x),
      sanitizeNumericField(workspace_y),
      sanitizeNumericField(workspace_z),
      sanitizeNumericField(spindle_power),
      sanitizeNumericField(max_rpm),
      sanitizeNumericField(tool_capacity),
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
      machine_type,
      control_type,
      control_version,
      num_axes,
      workspace_x,
      workspace_y,
      workspace_z,
      spindle_power,
      max_rpm,
      tool_capacity,
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

    const query = `
      UPDATE machines SET
        name = COALESCE($1, name),
        manufacturer = COALESCE($2, manufacturer),
        model = COALESCE($3, model),
        serial_number = COALESCE($4, serial_number),
        machine_type = COALESCE($5, machine_type),
        control_type = COALESCE($6, control_type),
        control_version = COALESCE($7, control_version),
        num_axes = COALESCE($8, num_axes),
        workspace_x = COALESCE($9, workspace_x),
        workspace_y = COALESCE($10, workspace_y),
        workspace_z = COALESCE($11, workspace_z),
        spindle_power = COALESCE($12, spindle_power),
        max_rpm = COALESCE($13, max_rpm),
        tool_capacity = COALESCE($14, tool_capacity),
        location = COALESCE($15, location),
        network_path = COALESCE($16, network_path),
        postprocessor_name = COALESCE($17, postprocessor_name),
        notes = COALESCE($18, notes),
        is_active = COALESCE($19, is_active),
        operating_hours = COALESCE($20, operating_hours),
        last_maintenance = COALESCE($21, last_maintenance),
        next_maintenance = COALESCE($22, next_maintenance),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $23
      RETURNING *
    `;

    const values = [
      name || null,
      manufacturer || null,
      model || null,
      serial_number || null,
      machine_type || null,
      control_type || null,
      control_version || null,
      sanitizeNumericField(num_axes),
      sanitizeNumericField(workspace_x),
      sanitizeNumericField(workspace_y),
      sanitizeNumericField(workspace_z),
      sanitizeNumericField(spindle_power),
      sanitizeNumericField(max_rpm),
      sanitizeNumericField(tool_capacity),
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
