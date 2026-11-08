/**
 * Tests für die Dateiauswahl des Altbestand-Imports (was wohin übernommen wird)
 * Modul liegt im Frontend (reines ES-Modul): frontend/src/utils/legacyImport/selection.js
 * Ausführen: node backend/tests/test-legacy-import-selection.js
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

const base = 'KMG/KD00000 FIRMA/HG_TEIL-0001_A_Halter';
const item = (rel) => ({ path: `${base}/${rel}`, file: { name: rel.split('/').pop() } });
const parsed = (files = {}) => ({
  key: 'KD00000 FIRMA/HG_TEIL-0001_A_Halter',
  customerPartNumber: 'TEIL-0001',
  errors: [],
  files: {
    program: [item('01/TEIL-0001.prg'), item('01/TEIL-0001.cad'), item('01/Messprotokoll.pdf')],
    template: [item('01/T.xlsx'), item('01/T.layout.xml')],
    calibration: [item('04/Kal.prg')],
    photos: [item('03/01/a.jpg'), item('03/01/b.jpg')],
    drawingPdf: [item('03/02/TEIL-0001.pdf')],
    drawingOther: [item('03/02/TEIL-0001.tif')],
    cad: [item('03/04/TEIL-0001.stp'), item('03/04/Vorrichtung.stp')],
    ...files,
  },
});
const names = (list) => list.map(i => i.path.split('/').pop());

(async () => {
  const m = await import(pathToFileURL(path.join(__dirname, '../../frontend/src/utils/legacyImport/selection.js')).href);

  console.log('\nAltbestand-Import: Dateiauswahl');

  test('Einträge: Auswahl je Datei, .prg ist Pflicht', () => {
    const e = Object.fromEntries(m.fileEntries(parsed()).map(x => [x.name, x]));
    assert.deepEqual(e['TEIL-0001.prg'].choices, ['program']);
    assert.equal(e['TEIL-0001.prg'].required, true);
    assert.deepEqual(e['TEIL-0001.cad'].choices, ['program', 'skip']);
    assert.deepEqual(e['TEIL-0001.pdf'].choices, ['drawing', 'part_document', 'skip']);
    assert.deepEqual(e['TEIL-0001.tif'].choices, ['part_document', 'skip']);
    assert.deepEqual(e['Vorrichtung.stp'].choices, ['part_document', 'skip']);
    assert.deepEqual(e['a.jpg'].choices, ['photo', 'skip']);
    assert.deepEqual(e['Kal.prg'].choices, ['calibration', 'skip']);
    assert.deepEqual(e['T.xlsx'].choices, ['template', 'skip']);
    assert.equal(m.fileEntries(parsed()).length, 12);
  });

  test('Vorbelegung: PDF im Messprogramm-Ordner abgewählt, wenn es eine Zeichnung im Zeichnungs-Ordner gibt', () => {
    const e = Object.fromEntries(m.fileEntries(parsed()).map(x => [x.name, x]));
    assert.equal(e['Messprotokoll.pdf'].defaultChoice, 'skip');
    assert.equal(e['TEIL-0001.pdf'].defaultChoice, 'drawing');
    assert.equal(e['Vorrichtung.stp'].defaultChoice, 'part_document');
  });

  test('Vorbelegung: PDF im Messprogramm-Ordner wird Prüfzeichnung, wenn sonst keine da ist', () => {
    const e = m.fileEntries(parsed({ drawingPdf: [] })).find(x => x.name === 'Messprotokoll.pdf');
    assert.equal(e.defaultChoice, 'drawing');
  });

  test('Ohne Auswahl: Dateien wie bisher, Protokoll-PDF bleibt draußen', () => {
    const f = m.effectiveFiles(parsed(), {});
    assert.deepEqual(names(f.program), ['TEIL-0001.prg', 'TEIL-0001.cad']);
    assert.deepEqual(names(f.drawingPdf), ['TEIL-0001.pdf']);
    assert.deepEqual(names(f.drawingOther), ['TEIL-0001.tif']);
    assert.deepEqual(names(f.cad), ['TEIL-0001.stp', 'Vorrichtung.stp']);
    assert.deepEqual(names(f.photos), ['a.jpg', 'b.jpg']);
    assert.deepEqual(names(f.calibration), ['Kal.prg']);
    assert.deepEqual(names(f.template), ['T.xlsx', 'T.layout.xml']);
  });

  test('Auswahl: abwählen, PDF als Bauteil-Dokument, Items unverändert', () => {
    const choices = {
      [`${base}/03/04/Vorrichtung.stp`]: 'skip',
      [`${base}/03/01/b.jpg`]: 'skip',
      [`${base}/01/Messprotokoll.pdf`]: 'part_document',
      [`${base}/03/02/TEIL-0001.pdf`]: 'skip',
      [`${base}/01/T.xlsx`]: 'skip',
      [`${base}/01/T.layout.xml`]: 'skip',
      [`${base}/04/Kal.prg`]: 'skip',
      [`${base}/01/TEIL-0001.cad`]: 'skip',
    };
    const p = parsed();
    const f = m.effectiveFiles(p, { choices });
    assert.deepEqual(names(f.program), ['TEIL-0001.prg']);
    assert.deepEqual(names(f.drawingPdf), []);
    assert.deepEqual(names(f.drawingOther), ['Messprotokoll.pdf', 'TEIL-0001.tif']);
    assert.deepEqual(names(f.cad), ['TEIL-0001.stp']);
    assert.deepEqual(names(f.photos), ['a.jpg']);
    assert.deepEqual(f.calibration, []);
    assert.deepEqual(f.template, []);
    assert.equal(f.cad[0], p.files.cad[0], 'gleiches Item-Objekt (trägt die Datei)');
  });

  test('Pflicht und ungültige Auswahl: .prg bleibt drin, Unbekanntes zählt als Vorbelegung', () => {
    const f = m.effectiveFiles(parsed(), { choices: { [`${base}/01/TEIL-0001.prg`]: 'skip', [`${base}/03/01/a.jpg`]: 'drawing' } });
    assert.deepEqual(names(f.program), ['TEIL-0001.prg', 'TEIL-0001.cad']);
    assert.deepEqual(names(f.photos), ['a.jpg', 'b.jpg']);
  });

  test('Haupt-CAD: gewähltes zuerst, abgewähltes zählt nicht, Vorgabe = erstes', () => {
    const p = parsed();
    assert.equal(m.primaryCadPath(p, {}), `${base}/03/04/TEIL-0001.stp`);
    const sel = { primaryCad: `${base}/03/04/Vorrichtung.stp` };
    assert.deepEqual(names(m.effectiveFiles(p, sel).cad), ['Vorrichtung.stp', 'TEIL-0001.stp']);
    const skipped = { primaryCad: `${base}/03/04/Vorrichtung.stp`, choices: { [`${base}/03/04/Vorrichtung.stp`]: 'skip' } };
    assert.equal(m.primaryCadPath(p, skipped), `${base}/03/04/TEIL-0001.stp`);
    assert.deepEqual(names(m.effectiveFiles(p, skipped).cad), ['TEIL-0001.stp']);
    assert.equal(m.primaryCadPath(parsed({ cad: [] }), {}), null);
  });

  test('Haupt-CAD-Vorschlag: Name mit Kunden-Teilenummer, sonst alphabetisch – unabhängig von der Reihenfolge', () => {
    const vor = item('03/04/Vorrichtung.stp');
    const teil = item('03/04/teil-0001_rohteil.stp');
    assert.equal(m.primaryCadPath(parsed({ cad: [vor, teil] }), {}), teil.path);
    const b = item('03/04/B.stp');
    const a = item('03/04/A.stp');
    assert.equal(m.primaryCadPath(parsed({ cad: [b, a] }), {}), a.path);
    assert.deepEqual(names(m.effectiveFiles(parsed({ cad: [vor, teil] }), {}).cad), ['teil-0001_rohteil.stp', 'Vorrichtung.stp']);
  });

  test('withSelection: gleiche Zeile mit ausgewählten Dateien', () => {
    const p = parsed();
    const w = m.withSelection(p, { choices: { [`${base}/03/04/Vorrichtung.stp`]: 'skip' } });
    assert.equal(w.key, p.key);
    assert.deepEqual(names(w.files.cad), ['TEIL-0001.stp']);
    assert.equal(p.files.cad.length, 2, 'Original unverändert');
  });

  test('Zusammenfassung', () => {
    assert.equal(m.fileSummary(m.effectiveFiles(parsed(), {})),
      '1 Prüfzeichnung · 2 CAD · 1 Dokument · 2 Fotos · Kalibrierprogramm · Excel-Vorlage');
    assert.equal(m.fileSummary(m.effectiveFiles(parsed({ cad: [], drawingOther: [], calibration: [], template: [], drawingPdf: [] }), {
      choices: { [`${base}/01/Messprotokoll.pdf`]: 'skip', [`${base}/03/01/b.jpg`]: 'skip' },
    })), '1 Foto');
    assert.equal(m.fileSummary({ program: [], template: [], calibration: [], photos: [], drawingPdf: [], drawingOther: [], cad: [] }), 'nur Messprogramm');
  });

  test('Bezeichnungen der Ziele', () => {
    assert.equal(m.CHOICE_LABELS.drawing, 'Prüfzeichnung');
    assert.equal(m.CHOICE_LABELS.part_document, 'Bauteil-Dokument');
    assert.equal(m.CHOICE_LABELS.skip, 'nicht übernehmen');
  });

  test('Auswahl nach dem Stand im MDS: Fehlendes abgewählt, PDF beim Bauteil bleibt Bauteil-Dokument', () => {
    const p = parsed();
    const state = { photoNames: ['a.jpg'], documentNames: ['TEIL-0001.stp', 'Messprotokoll.pdf'] };
    const sel = m.selectionFromMds(p, state);
    const f = m.effectiveFiles(p, sel);
    assert.deepEqual(names(f.photos), ['a.jpg']);
    assert.deepEqual(names(f.cad), ['TEIL-0001.stp']);
    assert.deepEqual(names(f.drawingOther), ['Messprotokoll.pdf']);
    assert.deepEqual(names(f.drawingPdf), ['TEIL-0001.pdf'], 'Prüfzeichnung steckt im Messprogramm – Vorbelegung bleibt');
    assert.ok(!Object.values(sel.choices).includes(undefined));
    // Alles da → keine Abweichung von der Vorbelegung
    const full = { photoNames: ['a.jpg', 'b.jpg'], documentNames: ['TEIL-0001.stp', 'Vorrichtung.stp', 'TEIL-0001.tif'] };
    assert.deepEqual(m.selectionFromMds(p, full), { choices: {} });
  });

  console.log(`\n${passed} Tests bestanden`);
})();
