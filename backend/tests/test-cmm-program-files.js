/**
 * Tests für cmmProgramFiles (Messprogramme: Dateien einordnen, Revision planen)
 * Ausführen: node backend/tests/test-cmm-program-files.js
 */
const assert = require('node:assert/strict');
const {
  decodeOriginalName, classifyFile, hasCustomMiniRoutines, templateBaseName, planRevision,
} = require('../src/services/cmmProgramFiles');

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

const f = (name, hash = 'h-' + name) => ({ name, hash, ...classifyFile(name) });
const GROUP = [
  f('TEIL-0001_OP30.prg'),
  f('TEIL-0001_OP30.cad'),
  f('TEIL-0001_OP30_Pruefzeichnung.pdf'),
  f('KD00000_TEIL-0001_C.xlsx'),
  f('KD00000_TEIL-0001_C.layout.xml'),
];

// --- Einordnung ---

test('Rollen und Zielordner nach Endung, ohne Groß-/Kleinschreibung', () => {
  assert.deepEqual(classifyFile('A.PRG'), { kind: 'file', role: 'main', target: 'program_dir' });
  assert.equal(classifyFile('a.CAD').role, 'cad');
  assert.equal(classifyFile('a.pdf').role, 'drawing');
  assert.deepEqual(classifyFile('a.xlsx'), { kind: 'file', role: 'report_xlsx', target: 'template_dir' });
  assert.deepEqual(classifyFile('a.Layout.XML'), { kind: 'file', role: 'report_layout', target: 'template_dir' });
});

test('PC-DMIS-Nebendateien, Wiederherstellung und Unbekanntes', () => {
  assert.equal(classifyFile('A.PRG~').kind, 'sidecar');
  assert.equal(classifyFile('A.PRG^').kind, 'sidecar');
  assert.equal(classifyFile('A.prg.corrupt').kind, 'corrupt');
  assert.equal(classifyFile('A.MiniRoutines.xml').kind, 'miniroutines');
  assert.equal(classifyFile('A.xml').kind, 'unknown');
  assert.equal(classifyFile('A.docx').kind, 'unknown');
  assert.equal(classifyFile('A.stp').kind, 'cad_import');
  assert.equal(classifyFile('A.STEP').kind, 'cad_import');
});

test('MiniRoutines.xml: nur Standard-Inhalt = Nebendatei', () => {
  const standard = '<FeatureBasedMeasurement><EntireRoutine Time="00:12:44" /><DefaultMiniRoutines></DefaultMiniRoutines><MarkSets /></FeatureBasedMeasurement>';
  const own = '<FeatureBasedMeasurement><MiniRoutine ID="MiniRoutine1" UID="1"><Dimension ID="PM1" /></MiniRoutine><MarkSets /></FeatureBasedMeasurement>';
  const marks = '<FeatureBasedMeasurement><MarkSets><MarkSet ID="x" /></MarkSets></FeatureBasedMeasurement>';
  const emptyMarks = '<FeatureBasedMeasurement><MarkSets>\n  </MarkSets></FeatureBasedMeasurement>';
  assert.equal(hasCustomMiniRoutines(standard), false);
  assert.equal(hasCustomMiniRoutines(emptyMarks), false);
  assert.equal(hasCustomMiniRoutines(own), true);
  assert.equal(hasCustomMiniRoutines(marks), true);
});

test('Vorlagen-Basisname und Dateinamen-Kodierung', () => {
  assert.equal(templateBaseName('KD00000_TEIL-0001_C.layout.xml'), 'KD00000_TEIL-0001_C');
  assert.equal(templateBaseName('KD00000_TEIL-0001_C.xlsx'), 'KD00000_TEIL-0001_C');
  assert.equal(templateBaseName('x.prg'), null);
  assert.equal(decodeOriginalName(Buffer.from('Prüfzeichnung.pdf').toString('latin1')), 'Prüfzeichnung.pdf');
  assert.equal(decodeOriginalName('Pruefzeichnung.pdf'), 'Pruefzeichnung.pdf');
  assert.equal(decodeOriginalName('Prüf.pdf'), 'Prüf.pdf'); // schon korrekt (kein gültiges UTF-8 als latin1)
});

// --- Neues Programm ---

test('Neues Programm: komplette Gruppe ok, Vorlagenname ermittelt', () => {
  const plan = planRevision({ uploaded: GROUP, previous: null });
  assert.deepEqual(plan.errors, []);
  assert.equal(plan.files.length, 5);
  assert.ok(plan.files.every(x => x.status === 'new'));
  assert.equal(plan.templateName, 'KD00000_TEIL-0001_C');
});

test('Neues Programm ohne .prg wird abgelehnt', () => {
  const plan = planRevision({ uploaded: GROUP.slice(1), previous: null });
  assert.ok(plan.errors.includes('Messprogramm (.prg) fehlt'));
});

test('Excel-Vorlage nur mit .layout.xml und gleichem Namen', () => {
  let plan = planRevision({ uploaded: GROUP.slice(0, 4), previous: null });
  assert.ok(plan.errors.some(e => e.startsWith('Excel-Vorlage unvollständig')));
  plan = planRevision({ uploaded: [...GROUP.slice(0, 4), f('ANDERS.layout.xml')], previous: null });
  assert.ok(plan.errors.some(e => e.includes('nicht denselben Namen')));
});

