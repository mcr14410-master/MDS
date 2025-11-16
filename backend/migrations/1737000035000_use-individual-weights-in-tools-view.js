/**
 * Migration: Use individual storage item weights in tools_with_stock VIEW
 * 
 * Changes:
 * - Use si.weight_new, si.weight_used, si.weight_reground from storage_items table
 * - Previously: Used hardcoded weights (new=1.0, used=0.5, reground=0.8)
 * - Now: Respects individual weight settings per storage item
 * 
 * Impact:
 * - EditStorageItemModal weight changes now affect effective_stock calculation
 * - Different storage items of same tool can have different weights
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Drop old view
  pgm.sql('DROP VIEW IF EXISTS tools_with_stock');
  
  // Recreate with INDIVIDUAL weights from storage_items
  pgm.sql(`
    CREATE VIEW tools_with_stock AS
    SELECT 
      -- All tool_master columns
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
      
      -- Effective stock using INDIVIDUAL weights per storage item
      -- CHANGED: Now uses si.weight_new, si.weight_used, si.weight_reground
      COALESCE(
        SUM(
          si.quantity_new * si.weight_new + 
          si.quantity_used * si.weight_used + 
          si.quantity_reground * si.weight_reground
        ),
        0
      ) as effective_stock,
      
      -- Storage locations (comma-separated)
      CASE 
        WHEN COUNT(DISTINCT sl.id) > 0 THEN
          STRING_AGG(
            DISTINCT COALESCE(sl.name || ' - ' || sc.name, sl.name),
            ', '
          )
        ELSE NULL
      END as storage_location,
      
      -- Low stock flag (uses reorder_point, enable_low_stock_alert, and INDIVIDUAL weights)
      -- CHANGED: Now uses individual weights in calculation
      CASE
        WHEN COUNT(si.id) > 0 
             AND BOOL_OR(si.enable_low_stock_alert) = true
             AND SUM(
               si.quantity_new * si.weight_new + 
               si.quantity_used * si.weight_used + 
               si.quantity_reground * si.weight_reground
             ) < COALESCE(MAX(si.reorder_point), 0)
        THEN true
        ELSE false
      END as is_low_stock,
      
      -- Reorder point (for display)
      MAX(si.reorder_point) as reorder_point,
      
      -- Min quantity (for reference)
      MIN(si.min_quantity) as min_quantity,
      
      -- Number of storage locations
      COUNT(DISTINCT sl.id) as storage_location_count
      
    FROM tool_master tm
    LEFT JOIN tool_categories tc ON tm.category_id = tc.id
    LEFT JOIN tool_subcategories ts ON tm.subcategory_id = ts.id
    LEFT JOIN users u ON tm.created_by = u.id
    LEFT JOIN storage_items si ON si.tool_master_id = tm.id 
                               AND si.deleted_at IS NULL 
                               AND si.is_active = true
    LEFT JOIN storage_compartments sc ON sc.id = si.compartment_id
    LEFT JOIN storage_locations sl ON sl.id = sc.location_id
    WHERE tm.deleted_at IS NULL
    GROUP BY 
      tm.id,
      tc.name,
      tc.icon,
      ts.name,
      u.username
  `);

  // Add comment
  pgm.sql(`
    COMMENT ON VIEW tools_with_stock IS 'Tools with aggregated storage items data. Uses INDIVIDUAL weight_new, weight_used, weight_reground values from each storage_item for effective_stock calculation. This allows different storage locations to use different weight factors.';
  `);
};

exports.down = (pgm) => {
  // Drop updated view
  pgm.sql('DROP VIEW IF EXISTS tools_with_stock');
  
  // Recreate previous view (with hardcoded weights)
  pgm.sql(`
    CREATE VIEW tools_with_stock AS
    SELECT 
      -- All tool_master columns
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
      
      -- Effective stock (hardcoded weights: new=1.0, used=0.5, reground=0.8)
      COALESCE(
        SUM(si.quantity_new * 1.0 + si.quantity_used * 0.5 + si.quantity_reground * 0.8),
        0
      ) as effective_stock,
      
      -- Storage locations (comma-separated)
      CASE 
        WHEN COUNT(DISTINCT sl.id) > 0 THEN
          STRING_AGG(
            DISTINCT COALESCE(sl.name || ' - ' || sc.name, sl.name),
            ', '
          )
        ELSE NULL
      END as storage_location,
      
      -- Low stock flag (uses reorder_point and enable_low_stock_alert)
      CASE
        WHEN COUNT(si.id) > 0 
             AND BOOL_OR(si.enable_low_stock_alert) = true
             AND SUM(si.quantity_new * 1.0 + si.quantity_used * 0.5 + si.quantity_reground * 0.8) < 
                 COALESCE(MAX(si.reorder_point), 0)
        THEN true
        ELSE false
      END as is_low_stock,
      
      -- Reorder point (for display)
      MAX(si.reorder_point) as reorder_point,
      
      -- Min quantity (for reference)
      MIN(si.min_quantity) as min_quantity,
      
      -- Number of storage locations
      COUNT(DISTINCT sl.id) as storage_location_count
      
    FROM tool_master tm
    LEFT JOIN tool_categories tc ON tm.category_id = tc.id
    LEFT JOIN tool_subcategories ts ON tm.subcategory_id = ts.id
    LEFT JOIN users u ON tm.created_by = u.id
    LEFT JOIN storage_items si ON si.tool_master_id = tm.id 
                               AND si.deleted_at IS NULL 
                               AND si.is_active = true
    LEFT JOIN storage_compartments sc ON sc.id = si.compartment_id
    LEFT JOIN storage_locations sl ON sl.id = sc.location_id
    WHERE tm.deleted_at IS NULL
    GROUP BY 
      tm.id,
      tc.name,
      tc.icon,
      ts.name,
      u.username
  `);
};
