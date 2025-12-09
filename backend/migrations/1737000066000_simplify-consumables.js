/* eslint-disable camelcase */

/**
 * Migration: Vereinfachung Verbrauchsmaterial-System
 * 
 * VORHER: Mengenbasierte Bestandsführung mit Buchungen
 * NACHHER: Status-basiert (ok/low/reorder) + Lagerorte
 * 
 * Änderungen:
 * - consumables: + stock_status
 * - consumable_stock → consumable_locations (vereinfacht)
 * - consumable_transactions: gelöscht
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ============================================================================
  // 1. CONSUMABLES: stock_status hinzufügen
  // ============================================================================
  pgm.addColumn('consumables', {
    stock_status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'ok',
      comment: 'Bestandsstatus: ok, low, reorder'
    }
  });

  pgm.addConstraint('consumables', 'check_stock_status', {
    check: "stock_status IN ('ok', 'low', 'reorder')"
  });

  pgm.createIndex('consumables', 'stock_status');

  // ============================================================================
  // 2. CONSUMABLE_LOCATIONS (NEU - ersetzt consumable_stock)
  // ============================================================================
  pgm.createTable('consumable_locations', {
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
    is_primary: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'Haupt-Lagerort?'
    },
    notes: {
      type: 'text',
      comment: 'Bemerkung (z.B. "Anbruch", "Reserve")'
    },

    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  pgm.createIndex('consumable_locations', 'consumable_id');
  pgm.createIndex('consumable_locations', 'compartment_id');

  // Unique: Ein Artikel kann pro Fach nur einmal vorkommen
  pgm.addConstraint('consumable_locations', 'unique_consumable_location', {
    unique: ['consumable_id', 'compartment_id']
  });

  // ============================================================================
  // 3. DATEN MIGRIEREN: consumable_stock → consumable_locations
  // ============================================================================
  pgm.sql(`
    INSERT INTO consumable_locations (consumable_id, compartment_id, is_primary, notes, created_at)
    SELECT DISTINCT ON (consumable_id, compartment_id)
      consumable_id, 
      compartment_id,
      false,
      notes,
      created_at
    FROM consumable_stock
    WHERE is_active = true
  `);

  // Ersten Lagerort pro Consumable als primary markieren
  pgm.sql(`
    UPDATE consumable_locations cl
    SET is_primary = true
    WHERE cl.id = (
      SELECT MIN(id) FROM consumable_locations 
      WHERE consumable_id = cl.consumable_id
    )
  `);

  // ============================================================================
  // 4. ALTE TABELLEN LÖSCHEN
  // ============================================================================
  
  // Erst Views löschen die von den Tabellen abhängen
  pgm.sql('DROP VIEW IF EXISTS consumables_with_stock CASCADE');
  pgm.sql('DROP VIEW IF EXISTS consumable_low_stock_alerts CASCADE');
  pgm.sql('DROP VIEW IF EXISTS consumable_expiry_alerts CASCADE');

  // Dann Tabellen
  pgm.dropTable('consumable_transactions', { ifExists: true, cascade: true });
  pgm.dropTable('consumable_stock', { ifExists: true, cascade: true });

  // ============================================================================
  // 5. NEUE VIEWS
  // ============================================================================
  
  // Haupt-View: Consumables mit Lagerorten
  pgm.sql(`
    CREATE OR REPLACE VIEW consumables_with_locations AS
    SELECT 
      c.*,
      cc.name AS category_name,
      cc.color AS category_color,
      s.name AS supplier_name,
      s.delivery_time_days,
      COALESCE(
        (SELECT json_agg(json_build_object(
          'id', cl.id,
          'compartment_id', cl.compartment_id,
          'location_name', sl.name,
          'compartment_name', sc.name,
          'is_primary', cl.is_primary,
          'notes', cl.notes
        ) ORDER BY cl.is_primary DESC, sl.name, sc.name)
        FROM consumable_locations cl
        JOIN storage_compartments sc ON sc.id = cl.compartment_id
        JOIN storage_locations sl ON sl.id = sc.location_id
        WHERE cl.consumable_id = c.id),
        '[]'::json
      ) AS locations,
      (SELECT COUNT(*) FROM consumable_locations WHERE consumable_id = c.id) AS location_count
    FROM consumables c
    LEFT JOIN consumable_categories cc ON cc.id = c.category_id
    LEFT JOIN suppliers s ON s.id = c.supplier_id
    WHERE c.is_deleted = false
  `);

  // Nachbestell-Liste
  pgm.sql(`
    CREATE OR REPLACE VIEW consumables_reorder_list AS
    SELECT 
      c.id,
      c.name,
      c.article_number,
      c.stock_status,
      cc.name AS category_name,
      cc.color AS category_color,
      s.id AS supplier_id,
      s.name AS supplier_name,
      s.delivery_time_days,
      c.package_type,
      c.package_size,
      c.package_price,
      c.base_unit
    FROM consumables c
    LEFT JOIN consumable_categories cc ON cc.id = c.category_id
    LEFT JOIN suppliers s ON s.id = c.supplier_id
    WHERE c.is_deleted = false
      AND c.is_active = true
      AND c.stock_status = 'reorder'
    ORDER BY cc.name, c.name
  `);
};

exports.down = (pgm) => {
  // Views löschen
  pgm.sql('DROP VIEW IF EXISTS consumables_reorder_list CASCADE');
  pgm.sql('DROP VIEW IF EXISTS consumables_with_locations CASCADE');

  // Neue Tabelle löschen
  pgm.dropTable('consumable_locations', { ifExists: true });

  // stock_status entfernen
  pgm.dropConstraint('consumables', 'check_stock_status', { ifExists: true });
  pgm.dropColumn('consumables', 'stock_status');

  // ACHTUNG: consumable_stock und consumable_transactions können nicht 
  // wiederhergestellt werden! Daten sind weg.
  // Bei Bedarf: Backup einspielen oder Original-Migration erneut ausführen
};
