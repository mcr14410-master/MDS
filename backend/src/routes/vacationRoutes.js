/**
 * Vacation Routes
 * 
 * All routes for vacation/absence management
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// Controllers
const vacationsController = require('../controllers/vacationsController');
const vacationTypesController = require('../controllers/vacationTypesController');
const vacationEntitlementsController = require('../controllers/vacationEntitlementsController');
const vacationSettingsController = require('../controllers/vacationSettingsController');
const holidaysController = require('../controllers/holidaysController');
const vacationRoleLimitsController = require('../controllers/vacationRoleLimitsController');

// All routes require authentication
router.use(authenticateToken);

// ============================================
// VACATION TYPES
// ============================================
router.get('/vacation-types', vacationTypesController.getVacationTypes);
router.get('/vacation-types/:id', vacationTypesController.getVacationType);
router.post('/vacation-types', requirePermission('vacations.settings'), vacationTypesController.createVacationType);
router.put('/vacation-types/:id', requirePermission('vacations.settings'), vacationTypesController.updateVacationType);
router.delete('/vacation-types/:id', requirePermission('vacations.settings'), vacationTypesController.deleteVacationType);

// ============================================
// HOLIDAYS
// ============================================
router.get('/holidays', holidaysController.getHolidays);
router.get('/holidays/states', holidaysController.getStates);
router.get('/holidays/range', holidaysController.getHolidaysInRange);
router.get('/holidays/check', holidaysController.checkHoliday);
router.post('/holidays', requirePermission('vacations.settings'), holidaysController.createHoliday);
router.post('/holidays/generate', requirePermission('vacations.settings'), holidaysController.generateHolidays);
router.put('/holidays/:id', requirePermission('vacations.settings'), holidaysController.updateHoliday);
router.delete('/holidays/:id', requirePermission('vacations.settings'), holidaysController.deleteHoliday);
router.delete('/holidays/year/:year', requirePermission('vacations.settings'), holidaysController.deleteHolidaysByYear);

// ============================================
// VACATION ENTITLEMENTS
// ============================================
router.get('/vacation-entitlements', requirePermission('vacations.read'), vacationEntitlementsController.getEntitlements);
router.get('/vacation-entitlements/balances', requirePermission('vacations.read'), vacationEntitlementsController.getBalances);
router.get('/vacation-entitlements/balance/:userId', requirePermission('vacations.read'), vacationEntitlementsController.getUserBalance);
router.post('/vacation-entitlements', requirePermission('vacations.manage'), vacationEntitlementsController.createEntitlement);
router.post('/vacation-entitlements/initialize', requirePermission('vacations.settings'), vacationEntitlementsController.initializeYear);
router.put('/vacation-entitlements/:id', requirePermission('vacations.manage'), vacationEntitlementsController.updateEntitlement);
router.delete('/vacation-entitlements/:id', requirePermission('vacations.settings'), vacationEntitlementsController.deleteEntitlement);

// ============================================
// VACATIONS (Absences)
// ============================================
router.get('/vacations', requirePermission('vacations.read'), vacationsController.getVacations);
router.get('/vacations/calendar', requirePermission('vacations.read'), vacationsController.getVacationsCalendar);
router.get('/vacations/:id', requirePermission('vacations.read'), vacationsController.getVacation);
router.post('/vacations', requirePermission('vacations.manage'), vacationsController.createVacation);
router.post('/vacations/check-overlap', requirePermission('vacations.manage'), vacationsController.checkOverlap);
router.put('/vacations/:id', requirePermission('vacations.manage'), vacationsController.updateVacation);
router.delete('/vacations/:id', requirePermission('vacations.manage'), vacationsController.deleteVacation);

// ============================================
// VACATION SETTINGS
// ============================================
router.get('/vacation-settings', requirePermission('vacations.read'), vacationSettingsController.getSettings);
router.get('/vacation-settings/:key', requirePermission('vacations.read'), vacationSettingsController.getSetting);
router.post('/vacation-settings', requirePermission('vacations.settings'), vacationSettingsController.createSetting);
router.put('/vacation-settings/:key', requirePermission('vacations.settings'), vacationSettingsController.updateSetting);
router.put('/vacation-settings', requirePermission('vacations.settings'), vacationSettingsController.updateSettings);
router.delete('/vacation-settings/:key', requirePermission('vacations.settings'), vacationSettingsController.deleteSetting);

// ============================================
// VACATION ROLE LIMITS
// ============================================
router.get('/vacation-role-limits', requirePermission('vacations.read'), vacationRoleLimitsController.getRoleLimits);
router.get('/vacation-role-limits/roles', requirePermission('vacations.settings'), vacationRoleLimitsController.getAvailableRoles);
router.post('/vacation-role-limits', requirePermission('vacations.settings'), vacationRoleLimitsController.upsertRoleLimit);
router.delete('/vacation-role-limits/:id', requirePermission('vacations.settings'), vacationRoleLimitsController.deleteRoleLimit);

module.exports = router;
