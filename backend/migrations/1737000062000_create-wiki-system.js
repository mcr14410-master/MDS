/* eslint-disable camelcase */

/**
 * Migration: Wiki-System
 * 
 * Allgemeines Wiki für:
 * - Maschinenfehler (mit error_code, machine_id)
 * - Anleitungen (später)
 * - Prozesse (später)
 * - Best Practices (später)
 * 
 * Mit optionaler Wartungsplan-Verlinkung
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ============================================================================
  // WIKI CATEGORIES
  // ============================================================================
  pgm.createTable('wiki_categories', {
    id: 'id',
    name: {
      type: 'varchar(100)',
      notNull: true,
      unique: true
    },
    slug: {
      type: 'varchar(100)',
      notNull: true,
      unique: true
    },
    description: {
      type: 'text'
    },
    icon: {
      type: 'varchar(50)'
    },
    color: {
      type: 'varchar(20)'
    },
    // Kategorie-spezifische Einstellungen
    has_error_code: {
      type: 'boolean',
      notNull: true,
      default: false
    },
    has_machine_reference: {
      type: 'boolean',
      notNull: true,
      default: false
    },
    sort_order: {
      type: 'integer',
      notNull: true,
      default: 0
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // ============================================================================
  // WIKI ARTICLES
  // ============================================================================
  pgm.createTable('wiki_articles', {
    id: 'id',
    category_id: {
      type: 'integer',
      notNull: true,
      references: 'wiki_categories',
      onDelete: 'RESTRICT'
    },
    // Optional: Maschinenreferenz (für maschinenspezifische Fehler)
    machine_id: {
      type: 'integer',
      references: 'machines',
      onDelete: 'SET NULL'
    },
    // Optional: Steuerungstyp (für steuerungsspezifische Fehler, z.B. alle Heidenhain)
    control_type: {
      type: 'varchar(50)'
    },
    // Fehlercode (optional, nur bei Fehler-Kategorie)
    error_code: {
      type: 'varchar(50)'
    },
    title: {
      type: 'varchar(255)',
      notNull: true
    },
    // Problem/Symptom Beschreibung
    problem: {
      type: 'text'
    },
    // Ursache
    cause: {
      type: 'text'
    },
    // Lösung/Anleitung
    solution: {
      type: 'text'
    },
    // Optional: Verlinkung zu Wartungsplan
    maintenance_plan_id: {
      type: 'integer',
      references: 'maintenance_plans',
      onDelete: 'SET NULL'
    },
    // Tags für Suche (kommasepariert oder JSON array)
    tags: {
      type: 'text'
    },
    // Sichtbarkeit
    is_published: {
      type: 'boolean',
      notNull: true,
      default: true
    },
    // Hilfreich-Zähler
    helpful_count: {
      type: 'integer',
      notNull: true,
      default: 0
    },
    view_count: {
      type: 'integer',
      notNull: true,
      default: 0
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
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    is_deleted: {
      type: 'boolean',
      notNull: true,
      default: false
    },
    deleted_at: {
      type: 'timestamp'
    },
    deleted_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    }
  });

  // ============================================================================
  // WIKI ARTICLE IMAGES
  // ============================================================================
  pgm.createTable('wiki_article_images', {
    id: 'id',
    article_id: {
      type: 'integer',
      notNull: true,
      references: 'wiki_articles',
      onDelete: 'CASCADE'
    },
    file_name: {
      type: 'varchar(255)',
      notNull: true
    },
    file_path: {
      type: 'varchar(500)',
      notNull: true
    },
    file_size: {
      type: 'integer'
    },
    mime_type: {
      type: 'varchar(100)'
    },
    caption: {
      type: 'varchar(255)'
    },
    sort_order: {
      type: 'integer',
      notNull: true,
      default: 0
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

  // ============================================================================
  // INDEXES
  // ============================================================================
  pgm.createIndex('wiki_articles', 'category_id');
  pgm.createIndex('wiki_articles', 'machine_id');
  pgm.createIndex('wiki_articles', 'control_type');
  pgm.createIndex('wiki_articles', 'error_code');
  pgm.createIndex('wiki_articles', 'maintenance_plan_id');
  pgm.createIndex('wiki_articles', 'is_deleted');
  pgm.createIndex('wiki_articles', 'is_published');
  pgm.createIndex('wiki_article_images', 'article_id');

  // Volltext-Suche Index
  pgm.sql(`
    CREATE INDEX wiki_articles_search_idx ON wiki_articles 
    USING gin(to_tsvector('german', coalesce(title, '') || ' ' || coalesce(problem, '') || ' ' || coalesce(solution, '') || ' ' || coalesce(tags, '')))
    WHERE is_deleted = false;
  `);

  // ============================================================================
  // SEED: Standard-Kategorien
  // ============================================================================
  pgm.sql(`
    INSERT INTO wiki_categories (name, slug, description, icon, color, has_error_code, has_machine_reference, sort_order) VALUES
    ('Maschinenfehler', 'machine-errors', 'Fehlercodes und Lösungen für CNC-Maschinen', '🔧', 'red', true, true, 1),
    ('Anleitungen', 'guides', 'Schritt-für-Schritt Anleitungen', '📖', 'blue', false, false, 2),
    ('Best Practices', 'best-practices', 'Bewährte Vorgehensweisen und Tipps', '💡', 'green', false, false, 3);
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS wiki_articles_search_idx;');
  pgm.dropTable('wiki_article_images');
  pgm.dropTable('wiki_articles');
  pgm.dropTable('wiki_categories');
};
