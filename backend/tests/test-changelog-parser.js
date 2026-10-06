/**
 * Tests für changelogService.parseChangelog / filterForUser
 * Ausführen: node backend/tests/test-changelog-parser.js
 */
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { parseChangelog, filterForUser } = require('../src/services/changelogService');

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

const SAMPLE = [
  '# Changelog',
  '',
  '> **Hinweis:** Rekonstruiert.',
  '',
  '---',
  '',
  '## [Unreleased]',
  '',
  '### Added',
  '- noch nicht released',
  '',
  '---',
  '',
  '## [2.5.1] - 2026-10-06 - Versionierung & Aufräumen',
  '',
  '### Für Anwender',
  '- Version steht in der Seitenleiste.',
  '',
  '### Changed',
  '- `package.json` ist **einzige** Quelle',
  '  - Unterpunkt eingerückt',
  '',
  '---',
  '',
  '## [2.4.2] - 2026-03-01 – 2026-04-01 - Zeiterfassung & Urlaub (PRs #49–#54)',
  '',
  '### Fixed',
  '- Zeitzonen-Fehler',
  '',
  '## [1.0.0] - 2025-11-03',
  '',
  '### Added',
  '- Basis',
].join('\n');

console.log('changelogService.parseChangelog');

test('ignoriert Hinweisblock und [Unreleased]', () => {
  const versions = parseChangelog(SAMPLE);
  assert.deepEqual(versions.map(v => v.version), ['2.5.1', '2.4.2', '1.0.0']);
});

test('liest Datum und Titel', () => {
  const [v] = parseChangelog(SAMPLE);
  assert.equal(v.date, '2026-10-06');
  assert.equal(v.title, 'Versionierung & Aufräumen');
});

test('Datumsbereich mit Gedankenstrich bleibt im Datum', () => {
  const v = parseChangelog(SAMPLE)[1];
  assert.equal(v.date, '2026-03-01 – 2026-04-01');
  assert.equal(v.title, 'Zeiterfassung & Urlaub (PRs #49–#54)');
});

test('fehlender Titel ergibt leeren String', () => {
  const v = parseChangelog(SAMPLE)[2];
  assert.equal(v.date, '2025-11-03');
  assert.equal(v.title, '');
});

test('Abschnitte und Einträge inkl. Einrückung', () => {
  const [v] = parseChangelog(SAMPLE);
  assert.deepEqual(v.sections.map(s => s.name), ['Für Anwender', 'Changed']);
  assert.deepEqual(v.sections[1].items, [
    { text: '`package.json` ist **einzige** Quelle', level: 0 },
    { text: 'Unterpunkt eingerückt', level: 1 },
  ]);
});

test('CRLF wird wie LF behandelt', () => {
  const crlf = parseChangelog(SAMPLE.replace(/\n/g, '\r\n'));
  assert.deepEqual(crlf, parseChangelog(SAMPLE));
});

test('leere Eingabe ergibt leeres Array', () => {
  assert.deepEqual(parseChangelog(''), []);
  assert.deepEqual(parseChangelog(null), []);
});

console.log('changelogService.filterForUser');

test('nur "Für Anwender", Versionen ohne entfallen', () => {
  const filtered = filterForUser(parseChangelog(SAMPLE));
  assert.deepEqual(filtered.map(v => v.version), ['2.5.1']);
  assert.deepEqual(filtered[0].sections.map(s => s.name), ['Für Anwender']);
});

console.log('echte CHANGELOG.md');

test('parst ohne Fehler und liefert mindestens 30 Versionen', () => {
  const text = fs.readFileSync(path.join(__dirname, '../../CHANGELOG.md'), 'utf-8');
  const versions = parseChangelog(text);
  assert.ok(versions.length >= 30, `nur ${versions.length} Versionen`);
  assert.ok(versions.every(v => /^\d+\.\d+\.\d+$/.test(v.version)));
});

console.log(`\n${passed} Tests bestanden`);
