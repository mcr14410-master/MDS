// backend/src/controllers/operationTypesController.js
/**
 * Controller für Operation Types (Arbeitsgang-Typen)
 * 
 * Verwaltet vordefinierte Typen mit Default-Features
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Alle Operation Types abrufen (aktive)
const getAllTypes = async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    
    const query = includeInactive
      ? `SELECT * FROM operation_types ORDER BY sort_order, name`
      : `SELECT * FROM operation_types WHERE is_active = true ORDER BY sort_order, name`;
    
    const result = await pool.query(query);
    
    res.json(result.rows);
  } catch (error) {
    console.error('getAllTypes error:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Operationstypen' });
  }
};

// Einzelnen Operation Type abrufen
const getTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM operation_types WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Operationstyp nicht gefunden' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('getTypeById error:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen des Operationstyps' });
  }
};

// Neuen Operation Type erstellen (Admin)
const createType = async (req, res) => {
  try {
    const { name, description, icon, color, default_features, sort_order, op_code } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name ist erforderlich' });
    }
    
    const result = await pool.query(
      `INSERT INTO operation_types (name, description, icon, color, default_features, sort_order, op_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name,
        description || null,
        icon || 'generic',
        color || 'gray',
        JSON.stringify(default_features || []),
        sort_order || 0,
        op_code || null
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('createType error:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Operationstyps' });
  }
};

// Operation Type aktualisieren (Admin)
const updateType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, default_features, sort_order, is_active, op_code } = req.body;
    
    const result = await pool.query(
      `UPDATE operation_types 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           icon = COALESCE($3, icon),
           color = COALESCE($4, color),
           default_features = COALESCE($5, default_features),
           sort_order = COALESCE($6, sort_order),
           is_active = COALESCE($7, is_active),
           op_code = COALESCE($8, op_code)
       WHERE id = $9
       RETURNING *`,
      [
        name,
        description,
        icon,
        color,
        default_features ? JSON.stringify(default_features) : null,
        sort_order,
        is_active,
        op_code,
        id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Operationstyp nicht gefunden' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('updateType error:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Operationstyps' });
  }
};

// Operation Type löschen (Admin) - nur wenn keine Operations zugewiesen
const deleteType = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prüfen ob Operations mit diesem Typ existieren
    const usageCheck = await pool.query(
      'SELECT COUNT(*) as count FROM operations WHERE operation_type_id = $1',
      [id]
    );
    
    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Operationstyp kann nicht gelöscht werden - wird noch verwendet',
        count: parseInt(usageCheck.rows[0].count)
      });
    }
    
    const result = await pool.query(
      'DELETE FROM operation_types WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Operationstyp nicht gefunden' });
    }
    
    res.json({ message: 'Operationstyp erfolgreich gelöscht' });
  } catch (error) {
    console.error('deleteType error:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Operationstyps' });
  }
};

// Feature-Definitionen für Frontend
const getFeatureDefinitions = async (req, res) => {
  try {
    // Statische Feature-Definitionen
    const features = [
      { id: 'programs', label: 'NC-Programme', icon: 'code', description: 'NC-Programme verwalten und versionieren' },
      { id: 'tools', label: 'Werkzeuge', icon: 'wrench', description: 'Werkzeuglisten und Werkzeugdaten' },
      { id: 'setup_sheet', label: 'Einrichteblatt', icon: 'clipboard', description: 'Einrichteblätter und Aufspannung' },
      { id: 'inspection', label: 'Prüfplan', icon: 'check-circle', description: 'Prüfpläne und Qualitätskontrolle' },
      { id: 'work_instruction', label: 'Arbeitsanweisung', icon: 'document-text', description: 'Schritt-für-Schritt Anleitungen' },
      { id: 'checklist', label: 'Checkliste', icon: 'list-check', description: 'Abhak-Listen für Prozessschritte' },
      { id: 'documents', label: 'Dokumente', icon: 'folder', description: 'Zusätzliche Dokumente und Anhänge' },
      { id: 'measuring_equipment', label: 'Messmittel', icon: 'calculator', description: 'Benötigte Messmittel und Prüfgeräte' },
      { id: 'raw_material', label: 'Rohmaterial', icon: 'cube', description: 'Halbzeug, Zuschnitt, Werkstoff' },
      { id: 'consumables', label: 'Verbrauchsmaterial', icon: 'beaker', description: 'Kühlmittel, Schmierstoffe, etc.' },
    ];
    
    res.json(features);
  } catch (error) {
    console.error('getFeatureDefinitions error:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Feature-Definitionen' });
  }
};

module.exports = {
  getAllTypes,
  getTypeById,
  createType,
  updateType,
  deleteType,
  getFeatureDefinitions
};
