/**
 * Migration: Tool Number Lists System + article_number Rename
 * Phase 5 of Tool Management Roadmap
 * 
 * Creates tables for managing T-Number definitions and their mapping to tools.
 * Also renames tool_number → article_number in tool_master.
 * 
 * Tables:
 * - tool_number_lists: List containers (e.g. "Standard-Fräsen", "Aluminium-Spezial")
 * - tool_number_list_items: T-Numbers with preferred tool
 * - tool_number_alternatives: Alternative tools per T-Number
 * - machine_tool_number_lists: Many-to-Many assignment Lists ↔ Machines
 * 
 * Modifications:
 * - tool_master: RENAME tool_number → article_number
 * - tool_list_items: ADD tool_master_id (link to inventory)
 */

exports.up = async (pgm) => {
  // ============================================================================
  // STEP 1: Rename tool_number → article_number in tool_master
  // ============================================================================
  pgm.renameColumn('tool_master', 'tool_number', 'article_number');
  
  // Update comment
  pgm.sql(`
    COMMENT ON COLUMN tool_master.article_number IS 
      'Manufacturer article/part number (was: tool_number). T-Numbers are managed via tool_number_lists.';
  `);

  // ============================================================================
  // STEP 2: Create tool_number_lists (List Container)
  // ============================================================================
  pgm.createTable('tool_number_lists', {
    id: { type: 'serial', primaryKey: true },
    name: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
      comment: 'List name (e.g. "Standard-Fräsen", "Aluminium-Spezial")'
    },
    description: {
      type: 'text',
      comment: 'Description of the list purpose'
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true
    },
    created_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  pgm.createIndex('tool_number_lists', 'name');
  pgm.createIndex('tool_number_lists', 'is_active');

  // ============================================================================
  // STEP 3: Create tool_number_list_items (T-Numbers within a List)
  // ============================================================================
  pgm.createTable('tool_number_list_items', {
    id: { type: 'serial', primaryKey: true },
    list_id: {
      type: 'integer',
      notNull: true,
      references: 'tool_number_lists',
      onDelete: 'CASCADE'
    },
    tool_number: {
      type: 'varchar(50)',
      notNull: true,
      comment: 'T-Number from NC program (e.g. T113, T5, T22)'
    },
    description: {
      type: 'varchar(255)',
      comment: 'Description (e.g. "Fräser D10 Z2")'
    },
    preferred_tool_master_id: {
      type: 'integer',
      references: 'tool_master',
      onDelete: 'SET NULL',
      comment: 'Preferred tool for this T-Number'
    },
    notes: {
      type: 'text'
    },
    sequence: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Sort order'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Unique constraint: T-Number unique per list
  pgm.addConstraint('tool_number_list_items', 'unique_tnumber_per_list', {
    unique: ['list_id', 'tool_number']
  });

  pgm.createIndex('tool_number_list_items', 'list_id');
  pgm.createIndex('tool_number_list_items', 'tool_number');
  pgm.createIndex('tool_number_list_items', 'preferred_tool_master_id');
  pgm.createIndex('tool_number_list_items', ['list_id', 'sequence']);

  // ============================================================================
  // STEP 4: Create tool_number_alternatives (Alternative Tools per T-Number)
  // ============================================================================
  pgm.createTable('tool_number_alternatives', {
    id: { type: 'serial', primaryKey: true },
    list_item_id: {
      type: 'integer',
      notNull: true,
      references: 'tool_number_list_items',
      onDelete: 'CASCADE'
    },
    tool_master_id: {
      type: 'integer',
      notNull: true,
      references: 'tool_master',
      onDelete: 'CASCADE'
    },
    priority: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Priority: 0=first alternative, 1=second, etc.'
    },
    notes: {
      type: 'text'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Unique constraint: Tool unique per list item
  pgm.addConstraint('tool_number_alternatives', 'unique_alt_per_item', {
    unique: ['list_item_id', 'tool_master_id']
  });

  pgm.createIndex('tool_number_alternatives', 'list_item_id');
  pgm.createIndex('tool_number_alternatives', 'tool_master_id');
  pgm.createIndex('tool_number_alternatives', ['list_item_id', 'priority']);

  // ============================================================================
  // STEP 5: Create machine_tool_number_lists (Many-to-Many: Machines ↔ Lists)
  // ============================================================================
  pgm.createTable('machine_tool_number_lists', {
    id: { type: 'serial', primaryKey: true },
    machine_id: {
      type: 'integer',
      notNull: true,
      references: 'machines',
      onDelete: 'CASCADE'
    },
    list_id: {
      type: 'integer',
      notNull: true,
      references: 'tool_number_lists',
      onDelete: 'CASCADE'
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
      comment: 'Is this list active for this machine?'
    },
    assigned_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    assigned_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Unique constraint: Machine + List combination
  pgm.addConstraint('machine_tool_number_lists', 'unique_machine_list', {
    unique: ['machine_id', 'list_id']
  });

  pgm.createIndex('machine_tool_number_lists', 'machine_id');
  pgm.createIndex('machine_tool_number_lists', 'list_id');
  pgm.createIndex('machine_tool_number_lists', 'is_active');

  // ============================================================================
  // STEP 6: Add tool_master_id to tool_list_items (existing table)
  // ============================================================================
  pgm.addColumn('tool_list_items', {
    tool_master_id: {
      type: 'integer',
      references: 'tool_master',
      onDelete: 'SET NULL',
      comment: 'Optional: Link to tool master data. If set, data is pulled from tool_master.'
    }
  });

  pgm.createIndex('tool_list_items', 'tool_master_id');

  // ============================================================================
  // STEP 7: Table Comments
  // ============================================================================
  pgm.sql(`
    COMMENT ON TABLE tool_number_lists IS 'Lists with T-Number definitions (e.g. Standard-Fräsen)';
    COMMENT ON TABLE tool_number_list_items IS 'T-Numbers with preferred tool within a list';
    COMMENT ON TABLE tool_number_alternatives IS 'Alternative tools for T-Numbers';
    COMMENT ON TABLE machine_tool_number_lists IS 'Assignment of lists to machines (activatable)';
  `);

  // ============================================================================
  // STEP 8: Update views that reference tool_number
  // ============================================================================
  
  // Drop and recreate tools_with_stock view
  // The view uses tm.* so it automatically picks up the renamed column
  pgm.sql(`DROP VIEW IF EXISTS tools_with_stock;`);
  
  pgm.sql(`
    CREATE VIEW tools_with_stock AS
    SELECT 
      -- All tool_master columns (now includes article_number instead of tool_number)
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
      
      -- Low stock flag
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

  pgm.sql(`COMMENT ON VIEW tools_with_stock IS 'Tools with aggregated stock data. article_number replaces tool_number (Phase 5).';`);
};

exports.down = async (pgm) => {
  // Drop view first
  pgm.sql(`DROP VIEW IF EXISTS tools_with_stock;`);
  
  // Remove tool_master_id from tool_list_items
  pgm.dropColumn('tool_list_items', 'tool_master_id');
  
  // Drop new tables in reverse order
  pgm.dropTable('machine_tool_number_lists');
  pgm.dropTable('tool_number_alternatives');
  pgm.dropTable('tool_number_list_items');
  pgm.dropTable('tool_number_lists');
  
  // Rename article_number back to tool_number
  pgm.renameColumn('tool_master', 'article_number', 'tool_number');
  
  // Recreate view with old column name (same structure as before)
  pgm.sql(`
    CREATE VIEW tools_with_stock AS
    SELECT 
      tm.*,
      tc.name as category_name,
      tc.icon as category_icon,
      ts.name as subcategory_name,
      u.username as created_by_username,
      COALESCE(SUM(si.quantity_new), 0) as stock_new,
      COALESCE(SUM(si.quantity_used), 0) as stock_used,
      COALESCE(SUM(si.quantity_reground), 0) as stock_reground,
      COALESCE(SUM(si.quantity_new + si.quantity_used + si.quantity_reground), 0) as total_stock,
      COALESCE(
        SUM(
          si.quantity_new * si.weight_new + 
          si.quantity_used * si.weight_used + 
          si.quantity_reground * si.weight_reground
        ),
        0
      ) as effective_stock,
      CASE 
        WHEN COUNT(DISTINCT sl.id) > 0 THEN
          STRING_AGG(
            DISTINCT COALESCE(sl.name || ' - ' || sc.name, sl.name),
            ', '
          )
        ELSE NULL
      END as storage_location,
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
      MAX(si.reorder_point) as reorder_point,
      MIN(si.min_quantity) as min_quantity,
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
