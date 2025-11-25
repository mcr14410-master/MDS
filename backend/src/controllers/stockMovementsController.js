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
// STOCK MOVEMENTS
// ============================================================================

/**
 * Get movements by storage item
 * GET /api/stock-movements/item/:id
 */
exports.getMovementsByItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const query = `
      SELECT
        sm.*,
        u.username as performed_by_username,
        si.item_type,
        tm.article_number,
        tm.tool_name,
        fc.name as from_compartment_name,
        tc.name as to_compartment_name
      FROM stock_movements sm
      LEFT JOIN users u ON u.id = sm.performed_by
      LEFT JOIN storage_items si ON si.id = sm.storage_item_id
      LEFT JOIN tool_master tm ON tm.id = si.tool_master_id
      LEFT JOIN storage_compartments fc ON fc.id = sm.from_compartment_id
      LEFT JOIN storage_compartments tc ON tc.id = sm.to_compartment_id
      WHERE sm.storage_item_id = $1
      ORDER BY sm.performed_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) FROM stock_movements WHERE storage_item_id = $1
    `;

    const [result, countResult] = await Promise.all([
      pool.query(query, [id, limit, offset]),
      pool.query(countQuery, [id])
    ]);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching movements by item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch movements',
      message: error.message
    });
  }
};

/**
 * Get all movements with optional filters
 * GET /api/stock-movements?movement_type=issue&condition=new&limit=100
 */
exports.getAllMovements = async (req, res) => {
  try {
    const {
      movement_type,
      condition,
      tool_master_id,
      performed_by,
      date_from,
      date_to,
      limit = 100,
      offset = 0
    } = req.query;

    let query = `
      SELECT
        sm.*,
        u.username as performed_by_username,
        si.item_type,
        tm.article_number,
        tm.tool_name,
        sc.name as compartment_name,
        sl.name as location_name
      FROM stock_movements sm
      LEFT JOIN users u ON u.id = sm.performed_by
      LEFT JOIN storage_items si ON si.id = sm.storage_item_id
      LEFT JOIN tool_master tm ON tm.id = si.tool_master_id
      LEFT JOIN storage_compartments sc ON sc.id = si.compartment_id
      LEFT JOIN storage_locations sl ON sc.location_id = sl.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (movement_type) {
      query += ` AND sm.movement_type = $${paramCount}`;
      params.push(movement_type);
      paramCount++;
    }

    if (condition) {
      query += ` AND sm.condition = $${paramCount}`;
      params.push(condition);
      paramCount++;
    }

    if (tool_master_id) {
      query += ` AND si.tool_master_id = $${paramCount}`;
      params.push(parseInt(tool_master_id));
      paramCount++;
    }

    if (performed_by) {
      query += ` AND sm.performed_by = $${paramCount}`;
      params.push(parseInt(performed_by));
      paramCount++;
    }

    if (date_from) {
      query += ` AND sm.performed_at >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      query += ` AND sm.performed_at <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    // Get total count
    const countQuery = query.replace(/SELECT[\s\S]*FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    query += ` ORDER BY sm.performed_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit));
    params.push(parseInt(offset));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching all movements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch movements',
      message: error.message
    });
  }
};

/**
 * Get single movement by ID
 * GET /api/stock-movements/:id
 */
exports.getMovementById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        sm.*,
        u.username as performed_by_username,
        si.item_type,
        tm.article_number,
        tm.tool_name,
        fc.name as from_compartment_name,
        tc.name as to_compartment_name
      FROM stock_movements sm
      LEFT JOIN users u ON u.id = sm.performed_by
      LEFT JOIN storage_items si ON si.id = sm.storage_item_id
      LEFT JOIN tool_master tm ON tm.id = si.tool_master_id
      LEFT JOIN storage_compartments fc ON fc.id = sm.from_compartment_id
      LEFT JOIN storage_compartments tc ON tc.id = sm.to_compartment_id
      WHERE sm.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Movement not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching movement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch movement',
      message: error.message
    });
  }
};

/**
 * Get movement statistics
 * GET /api/stock-movements/stats
 */
exports.getMovementStats = async (req, res) => {
  try {
    const { date_from, date_to, tool_master_id } = req.query;

    let whereClause = '1=1';
    const params = [];
    let paramCount = 1;

    if (tool_master_id) {
      whereClause += ` AND si.tool_master_id = $${paramCount}`;
      params.push(parseInt(tool_master_id));
      paramCount++;
    }

    if (date_from) {
      whereClause += ` AND sm.performed_at >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      whereClause += ` AND sm.performed_at <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    const query = `
      SELECT
        sm.movement_type,
        sm.condition,
        COUNT(*) as count,
        SUM(ABS(sm.quantity)) as total_quantity
      FROM stock_movements sm
      LEFT JOIN storage_items si ON si.id = sm.storage_item_id
      WHERE ${whereClause}
      GROUP BY sm.movement_type, sm.condition
      ORDER BY sm.movement_type, sm.condition
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching movement stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch movement statistics',
      message: error.message
    });
  }
};

module.exports = exports;
