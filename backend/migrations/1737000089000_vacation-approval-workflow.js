/* eslint-disable camelcase */

/**
 * Migration: Vacation Approval Workflow
 * 
 * Adds:
 * - rejection_reason column for declined requests
 * - vacations.approve permission for approving/rejecting requests
 * - Updates existing entries to track who created them
 */

exports.shorthands = undefined;

exports.up = async (pgm) => {
  // Add rejection_reason column
  pgm.addColumn('vacations', {
    rejection_reason: { type: 'text' }
  });

  // Add vacations.approve permission
  pgm.sql(`
    INSERT INTO permissions (name, description, category)
    VALUES ('vacations.approve', 'Kann Urlaubsanträge genehmigen oder ablehnen', 'Urlaub')
    ON CONFLICT (name) DO NOTHING;
  `);

  // Grant vacations.approve to admin role
  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id 
    FROM roles r, permissions p 
    WHERE r.name = 'admin' AND p.name = 'vacations.approve'
    ON CONFLICT DO NOTHING;
  `);

  // Add index for pending status queries
  pgm.createIndex('vacations', ['status', 'created_at'], {
    name: 'idx_vacations_pending_status',
    where: "status = 'pending'"
  });
};

exports.down = async (pgm) => {
  // Remove index
  pgm.dropIndex('vacations', ['status', 'created_at'], {
    name: 'idx_vacations_pending_status'
  });

  // Remove permission from roles
  pgm.sql(`
    DELETE FROM role_permissions 
    WHERE permission_id = (SELECT id FROM permissions WHERE name = 'vacations.approve');
  `);

  // Remove permission
  pgm.sql(`DELETE FROM permissions WHERE name = 'vacations.approve';`);

  // Remove column
  pgm.dropColumn('vacations', 'rejection_reason');
};
