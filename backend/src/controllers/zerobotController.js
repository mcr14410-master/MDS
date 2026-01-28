/**
 * Zerobot Controller
 * 
 * Manages configuration parameters and provides calculation endpoints
 * for the Zerobot position calculator tool.
 */

const pool = require('../config/db');

// ============================================
// CONFIGURATION ENDPOINTS
// ============================================

/**
 * Get all configuration grouped by type
 * GET /api/zerobot/config
 */
const getAllConfig = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM zerobot_config 
      ORDER BY config_type, sort_order, config_key
    `);
    
    // Group by config_type
    const grouped = {
      global: [],
      jaw: [],
      machines: {}
    };
    
    for (const row of result.rows) {
      if (row.config_type === 'global') {
        grouped.global.push(row);
      } else if (row.config_type === 'jaw') {
        grouped.jaw.push(row);
      } else if (row.config_type === 'machine') {
        if (!grouped.machines[row.machine_name]) {
          grouped.machines[row.machine_name] = [];
        }
        grouped.machines[row.machine_name].push(row);
      }
    }
    
    res.json(grouped);
  } catch (error) {
    console.error('Error fetching zerobot config:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Konfiguration' });
  }
};

/**
 * Get global parameters only
 * GET /api/zerobot/config/global
 */
const getGlobalConfig = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM zerobot_config 
      WHERE config_type = 'global'
      ORDER BY sort_order, config_key
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching global config:', error);
    res.status(500).json({ error: 'Fehler beim Laden der globalen Parameter' });
  }
};

/**
 * Get jaw heights
 * GET /api/zerobot/config/jaws
 */
const getJawConfig = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM zerobot_config 
      WHERE config_type = 'jaw'
      ORDER BY sort_order, config_key
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching jaw config:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Backenhöhen' });
  }
};

/**
 * Get machine-specific parameters
 * GET /api/zerobot/config/machines
 */
const getMachineConfig = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM zerobot_config 
      WHERE config_type = 'machine'
      ORDER BY machine_name, sort_order, config_key
    `);
    
    // Group by machine_name
    const grouped = {};
    for (const row of result.rows) {
      if (!grouped[row.machine_name]) {
        grouped[row.machine_name] = [];
      }
      grouped[row.machine_name].push(row);
    }
    
    res.json(grouped);
  } catch (error) {
    console.error('Error fetching machine config:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Maschinenparameter' });
  }
};

/**
 * Get list of available machines
 * GET /api/zerobot/machines
 */
const getMachineList = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT machine_name 
      FROM zerobot_config 
      WHERE config_type = 'machine' AND machine_name IS NOT NULL
      ORDER BY machine_name
    `);
    res.json(result.rows.map(r => r.machine_name));
  } catch (error) {
    console.error('Error fetching machine list:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Maschinenliste' });
  }
};

/**
 * Update a configuration parameter
 * PUT /api/zerobot/config/:id
 */
const updateConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { config_value, display_name, description } = req.body;
    
    if (config_value === undefined || config_value === null) {
      return res.status(400).json({ error: 'config_value ist erforderlich' });
    }
    
    const result = await pool.query(`
      UPDATE zerobot_config SET
        config_value = $1,
        display_name = COALESCE($2, display_name),
        description = COALESCE($3, description),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [config_value, display_name, description, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Parameter nicht gefunden' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Parameters' });
  }
};

/**
 * Add a new machine with default parameters
 * POST /api/zerobot/machines
 */
