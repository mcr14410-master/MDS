const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const { getStatus, triggerJob, getJobHistory } = require('../controllers/cronController');

// Alle Cron-Routen erfordern Admin-Rolle
router.use(authenticateToken);
router.use(requireRole('admin'));

// Cron-Status aller Jobs
router.get('/status', getStatus);

// Job manuell auslösen (POST)
router.post('/trigger/:jobName', triggerJob);

// Log-Historie für einen Job
router.get('/history/:jobName', getJobHistory);

module.exports = router;
