/* eslint-disable camelcase */

/**
 * Migration: Add 'photo' to machine_document_type ENUM
 * 
 * Falls die ursprüngliche Migration schon gelaufen ist
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Add 'photo' to the enum type (only if it doesn't exist)
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'photo' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'machine_document_type')
      ) THEN
        ALTER TYPE machine_document_type ADD VALUE 'photo' BEFORE 'other';
      END IF;
    END $$;
  `);
};

exports.down = (pgm) => {
  // Cannot remove enum values in PostgreSQL
  // Would require recreating the type
};
