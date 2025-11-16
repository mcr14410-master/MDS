/**
 * Migration: Add is_primary field to tool_documents
 *
 * Allows marking one document per tool as the primary/main document
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Add is_primary column
  pgm.addColumn('tool_documents', {
    is_primary: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'Marks this document as the primary/main document for the tool',
    },
  });

  // Add regular index for faster queries (all rows)
  pgm.createIndex('tool_documents', ['tool_master_id', 'is_primary']);

  // Add PARTIAL unique index: only ONE primary document per tool
  // This only applies to rows where is_primary = true
  // Multiple rows with is_primary = false are allowed
  pgm.sql(`
    CREATE UNIQUE INDEX tool_documents_unique_primary_per_tool
    ON tool_documents (tool_master_id)
    WHERE is_primary = true AND is_deleted = false;
  `);

  // Add comment
  pgm.sql(`
    COMMENT ON COLUMN tool_documents.is_primary IS 'Only one document per tool can be marked as primary. Enforced by partial unique index.';
  `);
};

exports.down = (pgm) => {
  // Drop partial unique index
  pgm.sql('DROP INDEX IF EXISTS tool_documents_unique_primary_per_tool;');
  
  // Drop regular index
  pgm.dropIndex('tool_documents', ['tool_master_id', 'is_primary']);
  
  // Drop column
  pgm.dropColumn('tool_documents', 'is_primary');
};
