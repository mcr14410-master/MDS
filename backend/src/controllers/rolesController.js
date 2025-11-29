const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

/**
 * Get all roles with their permissions
 * GET /api/roles
 */
async function getAll(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        r.id,
        r.name,
        r.description,
        r.created_at,
        COALESCE(
          json_agg(
            json_build_object('id', p.id, 'name', p.name, 'category', p.category)
          ) FILTER (WHERE p.id IS NOT NULL), 
          '[]'
        ) as permissions,
        (SELECT COUNT(*) FROM user_roles ur WHERE ur.role_id = r.id) as user_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      GROUP BY r.id
      ORDER BY r.name
    `);

    res.json({
      roles: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * Get single role by ID
 * GET /api/roles/:id
 */
async function getById(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        r.id,
        r.name,
        r.description,
        r.created_at,
        COALESCE(
          json_agg(
            json_build_object('id', p.id, 'name', p.name, 'description', p.description, 'category', p.category)
          ) FILTER (WHERE p.id IS NOT NULL), 
          '[]'
        ) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE r.id = $1
      GROUP BY r.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Rolle nicht gefunden'
      });
    }

    // Get users with this role
    const usersResult = await pool.query(`
      SELECT u.id, u.username, u.email, u.first_name, u.last_name
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      WHERE ur.role_id = $1
      ORDER BY u.username
    `, [id]);

    const role = result.rows[0];
    role.users = usersResult.rows.map(user => ({
      ...user,
      full_name: user.first_name && user.last_name 
        ? `${user.first_name} ${user.last_name}`.trim()
        : user.first_name || user.last_name || null
    }));

    res.json({ role });
  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * Create new role (Admin)
 * POST /api/roles
 */
async function create(req, res) {
  try {
    const { name, description, permission_ids = [] } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Rollenname ist erforderlich'
      });
    }

    // Check if role already exists
    const existingRole = await pool.query('SELECT id FROM roles WHERE name = $1', [name]);
    if (existingRole.rows.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Rolle existiert bereits'
      });
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert role
      const roleResult = await client.query(
        `INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING id, name, description, created_at`,
        [name, description || null]
      );

      const newRole = roleResult.rows[0];

      // Assign permissions if provided
      if (permission_ids.length > 0) {
        for (const permissionId of permission_ids) {
          await client.query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [newRole.id, permissionId]
          );
        }
      }

      await client.query('COMMIT');

      // Fetch role with permissions
      const result = await pool.query(`
        SELECT 
          r.id,
          r.name,
          r.description,
          r.created_at,
          COALESCE(
            json_agg(
              json_build_object('id', p.id, 'name', p.name, 'category', p.category)
            ) FILTER (WHERE p.id IS NOT NULL), 
            '[]'
          ) as permissions
        FROM roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        WHERE r.id = $1
        GROUP BY r.id
      `, [newRole.id]);

      res.status(201).json({
        message: 'Rolle erfolgreich erstellt',
        role: result.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * Update role (Admin)
 * PUT /api/roles/:id
 */
async function update(req, res) {
  try {
    const { id } = req.params;
    const { name, description, permission_ids } = req.body;

    // Check if role exists
    const existingRole = await pool.query('SELECT name FROM roles WHERE id = $1', [id]);
    if (existingRole.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Rolle nicht gefunden'
      });
    }

    // Prevent modifying admin role name
    if (existingRole.rows[0].name === 'admin' && name && name !== 'admin') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Der Name der Admin-Rolle kann nicht geändert werden'
      });
    }

    // Check for duplicate name if provided
    if (name) {
      const duplicateName = await pool.query(
        'SELECT id FROM roles WHERE name = $1 AND id != $2',
        [name, id]
      );
      if (duplicateName.rows.length > 0) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Rollenname wird bereits verwendet'
        });
      }
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update role
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(description);
      }

      if (updates.length > 0) {
        values.push(id);
        await client.query(
          `UPDATE roles SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
          values
        );
      }

      // Update permissions if provided
      if (permission_ids !== undefined) {
        // Remove all existing permissions
        await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);

        // Add new permissions
        for (const permissionId of permission_ids) {
          await client.query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
            [id, permissionId]
          );
        }
      }

      await client.query('COMMIT');

      // Fetch updated role with permissions
      const result = await pool.query(`
        SELECT 
          r.id,
          r.name,
          r.description,
          r.created_at,
          COALESCE(
            json_agg(
              json_build_object('id', p.id, 'name', p.name, 'category', p.category)
            ) FILTER (WHERE p.id IS NOT NULL), 
            '[]'
          ) as permissions,
          (SELECT COUNT(*) FROM user_roles ur WHERE ur.role_id = r.id) as user_count
        FROM roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        WHERE r.id = $1
        GROUP BY r.id
      `, [id]);

      res.json({
        message: 'Rolle erfolgreich aktualisiert',
        role: result.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * Delete role (Admin)
 * DELETE /api/roles/:id
 */
async function remove(req, res) {
  try {
    const { id } = req.params;

    // Check if role exists
    const existingRole = await pool.query('SELECT name FROM roles WHERE id = $1', [id]);
    if (existingRole.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Rolle nicht gefunden'
      });
    }

    // Prevent deleting system roles
    const systemRoles = ['admin', 'programmer', 'reviewer', 'operator', 'helper', 'supervisor'];
    if (systemRoles.includes(existingRole.rows[0].name)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'System-Rollen können nicht gelöscht werden'
      });
    }

    // Check if role is in use
    const usersWithRole = await pool.query(
      'SELECT COUNT(*) FROM user_roles WHERE role_id = $1',
      [id]
    );
    if (parseInt(usersWithRole.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Rolle wird noch von ${usersWithRole.rows[0].count} Benutzer(n) verwendet`
      });
    }

    // Delete role (cascade deletes role_permissions)
    await pool.query('DELETE FROM roles WHERE id = $1', [id]);

    res.json({
      message: 'Rolle erfolgreich gelöscht',
      deleted_role: existingRole.rows[0].name
    });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * Get all permissions (grouped by category)
 * GET /api/permissions
 */
async function getAllPermissions(req, res) {
  try {
    const result = await pool.query(`
      SELECT id, name, description, category
      FROM permissions
      ORDER BY category, name
    `);

    // Group by category
    const grouped = {};
    result.rows.forEach(permission => {
      const category = permission.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(permission);
    });

    res.json({
      permissions: result.rows,
      grouped,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * Get permission matrix (roles vs permissions)
 * GET /api/roles/matrix
 */
async function getPermissionMatrix(req, res) {
  try {
    // Get all roles
    const rolesResult = await pool.query('SELECT id, name, description FROM roles ORDER BY name');

    // Get all permissions grouped by category
    const permissionsResult = await pool.query(`
      SELECT id, name, description, category
      FROM permissions
      ORDER BY category, name
    `);

    // Get all role-permission mappings
    const mappingsResult = await pool.query('SELECT role_id, permission_id FROM role_permissions');

    // Create mapping set for quick lookup
    const mappingSet = new Set(
      mappingsResult.rows.map(m => `${m.role_id}-${m.permission_id}`)
    );

    // Build matrix
    const matrix = {};
    rolesResult.rows.forEach(role => {
      matrix[role.id] = {
        role,
        permissions: {}
      };
      permissionsResult.rows.forEach(permission => {
        matrix[role.id].permissions[permission.id] = mappingSet.has(`${role.id}-${permission.id}`);
      });
    });

    // Group permissions by category
    const categories = {};
    permissionsResult.rows.forEach(permission => {
      const category = permission.category || 'other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(permission);
    });

    res.json({
      roles: rolesResult.rows,
      permissions: permissionsResult.rows,
      categories,
      matrix
    });
  } catch (error) {
    console.error('Get permission matrix error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getAllPermissions,
  getPermissionMatrix
};
