# Messprogramme: Altbestand übernehmen – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Helfer im MDS liest den Altbestand an Messprogrammen aus einem Netzlaufwerk-Ordner ein, schlägt je Programm die Übernahme vor, legt nach Bestätigung alles an (mit Wiederaufnahme und Freigabe) und erzeugt ein PowerShell-Skript, das die übernommenen Ordner ins Archiv verschiebt.

**Architecture:** Die Logik sitzt in reinen ES-Modulen unter `frontend/src/utils/legacyImport/`: Profil, Parser, Abgleich, Ablauf mit eingespeister API, Skript-Erzeugung. Sie importieren weder React noch axios, deshalb laufen ihre Tests mit Node über den Backend-Testlauf (`npm test`, dynamischer `import()`). Die Seite `LegacyImportPage` verbindet das mit einer dünnen axios-Schicht (`api.js`). Im Backend ändert sich nur eins: Der Messprogramm-Probelauf geht künftig auch ohne `operation_id`.

**Tech Stack:** React 19, Zustand (`authStore.hasPermission`), Tailwind v3, axios aus `utils/axios.js`; Node/Express, Raw SQL. Tests: `npm test` (backend, ohne DB), `npm run test:integration` (Wegwerf-DB), Playwright-Skript im Scratchpad gegen das Wegwerf-Backend.

**Spec:** `docs/konzepte/ALTBESTAND_IMPORT_SPEC.md`

**PRs und Branches:** Jeder PR geht von aktuellem `master` ab, nach dem Merge des vorigen. Ist der vorige noch offen, von dessen Branch abzweigen und nach dem Merge rebasen.
- PR A `feat/altbestand-import-lesen`: Tasks 1–3, nur lesen
- PR B `feat/altbestand-import-uebernehmen`: Tasks 4–6
- PR C `feat/altbestand-import-archiv`: Tasks 7–8

## Global Constraints

- UI komplett deutsch, Tailwind mit Dark Mode, axios nur aus `utils/axios.js`, keine `/uploads/*`-URLs.
- Keine Kundenbezüge in Code, Tests und Fixtures: `KD00000 FIRMA`, `TEIL-0001`, Pfade `Z:\KMG\…`.
- Module unter `utils/legacyImport/` sind rein (außer `api.js`): kein React, kein axios, kein `window`. Relative Imports darin mit Endung `.js`, sonst lädt Node sie nicht.
- Pfade der eingelesenen Dateien: `/` als Trenner, erstes Stück = Name des gewählten Ordners (wie `webkitRelativePath` bzw. `entry.fullPath` ohne führenden `/`).
- Texte, die die Spec festlegt, wörtlich: Grund `Erstimport Altbestand`, Kommentar `Erstimport aus Altbestand (Ordner <Kundenordner>\<Programmordner>)`, Skriptname `altbestand-archiv.ps1`, Schalter `-Probe`.
- Kein neues Recht, keine Migration. Seite nur mit `part.create` + `setup_sheet.update` + `program.upload`; Schalter „Direkt freigeben“ nur mit `program.release`.
- `localStorage` nur mit try/catch, Seite muss ohne funktionieren.
- Commit-Nachrichten deutsch mit Conventional-Commits-Präfix und den Attribution-Zeilen der Sitzung. CHANGELOG je PR unter `[Unreleased]`.

## Review Focus

1. **Kundennummer mit anderer Schreibweise** (Leerzeichen, Groß/klein): Abgleich nach `trim` + `toLowerCase`. Kein Treffer → Fehler in der Zeile, Kunde in der Zeile wählbar (Test in Task 2).
2. **Fotos in nicht unterstützten Formaten** (`.bmp`, `.heic`, `.tif`) und Großschreibung (`.JPG`): Nur JPG/PNG/WebP gehen ans Einrichteblatt, der Rest wird mit Grund aufgelistet (Test in Task 1).
3. **Archivordner gleich dem oder innerhalb des Quellordners:** Skript wird nicht erzeugt, Meldung. Sonst landet das Archiv beim nächsten Einlesen wieder in der Liste (Test in Task 7).
4. **Ordnernamen mit `'`, `[ ]`, Umlauten, Leerzeichen:** Skript nutzt `-LiteralPath` und verdoppelt `'` (Test in Task 7).
5. **Wiederaufnahme an jeder Stelle:** Programm vorhanden, Einrichteblatt fehlt; Programm schon freigegeben; Fehler beim dritten Foto → zweiter Durchlauf ergänzt nur das Fehlende (Tests in Task 5).
6. **Falscher Ordner gewählt** (einzelner Programmordner ohne Kundenordner, Ordner ganz ohne `Messprogramm`): klare Meldung statt leerer Liste (Test in Task 1).

---

## PR A – Einlesen und Liste

### Task 1: Import-Profil und Ordner-Parser

**Files:**
- Create: `frontend/src/utils/legacyImport/profile.js`
- Create: `frontend/src/utils/legacyImport/parse.js`
- Test: `backend/tests/test-legacy-import-parse.js`

