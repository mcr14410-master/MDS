/* eslint-disable camelcase */

/**
 * SEED DATA: Tool Management System
 * 
 * Erstellt Test-Daten für:
 * - Lieferanten (Hoffmann, Gühring, Walter)
 * - Werkzeuge (verschiedene Kategorien)
 * - Lager-Struktur (2 Schränke mit Regalen und Fächern)
 * - Werkzeug-Standorte
 * 
 * Voraussetzung: Migration 1737000012000 wurde erfolgreich ausgeführt
 */

exports.shorthands = undefined;

exports.up = async (pgm) => {
  // ========================================
  // 1. LIEFERANTEN
  // ========================================
  pgm.sql(`
    INSERT INTO suppliers (name, contact_person, email, phone, website, delivery_time_days, payment_terms, is_active) VALUES
    ('Hoffmann Group', 'Max Müller', 'service@hoffmann-group.com', '+49 89 8391-0', 'www.hoffmann-group.com', 2, '30 Tage netto', true),
    ('Gühring oHG', 'Anna Schmidt', 'info@guehring.de', '+49 7424 8990', 'www.guehring.de', 3, '14 Tage netto', true),
    ('Walter AG', 'Thomas Weber', 'info@walter-tools.com', '+49 7472 181-0', 'www.walter-tools.com', 5, '30 Tage netto', true),
    ('Mapal Dr. Kress KG', 'Lisa Bauer', 'sales@mapal.com', '+49 7361 585-0', 'www.mapal.com', 7, '30 Tage netto', true),
    ('Sandvik Coromant', 'Peter Fischer', 'info.de@sandvik.com', '+49 203 99840', 'www.sandvik.coromant.com', 5, '30 Tage netto', true);
  `);

  // ========================================
  // 2. WERKZEUGE (Beispiele)
  // ========================================
  
  // Fräser (Kategorie 1)
  pgm.sql(`
    INSERT INTO tools (tool_number, tool_name, tool_type, tool_category_id, diameter, length, flutes, material, coating, manufacturer, order_number, cutting_speed, feed_per_tooth, max_rpm, cost, stock_quantity, min_stock, preferred_supplier_id, lifecycle_status, max_regrinds)
    VALUES
    ('T12345', 'VHM Schaftfräser D10 Z4', 'Fräser', 1, 10.000, 75.00, 4, 'VHM', 'TiAlN', 'Gühring', '3070 10.000', 200.00, 0.05, 25000, 89.50, 3, 1, 2, 'NEW', 3),
    ('T12346', 'VHM Schaftfräser D12 Z4', 'Fräser', 1, 12.000, 80.00, 4, 'VHM', 'TiAlN', 'Gühring', '3070 12.000', 200.00, 0.06, 21000, 95.00, 2, 1, 2, 'NEW', 3),
    ('T12347', 'VHM Kugelfräser D6 Z2', 'Fräser', 1, 6.000, 60.00, 2, 'VHM', 'AlTiN', 'Walter', 'DC150-06', 220.00, 0.04, 35000, 65.00, 2, 1, 3, 'NEW', 2),
    ('T12348', 'HSS Planfräser D63 Z8', 'Fräser', 1, 63.000, 40.00, 8, 'HSS', 'TiN', 'Hoffmann', 'HF 63-8', 120.00, 0.08, 3000, 145.00, 1, 1, 1, 'NEW', 5);
  `);

  // Bohrer (Kategorie 2)
  pgm.sql(`
    INSERT INTO tools (tool_number, tool_name, tool_type, tool_category_id, diameter, length, flutes, material, coating, manufacturer, order_number, cutting_speed, feed_per_tooth, max_rpm, cost, stock_quantity, min_stock, preferred_supplier_id, lifecycle_status)
    VALUES
    ('T20001', 'VHM Bohrer D8.5 TiAlN', 'Bohrer', 2, 8.500, 117.00, 2, 'VHM', 'TiAlN', 'Gühring', '5512 8.500', 90.00, 0.15, 12000, 45.00, 5, 2, 2, 'NEW'),
    ('T20002', 'VHM Bohrer D10.2 TiAlN', 'Bohrer', 2, 10.200, 133.00, 2, 'VHM', 'TiAlN', 'Gühring', '5512 10.200', 90.00, 0.15, 10000, 52.00, 4, 2, 2, 'NEW'),
    ('T20003', 'HSS Spiralbohrer D6.0', 'Bohrer', 2, 6.000, 93.00, 2, 'HSS-E', 'TiN', 'Hoffmann', 'HSS-E 6.0', 50.00, 0.12, 15000, 12.50, 10, 3, 1, 'NEW'),
    ('T20004', 'Zentrierbohrer NC R2', 'Bohrer', 2, 6.300, 80.00, 2, 'HSS', '-', 'Hoffmann', 'ZB-NC-R2', 40.00, 0.10, 10000, 18.50, 3, 2, 1, 'NEW');
  `);

  // Gewindewerkzeuge (Kategorie 3)
  pgm.sql(`
    INSERT INTO tools (tool_number, tool_name, tool_type, tool_category_id, diameter, length, flutes, material, coating, manufacturer, order_number, cutting_speed, max_rpm, cost, stock_quantity, min_stock, preferred_supplier_id, lifecycle_status)
    VALUES
    ('T30001', 'VHM Gewindefräser M8', 'Gewinde', 3, 6.900, 70.00, 3, 'VHM', 'TiAlN', 'Gühring', 'GF M8', 80.00, 8000, 125.00, 2, 1, 2, 'NEW'),
    ('T30002', 'Gewindebohrer M10 Masch.', 'Gewinde', 3, 10.000, 100.00, 3, 'HSS-E', 'TiN', 'Hoffmann', 'GB-M10-M', 20.00, 1200, 35.00, 4, 2, 1, 'NEW'),
    ('T30003', 'VHM Gewindefräser M6', 'Gewinde', 3, 5.200, 60.00, 3, 'VHM', 'TiAlN', 'Walter', 'TC620-M6', 85.00, 10000, 98.00, 2, 1, 3, 'NEW');
  `);

  // Senker (Kategorie 4)
  pgm.sql(`
    INSERT INTO tools (tool_number, tool_name, tool_type, tool_category_id, diameter, length, material, coating, manufacturer, order_number, cost, stock_quantity, min_stock, preferred_supplier_id, lifecycle_status)
    VALUES
    ('T40001', 'Kegelsenker 90° HSS D16', 'Senker', 4, 16.000, 60.00, 'HSS', 'TiN', 'Hoffmann', 'KS-90-16', 28.50, 3, 1, 1, 'NEW'),
    ('T40002', 'Kegelsenker 90° HSS D20', 'Senker', 4, 20.000, 70.00, 'HSS', 'TiN', 'Hoffmann', 'KS-90-20', 32.00, 2, 1, 1, 'NEW');
  `);

  // Messwerkzeuge (Kategorie 7)
  pgm.sql(`
    INSERT INTO tools (tool_number, tool_name, tool_type, tool_category_id, diameter, length, manufacturer, order_number, cost, stock_quantity, min_stock, preferred_supplier_id, lifecycle_status)
    VALUES
    ('T70001', 'Messtaster Renishaw TP20', 'Messtaster', 7, 6.000, 100.00, 'Renishaw', 'TP20-1', 450.00, 2, 1, 1, 'NEW'),
    ('T70002', 'Tastkugel Ruby D4', 'Messtaster', 7, 4.000, 50.00, 'Renishaw', 'A-5003-0013', 85.00, 3, 1, 1, 'NEW');
  `);

  // ========================================
  // 3. LAGER-STRUKTUR
  // ========================================
  
  // Schrank 1: Hauptwerkzeugschrank
  pgm.sql(`
    INSERT INTO location_cabinets (name, location, description, max_shelves)
    VALUES
    ('Werkzeugschrank 1', 'Halle A - Nordwand', 'Hauptwerkzeugschrank für Fräswerkzeuge', 8);
  `);

  // Regale in Schrank 1 (8 Regale mit je 20 Fächern)
  pgm.sql(`
    INSERT INTO location_shelves (cabinet_id, shelf_number, description, max_slots)
    SELECT 1, generate_series, 
           CASE 
             WHEN generate_series <= 2 THEN 'Fräser Klein (D6-D12)'
             WHEN generate_series <= 4 THEN 'Fräser Mittel (D12-D25)'
             WHEN generate_series <= 6 THEN 'Bohrer'
             WHEN generate_series <= 7 THEN 'Gewinde'
             ELSE 'Sonstige'
           END,
           20
    FROM generate_series(1, 8);
  `);

  // Fächer in Schrank 1 erstellen (8 Regale × 20 Fächer = 160 Fächer)
  pgm.sql(`
    INSERT INTO location_slots (shelf_id, slot_number, max_quantity)
    SELECT 
      s.id,
      slot_num AS slot_number,
      1
    FROM location_shelves s
    CROSS JOIN generate_series(1, 20) slot_num
    WHERE s.cabinet_id = 1;
  `);

  // Schrank 2: Bohrwerkzeugschrank
  pgm.sql(`
    INSERT INTO location_cabinets (name, location, description, max_shelves)
    VALUES
    ('Werkzeugschrank 2', 'Halle A - Ostwand', 'Bohrwerkzeuge und Gewindewerkzeuge', 6);
  `);

  // Regale in Schrank 2 (6 Regale mit je 25 Fächern)
  pgm.sql(`
    INSERT INTO location_shelves (cabinet_id, shelf_number, description, max_slots)
    SELECT 2, generate_series,
           CASE
             WHEN generate_series <= 3 THEN 'Bohrer D2-D20'
             WHEN generate_series <= 5 THEN 'Gewindewerkzeuge'
             ELSE 'Messwerkzeuge'
           END,
           25
    FROM generate_series(1, 6);
  `);

  // Fächer in Schrank 2 erstellen (6 Regale × 25 Fächer = 150 Fächer)
  pgm.sql(`
    INSERT INTO location_slots (shelf_id, slot_number, max_quantity)
    SELECT 
      s.id,
      slot_num AS slot_number,
      CASE 
        WHEN s.shelf_number = 6 THEN 3  -- Messwerkzeuge: 3 pro Fach
        ELSE 2  -- Andere: 2 pro Fach
      END
    FROM location_shelves s
    CROSS JOIN generate_series(1, 25) slot_num
    WHERE s.cabinet_id = 2;
  `);

  // ========================================
  // 4. WERKZEUG-STANDORTE (Beispiele)
  // ========================================
  
  // Fräser platzieren (Schrank 1, Regal 1-2)
  pgm.sql(`
    -- T12345 (D10 Fräser) → Schrank 1, Regal 1, Fach 5 (2 Stück)
    INSERT INTO tool_locations (tool_id, slot_id, quantity, condition, placed_at)
    SELECT t.id, ls.id, 2, 'NEW', CURRENT_TIMESTAMP
    FROM tools t
    JOIN location_shelves lsh ON lsh.cabinet_id = 1 AND lsh.shelf_number = 1
    JOIN location_slots ls ON ls.shelf_id = lsh.id AND ls.slot_number = 5
    WHERE t.tool_number = 'T12345';

    -- T12345 (D10 Fräser) → Schrank 1, Regal 1, Fach 6 (1 Stück - Reserve)
    INSERT INTO tool_locations (tool_id, slot_id, quantity, condition, placed_at)
    SELECT t.id, ls.id, 1, 'NEW', CURRENT_TIMESTAMP
    FROM tools t
    JOIN location_shelves lsh ON lsh.cabinet_id = 1 AND lsh.shelf_number = 1
    JOIN location_slots ls ON ls.shelf_id = lsh.id AND ls.slot_number = 6
    WHERE t.tool_number = 'T12345';

    -- T12346 (D12 Fräser) → Schrank 1, Regal 2, Fach 1
    INSERT INTO tool_locations (tool_id, slot_id, quantity, condition, placed_at)
    SELECT t.id, ls.id, 2, 'NEW', CURRENT_TIMESTAMP
    FROM tools t
    JOIN location_shelves lsh ON lsh.cabinet_id = 1 AND lsh.shelf_number = 2
    JOIN location_slots ls ON ls.shelf_id = lsh.id AND ls.slot_number = 1
    WHERE t.tool_number = 'T12346';

    -- T12347 (D6 Kugelfräser) → Schrank 1, Regal 1, Fach 2
    INSERT INTO tool_locations (tool_id, slot_id, quantity, condition, placed_at)
    SELECT t.id, ls.id, 2, 'NEW', CURRENT_TIMESTAMP
    FROM tools t
    JOIN location_shelves lsh ON lsh.cabinet_id = 1 AND lsh.shelf_number = 1
    JOIN location_slots ls ON ls.shelf_id = lsh.id AND ls.slot_number = 2
    WHERE t.tool_number = 'T12347';
  `);

  // Bohrer platzieren (Schrank 2, Regal 1-3)
  pgm.sql(`
    -- T20001 (D8.5 Bohrer) → Schrank 2, Regal 1, Fach 8
    INSERT INTO tool_locations (tool_id, slot_id, quantity, condition, placed_at)
    SELECT t.id, ls.id, 2, 'NEW', CURRENT_TIMESTAMP
    FROM tools t
    JOIN location_shelves lsh ON lsh.cabinet_id = 2 AND lsh.shelf_number = 1
    JOIN location_slots ls ON ls.shelf_id = lsh.id AND ls.slot_number = 8
    WHERE t.tool_number = 'T20001';

    -- T20001 (D8.5 Bohrer) → Schrank 2, Regal 1, Fach 9 (Reserve)
    INSERT INTO tool_locations (tool_id, slot_id, quantity, condition, placed_at)
    SELECT t.id, ls.id, 2, 'NEW', CURRENT_TIMESTAMP
    FROM tools t
    JOIN location_shelves lsh ON lsh.cabinet_id = 2 AND lsh.shelf_number = 1
    JOIN location_slots ls ON ls.shelf_id = lsh.id AND ls.slot_number = 9
    WHERE t.tool_number = 'T20001';

    -- T20002 (D10.2 Bohrer) → Schrank 2, Regal 1, Fach 10
    INSERT INTO tool_locations (tool_id, slot_id, quantity, condition, placed_at)
    SELECT t.id, ls.id, 2, 'NEW', CURRENT_TIMESTAMP
    FROM tools t
    JOIN location_shelves lsh ON lsh.cabinet_id = 2 AND lsh.shelf_number = 1
    JOIN location_slots ls ON ls.shelf_id = lsh.id AND ls.slot_number = 10
    WHERE t.tool_number = 'T20002';
  `);

  // Gewindewerkzeuge platzieren (Schrank 2, Regal 4-5)
  pgm.sql(`
    -- T30001 (M8 Gewindefräser) → Schrank 2, Regal 4, Fach 5
    INSERT INTO tool_locations (tool_id, slot_id, quantity, condition, placed_at)
    SELECT t.id, ls.id, 2, 'NEW', CURRENT_TIMESTAMP
    FROM tools t
    JOIN location_shelves lsh ON lsh.cabinet_id = 2 AND lsh.shelf_number = 4
    JOIN location_slots ls ON ls.shelf_id = lsh.id AND ls.slot_number = 5
    WHERE t.tool_number = 'T30001';

    -- T30002 (M10 Gewindebohrer) → Schrank 2, Regal 4, Fach 10
    INSERT INTO tool_locations (tool_id, slot_id, quantity, condition, placed_at)
    SELECT t.id, ls.id, 2, 'NEW', CURRENT_TIMESTAMP
    FROM tools t
    JOIN location_shelves lsh ON lsh.cabinet_id = 2 AND lsh.shelf_number = 4
    JOIN location_slots ls ON ls.shelf_id = lsh.id AND ls.slot_number = 10
    WHERE t.tool_number = 'T30002';
  `);

  // is_occupied Flag aktualisieren
  pgm.sql(`
    UPDATE location_slots
    SET is_occupied = true
    WHERE id IN (
      SELECT DISTINCT slot_id 
      FROM tool_locations 
      WHERE is_active = true
    );
  `);

  // ========================================
  // 5. HISTORIE - Erste Einlagerungen
  // ========================================
  pgm.sql(`
    INSERT INTO tool_location_history (tool_id, from_slot_id, to_slot_id, quantity, reason, notes, moved_at)
    SELECT 
      tl.tool_id,
      NULL,
      tl.slot_id,
      tl.quantity,
      'INITIAL_PLACEMENT',
      'Initiale Einlagerung - Systemstart',
      tl.placed_at
    FROM tool_locations tl
    WHERE tl.is_active = true;
  `);
};

exports.down = (pgm) => {
  // Alle Test-Daten löschen
  pgm.sql('DELETE FROM tool_location_history;');
  pgm.sql('DELETE FROM tool_locations;');
  pgm.sql('DELETE FROM location_slots;');
  pgm.sql('DELETE FROM location_shelves;');
  pgm.sql('DELETE FROM location_cabinets;');
  pgm.sql('DELETE FROM tools WHERE tool_number LIKE \'T%\';');
  pgm.sql('DELETE FROM suppliers;');
};
