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

      // Extract table name from route path
      const pathParts = req.path.split('/').filter(p => p);
      let tableName = 'unknown';
      let recordId = null;

      // Parse route: /api/parts/123 -> table: parts, id: 123
      if (pathParts.length >= 2) {
        tableName = pathParts[1]; // e.g., "parts", "operations", "machines"
        
        // Try to extract record ID from URL (for UPDATE/DELETE)
        if (pathParts.length >= 3 && !isNaN(pathParts[2])) {
          recordId = parseInt(pathParts[2]);
        }
      }

      // Try to extract record ID from response body (for CREATE)
      if (action === 'CREATE' && responseBody) {
        try {
          const parsed = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
          if (parsed.part?.id) recordId = parsed.part.id;
          if (parsed.operation?.id) recordId = parsed.operation.id;
          if (parsed.machine?.id) recordId = parsed.machine.id;
          if (parsed.id) recordId = parsed.id;
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Prepare data to log
      const oldData = method === 'DELETE' ? req.body : null;
      const newData = method === 'DELETE' ? null : req.body;

      // Insert audit log
      const query = `
        INSERT INTO audit_logs (
          user_id,
          action,
          table_name,
          record_id,
          old_data,
          new_data,
          ip_address,
          user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      const values = [
        req.user.id,
        action,
        tableName,
        recordId,
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
        req.ip || req.connection.remoteAddress,
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
 * @param {string} tableName - Name of the table
 * @param {number} recordId - ID of the record
 * @returns {Promise<Array>} - Array of audit log entries
 */
const getAuditLogs = async (tableName, recordId) => {
  try {
    const query = `
      SELECT 
        al.*,
        u.username,
        u.first_name,
        u.last_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.table_name = $1 AND al.record_id = $2
      ORDER BY al.created_at DESC
    `;

    const result = await pool.query(query, [tableName, recordId]);
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
 * @param {string} filters.tableName - Filter by table name
 * @param {string} filters.action - Filter by action (CREATE, UPDATE, DELETE)
 * @param {number} filters.userId - Filter by user ID
 * @param {Date} filters.startDate - Filter by start date
 * @param {Date} filters.endDate - Filter by end date
 * @param {number} filters.limit - Number of logs to return (default: 100)
 * @returns {Promise<Array>} - Array of audit log entries
 */
const getAllAuditLogs = async (filters = {}) => {
  try {
    const { tableName, action, userId, startDate, endDate, limit = 100 } = filters;
    
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

    if (tableName) {
      query += ` AND al.table_name = $${paramCount}`;
      params.push(tableName);
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