**Interfaces:**
- Produces:
  - `DEFAULT_PROFILE` (profile.js): `{ folders: FolderRule[], photoExtensions: string[] }`, `FolderRule = { key, match: RegExp, skip?: string, children?: FolderRule[] }`. Keys oben: `program` (/messprogramm/i), `measurement_data` (/messdaten/i, skip), `setup` (/aufspann/i, children), `calibration` (/taster|kalibr/i), `old` (/alte\s*daten/i, skip). Children von `setup`: `photos` (/bilder|fotos?/i), `drawing` (/zeichnung/i), `instruction` (/arbeitsanweisung|einricht/i, skip), `cad` (/cad/i). Geprüft wird in dieser Reihenfolge auf den Ordnernamen ohne führende Nummer (`/^\d+[_\s-]*/` entfernt). `photoExtensions: ['jpg','jpeg','png','webp']`.
  - `parseLegacyTree(items: {path: string}[], profile = DEFAULT_PROFILE) → { programs: ParsedProgram[], notices: string[] }`. Die übergebenen Objekte werden unverändert in die Dateilisten übernommen (die Seite gibt `{ path, file }` hinein).
  - `ParsedProgram = { key, customerFolder, programFolder, customerNumber, machineCode, customerPartNumber, revision, nameRevision, name, files: { program: Item[], template: Item[], calibration: Item[], photos: Item[], drawingPdf: Item[], drawingOther: Item[], cad: Item[] }, skipped: {path, reason}[], warnings: string[], errors: string[] }`. `key` = `<Kundenordner>/<Programmordner>`.

- [ ] **Step 1: Write the failing tests** (`test-legacy-import-parse.js`, Stil wie `test-cmm-program-files.js`, async IIFE mit `await import(pathToFileURL(path.join(__dirname, '../../frontend/src/utils/legacyImport/parse.js')).href)`)

Fixture-Helfer `tree(prefix, relPaths)` erzeugt `{ path }`-Items. Normalfall unter `KMG/KD00000 FIRMA/HG_TEIL-0001_A_Halter Links/`:
`01_Messprogramm HG_IndexA/TEIL-0001.prg`, `…/TEIL-0001.cad`, `…/TEIL-0001.xlsx`, `…/TEIL-0001.layout.xml`, `…/Protokolle/p1.pdf`, `02_Messdaten/x.txt`, `03_Aufspannungs- und Teiledaten/01_Bilder der Aufspannsituation/a.JPG`, `…/b.heic`, `…/02_Gestempelte Zeichnung/TEIL-0001.pdf`, `…/02_Gestempelte Zeichnung/TEIL-0001.tif`, `…/03_Arbeitsanweisung und Einrichtblatt/ES.xlsx`, `…/04_CAD-Modell/TEIL-0001.stp`, `04_Taster kalibrieren/Kal.prg`, `04_Taster kalibrieren/Kal.pdf`, `05_Alte Daten/alt.prg`, `Notiz.txt`.

```js
test('Normalfall: Kopfdaten', () => {
  const [p] = parseLegacyTree(normal).programs;
  assert.equal(p.key, 'KD00000 FIRMA/HG_TEIL-0001_A_Halter Links');
  assert.equal(p.customerNumber, 'KD00000');
  assert.equal(p.machineCode, 'HG');
  assert.equal(p.customerPartNumber, 'TEIL-0001');
  assert.equal(p.revision, 'A');
  assert.equal(p.nameRevision, 'A');
  assert.equal(p.name, 'Halter Links');
  assert.deepEqual(p.errors, []);
});
test('Normalfall: Dateien je Ziel', () => {
  const names = (list) => list.map(i => i.path.split('/').pop());
  const [p] = parseLegacyTree(normal).programs;
  assert.deepEqual(names(p.files.program), ['TEIL-0001.prg', 'TEIL-0001.cad']);
  assert.deepEqual(names(p.files.template), ['TEIL-0001.xlsx', 'TEIL-0001.layout.xml']);
  assert.deepEqual(names(p.files.calibration), ['Kal.prg']);
  assert.deepEqual(names(p.files.photos), ['a.JPG']);
  assert.deepEqual(names(p.files.drawingPdf), ['TEIL-0001.pdf']);
  assert.deepEqual(names(p.files.drawingOther), ['TEIL-0001.tif']);
  assert.deepEqual(names(p.files.cad), ['TEIL-0001.stp']);
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
```

