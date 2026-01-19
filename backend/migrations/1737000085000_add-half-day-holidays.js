/* eslint-disable camelcase */

/**
 * Migration: Add is_half_day column and region setting
 * 
 * - Add is_half_day column to holidays table
 * - Add default_region to vacation_settings
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Add is_half_day column (default false for existing holidays)
  pgm.addColumn('holidays', {
    is_half_day: {
      type: 'boolean',
      notNull: true,
      default: false
    }
  });

  // Add default_region setting
  pgm.sql(`
    INSERT INTO vacation_settings (key, value, description)
    VALUES ('default_region', 'BY', 'Standard-Bundesland für Feiertage')
    ON CONFLICT (key) DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.dropColumn('holidays', 'is_half_day');
  
  pgm.sql(`DELETE FROM vacation_settings WHERE key = 'default_region';`);
};
