const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

/**
 * Audit Log Middleware
 * Logs all CREATE, UPDATE, DELETE operations to audit_logs table
 * 
 * Usage: app.use(auditLog);
 * 
 * Requires: req.user (from authenticateToken middleware)
 */
const auditLog = async (req, res, next) => {
  // Store original response methods
  const originalJson = res.json;
  const originalSend = res.send;

  // Capture response body
  let responseBody = null;
  let statusCode = null;

  // Override res.json
  res.json = function (body) {
    responseBody = body;
    statusCode = res.statusCode;
    return originalJson.call(this, body);
  };

  // Override res.send
  res.send = function (body) {
    responseBody = body;
    statusCode = res.statusCode;
    return originalSend.call(this, body);
  };

  // Continue to next middleware/route
  next();

  // After response is sent
  res.on('finish', async () => {
    try {
      // Only log if user is authenticated
      if (!req.user) return;

      // Only log specific methods
      const method = req.method;
      if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return;

      // Only log successful operations (2xx status codes)
      if (statusCode < 200 || statusCode >= 300) return;

      // Use originalUrl for full path (req.path only shows path after route mount point)
      const fullPath = req.originalUrl || req.path;
      
      // Skip certain paths (login, health checks, etc.)
      const skipPaths = ['/api/auth/login', '/api/auth/register', '/api/health'];
      if (skipPaths.some(p => fullPath.startsWith(p))) return;

      // Determine action based on method
      let action = '';
      switch (method) {
        case 'POST':
          action = 'CREATE';
          break;
        case 'PUT':
        case 'PATCH':
          action = 'UPDATE';
          break;
        case 'DELETE':
          action = 'DELETE';
          break;
        default:
          return; // Don't log other methods
      }

      // Extract entity type from route path
      // Remove query string if present
      const pathWithoutQuery = fullPath.split('?')[0];
      const pathParts = pathWithoutQuery.split('/').filter(p => p);
      let entityType = 'unknown';
      let entityId = null;

      // Parse various route patterns:
      // /api/parts/123 -> entity_type: parts, entity_id: 123
      // /api/parts/5/operations -> entity_type: operations (CREATE)
      // /api/parts/5/operations/10 -> entity_type: operations, entity_id: 10
      // /api/operations/10 -> entity_type: operations, entity_id: 10
      
      if (pathParts.length >= 2) {
        // Check for nested routes like /api/parts/5/operations/10
        if (pathParts.length >= 4 && !isNaN(pathParts[2])) {
          // Nested route: use the sub-resource as entity type
          entityType = pathParts[3]; // e.g., "operations", "programs"
          if (pathParts.length >= 5 && !isNaN(pathParts[4])) {
            entityId = parseInt(pathParts[4]);
          }
        } else {
          // Simple route: /api/parts/123
          entityType = pathParts[1];
          if (pathParts.length >= 3 && !isNaN(pathParts[2])) {
            entityId = parseInt(pathParts[2]);
          }
        }
      }

      // Try to extract record ID from response body (for CREATE)
      if (!entityId && responseBody) {
        try {
          const parsed = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
          // Check various response formats - look for any .id field
          const findId = (obj) => {
            if (!obj || typeof obj !== 'object') return null;
            if (obj.id) return obj.id;
            // Check common response patterns
            for (const key of Object.keys(obj)) {
              if (obj[key] && typeof obj[key] === 'object' && obj[key].id) {
                return obj[key].id;
              }
            }
            return null;
          };
          entityId = findId(parsed);
        } catch (e) {
          // Ignore parse errors
        }
      }

      // For CREATE without ID, still log with entityId = 0 (will be updated)
      if (!entityId && action === 'CREATE') {
        entityId = 0; // Placeholder - indicates new record
      }

      // Skip if still no entity ID and not CREATE
      if (!entityId) return;

      // Prepare changes data
      const changes = {
        method: method,
        path: req.path,
        body: req.body || null
      };

      // Insert audit log
      const query = `
        INSERT INTO audit_logs (
          user_id,
          entity_type,
          entity_id,
          action,
          changes,
          ip_address,
          user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      const values = [
        req.user.id,
        entityType,
        entityId,
        action,
        JSON.stringify(changes),
        req.ip || req.connection?.remoteAddress || null,
        req.get('user-agent') || 'unknown'
      ];

      await pool.query(query, values);

    } catch (error) {
      // Don't crash the app if audit logging fails
      console.error('Audit log error:', error.message);
    }
  });
};

/**
 * Get audit logs for a specific record
 * @param {string} entityType - Type of entity (e.g., 'parts', 'machines')
 * @param {number} entityId - ID of the record
 * @returns {Promise<Array>} - Array of audit log entries
 */
const getAuditLogs = async (entityType, entityId) => {
  try {
    const query = `
      SELECT 
        al.*,
        u.username,
        u.first_name,
        u.last_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.entity_type = $1 AND al.entity_id = $2
      ORDER BY al.created_at DESC
    `;

    const result = await pool.query(query, [entityType, entityId]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
};

/**
 * Get recent audit logs for a user
 * @param {number} userId - ID of the user
 * @param {number} limit - Number of logs to return (default: 50)
 * @returns {Promise<Array>} - Array of audit log entries
 */
const getUserAuditLogs = async (userId, limit = 50) => {
  try {
    const query = `
      SELECT 
        al.*,
        u.username,
        u.first_name,
        u.last_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.user_id = $1
      ORDER BY al.created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    throw error;
  }
};

/**
 * Get all audit logs with filtering
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} - Array of audit log entries
 */
const getAllAuditLogs = async (filters = {}) => {
  try {
    const { entityType, action, userId, startDate, endDate, limit = 100 } = filters;
    
    let query = `
      SELECT 
        al.*,
        u.username,
        u.first_name,
        u.last_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (entityType) {
      query += ` AND al.entity_type = $${paramCount}`;
      params.push(entityType);
      paramCount++;
    }

    if (action) {
      query += ` AND al.action = $${paramCount}`;
      params.push(action);
      paramCount++;
    }

    if (userId) {
      query += ` AND al.user_id = $${paramCount}`;
      params.push(userId);
      paramCount++;
    }

    if (startDate) {
      query += ` AND al.created_at >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND al.created_at <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
};

module.exports = {
  auditLog,
  getAuditLogs,
  getUserAuditLogs,
  getAllAuditLogs
};