Weitere Tests, je ein `test(...)`:
- ohne Revision im Namen (`HG_TEIL-0002_Deckel`, `01_Messprogramm HG_Index0`): `revision === '0'`, `nameRevision === null`, `name === 'Deckel'`, keine Warnung
- Revision weicht ab (`HG_TEIL-0003_B_Platte`, `…_IndexC`): `revision === 'C'`, Warnung enthält `weicht vom Index`
- kein Index (`01_Messprogramm`), Revision nur im Namen: `revision === 'B'`, Warnung `Kein Index`; weder noch: `errors` enthält `Revision fehlt`
- keine `.prg` → `errors` enthält `Keine .prg`; zwei `.prg` oben → `Mehrere .prg`
- anders nummeriert (`3_Messprogramm …`, `Aufspannung/Fotos/…`) wird erkannt; unbekannter Ordner `07_Sonstiges/x` → skipped mit `Unbekannter Ordner`
- Auswahl = Kundenordner (Pfade beginnen mit `KD00000 FIRMA/…`) ergibt denselben `key` wie mit Quellordner
- Auswahl = einzelner Programmordner → `programs[0].errors` enthält `Kundenordner fehlt`
- kein Ordner mit `Messprogramm` → `programs.length === 0`, `notices[0]` enthält `Kein Programmordner gefunden`
- zwei Programme in zwei Kundenordnern → zwei Einträge, sortiert nach `key`
- gestempelte Zeichnung mit demselben Namen wie eine PDF in `01_Messprogramm` → nicht in `drawingPdf`, skipped mit `schon im Messprogramm-Ordner`

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && node tests/test-legacy-import-parse.js`
Expected: FAIL, Modul nicht gefunden.

- [ ] **Step 3: Implement `DEFAULT_PROFILE` und `parseLegacyTree`**

Programmordner = Ordner, der direkt einen Unterordner mit Regel `program` enthält. Kundenordner = dessen Elternordner (fehlt er → Fehler `Kundenordner fehlt – Kunden- oder Quellordner wählen`). `customerNumber` = Kundenordnername bis zum ersten Leerzeichen. Programmordnername an `_` teilen: `[machineCode, customerPartNumber, ...rest]`. `rest[0]` gilt als Revision, wenn `rest.length >= 2` und `/^(?:rev\.?|idx|index)?[A-Za-z0-9-]{1,2}$/i` passt. `name` = Rest mit Leerzeichen verbunden. Index aus dem `program`-Ordnernamen per `/index\s*([A-Za-z0-9-]+)/i`. Im `program`-Ordner nur die oberste Ebene: `.xlsx` und `.layout.xml` → `template`, sonst → `program`. `calibration`: nur `.prg` der obersten Ebene, Rest skipped `Beim Kalibrierprogramm zählt nur die .prg`. `photos`: alle Ebenen, Endung aus `photoExtensions` (ohne Groß/klein), Rest skipped `Bildformat nicht unterstützt (nur JPG, PNG, WebP)`. `drawing`: `.pdf` → `drawingPdf`, Rest → `drawingOther`. Eine PDF, deren Name schon unter `files.program` steht, wird skipped `Liegt schon im Messprogramm-Ordner`. `cad`: alles.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && node tests/test-legacy-import-parse.js && npm test`
Expected: alle ✓, `npm test` mit allen Testdateien bestanden.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/legacyImport/profile.js frontend/src/utils/legacyImport/parse.js backend/tests/test-legacy-import-parse.js
git commit -m "feat: Altbestand-Import – Import-Profil und Ordner-Parser"
```

### Task 2: Abgleich mit dem MDS

**Files:**
- Create: `frontend/src/utils/legacyImport/match.js`
- Test: `backend/tests/test-legacy-import-match.js`

**Interfaces:**
- Consumes: `ParsedProgram` (Task 1)
- Produces (match.js):
  - `matchCustomer(customerNumber: string, customers: {id, customer_number}[]) → customer | null`, Vergleich nach `trim().toLowerCase()`
  - `findPartCandidates({ customerId, customerPartNumber, revision }, parts) → { same: Part[], otherRevisions: Part[] }`. Ein Part hat `customer_id`, `customer_part_number` und `revision`; Vergleich nach `trim().toLowerCase()`.
  - `defaultCmmMachine(machines) → machine | null`: genau eine Maschine mit `measuring_equipment_id != null` → diese, sonst null
  - `pickCmmOperation(operations, cmmMachineId) → op | null`: erster Arbeitsgang mit `machine_id === cmmMachineId`, nach `sequence`
  - `expectedNames(parsed) → { photos: string[], documents: string[] }`: Dateinamen aus `files.photos` bzw. `files.cad` + `files.drawingOther`
  - `rowStatus({ parsed, customer, candidates, importState }) → 'error' | 'new' | 'choose_part' | 'other_revision' | 'part_exists' | 'partial' | 'imported'`. `importState` wie `loadImportState` in Task 5 (`null`, solange nicht geladen): `{ operationId, programId, programState, setupSheetId, setupSheetState, photoNames: string[], documentNames: string[] }`. `imported` = Programm vorhanden, alle erwarteten Fotos und Dokumente vorhanden. `partial` = Bauteil gewählt, mindestens ein Schritt da, nicht alles.

- [ ] **Step 1: Write the failing tests**, je ein `test(...)`:
  - `matchCustomer(' kd00000 ', [{id: 1, customer_number: 'KD00000'}]).id === 1`; unbekannt → `null`
  - Kandidaten: gleiche Kunden-Teilenummer und Revision → `same`; gleiche Nummer, andere Revision → `otherRevisions`; anderer Kunde → keins von beiden
  - `defaultCmmMachine`: eine KMG-Maschine → diese; zwei oder keine → `null`
  - `pickCmmOperation`: nimmt den Arbeitsgang der KMG-Maschine mit kleinster `sequence`
  - `rowStatus`: `parsed.errors` nicht leer → `error`; `customer === null` → `error`; keine Kandidaten → `new`; zwei `same` → `choose_part`; nur `otherRevisions` → `other_revision`; ein `same` ohne `importState` → `part_exists`; mit Programm, aber Foto fehlt → `partial`; alles da → `imported`

- [ ] **Step 2: Run** `cd backend && node tests/test-legacy-import-match.js` — Expected: FAIL, Modul nicht gefunden.
- [ ] **Step 3: Implement** die Funktionen in `match.js`.
- [ ] **Step 4: Run** `cd backend && node tests/test-legacy-import-match.js && npm test` — Expected: alle ✓.
- [ ] **Step 5: Commit** `feat: Altbestand-Import – Abgleich mit Kunden, Bauteilen und Arbeitsgängen`

### Task 3: Seite „Altbestand übernehmen“ – Einlesen und Liste

**Files:**
- Create: `frontend/src/utils/fileEntries.js` (`filesFromEntry` aus `CmmUploadForm.jsx` hierher verschieben, dort importieren)
- Modify: `frontend/src/components/CmmUploadForm.jsx` (Import statt eigener Funktion)
- Create: `frontend/src/utils/legacyImport/api.js`
- Create: `frontend/src/pages/LegacyImportPage.jsx`
- Create: `frontend/src/components/legacyImport/LegacyImportRow.jsx`
- Modify: `frontend/src/App.jsx` (Route), `frontend/src/pages/ProgramsOverviewPage.jsx` (Knopf bei `kind === 'cmm'`)
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `parseLegacyTree` (Task 1), alles aus `match.js` (Task 2)
- Produces:
  - `filesFromEntry(entry) → Promise<{file, path}[]>` (fileEntries.js)
  - api.js, jede Funktion gibt die Nutzdaten zurück und wirft bei Fehlern einen `Error` mit der Servermeldung (`error` bzw. `message` aus der Antwort):
    `listCustomers()` (`GET /api/customers` → `data`), `listMachines()` (`GET /api/machines` → `data`), `listOperationTypes()` (`GET /api/operation-types` → Array), `listWorkflowStates()` (`GET /api/workflow/states` → `data`), `listParts(customerId)` (`GET /api/parts?customer_id=` → `parts`), `listOperations(partId)` (`GET /api/operations?part_id=` → `data`), `listCmmPrograms(operationId)` (`GET /api/programs?operation_id=&kind=cmm` → `data`), `listSetupSheets(operationId)` (`GET /api/setup-sheets?operation_id=` → `data`), `getSetupSheet(id)` (`GET /api/setup-sheets/:id` → `data` mit `photos[].file_name`), `listPartDocuments(partId)` (`GET /api/parts/:id/documents` → `documents`)
  - `export const legacyImportApi = { ... }` mit allen Funktionen, Task 6 ergänzt die schreibenden

- [ ] **Step 1: `filesFromEntry` verschieben.** Danach in `CmmUploadForm.jsx` importieren. `npm run build` im Frontend muss durchlaufen, der Upload von Hand bleibt unverändert (prüft Step 6).
- [ ] **Step 2: `api.js` mit den lesenden Funktionen** wie im Interfaces-Block.
- [ ] **Step 3: Seite und Zeile.** Route `/cmm-programs/altbestand`, `ProtectedRoute requiredPermission="part.create"`. Fehlt `setup_sheet.update` oder `program.upload`, zeigt die Seite einen Hinweis, welches Recht fehlt. Knopf „Altbestand übernehmen“ auf der Messprogramm-Übersicht nur mit allen drei Rechten.
  - Kopf: Ablage mit „Ordner wählen“ (`<input webkitdirectory multiple>`) und Drag & Drop über `filesFromEntry`. Darunter das KMG-Kürzel → Maschine: eine Auswahl je gefundenem `machineCode`, vorbelegt mit `defaultCmmMachine`.
  - Beim Einlesen: `parseLegacyTree(items)`, einmal Kunden, Maschinen, Arbeitsgang-Typen und Workflow-Status laden, je Kunde einmal `listParts`.
  - Je Zeile: Kunde (Auswahl, vorbelegt über `matchCustomer`), Kunden-Teilenummer, Revision, Bezeichnung (Eingabefelder), Bauteil-Auswahl bei `choose_part` und `other_revision` (Optionen: die Kandidaten, „Neues Bauteil anlegen“, „Überspringen“; bei `other_revision` ist „Neues Bauteil“ vorbelegt), Status als farbiges Badge, Warnungen und Fehler, aufklappbar die Dateien je Ziel und das Aussortierte mit Grund.
  - Für Zeilen mit gewähltem Bauteil `importState` laden. Bis Task 5 nur Arbeitsgang und Programm über `pickCmmOperation` + `listCmmPrograms`, Task 5 ersetzt das durch `loadImportState`.
  - Hinweise aus `notices` oben anzeigen.
- [ ] **Step 4: CHANGELOG** unter `[Unreleased] / Added`: „Messprogramme: Seite „Altbestand übernehmen“ liest einen Ordner vom Netzlaufwerk ein und zeigt je Programm, was wohin übernommen würde (noch ohne Übernehmen)“.
- [ ] **Step 5: Build und Lint**

Run: `cd frontend && npm run build && npx eslint src/utils/legacyImport src/utils/fileEntries.js src/pages/LegacyImportPage.jsx src/components/legacyImport`
Expected: Build ohne Fehler, ESLint ohne Fehler in den neuen Dateien.

- [ ] **Step 6: UI-Test gegen das Wegwerf-Backend** (Scratchpad-Skript wie in Session 7./8.11., Backend 5099 mit `TZ=UTC`, Vite 127.0.0.1:5175). Seed: Kunde `KD00000`, eine Maschine mit `measuring_equipment_id`. Fixture-Baum im Scratchpad wie der Normalfall aus Task 1, dazu ein zweites Programm ohne `.prg`. Playwright: Seite öffnen, `setInputFiles('<input webkitdirectory>', '<fixture-ordner>')`.
Expected: zwei Zeilen; Zeile 1 Status „neu“, aufgeklappt `TEIL-0001.prg` unter Messprogramm und `b.heic` unter „nicht übernommen“; Zeile 2 Fehler „Keine .prg“. Danach im Bauteil eines Seeds den Messprogramm-Upload von Hand mit Ordner-Drop prüfen: zeigt die Dateien wie vorher.

- [ ] **Step 7: Commit** `feat: Altbestand-Import – Seite mit Einlesen und Vorschlagsliste`, danach PR A (Deutsch, Summary/Hintergrund/Test plan).

---

## PR B – Übernehmen

### Task 4: Probelauf ohne Arbeitsgang

**Files:**
- Modify: `backend/src/controllers/cmmProgramsController.js` (`createCmmProgram`, Pflichtfeld-Prüfung und Arbeitsgang-Abfrage ab Zeile ~257)
- Test: `backend/tests/integration/test-messprogramm-probelauf.js`

**Interfaces:**
- Produces: `POST /api/programs/cmm?dry_run=true` ohne `operation_id` → 200 mit `data.valid`, `data.errors` wie bisher. Ohne `dry_run` bleibt `operation_id` Pflicht (400).

- [ ] **Step 1: Write the failing test** (Stil wie `test-arbeitsgang-op-code.js`; `req.files = { files: [tmp('TEIL-0001.prg')], template_files: [...] }`, temporäre Dateien mit `{ path, originalname, size, mimetype }` wie in `test-programmnummern.js`):
  - Probelauf ohne `operation_id` mit `.prg` → `statusCode === 200`, `body.data.valid === true`
  - Probelauf ohne `operation_id` nur mit `.cad` → `body.data.valid === false`, `errors` nicht leer
  - Probelauf ohne `operation_id` mit Vorlage, deren Name ein vorhandenes Programm schon nutzt → `errors` enthält `Vorlagenname`
  - ohne `dry_run` und ohne `operation_id` → `statusCode === 400`
- [ ] **Step 2: Run** `cd backend && npm run test:integration` — Expected: die ersten drei FAIL (400 „Pflichtfelder fehlen“).
- [ ] **Step 3: Implement.** `operation_id` ist nur ohne `dryRun` Pflicht. Die Arbeitsgang-Abfrage läuft nur, wenn `operation_id` gesetzt ist.
- [ ] **Step 4: Run** `cd backend && npm run test:integration && npm test` — Expected: alles grün.
- [ ] **Step 5: Commit** `feat: Messprogramm-Probelauf ohne Arbeitsgang`

### Task 5: Ablauf „Übernehmen“ mit Wiederaufnahme und Freigabe

**Files:**
- Create: `frontend/src/utils/legacyImport/runImport.js`
- Test: `backend/tests/test-legacy-import-run.js`

**Interfaces:**
- Consumes: `pickCmmOperation`, `expectedNames` (Task 2)
- Produces (runImport.js):
  - `RELEASE_REASON = 'Erstimport Altbestand'`
  - `importComment(parsed) → 'Erstimport aus Altbestand (Ordner ' + customerFolder + '\\' + programFolder + ')'`
  - `releasePath(stateName) → string[] | null`: `draft` → `['review','approved','released']`, `review` → `['approved','released']`, `approved` → `['released']`, `released` → `[]`, sonst `null`
  - `loadImportState(api, partId, cmmMachineId) → importState` (Form wie in Task 2)
  - `importProgram({ row, settings, api, release }) → Promise<{ ok: boolean, steps: Step[], partId, importState }>`
    - `row = { parsed, customerId, partChoice: number | 'new' | 'skip', customerPartNumber, revision, name }`
    - `settings = { cmmMachineId, opDefaults: { op_number, op_name, operation_type_id, enabled_features: string[] }, workflowStates: {id, name}[] }`
    - `Step = { key, status: 'done' | 'skipped' | 'error', message? }`, Keys in dieser Reihenfolge: `probelauf`, `bauteil`, `arbeitsgang`, `messprogramm`, `einrichteblatt`, `fotos`, `dokumente`, `freigabe_programm`, `freigabe_einrichteblatt`
  - `api` braucht zusätzlich zu Task 3: `dryRunCmm({ files, templateFiles, calibrationFiles }) → { valid, errors }`, `createPart(body) → part`, `createOperation(body) → op`, `createCmmProgram({ operation_id, program_name, comment, files, templateFiles, calibrationFiles }) → { program }`, `createSetupSheet({ operation_id }) → sheet`, `uploadSetupPhoto(sheetId, file)`, `uploadPartDocument(partId, file, { document_type, is_primary_cad })`, `workflowChange({ entityType, entityId, toStateId, changeReason })`

Ablauf (die Spec 5.3 legt die Reihenfolge fest):
`partChoice === 'skip'` → `ok: true`, alle Schritte `skipped`. Gibt es noch kein Programm, kommt der Probelauf, `valid === false` → Fehler, Abbruch vor dem Anlegen. Bauteil: `'new'` → `createPart({ customer_id, customer_part_number, part_name: name, revision })` ohne `part_number`. Arbeitsgang: `pickCmmOperation`, sonst `createOperation({ part_id, machine_id: cmmMachineId, ...opDefaults })`. Messprogramm nur, wenn keins da ist: `program_name: name`, Kommentar `importComment`. Einrichteblatt: vorhandenes oder neues. Fotos und Dokumente: nur Dateinamen, die noch fehlen. Das erste CAD wird `is_primary_cad`, falls noch kein Dokument Haupt-CAD ist. `drawingPdf`-Dateien kommen als Prüfzeichnung in `files` des Messprogramms, `drawingOther` als Bauteil-Dokument `drawing`, CAD als `cad_model`. Freigabe nur bei `release === true`. Den Status erst nach Fotos und Dokumenten neu lesen: Ein Foto-Upload setzt ein freigegebenes Blatt auf Entwurf zurück. Dann `releasePath(state)` Schritt für Schritt mit `toStateId` aus `workflowStates`, `entityType` `'program'` bzw. `'setup_sheet'`, `changeReason: RELEASE_REASON`. `null` → Fehler „Status <state> – bitte von Hand freigeben“. Der erste Fehler bricht ab, `ok: false`.

- [ ] **Step 1: Write the failing tests** mit einer Fake-API (Speicher-Objekt, zählt Aufrufe), je ein `test(...)`:
  - neues Programm, `release: true`: Aufruf-Reihenfolge `dryRunCmm, createPart, createOperation, createCmmProgram, createSetupSheet, uploadSetupPhoto×n, uploadPartDocument×m, workflowChange×3 (program), workflowChange×3 (setup_sheet)`; alle `changeReason === 'Erstimport Altbestand'`; `createPart` ohne `part_number`; Kommentar `Erstimport aus Altbestand (Ordner KD00000 FIRMA\HG_TEIL-0001_A_Halter Links)`
  - Probelauf ungültig → kein `create*`-Aufruf, `ok === false`, Schritt `probelauf` mit `error`
  - Wiederaufnahme: Programm vorhanden (Status `released`), Einrichteblatt fehlt → kein `dryRunCmm`, kein `createCmmProgram`, keine Programm-Freigabe, Einrichteblatt angelegt und freigegeben
  - Fehler beim zweiten von drei Fotos → `ok === false`; zweiter Lauf mit dem Zustand aus dem ersten lädt nur Foto 2 und 3 hoch
  - `release: false` → kein `workflowChange`
  - Programm im Status `rejected` → Schritt `freigabe_programm` mit `error`, Meldung enthält `von Hand`
  - `partChoice: 'skip'` → keine Aufrufe
  - Blatt freigegeben, ein Foto fehlt, die Fake-API setzt beim Upload auf `draft` → danach `workflowChange`×3 für `setup_sheet`
  - vorhandenes Haupt-CAD → neues CAD mit `is_primary_cad: false`
  - `releasePath`: Tabelle wie oben
- [ ] **Step 2: Run** `cd backend && node tests/test-legacy-import-run.js` — Expected: FAIL, Modul nicht gefunden.
- [ ] **Step 3: Implement** `runImport.js` nach Interfaces und Ablauf.
- [ ] **Step 4: Run** `cd backend && node tests/test-legacy-import-run.js && npm test` — Expected: alle ✓.
- [ ] **Step 5: Commit** `feat: Altbestand-Import – Ablauf Übernehmen mit Wiederaufnahme und Freigabe`

### Task 6: Übernehmen auf der Seite

**Files:**
- Modify: `frontend/src/utils/legacyImport/api.js` (schreibende Funktionen)
- Modify: `frontend/src/pages/LegacyImportPage.jsx`, `frontend/src/components/legacyImport/LegacyImportRow.jsx`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `importProgram`, `loadImportState`, `RELEASE_REASON` (Task 5), Probelauf ohne Arbeitsgang (Task 4)
- Produces: api.js ergänzt um die Funktionen aus Task 5 mit diesen Endpunkten:
  - `dryRunCmm`: `POST /api/programs/cmm?dry_run=true`, FormData mit `files`, `template_files`, `calibration_files` wie `programsStore.uploadCmm` → `data`
  - `createCmmProgram`: `POST /api/programs/cmm` → `data`
  - `createPart`: `POST /api/parts` → `part`
  - `createOperation`: `POST /api/operations` → `data`
  - `createSetupSheet`: `POST /api/setup-sheets` → Datensatz aus `data`
  - `uploadSetupPhoto`: `POST /api/setup-sheets/:id/photos`, Feld `photo`
  - `uploadPartDocument`: `POST /api/parts/:id/documents`, Feld `file`, `document_type`, `is_primary_cad`
  - `workflowChange`: `POST /api/workflow/change` mit `{ entityType, entityId, toStateId, changeReason }`

- [ ] **Step 1: api.js ergänzen.** `createSetupSheet` und `getSetupSheet`: Die Antwortform vorher an der laufenden Dev-API mit einem Aufruf prüfen und im Code als Kommentar festhalten.
- [ ] **Step 2: Seite.**
  - Bereich „Vorgaben für neue Arbeitsgänge“: OP-Nummer, Name, Arbeitsgang-Typ. Vorbelegt aus `localStorage` (`mds.legacyImport.opDefaults`), beim ersten Mal `KMG`, `Messen`, kein Typ. `enabled_features` = Vorgaben des Typs plus `programs`, `setup_sheet`, `documents`, ohne Doppelte.
  - Schalter „Direkt freigeben“, eingeschaltet, nur mit `program.release`.
  - Knopf „Übernehmen“ je Zeile, dazu Auswahlkästchen und „Markierte übernehmen“. Die Programme laufen nacheinander. Je Zeile werden die Schritte mit ✓ oder dem Fehler angezeigt, danach wird `importState` neu geladen und der Status neu berechnet.
  - Zeilen mit Status `error` oder `imported` lassen sich nicht übernehmen. Fehlt die Maschinen-Zuordnung, ist „Übernehmen“ gesperrt.
- [ ] **Step 3: CHANGELOG** `Added`: „Altbestand übernehmen: Übernehmen je Programm oder für markierte (Bauteil, Mess-Arbeitsgang, Messprogramm, Einrichteblatt mit Fotos, Dokumente), Wiederaufnahme nach Abbruch, optional direkt freigeben mit Grund „Erstimport Altbestand““; `Changed`: „Messprogramm-Probelauf geht ohne Arbeitsgang“.
- [ ] **Step 4: Build und Lint** wie Task 3 Step 5.
- [ ] **Step 5: UI-Test gegen das Wegwerf-Backend** mit dem Fixture aus Task 3, Admin mit allen Rechten:
  - Zeile 1 übernehmen → alle Schritte ✓. In der DB:
    - Bauteil mit erzeugter `part_number`, `customer_part_number = 'TEIL-0001'`, `revision = 'A'`
    - Arbeitsgang an der KMG-Maschine
    - Programm `released` mit gesetztem `released_revision_id`
    - Einrichteblatt freigegeben mit Stand 1 und einem Foto
    - Bauteil-Dokumente `.stp` (Haupt-CAD) und `.tif`
    - `workflow_history` mit `Erstimport Altbestand`
  - Wiederaufnahme: `setup_sheet_photos` des Blatts löschen, neu einlesen → Status „teilweise“, Übernehmen lädt nur das Foto hoch. Das Blatt fällt dadurch auf Entwurf und wird wieder freigegeben, Stand 2.
  - Mit dem Test-Leser plus `part.create`, `setup_sheet.update`, `program.upload`, aber ohne `program.release`: kein Schalter, Programm bleibt Entwurf.
- [ ] **Step 6: Commit** `feat: Altbestand-Import – Übernehmen auf der Seite`, danach PR B.

---

## PR C – Archiv

### Task 7: Archiv-Skript erzeugen

**Files:**
- Create: `frontend/src/utils/legacyImport/archiveScript.js`
- Test: `backend/tests/test-legacy-import-archive.js`

**Interfaces:**
- Produces:
  - `validateArchiveSettings({ sourceRoot, archiveRoot }) → string[]` (Fehlermeldungen). Beide nötig; gleich (ohne Groß/klein, ohne abschließendes `\`) → Fehler; Archiv innerhalb der Quelle → Fehler `Archivordner darf nicht im Quellordner liegen`.
  - `buildArchiveScript({ sourceRoot, archiveRoot, entries: {customerFolder, programFolder}[], createdAt: string }) → string` ohne BOM. Die Seite stellt `\uFEFF` voran.

Skript-Inhalt: `param([switch]$Probe)`, `$ErrorActionPreference = 'Stop'`, Kopfkommentar mit `createdAt` und Aufruf (`powershell -ExecutionPolicy Bypass -File altbestand-archiv.ps1 -Probe`), `$Quelle`/`$Archiv` als Literale in einfachen Anführungszeichen, ein Array der Einträge (`@{ Kunde = '…'; Programm = '…' }`). Je Eintrag: Quelle fehlt → Meldung, weiter. Ziel `<Archiv>\<Kunde>\<Programm>` existiert → `übersprungen, Ziel vorhanden`, weiter. `$Probe` → nur `würde verschieben: …`. Sonst Kundenordner im Archiv anlegen (`New-Item -ItemType Directory -Force`) und `Move-Item -LiteralPath`, `try/catch` je Eintrag. Jede Zeile auf die Konsole und ins Protokoll `altbestand-archiv_<yyyyMMdd-HHmmss>.log` neben dem Skript (`$PSScriptRoot`). Am Ende eine Zusammenfassung mit verschoben/übersprungen/Fehler.

- [ ] **Step 1: Write the failing tests**, je ein `test(...)`:
  - `validateArchiveSettings`: leer → 2 Fehler; `Z:\KMG\Programme` und `z:\kmg\programme\` → Fehler „gleich“; Archiv `Z:\KMG\Programme\_Archiv` → Fehler `im Quellordner`; `Z:\KMG\Programme` + `Z:\KMG\Archiv` → `[]`
  - Skript enthält `param([switch]$Probe)`, `-LiteralPath`, `Test-Path -LiteralPath`, `$PSScriptRoot`, kein `-Force` bei `Move-Item`
  - Eintrag `KD00000 FIRMA` / `HG_TEIL-0001_A_Halter [alt] O'Neil Ü` steht als `'HG_TEIL-0001_A_Halter [alt] O''Neil Ü'` im Skript
  - zwei Einträge → zwei Zeilen im Array, Reihenfolge wie übergeben
  - Pfade enthalten keine `/`
