/**
 * Kopieren beim Anlegen einer Variante (derselbe Arbeitsgang auf einer anderen Maschine).
 * Entscheidung Nutzer 09.11.2026: Einrichteblatt und Prüfplan werden kopiert, NC-Programme und
 * Werkzeuglisten nicht – sie sind maschinenspezifisch (Postprozessor), eine Kopie wäre falsch.
 *
 * Alle Funktionen laufen im Client der Varianten-Transaktion. Kopierte Fotodateien landen in
 * `copiedDirs`, damit der Aufrufer sie bei einem Rollback wieder entfernt.
 */
const fs = require('fs/promises');
const path = require('path');

const BACKEND_ROOT = path.join(__dirname, '../..');
const SETUP_SHEET_UPLOADS = path.join(BACKEND_ROOT, 'uploads/setup-sheets');

/**
 * Einrichteblätter des Arbeitsgangs kopieren: als Entwurf für die neue Maschine, ohne Programm
 * (das Programm der Variante ist ein anderes), mit Spannmitteln, Vorrichtungen und Fotos.
 * Gelöschte Spannmittel/Vorrichtungen und Fotos ohne Datei werden übersprungen.
 * @returns {{ sheets: number, skippedPhotos: number, copiedDirs: string[] }}
 */
async function copySetupSheets(client, { fromOperationId, toOperationId, machineId, userId }) {
  const result = { sheets: 0, skippedPhotos: 0, copiedDirs: [] };
  const { rows: sheets } = await client.query(
    'SELECT * FROM setup_sheets WHERE operation_id = $1 ORDER BY id', [fromOperationId]);

  for (const sheet of sheets) {
    const { rows: [copy] } = await client.query(
      `INSERT INTO setup_sheets (
         operation_id, machine_id, program_id, fixture_id, clamping_device_id,
         fixture_description, clamping_description, control_type, preset_number, wcs_number,
         wcs_x, wcs_y, wcs_z, reference_point, raw_material_dimensions, material_specification,
         setup_instructions, special_notes, workflow_state_id, created_by, updated_by
       ) VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
         (SELECT id FROM workflow_states WHERE name = 'draft'), $18, $18)
       RETURNING id`,
      [toOperationId, machineId, sheet.fixture_id, sheet.clamping_device_id,
        sheet.fixture_description, sheet.clamping_description, sheet.control_type, sheet.preset_number,
        sheet.wcs_number, sheet.wcs_x, sheet.wcs_y, sheet.wcs_z, sheet.reference_point,
        sheet.raw_material_dimensions, sheet.material_specification, sheet.setup_instructions,
        sheet.special_notes, userId]
    );

    await client.query(
      `INSERT INTO setup_sheet_clamping_devices (setup_sheet_id, clamping_device_id, quantity, notes, sort_order, created_by)
       SELECT $1, scd.clamping_device_id, scd.quantity, scd.notes, scd.sort_order, $2
         FROM setup_sheet_clamping_devices scd
         JOIN clamping_devices cd ON cd.id = scd.clamping_device_id AND cd.deleted_at IS NULL
        WHERE scd.setup_sheet_id = $3
        ORDER BY scd.sort_order, scd.id`,
      [copy.id, userId, sheet.id]
    );
    await client.query(
      `INSERT INTO setup_sheet_fixtures (setup_sheet_id, fixture_id, quantity, notes, sort_order, created_by)
       SELECT $1, sf.fixture_id, sf.quantity, sf.notes, sf.sort_order, $2
         FROM setup_sheet_fixtures sf
         JOIN fixtures f ON f.id = sf.fixture_id AND f.deleted_at IS NULL
        WHERE sf.setup_sheet_id = $3
        ORDER BY sf.sort_order, sf.id`,
      [copy.id, userId, sheet.id]
    );

    // Fotos: eigene Datei im Ordner des neuen Blatts – Löschen prüft Verweise nur je Blatt
    const { rows: photos } = await client.query(
      'SELECT * FROM setup_sheet_photos WHERE setup_sheet_id = $1 ORDER BY sort_order, id', [sheet.id]);
    const targetDir = path.join(SETUP_SHEET_UPLOADS, String(copy.id));
    for (const photo of photos) {
      const source = path.resolve(BACKEND_ROOT, photo.file_path);
      if (!source.startsWith(SETUP_SHEET_UPLOADS + path.sep)) { result.skippedPhotos++; continue; }
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(source)}`;
      try {
        if (!result.copiedDirs.includes(targetDir)) {
          await fs.mkdir(targetDir, { recursive: true });
          result.copiedDirs.push(targetDir);
        }
        await fs.copyFile(source, path.join(targetDir, fileName));
      } catch (err) {
        if (err.code === 'ENOENT') { result.skippedPhotos++; continue; }
        throw err;
      }
      await client.query(
        `INSERT INTO setup_sheet_photos (setup_sheet_id, file_path, file_name, file_size, mime_type,
           caption, photo_type, sort_order, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [copy.id, `uploads/setup-sheets/${copy.id}/${fileName}`, photo.file_name, photo.file_size,
          photo.mime_type, photo.caption, photo.photo_type, photo.sort_order, userId]
      );
    }
    result.sheets++;
  }
  return result;
}

/**
 * Prüfplan des Arbeitsgangs kopieren (höchstens einer je Arbeitsgang) samt Merkmalen.
 * @returns {boolean} ob ein Prüfplan kopiert wurde
 */
async function copyInspectionPlan(client, { fromOperationId, toOperationId, userId }) {
  const { rows: [plan] } = await client.query(
    'SELECT id, notes FROM inspection_plans WHERE operation_id = $1', [fromOperationId]);
  if (!plan) return false;
  const { rows: [copy] } = await client.query(
    `INSERT INTO inspection_plans (operation_id, notes, created_by, updated_by)
     VALUES ($1, $2, $3, $3) RETURNING id`,
    [toOperationId, plan.notes, userId]
  );
  await client.query(
    `INSERT INTO inspection_plan_items (inspection_plan_id, sequence_number, measurement_description,
       tolerance, min_value, max_value, nominal_value, mean_value, measuring_tool, measuring_equipment_id, instruction)
     SELECT $1, sequence_number, measurement_description, tolerance, min_value, max_value, nominal_value,
            mean_value, measuring_tool, measuring_equipment_id, instruction
       FROM inspection_plan_items WHERE inspection_plan_id = $2
      ORDER BY sequence_number, id`,
    [copy.id, plan.id]
  );
  return true;
}

async function removeCopiedDirs(dirs) {
  for (const dir of dirs) await fs.rm(dir, { recursive: true, force: true });
}

module.exports = { copySetupSheets, copyInspectionPlan, removeCopiedDirs };
