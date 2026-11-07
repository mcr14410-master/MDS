/**
 * Einrichteblatt: Stände sichern und vergleichen
 * Spec docs/konzepte/EINRICHTEBLATT_FREIGABE_SPEC.md
 *
 * Ein Stand ist ein JSON-Snapshot mit Formularfeldern, Spannmitteln, Vorrichtungen und Fotos.
 * Das Format entspricht dem der Migration 1737000128000 (Stand 1 aktiver Blätter).
 */

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

module.exports = {
  buildSnapshot,
  snapshotsEqual,
  createVersion,
};
