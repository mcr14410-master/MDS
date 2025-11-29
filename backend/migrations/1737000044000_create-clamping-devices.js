/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ============================================================================
  // 1. CLAMPING DEVICE TYPES (Spannmitteltypen)
  // ============================================================================
  pgm.createTable('clamping_device_types', {
    id: 'id',
    
    name: {
      type: 'varchar(100)',
      notNull: true,
      unique: true,
      comment: 'Typenbezeichnung'
    },
    description: {
      type: 'text',
      comment: 'Beschreibung des Typs'
    },
    icon: {
      type: 'varchar(50)',
      comment: 'Icon-Name für UI'
    },
    sort_order: {
      type: 'integer',
      default: 0,
      comment: 'Sortierreihenfolge'
    },
    is_active: {
      type: 'boolean',
      default: true,
      notNull: true
    },
    
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });

  // Seed: Standard-Spannmitteltypen
  pgm.sql(`
    INSERT INTO clamping_device_types (name, description, icon, sort_order) VALUES
    ('Schraubstock', 'Maschinen-Schraubstock', 'grip-horizontal', 1),
    ('Spannpratze', 'Spannpratzen-Set', 'arrow-down-to-line', 2),
    ('Spanneisen', 'Spanneisen mit T-Nut', 'minus', 3),
    ('Spannzange', 'Spannzangen (ER, OZ, etc.)', 'circle', 4),
    ('Spannfutter', 'Drehfutter (3-Backen, 4-Backen)', 'circle-dot', 5),
    ('Spannhülse', 'Reduzierhülsen, Spannhülsen', 'cylinder', 6),
    ('Magnetspannplatte', 'Magnetische Spannplatte', 'magnet', 7),
    ('Vakuumspannung', 'Vakuum-Spannsystem', 'wind', 8),
    ('Nullpunkt-Spannsystem', 'Nullpunkt-Spannsystem (Erowa, Schunk, etc.)', 'crosshair', 9),
    ('Palette', 'Spannpalette', 'square', 10),
    ('Winkelplatte', 'Aufspannwinkel', 'corner-right-down', 11),
    ('Teilapparat', 'Rundtisch / Teilapparat', 'rotate-cw', 12),
    ('Reitstock', 'Reitstock mit Zentrierspitze', 'arrow-right', 13),
    ('Lünette', 'Lünette (fest/mitlaufend)', 'circle', 14),
    ('Sonstiges', 'Sonstige Spannmittel', 'tool', 99)
  `);

  // ============================================================================
  // 2. CLAMPING DEVICES (Spannmittel-Stammdaten)
  // ============================================================================
  pgm.createTable('clamping_devices', {
    id: 'id',
    
    // Identifikation
    inventory_number: {
      type: 'varchar(50)',
      notNull: true,
      unique: true,
      comment: 'Eindeutige Inventar-Nummer (z.B. SPANN-2024-001)'
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
      comment: 'Bezeichnung des Spannmittels'
    },
    
    // Kategorisierung
    type_id: {
      type: 'integer',
      notNull: true,
      references: 'clamping_device_types',
      onDelete: 'RESTRICT',
      comment: 'Spannmitteltyp'
    },
    
    // Hersteller & Modell
    manufacturer: {
      type: 'varchar(100)',
      comment: 'Hersteller (z.B. Schunk, Röhm, Erowa)'
    },
    model: {
      type: 'varchar(100)',
      comment: 'Modellbezeichnung'
    },
    
    // Technische Daten
    clamping_range_min: {
      type: 'decimal(10,2)',
      comment: 'Spannbereich von (mm)'
    },
    clamping_range_max: {
      type: 'decimal(10,2)',
      comment: 'Spannbereich bis (mm)'
    },
    clamping_force: {
      type: 'decimal(10,2)',
      comment: 'Spannkraft (kN)'
    },
    dimensions: {
      type: 'varchar(100)',
      comment: 'Abmessungen L×B×H (mm)'
    },
    weight: {
      type: 'decimal(10,2)',
      comment: 'Gewicht (kg)'
    },
    
    // Zuordnungen (optional)
    machine_id: {
      type: 'integer',
      references: 'machines',
      onDelete: 'SET NULL',
      comment: 'Zugeordnete Maschine (falls fest zugeordnet)'
    },
    
    // Status
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'active',
      check: "status IN ('active', 'in_repair', 'retired')",
      comment: 'active=verwendbar, in_repair=in Reparatur, retired=ausgemustert'
    },
    
    // Beschaffung
    purchase_date: {
      type: 'date',
      comment: 'Kaufdatum'
    },
    purchase_price: {
      type: 'decimal(10,2)',
      comment: 'Anschaffungspreis'
    },
    supplier_id: {
      type: 'integer',
      references: 'suppliers',
      onDelete: 'SET NULL',
      comment: 'Lieferant'
    },
    
    // Sonstiges
    notes: {
      type: 'text',
      comment: 'Bemerkungen'
    },
    image_path: {
      type: 'varchar(500)',
      comment: 'Pfad zum Foto'
    },
    
    // Audit
    created_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    updated_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    deleted_at: {
      type: 'timestamptz',
      comment: 'Soft Delete'
    }
  });

  // Indizes
  pgm.createIndex('clamping_devices', 'type_id');
  pgm.createIndex('clamping_devices', 'status');
  pgm.createIndex('clamping_devices', 'machine_id');
  pgm.createIndex('clamping_devices', 'supplier_id');
  pgm.createIndex('clamping_devices', 'deleted_at');

  // ============================================================================
  // 3. CLAMPING DEVICE DOCUMENTS (Dokumente: Zeichnungen, Fotos)
  // ============================================================================
  pgm.createTable('clamping_device_documents', {
    id: 'id',
    
    clamping_device_id: {
      type: 'integer',
      notNull: true,
      references: 'clamping_devices',
      onDelete: 'CASCADE',
      comment: 'Zugehöriges Spannmittel'
    },
    
    document_type: {
      type: 'varchar(50)',
      notNull: true,
      check: "document_type IN ('drawing', 'photo', 'manual', 'datasheet', 'other')",
      comment: 'drawing=Zeichnung, photo=Foto, manual=Anleitung, datasheet=Datenblatt'
    },
    
    file_name: {
      type: 'varchar(255)',
      notNull: true,
      comment: 'Original-Dateiname'
    },
    file_path: {
      type: 'varchar(500)',
      notNull: true,
      comment: 'Speicherpfad'
    },
    file_size: {
      type: 'integer',
      comment: 'Dateigröße in Bytes'
    },
    mime_type: {
      type: 'varchar(100)',
      comment: 'MIME-Type'
    },
    description: {
      type: 'varchar(255)',
      comment: 'Beschreibung'
    },
    
    uploaded_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    uploaded_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });

  pgm.createIndex('clamping_device_documents', 'clamping_device_id');
  pgm.createIndex('clamping_device_documents', 'document_type');

  // ============================================================================
  // 4. STORAGE_ITEMS erweitern für Spannmittel
  // ============================================================================
  pgm.addColumn('storage_items', {
    clamping_device_id: {
      type: 'integer',
      references: 'clamping_devices',
      onDelete: 'CASCADE',
      comment: 'FK zu Spannmittel (wenn item_type=clamping_device)'
    }
  });

  pgm.createIndex('storage_items', 'clamping_device_id');

  // Check-Constraint für item_type erweitern
  pgm.sql(`
    ALTER TABLE storage_items 
    DROP CONSTRAINT IF EXISTS check_item_type;
    
    ALTER TABLE storage_items 
    ADD CONSTRAINT check_item_type 
    CHECK (item_type IN ('tool', 'insert', 'accessory', 'measuring_equipment', 'clamping_device', 'fixture', 'other'));
  `);

  // Check-Constraint für single_item_reference erweitern (nur eine FK darf gesetzt sein)
  pgm.sql(`
    ALTER TABLE storage_items 
    DROP CONSTRAINT IF EXISTS check_single_item_reference;
    
    ALTER TABLE storage_items 
    ADD CONSTRAINT check_single_item_reference CHECK (
      (item_type IN ('tool', 'insert', 'accessory') AND tool_master_id IS NOT NULL AND measuring_equipment_id IS NULL AND clamping_device_id IS NULL)
      OR
      (item_type = 'measuring_equipment' AND measuring_equipment_id IS NOT NULL AND tool_master_id IS NULL AND clamping_device_id IS NULL)
      OR
      (item_type = 'clamping_device' AND clamping_device_id IS NOT NULL AND tool_master_id IS NULL AND measuring_equipment_id IS NULL)
    );
  `);

  // ============================================================================
  // 5. VIEW: clamping_devices_with_stock
  // ============================================================================
  pgm.createView('clamping_devices_with_stock', {}, `
    SELECT 
      cd.*,
      cdt.name AS type_name,
      cdt.icon AS type_icon,
      m.name AS machine_name,
      s.name AS supplier_name,
      
      -- Gesamtbestand aus storage_items (condition-based)
      COALESCE(stock.total_quantity, 0) AS total_stock,
      COALESCE(stock.location_count, 0) AS storage_location_count
      
    FROM clamping_devices cd
    LEFT JOIN clamping_device_types cdt ON cd.type_id = cdt.id
    LEFT JOIN machines m ON cd.machine_id = m.id
    LEFT JOIN suppliers s ON cd.supplier_id = s.id
    LEFT JOIN LATERAL (
      SELECT 
        SUM(si.quantity_new + si.quantity_used + si.quantity_reground) AS total_quantity,
        COUNT(DISTINCT si.compartment_id) AS location_count
      FROM storage_items si 
      WHERE si.clamping_device_id = cd.id
    ) stock ON true
    WHERE cd.deleted_at IS NULL
  `);

  // ============================================================================
  // 6. VIEW: storage_items_complete erweitern (Drop & Recreate)
  // ============================================================================
  pgm.sql(`DROP VIEW IF EXISTS storage_items_complete`);
  
  pgm.createView('storage_items_complete', {}, `
    SELECT 
      si.*,
      sc.code AS compartment_code,
      sc.name AS compartment_name,
      sl.name AS location_name,
      sl.code AS location_code,
      
      -- Tool-Info
      CASE WHEN si.item_type = 'tool' THEN tm.tool_name END AS tool_name,
      CASE WHEN si.item_type = 'tool' THEN tc.name END AS tool_category_name,
      
      -- Measuring Equipment-Info
      CASE WHEN si.item_type = 'measuring_equipment' THEN me.name END AS equipment_name,
      CASE WHEN si.item_type = 'measuring_equipment' THEN me.inventory_number END AS equipment_inventory_number,
      CASE WHEN si.item_type = 'measuring_equipment' THEN met.name END AS equipment_type_name,
      CASE WHEN si.item_type = 'measuring_equipment' THEN me.status END AS equipment_status,
      CASE WHEN si.item_type = 'measuring_equipment' THEN me.next_calibration_date END AS equipment_next_calibration,
      
      -- Clamping Device-Info
      CASE WHEN si.item_type = 'clamping_device' THEN cd.name END AS clamping_device_name,
      CASE WHEN si.item_type = 'clamping_device' THEN cd.inventory_number END AS clamping_device_inventory_number,
      CASE WHEN si.item_type = 'clamping_device' THEN cdt.name END AS clamping_device_type_name,
      CASE WHEN si.item_type = 'clamping_device' THEN cd.status END AS clamping_device_status,
      
      -- Allgemeiner Display-Name
      COALESCE(
        CASE WHEN si.item_type = 'tool' THEN tm.tool_name END,
        CASE WHEN si.item_type = 'measuring_equipment' THEN me.name END,
        CASE WHEN si.item_type = 'clamping_device' THEN cd.name END
      ) AS display_name
      
    FROM storage_items si
    LEFT JOIN storage_compartments sc ON si.compartment_id = sc.id
    LEFT JOIN storage_locations sl ON sc.location_id = sl.id
    -- Tool joins (tool_master_id)
    LEFT JOIN tool_master tm ON si.tool_master_id = tm.id
    LEFT JOIN tool_categories tc ON tm.category_id = tc.id
    -- Measuring Equipment joins
    LEFT JOIN measuring_equipment me ON si.measuring_equipment_id = me.id
    LEFT JOIN measuring_equipment_types met ON me.type_id = met.id
    -- Clamping Device joins
    LEFT JOIN clamping_devices cd ON si.clamping_device_id = cd.id
    LEFT JOIN clamping_device_types cdt ON cd.type_id = cdt.id
  `);

  // ============================================================================
  // 7. VIEW: storage_items_with_stock erweitern (Drop & Recreate)
  // ============================================================================
  pgm.sql('DROP VIEW IF EXISTS storage_items_with_stock');

  pgm.sql(`
    CREATE VIEW storage_items_with_stock AS
    SELECT
      si.*,
      
      -- Tool info (for tools/inserts/accessories)
      tm.article_number,
      tm.tool_name,
      tm.diameter,
      tm.material,
      tm.coating,
      tm.manufacturer as tool_manufacturer,
      
      -- Measuring equipment info
      me.inventory_number as equipment_inventory_number,
      me.name as equipment_name,
      me.calibration_status as equipment_calibration_status,
      me.next_calibration_date as equipment_next_calibration,
      me.status as equipment_status,
      me.manufacturer as equipment_manufacturer,
      met.name as equipment_type_name,
      
      -- Clamping device info
      cd.inventory_number as clamping_device_inventory_number,
      cd.name as clamping_device_name,
      cd.status as clamping_device_status,
      cd.manufacturer as clamping_device_manufacturer,
      cdt.name as clamping_device_type_name,
      
      -- Active checkout info for measuring equipment
      mec.id as equipment_checkout_id,
      mec.checked_out_by,
      checkout_user.username as checked_out_by_name,
      mec.checked_out_at,
      mec.purpose as checkout_purpose,
      
      -- Storage location info
      sc.name as compartment_name,
      sc.code as compartment_code,
      sl.name as location_name,
      sl.code as location_code,
      sl.building,
      sl.room,
      
      -- Total quantity (simple sum)
      (si.quantity_new + si.quantity_used + si.quantity_reground) as total_quantity,
      
      -- Effective stock (weighted) - for tools
      CASE 
        WHEN si.item_type IN ('tool', 'insert', 'accessory') THEN
          (
            si.quantity_new * COALESCE(si.weight_new, 1.0) + 
            si.quantity_used * COALESCE(si.weight_used, 0.5) + 
            si.quantity_reground * COALESCE(si.weight_reground, 0.8)
          )
        WHEN si.item_type = 'clamping_device' THEN
          (si.quantity_new + si.quantity_used + si.quantity_reground)::numeric
        ELSE
          1  -- Messmittel = immer 1
      END as effective_stock,
      
      -- Low stock check - for tools only
      CASE
        WHEN si.item_type IN ('tool', 'insert', 'accessory') 
          AND si.enable_low_stock_alert = true 
          AND si.reorder_point IS NOT NULL THEN
          (
            si.quantity_new * COALESCE(si.weight_new, 1.0) + 
            si.quantity_used * COALESCE(si.weight_used, 0.5) + 
            si.quantity_reground * COALESCE(si.weight_reground, 0.8)
          ) <= si.reorder_point
        ELSE
          false
      END as is_low_stock,
      
      -- Stock level percentage - for tools
      CASE
        WHEN si.item_type IN ('tool', 'insert', 'accessory')
          AND si.max_quantity IS NOT NULL AND si.max_quantity > 0 THEN
          ROUND(((si.quantity_new + si.quantity_used + si.quantity_reground)::numeric / si.max_quantity::numeric) * 100, 2)
        ELSE
          NULL
      END as stock_level_percent,
      
      -- Is measuring equipment checked out?
      CASE
        WHEN si.item_type = 'measuring_equipment' AND mec.id IS NOT NULL THEN true
        ELSE false
      END as is_checked_out
      
    FROM storage_items si
    LEFT JOIN tool_master tm ON tm.id = si.tool_master_id
    LEFT JOIN measuring_equipment_with_status me ON me.id = si.measuring_equipment_id
    LEFT JOIN measuring_equipment_types met ON met.id = me.type_id
    LEFT JOIN measuring_equipment_checkouts mec ON mec.equipment_id = si.measuring_equipment_id 
      AND mec.returned_at IS NULL
    LEFT JOIN users checkout_user ON checkout_user.id = mec.checked_out_by
    LEFT JOIN clamping_devices cd ON cd.id = si.clamping_device_id
    LEFT JOIN clamping_device_types cdt ON cdt.id = cd.type_id
    LEFT JOIN storage_compartments sc ON sc.id = si.compartment_id
    LEFT JOIN storage_locations sl ON sl.id = sc.location_id
    WHERE si.deleted_at IS NULL
      AND si.is_active = true
  `);

  // ============================================================================
  // 7. COMMENTS
  // ============================================================================
  pgm.sql(`COMMENT ON TABLE clamping_devices IS 'Spannmittel-Stammdaten mit Mengenbestandsverwaltung'`);
  pgm.sql(`COMMENT ON TABLE clamping_device_types IS 'Spannmitteltypen (Schraubstock, Spannzange, etc.)'`);
  pgm.sql(`COMMENT ON TABLE clamping_device_documents IS 'Dokumente zu Spannmitteln (Zeichnungen, Fotos)'`);
  pgm.sql(`COMMENT ON VIEW clamping_devices_with_stock IS 'Spannmittel mit berechnetem Lagerbestand'`);
};

