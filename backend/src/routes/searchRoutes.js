/**
 * Global Search Routes
 */

const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Alle Such-Routen erfordern Authentifizierung
router.use(authenticateToken);

// GET /api/search?q=suchbegriff&limit=5
router.get('/', searchController.search);

module.exports = router;
