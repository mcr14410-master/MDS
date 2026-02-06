const pool = require('../config/db');
const { runJob, jobs } = require('../services/cronService');

// ============================================
// Alle Jobs mit Status abrufen
// ============================================
const getStatus = async (req, res) => {
  try {
    const jobList = [];

    for (const [name, job] of Object.entries(jobs)) {
      // Letzten Lauf holen
      const lastRun = await pool.query(`
        SELECT status, started_at, finished_at, duration_ms, result, error_message
        FROM cron_job_logs
        WHERE job_name = $1
        ORDER BY started_at DESC
        LIMIT 1
      `, [name]);

      // Letzte 10 Läufe für Historie
      const history = await pool.query(`
        SELECT id, status, started_at, finished_at, duration_ms, 
               result, error_message
        FROM cron_job_logs
        WHERE job_name = $1
        ORDER BY started_at DESC
        LIMIT 10
      `, [name]);

      // Gesundheits-Check: letzter Lauf > 26h her oder fehlgeschlagen?
      let health = 'unknown';
      if (lastRun.rows.length > 0) {
        const last = lastRun.rows[0];
        const hoursSince = (Date.now() - new Date(last.started_at).getTime()) / (1000 * 60 * 60);
        
        if (last.status === 'running') {
          health = 'running';
        } else if (last.status === 'error') {
          health = 'error';
        } else if (hoursSince > 26) {
          health = 'stale';
        } else {
          health = 'healthy';
        }
      }

      jobList.push({
        name,
        description: job.description,
        schedule: job.schedule,
        health,
        last_run: lastRun.rows[0] || null,
        history: history.rows
      });
    }

    res.json(jobList);
  } catch (error) {
    console.error('Fehler beim Laden des Cron-Status:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Cron-Status' });
  }
};

// ============================================
// Job manuell ausführen
// ============================================
const triggerJob = async (req, res) => {
  try {
    const { jobName } = req.params;

    if (!jobs[jobName]) {
      return res.status(404).json({ error: `Job "${jobName}" nicht gefunden` });
    }

    // Prüfen ob Job gerade läuft
    const running = await pool.query(`
      SELECT id FROM cron_job_logs
      WHERE job_name = $1 AND status = 'running'
      LIMIT 1
    `, [jobName]);

    if (running.rows.length > 0) {
      return res.status(409).json({ error: `Job "${jobName}" läuft bereits` });
    }

    // Job asynchron starten
    const result = await runJob(jobName);
    res.json(result);
  } catch (error) {
    console.error('Fehler beim manuellen Trigger:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// Log-Historie für einen Job
// ============================================
const getJobHistory = async (req, res) => {
  try {
    const { jobName } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    const history = await pool.query(`
      SELECT id, job_name, status, started_at, finished_at, 
             duration_ms, result, error_message
      FROM cron_job_logs
      WHERE job_name = $1
      ORDER BY started_at DESC
      LIMIT $2
    `, [jobName, limit]);

    res.json(history.rows);
  } catch (error) {
    console.error('Fehler beim Laden der Job-Historie:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Job-Historie' });
  }
};

module.exports = { getStatus, triggerJob, getJobHistory };
