# Changelog-Anzeige Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `CHANGELOG.md` im MDS als Seite „Was ist neu“ anzeigen – Anwender-Fassung für alle, technische Details für Admins, „Neu“-Badge pro Benutzer.

**Architecture:** Das Backend liest `CHANGELOG.md` (per Volume in den Container eingebunden), parst sie zu JSON und filtert nach Rolle (`GET /api/changelog`). `users.last_seen_version` speichert pro Benutzer die zuletzt gesehene Version (`PUT /api/changelog/seen`). Das Frontend zeigt die Seite `/changelog` und ein Badge an der Versionsnummer in der Sidebar.

**Tech Stack:** Node.js/Express, PostgreSQL (Raw SQL, node-pg-migrate), React 19, Zustand, React Router v7, TailwindCSS v3.

**Spec:** `docs/superpowers/specs/2026-10-06-changelog-anzeige-design.md`

**Branch:** `feat/changelog-anzeige` (existiert, Spec ist committet)

---

## File Structure

| Datei | Aktion | Verantwortung |
|---|---|---|
| `backend/src/services/changelogService.js` | Create | `parseChangelog` (rein), `getChangelog` (Datei + Cache), `filterForUser` |
| `backend/tests/test-changelog-parser.js` | Create | Parser-Tests mit `node:assert`, ohne Framework |
| `backend/migrations/1737000110000_add-last-seen-version-to-users.js` | Create | Spalte `users.last_seen_version` |
| `backend/src/controllers/changelogController.js` | Create | `getChangelog`, `markSeen` |
| `backend/src/routes/changelogRoutes.js` | Create | Routen hinter `authenticateToken` |
| `backend/src/server.js` | Modify | Route registrieren |
| `backend/src/controllers/authController.js` | Modify | `last_seen_version` in Login + `/me` |
| `compose.yaml` | Modify | Volume `./CHANGELOG.md:/app/CHANGELOG.md:ro` |
| `backend/http/changelog.http` | Create | REST-Client-Szenarien |
| `frontend/src/stores/changelogStore.js` | Create | `fetchChangelog`, `markSeen` |
| `frontend/src/pages/ChangelogPage.jsx` | Create | Seite „Was ist neu“ |
| `frontend/src/App.jsx` | Modify | Route `/changelog` |
| `frontend/src/components/Sidebar.jsx` | Modify | Versions-Link + Badge |
| `CHANGELOG.md` | Modify | `### Für Anwender` für 2.3.0–2.5.1, `[Unreleased]`-Eintrag |
| `CLAUDE.md` | Modify | Release-Regel „Für Anwender“ |

**Hinweis Docker:** Ein Single-File-Bind-Mount zeigt nach `git pull` (neue Datei = neuer Inode) den alten Inhalt, bis der Container neu erstellt wird. Da jedes Release `backend/package.json` ändert, wird das Backend-Image neu gebaut und der Container bei `docker compose up -d` neu erstellt – damit ist der CHANGELOG nach jedem Release aktuell. Kein zusätzlicher Code nötig.

---

### Task 1: Changelog-Parser (TDD)

**Files:**
- Create: `backend/tests/test-changelog-parser.js`
- Create: `backend/src/services/changelogService.js`

- [ ] **Step 1: Failing Test schreiben**

`backend/tests/test-changelog-parser.js`:

```js
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
```

- [ ] **Step 2: Test laufen lassen – muss fehlschlagen**

Run: `node backend/tests/test-changelog-parser.js`
Expected: FAIL mit `Cannot find module '../src/services/changelogService'`

- [ ] **Step 3: Service implementieren**

`backend/src/services/changelogService.js`:

```js
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
```

- [ ] **Step 4: Tests laufen lassen – müssen bestehen**

