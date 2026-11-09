// Formularwerte des Einrichteblatts (reines ES-Modul, getestet in backend/tests/test-setup-sheet-form.js).
// 0 ist ein gültiger Wert (Preset 0, Nullpunkt 0) – nie mit `||` vorbelegen oder prüfen.

const TEXT_FIELDS = [
  'program_id', 'fixture_description', 'clamping_description', 'control_type',
  'preset_number', 'wcs_number', 'wcs_x', 'wcs_y', 'wcs_z', 'reference_point',
  'raw_material_dimensions', 'material_specification', 'setup_instructions', 'special_notes',
];

const isEmpty = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

const toNumber = (v, parse) => {
  if (isEmpty(v)) return null;
  const n = parse(v);
  return Number.isNaN(n) ? null : n;
};

export function initialSetupSheetForm(initialData, operationId) {
  const form = { operation_id: operationId ?? '' };
  for (const key of TEXT_FIELDS) form[key] = initialData?.[key] ?? '';
  return form;
}

export function setupSheetPayload(formData, operationId) {
  return {
    ...formData,
    operation_id: operationId || formData.operation_id,
    program_id: toNumber(formData.program_id, (v) => parseInt(v, 10)),
    preset_number: toNumber(formData.preset_number, (v) => parseInt(v, 10)),
    wcs_x: toNumber(formData.wcs_x, parseFloat),
    wcs_y: toNumber(formData.wcs_y, parseFloat),
    wcs_z: toNumber(formData.wcs_z, parseFloat),
  };
}
