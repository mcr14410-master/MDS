const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { autoCloseOpenDays } = require('../controllers/timeEntriesController');

// ============================================
// Job Registry
// ============================================

const jobs = {};
const schedules = {};

/**
 * Job registrieren
 * @param {string} name - Eindeutiger Job-Name
 * @param {string} schedule - Cron-Expression (z.B. '0 2 * * *')
 * @param {Function} handler - async function() die den Job ausführt
 * @param {string} description - Beschreibung für Admin-Übersicht
 */
function registerJob(name, schedule, handler, description = '') {
  jobs[name] = { schedule, handler, description };
}

/**
 * Alle registrierten Jobs starten
 */
function startAll() {
  for (const [name, job] of Object.entries(jobs)) {
    if (schedules[name]) {
      schedules[name].stop();
    }
    
    schedules[name] = cron.schedule(job.schedule, async () => {
      await runJob(name);
    }, { timezone: 'Europe/Berlin' });

    console.log(`  ⏰ Cron-Job "${name}" registriert: ${job.schedule} (${job.description})`);
  }
}

/**
 * Alle Jobs stoppen (für graceful shutdown)
 */
function stopAll() {
  for (const [name, schedule] of Object.entries(schedules)) {
    schedule.stop();
    console.log(`  ⏹ Cron-Job "${name}" gestoppt`);
  }
}

/**
 * Einzelnen Job ausführen (manuell oder per Schedule)
 */
async function runJob(name) {
  const job = jobs[name];
  if (!job) throw new Error(`Job "${name}" nicht gefunden`);

  const startedAt = new Date();
  let logId;

  try {
    // Laufenden Job protokollieren
    const logEntry = await pool.query(`
      INSERT INTO cron_job_logs (job_name, started_at, status)
      VALUES ($1, $2, 'running')
      RETURNING id
    `, [name, startedAt]);
    logId = logEntry.rows[0].id;

    console.log(`🔄 Cron-Job "${name}" gestartet...`);

    // Job ausführen
    const result = await job.handler();

    const finishedAt = new Date();
    const durationMs = finishedAt - startedAt;

    // Erfolg protokollieren
    await pool.query(`
      UPDATE cron_job_logs
      SET status = 'success', finished_at = $1, duration_ms = $2, result = $3
      WHERE id = $4
    `, [finishedAt, durationMs, JSON.stringify(result || {}), logId]);

    console.log(`✅ Cron-Job "${name}" abgeschlossen (${durationMs}ms)`);
    return { status: 'success', duration_ms: durationMs, result };

  } catch (error) {
    const finishedAt = new Date();
    const durationMs = finishedAt - startedAt;

    console.error(`❌ Cron-Job "${name}" fehlgeschlagen:`, error.message);

    if (logId) {
      await pool.query(`
        UPDATE cron_job_logs
        SET status = 'error', finished_at = $1, duration_ms = $2, error_message = $3
        WHERE id = $4
      `, [finishedAt, durationMs, error.message, logId]).catch(() => {});
    }

    return { status: 'error', duration_ms: durationMs, error: error.message };
  }
}

// ============================================
// Job-Definitionen
// ============================================

/**
 * Auto-Abschluss offener Tage für alle aktiven Benutzer
 * Läuft täglich um 02:00 nachts
 */
async function autoCloseAllOpenDays() {
  // Alle aktiven User mit Zeitmodell holen
  const users = await pool.query(`
    SELECT id, first_name, last_name 
    FROM users 
    WHERE is_active = TRUE AND time_model_id IS NOT NULL
  `);

  const now = new Date();
  const results = { processed: 0, closed: 0, warnings: [], errors: [] };

  for (const user of users.rows) {
    try {
      const warnings = await autoCloseOpenDays(user.id, now);
      results.processed++;

      if (warnings.length > 0) {
        results.closed += warnings.length;
        results.warnings.push({
          user: `${user.first_name} ${user.last_name}`,
          user_id: user.id,
          days: warnings.map(w => w.date)
        });
      }
    } catch (error) {
      results.errors.push({
        user: `${user.first_name} ${user.last_name}`,
        user_id: user.id,
        error: error.message
      });
    }
  }

  return results;
}

// ============================================
// Jobs registrieren
// ============================================

registerJob(
  'auto_close_open_days',
  '0 2 * * *',
  autoCloseAllOpenDays,
  'Offene Tage automatisch abschließen (täglich 02:00)'
);

/**
 * Backup-Monitor: Prüft ob ein aktuelles Backup vorhanden ist
 * Läuft täglich um 03:00 (nach dem Backup um 02:30)
 */
async function checkBackupStatus() {
  const BACKUP_DIR = '/app/backups';
  const MAX_AGE_HOURS = 26;

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('mds_backup_') && f.endsWith('.sql.gz'))
    .map(f => ({
      name: f,
      size: fs.statSync(path.join(BACKUP_DIR, f)).size,
      mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime);

  const result = {
    backup_count: files.length,
    latest: null,
    total_size_mb: 0,
    status: 'no_backups'
  };

  if (files.length === 0) return result;

  const latest = files[0];
  const ageHours = (Date.now() - latest.mtime.getTime()) / (1000 * 60 * 60);
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

  result.latest = {
    name: latest.name,
    size_mb: (latest.size / 1024 / 1024).toFixed(1),
    age_hours: Math.round(ageHours),
    date: latest.mtime.toISOString()
  };
  result.total_size_mb = (totalBytes / 1024 / 1024).toFixed(1);
  result.status = ageHours <= MAX_AGE_HOURS ? 'ok' : 'stale';

  return result;
}

registerJob(
  'backup_monitor',
  '0 3 * * *',
  checkBackupStatus,
  'Backup-Status prüfen (täglich 03:00)'
);

module.exports = { startAll, stopAll, runJob, jobs };
