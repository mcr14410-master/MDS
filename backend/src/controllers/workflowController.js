const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// =============================================================================
// WORKFLOW CONTROLLER
// =============================================================================
// Verwaltet Workflow-Status-Übergänge und Historie
// Unterstützt: Programs (später: Operations, Setup Sheets, etc.)
// =============================================================================

/**
 * Workflow-Status ändern (z.B. draft → released)
 * POST /api/workflow/change
 * Body: { entityType, entityId, toStateId, changeReason }
 */
const changeWorkflowState = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { entityType, entityId, toStateId, changeReason } = req.body;
    const userId = req.user.id;

    // Validierung
    if (!entityType || !entityId || !toStateId) {
      return res.status(400).json({
        success: false,
        error: 'entityType, entityId und toStateId sind erforderlich'
      });
    }

    // Nur bestimmte Entity-Types erlaubt
    const allowedEntityTypes = ['program', 'operation', 'setup_sheet'];
    if (!allowedEntityTypes.includes(entityType)) {
      return res.status(400).json({
        success: false,
        error: `entityType muss einer von ${allowedEntityTypes.join(', ')} sein`
      });
    }

    // Permission-Check: Nur programmer und admin dürfen Status ändern
    // Rollen aus Datenbank laden
    const rolesResult = await pool.query(`
      SELECT r.name
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `, [userId]);
    
    const userRoles = rolesResult.rows.map(row => row.name);
    const canChangeWorkflow = userRoles.includes('programmer') || userRoles.includes('admin');
    
    if (!canChangeWorkflow) {
      return res.status(403).json({
        success: false,
        error: 'Keine Berechtigung zum Ändern des Workflow-Status (benötigt: programmer oder admin)'
      });
    }

    await client.query('BEGIN');

    // 1. Neuen Status aus DB holen (Validierung)
    const stateResult = await client.query(
      'SELECT id, name, is_final FROM workflow_states WHERE id = $1',
      [toStateId]
    );

    if (stateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Ungültiger Workflow-Status'
      });
    }

    const toState = stateResult.rows[0];

    // 2. Entity aus DB holen und aktuellen Status prüfen
    let entityTable, entityQuery, currentEntity;
    
    switch (entityType) {
      case 'program':
        entityTable = 'programs';
        entityQuery = 'SELECT id, workflow_state_id FROM programs WHERE id = $1';
        break;
      case 'operation':
        entityTable = 'operations';
        entityQuery = 'SELECT id, workflow_state_id FROM operations WHERE id = $1';
        break;
      case 'setup_sheet':
        entityTable = 'setup_sheets';
        entityQuery = 'SELECT id, workflow_state_id FROM setup_sheets WHERE id = $1';
        break;
    }

    const entityResult = await client.query(entityQuery, [entityId]);
    
    if (entityResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: `${entityType} nicht gefunden`
      });
    }

    currentEntity = entityResult.rows[0];
    const fromStateId = currentEntity.workflow_state_id;

    // 3. Status ändern (nur wenn unterschiedlich)
    if (fromStateId === toStateId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Status ist bereits gesetzt'
      });
    }

    // Entity-Status aktualisieren
    await client.query(
      `UPDATE ${entityTable} SET workflow_state_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [toStateId, entityId]
    );

    // 4. History-Eintrag erstellen
    await client.query(
      `INSERT INTO workflow_history 
       (entity_type, entity_id, from_state_id, to_state_id, changed_by, change_reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [entityType, entityId, fromStateId, toStateId, userId, changeReason || null]
    );

    await client.query('COMMIT');

    // 5. Aktualisierte Daten zurückgeben
    const updatedEntity = await getEntityWithWorkflowInfo(client, entityType, entityId);

    res.json({
      success: true,
      message: `Status geändert zu "${toState.name}"`,
      data: updatedEntity
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Fehler beim Ändern des Workflow-Status:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Ändern des Workflow-Status'
    });
  } finally {
    client.release();
  }
};

/**
 * Workflow-Historie abrufen
 * GET /api/workflow/:entityType/:entityId/history
 */
const getWorkflowHistory = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    // Validierung
    const allowedEntityTypes = ['program', 'operation', 'setup_sheet'];
    if (!allowedEntityTypes.includes(entityType)) {
      return res.status(400).json({
        success: false,
        error: `entityType muss einer von ${allowedEntityTypes.join(', ')} sein`
      });
    }

    // Historie abrufen mit Status-Namen und User-Infos
    const result = await pool.query(
      `SELECT 
        wh.id,
        wh.entity_type,
        wh.entity_id,
        wh.from_state_id,
        from_state.name AS from_state_name,
        from_state.color AS from_state_color,
        from_state.icon AS from_state_icon,
        wh.to_state_id,
        to_state.name AS to_state_name,
        to_state.color AS to_state_color,
        to_state.icon AS to_state_icon,
        wh.changed_by,
        u.username AS changed_by_username,
        u.first_name AS changed_by_first_name,
        u.last_name AS changed_by_last_name,
        wh.change_reason,
        wh.created_at
       FROM workflow_history wh
       LEFT JOIN workflow_states from_state ON wh.from_state_id = from_state.id
       JOIN workflow_states to_state ON wh.to_state_id = to_state.id
       LEFT JOIN users u ON wh.changed_by = u.id
       WHERE wh.entity_type = $1 AND wh.entity_id = $2
       ORDER BY wh.created_at DESC`,
      [entityType, entityId]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der Workflow-Historie:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Workflow-Historie'
    });
  }
};

