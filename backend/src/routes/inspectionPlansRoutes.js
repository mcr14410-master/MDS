/**
 * Inspection Plans Routes
 * Week 12 - Phase 3
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  getInspectionPlan,
  updateInspectionPlan,
  addInspectionItem,
  updateInspectionItem,
  deleteInspectionItem,
  reorderInspectionItems
} = require('../controllers/inspectionPlansController');

// All routes require authentication
router.use(authenticateToken);

// Inspection plan routes (operation-level)
router.get('/operations/:operationId/inspection-plan', getInspectionPlan);
router.put('/operations/:operationId/inspection-plan', updateInspectionPlan);
router.post('/operations/:operationId/inspection-plan/items', addInspectionItem);
router.post('/operations/:operationId/inspection-plan/reorder', reorderInspectionItems);

// Item routes (individual inspection items)
router.put('/inspection-plan-items/:itemId', updateInspectionItem);
router.delete('/inspection-plan-items/:itemId', deleteInspectionItem);

module.exports = router;
