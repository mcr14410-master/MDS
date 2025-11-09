/**
 * Migration: Tool Lists System
 * 
 * Creates tables for managing tool lists for NC programs.
 * Each program can have one tool list with multiple tool items.
 * 
 * Tables:
 * - tool_lists: Header table (1:1 with programs)
 * - tool_list_items: Individual tools in a list
 * 
 * Future enhancements:
 * - Auto-parsing from NC programs
 * - Link to tool master data (tool_master_id)
 */

exports.up = async (pgm) => {
  // ============================================================================
  // TABLE: tool_lists
  // ============================================================================
  pgm.createTable('tool_lists', {
    id: { type: 'serial', primaryKey: true },
    program_id: {
      type: 'integer',
      notNull: true,
      unique: true, // Each program has ONE tool list
      references: 'programs',
      onDelete: 'CASCADE'
    },
    created_by: {
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
    }
  });

  // Indexes
  pgm.createIndex('tool_lists', 'program_id');
  pgm.createIndex('tool_lists', 'created_by');

  // ============================================================================
  // TABLE: tool_list_items
  // ============================================================================
  pgm.createTable('tool_list_items', {
    id: { type: 'serial', primaryKey: true },
    tool_list_id: {
      type: 'integer',
      notNull: true,
      references: 'tool_lists',
      onDelete: 'CASCADE'
    },
    
    // Tool identification
    tool_number: {
      type: 'varchar(50)',
      notNull: true,
      comment: 'Tool number from NC program (e.g. T01, T5, T12)'
    },
    description: {
      type: 'varchar(255)',
      comment: 'Tool description (e.g. "Schaftfräser D10 Z2")'
    },
    tool_type: {
      type: 'varchar(100)',
      comment: 'Tool type: Bohrer, Fräser, Reibahle, Gewinde, etc.'
    },
    
    // Tool data
    manufacturer: {
      type: 'varchar(100)',
      comment: 'Manufacturer name'
    },
    order_number: {
      type: 'varchar(100)',
      comment: 'Manufacturer order/part number'
    },
    tool_holder: {
      type: 'varchar(100)',
      comment: 'Tool holder type (e.g. HSK63, SK40, ER32)'
    },
    tool_life_info: {
      type: 'text',
      comment: 'Tool life information (standzeit, standmenge)'
    },
    notes: {
      type: 'text',
      comment: 'Additional notes'
    },
    
    // Future: Link to tool master data
    // tool_master_id: { type: 'integer', references: 'tool_master' }
    
    // Metadata
    sequence: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Display order'
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

  // Indexes
  pgm.createIndex('tool_list_items', 'tool_list_id');
  pgm.createIndex('tool_list_items', ['tool_list_id', 'sequence']);

  // Comments
  pgm.sql(`
    COMMENT ON TABLE tool_lists IS 'Tool lists for NC programs (1:1 relationship)';
    COMMENT ON TABLE tool_list_items IS 'Individual tools within a tool list';
  `);
};

exports.down = async (pgm) => {
  pgm.dropTable('tool_list_items');
  pgm.dropTable('tool_lists');
};
