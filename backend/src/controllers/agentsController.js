/**
 * MDS-Agenten verwalten (Geräte, API-Schlüssel, Module)
 *
 * Spec docs/konzepte/MESSPROGRAMME_AGENT_SPEC.md 5.1 (PR 4.3). Lesen für alle Angemeldeten
 * (Gerätewahl beim Bereitstellen), Ändern nur mit agent.manage. Der Schlüssel wird nur beim
 * Anlegen und beim Neu-Erzeugen ausgeliefert; gespeichert ist nur sein Hash.
 * Agenten werden nicht gelöscht, nur deaktiviert (Protokoll und Bereitstellungen hängen daran).
 */

const pool = require('../config/db');
const {
  AGENT_MODULES, generateApiKey, hashApiKey, displayPrefix, validateAgentInput,
} = require('../services/agentKeys');

const AGENT_COLUMNS = `
  a.id, a.name, a.machine_id, m.name AS machine_name, a.api_key_prefix, a.modules,
  a.poll_interval_sec, a.last_seen_at, a.last_ip, a.agent_version, a.last_warnings,
  a.is_active, a.created_by, u.username AS created_by_username, a.created_at, a.updated_at,
  (SELECT count(*)::int FROM agent_deployments d
    WHERE d.agent_id = a.id AND d.status IN ('requested', 'active', 'closing')) AS open_deployments
`;
const AGENT_FROM = `
  FROM agents a
  LEFT JOIN machines m ON m.id = a.machine_id
  LEFT JOIN users u ON u.id = a.created_by
`;

async function loadAgent(db, id) {
  const result = await db.query(`SELECT ${AGENT_COLUMNS} ${AGENT_FROM} WHERE a.id = $1`, [id]);
  return result.rows[0] || null;
}

async function machineExists(db, machineId) {
  if (machineId === null || machineId === undefined) return true;
  const result = await db.query('SELECT 1 FROM machines WHERE id = $1', [machineId]);
  return result.rows.length > 0;
}

const isUniqueViolation = (error, constraint) => error.code === '23505' && error.constraint === constraint;

// GET /api/agents/modules – bekannte Agent-Module (Haken in der Oberfläche)
exports.getModules = (req, res) => {
  res.json({
    success: true,
    data: Object.entries(AGENT_MODULES).map(([key, m]) => ({ key, ...m })),
  });
};

// GET /api/agents?active=true
exports.getAgents = async (req, res) => {
  try {
    const onlyActive = req.query.active === 'true';
    const result = await pool.query(
      `SELECT ${AGENT_COLUMNS} ${AGENT_FROM}
       WHERE ($1::boolean IS FALSE OR a.is_active = true)
       ORDER BY a.is_active DESC, a.name`,
      [onlyActive]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Agenten', details: error.message });
  }
};

// GET /api/agents/:id
exports.getAgentById = async (req, res) => {
  try {
    const agent = await loadAgent(pool, req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent nicht gefunden' });
    res.json({ success: true, data: agent });
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Agenten', details: error.message });
  }
};

// POST /api/agents – anlegen, Antwort enthält den Schlüssel einmalig
exports.createAgent = async (req, res) => {
  try {
    const { values, errors } = validateAgentInput(req.body, true);
    if (errors.length > 0) return res.status(400).json({ error: 'Eingaben ungültig', details: errors });
    if (!(await machineExists(pool, values.machine_id))) {
      return res.status(400).json({ error: 'Eingaben ungültig', details: ['Maschine nicht gefunden'] });
    }

    const apiKey = generateApiKey();
    const result = await pool.query(
      `INSERT INTO agents (name, machine_id, api_key_hash, api_key_prefix, modules, poll_interval_sec, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        values.name,
        values.machine_id ?? null,
        hashApiKey(apiKey),
        displayPrefix(apiKey),
        JSON.stringify(values.modules ?? []),
        values.poll_interval_sec ?? 30,
        values.is_active ?? true,
        req.user?.id || null,
      ]
    );
    const agent = await loadAgent(pool, result.rows[0].id);
    res.status(201).json({
      success: true,
      message: 'Agent angelegt – Schlüssel jetzt kopieren, er wird nicht wieder angezeigt',
      data: { ...agent, api_key: apiKey },
    });
  } catch (error) {
    if (isUniqueViolation(error, 'agents_name_key')) {
      return res.status(409).json({ error: 'Es gibt schon einen Agenten mit diesem Namen' });
    }
    console.error('Error creating agent:', error);
    res.status(500).json({ error: 'Fehler beim Anlegen des Agenten', details: error.message });
  }
};

// PUT /api/agents/:id – nur übergebene Felder ändern (machine_id: null leert)
exports.updateAgent = async (req, res) => {
  try {
    const { values, errors } = validateAgentInput(req.body, false);
    if (errors.length > 0) return res.status(400).json({ error: 'Eingaben ungültig', details: errors });
    if (Object.keys(values).length === 0) {
      return res.status(400).json({ error: 'Keine Änderung übergeben' });
    }
    if (!(await machineExists(pool, values.machine_id))) {
      return res.status(400).json({ error: 'Eingaben ungültig', details: ['Maschine nicht gefunden'] });
    }

    const fields = Object.keys(values);
    const assignments = fields.map((f, i) => `${f} = $${i + 2}`);
    const params = fields.map(f => (f === 'modules' ? JSON.stringify(values[f]) : values[f]));
    const result = await pool.query(
      `UPDATE agents SET ${assignments.join(', ')}, updated_at = now() WHERE id = $1 RETURNING id`,
      [req.params.id, ...params]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Agent nicht gefunden' });

    res.json({ success: true, message: 'Agent gespeichert', data: await loadAgent(pool, req.params.id) });
  } catch (error) {
    if (isUniqueViolation(error, 'agents_name_key')) {
      return res.status(409).json({ error: 'Es gibt schon einen Agenten mit diesem Namen' });
    }
    console.error('Error updating agent:', error);
    res.status(500).json({ error: 'Fehler beim Speichern des Agenten', details: error.message });
  }
};

// POST /api/agents/:id/regenerate-key – neuer Schlüssel, der alte gilt sofort nicht mehr
exports.regenerateKey = async (req, res) => {
  try {
    const apiKey = generateApiKey();
    const result = await pool.query(
      `UPDATE agents SET api_key_hash = $2, api_key_prefix = $3, updated_at = now()
       WHERE id = $1 RETURNING id`,
      [req.params.id, hashApiKey(apiKey), displayPrefix(apiKey)]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Agent nicht gefunden' });

    const agent = await loadAgent(pool, req.params.id);
    res.json({
      success: true,
      message: 'Neuer Schlüssel erzeugt – jetzt kopieren und in der MDS-Agent.ini eintragen; der alte gilt nicht mehr',
      data: { ...agent, api_key: apiKey },
    });
  } catch (error) {
    console.error('Error regenerating agent key:', error);
    res.status(500).json({ error: 'Fehler beim Erzeugen des Schlüssels', details: error.message });
  }
};