- [ ] **Step 2: Run** `cd backend && node tests/test-legacy-import-archive.js` — Expected: FAIL, Modul nicht gefunden.
- [ ] **Step 3: Implement** `archiveScript.js`.
- [ ] **Step 4: Run** `cd backend && node tests/test-legacy-import-archive.js && npm test` — Expected: alle ✓.
- [ ] **Step 5: Commit** `feat: Altbestand-Import – Archiv-Skript (PowerShell)`

### Task 8: Archiv-Einstellungen auf der Seite, Doku

**Files:**
- Create: `frontend/src/components/legacyImport/ArchiveSettings.jsx`
- Modify: `frontend/src/pages/LegacyImportPage.jsx`
- Modify: `CHANGELOG.md`, `docs/konzepte/MESSPROGRAMME_KONZEPT.md` (5.5), `ROADMAP.md` (Messprogramme Schritt 7)

**Interfaces:**
- Consumes: `validateArchiveSettings`, `buildArchiveScript` (Task 7), Zeilenstatus `imported` (Task 2)

- [ ] **Step 1: ArchiveSettings.**
  - Felder Quellordner und Archivordner, gespeichert in `localStorage` (`mds.legacyImport.archive`).
  - Meldungen aus `validateArchiveSettings` direkt unter den Feldern.
  - Knopf „Archiv-Skript (n Programme)“, n = Zeilen mit Status `imported`. Gesperrt bei n = 0 oder bei Meldungen.
  - Download als `altbestand-archiv.ps1` mit BOM über einen Blob (kein Server-Aufruf).
  - Darunter der Aufruf mit `-Probe` als Hinweis zum Kopieren.
