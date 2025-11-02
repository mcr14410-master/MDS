const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get JWT token
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private (requires authentication)
 */
router.get('/me', authenticateToken, authController.getProfile);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private (requires authentication)
 */
router.post('/change-password', authenticateToken, authController.changePassword);

module.exports = router;
