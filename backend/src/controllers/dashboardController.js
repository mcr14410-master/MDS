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
// DASHBOARD STATS
// ============================================================================

/**
 * Get overall dashboard statistics
 * GET /api/dashboard/stats
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Get parts stats
    const partsQuery = `
      SELECT 
        COUNT(*) as total_parts,
        COUNT(*) FILTER (WHERE status = 'active') as active_parts,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_parts,
        COUNT(*) FILTER (WHERE status = 'archived') as archived_parts
      FROM parts
      WHERE status != 'deleted'
    `;

    // Get customers stats
    const customersQuery = `
      SELECT COUNT(*) as total_customers
      FROM customers
    `;

    // Get tools stats
    const toolsQuery = `
      SELECT 
        COUNT(*) as total_tools,
        COUNT(*) FILTER (WHERE is_active = true) as active_tools,
        COUNT(*) FILTER (WHERE is_low_stock = true) as low_stock_tools
      FROM tools_with_stock
    `;

    // Get storage items stats
    const storageQuery = `
      SELECT 
        COUNT(*) as total_storage_items,
        COUNT(*) FILTER (WHERE is_low_stock = true) as low_stock_items,
        SUM(total_quantity) as total_stock_quantity,
        SUM(effective_stock) as total_effective_stock
      FROM storage_items_with_stock
      WHERE item_type = 'tool'
    `;

    // Get recent stock movements count
    const movementsQuery = `
      SELECT COUNT(*) as recent_movements
      FROM stock_movements
      WHERE performed_at >= NOW() - INTERVAL '7 days'
    `;

    const [partsResult, customersResult, toolsResult, storageResult, movementsResult] = 
      await Promise.all([
        pool.query(partsQuery),
        pool.query(customersQuery),
        pool.query(toolsQuery),
        pool.query(storageQuery),
        pool.query(movementsQuery)
      ]);

    res.json({
      success: true,
      data: {
        parts: partsResult.rows[0],
        customers: customersResult.rows[0],
        tools: toolsResult.rows[0],
        storage: storageResult.rows[0],
        movements: movementsResult.rows[0]
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      message: error.message
    });
  }
};

/**
 * Get low stock items for dashboard widget
 * GET /api/dashboard/low-stock?limit=10
 */
exports.getLowStockItems = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const query = `
      SELECT
        si.id,
        si.item_type,
        si.tool_master_id,
        tm.article_number,
        tm.tool_name,
        tm.diameter,
        tm.material,
        tm.coating,
        tm.tool_category,
        tc.name as category_name,
        tc.icon as category_icon,
        ts.name as subcategory_name,
        si.quantity_new,
        si.quantity_used,
        si.quantity_reground,
        si.total_quantity,
        si.effective_stock,
        si.reorder_point,
        si.min_quantity,
        si.effective_stock_percent,
        si.location_name,
        si.compartment_name,
        -- Calculate stock status
        CASE
          WHEN si.min_quantity IS NOT NULL AND si.effective_stock <= si.min_quantity THEN 'critical'
          WHEN si.reorder_point IS NOT NULL AND si.effective_stock <= si.reorder_point THEN 'low'
          ELSE 'normal'
        END as stock_status,
        -- Days until critical (estimate based on average daily usage - simplified)
        CASE
          WHEN si.min_quantity IS NOT NULL AND si.effective_stock > si.min_quantity THEN
            ROUND((si.effective_stock - si.min_quantity) / GREATEST(
              (SELECT AVG(ABS(quantity)) FROM stock_movements 
               WHERE storage_item_id = si.id 
                 AND movement_type = 'issue' 
                 AND performed_at >= NOW() - INTERVAL '30 days'), 
              0.1
            ))
          ELSE 0
        END as estimated_days_remaining
      FROM storage_items_with_stock si
      LEFT JOIN tool_master tm ON tm.id = si.tool_master_id
      LEFT JOIN tool_categories tc ON tm.category_id = tc.id
      LEFT JOIN tool_subcategories ts ON tm.subcategory_id = ts.id
      WHERE si.is_low_stock = true
        AND si.item_type = 'tool'
        AND si.enable_low_stock_alert = true
      ORDER BY 
        CASE
          WHEN si.min_quantity IS NOT NULL AND si.effective_stock <= si.min_quantity THEN 1
          WHEN si.reorder_point IS NOT NULL AND si.effective_stock <= si.reorder_point THEN 2
          ELSE 3
        END,
        si.effective_stock_percent ASC,
        si.effective_stock ASC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch low stock items',
      message: error.message
    });
  }
};

/**
 * Get low stock summary (counts by status)
 * GET /api/dashboard/low-stock-summary
 */
exports.getLowStockSummary = async (req, res) => {
  try {
    const query = `
      SELECT
        COUNT(*) FILTER (
          WHERE si.min_quantity IS NOT NULL 
            AND si.effective_stock <= si.min_quantity
        ) as critical_count,
        COUNT(*) FILTER (
          WHERE si.reorder_point IS NOT NULL 
            AND si.effective_stock <= si.reorder_point
            AND (si.min_quantity IS NULL OR si.effective_stock > si.min_quantity)
        ) as low_count,
        COUNT(*) as total_low_stock_count,
        COUNT(DISTINCT si.tool_master_id) as affected_tools_count
      FROM storage_items_with_stock si
      WHERE si.is_low_stock = true
        AND si.item_type = 'tool'
        AND si.enable_low_stock_alert = true
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching low stock summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch low stock summary',
      message: error.message
    });
  }
};

/**
 * Get recent stock movements for dashboard
 * GET /api/dashboard/recent-movements?limit=5
 */
exports.getRecentMovements = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const query = `
      SELECT
        sm.id,
        sm.movement_type,
        sm.condition,
        sm.quantity,
        sm.performed_at,
        u.username as performed_by_username,
        tm.article_number,
        tm.tool_name,
        sc.name as compartment_name,
        sl.name as location_name
      FROM stock_movements sm
      LEFT JOIN users u ON u.id = sm.performed_by
      LEFT JOIN storage_items si ON si.id = sm.storage_item_id
      LEFT JOIN tool_master tm ON tm.id = si.tool_master_id
      LEFT JOIN storage_compartments sc ON sc.id = si.compartment_id
      LEFT JOIN storage_locations sl ON sl.id = sc.location_id
      ORDER BY sm.performed_at DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching recent movements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent movements',
      message: error.message
    });
  }
};

module.exports = exports;
