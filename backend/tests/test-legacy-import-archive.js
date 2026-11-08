/**
 * Tests für das Archiv-Skript des Altbestand-Imports (PowerShell)
 * Modul liegt im Frontend (reines ES-Modul): frontend/src/utils/legacyImport/archiveScript.js
 * Ausführen: node backend/tests/test-legacy-import-archive.js
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
  const m = await import(pathToFileURL(path.join(__dirname, '../../frontend/src/utils/legacyImport/archiveScript.js')).href);
  const build = (entries) => m.buildArchiveScript({
    sourceRoot: 'Z:\\KMG\\Programme', archiveRoot: 'Z:\\KMG\\Archiv', entries, createdAt: '08.11.2026 14:00',
  });

  console.log('\nAltbestand-Import: Archiv-Skript');

  test('Einstellungen: beide Pfade nötig', () => {
    assert.equal(m.validateArchiveSettings({ sourceRoot: '', archiveRoot: ' ' }).length, 2);
  });

  test('Einstellungen: gleicher Ordner (Groß/klein, abschließendes \\)', () => {
    const errors = m.validateArchiveSettings({ sourceRoot: 'Z:\\KMG\\Programme', archiveRoot: 'z:\\kmg\\programme\\' });
    assert.ok(errors.some(e => /gleich/.test(e)), errors.join('|'));
  });

  test('Einstellungen: Archiv im Quellordner', () => {
    const errors = m.validateArchiveSettings({ sourceRoot: 'Z:\\KMG\\Programme', archiveRoot: 'Z:\\KMG\\Programme\\_Archiv' });
    assert.ok(errors.some(e => /Archivordner darf nicht im Quellordner liegen/.test(e)), errors.join('|'));
  });

  test('Einstellungen: Quellordner im Archiv ist erlaubt, Nachbarordner auch', () => {
    assert.deepEqual(m.validateArchiveSettings({ sourceRoot: 'Z:\\KMG\\Programme', archiveRoot: 'Z:\\KMG\\Archiv' }), []);
    assert.deepEqual(m.validateArchiveSettings({ sourceRoot: 'Z:\\KMG\\Prog', archiveRoot: 'Z:\\KMG\\Programme' }), []);
  });

  test('Skript: Schalter, sichere Pfadbefehle, Protokoll, kein Überschreiben', () => {
    const s = build([{ customerFolder: 'KD00000 FIRMA', programFolder: 'HG_TEIL-0001_A_Halter' }]);
    assert.match(s, /param\(\[switch\]\$Probe\)/);
    assert.match(s, /Move-Item -LiteralPath/);
    assert.match(s, /Test-Path -LiteralPath/);
    assert.match(s, /\$PSScriptRoot/);
    assert.match(s, /altbestand-archiv_/);
    assert.match(s, /-ExecutionPolicy Bypass -File altbestand-archiv\.ps1 -Probe/);
    assert.match(s, /08\.11\.2026 14:00/);
    assert.doesNotMatch(s, /Move-Item[^\n]*-Force/);
    assert.match(s, /\$Quelle = 'Z:\\KMG\\Programme'/);
    assert.match(s, /\$Archiv = 'Z:\\KMG\\Archiv'/);
  });

  test('Skript: Apostroph verdoppelt, Klammern und Umlaute unverändert', () => {
    const s = build([{ customerFolder: 'KD00000 FIRMA', programFolder: "HG_TEIL-0001_A_Halter [alt] O'Neil Ü" }]);
    assert.ok(s.includes("'HG_TEIL-0001_A_Halter [alt] O''Neil Ü'"), s);
  });

  test('Skript: typografischer Apostroph wird wie ein normaler verdoppelt', () => {
    const s = build([{ customerFolder: 'KD00000 FIRMA', programFolder: 'HG_TEIL-0001_O’Neil' }]);
    assert.ok(s.includes("'HG_TEIL-0001_O’’Neil'"), s);
  });

  test('Skript: Einträge in übergebener Reihenfolge', () => {
    const s = build([
      { customerFolder: 'KD00002 FIRMA', programFolder: 'HG_B' },
      { customerFolder: 'KD00001 FIRMA', programFolder: 'HG_A' },
    ]);
    const a = s.indexOf("Programm = 'HG_B'");
    const b = s.indexOf("Programm = 'HG_A'");
    assert.ok(a > 0 && b > a, 'Reihenfolge');
    assert.equal((s.match(/@\{ Kunde = /g) || []).length, 2);
  });

  test('Skript: Laufwerkswurzel behält den Backslash', () => {
    const s = m.buildArchiveScript({ sourceRoot: 'Y:\\', archiveRoot: 'Z:\\Archiv\\', entries: [], createdAt: 'x' });
    assert.ok(s.includes("$Quelle = 'Y:\\'"), s.split('\n').find(l => l.startsWith('$Quelle')));
    assert.ok(s.includes("$Archiv = 'Z:\\Archiv'"));
  });

  test('Skript: Pfade mit \\ statt /', () => {
    const s = build([{ customerFolder: 'KD00000 FIRMA', programFolder: 'HG_X' }]);
    const code = s.split('\n').filter(l => !l.trim().startsWith('#'));
    assert.ok(!code.some(l => /[A-Za-z]:\/|\$Quelle\/|\$Archiv\//.test(l)), 'kein / in Pfaden');
  });

  console.log(`\n${passed} Tests bestanden`);
})();
