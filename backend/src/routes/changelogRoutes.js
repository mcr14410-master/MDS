/**
 * Changelog Routes ("Was ist neu")
 */

const express = require('express');
const router = express.Router();
const changelogController = require('../controllers/changelogController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

/**
 * @route   GET /api/changelog
 * @desc    Changelog-Versionen, nach Rolle gefiltert
 * @access  Private
 */
router.get('/', changelogController.getChangelog);

/**
 * @route   PUT /api/changelog/seen
 * @desc    Aktuelle App-Version als gesehen markieren
 * @access  Private
 */
router.put('/seen', changelogController.markSeen);

module.exports = router;
