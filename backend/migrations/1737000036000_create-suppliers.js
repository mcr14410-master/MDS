/**
 * Migration: Create Suppliers and Supplier Items Tables
 * 
 * Phase 3: Supplier Management
 * 
 * Tables:
 * - suppliers: Lieferanten-Stammdaten
 * - supplier_items: Verknüpfung zwischen Storage Items und Lieferanten mit Preisen
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Create suppliers table
  pgm.createTable('suppliers', {
    id: 'id',
    
    // Stammdaten
    name: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    supplier_code: {
      type: 'varchar(50)',
      unique: true,
    },
    
    // Kontakt
    contact_person: { type: 'varchar(255)' },
    email: { type: 'varchar(255)' },
    phone: { type: 'varchar(50)' },
    fax: { type: 'varchar(50)' },
    website: { type: 'varchar(255)' },
    
    // Adresse
    address_line1: { type: 'varchar(255)' },
    address_line2: { type: 'varchar(255)' },
    postal_code: { type: 'varchar(20)' },
    city: { type: 'varchar(100)' },
    country: { type: 'varchar(100)' },
    
    // Geschäftsdaten
    tax_id: { type: 'varchar(100)' },
    payment_terms: { type: 'varchar(255)' },
    delivery_time_days: { type: 'integer' },
    minimum_order_value: { type: 'numeric(10,2)' },
    currency: {
      type: 'varchar(3)',
      default: 'EUR',
    },
    
    // Bewertung
    rating: { type: 'integer' },
    is_preferred: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    
    // Status
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    notes: { type: 'text' },
    
    // Audit
    created_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // Add check constraint for rating
  pgm.sql(`
    ALTER TABLE suppliers 
    ADD CONSTRAINT check_supplier_rating 
    CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
  `);

  // Create indexes for suppliers
  pgm.createIndex('suppliers', 'name');
  pgm.createIndex('suppliers', 'supplier_code');
  pgm.createIndex('suppliers', 'is_active');
  pgm.createIndex('suppliers', 'is_preferred');

  // 2. Create supplier_items table
  pgm.createTable('supplier_items', {
    id: 'id',
    
    // Verknüpfungen
    storage_item_id: {
      type: 'integer',
      notNull: true,
      references: 'storage_items',
      onDelete: 'CASCADE',
    },
    supplier_id: {
      type: 'integer',
      notNull: true,
      references: 'suppliers',
      onDelete: 'CASCADE',
    },
    
    // Lieferantenspezifische Daten
    supplier_part_number: { type: 'varchar(100)' },
    supplier_description: { type: 'text' },
    
    // Preise
    unit_price: { type: 'numeric(10,2)' },
    currency: {
      type: 'varchar(3)',
      default: 'EUR',
    },
    price_valid_from: { type: 'date' },
    price_valid_until: { type: 'date' },
    
    // Bestellinformationen
    min_order_quantity: { type: 'numeric(10,2)' },
    package_quantity: { type: 'numeric(10,2)' },
    lead_time_days: { type: 'integer' },
    
    // Status
    is_preferred: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    notes: { type: 'text' },
    
    // Audit
    created_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // Add unique constraint: Ein Item kann nur einmal pro Supplier sein
  pgm.addConstraint('supplier_items', 'unique_item_per_supplier', {
    unique: ['storage_item_id', 'supplier_id'],
  });

  // Create indexes for supplier_items
  pgm.createIndex('supplier_items', 'storage_item_id');
  pgm.createIndex('supplier_items', 'supplier_id');
  pgm.createIndex('supplier_items', 'is_preferred');
};

exports.down = (pgm) => {
  pgm.dropTable('supplier_items', { ifExists: true, cascade: true });
  pgm.dropTable('suppliers', { ifExists: true, cascade: true });
};