test('excel_report=true ohne Vorlage abgelehnt, ohne Schalter ok', () => {
  assert.ok(planRevision({ uploaded: GROUP.slice(0, 3), previous: null, excelReport: true })
    .errors.some(e => e.startsWith('Excel-Protokoll eingeschaltet')));
  assert.deepEqual(planRevision({ uploaded: GROUP.slice(0, 3), previous: null }).errors, []);
});

test('Doppelte Dateien und zwei .prg abgelehnt', () => {
  let plan = planRevision({ uploaded: [GROUP[0], f('teil-0001_op30.PRG')], previous: null });
  assert.ok(plan.errors.some(e => e.startsWith('Datei doppelt')));
  plan = planRevision({ uploaded: [GROUP[0], f('ZWEI.prg')], previous: null });
  assert.ok(plan.errors.some(e => e.includes('Messprogramm (.prg)')));
});

test('CAD mit anderem Namen als .prg → Warnung, kein Fehler', () => {
  const plan = planRevision({ uploaded: [GROUP[0], f('ANDERS.cad')], previous: null });
  assert.deepEqual(plan.errors, []);
  assert.equal(plan.warnings.length, 1);
});

// --- Neue Revision ---

test('Ganzer Ordner hochgeladen, nur .prg geändert → erkannt', () => {
  const uploaded = GROUP.map(x => x.role === 'main' ? { ...x, hash: 'neu' } : x);
  const plan = planRevision({ uploaded, previous: GROUP });
  assert.deepEqual(plan.errors, []);
  const byName = Object.fromEntries(plan.files.map(x => [x.name, x.status]));
  assert.equal(byName['TEIL-0001_OP30.prg'], 'changed');
  assert.equal(byName['TEIL-0001_OP30.cad'], 'unchanged');
  assert.equal(plan.files.length, 5);
});

test('Nur geänderte Datei hochgeladen → Rest übernommen', () => {
  const plan = planRevision({ uploaded: [{ ...GROUP[0], hash: 'neu' }], previous: GROUP });
  assert.deepEqual(plan.errors, []);
  assert.equal(plan.files.filter(x => x.status === 'carried').length, 4);
  assert.equal(plan.files.find(x => x.role === 'main').status, 'changed');
});

test('Nichts geändert → abgelehnt', () => {
  assert.ok(planRevision({ uploaded: GROUP, previous: GROUP }).errors.includes('Keine Änderung gegenüber der Vorversion'));
  assert.ok(planRevision({ uploaded: [], previous: GROUP }).errors.includes('Keine Änderung gegenüber der Vorversion'));
});

test('Neue .prg mit anderem Namen ersetzt die alte', () => {
  const plan = planRevision({ uploaded: [f('TEIL-0001_OP30_NEU.prg')], previous: GROUP });
  assert.deepEqual(plan.errors, []);
  assert.equal(plan.files.filter(x => x.role === 'main').length, 1);
  assert.equal(plan.removed[0].name, 'TEIL-0001_OP30.prg');
  assert.equal(plan.warnings.length, 1); // .cad heißt jetzt anders
});

test('Neue Vorlage (neuer Index) ersetzt das alte Paar', () => {
  const plan = planRevision({
    uploaded: [f('KD00000_TEIL-0001_D.xlsx'), f('KD00000_TEIL-0001_D.layout.xml')],
    previous: GROUP,
  });
  assert.deepEqual(plan.errors, []);
  assert.equal(plan.templateName, 'KD00000_TEIL-0001_D');
  assert.equal(plan.removed.length, 2);
});

test('Nur .xlsx mit neuem Namen → altes Layout passt nicht mehr', () => {
  const plan = planRevision({ uploaded: [f('KD00000_TEIL-0001_D.xlsx')], previous: GROUP });
  assert.ok(plan.errors.some(e => e.includes('nicht denselben Namen')));
});

test('Entfernen: Zeichnung ja, .prg nein, Vorlage nur über excel_report=false', () => {
  let plan = planRevision({ uploaded: [], previous: GROUP, remove: ['teil-0001_op30_pruefzeichnung.PDF'] });
  assert.deepEqual(plan.errors, []);
  assert.equal(plan.files.length, 4);
  plan = planRevision({ uploaded: [], previous: GROUP, remove: ['TEIL-0001_OP30.prg'] });
  assert.ok(plan.errors.some(e => e.includes('nicht entfernt')));
  plan = planRevision({ uploaded: [], previous: GROUP, remove: ['KD00000_TEIL-0001_C.xlsx'] });
  assert.ok(plan.errors.some(e => e.includes('excel_report=false')));
  plan = planRevision({ uploaded: [], previous: GROUP, remove: ['gibtsnicht.pdf'] });
  assert.ok(plan.errors.some(e => e.includes('nicht in der Vorversion')));
});

test('excel_report=false entfernt beide Vorlagendateien', () => {
  const plan = planRevision({ uploaded: [], previous: GROUP, excelReport: false });
  assert.deepEqual(plan.errors, []);
  assert.equal(plan.removed.length, 2);
  assert.equal(plan.templateName, null);
  assert.ok(planRevision({ uploaded: [GROUP[3]], previous: GROUP, excelReport: false })
    .errors.some(e => e.includes('ausgeschaltet')));
});

console.log(`\n${passed} Tests bestanden`);
