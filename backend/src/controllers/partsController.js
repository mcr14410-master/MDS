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
 * Get all parts with optional filtering
 * GET /api/parts?customer_id=1&status=active
 */
exports.getAllParts = async (req, res) => {
  try {
    const { customer_id, status, search } = req.query;
    
    let query = `
      SELECT 
        p.*,
        c.name as customer_name,
        c.customer_number,
        (SELECT COUNT(*) FROM operations WHERE part_id = p.id) as operation_count
      FROM parts p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE p.status != 'deleted'
    `;
    const params = [];
    let paramCount = 1;

    if (customer_id) {
      query += ` AND p.customer_id = $${paramCount}`;
      params.push(customer_id);
      paramCount++;
    }

    if (status) {
      query += ` AND p.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (search) {
      query += ` AND (p.part_number ILIKE $${paramCount} OR p.part_name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY p.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      parts: result.rows
    });
  } catch (error) {
    console.error('Error fetching parts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch parts',
      message: error.message
    });
  }
};

/**
 * Get single part by ID
 * GET /api/parts/:id
 */
exports.getPartById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        p.*,
        c.name as customer_name,
        c.customer_number,
        c.email as customer_email,
        c.phone as customer_phone
      FROM parts p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE p.id = $1 AND p.status != 'deleted'
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Part not found'
      });
    }

    // Get operations for this part
    const opsQuery = `
      SELECT 
        o.*,
        m.name as machine_name,
        m.manufacturer as machine_manufacturer
      FROM operations o
      LEFT JOIN machines m ON o.machine_id = m.id
      WHERE o.part_id = $1
      ORDER BY o.sequence, o.op_number
    `;
    const opsResult = await pool.query(opsQuery, [id]);

    const part = {
      ...result.rows[0],
      operations: opsResult.rows
    };

    res.json({
      success: true,
      part
    });
  } catch (error) {
    console.error('Error fetching part:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch part',
      message: error.message
    });
  }
};

/**
 * Create new part
 * POST /api/parts
 */
exports.createPart = async (req, res) => {
  try {
    const {
      customer_id,
      part_number,
      part_name,
      revision,
      description,
      material,
      dimensions,
      notes,
      weight,
      drawing_number,
      cad_file_path,
      status = 'draft'
    } = req.body;

    // Validation - only part_number and part_name are required
    if (!part_number || !part_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['part_number', 'part_name']
      });
    }

    // Check if part_number already exists
    const checkQuery = 'SELECT id FROM parts WHERE part_number = $1 AND status != \'deleted\'';
    const checkResult = await pool.query(checkQuery, [part_number]);

    if (checkResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Part number already exists'
      });
    }

    // Check if customer exists (only if customer_id is provided)
    if (customer_id) {
      const customerCheck = await pool.query('SELECT id FROM customers WHERE id = $1', [customer_id]);
      if (customerCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }
    }

    const query = `
      INSERT INTO parts (
        customer_id, part_number, part_name, revision, description,
        material, dimensions, notes, weight, drawing_number, 
        cad_file_path, status, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
      RETURNING *
    `;

    const values = [
      customer_id || null,
      part_number,
      part_name,
      revision || 'A',
      description || null,
      material || null,
      dimensions || null,
      notes || null,
      weight || null,
      drawing_number || null,
      cad_file_path || null,
      status,
      req.user.id  // from auth middleware
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Part created successfully',
      part: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating part:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create part',
      message: error.message
    });
  }
};

/**
 * Update existing part
 * PUT /api/parts/:id
 */
exports.updatePart = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customer_id,
      part_number,
      part_name,
      revision,
      description,
      material,
      dimensions,
      notes,
      weight,
      drawing_number,
      cad_file_path,
      status
    } = req.body;

    // Check if part exists
    const checkQuery = 'SELECT id FROM parts WHERE id = $1 AND status != \'deleted\'';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Part not found'
      });
    }

    // Check if new part_number already exists for another part
    if (part_number) {
      const duplicateCheck = await pool.query(
        'SELECT id FROM parts WHERE part_number = $1 AND id != $2 AND status != \'deleted\'',
        [part_number, id]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Part number already exists'
        });
      }
    }

    const query = `
      UPDATE parts SET
        customer_id = COALESCE($1, customer_id),
        part_number = COALESCE($2, part_number),
        part_name = COALESCE($3, part_name),
        revision = COALESCE($4, revision),
        description = COALESCE($5, description),
        material = COALESCE($6, material),
        dimensions = COALESCE($7, dimensions),
        notes = COALESCE($8, notes),
        weight = COALESCE($9, weight),
        drawing_number = COALESCE($10, drawing_number),
        cad_file_path = COALESCE($11, cad_file_path),
        status = COALESCE($12, status),
        updated_by = $13,
        updated_at = NOW()
      WHERE id = $14
      RETURNING *
    `;

    const values = [
      customer_id,
      part_number,
      part_name,
      revision,
      description,
      material,
      dimensions,
      notes,
      weight,
      drawing_number,
      cad_file_path,
      status,
      req.user.id,
      id
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Part updated successfully',
      part: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating part:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update part',
      message: error.message
    });
  }
};

/**
 * Delete part
 * DELETE /api/parts/:id
 */
exports.deletePart = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if part exists
    const checkQuery = 'SELECT id FROM parts WHERE id = $1 AND status != \'deleted\'';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Part not found'
      });
    }

    // Check if part has operations
    const opsCheck = await pool.query('SELECT COUNT(*) as count FROM operations WHERE part_id = $1', [id]);
    const operationCount = parseInt(opsCheck.rows[0].count);

    if (operationCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete part with existing operations',
        message: `This part has ${operationCount} operation(s). Delete operations first.`
      });
    }

    // Soft delete: Update status to 'deleted' instead of hard delete
    const query = `
      UPDATE parts 
      SET 
        status = 'deleted',
        updated_by = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING id, part_number, part_name
    `;

    const result = await pool.query(query, [req.user.id, id]);

    res.json({
      success: true,
      message: 'Part deleted successfully',
      part: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting part:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete part',
      message: error.message
    });
  }
};

/**
 * Get part statistics
 * GET /api/parts/stats
 */
exports.getPartStats = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_parts,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_parts,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_parts,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_parts,
        COUNT(CASE WHEN status = 'obsolete' THEN 1 END) as obsolete_parts,
        COUNT(DISTINCT customer_id) as total_customers
      FROM parts
      WHERE status != 'deleted'
    `;

    const result = await pool.query(statsQuery);

    res.json({
      success: true,
      stats: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching part stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
};