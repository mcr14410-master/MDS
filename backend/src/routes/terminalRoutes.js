const express = require('express');
const router = express.Router();
const { authenticateToken, requirePermission, authenticateTerminal } = require('../middleware/authMiddleware');
const terminalController = require('../controllers/terminalController');

// ============================================
// Terminal-authentifizierte Endpoints (API-Key)
// ============================================

// User-Liste für lokalen Cache
router.get('/users',
  authenticateTerminal,
  terminalController.getUsers
);

// Einzelne Stempelung
router.post('/stamp',
  authenticateTerminal,
  terminalController.stamp
);

// Batch-Sync (mehrere Stempelungen)
router.post('/stamp-batch',
  authenticateTerminal,
  terminalController.stampBatch
);

// Terminal-Info (eigene Daten)
router.get('/info',
  authenticateTerminal,
  terminalController.getInfo
);

// User-Info für Info-Screen
router.get('/user-info/:id',
  authenticateTerminal,
  terminalController.getUserInfo
);

// ============================================
// Admin-Endpoints (JWT-Auth)
// ============================================

// Terminal registrieren (generiert API-Key)
router.post('/register',
  authenticateToken,
  requirePermission('time_tracking.settings'),
  terminalController.register
);

// Alle Terminals auflisten
router.get('/list',
  authenticateToken,
  requirePermission('time_tracking.settings'),
  terminalController.list
);

module.exports = router;
