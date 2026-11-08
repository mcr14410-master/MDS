/**
 * Tests für den Ordner-Parser des Altbestand-Imports (Messprogramme)
 * Modul liegt im Frontend (reines ES-Modul): frontend/src/utils/legacyImport/parse.js
 * Ausführen: node backend/tests/test-legacy-import-parse.js
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

const tree = (prefix, relPaths) => relPaths.map(p => ({ path: `${prefix}/${p}` }));
const names = (list) => list.map(i => i.path.split('/').pop());

const NORMAL_REL = [
  '01_Messprogramm HG_IndexA/TEIL-0001.prg',
  '01_Messprogramm HG_IndexA/TEIL-0001.cad',
  '01_Messprogramm HG_IndexA/TEIL-0001.xlsx',
  '01_Messprogramm HG_IndexA/TEIL-0001.layout.xml',
  '01_Messprogramm HG_IndexA/Protokolle/p1.pdf',
  '02_Messdaten/x.txt',
  '03_Aufspannungs- und Teiledaten/01_Bilder der Aufspannsituation/a.JPG',
  '03_Aufspannungs- und Teiledaten/01_Bilder der Aufspannsituation/b.heic',
  '03_Aufspannungs- und Teiledaten/02_Gestempelte Zeichnung/TEIL-0001.pdf',
  '03_Aufspannungs- und Teiledaten/02_Gestempelte Zeichnung/TEIL-0001.tif',
  '03_Aufspannungs- und Teiledaten/03_Arbeitsanweisung und Einrichtblatt/ES.xlsx',
  '03_Aufspannungs- und Teiledaten/04_CAD-Modell/TEIL-0001.stp',
  '04_Taster kalibrieren/Kal.prg',
  '04_Taster kalibrieren/Kal.pdf',
  '05_Alte Daten/alt.prg',
  'Notiz.txt',
];
const normal = tree('KMG/KD00000 FIRMA/HG_TEIL-0001_A_Halter Links', NORMAL_REL);

// Kleinstes gültiges Programm unter einem Programmordner
const minimal = (programFolder, programDir = '01_Messprogramm HG_Index0', customer = 'KD00000 FIRMA') =>
  tree(`KMG/${customer}/${programFolder}`, [`${programDir}/P.prg`]);

(async () => {
  const { parseLegacyTree } = await import(
    pathToFileURL(path.join(__dirname, '../../frontend/src/utils/legacyImport/parse.js')).href);
  const { DEFAULT_PROFILE } = await import(
    pathToFileURL(path.join(__dirname, '../../frontend/src/utils/legacyImport/profile.js')).href);

  console.log('\nAltbestand-Import: Ordner-Parser');

  test('Profil: Bildformate wie beim Einrichteblatt', () => {
    assert.deepEqual(DEFAULT_PROFILE.photoExtensions, ['jpg', 'jpeg', 'png', 'webp']);
  });

  test('Normalfall: Kopfdaten', () => {
    const [p] = parseLegacyTree(normal).programs;
    assert.equal(p.key, 'KD00000 FIRMA/HG_TEIL-0001_A_Halter Links');
    assert.equal(p.customerFolder, 'KD00000 FIRMA');
    assert.equal(p.programFolder, 'HG_TEIL-0001_A_Halter Links');
    assert.equal(p.customerNumber, 'KD00000');
    assert.equal(p.machineCode, 'HG');
    assert.equal(p.customerPartNumber, 'TEIL-0001');
    assert.equal(p.revision, 'A');
    assert.equal(p.nameRevision, 'A');
    assert.equal(p.name, 'Halter Links');
    assert.deepEqual(p.errors, []);
    assert.deepEqual(p.warnings, []);
  });

  test('Normalfall: Dateien je Ziel', () => {
    const [p] = parseLegacyTree(normal).programs;
    assert.deepEqual(names(p.files.program), ['TEIL-0001.prg', 'TEIL-0001.cad']);
    assert.deepEqual(names(p.files.template), ['TEIL-0001.xlsx', 'TEIL-0001.layout.xml']);
    assert.deepEqual(names(p.files.calibration), ['Kal.prg']);
    assert.deepEqual(names(p.files.photos), ['a.JPG']);
    assert.deepEqual(names(p.files.drawingPdf), ['TEIL-0001.pdf']);
    assert.deepEqual(names(p.files.drawingOther), ['TEIL-0001.tif']);
    assert.deepEqual(names(p.files.cad), ['TEIL-0001.stp']);
  });

  test('Normalfall: Items werden unverändert übernommen', () => {
    const items = normal.map(i => ({ ...i, file: { marker: i.path } }));
    const [p] = parseLegacyTree(items).programs;
    assert.equal(p.files.program[0].file.marker, p.files.program[0].path);
  });

  test('Normalfall: Aussortiertes mit Grund', () => {
    const [p] = parseLegacyTree(normal).programs;
    const reason = (end) => p.skipped.find(s => s.path.endsWith(end))?.reason;
    assert.match(reason('Protokolle/p1.pdf'), /Unterordner/);
    assert.match(reason('02_Messdaten/x.txt'), /Messdaten/);
    assert.match(reason('b.heic'), /JPG, PNG, WebP/);
    assert.match(reason('ES.xlsx'), /nicht übernommen/);
    assert.match(reason('Kal.pdf'), /\.prg/);
    assert.match(reason('alt.prg'), /Alte Daten/);
    assert.match(reason('Notiz.txt'), /direkt im Programmordner/);
  });

  test('Ohne Revision im Namen: Revision aus dem Index', () => {
    const [p] = parseLegacyTree(minimal('HG_TEIL-0002_Deckel')).programs;
    assert.equal(p.revision, '0');
    assert.equal(p.nameRevision, null);
    assert.equal(p.name, 'Deckel');
    assert.deepEqual(p.warnings, []);
  });

  test('Name aus mehreren Teilen ohne Revision', () => {
    const [p] = parseLegacyTree(minimal('HG_TEIL-0002_Deckel_oben')).programs;
    assert.equal(p.nameRevision, null);
    assert.equal(p.name, 'Deckel oben');
  });

  test('Revision im Namen weicht vom Index ab', () => {
    const [p] = parseLegacyTree(minimal('HG_TEIL-0003_B_Platte', '01_Messprogramm HG_IndexC')).programs;
    assert.equal(p.revision, 'C');
    assert.equal(p.nameRevision, 'B');
    assert.ok(p.warnings.some(w => /weicht vom Index/.test(w)), p.warnings.join('|'));
  });

  test('Kein Index: Revision aus dem Namen mit Warnung', () => {
    const [p] = parseLegacyTree(minimal('HG_TEIL-0004_B_Platte', '01_Messprogramm')).programs;
    assert.equal(p.revision, 'B');
    assert.ok(p.warnings.some(w => /Kein Index/.test(w)), p.warnings.join('|'));
    assert.deepEqual(p.errors, []);
  });

  test('Weder Index noch Revision im Namen: Fehler', () => {
    const [p] = parseLegacyTree(minimal('HG_TEIL-0005_Platte', '01_Messprogramm')).programs;
    assert.equal(p.revision, null);
    assert.ok(p.errors.some(e => /Revision fehlt/.test(e)), p.errors.join('|'));
  });

  test('Keine .prg: Fehler', () => {
    const items = tree('KMG/KD00000 FIRMA/HG_TEIL-0006_Platte', ['01_Messprogramm HG_Index0/P.cad']);
    const [p] = parseLegacyTree(items).programs;
    assert.ok(p.errors.some(e => /Keine \.prg/.test(e)), p.errors.join('|'));
  });

  test('Mehrere .prg: Fehler', () => {
    const items = tree('KMG/KD00000 FIRMA/HG_TEIL-0007_Platte',
      ['01_Messprogramm HG_Index0/P1.prg', '01_Messprogramm HG_Index0/P2.PRG']);
    const [p] = parseLegacyTree(items).programs;
    assert.ok(p.errors.some(e => /Mehrere \.prg/.test(e)), p.errors.join('|'));
  });

  test('Anders nummerierte Ordner werden erkannt, unbekannte aussortiert', () => {
    const items = tree('KMG/KD00000 FIRMA/HG_TEIL-0008_Platte', [
      '3_Messprogramm HG_Index0/P.prg',
      'Aufspannung/Fotos/f.png',
      '07_Sonstiges/x.txt',
    ]);
    const [p] = parseLegacyTree(items).programs;
    assert.deepEqual(names(p.files.program), ['P.prg']);
    assert.deepEqual(names(p.files.photos), ['f.png']);
    assert.match(p.skipped.find(s => s.path.endsWith('07_Sonstiges/x.txt')).reason, /Unbekannter Ordner/);
  });

  test('Auswahl = Kundenordner ergibt denselben Schlüssel', () => {
    const items = NORMAL_REL.map(p => ({ path: `KD00000 FIRMA/HG_TEIL-0001_A_Halter Links/${p}` }));
    const [p] = parseLegacyTree(items).programs;
    assert.equal(p.key, 'KD00000 FIRMA/HG_TEIL-0001_A_Halter Links');
    assert.equal(p.customerNumber, 'KD00000');
  });

  test('Auswahl = einzelner Programmordner: Kundenordner fehlt', () => {
    const items = [{ path: 'HG_TEIL-0009_Platte/01_Messprogramm HG_Index0/P.prg' }];
    const [p] = parseLegacyTree(items).programs;
    assert.ok(p.errors.some(e => /Kundenordner fehlt/.test(e)), p.errors.join('|'));
  });

  test('Kein Ordner mit Messprogramm: Hinweis statt leerer Liste', () => {
    const result = parseLegacyTree([{ path: 'Irgendwas/a.txt' }, { path: 'Irgendwas/b/c.txt' }]);
    assert.equal(result.programs.length, 0);
    assert.match(result.notices[0], /Kein Programmordner gefunden/);
  });

  test('Zwei Programme in zwei Kundenordnern, sortiert nach Schlüssel', () => {
    const items = [
      ...minimal('HG_TEIL-0011_Platte', '01_Messprogramm HG_Index0', 'KD00002 FIRMA'),
      ...minimal('HG_TEIL-0010_Platte', '01_Messprogramm HG_Index0', 'KD00001 FIRMA'),
    ];
    const keys = parseLegacyTree(items).programs.map(p => p.key);
    assert.deepEqual(keys, ['KD00001 FIRMA/HG_TEIL-0010_Platte', 'KD00002 FIRMA/HG_TEIL-0011_Platte']);
  });

  test('Gestempelte Zeichnung mit gleichem Namen wie PDF im Messprogramm: nur einmal', () => {
    const items = tree('KMG/KD00000 FIRMA/HG_TEIL-0012_Platte', [
      '01_Messprogramm HG_Index0/P.prg',
      '01_Messprogramm HG_Index0/TEIL-0012.pdf',
      '03_Aufspannungs- und Teiledaten/02_Gestempelte Zeichnung/TEIL-0012.pdf',
    ]);
    const [p] = parseLegacyTree(items).programs;
    assert.deepEqual(p.files.drawingPdf, []);
    assert.match(p.skipped.find(s => s.path.includes('Gestempelte')).reason, /schon im Messprogramm-Ordner/);
  });

  test('Bauteil-Dokumente: nur Dateitypen, die das MDS annimmt', () => {
    const items = tree('KMG/KD00000 FIRMA/HG_TEIL-0014_Platte', [
      '01_Messprogramm HG_Index0/P.prg',
      '03_Aufspannungs- und Teiledaten/02_Gestempelte Zeichnung/Thumbs.db',
      '03_Aufspannungs- und Teiledaten/02_Gestempelte Zeichnung/Z.DWG',
      '03_Aufspannungs- und Teiledaten/04_CAD-Modell/M.STEP',
      '03_Aufspannungs- und Teiledaten/04_CAD-Modell/M.prt',
      '03_Aufspannungs- und Teiledaten/04_CAD-Modell/desktop.ini',
    ]);
    const [p] = parseLegacyTree(items).programs;
    assert.deepEqual(names(p.files.drawingOther), ['Z.DWG']);
    assert.deepEqual(names(p.files.cad), ['M.STEP']);
    const reason = (end) => p.skipped.find(s => s.path.endsWith(end))?.reason;
    assert.match(reason('Thumbs.db'), /Dateityp/);
    assert.match(reason('M.prt'), /Dateityp/);
    assert.match(reason('desktop.ini'), /Dateityp/);
  });

  test('Alter Programmordner unter „Alte Daten“ zählt nicht als eigenes Programm', () => {
    const items = tree('KMG/KD00000 FIRMA/HG_TEIL-0013_Platte', [
      '01_Messprogramm HG_Index0/P.prg',
      '05_Alte Daten/HG_TEIL-0013_Platte_alt/01_Messprogramm/alt.prg',
    ]);
    const { programs } = parseLegacyTree(items);
    assert.equal(programs.length, 1);
    assert.match(programs[0].skipped[0].reason, /Alte Daten/);
  });

  test('Zwei Ordner für dasselbe Bauteil an derselben Maschine: der zweite ist ein Fehler', () => {
    const items = [
      ...minimal('HG_TEIL-0014_A_Seite 1', '01_Messprogramm HG_Index A'),
      ...minimal('HG_TEIL-0014_A_Seite 2', '01_Messprogramm HG_Index A'),
      ...minimal('HG_TEIL-0014_B_Seite 1', '01_Messprogramm HG_Index B'),
      ...minimal('XY_TEIL-0014_A_Seite 1', '01_Messprogramm XY_Index A'),
      ...minimal('HG_TEIL-0014_A_Seite 1', '01_Messprogramm HG_Index A', 'KD00001 FIRMA'),
    ];
    const { programs } = parseLegacyTree(items);
    const byKey = Object.fromEntries(programs.map(p => [p.key, p]));
    assert.deepEqual(byKey['KD00000 FIRMA/HG_TEIL-0014_A_Seite 1'].errors, []);
    const second = byKey['KD00000 FIRMA/HG_TEIL-0014_A_Seite 2'].errors;
    assert.equal(second.length, 1, second.join('|'));
    assert.match(second[0], /Gleiches Bauteil.*„HG_TEIL-0014_A_Seite 1“/);
    assert.deepEqual(byKey['KD00000 FIRMA/HG_TEIL-0014_B_Seite 1'].errors, []);
    assert.deepEqual(byKey['KD00000 FIRMA/XY_TEIL-0014_A_Seite 1'].errors, []);
    assert.deepEqual(byKey['KD00001 FIRMA/HG_TEIL-0014_A_Seite 1'].errors, []);
  });

  test('Revision aus dem Index-Ordner auch einzeln (für Vorschläge)', () => {
    const [p] = parseLegacyTree(minimal('XXXX-0001a_holder_HG', '01_Messprogramm HG_Index a')).programs;
    assert.equal(p.indexRevision, 'a');
    const [q] = parseLegacyTree(minimal('HG_TEIL-0015_B_Platte', '01_Messprogramm HG')).programs;
    assert.equal(q.indexRevision, null);
    assert.equal(q.revision, 'B');
  });

  console.log(`\n${passed} Tests bestanden`);
})();
