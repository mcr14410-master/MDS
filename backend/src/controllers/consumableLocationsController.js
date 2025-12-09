/**
 * Consumable Locations Controller (Vereinfacht)
 * 
 * Einfache Lagerort-Verwaltung ohne Mengen-Tracking
 * 
 * Routes:
 * - GET    /api/consumables/:id/locations       - Lagerorte eines Artikels
 * - POST   /api/consumables/:id/locations       - Lagerort hinzufügen
 * - DELETE /api/consumables/:id/locations/:locId - Lagerort entfernen
 * - PUT    /api/consumables/:id/locations/:locId - Lagerort aktualisieren
 * - PATCH  /api/consumables/:id/status          - Status ändern (ok/low/reorder)
 */

const pool = require('../config/db');

/**
 * GET /api/consumables/:id/locations
 * Alle Lagerorte eines Verbrauchsmaterials
 */
exports.getLocations = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        cl.id,
        cl.consumable_id,
        cl.compartment_id,
        cl.is_primary,
        cl.notes,
        cl.created_at,
        sc.name AS compartment_name,
        sl.id AS location_id,
        sl.name AS location_name,
        sl.code AS location_code
      FROM consumable_locations cl
      JOIN storage_compartments sc ON sc.id = cl.compartment_id
      JOIN storage_locations sl ON sl.id = sc.location_id
      WHERE cl.consumable_id = $1
      ORDER BY cl.is_primary DESC, sl.name, sc.name
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching consumable locations:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Lagerorte' });
  }
};

/**
 * POST /api/consumables/:id/locations
 * Lagerort hinzufügen
 */
