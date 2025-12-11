/* eslint-disable camelcase */
/**
 * Migration: Operation Types
 * 
 * Erstellt operation_types Tabelle für vordefinierte Arbeitsgang-Typen
 * und erweitert operations Tabelle mit Typ-Zuordnung und Features
 */

exports.up = (pgm) => {
  // 1. Operation Types Tabelle
  pgm.createTable('operation_types', {
    id: 'id',
    name: { type: 'varchar(100)', notNull: true },
    description: { type: 'text' },
    icon: { type: 'varchar(50)' },           // Icon-Name für Frontend
    color: { type: 'varchar(20)' },          // Farbe für Badge
    default_features: { 
      type: 'jsonb', 
      notNull: true, 
      default: '[]' 
    },  // ["programs", "tools", "setup_sheet", "inspection"]
    is_active: { type: 'boolean', notNull: true, default: true },
    sort_order: { type: 'integer', notNull: true, default: 0 },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // 2. Operations Tabelle erweitern
  pgm.addColumns('operations', {
    operation_type_id: {
      type: 'integer',
      references: 'operation_types',
      onDelete: 'SET NULL'
    },
    enabled_features: {
      type: 'jsonb',
      notNull: true,
      default: '["programs", "tools", "setup_sheet", "inspection"]'
    }
  });

  // 3. Index für schnelle Typ-Abfragen
  pgm.createIndex('operations', 'operation_type_id');

  // 4. Standard Operation Types einfügen
  pgm.sql(`
    INSERT INTO operation_types (name, description, icon, color, default_features, sort_order) VALUES
    ('CNC-Fräsen', 'CNC-Fräsbearbeitung mit Programmen, Werkzeugen und Einrichteblatt', 'milling', 'blue', '["programs", "tools", "setup_sheet", "inspection"]', 10),
    ('CNC-Drehen', 'CNC-Drehbearbeitung mit Programmen, Werkzeugen und Einrichteblatt', 'lathe', 'blue', '["programs", "tools", "setup_sheet", "inspection"]', 20),
    ('Schleifen', 'Schleifbearbeitung', 'grinding', 'indigo', '["programs", "tools", "setup_sheet", "inspection"]', 30),
    ('Erodieren', 'EDM / Funkenerosion', 'spark', 'purple', '["programs", "tools", "setup_sheet", "inspection"]', 40),
    ('Manuell', 'Manuelle Bearbeitung / Nacharbeit', 'hand', 'amber', '["work_instruction", "checklist"]', 50),
    ('Entgraten', 'Entgraten und Kantenbearbeitung', 'deburr', 'orange', '["work_instruction", "checklist"]', 60),
    ('Reinigen', 'Reinigung und Entfettung', 'clean', 'cyan', '["work_instruction", "checklist"]', 70),
    ('Qualitätskontrolle', 'Prüfung und Messung', 'inspection', 'green', '["inspection", "checklist", "measuring_equipment"]', 80),
    ('Oberflächenbehandlung', 'Beschichtung, Härten, Eloxieren etc.', 'surface', 'pink', '["work_instruction", "documents"]', 90),
    ('Montage', 'Montage und Zusammenbau', 'assembly', 'teal', '["work_instruction", "checklist", "documents"]', 100),
    ('Verpacken', 'Verpackung und Versand', 'package', 'gray', '["checklist"]', 110),
    ('Lager/Logistik', 'Materialbereitstellung und Lagerung', 'warehouse', 'slate', '["checklist"]', 120),
    ('Generisch', 'Allgemeiner Arbeitsgang - alle Features manuell wählbar', 'generic', 'gray', '[]', 999)
  `);
};

exports.down = (pgm) => {
  pgm.dropIndex('operations', 'operation_type_id');
  pgm.dropColumns('operations', ['operation_type_id', 'enabled_features']);
  pgm.dropTable('operation_types');
};
