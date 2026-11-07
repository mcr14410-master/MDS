/* eslint-disable camelcase */

/**
 * Migration: Einrichteblatt mit Freigabe wie bei Programmen, Stände zum Zurückgehen
 *
 * Spec docs/konzepte/EINRICHTEBLATT_FREIGABE_SPEC.md:
 * - setup_sheets.workflow_state_id ersetzt das freie Feld status (active → released)
 * - setup_sheet_versions: Stand je Freigabe (kind 'release') und Sicherung vor dem Zurückgehen ('backup')
 * - Bereits aktive Blätter bekommen Stand 1. Das Snapshot-Format entspricht buildSnapshot in
 *   src/services/setupSheetVersions.js, ist hier aber bewusst fest geschrieben.
 * - Recht setup_sheet.update, per Migration nur für admin
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE setup_sheets
      ADD COLUMN workflow_state_id integer REFERENCES workflow_states(id),
      ADD COLUMN released_version_id integer;

    CREATE TABLE setup_sheet_versions (
      id             serial PRIMARY KEY,
      setup_sheet_id integer NOT NULL REFERENCES setup_sheets(id) ON DELETE CASCADE,
      version_number integer,
      kind           varchar(10) NOT NULL CHECK (kind IN ('release', 'backup')),
      snapshot       jsonb NOT NULL,
      created_by     integer REFERENCES users(id) ON DELETE SET NULL,
      created_at     timestamptz NOT NULL DEFAULT now(),
      UNIQUE (setup_sheet_id, version_number)
    );

    ALTER TABLE setup_sheets
      ADD CONSTRAINT setup_sheets_released_version_id_fkey
      FOREIGN KEY (released_version_id) REFERENCES setup_sheet_versions(id) ON DELETE SET NULL;

    UPDATE setup_sheets s
       SET workflow_state_id = ws.id
      FROM workflow_states ws
     WHERE ws.name = CASE s.status WHEN 'active' THEN 'released' ELSE s.status END;

    INSERT INTO setup_sheet_versions (setup_sheet_id, version_number, kind, created_by, snapshot)
    SELECT s.id, 1, 'release', COALESCE(s.updated_by, s.created_by),
      jsonb_build_object(
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
      )
    FROM setup_sheets s
    WHERE s.status = 'active';

    UPDATE setup_sheets s
       SET released_version_id = v.id
      FROM setup_sheet_versions v
     WHERE v.setup_sheet_id = s.id AND v.version_number = 1;

    ALTER TABLE setup_sheets
      ALTER COLUMN workflow_state_id SET NOT NULL,
      DROP COLUMN status,
      DROP COLUMN version_number;

    CREATE INDEX setup_sheets_workflow_state_id_index ON setup_sheets (workflow_state_id);

    INSERT INTO permissions (name, description, category) VALUES
      ('setup_sheet.update', 'Einrichteblätter anlegen, ändern und nie freigegebene löschen, inkl. Fotos und Spannmittel', 'program')
    ON CONFLICT (name) DO NOTHING;

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
      FROM roles r CROSS JOIN permissions p
     WHERE r.name = 'admin' AND p.name = 'setup_sheet.update'
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM role_permissions
     WHERE permission_id IN (SELECT id FROM permissions WHERE name = 'setup_sheet.update');
    DELETE FROM permissions WHERE name = 'setup_sheet.update';

    DELETE FROM workflow_history WHERE entity_type = 'setup_sheet';

    ALTER TABLE setup_sheets
      ADD COLUMN status varchar(20) NOT NULL DEFAULT 'draft',
      ADD COLUMN version_number varchar(20) DEFAULT '1.0';

    UPDATE setup_sheets s
       SET status = CASE ws.name WHEN 'released' THEN 'active' WHEN 'rejected' THEN 'draft' ELSE ws.name END
      FROM workflow_states ws
     WHERE ws.id = s.workflow_state_id;

    CREATE INDEX setup_sheets_status_index ON setup_sheets (status);

    ALTER TABLE setup_sheets DROP CONSTRAINT setup_sheets_released_version_id_fkey;
    DROP INDEX setup_sheets_workflow_state_id_index;
    ALTER TABLE setup_sheets DROP COLUMN workflow_state_id, DROP COLUMN released_version_id;
    DROP TABLE setup_sheet_versions;
  `);
};
