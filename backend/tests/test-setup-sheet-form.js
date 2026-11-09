/**
 * Tests für die Formularwerte des Einrichteblatts: 0 bei Preset und Nullpunkt bleibt erhalten
 * (Befund 07.11.2026: Preset 0 ging beim Speichern verloren, freigegebenes Blatt fiel auf Entwurf).
 * Modul liegt im Frontend (reines ES-Modul): frontend/src/utils/setupSheetForm.js
 * Ausführen: node backend/tests/test-setup-sheet-form.js
 */
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

(async () => {
  const { initialSetupSheetForm, setupSheetPayload } = await import(
    pathToFileURL(path.join(__dirname, '../../frontend/src/utils/setupSheetForm.js')).href);

  console.log('\nEinrichteblatt: Formularwerte');

  test('0 aus der DB bleibt im Formular stehen (Preset, Nullpunkt)', () => {
    const f = initialSetupSheetForm({ preset_number: 0, wcs_x: 0, wcs_y: '0.000', wcs_z: -12.5 }, 7);
    assert.equal(f.preset_number, 0);
    assert.equal(f.wcs_x, 0);
    assert.equal(f.wcs_y, '0.000');
    assert.equal(f.wcs_z, -12.5);
    assert.equal(f.operation_id, 7);
  });

  test('Fehlende Werte werden leer (kein „null“ im Feld)', () => {
    const f = initialSetupSheetForm(null, undefined);
    assert.equal(f.preset_number, '');
    assert.equal(f.wcs_x, '');
    assert.equal(f.special_notes, '');
    assert.equal(f.operation_id, '');
  });

  test('Speichern: 0 bleibt 0, leer wird null', () => {
    const p = setupSheetPayload({ ...initialSetupSheetForm({ preset_number: 0, wcs_x: 0, wcs_y: '0', program_id: '' }, 7), wcs_z: '' }, 7);
    assert.equal(p.preset_number, 0);
    assert.equal(p.wcs_x, 0);
    assert.equal(p.wcs_y, 0);
    assert.equal(p.wcs_z, null);
    assert.equal(p.program_id, null);
    assert.equal(p.operation_id, 7);
  });

  test('Speichern: Zahlen aus Text, Komma-freie Eingabe wie bisher', () => {
    const p = setupSheetPayload({ ...initialSetupSheetForm({}, 3), preset_number: '12', wcs_x: '-1.25', program_id: '44' }, 3);
    assert.equal(p.preset_number, 12);
    assert.equal(p.wcs_x, -1.25);
    assert.equal(p.program_id, 44);
  });

  console.log(`\n${passed} Tests bestanden`);
})();
