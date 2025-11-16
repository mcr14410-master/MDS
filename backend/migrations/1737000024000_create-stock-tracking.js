/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ============================================================================
  // 1. CREATE storage_items (komplett neu mit Condition Tracking)
  // ============================================================================
  
  pgm.createTable('storage_items', {
    id: 'id',
    
    // Item Type & Reference
    item_type: {
      type: 'varchar(50)',
      notNull: true,
      comment: 'tool, insert, accessory'
    },
    tool_master_id: {
      type: 'integer',
      references: 'tool_master',
      onDelete: 'CASCADE',
      comment: 'Referenz zu tool_master'
    },
    
    // Storage Location
    compartment_id: {
      type: 'integer',
      notNull: true,
      references: 'storage_compartments',
      onDelete: 'RESTRICT',
      comment: 'Lagerort (Fach)'
    },
    
    // CONDITION-BASED QUANTITIES
    quantity_new: {
      type: 'decimal(10,2)',
      notNull: true,
      default: 0,
      comment: 'Anzahl neuer Werkzeuge'
    },
    quantity_used: {
      type: 'decimal(10,2)',
      notNull: true,
      default: 0,
      comment: 'Anzahl gebrauchter Werkzeuge'
    },
    quantity_reground: {
      type: 'decimal(10,2)',
      notNull: true,
      default: 0,
      comment: 'Anzahl nachgeschliffener Werkzeuge'
    },
    
    // WEIGHTS for Effective Stock Calculation
    weight_new: {
      type: 'decimal(3,2)',
      notNull: true,
      default: 1.0,
      comment: 'Gewichtung für neue Werkzeuge (1.0 = 100%)'
    },
    weight_used: {
      type: 'decimal(3,2)',
      notNull: true,
      default: 0.5,
      comment: 'Gewichtung für gebrauchte Werkzeuge (0.5 = 50%)'
    },
    weight_reground: {
      type: 'decimal(3,2)',
      notNull: true,
      default: 0.8,
      comment: 'Gewichtung für nachgeschliffene Werkzeuge (0.8 = 80%)'
    },
    
    // INVENTORY CONTROL
    min_quantity: {
      type: 'decimal(10,2)',
      comment: 'Mindestbestand'
    },
    reorder_point: {
      type: 'decimal(10,2)',
      comment: 'Bestellpunkt (effektiver Bestand)'
    },
    max_quantity: {
      type: 'decimal(10,2)',
      comment: 'Maximalbestand'
    },
    enable_low_stock_alert: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'Low-Stock Alarm aktiviert?'
    },
    
    // Status & Metadata
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true
    },
    notes: {
      type: 'text'
    },
    
    // Audit
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

  // Unique Constraint: Ein Tool kann nur einmal pro Compartment sein
  pgm.addConstraint('storage_items', 'unique_tool_per_compartment', {
    unique: ['tool_master_id', 'compartment_id']
  });

  // Check Constraints
  pgm.addConstraint('storage_items', 'check_quantities_positive', {
    check: 'quantity_new >= 0 AND quantity_used >= 0 AND quantity_reground >= 0'
  });

  pgm.addConstraint('storage_items', 'check_weights_valid', {
    check: 'weight_new >= 0 AND weight_new <= 1 AND weight_used >= 0 AND weight_used <= 1 AND weight_reground >= 0 AND weight_reground <= 1'
  });

  pgm.addConstraint('storage_items', 'check_item_type', {
    check: "item_type IN ('tool', 'insert', 'accessory')"
  });

  // Indexes
  pgm.createIndex('storage_items', 'item_type');
  pgm.createIndex('storage_items', 'tool_master_id');
  pgm.createIndex('storage_items', 'compartment_id');
  pgm.createIndex('storage_items', 'is_active');

  // ============================================================================
  // 2. CREATE stock_movements
  // ============================================================================

  pgm.createTable('stock_movements', {
    id: 'id',

    // Reference to storage item
    storage_item_id: {
      type: 'integer',
      notNull: true,
      references: 'storage_items',
      onDelete: 'CASCADE',
      comment: 'Referenz zum Storage Item'
    },

    // Movement Type
    movement_type: {
      type: 'varchar(50)',
      notNull: true,
      comment: 'issue, receipt, transfer, adjustment, scrap'
    },

    // Condition
    condition: {
      type: 'varchar(50)',
      notNull: true,
      comment: 'new, used, reground'
    },

    // Quantity
    quantity: {
      type: 'decimal(10,2)',
      notNull: true,
      comment: 'Menge (positiv oder negativ)'
    },
    quantity_before: {
      type: 'decimal(10,2)',
      comment: 'Bestand vorher'
    },
    quantity_after: {
      type: 'decimal(10,2)',
      comment: 'Bestand nachher'
    },

    // Transfer-specific (optional)
    from_compartment_id: {
      type: 'integer',
      references: 'storage_compartments',
      onDelete: 'SET NULL',
      comment: 'Von Lagerort (bei Transfer)'
    },
    to_compartment_id: {
      type: 'integer',
      references: 'storage_compartments',
      onDelete: 'SET NULL',
      comment: 'Zu Lagerort (bei Transfer)'
    },

    // Reference to external system (optional)
    reference_type: {
      type: 'varchar(50)',
      comment: 'tool_list, purchase_order, production_order, manual, etc.'
    },
    reference_id: {
      type: 'integer',
      comment: 'ID des referenzierten Objekts'
    },

    // Reason & Notes
    reason: {
      type: 'text',
      comment: 'Grund für die Bewegung'
    },
    notes: {
      type: 'text',
      comment: 'Zusätzliche Notizen'
    },

    // Performed by
    performed_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL',
      comment: 'Durchgeführt von User'
    },
    performed_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
      comment: 'Durchgeführt am'
    },

    // Audit
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Indexes for stock_movements
  pgm.createIndex('stock_movements', 'storage_item_id');
  pgm.createIndex('stock_movements', 'movement_type');
  pgm.createIndex('stock_movements', 'condition');
  pgm.createIndex('stock_movements', 'performed_at');
  pgm.createIndex('stock_movements', ['reference_type', 'reference_id']);

  // Constraints for stock_movements
  pgm.addConstraint('stock_movements', 'check_movement_type', {
    check: "movement_type IN ('issue', 'receipt', 'transfer', 'adjustment', 'scrap')"
  });

  pgm.addConstraint('stock_movements', 'check_condition', {
    check: "condition IN ('new', 'used', 'reground')"
  });

  // ============================================================================
  // 3. CREATE VIEW storage_items_with_stock
  // ============================================================================

  pgm.createView('storage_items_with_stock', {}, `
    SELECT
      si.*,
      (si.quantity_new + si.quantity_used + si.quantity_reground) AS total_quantity,
      (si.quantity_new * si.weight_new +
       si.quantity_used * si.weight_used +
       si.quantity_reground * si.weight_reground) AS effective_quantity,
      CASE
        WHEN si.enable_low_stock_alert = true AND
             si.reorder_point IS NOT NULL AND
             (si.quantity_new * si.weight_new +
              si.quantity_used * si.weight_used +
              si.quantity_reground * si.weight_reground) < si.reorder_point
        THEN true
        ELSE false
      END AS is_low_stock
    FROM storage_items si
  `);

  // Comments
  pgm.sql(`
    COMMENT ON TABLE storage_items IS 'Storage Items mit Condition-based Tracking';
    COMMENT ON TABLE stock_movements IS 'Alle Lagerbewegungen mit Audit Trail';
    COMMENT ON VIEW storage_items_with_stock IS 'Storage Items mit berechneten Beständen (total, effective, low_stock)';
  `);
};

exports.down = (pgm) => {
  // Drop view first
  pgm.dropView('storage_items_with_stock', { ifExists: true });

  // Drop stock_movements table
  pgm.dropTable('stock_movements', { ifExists: true, cascade: true });

  // Drop storage_items table
  pgm.dropTable('storage_items', { ifExists: true, cascade: true });
};
