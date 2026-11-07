# Einrichteblatt: Freigabe und Stände – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Einrichteblätter laufen durch dieselbe Freigabe wie Programme, jede Freigabe sichert einen Stand, auf den man zurückgehen kann.

**Architecture:** `setup_sheets` bekommt `workflow_state_id` statt `status` und nutzt `workflowController`, `WorkflowStatusBadge` und `WorkflowActions`. Stände liegen als JSONB-Snapshot in `setup_sheet_versions`, die Logik sitzt in einem neuen Service `setupSheetVersions.js`. Jede schreibende Route läuft über einen Transaktions-Wrapper, der den Rückfall auf Entwurf erledigt.

**Tech Stack:** Node/Express, PostgreSQL mit Raw SQL, node-pg-migrate, React 19, Zustand, Tailwind v3. Tests: `npm test`, `npm run test:integration` (Wegwerf-DB), Playwright-Skript im Scratchpad.

**Spec:** `docs/konzepte/EINRICHTEBLATT_FREIGABE_SPEC.md`

**Basis:** PR #318. Branch `feat/einrichteblatt-freigabe` von `master`, falls #318 gemergt ist, sonst von `feat/einrichteblatt-karte-maschine` und später rebasen.

## Global Constraints

- Migrationen nur über `pgm`, neue Zeitspalten `timestamptz`, neue Rechte nur für `admin` (`ON CONFLICT (name) DO NOTHING`, mit `description` und `category`).
- Neuer Code nutzt `require('../config/db')`. `workflowController` behält seinen eigenen Pool.
- `workflow_history.created_at` ist `timestamp` und enthält UTC, weil `workflowController` in einer UTC-Session schreibt. Der zentrale Pool läuft in Europe/Berlin. Inserts über ihn setzen deshalb `created_at = now() AT TIME ZONE 'UTC'`.
- UI komplett deutsch, Tailwind mit Dark Mode, Axios nur aus `utils/axios.js`, Dateien nur über `/view` und `/download` mit Path-Traversal-Schutz.
- Keine Kundenbezüge in Code und Tests: `TEIL-0001`, `KD00000`.
- Commit-Nachrichten deutsch mit Conventional-Commits-Präfix und den Attribution-Zeilen der Sitzung.

## Review Focus

- **Speichern ohne Änderung an einem freigegebenen Blatt:** bleibt freigegeben, kein Ablauf-Eintrag (Test in Task 3).
- **Zwei Änderungen hintereinander oder gleichzeitig:** nur ein Eintrag „Geändert nach Freigabe“, weil die Zeile gesperrt wird (Test in Task 3).
- **Foto nach der Freigabe gelöscht:** Der Stand zeigt es weiter, die Datei verschwindet erst, wenn sie kein Stand mehr nennt (Tests in Task 3 und 6).
- **Zurückgehen, wenn Programm, Spannmittel oder Vorrichtung inzwischen gelöscht sind:** Blatt wird trotzdem hergestellt, Warnung nennt, was fehlt (Test in Task 6).
- **Uhrzeit im Ablauf:** Knopf-Wechsel und automatischer Rückfall zeigen dieselbe Zeitbasis (Test in Task 3).

---

## PR A: Freigabe, Rechte, Sichern der Stände

### Task 1: Migration und Umstellung von `status` auf `workflow_state_id`

**Files:**
- Create: `backend/migrations/1737000128000_add-setup-sheet-workflow-versions.js`
- Modify: `backend/src/controllers/setupSheetsController.js`, `backend/src/config/seeds.js`, `backend/src/config/devRoleDefaults.js`, `backend/tests/test-setup-sheets.http`
- Test: `backend/tests/integration/test-einrichteblatt-freigabe.js`

**Interfaces:**
- Produces: Tabelle und Spalten laut Spec 4; `workflow_state` (Name) und `workflow_state_id` in Liste und Detail; `created_by` wie bisher. Recht `setup_sheet.update`, Kategorie `program`.

- [ ] **Step 1: Failing Test schreiben** (`createSetupSheet` über Controller mit `fakeRes`, Muster `test-abwesenheit-aendern.js`)

```js
await test('neues Blatt ist Entwurf, Status im Body zählt nicht', async () => {
  const res = await call(createSetupSheet, { body: { operation_id: opId, status: 'released' } });
  assert.equal(res.statusCode, 201);
  const sheet = await getSheet(res.body.data.id);
  assert.equal(sheet.workflow_state, 'draft');
});
await test('Liste filtert über den Status-Namen', async () => {
  const res = await call(getSetupSheets, { query: { status: 'draft', operation_id: opId } });
  assert.ok(res.body.data.every(s => s.workflow_state === 'draft'));
});
```

