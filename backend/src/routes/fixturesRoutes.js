/**
 * Fixtures Routes
 * 
 * API routes for fixture management (Vorrichtungen)
 */

const express = require('express');
const router = express.Router();
const fixturesController = require('../controllers/fixturesController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// ============================================================================
// TYPES ROUTES (must be before /:id routes)
// ============================================================================
router.get('/types', fixturesController.getAllTypes);
router.get('/types/:id', fixturesController.getTypeById);
router.post('/types', fixturesController.createType);
router.put('/types/:id', fixturesController.updateType);
router.delete('/types/:id', fixturesController.deleteType);

// ============================================================================
// FIXTURES ROUTES
// ============================================================================
router.get('/stats', fixturesController.getStats);
router.get('/check-number/:number', fixturesController.checkNumber);
router.get('/', fixturesController.getAll);
router.get('/:id', fixturesController.getById);
router.post('/', fixturesController.create);
router.put('/:id', fixturesController.update);
router.delete('/:id', fixturesController.delete);
router.patch('/:id/status', fixturesController.updateStatus);

module.exports = router;
