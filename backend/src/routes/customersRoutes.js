/**
 * Customers Routes
 * 
 * Routes for managing customer master data
 */

const express = require('express');
const router = express.Router();
const customersController = require('../controllers/customersController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/customers
 * @desc    Get all customers with optional filters
 * @access  Private
 * @query   {boolean} is_active - Filter by active status
 * @query   {string} search - Search in name, customer_number, contact_person, email
 * @query   {string} sort_by - Sort field (name, customer_number, contact_person, created_at)
 * @query   {string} sort_order - Sort order (asc, desc)
 */
router.get('/', customersController.getAllCustomers);

/**
 * @route   GET /api/customers/:id
 * @desc    Get customer by ID
 * @access  Private
 */
router.get('/:id', customersController.getCustomerById);

/**
 * @route   POST /api/customers
 * @desc    Create new customer
 * @access  Private
 */
router.post('/', customersController.createCustomer);

/**
 * @route   PUT /api/customers/:id
 * @desc    Update customer
 * @access  Private
 */
router.put('/:id', customersController.updateCustomer);

/**
 * @route   DELETE /api/customers/:id
 * @desc    Delete customer (soft delete by default)
 * @access  Private
 * @query   {boolean} hard_delete - Permanently delete if true
 */
router.delete('/:id', customersController.deleteCustomer);

/**
 * @route   GET /api/customers/:id/parts
 * @desc    Get all parts for this customer
 * @access  Private
 */
router.get('/:id/parts', customersController.getCustomerParts);

module.exports = router;