const addMachine = async (req, res) => {
  try {
    const { machine_name, e, a, VersatzZ } = req.body;
    
    if (!machine_name) {
      return res.status(400).json({ error: 'Maschinenname ist erforderlich' });
    }
    
    // Check if machine already exists
    const existing = await pool.query(
      `SELECT COUNT(*) as count FROM zerobot_config WHERE machine_name = $1`,
      [machine_name]
    );
    
    if (parseInt(existing.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Maschine existiert bereits' });
    }
    
    // Insert machine parameters
    const params = [
      { key: 'e', value: e || 0, display: 'Auflagewinkel Anschlagpunkt Y', sort: 1 },
      { key: 'a', value: a || 0, display: 'Auflagewinkel Länge', sort: 2 },
      { key: 'VersatzZ', value: VersatzZ || 0, display: 'Rack Versatz Z', sort: 3 }
    ];
    
    const insertedParams = [];
    for (const p of params) {
      const result = await pool.query(`
        INSERT INTO zerobot_config (config_type, config_key, config_value, machine_name, display_name, sort_order)
        VALUES ('machine', $1, $2, $3, $4, $5)
        RETURNING *
      `, [p.key, p.value, machine_name, p.display, p.sort]);
      insertedParams.push(result.rows[0]);
    }
    
    res.status(201).json({
      message: 'Maschine erfolgreich hinzugefügt',
      machine_name,
      params: insertedParams
    });
  } catch (error) {
    console.error('Error adding machine:', error);
    res.status(500).json({ error: 'Fehler beim Hinzufügen der Maschine' });
  }
};

/**
 * Delete a machine and its parameters
 * DELETE /api/zerobot/machines/:name
 */
const deleteMachine = async (req, res) => {
  try {
    const { name } = req.params;
    
    const result = await pool.query(
      `DELETE FROM zerobot_config WHERE config_type = 'machine' AND machine_name = $1 RETURNING *`,
      [name]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maschine nicht gefunden' });
    }
    
    res.json({ 
      message: 'Maschine gelöscht',
      deleted_params: result.rows.length
    });
  } catch (error) {
    console.error('Error deleting machine:', error);
    res.status(500).json({ error: 'Fehler beim Löschen der Maschine' });
  }
};

/**
 * Add a new jaw type
 * POST /api/zerobot/jaws
 */
const addJaw = async (req, res) => {
  try {
    const { config_key, config_value, display_name } = req.body;
    
    if (!config_key || config_value === undefined) {
      return res.status(400).json({ error: 'config_key und config_value sind erforderlich' });
    }
    
    // Get max sort_order
    const maxSort = await pool.query(
      `SELECT COALESCE(MAX(sort_order), 0) + 1 as next_sort FROM zerobot_config WHERE config_type = 'jaw'`
    );
    
    const result = await pool.query(`
      INSERT INTO zerobot_config (config_type, config_key, config_value, display_name, sort_order)
      VALUES ('jaw', $1, $2, $3, $4)
      RETURNING *
    `, [config_key, config_value, display_name || config_key, maxSort.rows[0].next_sort]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Backentyp existiert bereits' });
    }
    console.error('Error adding jaw:', error);
    res.status(500).json({ error: 'Fehler beim Hinzufügen des Backentyps' });
  }
};

/**
 * Delete a jaw type
 * DELETE /api/zerobot/jaws/:id
 */
const deleteJaw = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `DELETE FROM zerobot_config WHERE id = $1 AND config_type = 'jaw' RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Backentyp nicht gefunden' });
    }
    
    res.json({ message: 'Backentyp gelöscht', jaw: result.rows[0] });
  } catch (error) {
    console.error('Error deleting jaw:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Backentyps' });
  }
};

// ============================================
// CALCULATION ENDPOINT
// ============================================

/**
 * Calculate all positions based on input parameters
 * POST /api/zerobot/calculate
 * 
 * Body: {
 *   machine: "Grob G350" | "Hermle C22",
 *   jaw: "B80" | "B120" | "B120_EW",
 *   TeilB: number,     // Bauteil Breite
 *   TeilL: number,     // Bauteil Länge  
 *   c: number,         // Greiferspannlänge
 *   NumS: number,      // Nummer Schraubenreihe
 *   d: number|null,    // Winkelabstand (optional, wird berechnet wenn null)
 *   isKleinteil: boolean
 * }
 */
const calculate = async (req, res) => {
  try {
    const { machine, jaw, TeilB, TeilL, c, NumS, d: customD, isKleinteil } = req.body;
    
    // Validate required inputs
    if (!machine || !jaw) {
      return res.status(400).json({ error: 'Maschine und Backentyp sind erforderlich' });
    }
    if (TeilB === undefined || TeilL === undefined || c === undefined || NumS === undefined) {
      return res.status(400).json({ error: 'Alle Bauteilparameter (TeilB, TeilL, c, NumS) sind erforderlich' });
    }
    
    // Fetch all config from DB
    const configResult = await pool.query('SELECT * FROM zerobot_config');
    const config = {};
    
    for (const row of configResult.rows) {
      if (row.config_type === 'global') {
        config[row.config_key] = parseFloat(row.config_value);
      } else if (row.config_type === 'jaw' && row.config_key === jaw) {
        config.jawHeight = parseFloat(row.config_value);
      } else if (row.config_type === 'machine' && row.machine_name === machine) {
        config[row.config_key] = parseFloat(row.config_value);
      }
    }
    
    // Validate machine and jaw were found
    if (config.e === undefined || config.a === undefined || config.VersatzZ === undefined) {
      return res.status(400).json({ error: `Maschine "${machine}" nicht gefunden` });
    }
    if (config.jawHeight === undefined) {
      return res.status(400).json({ error: `Backentyp "${jaw}" nicht gefunden` });
    }
    
    // Parse input values
    const teilB = parseFloat(TeilB);
    const teilL = parseFloat(TeilL);
    const greifer = parseFloat(c);
    const numS = parseInt(NumS);
    
    // Calculate d (Winkelabstand) - use custom value if provided
    const d = customD !== null && customD !== undefined 
      ? parseFloat(customD) 
      : teilB - config.WinkelS;
    
    // Determine VersatzX based on Kleinteil checkbox
    const versatzX = isKleinteil ? config.VersatzX : 0;
    
    // ============================================
    // CALCULATIONS
    // ============================================
    
    // Empfohlener Winkelabstand
    const empfohlenerWinkelabstand = teilB - config.WinkelS;
    
    // Teileabstand X
    const teileabstandX = config.WinkelB + d;
    
    // Rack Sicherheitsabstand
    const rackSicherheitsabstand = config.a + greifer + config.RackSa + config.GreiferSa;
    
    // Rack Aufnahmeposition
    const rackAufnahmeX = config.StartX + (d / 2) - versatzX;
    const rackAufnahmeY = -((config.e - teilL) + greifer - config.SaRack);
    const rackAufnahmeZ = ((numS - 1) * config.AbstandZ) - config.VersatzZ;
    
    // Maschine Aufnahmeposition
    const maschineAufnahmeX = 0 - versatzX;
    const maschineAufnahmeY = -(greifer - (teilL / 2));
    const maschineAufnahmeZ = config.jawHeight;
    
    // Build result object
    const result = {
      input: {
        machine,
        jaw,
        TeilB: teilB,
        TeilL: teilL,
        c: greifer,
        NumS: numS,
        d_custom: customD,
        isKleinteil
      },
      calculated: {
        d: {
          label: 'Empfohlener Winkelabstand (d)',
          value: empfohlenerWinkelabstand,
          formula: 'TeilB - WinkelS',
          used: customD !== null && customD !== undefined ? parseFloat(customD) : empfohlenerWinkelabstand
        },
        teileabstandX: {
          label: 'Teileabstand X',
          value: teileabstandX,
          formula: 'WinkelB + d'
        },
        rackSicherheitsabstand: {
          label: 'Rack Sicherheitsabstand',
          value: rackSicherheitsabstand,
          formula: 'a + c + RackSa + GreiferSa'
        },
        rackAufnahme: {
          label: 'Rack Aufnahmeposition',
          X: { value: rackAufnahmeX, formula: 'StartX + (d/2) - VersatzX' },
          Y: { value: rackAufnahmeY, formula: '-((e - TeilL) + c - SaRack)' },
          Z: { value: rackAufnahmeZ, formula: '((NumS-1) × AbstandZ) - VersatzZ' }
        },
        maschineAufnahme: {
          label: 'Maschine Aufnahmeposition',
          X: { value: maschineAufnahmeX, formula: '0 - VersatzX' },
          Y: { value: maschineAufnahmeY, formula: '-(c - (TeilL/2))' },
          Z: { value: maschineAufnahmeZ, formula: 'Backenhöhe' }
        }
      },
      configUsed: {
        global: {
          StartX: config.StartX,
          WinkelB: config.WinkelB,
          RackSa: config.RackSa,
          GreiferSa: config.GreiferSa,
          WinkelS: config.WinkelS,
          SaRack: config.SaRack,
          AbstandZ: config.AbstandZ,
          VersatzX: config.VersatzX
        },
        machine: {
          name: machine,
          e: config.e,
          a: config.a,
          VersatzZ: config.VersatzZ
        },
        jaw: {
          type: jaw,
          height: config.jawHeight
        }
      }
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error calculating positions:', error);
    res.status(500).json({ error: 'Fehler bei der Berechnung' });
  }
};

module.exports = {
  getAllConfig,
  getGlobalConfig,
  getJawConfig,
  getMachineConfig,
  getMachineList,
  updateConfig,
  addMachine,
  deleteMachine,
  addJaw,
  deleteJaw,
  calculate
};
