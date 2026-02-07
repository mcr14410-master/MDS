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
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploads)
app.use('/uploads', express.static('uploads'));

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
const machinesRoutes = require('./routes/machinesRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const setupSheetsRoutes = require('./routes/setupSheetsRoutes');
const toolListsRoutes = require('./routes/toolListsRoutes');
const inspectionPlansRoutes = require('./routes/inspectionPlansRoutes');
const storageRoutes = require('./routes/storageRoutes');
const toolCategoriesRoutes = require('./routes/toolCategoriesRoutes');
const toolMasterRoutes = require('./routes/toolMasterRoutes');
const storageItemsRoutes = require('./routes/storageItemsRoutes');
const stockMovementsRoutes = require('./routes/stockMovementsRoutes');
const toolDocumentsRoutes = require('./routes/toolDocumentsRoutes');
const toolCompatibleInsertsRoutes = require('./routes/toolCompatibleInsertsRoutes');
const qrCodesRoutes = require('./routes/qrCodes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const suppliersRoutes = require('./routes/suppliersRoutes');
const customersRoutes = require('./routes/customersRoutes');
const customerContactsRoutes = require('./routes/customerContactsRoutes');
const supplierItemsRoutes = require('./routes/supplierItemsRoutes');
const purchaseOrdersRoutes = require('./routes/purchaseOrdersRoutes');
const toolNumberListsRoutes = require('./routes/toolNumberListsRoutes');
const toolNumberListItemsRoutes = require('./routes/toolNumberListItemsRoutes');
const toolNumberAlternativesRoutes = require('./routes/toolNumberAlternativesRoutes');
const measuringEquipmentRoutes = require('./routes/measuringEquipmentRoutes');
const calibrationsRoutes = require('./routes/calibrationsRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const clampingDevicesRoutes = require('./routes/clampingDevicesRoutes');
const clampingDeviceDocumentsRoutes = require('./routes/clampingDeviceDocumentsRoutes');
const fixturesRoutes = require('./routes/fixturesRoutes');
const fixtureDocumentsRoutes = require('./routes/fixtureDocumentsRoutes');
const machineDocumentsRoutes = require('./routes/machineDocumentsRoutes');
const usersRoutes = require('./routes/usersRoutes');
const rolesRoutes = require('./routes/rolesRoutes');
const permissionsRoutes = require('./routes/permissionsRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const wikiRoutes = require('./routes/wikiRoutes');
const consumableCategoriesRoutes = require('./routes/consumableCategoriesRoutes');
const consumablesRoutes = require('./routes/consumablesRoutes');
// REMOVED after simplification - stock/transactions no longer needed
// const consumableStockRoutes = require('./routes/consumableStockRoutes');
// const consumableTransactionsRoutes = require('./routes/consumableTransactionsRoutes');
const consumableDocumentsRoutes = require('./routes/consumableDocumentsRoutes');
const searchRoutes = require('./routes/searchRoutes');
const operationTypesRoutes = require('./routes/operationTypes');
const workInstructionsRoutes = require('./routes/workInstructionsRoutes');
const checklistsRoutes = require('./routes/checklistsRoutes');
const operationDocumentsRoutes = require('./routes/operationDocumentsRoutes');
const operationMeasuringEquipmentRoutes = require('./routes/operationMeasuringEquipmentRoutes');
const operationConsumablesRoutes = require('./routes/operationConsumablesRoutes');
const operationRawMaterialsRoutes = require('./routes/operationRawMaterialsRoutes');
const vacationRoutes = require('./routes/vacationRoutes');
const zerobotRoutes = require('./routes/zerobotRoutes');
const timeTrackingRoutes = require('./routes/timeTrackingRoutes');
const terminalRoutes = require('./routes/terminalRoutes');
const cronRoutes = require('./routes/cronRoutes');
const cronService = require('./services/cronService');

// Audit Log Middleware (logs all CREATE, UPDATE, DELETE operations)
app.use(auditLog);

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const result = await pool.query('SELECT NOW()');
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
   //   version: '1.7.0',
   //   phase: 'Phase 3, Week 11 - Tool Lists (Backend)',
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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/terminal', terminalRoutes);
app.use('/api/parts', partsRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/programs', programsRoutes);
app.use('/api/machines', machinesRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/setup-sheets', setupSheetsRoutes);
app.use('/api', toolListsRoutes);
app.use('/api', inspectionPlansRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/tool', toolCategoriesRoutes);
app.use('/api/tool-master', toolMasterRoutes);
app.use('/api/storage/items', storageItemsRoutes);
app.use('/api/stock-movements', stockMovementsRoutes);
app.use('/api', toolDocumentsRoutes);
app.use('/api/machine-documents', machineDocumentsRoutes);
app.use('/api', toolCompatibleInsertsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', qrCodesRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/customers/:customerId/contacts', customerContactsRoutes);
app.use('/api/supplier-items', supplierItemsRoutes);
app.use('/api/purchase-orders', purchaseOrdersRoutes);
app.use('/api/tool-number-lists', toolNumberListsRoutes);
app.use('/api/tool-number-list-items', toolNumberListItemsRoutes);
app.use('/api/tool-number-alternatives', toolNumberAlternativesRoutes);
app.use('/api/measuring-equipment', measuringEquipmentRoutes);
app.use('/api/calibrations', calibrationsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/clamping-devices', clampingDevicesRoutes);
app.use('/api/clamping-devices', clampingDeviceDocumentsRoutes);
app.use('/api/fixtures', fixturesRoutes);
app.use('/api/fixtures', fixtureDocumentsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/wiki', wikiRoutes);
app.use('/api/consumable-categories', consumableCategoriesRoutes);
app.use('/api/consumables', consumablesRoutes);
// REMOVED after simplification
// app.use('/api/consumable-stock', consumableStockRoutes);
// app.use('/api/consumable-transactions', consumableTransactionsRoutes);
app.use('/api/consumable-documents', consumableDocumentsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/operation-types', operationTypesRoutes);
app.use('/api/work-instructions', workInstructionsRoutes);
app.use('/api/checklists', checklistsRoutes);
app.use('/api/operation-documents', operationDocumentsRoutes);
app.use('/api/operation-measuring-equipment', operationMeasuringEquipmentRoutes);
app.use('/api/operation-consumables', operationConsumablesRoutes);
app.use('/api/operation-raw-materials', operationRawMaterialsRoutes);
app.use('/api', vacationRoutes);
app.use('/api/zerobot', zerobotRoutes);
app.use('/api/time-tracking', timeTrackingRoutes);
app.use('/api/system/cron', cronRoutes);



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
      message: '🔄 Phase 3, Week 9 - Workflow-System Backend ready!'
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
    version: '1.5.0',
    phase: 'Phase 3, Week 9 - Workflow-System 🔄',
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
      },
      machines: {
        list: 'GET /api/machines (Protected)',
        get: 'GET /api/machines/:id (Protected)',
        create: 'POST /api/machines (Protected)',
        update: 'PUT /api/machines/:id (Protected)',
        delete: 'DELETE /api/machines/:id (Protected)',
        stats: 'GET /api/machines/:id/stats (Protected)',
        operations: 'GET /api/machines/:id/operations (Protected)'
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
      'POST /api/programs/:id/rollback',
      // NEW - Week 8: Machines
      'GET /api/machines',
      'GET /api/machines/:id',
      'POST /api/machines',
      'PUT /api/machines/:id',
      'DELETE /api/machines/:id',
      'GET /api/machines/:id/stats',
      'GET /api/machines/:id/operations'
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
  console.log(`   MDS Backend v2.4.1 running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
  console.log('   ========================================');
  
  // Cron-Jobs starten
  console.log('   ⏰ Cron-Jobs:');
  cronService.startAll();
  console.log('   ========================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  cronService.stopAll();
  pool.end(() => {
    console.log('Database pool closed');
  });
});

module.exports = app;