- [ ] **Step 2:** `cd backend && npm run test:integration`. Erwartet: FAIL (`workflow_state` undefined).
- [ ] **Step 3: Migration schreiben.** Spalten und Tabelle laut Spec 4, FK `released_version_id` → `setup_sheet_versions(id) ON DELETE SET NULL`. Abbildung `active` → `released`, sonst gleichnamig. Für `released` Stand 1 (`kind='release'`, `version_number=1`) mit Snapshot nach dem Format aus Task 2, `created_by = updated_by`, `released_version_id` setzen. Dann `workflow_state_id` NOT NULL, `status` und `version_number` entfernen. Recht anlegen und `admin` zuweisen, Spalte `DEFAULT` auf die Id von `draft` nicht setzen: Der Controller schreibt sie. `down`: `status` wiederherstellen (`released` → `active`, `rejected` → `draft`), Recht, Tabelle und Spalten entfernen.
- [ ] **Step 4: Controller umstellen.** Liste und Detail joinen `workflow_states ws` und liefern `ws.name AS workflow_state`. `createSetupSheet` schreibt immer `draft`. `updateSetupSheet` ignoriert `status`. Filter `status` vergleicht `ws.name`. `seeds.js`: `released` statt `active`. `devRoleDefaults.js`: `setup_sheet.update` für alle Rollen außer `helper` und Buchhaltungsrollen, also `operator`, `programmer`, `reviewer`, `supervisor`, `admin`.
- [ ] **Step 5: Migration von Hand gegen Altdaten prüfen.** Wegwerf-Container auf Port 5434 (nur 127.0.0.1), `npm run migrate:up` bis 127 mit `MIGRATE_TO` bzw. `node-pg-migrate up 1737000127000`, Blätter in allen fünf Status inkl. `active` mit Foto, Spannmittel, Vorrichtung per SQL anlegen, `up`, Status und Stand 1 prüfen, `down` und wieder `up`. Erwartet: `active` wird `released` mit Stand 1 samt Foto, `down` stellt `active` wieder her. Container mit `docker rm -fv` entfernen.
- [ ] **Step 6:** `npm run test:integration` und `npm test`. Erwartet: PASS.
- [ ] **Step 7:** Commit `feat(einrichteblatt): Status über Workflow-Tabelle, Migration und Recht`.

### Task 2: Stand bei der Freigabe sichern, Schritte prüfen

**Files:**
- Create: `backend/src/services/setupSheetVersions.js`, `backend/tests/test-setup-sheet-versions.js`
- Modify: `backend/src/controllers/workflowController.js`
- Test: `backend/tests/integration/test-einrichteblatt-freigabe.js`

**Interfaces:**
- Produces, in `setupSheetVersions.js`:
  - `buildSnapshot(client, sheetId) -> { fields, clamping_devices, fixtures, photos }`, Werte über `to_jsonb`. `fields`: `program_id, fixture_id, clamping_device_id, fixture_description, clamping_description, control_type, preset_number, wcs_number, wcs_x, wcs_y, wcs_z, reference_point, raw_material_dimensions, material_specification, setup_instructions, special_notes`. Listen ohne `id`, `created_by`, `created_at`. `photos`: `file_path, file_name, file_size, mime_type, caption, photo_type, sort_order`.
  - `snapshotsEqual(a, b) -> boolean`, rein, unabhängig von Reihenfolge der Listen.
  - `createVersion(client, sheetId, kind, userId) -> row`. `kind='release'` vergibt `MAX(version_number)+1`, `kind='backup'` lässt die Nummer leer.
- Consumes: Migration aus Task 1, deren Snapshot dasselbe Format hat.

- [ ] **Step 1: Failing Tests.** Unit: `snapshotsEqual` (andere Reihenfolge gleich, geänderte Bildunterschrift ungleich, `wcs_x` 1 und 1.0 gleich). Integration:

```js
await test('Freigabe legt Stand an und setzt Zeiger', async () => {
  const sheet = await freigeben(await neuesBlatt({ reference_point: 'Mitte' }));
  assert.equal(sheet.workflow_state, 'released');
  const v = await versions(sheet.id);
  assert.equal(v.length, 1);
  assert.equal(v[0].version_number, 1);
  assert.equal(v[0].snapshot.fields.reference_point, 'Mitte');
  assert.equal(sheet.released_version_id, v[0].id);
});
await test('Ungültiger Schritt beim Blatt wird abgelehnt', async () => {
  const res = await wechsel(await neuesBlatt(), 'released');   // Entwurf → Freigegeben
  assert.equal(res.statusCode, 409);
});
```

- [ ] **Step 2:** Tests laufen lassen. Erwartet: FAIL.
- [ ] **Step 3: Service umsetzen.**
- [ ] **Step 4: `changeWorkflowState` ergänzen.** Bei `setup_sheet`: `allowedTransitions` prüfen (die Tabelle aus `getTransitionsFromState` in eine Konstante ziehen, sonst 409), bei Ziel `released` in derselben Transaktion `createVersion` und `released_version_id` setzen. Programme bleiben unverändert.
- [ ] **Step 5:** Tests laufen lassen. Erwartet: PASS.
- [ ] **Step 6:** Commit `feat(einrichteblatt): Stand bei Freigabe sichern, Schritte prüfen`.

### Task 3: Rückfall auf Entwurf, Felder leerbar, Fotodateien bleiben

**Files:**
- Modify: `backend/src/services/setupSheetVersions.js`, `backend/src/controllers/setupSheetsController.js`
- Test: `backend/tests/integration/test-einrichteblatt-freigabe.js`

**Interfaces:**
- Produces: `withSheetChange(sheetId, userId, fn) -> result`: öffnet Transaktion, sperrt die Zeile (`FOR UPDATE`), wirft `SheetLockedError` (409) bei `archived`, ruft `fn(client)`, vergleicht Snapshot vorher und nachher. Bei Unterschied und Status ≠ `draft`: Status `draft` und History mit `change_reason = 'Geändert nach Freigabe'` bzw. `'Geändert nach Prüfung'`, `created_at = now() AT TIME ZONE 'UTC'`.
- Produces: `photoFileReferenced(client, sheetId, filePath) -> boolean`.

- [ ] **Step 1: Failing Tests**

```js
await test('Änderung am freigegebenen Blatt: Entwurf, ein Ablauf-Eintrag', ...);      // Status draft, history genau 1 neu
await test('Speichern ohne Änderung bleibt freigegeben', ...);                         // gleicher Body, kein Eintrag
await test('Zwei Änderungen gleichzeitig: nur ein Eintrag', ...);                      // Promise.all zweier PUT
await test('Foto, Spannmittel, Vorrichtung lösen den Rückfall aus', ...);              // je anlegen, ändern, löschen
await test('Archiviertes Blatt: Änderung 409', ...);
await test('Feld leeren und Programm entfernen wirkt, fehlendes Feld bleibt', ...);    // null leert, fehlend bleibt
await test('Foto aus einem Stand: Zeile weg, Datei bleibt', ...);                      // fs.access ok
await test('Foto in keinem Stand: Datei wird gelöscht', ...);
await test('Ablauf: Rückfall und Knopf-Wechsel in derselben Zeitbasis', ...);          // created_at beider < 2 min auseinander
```

- [ ] **Step 2:** Tests laufen lassen. Erwartet: FAIL.
- [ ] **Step 3: `withSheetChange` umsetzen** und `updateSetupSheet`, `uploadPhoto`, `updatePhoto`, `deletePhoto`, `addClampingDevice`, `updateClampingDevice`, `removeClampingDevice`, `addFixture`, `updateFixture`, `removeFixture` darüber führen. Schlägt `uploadPhoto` fehl (auch 409), wird die hochgeladene Datei entfernt. Bei `updateSetupSheet` werden nur Felder geschrieben, die im Body stehen, sodass `null` leert und fehlende Felder bleiben.
- [ ] **Step 4: `deletePhoto`:** `unlink` nur, wenn `photoFileReferenced` falsch ist.
- [ ] **Step 5:** Tests laufen lassen. Erwartet: PASS.
- [ ] **Step 6:** Commit `feat(einrichteblatt): Rückfall auf Entwurf bei Änderung, Felder leerbar`.

### Task 4: Rechte auf dem Server

**Files:**
- Modify: `backend/src/routes/setupSheetsRoutes.js`
- Test: `backend/tests/integration/test-einrichteblatt-rechte.js`

