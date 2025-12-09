/**
 * Consumable Categories Routes
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/consumableCategoriesController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// GET    /api/consumable-categories          - Get all categories
router.get('/', controller.getAllCategories);

// GET    /api/consumable-categories/:id      - Get category by ID
router.get('/:id', controller.getCategoryById);

// POST   /api/consumable-categories          - Create new category
router.post('/', controller.createCategory);

// PUT    /api/consumable-categories/:id      - Update category
router.put('/:id', controller.updateCategory);

// DELETE /api/consumable-categories/:id      - Delete category
router.delete('/:id', controller.deleteCategory);

module.exports = router;
