/**
 * Schnelle Tests ohne Datenbank: Vergleich von Einrichteblatt-Ständen
 * (Spec docs/konzepte/EINRICHTEBLATT_FREIGABE_SPEC.md)
 */
const assert = require('node:assert/strict');
const { snapshotsEqual } = require('../src/services/setupSheetVersions');

const stand = (over = {}) => ({
  fields: { reference_point: 'Mitte', wcs_x: 1.5, ...over.fields },
  clamping_devices: over.clamping_devices || [{ clamping_device_id: 1, quantity: 2 }, { clamping_device_id: 2, quantity: 1 }],
  fixtures: over.fixtures || [],
  photos: over.photos || [{ file_path: 'a.jpg', caption: 'Bild' }],
});

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

test('gleiche Stände sind gleich', () => assert.equal(snapshotsEqual(stand(), stand()), true));

test('Reihenfolge der Listen zählt nicht', () => {
  const b = stand({ clamping_devices: [{ clamping_device_id: 2, quantity: 1 }, { clamping_device_id: 1, quantity: 2 }] });
  assert.equal(snapshotsEqual(stand(), b), true);
});

test('Reihenfolge der Schlüssel zählt nicht', () => {
  const b = stand({ fields: { wcs_x: 1.5, reference_point: 'Mitte' } });
  b.fields = { wcs_x: 1.5, reference_point: 'Mitte' };
  assert.equal(snapshotsEqual(stand(), b), true);
});

test('geänderte Bildunterschrift ist ungleich', () => {
  const b = stand({ photos: [{ file_path: 'a.jpg', caption: 'Anders' }] });
  assert.equal(snapshotsEqual(stand(), b), false);
});

test('Zahl 1 und 1.0 sind gleich, 1 und 2 nicht', () => {
  assert.equal(snapshotsEqual(stand({ fields: { wcs_x: 1 } }), stand({ fields: { wcs_x: 1.0 } })), true);
  assert.equal(snapshotsEqual(stand({ fields: { wcs_x: 1 } }), stand({ fields: { wcs_x: 2 } })), false);
});

test('leeres Feld und anderer Text sind ungleich', () => {
  assert.equal(snapshotsEqual(stand({ fields: { reference_point: null } }), stand()), false);
});

console.log(`\n${passed} Tests bestanden`);
