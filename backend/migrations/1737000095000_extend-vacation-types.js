/* eslint-disable camelcase */

/**
 * Migration: Extend vacation types with approval and time tracking settings
 * 
 * New columns:
 * - credits_target_hours: Whether to credit target hours in time tracking
 * - requires_approval: Whether the type needs approval workflow
 * - direct_entry_only: Whether only admins can create entries (not requestable by employees)
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Add new columns
  pgm.addColumn('vacation_types', {
    credits_target_hours: { 
      type: 'boolean', 
      notNull: true, 
      default: true 
    },
    requires_approval: { 
      type: 'boolean', 
      notNull: true, 
      default: false 
    },
    direct_entry_only: { 
      type: 'boolean', 
      notNull: true, 
      default: false 
    }
  });

  // Set correct values for existing types
  // Urlaub: credits target, requires approval, can be requested
  pgm.sql(`
    UPDATE vacation_types 
    SET credits_target_hours = true,
        requires_approval = true,
        direct_entry_only = false
    WHERE name = 'Urlaub';
  `);

  // Krank: credits target, no approval needed, admin only
  pgm.sql(`
    UPDATE vacation_types 
    SET credits_target_hours = true,
        requires_approval = false,
        direct_entry_only = true
    WHERE name = 'Krank';
  `);

  // Schulung: credits target, no approval needed, admin only
  pgm.sql(`
    UPDATE vacation_types 
    SET credits_target_hours = true,
        requires_approval = false,
        direct_entry_only = true
    WHERE name = 'Schulung';
  `);

  // Zeitausgleich: NO credits (uses overtime), requires approval, can be requested
  pgm.sql(`
    UPDATE vacation_types 
    SET credits_target_hours = false,
        requires_approval = true,
        direct_entry_only = false
    WHERE name = 'Zeitausgleich';
  `);

  // Überstundenabbau: NO credits (uses overtime), requires approval, can be requested
  pgm.sql(`
    UPDATE vacation_types 
    SET credits_target_hours = false,
        requires_approval = true,
        direct_entry_only = false
    WHERE name = 'Überstundenabbau';
  `);

  // Sonderurlaub: credits target, no approval needed, admin only
  pgm.sql(`
    UPDATE vacation_types 
    SET credits_target_hours = true,
        requires_approval = false,
        direct_entry_only = true
    WHERE name = 'Sonderurlaub';
  `);

  // Unbezahlt: NO credits, requires approval, can be requested
  pgm.sql(`
    UPDATE vacation_types 
    SET credits_target_hours = false,
        requires_approval = true,
        direct_entry_only = false
    WHERE name = 'Unbezahlt';
  `);
};

exports.down = (pgm) => {
  pgm.dropColumn('vacation_types', ['credits_target_hours', 'requires_approval', 'direct_entry_only']);
};