exports.down = (pgm) => {
  // Views droppen
  pgm.sql('DROP VIEW IF EXISTS storage_items_complete');
  pgm.sql('DROP VIEW IF EXISTS storage_items_with_stock');
  pgm.dropView('clamping_devices_with_stock');
  
  // storage_items Spalte entfernen
  pgm.dropColumn('storage_items', 'clamping_device_id');
  
  // Constraints zurücksetzen
  pgm.sql(`
    ALTER TABLE storage_items 
    DROP CONSTRAINT IF EXISTS check_item_type;
    
    ALTER TABLE storage_items 
    ADD CONSTRAINT check_item_type 
    CHECK (item_type IN ('tool', 'insert', 'accessory', 'measuring_equipment', 'fixture', 'other'));
    
    ALTER TABLE storage_items 
    DROP CONSTRAINT IF EXISTS check_single_item_reference;
    
    ALTER TABLE storage_items 
    ADD CONSTRAINT check_single_item_reference CHECK (
      (item_type IN ('tool', 'insert', 'accessory') AND tool_master_id IS NOT NULL AND measuring_equipment_id IS NULL)
      OR
      (item_type = 'measuring_equipment' AND measuring_equipment_id IS NOT NULL AND tool_master_id IS NULL)
    );
  `);
  
  // storage_items_with_stock wiederherstellen (alte Version ohne clamping_device)
  pgm.sql(`
    CREATE VIEW storage_items_with_stock AS
    SELECT
      si.*,
      tm.article_number,
      tm.tool_name,
      tm.diameter,
      tm.material,
      tm.coating,
      tm.manufacturer as tool_manufacturer,
      me.inventory_number as equipment_inventory_number,
      me.name as equipment_name,
      me.calibration_status as equipment_calibration_status,
      me.next_calibration_date as equipment_next_calibration,
      me.status as equipment_status,
      me.manufacturer as equipment_manufacturer,
      met.name as equipment_type_name,
      mec.id as equipment_checkout_id,
      mec.checked_out_by,
      checkout_user.username as checked_out_by_name,
      mec.checked_out_at,
      mec.purpose as checkout_purpose,
      sc.name as compartment_name,
      sc.code as compartment_code,
      sl.name as location_name,
      sl.code as location_code,
      sl.building,
      sl.room,
      (si.quantity_new + si.quantity_used + si.quantity_reground) as total_quantity,
      CASE 
        WHEN si.item_type IN ('tool', 'insert', 'accessory') THEN
          (si.quantity_new * COALESCE(si.weight_new, 1.0) + si.quantity_used * COALESCE(si.weight_used, 0.5) + si.quantity_reground * COALESCE(si.weight_reground, 0.8))
        ELSE 1
      END as effective_stock,
      CASE
        WHEN si.item_type IN ('tool', 'insert', 'accessory') AND si.enable_low_stock_alert = true AND si.reorder_point IS NOT NULL THEN
          (si.quantity_new * COALESCE(si.weight_new, 1.0) + si.quantity_used * COALESCE(si.weight_used, 0.5) + si.quantity_reground * COALESCE(si.weight_reground, 0.8)) <= si.reorder_point
        ELSE false
      END as is_low_stock,
      CASE
        WHEN si.item_type IN ('tool', 'insert', 'accessory') AND si.max_quantity IS NOT NULL AND si.max_quantity > 0 THEN
          ROUND(((si.quantity_new + si.quantity_used + si.quantity_reground)::numeric / si.max_quantity::numeric) * 100, 2)
        ELSE NULL
      END as stock_level_percent,
      CASE WHEN si.item_type = 'measuring_equipment' AND mec.id IS NOT NULL THEN true ELSE false END as is_checked_out
    FROM storage_items si
    LEFT JOIN tool_master tm ON tm.id = si.tool_master_id
    LEFT JOIN measuring_equipment_with_status me ON me.id = si.measuring_equipment_id
    LEFT JOIN measuring_equipment_types met ON met.id = me.type_id
    LEFT JOIN measuring_equipment_checkouts mec ON mec.equipment_id = si.measuring_equipment_id AND mec.returned_at IS NULL
    LEFT JOIN users checkout_user ON checkout_user.id = mec.checked_out_by
    LEFT JOIN storage_compartments sc ON sc.id = si.compartment_id
    LEFT JOIN storage_locations sl ON sl.id = sc.location_id
    WHERE si.deleted_at IS NULL AND si.is_active = true
  `);
  
  // storage_items_complete View wiederherstellen (alte Version ohne clamping_device)
  pgm.createView('storage_items_complete', {}, `
    SELECT 
      si.*,
      sc.code AS compartment_code,
      sc.name AS compartment_name,
      sl.name AS location_name,
      sl.code AS location_code,
      CASE WHEN si.item_type = 'tool' THEN tm.tool_name END AS tool_name,
      CASE WHEN si.item_type = 'tool' THEN tc.name END AS tool_category_name,
      CASE WHEN si.item_type = 'measuring_equipment' THEN me.name END AS equipment_name,
      CASE WHEN si.item_type = 'measuring_equipment' THEN me.inventory_number END AS equipment_inventory_number,
      CASE WHEN si.item_type = 'measuring_equipment' THEN met.name END AS equipment_type_name,
      CASE WHEN si.item_type = 'measuring_equipment' THEN me.status END AS equipment_status,
      CASE WHEN si.item_type = 'measuring_equipment' THEN me.next_calibration_date END AS equipment_next_calibration,
      COALESCE(
        CASE WHEN si.item_type = 'tool' THEN tm.tool_name END,
        CASE WHEN si.item_type = 'measuring_equipment' THEN me.name END
      ) AS display_name
    FROM storage_items si
    LEFT JOIN storage_compartments sc ON si.compartment_id = sc.id
    LEFT JOIN storage_locations sl ON sc.location_id = sl.id
    LEFT JOIN tool_master tm ON si.tool_master_id = tm.id
    LEFT JOIN tool_categories tc ON tm.category_id = tc.id
    LEFT JOIN measuring_equipment me ON si.measuring_equipment_id = me.id
    LEFT JOIN measuring_equipment_types met ON me.type_id = met.id
  `);
  
  // Tabellen droppen
  pgm.dropTable('clamping_device_documents');
  pgm.dropTable('clamping_devices');
  pgm.dropTable('clamping_device_types');
};
