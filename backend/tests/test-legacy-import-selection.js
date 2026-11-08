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
const unit = (unitPath, label, program, template = []) => ({ path: unitPath, label, files: { program, template } });
const parsed = (files = {}, units = null) => ({
  key: 'KD00000 FIRMA/HG_TEIL-0001_A_Halter',
  customerFolder: 'KD00000 FIRMA',
  programFolder: 'HG_TEIL-0001_A_Halter',
  customerPartNumber: 'TEIL-0001',
  errors: [],
  units: units || [unit('', 'Messprogramm',
    [item('01/TEIL-0001.prg'), item('01/TEIL-0001.cad'), item('01/Messprotokoll.pdf')],
    [item('01/T.xlsx'), item('01/T.layout.xml')])],
  files: {
    template: [],
    calibration: [item('04/Kal.prg')],
    photos: [item('03/01/a.jpg'), item('03/01/b.jpg')],
    drawingPdf: [item('03/02/TEIL-0001.pdf')],
    drawingOther: [item('03/02/TEIL-0001.tif')],
    cad: [item('03/04/TEIL-0001.stp'), item('03/04/Vorrichtung.stp')],
    ...files,
  },
});
// Drei Messprogramme in Unterordnern, Vorlage im Ordner „Vorlage“
const multi = () => parsed({ template: [item('01/Vorlage/T.xlsx')] }, [
  unit('Messprogramm_FAI', 'FAI', [item('01/Messprogramm_FAI/FAI.prg')]),
  unit('Messprogramm_Fertigung/AG1', 'Fertigung / AG1', [item('01/Messprogramm_Fertigung/AG1/AG1.prg'), item('01/Messprogramm_Fertigung/AG1/Protokoll.pdf')]),
  unit('Messprogramm_Fertigung/AG2', 'Fertigung / AG2', [item('01/Messprogramm_Fertigung/AG2/AG2.prg')]),
]);
const OP = { op_number: 'KMG', op_name: 'Messen' };
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
    assert.deepEqual(e['a.jpg'].choices, ['photo:', 'skip']);
    assert.deepEqual(e['Kal.prg'].choices, ['calibration', 'skip']);
    assert.deepEqual(e['T.xlsx'].choices, ['template:', 'skip']);
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
    const [u] = m.effectiveUnits(parsed(), {});
    assert.deepEqual(names(u.files.program), ['TEIL-0001.prg', 'TEIL-0001.cad']);
    assert.deepEqual(names(u.files.drawingPdf), ['TEIL-0001.pdf']);
    assert.deepEqual(names(u.files.photos), ['a.jpg', 'b.jpg']);
    assert.deepEqual(names(u.files.calibration), ['Kal.prg']);
    assert.deepEqual(names(u.files.template), ['T.xlsx', 'T.layout.xml']);
    assert.deepEqual(names(f.drawingPdf), ['TEIL-0001.pdf']);
    assert.deepEqual(names(f.drawingOther), ['TEIL-0001.tif']);
    assert.deepEqual(names(f.cad), ['TEIL-0001.stp', 'Vorrichtung.stp']);
    assert.deepEqual(names(f.photos), ['a.jpg', 'b.jpg']);
    assert.deepEqual(names(f.calibration), ['Kal.prg']);
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
    const [u] = m.effectiveUnits(p, { choices });
    assert.deepEqual(names(u.files.program), ['TEIL-0001.prg']);
    assert.deepEqual(names(u.files.drawingPdf), []);
    assert.deepEqual(u.files.template, []);
    assert.deepEqual(u.files.calibration, []);
    assert.deepEqual(names(f.drawingPdf), []);
    assert.deepEqual(names(f.drawingOther), ['Messprotokoll.pdf', 'TEIL-0001.tif']);
    assert.deepEqual(names(f.cad), ['TEIL-0001.stp']);
    assert.deepEqual(names(f.photos), ['a.jpg']);
    assert.deepEqual(f.calibration, []);
    assert.equal(f.cad[0], p.files.cad[0], 'gleiches Item-Objekt (trägt die Datei)');
  });

  test('Pflicht und ungültige Auswahl: .prg bleibt drin, Unbekanntes zählt als Vorbelegung', () => {
    const sel = { choices: { [`${base}/01/TEIL-0001.prg`]: 'skip', [`${base}/03/01/a.jpg`]: 'drawing' } };
    const f = m.effectiveFiles(parsed(), sel);
    assert.deepEqual(names(m.effectiveUnits(parsed(), sel)[0].files.program), ['TEIL-0001.prg', 'TEIL-0001.cad']);
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
    assert.equal(m.fileSummary(m.withSelection(parsed(), {})),
      '1 Prüfzeichnung · 2 CAD · 1 Dokument · 2 Fotos · Kalibrierprogramm · Excel-Vorlage');
    assert.equal(m.fileSummary(m.withSelection(parsed({ cad: [], drawingOther: [], calibration: [], drawingPdf: [] }), {
      choices: { [`${base}/01/Messprotokoll.pdf`]: 'skip', [`${base}/03/01/b.jpg`]: 'skip', [`${base}/01/T.xlsx`]: 'skip', [`${base}/01/T.layout.xml`]: 'skip' },
    })), '1 Foto');
    assert.equal(m.fileSummary(m.withSelection(multi(), {})), '3 Messprogramme · 1 Prüfzeichnung · 2 CAD · 1 Dokument · 2 Fotos · Kalibrierprogramm · Excel-Vorlage');
  });

  test('Bezeichnungen der Ziele', () => {
    assert.equal(m.CHOICE_LABELS.drawing, 'Prüfzeichnung');
    assert.equal(m.CHOICE_LABELS.part_document, 'Bauteil-Dokument');
    assert.equal(m.CHOICE_LABELS.skip, 'nicht übernehmen');
  });

  test('Auswahl nach dem Stand im MDS: Fehlendes abgewählt, PDF beim Bauteil bleibt Bauteil-Dokument', () => {
    const p = parsed();
    const state = { documentNames: ['TEIL-0001.stp', 'Messprotokoll.pdf'], units: { '': { programId: 3, photoNames: ['a.jpg'] } } };
    const sel = m.selectionFromMds(p, state);
    const f = m.effectiveFiles(p, sel);
    assert.deepEqual(names(f.photos), ['a.jpg']);
    assert.deepEqual(names(f.cad), ['TEIL-0001.stp']);
    assert.deepEqual(names(f.drawingOther), ['Messprotokoll.pdf']);
    assert.deepEqual(names(f.drawingPdf), ['TEIL-0001.pdf'], 'Prüfzeichnung steckt im Messprogramm – Vorbelegung bleibt');
    const full = { documentNames: ['TEIL-0001.stp', 'Vorrichtung.stp', 'TEIL-0001.tif'], units: { '': { programId: 3, photoNames: ['a.jpg', 'b.jpg'] } } };
    assert.deepEqual(m.selectionFromMds(p, full), { choices: {}, units: {} });
  });

  test('Mehrere Messprogramme: Einträge je Programm, Fotos und Vorlage einem Programm zuordnen', () => {
    const e = Object.fromEntries(m.fileEntries(multi()).map(x => [x.name, x]));
    assert.equal(e['AG1.prg'].unit, 'Messprogramm_Fertigung/AG1');
    assert.equal(e['Protokoll.pdf'].unit, 'Messprogramm_Fertigung/AG1');
    assert.equal(e['TEIL-0001.pdf'].unit, null, 'gestempelte Zeichnung gehört allen');
    assert.deepEqual(e['a.jpg'].choices, ['photo:Messprogramm_FAI', 'photo:Messprogramm_Fertigung/AG1', 'photo:Messprogramm_Fertigung/AG2', 'skip']);
    assert.equal(e['a.jpg'].defaultChoice, 'photo:Messprogramm_FAI');
    assert.equal(e['T.xlsx'].defaultChoice, 'template:Messprogramm_FAI');
  });

  test('Mehrere Messprogramme: Dateien je Programm, Zeichnung und Kalibrierung in jedem', () => {
    const p = multi();
    const sel = { choices: { [`${base}/03/01/b.jpg`]: 'photo:Messprogramm_Fertigung/AG2', [`${base}/01/Vorlage/T.xlsx`]: 'template:Messprogramm_Fertigung/AG1' } };
    const us = m.effectiveUnits(p, sel);
    assert.deepEqual(us.map(u => u.path), ['Messprogramm_FAI', 'Messprogramm_Fertigung/AG1', 'Messprogramm_Fertigung/AG2']);
    const [fai, ag1, ag2] = us;
    assert.deepEqual(names(fai.files.program), ['FAI.prg']);
    assert.deepEqual(names(fai.files.drawingPdf), ['TEIL-0001.pdf']);
    assert.deepEqual(names(ag1.files.drawingPdf), ['TEIL-0001.pdf'], 'Protokoll-PDF im Programm ist abgewählt (Zeichnung vorhanden)');
    assert.deepEqual(names(ag2.files.calibration), ['Kal.prg']);
    assert.deepEqual(names(fai.files.photos), ['a.jpg']);
    assert.deepEqual(names(ag2.files.photos), ['b.jpg']);
    assert.deepEqual(names(ag1.files.template), ['T.xlsx']);
    assert.deepEqual(fai.files.template, []);
  });

  test('Mehrere Messprogramme: Programm abwählen, Zugeordnetes wandert zum ersten übrigen', () => {
    const p = multi();
    const sel = { units: { Messprogramm_FAI: { skip: true } } };
    const us = m.effectiveUnits(p, sel);
    assert.deepEqual(us.map(u => u.label), ['Fertigung / AG1', 'Fertigung / AG2']);
    assert.deepEqual(names(us[0].files.photos), ['a.jpg', 'b.jpg']);
    assert.deepEqual(names(us[0].files.template), ['T.xlsx']);
    const none = m.withSelection(p, { units: Object.fromEntries(p.units.map(u => [u.path, { skip: true }])) });
    assert.ok(none.errors.includes('Kein Messprogramm ausgewählt'));
  });

  test('Arbeitsgang je Messprogramm: Vorgabe mit Bezeichnung, eigene Werte, Einzelprogramm wie bisher', () => {
    const p = multi();
    const w = m.withSelection(p, { units: { 'Messprogramm_Fertigung/AG2': { opNumber: 'KMG2', opName: 'Messen Seite 2' } } }, OP);
    assert.deepEqual(w.units.map(u => u.operation), [
      { op_number: 'KMG', op_name: 'Messen FAI' },
      { op_number: 'KMG', op_name: 'Messen Fertigung / AG1' },
      { op_number: 'KMG2', op_name: 'Messen Seite 2' },
    ]);
    assert.deepEqual(m.withSelection(parsed(), {}, OP).units[0].operation, { op_number: 'KMG', op_name: 'Messen' });
  });

  test('Ziele zum Wiedererkennen: alle Programme mit Herkunft und geplantem Arbeitsgang', () => {
    const t = m.importTargets(multi(), { units: { Messprogramm_FAI: { skip: true } } }, OP);
    assert.deepEqual(t.map(x => [x.path, x.source, x.opName]), [
      ['Messprogramm_FAI', 'Altbestand: KD00000 FIRMA\\HG_TEIL-0001_A_Halter\\Messprogramm_FAI', 'Messen FAI'],
      ['Messprogramm_Fertigung/AG1', 'Altbestand: KD00000 FIRMA\\HG_TEIL-0001_A_Halter\\Messprogramm_Fertigung\\AG1', 'Messen Fertigung / AG1'],
      ['Messprogramm_Fertigung/AG2', 'Altbestand: KD00000 FIRMA\\HG_TEIL-0001_A_Halter\\Messprogramm_Fertigung\\AG2', 'Messen Fertigung / AG2'],
    ]);
    assert.equal(m.importTargets(parsed(), {}, OP)[0].source, 'Altbestand: KD00000 FIRMA\\HG_TEIL-0001_A_Halter');
  });

  test('Mehrere Messprogramme nach dem Stand im MDS: nicht übernommene Programme abgewählt, Fotos beim richtigen', () => {
    const p = multi();
    const state = {
      documentNames: [],
      units: {
        Messprogramm_FAI: { programId: 1, photoNames: [] },
        'Messprogramm_Fertigung/AG1': { programId: 2, photoNames: ['a.jpg'] },
        'Messprogramm_Fertigung/AG2': { programId: null, photoNames: [] },
      },
    };
    const sel = m.selectionFromMds(p, state);
    assert.deepEqual(sel.units, { 'Messprogramm_Fertigung/AG2': { skip: true } });
    const us = m.effectiveUnits(p, sel);
    assert.deepEqual(names(us.find(u => u.label === 'Fertigung / AG1').files.photos), ['a.jpg']);
    assert.deepEqual(us.flatMap(u => names(u.files.photos)), ['a.jpg'], 'b.jpg nirgends → abgewählt');
  });

  console.log(`\n${passed} Tests bestanden`);
})();