/**
 * Verfügbare Status-Übergänge abrufen
 * GET /api/workflow/states
 */
const getWorkflowStates = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM workflow_states ORDER BY sequence ASC'
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der Workflow-Status:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Workflow-Status'
    });
  }
};

/**
 * Erlaubte Status-Übergänge für eine Entity abrufen
 * GET /api/workflow/:entityType/:entityId/transitions
 */
const getAvailableTransitions = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    // Validierung
    const allowedEntityTypes = ['program', 'operation', 'setup_sheet'];
    if (!allowedEntityTypes.includes(entityType)) {
      return res.status(400).json({
        success: false,
        error: `entityType muss einer von ${allowedEntityTypes.join(', ')} sein`
      });
    }

    // Entity-Status abrufen
    let entityQuery;
    switch (entityType) {
      case 'program':
        entityQuery = 'SELECT workflow_state_id FROM programs WHERE id = $1';
        break;
      case 'operation':
        entityQuery = 'SELECT workflow_state_id FROM operations WHERE id = $1';
        break;
      case 'setup_sheet':
        entityQuery = 'SELECT workflow_state_id FROM setup_sheets WHERE id = $1';
        break;
    }

    const entityResult = await pool.query(entityQuery, [entityId]);
    
    if (entityResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `${entityType} nicht gefunden`
      });
    }

    const currentStateId = entityResult.rows[0].workflow_state_id;

    // Aktuellen Status abrufen
    const currentStateResult = await pool.query(
      'SELECT * FROM workflow_states WHERE id = $1',
      [currentStateId]
    );
    const currentState = currentStateResult.rows[0];

    // Erlaubte Übergänge definieren (basierend auf Workflow-Logik)
    const transitions = await getTransitionsFromState(currentState);

    res.json({
      success: true,
      data: {
        currentState,
        availableTransitions: transitions
      }
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der verfügbaren Übergänge:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der verfügbaren Übergänge'
    });
  }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Erlaubte Übergänge von einem Status aus
 */
async function getTransitionsFromState(currentState) {
  // Alle Status abrufen
  const statesResult = await pool.query(
    'SELECT * FROM workflow_states ORDER BY sequence ASC'
  );
  const allStates = statesResult.rows;

  // Workflow-Logik: Von welchem Status kann wohin gewechselt werden?
  const allowedTransitions = {
    'draft': ['review', 'archived'],              // Entwurf → Prüfung oder Archiv
    'review': ['approved', 'rejected', 'draft'],  // Prüfung → Genehmigt, Abgelehnt oder zurück zu Entwurf
    'approved': ['released', 'draft'],            // Genehmigt → Freigegeben oder zurück zu Entwurf
    'released': ['archived'],                     // Freigegeben → nur Archivierung
    'rejected': ['draft', 'archived'],            // Abgelehnt → zurück zu Entwurf oder Archiv
    'archived': []                                 // Archiviert → keine Änderung mehr
  };

  const allowed = allowedTransitions[currentState.name] || [];
  
  return allStates.filter(state => allowed.includes(state.name));
}

/**
 * Entity mit Workflow-Info abrufen
 */
async function getEntityWithWorkflowInfo(client, entityType, entityId) {
  let query;
  
  switch (entityType) {
    case 'program':
      query = `
        SELECT p.*, 
               ws.name AS workflow_state_name,
               ws.color AS workflow_state_color,
               ws.icon AS workflow_state_icon
        FROM programs p
        JOIN workflow_states ws ON p.workflow_state_id = ws.id
        WHERE p.id = $1
      `;
      break;
    case 'operation':
      query = `
        SELECT o.*, 
               ws.name AS workflow_state_name,
               ws.color AS workflow_state_color,
               ws.icon AS workflow_state_icon
        FROM operations o
        JOIN workflow_states ws ON o.workflow_state_id = ws.id
        WHERE o.id = $1
      `;
      break;
    case 'setup_sheet':
      query = `
        SELECT s.*, 
               ws.name AS workflow_state_name,
               ws.color AS workflow_state_color,
               ws.icon AS workflow_state_icon
        FROM setup_sheets s
        JOIN workflow_states ws ON s.workflow_state_id = ws.id
        WHERE s.id = $1
      `;
      break;
  }

  const result = await client.query(query, [entityId]);
  return result.rows[0];
}

module.exports = {
  changeWorkflowState,
  getWorkflowHistory,
  getWorkflowStates,
  getAvailableTransitions
};
