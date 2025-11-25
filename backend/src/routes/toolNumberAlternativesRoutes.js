/**
 * Tool Number Alternatives Routes
 * 
 * Endpoints for managing alternative tools for T-Numbers
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/toolNumberListsController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// PUT /api/tool-number-alternatives/:id - Update alternative
router.put('/:id', controller.updateAlternative);

// DELETE /api/tool-number-alternatives/:id - Remove alternative
router.delete('/:id', controller.removeAlternative);

module.exports = router;
