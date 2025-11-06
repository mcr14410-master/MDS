const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// CORS Configuration for Frontend
app.use(cors({
  origin: 'http://localhost:5173', // Frontend URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
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

// Import Middleware
const { auditLog } = require('./middleware/auditLogMiddleware');
const { upload, handleMulterError } = require('./middleware/uploadMiddleware');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const partsRoutes = require('./routes/partsRoutes');
const operationsRoutes = require('./routes/operationsRoutes');
const programsRoutes = require('./routes/programsRoutes');

// Audit Log Middleware (logs all CREATE, UPDATE, DELETE operations)
// app.use(auditLog);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/parts', partsRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/programs', programsRoutes);

// TEST: File Upload Endpoint (Woche 6 - Testing)
app.post('/api/test/upload', upload.single('file'), handleMulterError, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    res.json({
      success: true,
      message: 'Datei erfolgreich hochgeladen!',
      file: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path,
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      version: '1.3.0',
      phase: 'Phase 2, Week 7 - Versionierung (Backend)',
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
      message: '🎉 Phase 2, Week 7 - Versionierung Backend ready!'
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
    version: '1.3.0',
    phase: 'Phase 2, Week 7 - Versionierung 🔄',
    endpoints: {
      health: 'GET /api/health',
      dbInfo: 'GET /api/db/info',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/me (Protected)',
        changePassword: 'POST /api/auth/change-password (Protected)'
      },
      parts: {
        list: 'GET /api/parts (Protected)',
        get: 'GET /api/parts/:id (Protected)',
        create: 'POST /api/parts (Protected)',
        update: 'PUT /api/parts/:id (Protected)',
        delete: 'DELETE /api/parts/:id (Protected)',
        stats: 'GET /api/parts/stats (Protected)'
      },
      operations: {
        list: 'GET /api/operations (Protected)',
        listByPart: 'GET /api/operations?part_id=1 (Protected)',
        get: 'GET /api/operations/:id (Protected)',
        create: 'POST /api/operations (Protected)',
        update: 'PUT /api/operations/:id (Protected)',
        delete: 'DELETE /api/operations/:id (Protected)'
      },
      programs: {
        list: 'GET /api/programs (Protected)',
        listByOperation: 'GET /api/programs?operation_id=1 (Protected)',
        get: 'GET /api/programs/:id (Protected)',
        create: 'POST /api/programs (Protected, Multipart)',
        update: 'PUT /api/programs/:id (Protected)',
        delete: 'DELETE /api/programs/:id (Protected)',
        download: 'GET /api/programs/:id/download (Protected)',
        // NEW - Week 7: Versionierung
        uploadRevision: 'POST /api/programs/:id/revisions (Protected, Multipart)',
        getRevisions: 'GET /api/programs/:id/revisions (Protected)',
        compareByVersion: 'GET /api/programs/:id/compare?from=1.0.0&to=1.0.1 (Protected)',
        compareByIds: 'GET /api/programs/:id/revisions/:r1/compare/:r2 (Protected)',
        rollback: 'POST /api/programs/:id/rollback?to=1.0.1 (Protected)'
      }
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
      'GET /api/db/info',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'POST /api/auth/change-password',
      'GET /api/parts',
      'GET /api/parts/:id',
      'POST /api/parts',
      'PUT /api/parts/:id',
      'DELETE /api/parts/:id',
      'GET /api/parts/stats',
      'GET /api/operations',
      'GET /api/operations/:id',
      'POST /api/operations',
      'PUT /api/operations/:id',
      'DELETE /api/operations/:id',
      'GET /api/programs',
      'GET /api/programs/:id',
      'POST /api/programs',
      'PUT /api/programs/:id',
      'DELETE /api/programs/:id',
      'GET /api/programs/:id/download',
      // NEW - Week 7: Versionierung
      'POST /api/programs/:id/revisions',
      'GET /api/programs/:id/revisions',
      'GET /api/programs/:id/compare',
      'POST /api/programs/:id/rollback'
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
  console.log('   🔐 Auth Endpoints:');
  console.log(`      POST /api/auth/register`);
  console.log(`      POST /api/auth/login`);
  console.log(`      GET  /api/auth/me`);
  console.log(`      POST /api/auth/change-password`);
  console.log('   ========================================');
  console.log('   🔧 Parts Endpoints:');
  console.log(`      GET    /api/parts`);
  console.log(`      GET    /api/parts/:id`);
  console.log(`      POST   /api/parts`);
  console.log(`      PUT    /api/parts/:id`);
  console.log(`      DELETE /api/parts/:id`);
  console.log(`      GET    /api/parts/stats`);
  console.log('   ========================================');
  console.log('   ⚙️  Operations Endpoints:');
  console.log(`      GET    /api/operations`);
  console.log(`      GET    /api/operations/:id`);
  console.log(`      POST   /api/operations`);
  console.log(`      PUT    /api/operations/:id`);
  console.log(`      DELETE /api/operations/:id`);
  console.log('   ========================================');
  console.log('   📦 Programs Endpoints:');
  console.log(`      POST   /api/programs`);
  console.log(`      GET    /api/programs`);
  console.log(`      GET    /api/programs/:id`);
  console.log(`      GET    /api/programs/:id/download`);
  console.log(`      PUT    /api/programs/:id`);
  console.log(`      DELETE /api/programs/:id`);
  console.log('   ----------------------------------------');
  console.log('   🔄 Versionierung (NEW Week 7):');
  console.log(`      POST   /api/programs/:id/revisions`);
  console.log(`      GET    /api/programs/:id/revisions`);
  console.log(`      GET    /api/programs/:id/compare`);
  console.log(`      POST   /api/programs/:id/rollback`);
  console.log('   ========================================');
  console.log('   ⚡ Phase 2, Week 7 - Versionierung (Backend)');
  console.log('   ✅ Auth + Parts + Operations + Programs CRUD');
  console.log('   ✅ File Upload (Multer, 15 Dateitypen, 100MB)');
  console.log('   ✅ Major/Minor/Patch Versionierung');
  console.log('   ✅ Diff-Berechnung & Rollback');
  console.log('   🔌 CORS enabled for Frontend (localhost:5173)');
  console.log('   📋 Backend KOMPLETT | Frontend offen');
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