Run: `node backend/tests/test-changelog-parser.js`
Expected: alle ✓, Ausgabe `9 Tests bestanden`, Exit-Code 0

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/changelogService.js backend/tests/test-changelog-parser.js
git commit -m "feat(changelog): Parser-Service für CHANGELOG.md mit Tests"
```

---

### Task 2: Migration `users.last_seen_version`

**Files:**
- Create: `backend/migrations/1737000110000_add-last-seen-version-to-users.js`

- [ ] **Step 1: Migration schreiben**

```js
/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('users', {
    last_seen_version: {
      type: 'varchar(20)',
      notNull: false,
      comment: 'Zuletzt im Changelog ("Was ist neu") gesehene App-Version',
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('users', 'last_seen_version');
};
```

- [ ] **Step 2: Migration lokal ausführen**

Run (in `backend/`): `npm run migrate:up`
Expected: `Migrating files: - 1737000110000_add-last-seen-version-to-users` und `Migrations complete!`

- [ ] **Step 3: Down/Up prüfen**

Run: `npm run migrate:down` und danach wieder `npm run migrate:up`
Expected: beide ohne Fehler

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/1737000110000_add-last-seen-version-to-users.js
git commit -m "feat(changelog): Migration users.last_seen_version"
```

---

### Task 3: Controller, Routen, Registrierung, Volume

**Files:**
- Create: `backend/src/controllers/changelogController.js`
- Create: `backend/src/routes/changelogRoutes.js`
- Modify: `backend/src/server.js` (Route-Import bei den anderen `require('./routes/…')`, `app.use` direkt nach `app.use('/api/customers', customersRoutes);`)
- Modify: `compose.yaml` (Service `backend`, `volumes`)

- [ ] **Step 1: Controller**

`backend/src/controllers/changelogController.js`:

```js
/**
 * Changelog Controller
 *
 * Routes:
 * - GET /api/changelog       - Versionen (Admin: alle Abschnitte, sonst nur "Für Anwender")
 * - PUT /api/changelog/seen  - aktuelle Version als gesehen markieren
 */

const pool = require('../config/db');
const { version: APP_VERSION } = require('../../package.json');
const changelogService = require('../services/changelogService');

async function isAdmin(userId) {
  const result = await pool.query(
    `SELECT 1
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1 AND LOWER(r.name) = 'admin'
      LIMIT 1`,
    [userId]
  );
  return result.rows.length > 0;
}

async function getChangelog(req, res) {
  try {
    const [admin, seenResult] = await Promise.all([
      isAdmin(req.user.id),
      pool.query('SELECT last_seen_version FROM users WHERE id = $1', [req.user.id]),
    ]);

    const versions = changelogService.getChangelog();

    res.json({
      available: versions !== null,
      currentVersion: APP_VERSION,
      lastSeenVersion: seenResult.rows[0]?.last_seen_version || null,
      isAdmin: admin,
      versions: versions === null ? [] : (admin ? versions : changelogService.filterForUser(versions)),
    });
  } catch (error) {
    console.error('Error fetching changelog:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Änderungsprotokolls' });
  }
}

async function markSeen(req, res) {
  try {
    const result = await pool.query(
      'UPDATE users SET last_seen_version = $1 WHERE id = $2 RETURNING last_seen_version',
      [APP_VERSION, req.user.id]
    );
    res.json({ lastSeenVersion: result.rows[0]?.last_seen_version || null });
  } catch (error) {
    console.error('Error marking changelog as seen:', error);
    res.status(500).json({ error: 'Fehler beim Speichern' });
  }
}

module.exports = {
  getChangelog,
  markSeen,
};
```

- [ ] **Step 2: Routen**

`backend/src/routes/changelogRoutes.js`:

```js
/**
 * Changelog Routes ("Was ist neu")
 */

const express = require('express');
const router = express.Router();
const changelogController = require('../controllers/changelogController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

/**
 * @route   GET /api/changelog
 * @desc    Changelog-Versionen, nach Rolle gefiltert
 * @access  Private
 */
router.get('/', changelogController.getChangelog);

/**
 * @route   PUT /api/changelog/seen
 * @desc    Aktuelle App-Version als gesehen markieren
 * @access  Private
 */
router.put('/seen', changelogController.markSeen);

module.exports = router;
```

- [ ] **Step 3: In `server.js` registrieren**

Nach `const customersRoutes = require('./routes/customersRoutes');` einfügen:

```js
const changelogRoutes = require('./routes/changelogRoutes');
```

Nach `app.use('/api/customers', customersRoutes);` einfügen:

```js
app.use('/api/changelog', changelogRoutes);
```

- [ ] **Step 4: Volume in `compose.yaml`**

Im Service `backend` unter `volumes:` ergänzen:

```yaml
    volumes:
      - /srv/mds/uploads:/app/uploads
      - /srv/mds/backups:/app/backups:ro
      - ./CHANGELOG.md:/app/CHANGELOG.md:ro
```

- [ ] **Step 5: Syntax + Start prüfen**

Run: `node --check backend/src/server.js && node --check backend/src/controllers/changelogController.js`
Expected: keine Ausgabe
Dann Backend lokal starten (`npm run dev` in `backend/`) – Expected: Startup-Log ohne Fehler.

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/changelogController.js backend/src/routes/changelogRoutes.js backend/src/server.js compose.yaml
git commit -m "feat(changelog): GET /api/changelog und PUT /api/changelog/seen"
```

---

### Task 4: `last_seen_version` in Login und `/api/auth/me`

**Files:**
- Modify: `backend/src/controllers/authController.js` (Login-Response ca. Zeile 182, `getProfile` SELECT ca. Zeile 213–229)

- [ ] **Step 1: Login-Response**

Im `user`-Objekt der Login-Antwort nach `full_name: full_name,` ergänzen (Login nutzt `SELECT *`, Spalte ist vorhanden):

```js
        last_seen_version: user.last_seen_version || null,
```

- [ ] **Step 2: `getProfile`**

Im SELECT nach `u.last_login,` ergänzen:

```sql
        u.last_seen_version,
```

und die GROUP-BY-Zeile ersetzen durch:

```sql
      GROUP BY u.id, u.username, u.email, u.first_name, u.last_name, u.created_at, u.last_login, u.last_seen_version
```

- [ ] **Step 3: Prüfen**

Run: `node --check backend/src/controllers/authController.js`
Expected: keine Ausgabe

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/authController.js
git commit -m "feat(changelog): last_seen_version in Login und /api/auth/me"
```

---

### Task 5: REST-Client-Tests

**Files:**
- Create: `backend/http/changelog.http`

- [ ] **Step 1: Datei anlegen**

```http
### Changelog API Tests ("Was ist neu")
### Requires REST Client extension in VS Code
### TOKEN = Admin-Token, USER_TOKEN = Token eines Nicht-Admins (z. B. operator)

@baseUrl = http://localhost:5000/api
@token = {{$dotenv TOKEN}}
@userToken = {{$dotenv USER_TOKEN}}

### 1. Admin: alle Versionen, alle Abschnitte (isAdmin: true, Changed/Fixed sichtbar)
GET {{baseUrl}}/changelog
Authorization: Bearer {{token}}

### 2. Nicht-Admin: nur "Für Anwender", Versionen ohne Anwender-Abschnitt fehlen (isAdmin: false)
GET {{baseUrl}}/changelog
Authorization: Bearer {{userToken}}

### 3. Ohne Token → 401
GET {{baseUrl}}/changelog

### 4. Ungültiger Token → 401
GET {{baseUrl}}/changelog
Authorization: Bearer invalid.token.value

### 5. Als gesehen markieren → { lastSeenVersion: "<APP_VERSION>" }
PUT {{baseUrl}}/changelog/seen
Authorization: Bearer {{token}}

### 6. Danach: lastSeenVersion == currentVersion
GET {{baseUrl}}/changelog
Authorization: Bearer {{token}}

### 7. /me enthält last_seen_version
GET {{baseUrl}}/auth/me
Authorization: Bearer {{token}}

### 8. /seen ohne Token → 401
PUT {{baseUrl}}/changelog/seen

### 9. Nicht-Admin markiert gesehen (eigener User)
PUT {{baseUrl}}/changelog/seen
Authorization: Bearer {{userToken}}

### 10. Datei fehlt: Backend mit CHANGELOG_PATH=/nicht/da und ohne Fallback-Datei starten
### → 200, available: false, versions: []
GET {{baseUrl}}/changelog
Authorization: Bearer {{token}}
```

- [ ] **Step 2: Szenarien 1–9 ausführen** (lokales Backend + DB). Expected: wie in den Kommentaren. Szenario 10 manuell: `CHANGELOG.md` kurz umbenennen, Request → `available: false`, Datei zurückbenennen.

- [ ] **Step 3: Commit**

```bash
git add backend/http/changelog.http
git commit -m "test(changelog): REST-Client-Szenarien"
```

---

### Task 6: Frontend-Store

**Files:**
- Create: `frontend/src/stores/changelogStore.js`

- [ ] **Step 1: Store anlegen**

```js
import { create } from 'zustand';
import axios from '../utils/axios';
import { useAuthStore } from './authStore';

export const useChangelogStore = create((set) => ({
  // State
  data: null, // { available, currentVersion, lastSeenVersion, isAdmin, versions }
  loading: false,
  error: null,

  fetchChangelog: async () => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get('/api/changelog');
      set({ data: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({
        loading: false,
        error: error.response?.data?.error || 'Fehler beim Laden des Änderungsprotokolls',
      });
      return null;
    }
  },

  // Aktuelle Version als gesehen markieren und User im authStore aktualisieren
  markSeen: async () => {
    try {
      const response = await axios.put('/api/changelog/seen');
      const { user } = useAuthStore.getState();
      if (user) {
        const updatedUser = { ...user, last_seen_version: response.data.lastSeenVersion };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        useAuthStore.setState({ user: updatedUser });
      }
    } catch (error) {
      console.error('Changelog: Markieren als gesehen fehlgeschlagen', error);
    }
  },
}));
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/stores/changelogStore.js
git commit -m "feat(changelog): Zustand-Store"
```

---

### Task 7: Seite „Was ist neu“ + Route

**Files:**
- Create: `frontend/src/pages/ChangelogPage.jsx`
- Modify: `frontend/src/App.jsx` (Import bei den Page-Imports, Route nach dem `/customers/:id`-Block)

- [ ] **Step 1: Seite anlegen**

`frontend/src/pages/ChangelogPage.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChangelogStore } from '../stores/changelogStore';

const USER_SECTION = 'Für Anwender';

const SECTION_LABELS = {
  Added: 'Neu',
  Changed: 'Geändert',
  Fixed: 'Behoben',
  Removed: 'Entfernt',
  Deprecated: 'Veraltet',
  Security: 'Sicherheit',
};

// Nur **fett** und `code` – kein HTML
function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function ItemList({ items }) {
  return (
    <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
      {items.map((item, i) => (
        <li key={i} className={`flex gap-2 ${item.level > 0 ? 'ml-5' : ''}`}>
          <span className="text-gray-400 dark:text-gray-500 select-none">•</span>
          <span>{renderInline(item.text)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ChangelogPage() {
  const navigate = useNavigate();
  const { data, loading, error, fetchChangelog, markSeen } = useChangelogStore();
  const [showTechnical, setShowTechnical] = useState(false);

  useEffect(() => {
    fetchChangelog().then((result) => {
      if (result?.available) markSeen();
    });
  }, [fetchChangelog, markSeen]);

  const versions = data?.versions || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex-shrink-0"
            title="Zurück"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Was ist neu</h1>
            {data?.currentVersion && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Aktuelle Version: <span className="font-mono">v{data.currentVersion}</span>
              </p>
            )}
          </div>
        </div>

        {data?.isAdmin && (
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none flex-shrink-0">
            <input
              type="checkbox"
              checked={showTechnical}
              onChange={(e) => setShowTechnical(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            Technische Details anzeigen
          </label>
        )}
      </div>

      {/* Inhalt */}
      {loading && !data ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">{error}</div>
      ) : data && !data.available ? (
        <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 text-sm">
          Änderungsprotokoll derzeit nicht verfügbar.
        </div>
      ) : versions.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Keine Einträge vorhanden.</p>
      ) : (
        <div className="space-y-4">
          {versions.map((v) => {
            const userSection = v.sections.find((s) => s.name === USER_SECTION);
            const technicalSections = v.sections.filter((s) => s.name !== USER_SECTION && s.items.length > 0);
            const isCurrent = v.version === data.currentVersion;
            const hasVisibleContent = userSection || (showTechnical && technicalSections.length > 0);

            // Admin ohne Toggle: Versionen ohne Anwender-Abschnitt ausblenden
            if (!hasVisibleContent) return null;

            return (
              <div
                key={v.version}
                className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-5"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    <span className="font-mono">v{v.version}</span>
                    {v.title && <span className="font-normal text-gray-600 dark:text-gray-300"> – {v.title}</span>}
                  </h2>
                  {isCurrent && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                      Aktuell
                    </span>
                  )}
                  <span className="text-sm text-gray-500 dark:text-gray-400">{v.date}</span>
                </div>

                {userSection && <ItemList items={userSection.items} />}

                {showTechnical && technicalSections.length > 0 && (
                  <div className={`space-y-3 ${userSection ? 'mt-4 pt-4 border-t border-gray-200 dark:border-gray-700' : ''}`}>
                    {technicalSections.map((s) => (
                      <div key={s.name}>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                          {SECTION_LABELS[s.name] || s.name}
                        </h3>
                        <ItemList items={s.items} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Route in `App.jsx`**

Bei den Page-Imports ergänzen:

```jsx
import ChangelogPage from './pages/ChangelogPage';
```

Nach dem Route-Block für `/customers/:id` einfügen (gleiche Einrückung wie die Nachbarn):

```jsx
		  <Route 
		    path="/changelog" 
		    element={
		  	<ChangelogPage />
			} 
		   />
```

- [ ] **Step 3: Build prüfen**

Run (in `frontend/`): `npx vite build`
Expected: `✓ built in …`, keine Fehler

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ChangelogPage.jsx frontend/src/App.jsx
git commit -m "feat(changelog): Seite 'Was ist neu' unter /changelog"
```

---

### Task 8: Sidebar – Versions-Link + Badge

**Files:**
- Modify: `frontend/src/components/Sidebar.jsx` (Komponente `Sidebar` ab Zeile 278; Collapse-Button ca. Zeile 586; Versions-Block ca. Zeile 596–601)

- [ ] **Step 1: Badge-Bedingung**

In `Sidebar` nach `const { user } = useAuthStore();` ergänzen:

```jsx
  const appVersion = import.meta.env.VITE_APP_VERSION;
  const hasUnseenChangelog = !!user && user.last_seen_version !== appVersion;
```

- [ ] **Step 2: Punkt am Collapse-Button (eingeklappt)**

Collapse-Button: in `className` `relative` ergänzen und vor `</button>` einfügen:

```jsx
              {collapsed && hasUnseenChangelog && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" title="Neue Version – Was ist neu" />
              )}
```

Resultierender Button:

```jsx
            <button
              onClick={onToggleCollapse}
              className="relative hidden lg:flex items-center gap-2 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={collapsed ? 'Erweitern' : 'Minimieren'}
            >
              {collapsed ? <Icons.ChevronDoubleRight /> : <Icons.ChevronDoubleLeft />}
              {!collapsed && <span className="text-xs">Minimieren</span>}
              {collapsed && hasUnseenChangelog && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" title="Neue Version – Was ist neu" />
              )}
            </button>
```

- [ ] **Step 3: Versions-Block ersetzen**

Ersetzen:

```jsx
          {/* Version */}
          {!collapsed && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-1.5 border-t border-gray-200 dark:border-gray-700">
              MDS v{import.meta.env.VITE_APP_VERSION}
            </p>
          )}
```

durch:

```jsx
          {/* Version → Was ist neu */}
          {!collapsed && (
            <Link
              to="/changelog"
              onClick={onClose}
              title="Was ist neu?"
              className="flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 py-1.5 border-t border-gray-200 dark:border-gray-700 transition-colors"
            >
              <span>MDS v{appVersion}</span>
              {hasUnseenChangelog && (
                <span className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Neu
                </span>
              )}
            </Link>
          )}
```

- [ ] **Step 4: Build prüfen**

Run (in `frontend/`): `npx vite build`
Expected: `✓ built in …`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Sidebar.jsx
git commit -m "feat(changelog): Versionsnummer in Sidebar verlinkt, Neu-Badge"
```

---

### Task 9: Inhalte – „Für Anwender“ 2.3.0–2.5.1, CLAUDE.md

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `CLAUDE.md` (Abschnitt „Versionierung (SemVer)“)

- [ ] **Step 1: `[Unreleased]` füllen**

```markdown
## [Unreleased]

### Für Anwender
- Neu: Ein Klick auf die Versionsnummer unten in der Seitenleiste zeigt „Was ist neu“ – eine Übersicht der Änderungen jeder Version.
- Nach einem Update erscheint an der Versionsnummer ein „Neu“-Hinweis, bis die Übersicht geöffnet wurde.

### Added
- Seite `/changelog` („Was ist neu“): Anwender-Fassung für alle, technische Abschnitte für Admins (Toggle)
- `GET /api/changelog`, `PUT /api/changelog/seen`; Parser-Service für `CHANGELOG.md` (Volume im Backend-Container)
- Migration `users.last_seen_version`, Neu-Badge in der Sidebar pro Benutzer
```

- [ ] **Step 2: `### Für Anwender` als ersten Abschnitt in jeder Version 2.3.0–2.5.1 einfügen**

Direkt unter der jeweiligen `## [X.Y.Z]`-Zeile (nach der Leerzeile):

- **2.5.1:** `- Die aktuelle Programmversion steht jetzt unten in der Seitenleiste.`
- **2.5.0:**
  - `- Vorrichtungen, Spannmittel, Maschinen, Kunden und Bauteile haben jetzt einheitliche Listen mit Kennzahlen, Schnellfilter, Kachel-/Tabellenansicht und Seitenweise-Anzeige.`
  - `- Kunden und Bauteile: Dokumente können hochgeladen und nach Typ sortiert werden.`
  - `- Maschinen: frei definierbare Zusatzfelder.`
  - `- Neue Vorrichtungen bekommen ihre Nummer automatisch.`
  - `- Wartung: Wartungstypen auf Deutsch und mit eigenem Symbol.`
- **2.4.5:** `- Keine sichtbaren Änderungen (internes Entwicklungs-Setup).`
- **2.4.4:**
  - `- Bilder und Downloads in Bauteilen, Programmen, Wartung und Verbrauchsmaterial werden zuverlässiger angezeigt.`
  - `- Wartungsaufgaben werden automatisch aus den Wartungsplänen erzeugt.`
- **2.4.3:** `- Messmittel: mehrere Einträge auf einmal bearbeiten, Seitenweise-Anzeige, Tabellenansicht und erweiterte Etiketten.`
- **2.4.2:**
  - `- Urlaub: Detailansicht pro Mitarbeiter, PDF-Exporte und genauere Aufschlüsselung im Kalender.`
  - `- Zeitnachweis: Saldo aus dem Vormonat wird korrekt übernommen, nicht ausgestempelte Tage werden zur richtigen Uhrzeit geschlossen.`
- **2.4.1:**
  - `- Stempeln am Terminal per NFC-Karte oder PIN; mehrere Karten pro Mitarbeiter möglich.`
  - `- Saldo-Berechnung und Lohnnachweis korrigiert.`
- **2.4.0:**
  - `- Neue Zeiterfassung: Kommen, Gehen und Pausen werden erfasst, offene Tage automatisch geprüft.`
  - `- Lohnnachweis als PDF.`
- **2.3.3:** `- Messmittel: Etiketten drucken (mit Vorlagen) und per Barcode-Scanner aufrufen.`
- **2.3.2:** `- Neuer Positionsrechner für die Zerobot-Beladeroboter.`
- **2.3.1:** `- Urlaub kann jetzt beantragt und von Vorgesetzten genehmigt oder abgelehnt werden.`
- **2.3.0:** `- Neue Urlaubsplanung mit Kalender, Feiertagen und Warnung bei Überschneidungen.`

Format jeweils:

```markdown
## [2.3.2] - 2026-01-28 - Zerobot (PR #37)

### Für Anwender
- Neuer Positionsrechner für die Zerobot-Beladeroboter.

### Added
…
```

- [ ] **Step 3: Parser-Test erneut laufen lassen**

Run: `node backend/tests/test-changelog-parser.js`
Expected: alle ✓

- [ ] **Step 4: CLAUDE.md – Versionierung ergänzen**

Im Abschnitt „Versionierung (SemVer)“ nach der Zeile „Jeder PR: Eintrag unter `## [Unreleased]` …“ einfügen:

```markdown
- Jede Version hat als **ersten** Abschnitt `### Für Anwender` (2–5 verständliche Sätze, keine Datei-/Endpoint-Namen) – wird im MDS unter „Was ist neu“ allen Mitarbeitern angezeigt. Technische Abschnitte sehen nur Admins.
```

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md CLAUDE.md
git commit -m "docs(changelog): Anwender-Abschnitte 2.3.0–2.5.1, Release-Regel in CLAUDE.md"
```

---

### Task 10: End-to-End-Prüfung

- [ ] **Step 1:** `node backend/tests/test-changelog-parser.js` → alle ✓
- [ ] **Step 2:** `npx vite build` in `frontend/` → erfolgreich
- [ ] **Step 3:** Backend + Frontend lokal starten, als Admin einloggen:
  - Sidebar zeigt „MDS v2.5.1 • Neu“ (falls `last_seen_version` leer)
  - Klick → `/changelog`: Versionen 2.5.1 … 2.3.0 sichtbar, Toggle „Technische Details anzeigen“ vorhanden; Toggle an → Abschnitte Neu/Geändert/Behoben/Entfernt und ältere Versionen ohne Anwender-Abschnitt erscheinen
  - Zurück → Badge ist weg; nach Reload weiterhin weg
  - Sidebar einklappen → kein Punkt (gesehen); `UPDATE users SET last_seen_version = NULL WHERE username = 'admin'` + Reload → Punkt am Minimieren-Button sichtbar
- [ ] **Step 4:** Als Nicht-Admin: kein Toggle, nur Anwender-Texte
- [ ] **Step 5:** Dark Mode und mobile Breite prüfen