- [ ] **Step 1: Failing Test.** Express-App auf `listen(0)`, Router mounten, `JWT_SECRET` setzen, Token für Benutzer mit und ohne Recht. Tabelle aller schreibenden Routen (POST, PUT, DELETE laut Router, inkl. Fotos, Spannmittel, Vorrichtungen):

```js
for (const [method, url] of WRITE_ROUTES) {
  await test(`${method} ${url} ohne Recht: 403`, async () => {
    assert.equal((await send(method, url, tokenOhne)).status, 403);
  });
}
await test('GET Liste, Detail und Foto ohne Recht: 200', ...);
await test('POST /api/workflow/change ohne program.release: 403', ...);
```

- [ ] **Step 2:** Test laufen lassen. Erwartet: FAIL (kein 403).
- [ ] **Step 3:** `requirePermission('setup_sheet.update')` nach `authenticateToken` und vor `upload.single` an alle schreibenden Routen.
- [ ] **Step 4:** Test laufen lassen. Erwartet: PASS.
- [ ] **Step 5:** Commit `feat(einrichteblatt): Rechteprüfung auf dem Server`.

### Task 5: Frontend Freigabe, Doku, PR A

**Files:**
- Delete: `frontend/src/components/SetupSheetStatusActions.jsx`
- Create: `frontend/src/components/WorkflowHistoryList.jsx`
- Modify: `frontend/src/components/SetupSheetCard.jsx`, `SetupSheetForm.jsx`, `SetupSheetsList.jsx`, `SetupSheetPhotos.jsx`, `SetupSheetClampingFixtures.jsx`, `CHANGELOG.md`, `docs/RELEASE-CHECKLISTE.md`, `ROADMAP.md`, `docs/konzepte/EINRICHTEBLATT_FREIGABE_SPEC.md`

**Interfaces:**
- Consumes: `workflow_state` aus der API, `WorkflowActions({ entityType, entityId, currentState, onStatusChange })`, `workflowStore.fetchHistory/getHistory`.
- Produces: `WorkflowHistoryList({ entityType, entityId })`, zeigt Schritte mit Status, Name, Uhrzeit und Grund.

- [ ] **Step 1: Karte und Detail.** `WorkflowStatusBadge` und `WorkflowActions` mit `entityType="setup_sheet"`, Knopf-Bereich mit `stopPropagation` wie bisher. Status-Feld im Formular raus. Neuer Reiter „Ablauf“ im Blatt.
- [ ] **Step 2: Rechte im Frontend.** „Neues Einrichteblatt“, Bearbeiten, Löschen, Foto-Upload und Spannmittel-Aktionen nur mit `hasPermission('setup_sheet.update')`, Öffnen und Ansehen für alle.
- [ ] **Step 3: Playwright im Dev-MDS** (Test-Wegwerf-Backend wegen Migration, siehe Global Constraints). Ablauf: Blatt anlegen, zur Prüfung, geprüft, freigeben; Bildunterschrift ändern → Badge „Entwurf“, Ablauf zeigt „Geändert nach Freigabe“; Benutzer ohne Recht sieht keine Ändern-Knöpfe. Erwartet: keine Browser-Fehler.
- [ ] **Step 4: Doku.** CHANGELOG `[Unreleased]` (Added, Changed, Removed). Release-Checkliste „Nächstes Release“: Migration `1737000128000`, direkt nach dem Deploy `setup_sheet.update` an `CNC-Fräser`, `CNC-Dreher`, `Werkstatt-Team`, `programmer`, `reviewer`, `supervisor` vergeben, Klicktest. ROADMAP: Befunde Rechte und Felder als erledigt, neu „Programme: Server prüft Workflow-Schritte nicht“ (Befund 07.11.2026). Spec Abschnitt 5 um die Schritt-Prüfung ergänzen, den Plan mit committen.
- [ ] **Step 5:** `npm test`, `npm run test:integration`, ESLint der geänderten Dateien.
- [ ] **Step 6:** Commit, Push, PR im MDS-Stil, Nutzer probiert aus und mergt.

---

## PR B: Stände ansehen und zurückgehen

### Task 6: Backend Stände, Zurückgehen, Löschschutz

**Files:**
- Modify: `backend/src/services/setupSheetVersions.js`, `backend/src/controllers/setupSheetsController.js`, `backend/src/routes/setupSheetsRoutes.js`, `backend/tests/test-setup-sheets.http`
- Test: `backend/tests/integration/test-einrichteblatt-staende.js`

