/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('customer_documents', {
    id: 'id',

    customer_id: {
      type: 'integer',
      notNull: true,
      references: 'customers',
      onDelete: 'CASCADE',
      comment: 'Zugehöriger Kunde'
    },

    document_type: {
      type: 'varchar(50)',
      notNull: true,
      check: "document_type IN ('photo','instruction','info','correspondence','agreement','certificate','other')",
      comment: 'photo=Fotos/Bilder, instruction=Anweisungen, info=Infos, correspondence=Korrespondenz, agreement=Vereinbarungen, certificate=Zertifikate, other=Sonstiges'
    },

    file_name: {
      type: 'varchar(255)',
      notNull: true,
      comment: 'Original-Dateiname beim Upload'
    },

    file_path: {
      type: 'varchar(500)',
      notNull: true,
      comment: 'Absoluter Pfad im Storage (./uploads/customer-documents/...)'
    },

    file_size: {
      type: 'integer',
      notNull: true,
      comment: 'Dateigröße in Bytes'
    },

    mime_type: {
      type: 'varchar(100)',
      notNull: true
    },

    description: {
      type: 'text',
      comment: 'Optionale Beschreibung zum Dokument'
    },

    is_primary: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'Primäres Bild (z.B. Logo) - nur ein Document pro Kunde kann primary sein'
    },

    uploaded_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },

    uploaded_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  pgm.createIndex('customer_documents', 'customer_id');
  pgm.createIndex('customer_documents', 'document_type');
};

exports.down = (pgm) => {
  pgm.dropTable('customer_documents');
};
