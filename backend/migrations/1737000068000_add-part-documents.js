/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Neues Feld customer_part_number zu parts hinzufügen
  pgm.addColumn('parts', {
    customer_part_number: {
      type: 'varchar(100)',
      comment: 'Kunden-Teilenummer / Zeichnungsnummer'
    }
  });

  // 2. Index für customer_part_number
  pgm.createIndex('parts', 'customer_part_number', {
    name: 'idx_parts_customer_part_number',
    where: 'customer_part_number IS NOT NULL'
  });

  // 3. Part Documents Tabelle
  pgm.createTable('part_documents', {
    id: 'id',
    
    part_id: {
      type: 'integer',
      notNull: true,
      references: 'parts(id)',
      onDelete: 'CASCADE'
    },
    
    document_type: {
      type: 'varchar(50)',
      notNull: true,
      default: 'other',
      comment: 'Dokument-Typ: cad_model, drawing, other'
    },
    
    original_filename: {
      type: 'varchar(500)',
      notNull: true
    },
    
    stored_filename: {
      type: 'varchar(500)',
      notNull: true
    },
    
    file_path: {
      type: 'varchar(1000)',
      notNull: true
    },
    
    file_size: {
      type: 'integer'
    },
    
    mime_type: {
      type: 'varchar(100)'
    },
    
    file_extension: {
      type: 'varchar(20)'
    },
    
    description: {
      type: 'text'
    },
    
    revision: {
      type: 'varchar(20)'
    },
    
    is_primary_cad: {
      type: 'boolean',
      default: false,
      comment: 'Ist dies das Haupt-CAD-Modell für 3D-Vorschau?'
    },
    
    uploaded_by: {
      type: 'integer',
      references: 'users(id)'
    },
    
    created_at: {
      type: 'timestamp with time zone',
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    
    updated_at: {
      type: 'timestamp with time zone',
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });

  // 4. Indizes
  pgm.createIndex('part_documents', 'part_id', {
    name: 'idx_part_documents_part_id'
  });

  pgm.createIndex('part_documents', 'document_type', {
    name: 'idx_part_documents_type'
  });

  // 5. Unique Index für primary CAD (nur ein primary pro Part)
  pgm.createIndex('part_documents', 'part_id', {
    name: 'idx_part_documents_unique_primary_cad',
    unique: true,
    where: 'is_primary_cad = true'
  });

  // 6. Trigger für updated_at
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_part_documents_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  pgm.sql(`
    CREATE TRIGGER trigger_part_documents_updated_at
    BEFORE UPDATE ON part_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_part_documents_updated_at()
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TRIGGER IF EXISTS trigger_part_documents_updated_at ON part_documents');
  pgm.sql('DROP FUNCTION IF EXISTS update_part_documents_updated_at CASCADE');
  pgm.dropTable('part_documents');
  pgm.dropColumn('parts', 'customer_part_number');
};
