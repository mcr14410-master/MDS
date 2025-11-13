const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// ============================================================================
// STORAGE LOCATIONS
// ============================================================================

/**
 * Get all storage locations with optional filtering
 * GET /api/storage/locations?location_type=cabinet&item_category=tools&is_active=true
 */
exports.getAllLocations = async (req, res) => {
  try {
    const { location_type, item_category, is_active, search, building, floor, room } = req.query;

    let query = `
      SELECT
        l.*,
        u.username as responsible_username,
        (SELECT COUNT(*) FROM storage_compartments
         WHERE location_id = l.id) as compartments_count,
        (SELECT COUNT(*) FROM storage_compartments
         WHERE location_id = l.id AND is_active = true) as active_compartments_count
      FROM storage_locations l
      LEFT JOIN users u ON l.responsible_user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (location_type) {
      query += ` AND l.location_type = $${paramCount}`;
      params.push(location_type);
      paramCount++;
    }

    if (item_category) {
      query += ` AND l.item_category = $${paramCount}`;
      params.push(item_category);
      paramCount++;
    }

    if (is_active !== undefined) {
      query += ` AND l.is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    if (building) {
      query += ` AND l.building ILIKE $${paramCount}`;
      params.push(`%${building}%`);
      paramCount++;
    }

    if (floor) {
      query += ` AND l.floor ILIKE $${paramCount}`;
      params.push(`%${floor}%`);
      paramCount++;
    }

    if (room) {
      query += ` AND l.room ILIKE $${paramCount}`;
      params.push(`%${room}%`);
      paramCount++;
    }

    if (search) {
      query += ` AND (
        l.name ILIKE $${paramCount} OR
        l.code ILIKE $${paramCount} OR
        l.description ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY l.name ASC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching storage locations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch storage locations',
      message: error.message
    });
  }
};

/**
 * Get single storage location by ID
 * GET /api/storage/locations/:id
 */
exports.getLocationById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        l.*,
        u.username as responsible_username,
        (SELECT COUNT(*) FROM storage_compartments
         WHERE location_id = l.id) as compartments_count,
        (SELECT COUNT(*) FROM storage_compartments
         WHERE location_id = l.id AND is_active = true) as active_compartments_count
      FROM storage_locations l
      LEFT JOIN users u ON l.responsible_user_id = u.id
      WHERE l.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Storage location not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching storage location:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch storage location',
      message: error.message
    });
  }
};

/**
 * Create new storage location
 * POST /api/storage/locations
 */
exports.createLocation = async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      location_type,
      item_category,
      building,
      floor,
      room,
      position_notes,
      capacity_info,
      access_restrictions,
      responsible_user_id,
      is_active = true,
      notes
    } = req.body;

    // Validation
    if (!name || !location_type || !item_category) {
      return res.status(400).json({
        success: false,
        error: 'Name, location_type, and item_category are required'
      });
    }

    // Validate location_type
    const validLocationTypes = ['cabinet', 'shelf_unit', 'room', 'area'];
    if (!validLocationTypes.includes(location_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid location_type. Must be one of: ${validLocationTypes.join(', ')}`
      });
    }

    // Validate item_category
    const validItemCategories = ['tools', 'fixtures', 'clamping_devices', 'measuring_equipment', 'consumables', 'mixed'];
    if (!validItemCategories.includes(item_category)) {
      return res.status(400).json({
        success: false,
        error: `Invalid item_category. Must be one of: ${validItemCategories.join(', ')}`
      });
    }

    const created_by = req.user?.id || null;

    const query = `
      INSERT INTO storage_locations (
        name, code, description, location_type, item_category,
        building, floor, room, position_notes, capacity_info,
        access_restrictions, responsible_user_id, is_active, notes,
        created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    const values = [
      name, code, description, location_type, item_category,
      building, floor, room, position_notes, capacity_info,
      access_restrictions, responsible_user_id, is_active, notes, created_by
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Storage location created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating storage location:', error);

    // Handle unique constraint violations
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'A storage location with this name or code already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create storage location',
      message: error.message
    });
  }
};

/**
 * Update storage location
 * PUT /api/storage/locations/:id
 */
exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      description,
      location_type,
      item_category,
      building,
      floor,
      room,
      position_notes,
      capacity_info,
      access_restrictions,
      responsible_user_id,
      is_active,
      notes
    } = req.body;

    // Check if location exists
    const checkQuery = 'SELECT id FROM storage_locations WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Storage location not found'
      });
    }

    // Validate location_type if provided
    if (location_type) {
      const validLocationTypes = ['cabinet', 'shelf_unit', 'room', 'area'];
      if (!validLocationTypes.includes(location_type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid location_type. Must be one of: ${validLocationTypes.join(', ')}`
        });
      }
    }

    // Validate item_category if provided
    if (item_category) {
      const validItemCategories = ['tools', 'fixtures', 'clamping_devices', 'measuring_equipment', 'consumables', 'mixed'];
      if (!validItemCategories.includes(item_category)) {
        return res.status(400).json({
          success: false,
          error: `Invalid item_category. Must be one of: ${validItemCategories.join(', ')}`
        });
      }
    }

    const query = `
      UPDATE storage_locations
      SET
        name = COALESCE($1, name),
        code = COALESCE($2, code),
        description = COALESCE($3, description),
        location_type = COALESCE($4, location_type),
        item_category = COALESCE($5, item_category),
        building = COALESCE($6, building),
        floor = COALESCE($7, floor),
        room = COALESCE($8, room),
        position_notes = COALESCE($9, position_notes),
        capacity_info = COALESCE($10, capacity_info),
        access_restrictions = COALESCE($11, access_restrictions),
        responsible_user_id = COALESCE($12, responsible_user_id),
        is_active = COALESCE($13, is_active),
        notes = COALESCE($14, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *
    `;

    const values = [
      name, code, description, location_type, item_category,
      building, floor, room, position_notes, capacity_info,
      access_restrictions, responsible_user_id, is_active, notes, id
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Storage location updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating storage location:', error);

    // Handle unique constraint violations
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'A storage location with this name or code already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update storage location',
      message: error.message
    });
  }
};

