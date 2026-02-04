const express = require('express');
const router = express.Router();
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

const timeModelsController = require('../controllers/timeModelsController');
const timeEntriesController = require('../controllers/timeEntriesController');
const timeBalancesController = require('../controllers/timeBalancesController');
const timeSettingsController = require('../controllers/timeSettingsController');

// ============================================
// Zeitmodelle
// ============================================
router.get('/models', 
  authenticateToken, 
  timeModelsController.getAll
);

router.get('/models/default', 
  authenticateToken, 
  timeModelsController.getDefault
);

router.get('/models/:id', 
  authenticateToken, 
  requirePermission('time_tracking.settings'),
  timeModelsController.getById
);

router.post('/models', 
  authenticateToken, 
  requirePermission('time_tracking.settings'),
  timeModelsController.create
);

router.put('/models/:id', 
  authenticateToken, 
  requirePermission('time_tracking.settings'),
  timeModelsController.update
);

router.delete('/models/:id', 
  authenticateToken, 
  requirePermission('time_tracking.settings'),
  timeModelsController.remove
);

// ============================================
// Stempelungen
// ============================================

// Stempeln (Web)
router.post('/entries/stamp', 
  authenticateToken, 
  requirePermission('time_tracking.view_own'),
  timeEntriesController.stamp
);

// Stempeln per RFID/PIN (Terminal) - ohne Auth, aber mit Identifier
router.post('/entries/stamp-terminal', 
  timeEntriesController.stampByIdentifier
);

// Benutzerinfo per RFID/PIN (Terminal Info-Screen)
router.get('/entries/user-info', 
  timeEntriesController.getUserInfoByIdentifier
);

// Aktuelle Anwesenheit
router.get('/entries/presence', 
  authenticateToken, 
  requirePermission('time_tracking.manage'),
  timeEntriesController.getCurrentPresence
);

// Fehlbuchungen
router.get('/entries/missing', 
  authenticateToken, 
  requirePermission('time_tracking.manage'),
  timeEntriesController.getMissingEntries
);

// Buchungen eines Benutzers
router.get('/entries/user/:userId', 
  authenticateToken, 
  requirePermission('time_tracking.view_own'),
  timeEntriesController.getByUser
);

// Selbst-Korrektur (Mitarbeiter)
router.post('/entries/self-correction',
  authenticateToken,
  requirePermission('time_tracking.view_own'),
  timeEntriesController.createSelfCorrection
);

// Korrektur erstellen
router.post('/entries/correction', 
  authenticateToken, 
  requirePermission('time_tracking.manage'),
  timeEntriesController.createCorrection
);

// Buchung löschen
router.delete('/entries/:id', 
  authenticateToken, 
  requirePermission('time_tracking.manage'),
  timeEntriesController.remove
);

// Buchung bearbeiten (Typ/Uhrzeit ändern)
router.put('/entries/:id', 
  authenticateToken, 
  requirePermission('time_tracking.manage'),
  timeEntriesController.updateEntry
);

// Tagesvalidierung (Buchungsreihenfolge prüfen)
router.get('/entries/user/:userId/validate', 
  authenticateToken, 
  requirePermission('time_tracking.view_own'),
  timeEntriesController.validateDay
);

// Tagesinfo bearbeiten (Notiz, Soll-Override)
router.put('/daily-summary/:userId/:date', 
  authenticateToken, 
  requirePermission('time_tracking.manage'),
  timeEntriesController.updateDayInfo
);

// ============================================
// Zeitkonten / Salden
// ============================================

// Alle Zeitkonten (Übersicht)
router.get('/balances', 
  authenticateToken, 
  requirePermission('time_tracking.manage'),
  timeBalancesController.getAll
);

// Zeitkonto eines Benutzers
router.get('/balances/user/:userId', 
  authenticateToken, 
  requirePermission('time_tracking.view_own'),
  timeBalancesController.getByUser
);

// Tagesübersichten eines Benutzers
router.get('/balances/user/:userId/daily', 
  authenticateToken, 
  requirePermission('time_tracking.view_own'),
  timeBalancesController.getDailySummaries
);

// Wochenübersicht eines Benutzers
router.get('/balances/user/:userId/week', 
  authenticateToken, 
  requirePermission('time_tracking.view_own'),
  timeBalancesController.getWeekSummary
);

// Monat neu berechnen
router.post('/balances/calculate', 
  authenticateToken, 
  requirePermission('time_tracking.manage'),
  timeBalancesController.calculateMonth
);

// Anpassung erstellen
router.post('/balances/user/:userId/adjustment', 
  authenticateToken, 
  requirePermission('time_tracking.settings'),
  timeBalancesController.createAdjustment
);

// Auszahlung erfassen
router.post('/balances/user/:userId/payout', 
  authenticateToken, 
  requirePermission('time_tracking.settings'),
  timeBalancesController.createPayout
);

// ============================================
// Export
// ============================================

// CSV Export (Berechtigung wird im Controller geprüft)
router.get('/export/csv/:userId', 
  authenticateToken, 
  timeBalancesController.exportCSV
);

// PDF Export (Berechtigung wird im Controller geprüft)
router.get('/export/pdf/:userId', 
  authenticateToken, 
  timeBalancesController.exportPDF
);

// Excel Export (Berechtigung wird im Controller geprüft)
router.get('/export/excel/:userId', 
  authenticateToken, 
  timeBalancesController.exportExcel
);

// ============================================
// Einstellungen
// ============================================
router.get('/settings', 
  authenticateToken, 
  requirePermission('time_tracking.settings'),
  timeSettingsController.getAll
);

router.get('/settings/:key', 
  authenticateToken, 
  requirePermission('time_tracking.settings'),
  timeSettingsController.getByKey
);

router.put('/settings/:key', 
  authenticateToken, 
  requirePermission('time_tracking.settings'),
  timeSettingsController.update
);

router.put('/settings', 
  authenticateToken, 
  requirePermission('time_tracking.settings'),
  timeSettingsController.updateMultiple
);

router.post('/settings', 
  authenticateToken, 
  requirePermission('time_tracking.settings'),
  timeSettingsController.create
);

module.exports = router;
