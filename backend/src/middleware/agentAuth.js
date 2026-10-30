/**
 * Authentifizierung des MDS-Agenten über API-Schlüssel (Header X-Agent-Key, kein JWT)
 *
 * Spec docs/konzepte/MESSPROGRAMME_AGENT_SPEC.md 5.4: Schlüssel hashen, aktiven Agenten suchen,
 * req.agent setzen. Fehlender, falscher und deaktivierter Schlüssel → dieselbe 401, ohne Hinweis,
 * welcher Fall vorliegt. last_seen_at/last_ip/agent_version höchstens alle 30 s schreiben.
 */

const pool = require('../config/db');
const { hashApiKey, looksLikeApiKey, cleanAgentVersion } = require('../services/agentKeys');

const UNAUTHORIZED = { error: 'Unauthorized', message: 'Agent-Schlüssel fehlt oder ist ungültig (Header: X-Agent-Key)' };

// Hinter Caddy steht die Geräte-Adresse in X-Forwarded-For; nur zur Anzeige, nicht zur Prüfung
function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (forwarded ? forwarded.split(',')[0].trim() : req.ip) || null;
  return ip ? ip.slice(0, 45) : null;
}

async function authenticateAgent(req, res, next) {
  try {
    const key = req.headers['x-agent-key'];
    if (!looksLikeApiKey(key)) return res.status(401).json(UNAUTHORIZED);

    const result = await pool.query(
      `SELECT id, name, machine_id, modules, poll_interval_sec, agent_version
       FROM agents WHERE api_key_hash = $1 AND is_active = true`,
      [hashApiKey(key)]
    );
    if (result.rows.length === 0) return res.status(401).json(UNAUTHORIZED);

    const agent = result.rows[0];
    const version = cleanAgentVersion(req.headers['x-agent-version']);

    pool.query(
      `UPDATE agents SET last_seen_at = now(), last_ip = $2, agent_version = COALESCE($3, agent_version)
       WHERE id = $1
         AND (last_seen_at IS NULL OR last_seen_at < now() - interval '30 seconds'
              OR ($3::varchar IS NOT NULL AND agent_version IS DISTINCT FROM $3))`,
      [agent.id, clientIp(req), version]
    ).catch(err => console.error('Agent last_seen:', err.message));

    req.agent = { ...agent, agent_version: version || agent.agent_version };
    next();
  } catch (error) {
    console.error('Error authenticating agent:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Fehler bei der Agent-Anmeldung' });
  }
}

module.exports = { authenticateAgent };
