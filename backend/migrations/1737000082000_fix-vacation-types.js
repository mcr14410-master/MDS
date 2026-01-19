/* eslint-disable camelcase */

/**
 * Migration: Fix vacation types configuration
 * 
 * Changes:
 * - Zeitausgleich: affects_balance = false, single_day_only = true, allows_partial_day = true
 * - Überstundenabbau: affects_balance = false, single_day_only = false, allows_partial_day = false
 * - Add single_day_only column to vacation_types
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Add single_day_only column
  pgm.addColumn('vacation_types', {
    single_day_only: { 
      type: 'boolean', 
      notNull: true, 
      default: false 
    }
  });

  // Fix Zeitausgleich: single day only, no balance deduction, allows time
  pgm.sql(`
    UPDATE vacation_types 
    SET affects_balance = false,
        single_day_only = true,
        allows_partial_day = true
    WHERE name = 'Zeitausgleich';
  `);

  // Fix Überstundenabbau: multiple days allowed, no balance deduction, no time
  pgm.sql(`
    UPDATE vacation_types 
    SET affects_balance = false,
        single_day_only = false,
        allows_partial_day = false
    WHERE name = 'Überstundenabbau';
  `);
};

exports.down = (pgm) => {
  // Revert to original settings
  pgm.sql(`
    UPDATE vacation_types 
    SET affects_balance = true,
        allows_partial_day = true
    WHERE name = 'Zeitausgleich';
  `);

  pgm.sql(`
    UPDATE vacation_types 
    SET affects_balance = true,
        allows_partial_day = true
    WHERE name = 'Überstundenabbau';
  `);

  pgm.dropColumn('vacation_types', 'single_day_only');
};
