/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Workflow-History Tabelle (Audit-Trail für Status-Änderungen)
  pgm.createTable('workflow_history', {
    id: 'id',
    entity_type: {
      type: 'varchar(50)',
      notNull: true,
      comment: 'program, operation, setup_sheet, etc.'
    },
    entity_id: {
      type: 'integer',
      notNull: true,
      comment: 'ID der Entity (program_id, operation_id, etc.)'
    },
    from_state_id: {
      type: 'integer',
      references: 'workflow_states',
      onDelete: 'SET NULL',
      comment: 'Alter Status'
    },
    to_state_id: {
      type: 'integer',
      notNull: true,
      references: 'workflow_states',
      onDelete: 'RESTRICT',
      comment: 'Neuer Status'
    },
    changed_by: {
      type: 'integer',
      notNull: true,
      references: 'users',
      onDelete: 'SET NULL',
      comment: 'User der die Änderung durchgeführt hat'
    },
    change_reason: {
      type: 'text',
      comment: 'Optional: Grund für die Änderung (z.B. bei Ablehnung)'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Indizes für schnelle Abfragen
  pgm.createIndex('workflow_history', ['entity_type', 'entity_id']);
  pgm.createIndex('workflow_history', 'to_state_id');
  pgm.createIndex('workflow_history', 'changed_by');
  pgm.createIndex('workflow_history', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('workflow_history');
};
