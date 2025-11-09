/**
 * Tool Lists Routes
 * 
 * Routes for managing tool lists for NC programs.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  getToolListByProgram,
  createToolListItem,
  updateToolListItem,
  deleteToolListItem,
  reorderToolListItems
} = require('../controllers/toolListsController');

// All routes require authentication
router.use(authenticateToken);

// GET tool list for a program
router.get('/programs/:programId/tools', getToolListByProgram);

// CREATE tool list item
router.post('/programs/:programId/tools', createToolListItem);

// UPDATE tool list item
router.put('/tools/:itemId', updateToolListItem);

// DELETE tool list item
router.delete('/tools/:itemId', deleteToolListItem);

// REORDER tool list items
router.post('/programs/:programId/tools/reorder', reorderToolListItems);

module.exports = router;
