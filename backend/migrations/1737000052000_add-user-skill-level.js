'use strict';

exports.up = async (pgm) => {
  // Add skill_level to users
  pgm.addColumn('users', {
    skill_level: {
      type: 'varchar(20)',
      default: 'operator',
      notNull: true
    },
    is_available: {
      type: 'boolean',
      default: true,
      notNull: true
    }
  });

  // Add check constraint for valid skill levels
  pgm.addConstraint('users', 'users_skill_level_check', {
    check: "skill_level IN ('helper', 'operator', 'technician', 'specialist')"
  });

  // Add index for querying available users by skill
  pgm.createIndex('users', ['skill_level', 'is_available'], {
    name: 'idx_users_skill_available'
  });

  // Comment
  pgm.sql(`COMMENT ON COLUMN users.skill_level IS 'Qualifikationsstufe: helper < operator < technician < specialist'`);
  pgm.sql(`COMMENT ON COLUMN users.is_available IS 'Verfügbar für Aufgabenzuweisung (false = Urlaub/Krank)'`);
};

exports.down = async (pgm) => {
  pgm.dropIndex('users', ['skill_level', 'is_available'], {
    name: 'idx_users_skill_available'
  });
  pgm.dropConstraint('users', 'users_skill_level_check');
  pgm.dropColumn('users', ['skill_level', 'is_available']);
};
