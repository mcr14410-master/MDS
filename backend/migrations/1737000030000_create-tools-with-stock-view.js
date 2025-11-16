/**
 * Migration: Create tools_with_stock VIEW
 * 
 * Aggregates storage items data with tools for efficient querying
 * Includes:
 * - Stock by condition (new, used, reground)
 * - Effective stock (weighted)
 * - Storage locations
 * - Low stock warning flag
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE VIEW tools_with_stock AS
    SELECT 
      -- All tool_master columns (use tm.* to avoid listing non-existent columns)
      tm.*,
      
      -- Category info
      tc.name as category_name,
      tc.icon as category_icon,
      ts.name as subcategory_name,
      u.username as created_by_username,
      
      -- Stock aggregations
      COALESCE(SUM(si.quantity_new), 0) as stock_new,
      COALESCE(SUM(si.quantity_used), 0) as stock_used,
      COALESCE(SUM(si.quantity_reground), 0) as stock_reground,
      
      -- Total stock
      COALESCE(SUM(si.quantity_new + si.quantity_used + si.quantity_reground), 0) as total_stock,
      
      -- Effective stock (weighted: new=1.0, used=0.8, reground=0.6)
      COALESCE(
        SUM(si.quantity_new * 1.0 + si.quantity_used * 0.8 + si.quantity_reground * 0.6),
        0
      ) as effective_stock,
      
      -- Storage locations (comma-separated, first 3)
      CASE 
        WHEN COUNT(DISTINCT sl.id) > 0 THEN
          STRING_AGG(
            DISTINCT COALESCE(sl.name || ' - ' || sc.name, sl.name),
            ', '
          )
        ELSE NULL
      END as storage_location,
      
      -- Low stock flag (based on effective stock and min_quantity from storage_items)
      CASE
        WHEN COUNT(si.id) > 0 AND 
             SUM(si.quantity_new * 1.0 + si.quantity_used * 0.8 + si.quantity_reground * 0.6) < 
             COALESCE(MIN(si.min_quantity), 5) 
        THEN true
        ELSE false
      END as is_low_stock,
      
      -- Minimum stock threshold
      MIN(si.min_quantity) as min_stock_threshold,
      
      -- Number of storage locations
      COUNT(DISTINCT sl.id) as storage_location_count
      
    FROM tool_master tm
    LEFT JOIN tool_categories tc ON tm.category_id = tc.id
    LEFT JOIN tool_subcategories ts ON tm.subcategory_id = ts.id
    LEFT JOIN users u ON tm.created_by = u.id
    LEFT JOIN storage_items si ON si.tool_master_id = tm.id 
                               AND si.is_deleted = false 
                               AND si.is_active = true
    LEFT JOIN storage_compartments sc ON sc.id = si.compartment_id
    LEFT JOIN storage_locations sl ON sl.id = sc.location_id
    WHERE tm.is_deleted = false
    GROUP BY 
      tm.id,
      tc.name,
      tc.icon,
      ts.name,
      u.username
  `);

  // Add comment
  pgm.sql(`
    COMMENT ON VIEW tools_with_stock IS 'Tools with aggregated storage items data including stock levels and locations';
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP VIEW IF EXISTS tools_with_stock');
};