- [ ] **Step 2: Doku.**
  - Konzept 5.5: Verweis auf die Spec und die Feststellung, dass der Weg über den Browser-Helfer statt über den Agenten geht.
  - ROADMAP Schritt 7: Stand mit den PRs.
  - CHANGELOG `Added`: „Altbestand übernehmen: Archivordner einstellen und PowerShell-Skript erzeugen, das übernommene Programmordner ins Archiv verschiebt (Testmodus `-Probe`)“.
- [ ] **Step 3: Build und Lint** wie Task 3 Step 5.
- [ ] **Step 4: UI-Test.** Nach Task 6 Step 5 Quelle `Z:\KMG\Programme` und Archiv `Z:\KMG\Archiv` eintragen. Download auslösen (Playwright `waitForEvent('download')`).
Expected: Datei beginnt mit BOM (`EF BB BF`), enthält den Eintrag für `HG_TEIL-0001_A_Halter Links`, nicht aber den Eintrag für das Programm ohne `.prg`. Archiv `Z:\KMG\Programme\_Archiv` → Meldung, Knopf gesperrt. Ausführen unter Windows macht der Nutzer am Arbeitsrechner, zuerst mit `-Probe` an einer Kopie (Spec 9).
- [ ] **Step 5: Commit** `feat: Altbestand-Import – Archiv-Einstellungen und Skript-Download`, danach PR C.

---

## Abschluss

Nach PR C: Prüfung des ganzen Stands durch einen unabhängigen Reviewer, wie beim Einrichteblatt. Danach Probelauf des Nutzers an wenigen Programmen. Das Release macht der Nutzer auf „Release machen“.
