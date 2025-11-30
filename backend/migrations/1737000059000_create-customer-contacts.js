/**
 * Migration: Create customer_contacts table
 * 
 * Allows multiple contacts per customer with different roles/departments
 */

exports.up = (pgm) => {
  pgm.createTable('customer_contacts', {
    id: 'id',
    customer_id: {
      type: 'integer',
      notNull: true,
      references: 'customers',
      onDelete: 'CASCADE'
    },
    name: { type: 'varchar(255)', notNull: true },
    position: { type: 'varchar(100)' },
    department: { type: 'varchar(50)' },
    email: { type: 'varchar(255)' },
    phone: { type: 'varchar(50)' },
    mobile: { type: 'varchar(50)' },
    is_primary: { type: 'boolean', notNull: true, default: false },
    notes: { type: 'text' },
    is_active: { type: 'boolean', notNull: true, default: true },
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
  pgm.createIndex('customer_contacts', 'customer_id');
  pgm.createIndex('customer_contacts', 'department');
  pgm.createIndex('customer_contacts', 'is_primary');

  // Add comment
  pgm.sql(`COMMENT ON TABLE customer_contacts IS 'Ansprechpartner pro Kunde für verschiedene Bereiche'`);
  pgm.sql(`COMMENT ON COLUMN customer_contacts.department IS 'Bereich: Einkauf, Qualität, Technik, Buchhaltung, Geschäftsführung, etc.'`);
};

exports.down = (pgm) => {
  pgm.dropTable('customer_contacts');
};