/**
 * Delete storage location
 * DELETE /api/storage/locations/:id
 */
exports.deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if location exists
    const checkQuery = 'SELECT id, name FROM storage_locations WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Storage location not found'
      });
    }

    // Check for compartments (will cascade delete)
    const compartmentCheck = await pool.query(
      'SELECT COUNT(*) as count FROM storage_compartments WHERE location_id = $1',
      [id]
    );

    const compartmentCount = parseInt(compartmentCheck.rows[0].count);

    // Delete location (CASCADE will delete compartments)
    const deleteQuery = 'DELETE FROM storage_locations WHERE id = $1';
    await pool.query(deleteQuery, [id]);

    res.json({
      success: true,
      message: `Storage location deleted successfully${compartmentCount > 0 ? ` (${compartmentCount} compartments also deleted)` : ''}`,
      deletedCompartments: compartmentCount
    });
  } catch (error) {
    console.error('Error deleting storage location:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete storage location',
      message: error.message
    });
  }
};

/**
 * Get all compartments for a specific location
 * GET /api/storage/locations/:id/compartments
 */
exports.getCompartmentsByLocation = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if location exists
    const locationCheck = await pool.query(
      'SELECT id, name FROM storage_locations WHERE id = $1',
      [id]
    );

    if (locationCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Storage location not found'
      });
    }

    const query = `
      SELECT
        c.*,
        l.name as location_name,
        l.code as location_code
      FROM storage_compartments c
      JOIN storage_locations l ON c.location_id = l.id
      WHERE c.location_id = $1
      ORDER BY c.sequence ASC, c.row_number ASC, c.column_number ASC, c.name ASC
    `;

    const result = await pool.query(query, [id]);

    res.json({
      success: true,
      location: locationCheck.rows[0],
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching compartments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch compartments',
      message: error.message
    });
  }
};

// ============================================================================
// STORAGE COMPARTMENTS
// ============================================================================

/**
 * Get all storage compartments with optional filtering
 * GET /api/storage/compartments?location_id=1&is_active=true
 */
