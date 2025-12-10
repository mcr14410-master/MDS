/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ============================================================================
  // 1. CONSUMABLE CATEGORIES (Verbrauchsmaterial-Kategorien)
  // ============================================================================
  pgm.createTable('consumable_categories', {
    id: 'id',

    name: {
      type: 'varchar(100)',
      notNull: true,
      unique: true,
      comment: 'Name der Kategorie (z.B. "Kühlschmierstoffe")'
    },
    description: {
      type: 'text',
      comment: 'Beschreibung der Kategorie'
    },
    icon: {
      type: 'varchar(50)',
      comment: 'Icon-Name für UI (z.B. "droplet", "oil-can")'
    },
    color: {
      type: 'varchar(20)',
      comment: 'Farbe für UI (z.B. "blue", "orange")'
    },
    sequence: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Sortier-Reihenfolge'
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

  pgm.createIndex('consumable_categories', 'sequence');
  pgm.createIndex('consumable_categories', 'is_active');

  // ============================================================================
  // 2. CONSUMABLES (Verbrauchsmaterial-Stammdaten)
  // ============================================================================
  pgm.createTable('consumables', {
    id: 'id',

    // Identifikation
    article_number: {
      type: 'varchar(50)',
      unique: true,
      comment: 'Interne Artikel-Nummer'
    },
    name: {
      type: 'varchar(200)',
      notNull: true,
      comment: 'Artikelbezeichnung'
    },
    category_id: {
      type: 'integer',
      notNull: true,
      references: 'consumable_categories',
      onDelete: 'RESTRICT',
      comment: 'Kategorie'
    },
    description: {
      type: 'text',
      comment: 'Detaillierte Beschreibung'
    },

    // Einheiten (Option B)
    base_unit: {
      type: 'varchar(20)',
      notNull: true,
      comment: 'Basiseinheit (Liter, kg, Stück, m, m²)'
    },
    package_type: {
      type: 'varchar(50)',
      comment: 'Gebindeart (Kanister, Dose, Spray, Rolle, Packung, Fass, Karton)'
    },
    package_size: {
      type: 'decimal(10,3)',
      comment: 'Gebindegröße in Basiseinheit'
    },

    // Haltbarkeit
    has_expiry: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'Hat Mindesthaltbarkeitsdatum?'
    },
    shelf_life_months: {
      type: 'integer',
      comment: 'Haltbarkeit in Monaten (für MHD-Berechnung bei Wareneingang)'
    },

    // Gefahrstoff & Lagerung
    is_hazardous: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'Ist Gefahrstoff?'
    },
    hazard_symbols: {
      type: 'varchar(100)',
      comment: 'Gefahrensymbole (z.B. "GHS02,GHS07")'
    },
    storage_requirements: {
      type: 'text',
      comment: 'Lagerhinweise (kühl, trocken, frostfrei, etc.)'
    },

    // Lieferant
    supplier_id: {
      type: 'integer',
      references: 'suppliers',
      onDelete: 'SET NULL',
      comment: 'Hauptlieferant'
    },
    supplier_article_number: {
      type: 'varchar(100)',
      comment: 'Artikel-Nr. beim Lieferanten'
    },
    manufacturer: {
      type: 'varchar(100)',
      comment: 'Hersteller'
    },
    manufacturer_article_number: {
      type: 'varchar(100)',
      comment: 'Hersteller Artikel-Nr.'
    },

    // Preis
    unit_price: {
      type: 'decimal(10,2)',
      comment: 'Preis pro Basiseinheit (EUR)'
    },
    package_price: {
      type: 'decimal(10,2)',
      comment: 'Preis pro Gebinde (EUR)'
    },

    // Status
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true
    },
    is_deleted: {
      type: 'boolean',
      notNull: true,
      default: false
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

  pgm.createIndex('consumables', 'article_number');
  pgm.createIndex('consumables', 'name');
  pgm.createIndex('consumables', 'category_id');
  pgm.createIndex('consumables', 'supplier_id');
  pgm.createIndex('consumables', 'is_active');
  pgm.createIndex('consumables', 'is_deleted');
  pgm.createIndex('consumables', 'is_hazardous');

  // Check Constraint für base_unit
  pgm.addConstraint('consumables', 'check_base_unit', {
    check: "base_unit IN ('Liter', 'ml', 'kg', 'g', 'Stück', 'm', 'm²', 'Rolle', 'Paar')"
  });

  // ============================================================================
  // 3. CONSUMABLE STOCK (Bestand pro Lagerort)
  // ============================================================================
  pgm.createTable('consumable_stock', {
    id: 'id',

    consumable_id: {
      type: 'integer',
      notNull: true,
      references: 'consumables',
      onDelete: 'CASCADE',
      comment: 'Referenz zum Verbrauchsmaterial'
    },
    compartment_id: {
      type: 'integer',
      notNull: true,
      references: 'storage_compartments',
      onDelete: 'RESTRICT',
      comment: 'Lagerort (Fach)'
    },

    // Bestand
    quantity: {
      type: 'decimal(10,3)',
      notNull: true,
      default: 0,
      comment: 'Aktueller Bestand in Basiseinheit'
    },

    // Chargen/MHD (optional)
    batch_number: {
      type: 'varchar(50)',
      comment: 'Chargen-/Losnummer'
    },
    expiry_date: {
      type: 'date',
      comment: 'Mindesthaltbarkeitsdatum'
    },

    // Bestandskontrolle
    min_quantity: {
      type: 'decimal(10,3)',
      comment: 'Mindestbestand in Basiseinheit'
    },
    reorder_quantity: {
      type: 'decimal(10,3)',
      comment: 'Bestellmenge in Basiseinheit'
    },
    max_quantity: {
      type: 'decimal(10,3)',
      comment: 'Maximalbestand'
    },
    enable_low_stock_alert: {
      type: 'boolean',
      notNull: true,
      default: true,
      comment: 'Warnung bei Unterschreitung Mindestbestand'
    },
    enable_expiry_alert: {
      type: 'boolean',
      notNull: true,
      default: true,
      comment: 'Warnung bei ablaufendem MHD'
    },
    expiry_alert_days: {
      type: 'integer',
      default: 30,
      comment: 'Tage vor MHD für Warnung'
    },

    // Status
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

  pgm.createIndex('consumable_stock', 'consumable_id');
  pgm.createIndex('consumable_stock', 'compartment_id');
  pgm.createIndex('consumable_stock', 'expiry_date');
  pgm.createIndex('consumable_stock', 'is_active');

  // Unique: Ein Artikel kann pro Lagerort + Charge nur einmal vorkommen
  pgm.addConstraint('consumable_stock', 'unique_consumable_stock', {
    unique: ['consumable_id', 'compartment_id', 'batch_number']
  });

  pgm.addConstraint('consumable_stock', 'check_quantity_positive', {
    check: 'quantity >= 0'
  });

  // ============================================================================
  // 4. CONSUMABLE TRANSACTIONS (Bewegungen)
  // ============================================================================
  pgm.createTable('consumable_transactions', {
    id: 'id',

    consumable_stock_id: {
      type: 'integer',
      notNull: true,
      references: 'consumable_stock',
      onDelete: 'CASCADE',
      comment: 'Referenz zum Bestand'
    },

    // Bewegungsart
    transaction_type: {
      type: 'varchar(50)',
      notNull: true,
      comment: 'receipt, issue, adjustment, transfer, maintenance, scrap'
    },

    // Menge
    quantity: {
      type: 'decimal(10,3)',
      notNull: true,
      comment: 'Menge (positiv bei Eingang, negativ bei Ausgang)'
    },
    quantity_before: {
      type: 'decimal(10,3)',
      comment: 'Bestand vorher'
    },
    quantity_after: {
      type: 'decimal(10,3)',
      comment: 'Bestand nachher'
    },

    // Referenz (optional)
    reference_type: {
      type: 'varchar(50)',
      comment: 'maintenance_task, purchase_order, manual'
    },
    reference_id: {
      type: 'integer',
      comment: 'ID des referenzierten Objekts'
    },

    // Details
    reason: {
      type: 'text',
      comment: 'Grund/Verwendungszweck'
    },
    notes: {
      type: 'text'
    },

    // Durchgeführt
    performed_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    performed_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },

    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  pgm.createIndex('consumable_transactions', 'consumable_stock_id');
  pgm.createIndex('consumable_transactions', 'transaction_type');
  pgm.createIndex('consumable_transactions', 'performed_at');
  pgm.createIndex('consumable_transactions', ['reference_type', 'reference_id']);

  pgm.addConstraint('consumable_transactions', 'check_transaction_type', {
    check: "transaction_type IN ('receipt', 'issue', 'adjustment', 'transfer', 'maintenance', 'scrap')"
  });

  // ============================================================================
  // 5. CONSUMABLE DOCUMENTS (Dokumente: SDB, TDB, Bilder)
  // ============================================================================
  pgm.createTable('consumable_documents', {
    id: 'id',

    consumable_id: {
      type: 'integer',
      notNull: true,
      references: 'consumables',
      onDelete: 'CASCADE'
    },

    document_type: {
      type: 'varchar(50)',
      notNull: true,
      comment: 'sds (Sicherheitsdatenblatt), tds (Technisches Datenblatt), image, other'
    },
    title: {
      type: 'varchar(200)',
      comment: 'Titel/Beschreibung'
    },
    file_path: {
      type: 'varchar(500)',
      notNull: true
    },
    original_filename: {
      type: 'varchar(255)',
      notNull: true
    },
    mime_type: {
      type: 'varchar(100)'
    },
    file_size: {
      type: 'integer',
      comment: 'Dateigröße in Bytes'
    },
    is_primary: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'Hauptbild für Anzeige'
    },

    uploaded_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    uploaded_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  pgm.createIndex('consumable_documents', 'consumable_id');
  pgm.createIndex('consumable_documents', 'document_type');

  pgm.addConstraint('consumable_documents', 'check_document_type', {
    check: "document_type IN ('sds', 'tds', 'image', 'other')"
  });

  // ============================================================================
  // 6. VIEW: Consumables with Stock Summary
  // ============================================================================
  pgm.createView('consumables_with_stock', {}, `
    SELECT 
      c.*,
      cat.name AS category_name,
      cat.icon AS category_icon,
      cat.color AS category_color,
      s.name AS supplier_name,
      COALESCE(stock.total_quantity, 0) AS total_quantity,
      COALESCE(stock.stock_locations, 0) AS stock_locations,
      stock.earliest_expiry,
      CASE 
        WHEN stock.min_quantity IS NOT NULL 
             AND COALESCE(stock.total_quantity, 0) < stock.min_quantity 
        THEN true 
        ELSE false 
      END AS is_low_stock,
      CASE 
        WHEN stock.earliest_expiry IS NOT NULL 
             AND stock.earliest_expiry <= CURRENT_DATE + INTERVAL '30 days'
        THEN true 
        ELSE false 
      END AS is_expiring_soon
    FROM consumables c
    LEFT JOIN consumable_categories cat ON c.category_id = cat.id
    LEFT JOIN suppliers s ON c.supplier_id = s.id
    LEFT JOIN (
      SELECT 
        consumable_id,
        SUM(quantity) AS total_quantity,
        COUNT(*) AS stock_locations,
        MIN(expiry_date) AS earliest_expiry,
        MIN(min_quantity) AS min_quantity
      FROM consumable_stock
      WHERE is_active = true
      GROUP BY consumable_id
    ) stock ON c.id = stock.consumable_id
    WHERE c.is_deleted = false
  `);

  // ============================================================================
  // 7. VIEW: Low Stock Alerts
  // ============================================================================
  pgm.createView('consumable_low_stock_alerts', {}, `
    SELECT 
      cs.id AS stock_id,
      c.id AS consumable_id,
      c.article_number,
      c.name,
      c.base_unit,
      c.package_type,
      c.package_size,
      cat.name AS category_name,
      sl.name AS location_name,
      sc.name AS compartment_name,
      cs.quantity,
      cs.min_quantity,
      cs.reorder_quantity,
      (cs.min_quantity - cs.quantity) AS shortage
    FROM consumable_stock cs
    JOIN consumables c ON cs.consumable_id = c.id
    JOIN consumable_categories cat ON c.category_id = cat.id
    JOIN storage_compartments sc ON cs.compartment_id = sc.id
    JOIN storage_locations sl ON sc.location_id = sl.id
    WHERE cs.is_active = true
      AND cs.enable_low_stock_alert = true
      AND cs.min_quantity IS NOT NULL
      AND cs.quantity < cs.min_quantity
      AND c.is_deleted = false
      AND c.is_active = true
  `);

  // ============================================================================
  // 8. VIEW: Expiry Alerts
  // ============================================================================
  pgm.createView('consumable_expiry_alerts', {}, `
    SELECT 
      cs.id AS stock_id,
      c.id AS consumable_id,
      c.article_number,
      c.name,
      cat.name AS category_name,
      sl.name AS location_name,
      sc.name AS compartment_name,
      cs.batch_number,
      cs.quantity,
      c.base_unit,
      cs.expiry_date,
      (cs.expiry_date - CURRENT_DATE) AS days_until_expiry,
      CASE 
        WHEN cs.expiry_date < CURRENT_DATE THEN 'expired'
        WHEN cs.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
        WHEN cs.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
        ELSE 'ok'
      END AS expiry_status
    FROM consumable_stock cs
    JOIN consumables c ON cs.consumable_id = c.id
    JOIN consumable_categories cat ON c.category_id = cat.id
    JOIN storage_compartments sc ON cs.compartment_id = sc.id
    JOIN storage_locations sl ON sc.location_id = sl.id
    WHERE cs.is_active = true
      AND cs.enable_expiry_alert = true
      AND cs.expiry_date IS NOT NULL
      AND cs.expiry_date <= CURRENT_DATE + (COALESCE(cs.expiry_alert_days, 30) || ' days')::INTERVAL
      AND cs.quantity > 0
      AND c.is_deleted = false
    ORDER BY cs.expiry_date ASC
  `);

  // ============================================================================
  // 9. SEED DATA - Standard Kategorien
  // ============================================================================
  pgm.sql(`
    INSERT INTO consumable_categories (name, description, icon, color, sequence) VALUES
      ('Kühlschmierstoffe', 'KSS, Schneidöle, Emulsionen', 'droplet', 'blue', 10),
      ('Schmierstoffe', 'Maschinenöle, Fette, Sprays', 'oil-can', 'amber', 20),
      ('Reinigungsmittel', 'Entfetter, Kaltreiniger, Lösungsmittel', 'spray-can', 'green', 30),
      ('Schleifmittel', 'Schleifpapier, Schleifvlies, Polierpaste', 'disc', 'gray', 40),
      ('Filter', 'Hydraulikfilter, Ölfilter, Luftfilter', 'filter', 'slate', 50),
      ('Dichtungen', 'O-Ringe, Flachdichtungen, Wellendichtringe', 'circle', 'red', 60),
      ('Korrosionsschutz', 'Korrosionsschutzöl, VCI-Folie, Trockenmittel', 'shield', 'purple', 70),
      ('Verpackung', 'Folien, Kartons, Polster', 'package', 'brown', 80),
      ('Sonstiges', 'Sonstige Verbrauchsmaterialien', 'box', 'gray', 99);
  `);

  // Comments
  pgm.sql(`
    COMMENT ON TABLE consumable_categories IS 'Kategorien für Verbrauchsmaterial';
    COMMENT ON TABLE consumables IS 'Verbrauchsmaterial-Stammdaten mit Einheiten und Gebinde';
    COMMENT ON TABLE consumable_stock IS 'Bestand pro Lagerort mit Chargen und MHD';
    COMMENT ON TABLE consumable_transactions IS 'Lagerbewegungen für Verbrauchsmaterial';
    COMMENT ON TABLE consumable_documents IS 'Dokumente (SDB, TDB, Bilder) zu Verbrauchsmaterial';
    COMMENT ON VIEW consumables_with_stock IS 'Verbrauchsmaterial mit aggregiertem Bestand';
    COMMENT ON VIEW consumable_low_stock_alerts IS 'Artikel unter Mindestbestand';
    COMMENT ON VIEW consumable_expiry_alerts IS 'Artikel mit ablaufendem MHD';
  `);

  // ============================================================================
  // 10. EXTEND PURCHASE ORDER ITEMS (Bestellsystem-Integration)
  // ============================================================================

  // storage_item_id nullable machen (war vorher NOT NULL)
  pgm.alterColumn('purchase_order_items', 'storage_item_id', {
    notNull: false
  });

  // item_type hinzufügen
  pgm.addColumn('purchase_order_items', {
    item_type: {
      type: 'varchar(20)',
      notNull: true,
      default: 'tool',
      comment: 'tool oder consumable'
    }
  });

  // consumable_id hinzufügen
  pgm.addColumn('purchase_order_items', {
    consumable_id: {
      type: 'integer',
      references: 'consumables',
      onDelete: 'RESTRICT',
      comment: 'Referenz zu Consumable (bei item_type=consumable)'
    }
  });

  // Felder für Wareneingang bei Consumables
  pgm.addColumn('purchase_order_items', {
    target_compartment_id: {
      type: 'integer',
      references: 'storage_compartments',
      onDelete: 'SET NULL',
      comment: 'Ziel-Lagerort bei Wareneingang'
    }
  });

  pgm.addColumn('purchase_order_items', {
    batch_number: {
      type: 'varchar(50)',
      comment: 'Chargen-Nr. bei Wareneingang'
    }
  });

  pgm.addColumn('purchase_order_items', {
    expiry_date: {
      type: 'date',
      comment: 'MHD bei Wareneingang'
    }
  });

  // Index für consumable_id
  pgm.createIndex('purchase_order_items', 'consumable_id');
  pgm.createIndex('purchase_order_items', 'item_type');

  // Check Constraint: item_type gültig
  pgm.addConstraint('purchase_order_items', 'check_item_type', {
    check: "item_type IN ('tool', 'consumable')"
  });

  // Check Constraint: Genau eines von beiden muss gesetzt sein
  pgm.addConstraint('purchase_order_items', 'check_item_reference', {
    check: `(item_type = 'tool' AND storage_item_id IS NOT NULL AND consumable_id IS NULL)
         OR (item_type = 'consumable' AND consumable_id IS NOT NULL AND storage_item_id IS NULL)`
  });

  // Default entfernen (war nur für Migration)
  pgm.alterColumn('purchase_order_items', 'item_type', {
    default: null
  });
};

exports.down = (pgm) => {
  // ============================================================================
  // 1. Revert purchase_order_items changes
  // ============================================================================
  
  // Drop constraints first
  pgm.dropConstraint('purchase_order_items', 'check_item_reference', { ifExists: true });
  pgm.dropConstraint('purchase_order_items', 'check_item_type', { ifExists: true });

  // Drop indexes
  pgm.dropIndex('purchase_order_items', 'item_type', { ifExists: true });
  pgm.dropIndex('purchase_order_items', 'consumable_id', { ifExists: true });

  // Drop columns
  pgm.dropColumn('purchase_order_items', 'expiry_date', { ifExists: true });
  pgm.dropColumn('purchase_order_items', 'batch_number', { ifExists: true });
  pgm.dropColumn('purchase_order_items', 'target_compartment_id', { ifExists: true });
  pgm.dropColumn('purchase_order_items', 'consumable_id', { ifExists: true });
  pgm.dropColumn('purchase_order_items', 'item_type', { ifExists: true });

  // Revert storage_item_id to NOT NULL
  pgm.alterColumn('purchase_order_items', 'storage_item_id', {
    notNull: true
  });

  // ============================================================================
  // 2. Drop consumables tables and views
  // ============================================================================
  
  // Drop views first
  pgm.dropView('consumable_expiry_alerts', { ifExists: true });
  pgm.dropView('consumable_low_stock_alerts', { ifExists: true });
  pgm.dropView('consumables_with_stock', { ifExists: true });

  // Drop tables in reverse order
  pgm.dropTable('consumable_documents', { ifExists: true, cascade: true });
  pgm.dropTable('consumable_transactions', { ifExists: true, cascade: true });
  pgm.dropTable('consumable_stock', { ifExists: true, cascade: true });
  pgm.dropTable('consumables', { ifExists: true, cascade: true });
  pgm.dropTable('consumable_categories', { ifExists: true, cascade: true });
};
