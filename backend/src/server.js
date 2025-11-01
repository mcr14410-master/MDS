const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to database:', err.message);
  } else {
    console.log('✅ Database connected successfully');
    release();
  }
});

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const result = await pool.query('SELECT NOW()');
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: '1.0.0',
      phase: 'Phase 1, Week 1 Complete',
      dbTime: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Database Info Endpoint
app.get('/api/db/info', async (req, res) => {
  try {
    // Count tables
    const tablesResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    // Count users
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    
    // Count roles
    const rolesResult = await pool.query('SELECT COUNT(*) as count FROM roles');
    
    // Count permissions
    const permissionsResult = await pool.query('SELECT COUNT(*) as count FROM permissions');

    res.json({
      database: process.env.DB_NAME,
      tables: parseInt(tablesResult.rows[0].count),
      users: parseInt(usersResult.rows[0].count),
      roles: parseInt(rolesResult.rows[0].count),
      permissions: parseInt(permissionsResult.rows[0].count),
      message: '🎉 Phase 1, Week 1 - Database Schema Complete!'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'MDS - Manufacturing Data System',
    version: '1.0.0',
    phase: 'Phase 1, Week 1 - Database Complete ✅',
    nextPhase: 'Phase 1, Week 2 - Backend API + Auth',
    endpoints: {
      health: '/api/health',
      dbInfo: '/api/db/info'
    },
    documentation: 'https://github.com/mcr14410-master/MDS'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/db/info'
    ]
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 ========================================');
  console.log(`   MDS Backend Server`);
  console.log('   ========================================');
  console.log(`   📍 Running on: http://localhost:${PORT}`);
  console.log(`   🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`   📊 DB Info: http://localhost:${PORT}/api/db/info`);
  console.log('   ========================================');
  console.log('   ✅ Phase 1, Week 1 - COMPLETE!');
  console.log('   📋 Next: Week 2 - Backend API + Auth');
  console.log('   ========================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  pool.end(() => {
    console.log('Database pool closed');
  });
});

module.exports = app;