exports.getAllCompartments = async (req, res) => {
  try {
    const { location_id, compartment_type, is_active, search } = req.query;

    let query = `
      SELECT
        c.*,
        l.name as location_name,
        l.code as location_code,
        l.location_type,
        l.item_category
      FROM storage_compartments c
      JOIN storage_locations l ON c.location_id = l.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (location_id) {
      query += ` AND c.location_id = $${paramCount}`;
      params.push(location_id);
      paramCount++;
    }

    if (compartment_type) {
      query += ` AND c.compartment_type = $${paramCount}`;
      params.push(compartment_type);
      paramCount++;
    }

    if (is_active !== undefined) {
      query += ` AND c.is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    if (search) {
      query += ` AND (
        c.name ILIKE $${paramCount} OR
        c.code ILIKE $${paramCount} OR
        c.description ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY c.location_id ASC, c.sequence ASC, c.row_number ASC, c.column_number ASC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching storage compartments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch storage compartments',
      message: error.message
    });
  }
};

/**
 * Get single storage compartment by ID
 * GET /api/storage/compartments/:id
 */
exports.getCompartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        c.*,
        l.name as location_name,
        l.code as location_code,
        l.location_type,
        l.item_category
      FROM storage_compartments c
      JOIN storage_locations l ON c.location_id = l.id
      WHERE c.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Storage compartment not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching storage compartment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch storage compartment',
      message: error.message
    });
  }
};

/**
 * Create new storage compartment
 * POST /api/storage/compartments
 */
exports.createCompartment = async (req, res) => {
  try {
    const {
      location_id,
      name,
      code,
      description,
      compartment_type,
      row_number,
      column_number,
      sequence = 0,
      dimensions,
      capacity_info,
      is_active = true,
      notes
    } = req.body;

    // Validation
    if (!location_id || !name || !compartment_type) {
      return res.status(400).json({
        success: false,
        error: 'location_id, name, and compartment_type are required'
      });
    }

    // Validate compartment_type
    const validCompartmentTypes = ['drawer', 'compartment', 'bin', 'section'];
    if (!validCompartmentTypes.includes(compartment_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid compartment_type. Must be one of: ${validCompartmentTypes.join(', ')}`
      });
    }

    // Check if location exists
    const locationCheck = await pool.query(
      'SELECT id FROM storage_locations WHERE id = $1',
      [location_id]
    );

    if (locationCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Storage location not found'
      });
    }

    const created_by = req.user?.id || null;

    const query = `
      INSERT INTO storage_compartments (
        location_id, name, code, description, compartment_type,
        row_number, column_number, sequence, dimensions, capacity_info,
        is_active, notes, created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    const values = [
      location_id, name, code, description, compartment_type,
      row_number, column_number, sequence, dimensions, capacity_info,
      is_active, notes, created_by
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Storage compartment created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating storage compartment:', error);

    // Handle unique constraint violations
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'A compartment with this name already exists in this location'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create storage compartment',
      message: error.message
    });
  }
};

/**
 * Update storage compartment
 * PUT /api/storage/compartments/:id
 */
exports.updateCompartment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      description,
      compartment_type,
      row_number,
      column_number,
      sequence,
      dimensions,
      capacity_info,
      is_active,
      notes
    } = req.body;

    // Check if compartment exists
    const checkQuery = 'SELECT id FROM storage_compartments WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Storage compartment not found'
      });
    }

    // Validate compartment_type if provided
    if (compartment_type) {
      const validCompartmentTypes = ['drawer', 'compartment', 'bin', 'section'];
      if (!validCompartmentTypes.includes(compartment_type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid compartment_type. Must be one of: ${validCompartmentTypes.join(', ')}`
        });
      }
    }

    const query = `
      UPDATE storage_compartments
      SET
        name = COALESCE($1, name),
        code = COALESCE($2, code),
        description = COALESCE($3, description),
        compartment_type = COALESCE($4, compartment_type),
        row_number = COALESCE($5, row_number),
        column_number = COALESCE($6, column_number),
        sequence = COALESCE($7, sequence),
        dimensions = COALESCE($8, dimensions),
        capacity_info = COALESCE($9, capacity_info),
        is_active = COALESCE($10, is_active),
        notes = COALESCE($11, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `;

    const values = [
      name, code, description, compartment_type,
      row_number, column_number, sequence, dimensions, capacity_info,
      is_active, notes, id
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Storage compartment updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating storage compartment:', error);

    // Handle unique constraint violations
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'A compartment with this name already exists in this location'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update storage compartment',
      message: error.message
    });
  }
};

/**
 * Delete storage compartment
 * DELETE /api/storage/compartments/:id
 */
exports.deleteCompartment = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if compartment exists
    const checkQuery = 'SELECT id, name FROM storage_compartments WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Storage compartment not found'
      });
    }

    // Delete compartment
    const deleteQuery = 'DELETE FROM storage_compartments WHERE id = $1';
    await pool.query(deleteQuery, [id]);

    res.json({
      success: true,
      message: 'Storage compartment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting storage compartment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete storage compartment',
      message: error.message
    });
  }
};
