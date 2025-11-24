/* eslint-disable camelcase */

/**
 * Migration: Create Purchase Orders System
 * 
 * Bestellwesen für Werkzeuge und andere Lagerartikel
 * - Bestellungen bei Lieferanten erstellen
 * - Status-Workflow (draft → sent → received)
 * - Wareneingang buchen
 * - Stock Movements Integration
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ============================================================================
  // 0. CREATE update_updated_at_column function (if not exists)
  // ============================================================================
  
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);
  
  // ============================================================================
  // 1. CREATE purchase_orders
  // ============================================================================
  
  pgm.createTable('purchase_orders', {
    id: 'id',
    
    // Order Number (auto-generated)
    order_number: {
      type: 'varchar(50)',
      notNull: true,
      unique: true,
      comment: 'Bestellnummer (z.B. PO-2025-0001)'
    },
    
    // Supplier
    supplier_id: {
      type: 'integer',
      notNull: true,
      references: 'suppliers',
      onDelete: 'RESTRICT',
      comment: 'Lieferant'
    },
    
    // Status
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'draft',
      comment: 'draft, sent, confirmed, partially_received, received, cancelled'
    },
    
    // Dates
    order_date: {
      type: 'date',
      notNull: true,
      default: pgm.func('CURRENT_DATE'),
      comment: 'Bestelldatum'
    },
    expected_delivery_date: {
      type: 'date',
      comment: 'Erwartetes Lieferdatum'
    },
    actual_delivery_date: {
      type: 'date',
      comment: 'Tatsächliches Lieferdatum'
    },
    sent_date: {
      type: 'date',
      comment: 'Datum Versendung an Lieferant'
    },
    
    // Totals (in cents to avoid floating point issues)
    total_amount: {
      type: 'decimal(12,2)',
      default: 0,
      comment: 'Gesamtsumme'
    },
    currency: {
      type: 'varchar(3)',
      default: 'EUR',
      comment: 'Währung (EUR, USD, etc.)'
    },
    
    // Notes
    notes: {
      type: 'text',
      comment: 'Bestellnotizen'
    },
    internal_notes: {
      type: 'text',
      comment: 'Interne Notizen (nicht für Lieferant)'
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
  
  // Indexes
  pgm.createIndex('purchase_orders', 'order_number');
  pgm.createIndex('purchase_orders', 'supplier_id');
  pgm.createIndex('purchase_orders', 'status');
  pgm.createIndex('purchase_orders', 'order_date');
  pgm.createIndex('purchase_orders', ['status', 'order_date']);
  
  // ============================================================================
  // 2. CREATE purchase_order_items
  // ============================================================================
  
  pgm.createTable('purchase_order_items', {
    id: 'id',
    
    // Order Reference
    purchase_order_id: {
      type: 'integer',
      notNull: true,
      references: 'purchase_orders',
      onDelete: 'CASCADE'
    },
    
    // Item Reference
    storage_item_id: {
      type: 'integer',
      notNull: true,
      references: 'storage_items',
      onDelete: 'RESTRICT',
      comment: 'Referenz zu Storage Item'
    },
    
    // Position
    line_number: {
      type: 'integer',
      notNull: true,
      comment: 'Positionsnummer'
    },
    
    // Quantities
    quantity_ordered: {
      type: 'decimal(10,2)',
      notNull: true,
      comment: 'Bestellte Menge'
    },
    quantity_received: {
      type: 'decimal(10,2)',
      notNull: true,
      default: 0,
      comment: 'Erhaltene Menge'
    },
    unit: {
      type: 'varchar(20)',
      notNull: true,
      default: 'pieces',
      comment: 'Einheit (pieces, meters, kg, etc.)'
    },
    
    // Pricing
    unit_price: {
      type: 'decimal(12,2)',
      notNull: true,
      comment: 'Stückpreis'
    },
    line_total: {
      type: 'decimal(12,2)',
      notNull: true,
      comment: 'Zeilensumme (quantity × unit_price)'
    },
    
    // Receiving Info
    condition_received: {
      type: 'varchar(50)',
      default: 'new',
      comment: 'Zustand bei Wareneingang (new, used, reground)'
    },
    
    // Notes
    notes: {
      type: 'text',
      comment: 'Positionsnotizen'
    },
    
    // Audit
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
  
  // Indexes
  pgm.createIndex('purchase_order_items', 'purchase_order_id');
  pgm.createIndex('purchase_order_items', 'storage_item_id');
  pgm.createIndex('purchase_order_items', ['purchase_order_id', 'line_number']);
  
  // Unique constraint: One line_number per order
  pgm.addConstraint('purchase_order_items', 'unique_line_per_order', {
    unique: ['purchase_order_id', 'line_number']
  });
  
  // Check constraint: Received <= Ordered
  pgm.addConstraint('purchase_order_items', 'check_received_quantity', {
    check: 'quantity_received <= quantity_ordered'
  });
  
  // ============================================================================
  // 3. CREATE FUNCTION: Generate Order Number
  // ============================================================================
  
  pgm.createFunction(
    'generate_order_number',
    [],
    {
      returns: 'varchar(50)',
      language: 'plpgsql',
      replace: true
    },
    `
    DECLARE
      next_number INTEGER;
      year_part VARCHAR(4);
      order_num VARCHAR(50);
    BEGIN
      -- Get current year
      year_part := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
      
      -- Get next number for this year
      SELECT COALESCE(MAX(
        CAST(SUBSTRING(order_number FROM 9) AS INTEGER)
      ), 0) + 1
      INTO next_number
      FROM purchase_orders
      WHERE order_number LIKE 'PO-' || year_part || '-%';
      
      -- Format: PO-YYYY-NNNN (e.g. PO-2025-0001)
      order_num := 'PO-' || year_part || '-' || LPAD(next_number::TEXT, 4, '0');
      
      RETURN order_num;
    END;
    `
  );
  
  // ============================================================================
  // 4. CREATE TRIGGER: Auto-generate order_number
  // ============================================================================
  
  pgm.createFunction(
    'set_order_number',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true
    },
    `
    BEGIN
      IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := generate_order_number();
      END IF;
      RETURN NEW;
    END;
    `
  );
  
  pgm.createTrigger('purchase_orders', 'set_order_number_trigger', {
    when: 'BEFORE',
    operation: 'INSERT',
    function: 'set_order_number',
    level: 'ROW'
  });
  
  // ============================================================================
  // 5. CREATE TRIGGER: Update updated_at
  // ============================================================================
  
  pgm.createTrigger('purchase_orders', 'update_purchase_orders_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW'
  });
  
  pgm.createTrigger('purchase_order_items', 'update_purchase_order_items_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW'
  });
};

exports.down = (pgm) => {
  // Drop triggers
  pgm.dropTrigger('purchase_order_items', 'update_purchase_order_items_updated_at', { ifExists: true });
  pgm.dropTrigger('purchase_orders', 'update_purchase_orders_updated_at', { ifExists: true });
  pgm.dropTrigger('purchase_orders', 'set_order_number_trigger', { ifExists: true });
  
  // Drop functions
  pgm.dropFunction('set_order_number', [], { ifExists: true });
  pgm.dropFunction('generate_order_number', [], { ifExists: true });
  
  // Drop tables
  pgm.dropTable('purchase_order_items', { ifExists: true, cascade: true });
  pgm.dropTable('purchase_orders', { ifExists: true, cascade: true });
};
