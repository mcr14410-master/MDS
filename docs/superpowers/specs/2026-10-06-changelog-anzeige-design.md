# Changelog-Anzeige im MDS („Was ist neu“)

**Datum:** 2026-10-06
**Status:** Entwurf – zur Freigabe
**Version-Ziel:** nächstes Minor-Release (2.6.0)

## Ziel

Der gepflegte `CHANGELOG.md` wird im MDS angezeigt:

- **Alle Mitarbeiter** sehen pro Version eine verständliche Kurzfassung („Für Anwender“).
- **Admins** sehen zusätzlich die technischen Abschnitte (Added/Changed/Fixed/Removed).
- Nach einem Update weist ein dezentes Badge an der Versionsnummer in der Sidebar auf Neuerungen hin – pro Benutzer, gespeichert in der Datenbank.

Nicht im Umfang: Popup-Modal, Bearbeiten der Texte im MDS, Volltextsuche.

## 1. Format im CHANGELOG

Jede Version bekommt als **ersten** Abschnitt `### Für Anwender`:

```markdown
## [2.5.1] - 2026-10-06 - Versionierung & Aufräumen

### Für Anwender
- Die aktuelle Programmversion steht jetzt unten in der Seitenleiste.

### Changed
- …technische Einträge…
```

Regeln für den Parser:

- Versions-Kopf: `## [X.Y.Z] - <Datum> - <Titel>`. Datum ist der Text zwischen erstem und zweitem ` - ` (darf ein Bereich sein, z. B. `2026-03-01 – 2026-04-01`), Titel ist der Rest. Fehlt der Titel, ist `title` leer.
- Abschnitte: `### <Name>`. Einträge: Zeilen, die mit `- ` beginnen. Eingerückte Fortsetzungszeilen (`  - …`) werden als eigene Einträge mit `level: 1` übernommen.
- `## [Unreleased]`, alles vor der ersten Version (Hinweisblock) und Trennlinien `---` werden ignoriert.
- CRLF und LF werden gleich behandelt.
- Inline-Formatierung im Frontend: nur `**fett**` und `` `code` ``. Kein HTML, kein `dangerouslySetInnerHTML`.

## 2. Backend

### Datei-Zugriff
- `compose.yaml`, Service `backend`: Volume `./CHANGELOG.md:/app/CHANGELOG.md:ro`.
- Pfad-Auflösung im Service: zuerst `path.join(__dirname, '../../CHANGELOG.md')` (Container: `/app/CHANGELOG.md`), Fallback `path.join(__dirname, '../../../CHANGELOG.md')` (lokal: Repo-Root). Optional überschreibbar per `CHANGELOG_PATH`.

### `backend/src/services/changelogService.js`
- `parseChangelog(text)` → `[{ version, date, title, sections: [{ name, items: [{ text, level }] }] }]`, neueste zuerst (Reihenfolge wie in der Datei).
- `getChangelog()` → liest Datei, cacht das Ergebnis anhand `mtimeMs` (Deploy ohne Neustart liefert neuen Stand). Datei fehlt / Lesefehler → `null`.
- Reine Funktion `parseChangelog` ist ohne Datei/DB testbar.

### Endpoints (`backend/src/routes/changelogRoutes.js`, `controllers/changelogController.js`)
Alle hinter `{ authenticateToken }`.

**`GET /api/changelog`**
```json
{
  "available": true,
  "currentVersion": "2.6.0",
  "lastSeenVersion": "2.5.1",
  "isAdmin": false,
  "versions": [ { "version": "2.6.0", "date": "…", "title": "…", "sections": [ … ] } ]
}
```
- Admin = User hat Rolle `admin` (gleiche Logik wie `RolesPage`), per DB-Abfrage über `user_roles`/`roles`.
- Nicht-Admin: pro Version nur der Abschnitt `Für Anwender`; Versionen ohne diesen Abschnitt entfallen.
- Admin: alle Versionen, alle Abschnitte.
- Datei fehlt/unlesbar: `200` mit `available: false`, `versions: []`.

**`PUT /api/changelog/seen`**
- Setzt `users.last_seen_version = APP_VERSION` für den aktuellen User, antwortet `{ lastSeenVersion }`.

### Migration
- `users.last_seen_version VARCHAR(20) NULL` (node-pg-migrate, mit `down`).

### `/api/auth/me`
- `getProfile` liefert zusätzlich `last_seen_version` (Spalte in SELECT + GROUP BY).

### Registrierung
- `server.js`: `app.use('/api/changelog', changelogRoutes)` – vor generischen `/api`-Catch-All-Routen.

## 3. Frontend

### Store `stores/changelogStore.js` (Zustand)
- `fetchChangelog()` → `GET /api/changelog` über die konfigurierte Instanz aus `utils/axios.js`.
- `markSeen()` → `PUT /api/changelog/seen`, aktualisiert danach `last_seen_version` im `authStore`-User.

### Seite `pages/ChangelogPage.jsx`, Route `/changelog`
- Layout nach Stammdaten-Pattern: Back-Arrow-Icon, Titel `text-2xl` „Was ist neu“, Untertitel „Aktuelle Version: vX.Y.Z“.
- Versionen als Karten untereinander: Version + Titel, Datum, aktuelle Version mit Badge „Aktuell“.
- Admins: Toggle „Technische Details anzeigen“ (Standard aus) – blendet Abschnitte außer „Für Anwender“ ein, mit Abschnitts-Überschrift (deutsche Labels: Neu / Geändert / Behoben / Entfernt; unbekannte Namen unverändert).
- Beim Mount: `fetchChangelog()`, danach `markSeen()` (nur wenn `available`).
- Zustände: Laden (Spinner), `available: false` → Hinweis „Änderungsprotokoll derzeit nicht verfügbar“, leere Liste → „Keine Einträge vorhanden“.
- Dark/Light-Mode, komplett deutsch.

### Sidebar
- „MDS vX.Y.Z“ wird `Link` auf `/changelog`.
- Badge (kleiner Punkt + „Neu“), wenn `user.last_seen_version !== VITE_APP_VERSION` (inkl. `null`).
- Eingeklappte Sidebar: Punkt am Minimieren-Button.
- Vergleich nutzt die Frontend-Build-Version; Backend und Frontend sind über `package.json` synchron.

## 4. Inhalt & Doku
- `### Für Anwender`-Abschnitte für 2.3.0 bis 2.5.1 nachtragen (2–5 verständliche Sätze pro Version, keine Endpoint-/Dateinamen).
- CLAUDE.md, Abschnitt Versionierung: „Beim Release `### Für Anwender` als ersten Abschnitt mitschreiben“.
- CHANGELOG `[Unreleased]`: Feature-Eintrag.

## 5. Tests
- `backend/http/test-changelog.http`: Admin-GET (alle Abschnitte), Nicht-Admin-GET (nur „Für Anwender“, Versionen ohne entfallen), ohne Token (401), ungültiger Token, `PUT /seen` + anschließend `/api/auth/me` prüft `last_seen_version`, `/seen` ohne Token.
- `backend/tests/test-changelog-parser.js` (Node, `assert`, ohne Framework): Unreleased ignoriert, Hinweisblock ignoriert, Version ohne „Für Anwender“, fehlender Titel, Datumsbereich, eingerückte Einträge, CRLF, leere Datei, echte `CHANGELOG.md` parst ohne Fehler und liefert ≥ 30 Versionen.
- Manuell: Badge erscheint nach Version-Bump, verschwindet nach Seitenbesuch; Admin-Toggle; Nicht-Admin sieht keinen Toggle; Dark Mode.
