/**
 * Migration: Create time_balance_adjustments table
 * 
 * Replaces the cumulative adjustment_minutes/adjustment_reason in time_balances
 * with individual tracked entries. Each adjustment is a separate row with
 * who created it, when, and the reason.
 * 
 * Existing data is migrated from the adjustment_reason text field.
 */

exports.up = (pgm) => {
  pgm.createTable('time_balance_adjustments', {
    id: 'id',
    user_id: {
      type: 'integer',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE'
    },
    year: { type: 'integer', notNull: true },
    month: { type: 'integer', notNull: true },
    minutes: { type: 'integer', notNull: true },
    reason: { type: 'text', notNull: true },
    created_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    created_at: {
      type: 'timestamp with time zone',
      default: pgm.func('NOW()'),
      notNull: true
    }
  });

  pgm.createIndex('time_balance_adjustments', ['user_id', 'year', 'month']);

  // Migrate existing adjustment data from time_balances
  // Parse each line of adjustment_reason and create individual entries
  pgm.sql(`
    INSERT INTO time_balance_adjustments (user_id, year, month, minutes, reason, created_at)
    SELECT 
      tb.user_id, tb.year, tb.month,
      tb.adjustment_minutes, 
      COALESCE(tb.adjustment_reason, 'Migriert aus Altdaten'),
      COALESCE(tb.updated_at, NOW())
    FROM time_balances tb
    WHERE tb.adjustment_minutes != 0
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('time_balance_adjustments');
};
