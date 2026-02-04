const { Pool } = require('pg');
const { hashPassword } = require('../utils/password');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

/**
 * Get all users with their roles
 * GET /api/users
 */
async function getAll(req, res) {
  try {
    const { search, role, is_active, sort_by = 'username', sort_order = 'ASC' } = req.query;

    // Validate sort parameters
    const allowedSortFields = ['username', 'email', 'first_name', 'last_name', 'created_at', 'last_login'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'username';
    const sortDirection = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    let query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        u.is_active,
        u.skill_level,
        u.is_available,
        u.vacation_tracking_enabled,
        u.last_login,
        u.created_at,
        u.updated_at,
        COALESCE(
          json_agg(
            json_build_object('id', r.id, 'name', r.name)
          ) FILTER (WHERE r.id IS NOT NULL), 
          '[]'
        ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Search filter
    if (search) {
      query += ` AND (
        u.username ILIKE $${paramIndex} OR 
        u.email ILIKE $${paramIndex} OR 
        u.first_name ILIKE $${paramIndex} OR 
        u.last_name ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Role filter
    if (role) {
      query += ` AND EXISTS (
        SELECT 1 FROM user_roles ur2 
        JOIN roles r2 ON ur2.role_id = r2.id 
        WHERE ur2.user_id = u.id AND r2.name = $${paramIndex}
      )`;
      params.push(role);
      paramIndex++;
    }

    // Active filter
    if (is_active !== undefined) {
      query += ` AND u.is_active = $${paramIndex}`;
      params.push(is_active === 'true');
      paramIndex++;
    }

    query += ` GROUP BY u.id ORDER BY u.${sortField} ${sortDirection}`;

    const result = await pool.query(query, params);

    // Add full_name to each user
    const users = result.rows.map(user => ({
      ...user,
      full_name: user.first_name && user.last_name 
        ? `${user.first_name} ${user.last_name}`.trim()
        : user.first_name || user.last_name || null
    }));

    res.json({
      users,
      total: users.length
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * Get single user by ID
 * GET /api/users/:id
 */
async function getById(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        u.is_active,
        u.skill_level,
        u.is_available,
        u.vacation_tracking_enabled,
        u.time_tracking_enabled,
        u.time_model_id,
        u.rfid_chip_id,
        u.pin_code,
        u.last_login,
        u.created_at,
        u.updated_at,
        tm.name as time_model_name,
        COALESCE(
          json_agg(
            json_build_object('id', r.id, 'name', r.name, 'description', r.description)
          ) FILTER (WHERE r.id IS NOT NULL), 
          '[]'
        ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN time_models tm ON u.time_model_id = tm.id
      WHERE u.id = $1
      GROUP BY u.id, tm.name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Benutzer nicht gefunden'
      });
    }

    const user = result.rows[0];
    user.full_name = user.first_name && user.last_name 
      ? `${user.first_name} ${user.last_name}`.trim()
      : user.first_name || user.last_name || null;

    // Get user permissions through roles
    const permissionsResult = await pool.query(`
      SELECT DISTINCT p.id, p.name, p.description, p.category
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = $1
      ORDER BY p.category, p.name
    `, [id]);

    user.permissions = permissionsResult.rows;

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * Create new user (Admin)
 * POST /api/users
 */
async function create(req, res) {
  try {
    const { username, email, password, first_name, last_name, is_active = true, skill_level = 'operator', role_ids = [] } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Username, E-Mail und Passwort sind erforderlich'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Ungültiges E-Mail-Format'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Passwort muss mindestens 6 Zeichen lang sein'
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Benutzername oder E-Mail existiert bereits'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert user
      const userResult = await client.query(
        `INSERT INTO users (username, email, password_hash, first_name, last_name, is_active, skill_level)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, username, email, first_name, last_name, is_active, skill_level, created_at`,
        [username, email, passwordHash, first_name || null, last_name || null, is_active, skill_level]
      );

      const newUser = userResult.rows[0];

      // Assign roles if provided
      if (role_ids.length > 0) {
        for (const roleId of role_ids) {
          await client.query(
            'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [newUser.id, roleId]
          );
        }
      }

      await client.query('COMMIT');

      // Fetch user with roles
      const result = await pool.query(`
        SELECT 
          u.id,
          u.username,
          u.email,
          u.first_name,
          u.last_name,
          u.is_active,
          u.created_at,
          COALESCE(
            json_agg(
              json_build_object('id', r.id, 'name', r.name)
            ) FILTER (WHERE r.id IS NOT NULL), 
            '[]'
          ) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.id = $1
        GROUP BY u.id
      `, [newUser.id]);

      const user = result.rows[0];
      user.full_name = user.first_name && user.last_name 
        ? `${user.first_name} ${user.last_name}`.trim()
        : user.first_name || user.last_name || null;

      res.status(201).json({
        message: 'Benutzer erfolgreich erstellt',
        user
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * Update user (Admin)
 * PUT /api/users/:id
 */
async function update(req, res) {
  try {
    const { id } = req.params;
    const { 
      username, email, first_name, last_name, is_active, skill_level, is_available, 
      vacation_tracking_enabled, time_tracking_enabled, time_model_id, rfid_chip_id, pin_code,
      role_ids 
    } = req.body;

    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Benutzer nicht gefunden'
      });
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Ungültiges E-Mail-Format'
        });
      }

      // Check for duplicate email
      const duplicateEmail = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );
      if (duplicateEmail.rows.length > 0) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'E-Mail wird bereits verwendet'
        });
      }
    }

    // Check for duplicate username if provided
    if (username) {
      const duplicateUsername = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username, id]
      );
      if (duplicateUsername.rows.length > 0) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Benutzername wird bereits verwendet'
        });
      }
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (username !== undefined) {
        updates.push(`username = $${paramIndex++}`);
        values.push(username);
      }
      if (email !== undefined) {
        updates.push(`email = $${paramIndex++}`);
        values.push(email);
      }
      if (first_name !== undefined) {
        updates.push(`first_name = $${paramIndex++}`);
        values.push(first_name);
      }
      if (last_name !== undefined) {
        updates.push(`last_name = $${paramIndex++}`);
        values.push(last_name);
      }
      if (is_active !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(is_active);
      }
      if (skill_level !== undefined) {
        // Validate skill_level
        const validSkillLevels = ['helper', 'operator', 'technician', 'specialist'];
        if (!validSkillLevels.includes(skill_level)) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: 'Bad Request',
            message: `Ungültiges Skill-Level. Erlaubt: ${validSkillLevels.join(', ')}`
          });
        }
        updates.push(`skill_level = $${paramIndex++}`);
        values.push(skill_level);
      }
      if (is_available !== undefined) {
        updates.push(`is_available = $${paramIndex++}`);
        values.push(is_available);
      }
      if (vacation_tracking_enabled !== undefined) {
        updates.push(`vacation_tracking_enabled = $${paramIndex++}`);
        values.push(vacation_tracking_enabled);
      }
      if (time_tracking_enabled !== undefined) {
        updates.push(`time_tracking_enabled = $${paramIndex++}`);
        values.push(time_tracking_enabled);
      }
      if (time_model_id !== undefined) {
        updates.push(`time_model_id = $${paramIndex++}`);
        values.push(time_model_id);
      }
      if (rfid_chip_id !== undefined) {
        updates.push(`rfid_chip_id = $${paramIndex++}`);
        values.push(rfid_chip_id || null);
      }
      if (pin_code !== undefined) {
        updates.push(`pin_code = $${paramIndex++}`);
        values.push(pin_code || null);
      }

      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        values.push(id);

        await client.query(
          `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
          values
        );
      }

      // Update roles if provided
      if (role_ids !== undefined) {
        // Remove all existing roles
        await client.query('DELETE FROM user_roles WHERE user_id = $1', [id]);

        // Add new roles
        for (const roleId of role_ids) {
          await client.query(
            'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
            [id, roleId]
          );
        }
      }

      await client.query('COMMIT');

      // Fetch updated user with roles
      const result = await pool.query(`
        SELECT 
          u.id,
          u.username,
          u.email,
          u.first_name,
          u.last_name,
          u.is_active,
          u.last_login,
          u.created_at,
          u.updated_at,
          COALESCE(
            json_agg(
              json_build_object('id', r.id, 'name', r.name)
            ) FILTER (WHERE r.id IS NOT NULL), 
            '[]'
          ) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.id = $1
        GROUP BY u.id
      `, [id]);

      const user = result.rows[0];
      user.full_name = user.first_name && user.last_name 
        ? `${user.first_name} ${user.last_name}`.trim()
        : user.first_name || user.last_name || null;

      res.json({
        message: 'Benutzer erfolgreich aktualisiert',
        user
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * Delete user (Admin)
 * DELETE /api/users/:id
 */
async function remove(req, res) {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;

    // Prevent self-deletion
    if (parseInt(id) === currentUserId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Sie können sich nicht selbst löschen'
      });
    }

    // Check if user exists
    const existingUser = await pool.query('SELECT username FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Benutzer nicht gefunden'
      });
    }

    // Delete user (cascade deletes user_roles)
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({
      message: 'Benutzer erfolgreich gelöscht',
      deleted_user: existingUser.rows[0].username
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * Reset user password (Admin)
 * POST /api/users/:id/reset-password
 */
async function resetPassword(req, res) {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    // Validate password
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Neues Passwort muss mindestens 6 Zeichen lang sein'
      });
    }

    // Check if user exists
    const existingUser = await pool.query('SELECT username FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Benutzer nicht gefunden'
      });
    }

    // Hash new password
    const passwordHash = await hashPassword(new_password);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, id]
    );

    res.json({
      message: 'Passwort erfolgreich zurückgesetzt',
      username: existingUser.rows[0].username
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * Toggle user active status (Admin)
 * PATCH /api/users/:id/toggle-active
 */
async function toggleActive(req, res) {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;

    // Prevent self-deactivation
    if (parseInt(id) === currentUserId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Sie können sich nicht selbst deaktivieren'
      });
    }

    // Check if user exists
    const existingUser = await pool.query('SELECT username, is_active FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Benutzer nicht gefunden'
      });
    }

    const newStatus = !existingUser.rows[0].is_active;

    // Toggle status
    await pool.query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2',
      [newStatus, id]
    );

    res.json({
      message: newStatus ? 'Benutzer aktiviert' : 'Benutzer deaktiviert',
      username: existingUser.rows[0].username,
      is_active: newStatus
    });
  } catch (error) {
    console.error('Toggle active error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * Get user activity log (audit log entries for user)
 * GET /api/users/:id/activity
 */
async function getActivity(req, res) {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Check if user exists
    const existingUser = await pool.query('SELECT username FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Benutzer nicht gefunden'
      });
    }

    // Get audit log entries for this user
    const result = await pool.query(`
      SELECT 
        id,
        action,
        entity_type,
        entity_id,
        changes,
        reason,
        ip_address,
        user_agent,
        created_at
      FROM audit_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [id, parseInt(limit), parseInt(offset)]);

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM audit_logs WHERE user_id = $1',
      [id]
    );

    res.json({
      username: existingUser.rows[0].username,
      activities: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * Update own profile (any authenticated user)
 * PUT /api/users/profile
 */
async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { first_name, last_name, email } = req.body;

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Ungültiges E-Mail-Format'
        });
      }

      // Check for duplicate email
      const duplicateEmail = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );
      if (duplicateEmail.rows.length > 0) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'E-Mail wird bereits verwendet'
        });
      }
    }

    // Build update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (first_name !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      values.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      values.push(last_name);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Keine Änderungen angegeben'
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    // Fetch updated user with roles
    const result = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        u.is_active,
        u.last_login,
        u.created_at,
        u.updated_at,
        COALESCE(json_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '[]') as roles,
        COALESCE(json_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL), '[]') as permissions
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = $1
      GROUP BY u.id
    `, [userId]);

    const user = result.rows[0];
    user.full_name = user.first_name && user.last_name 
      ? `${user.first_name} ${user.last_name}`.trim()
      : user.first_name || user.last_name || null;

    res.json({
      message: 'Profil erfolgreich aktualisiert',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
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
  resetPassword,
  toggleActive,
  getActivity,
  updateProfile
};