exports.addLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { compartment_id, is_primary, notes } = req.body;

    if (!compartment_id) {
      return res.status(400).json({ error: 'Lagerfach ist erforderlich' });
    }

    // Prüfen ob Consumable existiert
    const consumableCheck = await pool.query(
      'SELECT id FROM consumables WHERE id = $1 AND is_deleted = false',
      [id]
    );
    if (consumableCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Verbrauchsmaterial nicht gefunden' });
    }

    // Prüfen ob Lagerort schon existiert
    const existingCheck = await pool.query(
      'SELECT id FROM consumable_locations WHERE consumable_id = $1 AND compartment_id = $2',
      [id, compartment_id]
    );
    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Dieser Lagerort ist bereits zugeordnet' });
    }

    // Wenn is_primary, andere auf false setzen
    if (is_primary) {
      await pool.query(
        'UPDATE consumable_locations SET is_primary = false WHERE consumable_id = $1',
        [id]
      );
    }

    // Einfügen
    const result = await pool.query(`
      INSERT INTO consumable_locations (consumable_id, compartment_id, is_primary, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [id, compartment_id, is_primary || false, notes || null]);

    // Mit Location-Details zurückgeben
    const locationWithDetails = await pool.query(`
      SELECT 
        cl.*,
        sc.name AS compartment_name,
        sl.id AS location_id,
        sl.name AS location_name
      FROM consumable_locations cl
      JOIN storage_compartments sc ON sc.id = cl.compartment_id
      JOIN storage_locations sl ON sl.id = sc.location_id
      WHERE cl.id = $1
    `, [result.rows[0].id]);

    res.status(201).json(locationWithDetails.rows[0]);
  } catch (error) {
    console.error('Error adding consumable location:', error);
    res.status(500).json({ error: 'Fehler beim Hinzufügen des Lagerorts' });
  }
};

/**
 * PUT /api/consumables/:id/locations/:locId
 * Lagerort aktualisieren
 */
exports.updateLocation = async (req, res) => {
  try {
    const { id, locId } = req.params;
    const { is_primary, notes } = req.body;

    // Prüfen ob Location existiert
    const locationCheck = await pool.query(
      'SELECT id FROM consumable_locations WHERE id = $1 AND consumable_id = $2',
      [locId, id]
    );
    if (locationCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lagerort nicht gefunden' });
    }

    // Wenn is_primary, andere auf false setzen
    if (is_primary) {
      await pool.query(
        'UPDATE consumable_locations SET is_primary = false WHERE consumable_id = $1 AND id != $2',
        [id, locId]
      );
    }

    const result = await pool.query(`
      UPDATE consumable_locations
      SET is_primary = $1, notes = $2
      WHERE id = $3
      RETURNING *
    `, [is_primary || false, notes || null, locId]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating consumable location:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Lagerorts' });
  }
};

/**
 * DELETE /api/consumables/:id/locations/:locId
 * Lagerort entfernen
 */
exports.removeLocation = async (req, res) => {
  try {
    const { id, locId } = req.params;

    const result = await pool.query(
      'DELETE FROM consumable_locations WHERE id = $1 AND consumable_id = $2 RETURNING *',
      [locId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lagerort nicht gefunden' });
    }

    res.json({ message: 'Lagerort entfernt', deleted: result.rows[0] });
  } catch (error) {
    console.error('Error removing consumable location:', error);
    res.status(500).json({ error: 'Fehler beim Entfernen des Lagerorts' });
  }
};

/**
 * PATCH /api/consumables/:id/status
 * Bestandsstatus ändern (ok/low/reorder)
 */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock_status } = req.body;

    if (!['ok', 'low', 'reorder'].includes(stock_status)) {
      return res.status(400).json({ error: 'Ungültiger Status. Erlaubt: ok, low, reorder' });
    }

    const result = await pool.query(`
      UPDATE consumables
      SET stock_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND is_deleted = false
      RETURNING id, name, stock_status
    `, [stock_status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Verbrauchsmaterial nicht gefunden' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating consumable status:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Status' });
  }
};

/**
 * GET /api/consumables/reorder-list
 * Liste aller Artikel mit Status "reorder"
 */
exports.getReorderList = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.article_number,
        c.stock_status,
        c.package_type,
        c.package_size,
        c.package_price,
        c.base_unit,
        cc.name AS category_name,
        cc.color AS category_color,
        s.id AS supplier_id,
        s.name AS supplier_name,
        s.delivery_time_days
      FROM consumables c
      LEFT JOIN consumable_categories cc ON cc.id = c.category_id
      LEFT JOIN suppliers s ON s.id = c.supplier_id
      WHERE c.is_deleted = false
        AND c.is_active = true
        AND c.stock_status = 'reorder'
      ORDER BY cc.name, c.name
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching reorder list:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Nachbestellliste' });
  }
};

/**
 * POST /api/consumables/reset-status-from-order/:orderId
 * Status auf "ok" setzen für alle Consumables einer eingegangenen Bestellung
 */
exports.resetStatusFromOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Alle Consumable-IDs aus der Bestellung holen
    const orderItems = await pool.query(`
      SELECT DISTINCT poi.consumable_id
      FROM purchase_order_items poi
      WHERE poi.purchase_order_id = $1
        AND poi.item_type = 'consumable'
        AND poi.consumable_id IS NOT NULL
    `, [orderId]);

    if (orderItems.rows.length === 0) {
      return res.json({ message: 'Keine Verbrauchsmaterialien in dieser Bestellung', updated: 0 });
    }

    const consumableIds = orderItems.rows.map(r => r.consumable_id);

    // Status auf 'ok' setzen
    const result = await pool.query(`
      UPDATE consumables
      SET stock_status = 'ok', updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($1)
      RETURNING id, name
    `, [consumableIds]);

    res.json({ 
      message: `Status für ${result.rows.length} Artikel auf "OK" gesetzt`,
      updated: result.rows.length,
      items: result.rows
    });
  } catch (error) {
    console.error('Error resetting status from order:', error);
    res.status(500).json({ error: 'Fehler beim Zurücksetzen des Status' });
  }
};

/**
 * GET /api/consumables/by-storage-location/:locationId
 * Alle Consumables an einem Lagerort
 */
exports.getByStorageLocation = async (req, res) => {
  try {
    const { locationId } = req.params;

    const result = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.article_number,
        c.stock_status,
        c.base_unit,
        c.package_type,
        c.package_size,
        c.is_hazardous,
        cl.id AS location_id,
        cl.compartment_id,
        cl.is_primary,
        cl.notes AS location_notes,
        sc.name AS compartment_name,
        cc.name AS category_name,
        cc.color AS category_color
      FROM consumable_locations cl
      JOIN consumables c ON c.id = cl.consumable_id AND c.is_deleted = false
      JOIN storage_compartments sc ON sc.id = cl.compartment_id
      LEFT JOIN consumable_categories cc ON cc.id = c.category_id
      WHERE sc.location_id = $1
      ORDER BY sc.name, c.name
    `, [locationId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching consumables by storage location:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Verbrauchsmaterialien' });
  }
};

/**
 * GET /api/consumables/by-compartment/:compartmentId
 * Alle Consumables in einem bestimmten Fach
 */
exports.getByCompartment = async (req, res) => {
  try {
    const { compartmentId } = req.params;

    const result = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.article_number,
        c.stock_status,
        c.base_unit,
        c.package_type,
        c.package_size,
        c.is_hazardous,
        cl.id AS location_id,
        cl.is_primary,
        cl.notes AS location_notes,
        cc.name AS category_name,
        cc.color AS category_color
      FROM consumable_locations cl
      JOIN consumables c ON c.id = cl.consumable_id AND c.is_deleted = false
      LEFT JOIN consumable_categories cc ON cc.id = c.category_id
      WHERE cl.compartment_id = $1
      ORDER BY c.name
    `, [compartmentId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching consumables by compartment:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Verbrauchsmaterialien' });
  }
};
