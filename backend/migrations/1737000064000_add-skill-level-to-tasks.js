/**
 * Migration: Add required_skill_level to maintenance_tasks
 * Allows standalone tasks to have skill-level based assignment
 */

exports.up = (pgm) => {
  // Add required_skill_level to maintenance_tasks for standalone tasks
  pgm.addColumn('maintenance_tasks', {
    required_skill_level: {
      type: 'varchar(20)',
      default: null
    }
  });

  // Add index for faster skill-level queries
  pgm.createIndex('maintenance_tasks', 'required_skill_level');
};

exports.down = (pgm) => {
  pgm.dropIndex('maintenance_tasks', 'required_skill_level');
  pgm.dropColumn('maintenance_tasks', 'required_skill_level');
};
