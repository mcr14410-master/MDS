/**
 * Tests für die Vorschläge aus dem Ordnernamen (Kunden-Teilenummer, Revision, Bezeichnung)
 * Modul liegt im Frontend (reines ES-Modul): frontend/src/utils/legacyImport/suggest.js
 * Ausführen: node backend/tests/test-legacy-import-suggest.js
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
  const { fieldSuggestions } = await import(pathToFileURL(path.join(__dirname, '../../frontend/src/utils/legacyImport/suggest.js')).href);
  const { parseLegacyTree } = await import(pathToFileURL(path.join(__dirname, '../../frontend/src/utils/legacyImport/parse.js')).href);
  const parse = (folder, programDir) => parseLegacyTree([{ path: `KMG/KD00000 FIRMA/${folder}/${programDir}/P.prg` }]).programs[0];
  const values = (list) => list.map(s => s.value);

  console.log('\nAltbestand-Import: Vorschläge aus dem Ordnernamen');

  test('Anderes Schema: Kürzel am Ende, Revision an der Nummer', () => {
    const s = fieldSuggestions(parse('XXXX-0001a_holder_HG', '01_Messprogramm HG_Index a'));
    assert.deepEqual(values(s.customerPartNumber), ['XXXX-0001a', 'XXXX-0001', 'holder']);
    assert.deepEqual(s.revision, [{ value: 'a', hint: 'Index-Ordner, an der Nummer' }]);
    assert.deepEqual(values(s.name), ['holder']);
  });

  test('Normalfall: Teilenummer zuerst, Revision aus Index und Name, Bezeichnung', () => {
    const s = fieldSuggestions(parse('HG_TEIL-0001_A_Halter Links', '01_Messprogramm HG_Index A'));
    assert.deepEqual(values(s.customerPartNumber), ['TEIL-0001', 'Halter Links']);
    assert.deepEqual(s.revision, [{ value: 'A', hint: 'Index-Ordner, im Ordnernamen' }]);
    assert.deepEqual(values(s.name), ['Halter Links']);
  });

  test('Mehrteilige Bezeichnung: Teile einzeln und zusammen', () => {
    const s = fieldSuggestions(parse('HG_TEIL-0002_Deckel_oben_lang', '01_Messprogramm HG_Index0'));
    assert.deepEqual(values(s.name), ['Deckel', 'oben', 'lang', 'Deckel oben lang']);
    assert.deepEqual(values(s.revision), ['0']);
  });

  test('Keine Dopplungen, nichts Leeres', () => {
    const s = fieldSuggestions(parse('HG_TEIL-0003__Platte_Platte', '01_Messprogramm HG_Index0'));
    for (const list of Object.values(s)) {
      assert.equal(new Set(values(list)).size, list.length);
      assert.ok(list.every(x => x.value.trim() !== ''));
    }
  });

  console.log(`\n${passed} Tests bestanden`);
})();
