/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ============================================================================
  // 1. TOOL CATEGORIES (Werkzeug-Kategorien)
  // ============================================================================
  pgm.createTable('tool_categories', {
    id: 'id',

    // Identifikation
    name: {
      type: 'varchar(100)',
      notNull: true,
      unique: true,
      comment: 'Name der Kategorie (z.B. "Milling", "Drilling")'
    },
    description: {
      type: 'text',
      comment: 'Beschreibung der Kategorie'
    },
    icon: {
      type: 'varchar(50)',
      comment: 'Icon-Name für UI (z.B. "mill", "drill", "turn")'
    },

    // Reihenfolge in UI
    sequence: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Sortier-Reihenfolge'
    },

    // Status
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
      comment: 'Ist die Kategorie aktiv?'
    },

    // Audit
    created_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL',
      comment: 'User der die Kategorie erstellt hat'
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

  // Indizes für tool_categories
  pgm.createIndex('tool_categories', 'sequence');
  pgm.createIndex('tool_categories', 'is_active');

  // ============================================================================
  // 2. TOOL SUBCATEGORIES (Werkzeug-Unterkategorien)
  // ============================================================================
  pgm.createTable('tool_subcategories', {
    id: 'id',

    // Hierarchie
    category_id: {
      type: 'integer',
      notNull: true,
      references: 'tool_categories',
      onDelete: 'CASCADE',
      comment: 'Zugehörige Kategorie'
    },

    // Identifikation
    name: {
      type: 'varchar(100)',
      notNull: true,
      comment: 'Name der Unterkategorie (z.B. "End Mill", "Twist Drill")'
    },
    description: {
      type: 'text',
      comment: 'Beschreibung der Unterkategorie'
    },

    // Reihenfolge in UI
    sequence: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Sortier-Reihenfolge innerhalb der Kategorie'
    },

    // Status
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
      comment: 'Ist die Unterkategorie aktiv?'
    },

    // Audit
    created_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL',
      comment: 'User der die Unterkategorie erstellt hat'
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

  // Indizes für tool_subcategories
  pgm.createIndex('tool_subcategories', 'category_id');
  pgm.createIndex('tool_subcategories', ['category_id', 'sequence']);
  pgm.createIndex('tool_subcategories', 'is_active');

  // Unique Constraint: Category + Name
  pgm.addConstraint('tool_subcategories', 'unique_subcategory_per_category', {
    unique: ['category_id', 'name']
  });

  // Comment auf Tabellen
  pgm.sql(`
    COMMENT ON TABLE tool_categories IS 'Hauptkategorien für Werkzeuge (Fräsen, Bohren, Drehen, etc.)';
    COMMENT ON TABLE tool_subcategories IS 'Unterkategorien für detaillierte Werkzeug-Klassifizierung';
  `);

  // ============================================================================
  // 3. SEED DATA - Standard Kategorien
  // ============================================================================
  pgm.sql(`
    INSERT INTO tool_categories (name, description, icon, sequence) VALUES
      ('Milling', 'Fräswerkzeuge', 'mill', 10),
      ('Drilling', 'Bohrwerkzeuge', 'drill', 20),
      ('Turning', 'Drehwerkzeuge', 'turn', 30),
      ('Threading', 'Gewindewerkzeuge', 'tap', 40),
      ('Reaming', 'Reibahlen', 'ream', 50),
      ('Boring', 'Bohrungswerkzeuge', 'bore', 60),
      ('Inserts', 'Wendeschneidplatten', 'insert', 70);
  `);

  // ============================================================================
  // 4. SEED DATA - Standard Unterkategorien
  // ============================================================================
  pgm.sql(`
    -- Milling (category_id=1)
    INSERT INTO tool_subcategories (category_id, name, description, sequence)
    SELECT id, 'End Mill', 'Schaftfräser', 10 FROM tool_categories WHERE name = 'Milling'
    UNION ALL
    SELECT id, 'Face Mill', 'Planfräser', 20 FROM tool_categories WHERE name = 'Milling'
    UNION ALL
    SELECT id, 'Ball Nose', 'Kugelfräser', 30 FROM tool_categories WHERE name = 'Milling'
    UNION ALL
    SELECT id, 'Radius Mill', 'Radiusfräser', 40 FROM tool_categories WHERE name = 'Milling'
    UNION ALL
    SELECT id, 'Slot Mill', 'Nutenfräser', 50 FROM tool_categories WHERE name = 'Milling'
    UNION ALL
    SELECT id, 'Thread Mill', 'Gewindefräser', 60 FROM tool_categories WHERE name = 'Milling';

    -- Drilling (category_id=2)
    INSERT INTO tool_subcategories (category_id, name, description, sequence)
    SELECT id, 'Twist Drill', 'Spiralbohrer', 10 FROM tool_categories WHERE name = 'Drilling'
    UNION ALL
    SELECT id, 'Center Drill', 'Zentrierbohrer', 20 FROM tool_categories WHERE name = 'Drilling'
    UNION ALL
    SELECT id, 'Spot Drill', 'Anbohrer', 30 FROM tool_categories WHERE name = 'Drilling'
    UNION ALL
    SELECT id, 'Deep Hole Drill', 'Tiefbohrer', 40 FROM tool_categories WHERE name = 'Drilling'
    UNION ALL
    SELECT id, 'Countersink', 'Kegelsenker', 50 FROM tool_categories WHERE name = 'Drilling';

    -- Turning (category_id=3)
    INSERT INTO tool_subcategories (category_id, name, description, sequence)
    SELECT id, 'Turning Insert', 'Drehplatten', 10 FROM tool_categories WHERE name = 'Turning'
    UNION ALL
    SELECT id, 'Grooving', 'Einstech-/Abstechplatten', 20 FROM tool_categories WHERE name = 'Turning'
    UNION ALL
    SELECT id, 'Threading Insert', 'Gewindedrehplatten', 30 FROM tool_categories WHERE name = 'Turning';

    -- Threading (category_id=4)
    INSERT INTO tool_subcategories (category_id, name, description, sequence)
    SELECT id, 'Thread Tap', 'Gewindebohrer', 10 FROM tool_categories WHERE name = 'Threading'
    UNION ALL
    SELECT id, 'Thread Former', 'Gewindeformer', 20 FROM tool_categories WHERE name = 'Threading'
    UNION ALL
    SELECT id, 'Die', 'Schneideisen', 30 FROM tool_categories WHERE name = 'Threading';

    -- Reaming (category_id=5)
    INSERT INTO tool_subcategories (category_id, name, description, sequence)
    SELECT id, 'Machine Reamer', 'Maschinenreibahle', 10 FROM tool_categories WHERE name = 'Reaming'
    UNION ALL
    SELECT id, 'Hand Reamer', 'Handreibahle', 20 FROM tool_categories WHERE name = 'Reaming';

    -- Boring (category_id=6)
    INSERT INTO tool_subcategories (category_id, name, description, sequence)
    SELECT id, 'Boring Bar', 'Bohrstange', 10 FROM tool_categories WHERE name = 'Boring'
    UNION ALL
    SELECT id, 'Boring Head', 'Bohrkopf', 20 FROM tool_categories WHERE name = 'Boring';

    -- Inserts (category_id=7)
    INSERT INTO tool_subcategories (category_id, name, description, sequence)
    SELECT id, 'CNMG', 'CNMG Wendeschneidplatten', 10 FROM tool_categories WHERE name = 'Inserts'
    UNION ALL
    SELECT id, 'DNMG', 'DNMG Wendeschneidplatten', 20 FROM tool_categories WHERE name = 'Inserts'
    UNION ALL
    SELECT id, 'WNMG', 'WNMG Wendeschneidplatten', 30 FROM tool_categories WHERE name = 'Inserts'
    UNION ALL
    SELECT id, 'SEKT', 'SEKT Wendeschneidplatten', 40 FROM tool_categories WHERE name = 'Inserts';
  `);
};

exports.down = (pgm) => {
  // Drop in umgekehrter Reihenfolge (wegen Foreign Keys)
  pgm.dropTable('tool_subcategories', { cascade: true });
  pgm.dropTable('tool_categories', { cascade: true });
};
