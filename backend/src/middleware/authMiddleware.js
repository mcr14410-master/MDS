const { verifyToken } = require('../utils/jwt');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

/**
 * Middleware to verify JWT token
 * Adds user object to req.user if valid
 */
async function authenticateToken(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required'
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    // Get user from database
    const result = await pool.query(
      'SELECT id, username, email, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User account is disabled'
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: error.message || 'Invalid token'
    });
  }
}

/**
 * Middleware to check if user has specific permission
 * @param {string} permission - Permission name (e.g., 'part.create')
 */
function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;

      // Check if user has the permission through roles
      const result = await pool.query(`
        SELECT p.name
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1 AND p.name = $2
      `, [userId, permission]);

      if (result.rows.length === 0) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `You don't have permission: ${permission}`
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  };
}

/**
 * Middleware to check if user has specific role
 * @param {string} roleName - Role name (e.g., 'admin')
 */
function requireRole(roleName) {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;

      // Check if user has the role
      const result = await pool.query(`
        SELECT r.name
        FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = $1 AND r.name = $2
      `, [userId, roleName]);

      if (result.rows.length === 0) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `You don't have role: ${roleName}`
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  };
}

/**
 * Middleware to authenticate terminal devices via API-Key
 * Checks X-Terminal-Key header against time_terminals table
 * Adds terminal object to req.terminal if valid
 */
async function authenticateTerminal(req, res, next) {
  try {
    const apiKey = req.headers['x-terminal-key'];

    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Terminal API-Key erforderlich (Header: X-Terminal-Key)'
      });
    }

    const result = await pool.query(
      `SELECT id, name, location, terminal_type, is_active, settings 
       FROM time_terminals 
       WHERE api_key = $1`,
      [apiKey]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Ungültiger Terminal API-Key'
      });
    }

    const terminal = result.rows[0];

    if (!terminal.is_active) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Terminal ist deaktiviert'
      });
    }

    // Heartbeat aktualisieren
    pool.query(
      'UPDATE time_terminals SET last_heartbeat = NOW() WHERE id = $1',
      [terminal.id]
    ).catch(() => {}); // Fire and forget

    req.terminal = terminal;
    next();
  } catch (error) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

module.exports = {
  authenticateToken,
  requirePermission,
  requireRole,
  authenticateTerminal
};
