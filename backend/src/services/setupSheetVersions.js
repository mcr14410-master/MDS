/**
 * Einrichteblatt: Stände sichern und vergleichen
 * Spec docs/konzepte/EINRICHTEBLATT_FREIGABE_SPEC.md
 *
 * Ein Stand ist ein JSON-Snapshot mit Formularfeldern, Spannmitteln, Vorrichtungen und Fotos.
 * Das Format entspricht dem der Migration 1737000128000 (Stand 1 aktiver Blätter).
 */

const db = require('../config/db');

/** Blatt ist archiviert und damit schreibgeschützt */
class SheetLockedError extends Error {
  constructor(message = 'Archivierte Einrichteblätter lassen sich nicht mehr ändern') {
    super(message);
    this.status = 409;
  }
}

// Grund im Ablauf, wenn eine Änderung das Blatt auf Entwurf zurücksetzt
const CHANGE_REASONS = {
  released: 'Geändert nach Freigabe',
  approved: 'Geändert nach Prüfung',
  review: 'Geändert während der Prüfung',
  rejected: 'Geändert nach Ablehnung',
};

/** Stand eines Blatts lesen. client: Pool oder Transaktions-Client */
async function buildSnapshot(client, sheetId) {
  const { rows } = await client.query(
    `SELECT jsonb_build_object(
       'fields', jsonb_build_object(
         'program_id', s.program_id,
         'fixture_id', s.fixture_id,
         'clamping_device_id', s.clamping_device_id,
         'fixture_description', s.fixture_description,
         'clamping_description', s.clamping_description,
         'control_type', s.control_type,
         'preset_number', s.preset_number,
         'wcs_number', s.wcs_number,
         'wcs_x', s.wcs_x,
         'wcs_y', s.wcs_y,
         'wcs_z', s.wcs_z,
         'reference_point', s.reference_point,
         'raw_material_dimensions', s.raw_material_dimensions,
         'material_specification', s.material_specification,
         'setup_instructions', s.setup_instructions,
         'special_notes', s.special_notes
       ),
       'clamping_devices', COALESCE((
         SELECT jsonb_agg(jsonb_build_object(
           'clamping_device_id', c.clamping_device_id, 'quantity', c.quantity,
           'notes', c.notes, 'sort_order', c.sort_order) ORDER BY c.sort_order, c.id)
         FROM setup_sheet_clamping_devices c WHERE c.setup_sheet_id = s.id), '[]'::jsonb),
       'fixtures', COALESCE((
         SELECT jsonb_agg(jsonb_build_object(
           'fixture_id', f.fixture_id, 'quantity', f.quantity,
           'notes', f.notes, 'sort_order', f.sort_order) ORDER BY f.sort_order, f.id)
         FROM setup_sheet_fixtures f WHERE f.setup_sheet_id = s.id), '[]'::jsonb),
       'photos', COALESCE((
         SELECT jsonb_agg(jsonb_build_object(
           'file_path', p.file_path, 'file_name', p.file_name, 'file_size', p.file_size,
           'mime_type', p.mime_type, 'caption', p.caption, 'photo_type', p.photo_type,
           'sort_order', p.sort_order) ORDER BY p.sort_order, p.id)
         FROM setup_sheet_photos p WHERE p.setup_sheet_id = s.id), '[]'::jsonb)
     ) AS snapshot
     FROM setup_sheets s
     WHERE s.id = $1`,
    [sheetId]
  );
  return rows[0]?.snapshot ?? null;
}

// Schlüssel sortiert, Listen unabhängig von ihrer Reihenfolge
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).sort().join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/** Zwei Stände inhaltlich vergleichen */
function snapshotsEqual(a, b) {
  return canonical(a) === canonical(b);
}

/**
 * Stand anlegen. kind 'release' zählt die Nummer hoch, 'backup' bleibt ohne Nummer.
 * Muss in einer Transaktion laufen, die das Blatt gesperrt oder schon geändert hat.
 */
async function createVersion(client, sheetId, kind, userId) {
  const snapshot = await buildSnapshot(client, sheetId);
  const { rows } = await client.query(
    `INSERT INTO setup_sheet_versions (setup_sheet_id, version_number, kind, snapshot, created_by)
     VALUES ($1,
             CASE WHEN $2::varchar = 'release'
                  THEN (SELECT COALESCE(MAX(version_number), 0) + 1 FROM setup_sheet_versions WHERE setup_sheet_id = $1)
             END,
             $2, $3, $4)
     RETURNING *`,
    [sheetId, kind, snapshot, userId]
  );
  return rows[0];
}

/** Nennt ein Stand des Blatts diese Datei? Dann darf sie nicht gelöscht werden. */
async function photoFileReferenced(client, sheetId, filePath) {
  const { rows } = await client.query(
    `SELECT 1 FROM setup_sheet_versions
      WHERE setup_sheet_id = $1 AND snapshot->'photos' @> $2::jsonb LIMIT 1`,
    [sheetId, JSON.stringify([{ file_path: filePath }])]
  );
  return rows.length > 0;
}

/**
 * Schreibende Aktion am Blatt: Transaktion mit gesperrter Zeile. Ändert fn den Inhalt eines
 * Blatts außerhalb des Entwurfs, fällt es auf Entwurf zurück und der Ablauf hält das fest.
 * @returns Ergebnis von fn(client) oder null, wenn es das Blatt nicht gibt
 * @throws SheetLockedError bei archivierten Blättern
 */
async function withSheetChange(sheetId, userId, fn) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT s.workflow_state_id, ws.name AS state
         FROM setup_sheets s JOIN workflow_states ws ON ws.id = s.workflow_state_id
        WHERE s.id = $1 FOR UPDATE OF s`,
      [sheetId]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const { workflow_state_id: fromStateId, state } = rows[0];
    if (state === 'archived') throw new SheetLockedError();

    const before = await buildSnapshot(client, sheetId);
    const result = await fn(client);
    const after = await buildSnapshot(client, sheetId);

    if (state !== 'draft' && !snapshotsEqual(before, after)) {
      const draft = (await client.query("SELECT id FROM workflow_states WHERE name = 'draft'")).rows[0].id;
      await client.query('UPDATE setup_sheets SET workflow_state_id = $1 WHERE id = $2', [draft, sheetId]);
      // workflow_history.created_at ist timestamp mit UTC (workflowController schreibt in UTC-Session)
      await client.query(
        `INSERT INTO workflow_history
           (entity_type, entity_id, from_state_id, to_state_id, changed_by, change_reason, created_at)
         VALUES ('setup_sheet', $1, $2, $3, $4, $5, now() AT TIME ZONE 'UTC')`,
        [sheetId, fromStateId, draft, userId, CHANGE_REASONS[state] || 'Geändert']
      );
    }
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  SheetLockedError,
  photoFileReferenced,
  withSheetChange,
  buildSnapshot,
  snapshotsEqual,
  createVersion,
};
