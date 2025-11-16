const express = require('express');
const router = express.Router();
const qrCodesController = require('../controllers/qrCodesController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/storage/items/:id/qr-code
 * @desc    Generate or retrieve QR code for storage item
 * @access  Private
 */
router.post('/storage/items/:id/qr-code', qrCodesController.generateOrGetQRCode);

/**
 * @route   GET /api/storage/items/:id/qr-code/stats
 * @desc    Get QR code statistics
 * @access  Private
 */
router.get('/storage/items/:id/qr-code/stats', qrCodesController.getQRCodeStats);

/**
 * @route   DELETE /api/storage/items/:id/qr-code
 * @desc    Deactivate QR code for storage item
 * @access  Private (Admin only)
 */
router.delete('/storage/items/:id/qr-code', qrCodesController.deactivateQRCode);

/**
 * @route   GET /api/qr-codes/:code/scan
 * @desc    Scan QR code and get entity details
 * @access  Private
 */
router.get('/qr-codes/:code/scan', qrCodesController.scanQRCode);

module.exports = router;
