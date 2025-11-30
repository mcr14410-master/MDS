/**
 * Customer Contacts Routes
 * 
 * Nested routes for managing contacts per customer
 */

const express = require('express');
const router = express.Router({ mergeParams: true }); // Important: access parent params
const customerContactsController = require('../controllers/customerContactsController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/customers/:customerId/contacts
 * @desc    Get all contacts for a customer
 * @access  Private
 */
router.get('/', customerContactsController.getCustomerContacts);

/**
 * @route   GET /api/customers/:customerId/contacts/:id
 * @desc    Get contact by ID
 * @access  Private
 */
router.get('/:id', customerContactsController.getContactById);

/**
 * @route   POST /api/customers/:customerId/contacts
 * @desc    Create new contact
 * @access  Private
 */
router.post('/', customerContactsController.createContact);

/**
 * @route   PUT /api/customers/:customerId/contacts/:id
 * @desc    Update contact
 * @access  Private
 */
router.put('/:id', customerContactsController.updateContact);

/**
 * @route   DELETE /api/customers/:customerId/contacts/:id
 * @desc    Delete contact
 * @access  Private
 */
router.delete('/:id', customerContactsController.deleteContact);

module.exports = router;
