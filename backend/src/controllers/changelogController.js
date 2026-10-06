/**
 * Changelog Controller
 *
 * Routes:
 * - GET /api/changelog       - Versionen (Admin: alle Abschnitte, sonst nur "Für Anwender")
 * - PUT /api/changelog/seen  - aktuelle Version als gesehen markieren
 */

const pool = require('../config/db');
const { version: APP_VERSION } = require('../../package.json');
const changelogService = require('../services/changelogService');

async function isAdmin(userId) {
  const result = await pool.query(
    `SELECT 1
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1 AND LOWER(r.name) = 'admin'
      LIMIT 1`,
    [userId]
  );
  return result.rows.length > 0;
}

async function getChangelog(req, res) {
  try {
    const [admin, seenResult] = await Promise.all([
      isAdmin(req.user.id),
      pool.query('SELECT last_seen_version FROM users WHERE id = $1', [req.user.id]),
    ]);

    const versions = changelogService.getChangelog();

    res.json({
      available: versions !== null,
      currentVersion: APP_VERSION,
      lastSeenVersion: seenResult.rows[0]?.last_seen_version || null,
      isAdmin: admin,
      versions: versions === null ? [] : (admin ? versions : changelogService.filterForUser(versions)),
    });
  } catch (error) {
    console.error('Error fetching changelog:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Änderungsprotokolls' });
  }
}

async function markSeen(req, res) {
  try {
    const result = await pool.query(
      'UPDATE users SET last_seen_version = $1 WHERE id = $2 RETURNING last_seen_version',
      [APP_VERSION, req.user.id]
    );
    res.json({ lastSeenVersion: result.rows[0]?.last_seen_version || null });
  } catch (error) {
    console.error('Error marking changelog as seen:', error);
    res.status(500).json({ error: 'Fehler beim Speichern' });
  }
}

module.exports = {
  getChangelog,
  markSeen,
};
