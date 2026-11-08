/**
 * Tests für den Abgleich des Altbestand-Imports mit dem MDS (Kunden, Bauteile, Arbeitsgänge, Status)
 * Modul liegt im Frontend (reines ES-Modul): frontend/src/utils/legacyImport/match.js
 * Ausführen: node backend/tests/test-legacy-import-match.js
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

const file = (p) => ({ path: p });
const parsedProgram = (over = {}) => ({
  key: 'KD00000 FIRMA/HG_TEIL-0001_A_Halter',
  errors: [],
  files: {
    program: [file('x/01/P.prg')], template: [], calibration: [],
    photos: [file('x/03/01/a.jpg'), file('x/03/01/b.png')],
    drawingPdf: [], drawingOther: [file('x/03/02/Z.tif')], cad: [file('x/03/04/M.stp')],
  },
  ...over,
});
const fullState = {
  operationId: 5, programId: 7, programState: 'released', setupSheetId: 9, setupSheetState: 'released',
  photoNames: ['a.jpg', 'b.png'], documentNames: ['Z.tif', 'M.stp'],
};

(async () => {
  const m = await import(pathToFileURL(path.join(__dirname, '../../frontend/src/utils/legacyImport/match.js')).href);

  console.log('\nAltbestand-Import: Abgleich');

  test('Kunde: Groß/klein und Leerzeichen egal', () => {
    const customers = [{ id: 1, customer_number: 'KD00000' }, { id: 2, customer_number: 'KD00001' }];
    assert.equal(m.matchCustomer(' kd00000 ', customers).id, 1);
    assert.equal(m.matchCustomer('KD99999', customers), null);
    assert.equal(m.matchCustomer(null, customers), null);
  });

  test('Bauteil-Kandidaten: gleiche Nummer + Revision, andere Revision, anderer Kunde', () => {
    const parts = [
      { id: 1, customer_id: 1, customer_part_number: 'TEIL-0001', revision: 'A' },
      { id: 2, customer_id: 1, customer_part_number: ' teil-0001', revision: 'b' },
      { id: 3, customer_id: 2, customer_part_number: 'TEIL-0001', revision: 'A' },
      { id: 4, customer_id: 1, customer_part_number: null, revision: 'A' },
    ];
    const c = m.findPartCandidates({ customerId: 1, customerPartNumber: 'TEIL-0001', revision: 'a' }, parts);
    assert.deepEqual(c.same.map(p => p.id), [1]);
    assert.deepEqual(c.otherRevisions.map(p => p.id), [2]);
  });

  test('KMG-Maschine: genau eine → diese, sonst keine Vorbelegung', () => {
    const one = [{ id: 1, measuring_equipment_id: null }, { id: 2, measuring_equipment_id: 8 }];
    assert.equal(m.defaultCmmMachine(one).id, 2);
    assert.equal(m.defaultCmmMachine([...one, { id: 3, measuring_equipment_id: 9 }]), null);
    assert.equal(m.defaultCmmMachine([{ id: 1, measuring_equipment_id: null }]), null);
  });

  test('Mess-Arbeitsgang: KMG-Maschine mit kleinster Reihenfolge', () => {
    const ops = [
      { id: 1, machine_id: 3, sequence: 10 },
      { id: 2, machine_id: 2, sequence: 30 },
      { id: 3, machine_id: 2, sequence: 20 },
    ];
    assert.equal(m.pickCmmOperation(ops, 2).id, 3);
    assert.equal(m.pickCmmOperation(ops, 9), null);
  });

  test('Erwartete Namen für Fotos und Dokumente', () => {
    assert.deepEqual(m.expectedNames(parsedProgram()), { photos: ['a.jpg', 'b.png'], documents: ['M.stp', 'Z.tif'] });
  });

  test('Status: Fehler aus dem Parser oder fehlender Kunde', () => {
    const ok = { same: [], otherRevisions: [] };
    assert.equal(m.rowStatus({ parsed: parsedProgram({ errors: ['x'] }), customer: { id: 1 }, candidates: ok, importState: null }), 'error');
    assert.equal(m.rowStatus({ parsed: parsedProgram(), customer: null, candidates: ok, importState: null }), 'error');
  });

  test('Status: neu, Auswahl, andere Revision, Bauteil vorhanden', () => {
    const base = { parsed: parsedProgram(), customer: { id: 1 }, importState: null };
    assert.equal(m.rowStatus({ ...base, candidates: { same: [], otherRevisions: [] } }), 'new');
    assert.equal(m.rowStatus({ ...base, candidates: { same: [{ id: 1 }, { id: 2 }], otherRevisions: [] } }), 'choose_part');
    assert.equal(m.rowStatus({ ...base, candidates: { same: [], otherRevisions: [{ id: 3 }] } }), 'other_revision');
    assert.equal(m.rowStatus({ ...base, candidates: { same: [{ id: 1 }], otherRevisions: [] } }), 'part_exists');
  });

  test('Status: teilweise und vollständig übernommen', () => {
    const base = { parsed: parsedProgram(), customer: { id: 1 }, candidates: { same: [{ id: 1 }], otherRevisions: [] } };
    assert.equal(m.rowStatus({ ...base, importState: { ...fullState, photoNames: ['a.jpg'] } }), 'partial');
    assert.equal(m.rowStatus({ ...base, importState: { ...fullState, programId: null } }), 'partial');
    assert.equal(m.rowStatus({ ...base, importState: fullState }), 'imported');
    const nothing = { operationId: null, programId: null, programState: null, setupSheetId: null,
      setupSheetState: null, photoNames: [], documentNames: [] };
    assert.equal(m.rowStatus({ ...base, importState: nothing }), 'part_exists');
  });

  test('Status mit Freigabe: erst „übernommen“, wenn Programm und Blatt freigegeben sind', () => {
    const base = { parsed: parsedProgram(), customer: { id: 1 }, candidates: { same: [{ id: 1 }], otherRevisions: [] } };
    const draft = { ...fullState, programState: 'draft', setupSheetState: 'draft' };
    assert.equal(m.rowStatus({ ...base, importState: draft, release: true }), 'partial');
    assert.equal(m.rowStatus({ ...base, importState: { ...fullState, setupSheetState: 'draft' }, release: true }), 'partial');
    assert.equal(m.rowStatus({ ...base, importState: fullState, release: true }), 'imported');
    assert.equal(m.rowStatus({ ...base, importState: draft, release: false }), 'imported');
    assert.equal(m.rowStatus({ ...base, importState: draft }), 'imported');
  });

  console.log(`\n${passed} Tests bestanden`);
})();
