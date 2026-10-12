const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflowController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// Alle Workflow-Routes benötigen Authentifizierung
router.use(authenticateToken);

// =============================================================================
// WORKFLOW ROUTES
// =============================================================================

/**
 * @route   GET /api/workflow/states
 * @desc    Alle verfügbaren Workflow-Status abrufen
 * @access  Authenticated
 */
router.get('/states', workflowController.getWorkflowStates);

/**
 * @route   POST /api/workflow/change
 * @desc    Workflow-Status ändern
 * @body    { entityType, entityId, toStateId, changeReason }
 * @access  Berechtigung program.release
 */
router.post('/change', requirePermission('program.release'), workflowController.changeWorkflowState);

/**
 * @route   GET /api/workflow/:entityType/:entityId/history
 * @desc    Workflow-Historie abrufen
 * @access  Authenticated
 */
router.get('/:entityType/:entityId/history', workflowController.getWorkflowHistory);

/**
 * @route   GET /api/workflow/:entityType/:entityId/transitions
 * @desc    Verfügbare Status-Übergänge abrufen
 * @access  Authenticated
 */
router.get('/:entityType/:entityId/transitions', workflowController.getAvailableTransitions);

module.exports = router;
