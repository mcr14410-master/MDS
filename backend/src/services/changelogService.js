/**
 * Changelog Service
 *
 * Liest CHANGELOG.md und parst sie zu strukturierten Versionen.
 * Format: siehe docs/superpowers/specs/2026-10-06-changelog-anzeige-design.md
 */

const fs = require('fs');
const path = require('path');

const USER_SECTION = 'Für Anwender';
const VERSION_RE = /^## \[(\d+\.\d+\.\d+)\](.*)$/;
const ITEM_RE = /^(\s*)- (.+)$/;

// Container: /app/CHANGELOG.md (Volume), lokal: Repo-Root
const CANDIDATE_PATHS = [
  process.env.CHANGELOG_PATH,
  path.join(__dirname, '../../CHANGELOG.md'),
  path.join(__dirname, '../../../CHANGELOG.md'),
].filter(Boolean);

let cache = { file: null, mtimeMs: 0, versions: null };

/**
 * Parst den CHANGELOG-Text.
 * @returns {Array<{version, date, title, sections: Array<{name, items: Array<{text, level}>}>}>}
 */
function parseChangelog(text) {
  if (!text) return [];

  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const versions = [];
  let current = null;
  let section = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith('## ')) {
      const match = line.match(VERSION_RE);
      section = null;
      if (!match) {
        // z. B. [Unreleased] – bis zur nächsten Version ignorieren
        current = null;
        continue;
      }
      const parts = match[2].replace(/^\s*-\s*/, '').split(' - ');
      const date = (parts.shift() || '').trim();
      current = { version: match[1], date, title: parts.join(' - ').trim(), sections: [] };
      versions.push(current);
      continue;
    }

    if (!current) continue;

    if (line.startsWith('### ')) {
      section = { name: line.slice(4).trim(), items: [] };
      current.sections.push(section);
      continue;
    }

    const item = line.match(ITEM_RE);
    if (item && section) {
      section.items.push({ text: item[2].trim(), level: item[1].length >= 2 ? 1 : 0 });
    }
  }

  return versions;
}

/**
 * Nur den Abschnitt "Für Anwender" behalten; Versionen ohne diesen Abschnitt entfallen.
 */
function filterForUser(versions) {
  return versions
    .map(v => ({ ...v, sections: v.sections.filter(s => s.name === USER_SECTION && s.items.length > 0) }))
    .filter(v => v.sections.length > 0);
}

function resolveChangelogPath() {
  return CANDIDATE_PATHS.find(p => fs.existsSync(p)) || null;
}

/**
 * Liest und parst CHANGELOG.md (gecacht nach mtime).
 * @returns {Array|null} null wenn Datei fehlt oder nicht lesbar ist
 */
function getChangelog() {
  const file = resolveChangelogPath();
  if (!file) return null;

  try {
    const { mtimeMs } = fs.statSync(file);
    if (cache.file === file && cache.mtimeMs === mtimeMs) return cache.versions;

    const versions = parseChangelog(fs.readFileSync(file, 'utf-8'));
    cache = { file, mtimeMs, versions };
    return versions;
  } catch (error) {
    console.error('[changelog] CHANGELOG.md nicht lesbar:', error.message);
    return null;
  }
}

module.exports = {
  USER_SECTION,
  parseChangelog,
  filterForUser,
  getChangelog,
};