**Interfaces:**
- Produces: `restoreVersion(client, sheetId, versionId, userId) -> { state, warnings: string[], backupVersionId: number|null }`.
- Produces: `GET /api/setup-sheets/:id/versions`, `GET …/versions/:versionId`, `GET …/versions/:versionId/photos/:index/view` (Lesen für alle), `POST …/versions/:versionId/restore` (`program.release`).

- [ ] **Step 1: Failing Tests**

```js
await test('Zurück auf zuletzt freigegebenen Stand: wieder Freigegeben', ...);   // state released, Inhalt wie Stand
await test('Zurück auf älteren Stand: Entwurf, Zeiger bleibt', ...);             // state draft, released_version_id unverändert
await test('Vorher wird gesichert, wenn es Unterschiede gibt', ...);             // backupVersionId gesetzt, kind backup
await test('Ohne Unterschied keine Sicherung', ...);                             // backupVersionId null
await test('Gelöschtes Spannmittel/Programm: Warnung, Rest hergestellt', ...);   // warnings nennt es
await test('Foto seit dem Stand gelöscht: wieder da und abrufbar', ...);         // Zeile da, Datei lesbar
await test('Foto aus Stand per /view, fremder Pfad im Snapshot: 403', ...);
await test('Zurückgehen steht im Ablauf', ...);
await test('Blatt mit Stand: Löschen 409, ohne Stand: 200', ...);
await test('Ohne program.release: restore 403', ...);
```

- [ ] **Step 2:** Tests laufen lassen. Erwartet: FAIL.
- [ ] **Step 3: `restoreVersion` umsetzen.** Reihenfolge: Zeile sperren, Sicherung falls `!snapshotsEqual`, Felder schreiben, Spannmittel, Vorrichtungen und Fotos ersetzen, Verweise ohne Ziel auslassen und in `warnings` nennen, Status setzen (`released`, wenn `versionId = released_version_id`, sonst `draft`), History mit Grund „Zurück auf Stand n“, Zeitbasis wie in Task 3. Archivierte Blätter: 409.
- [ ] **Step 4:** Endpunkte und Löschschutz in `deleteSetupSheet`. `/view` nutzt denselben Path-Traversal-Schutz wie `servePhoto`, dazu gemeinsame Hilfsfunktion.
- [ ] **Step 5:** Tests laufen lassen. Erwartet: PASS.
- [ ] **Step 6:** Commit `feat(einrichteblatt): Stände abrufen und zurückgehen, Löschschutz`.

### Task 7: Frontend Stände, Hinweis, PR B

**Files:**
- Create: `frontend/src/components/SetupSheetVersions.jsx`
- Modify: `frontend/src/components/SetupSheetsList.jsx`, `frontend/src/stores/setupSheetsStore.js`, `CHANGELOG.md`, `ROADMAP.md`

**Interfaces:**
- Consumes: Endpunkte aus Task 6.
- Produces: `SetupSheetVersions({ setupSheet, onRestored })`.

- [ ] **Step 1: Reiter „Stände“.** Liste mit Stand, Datum, Freigeber, Sicherungen klar gekennzeichnet. „Ansehen“ schreibgeschützt mit Fotos über `AuthImage`. „Auf diesen Stand zurück“ nur mit `program.release`.
- [ ] **Step 2: Bestätigung.** Dialog nennt den Ausgang: „Das Blatt ist danach wieder freigegeben“ bzw. „Das Blatt wird Entwurf und muss neu freigegeben werden“. Warnungen aus der Antwort als Toast oder Hinweis.
- [ ] **Step 3: Hinweis im Blatt.** Ist `released_version_id` gesetzt und der Status nicht `released`: „In Bearbeitung. Letzter freigegebener Stand: Stand n vom …“ mit Link. Karte zeigt denselben Hinweis knapp.
- [ ] **Step 4: Löschen-Knopf.** Bei Blättern mit Stand ausblenden, 409 als verständliche Meldung anzeigen.
- [ ] **Step 5: Playwright.** Freigeben, Foto löschen und Text ändern, Hinweis prüfen, Stand ansehen (Foto sichtbar), zurückgehen → Badge „Freigegeben“, Foto und Text zurück, Sicherung in der Liste. Erwartet: keine Browser-Fehler.
- [ ] **Step 6: Doku.** CHANGELOG, ROADMAP (Fortschritt, Variante kopieren bleibt offen).
- [ ] **Step 7:** `npm test`, `npm run test:integration`, ESLint, Commit, Push, PR. Nutzer probiert aus und mergt.
