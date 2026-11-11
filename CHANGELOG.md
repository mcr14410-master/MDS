# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

---

> **Hinweis:** Die Einträge 1.1.0 – 2.5.0 wurden am 2026-10-06 nachträglich aus der Git-Historie
> (Commits + Pull Requests) rekonstruiert. Versionsnummern folgen den damaligen Branch-Namen
> (`dev/vX.Y.Z-…`); 1.1.0–1.3.0 und 2.5.0 wurden nachträglich vergeben.

---

## [Unreleased]

---

## [2.27.3] - 2026-11-12 - Rechte und Uhrzeiten bei Programmen

### Für Anwender
- Programme und Bauteil-Dokumente beachten jetzt die Rechte aus der Benutzerverwaltung: Neue Programme anlegen, neue Versionen hochladen, Programme bearbeiten oder löschen und Dokumente ändern kann nur, wer das jeweilige Recht hat. Wer ein Recht nicht hat, sieht den Knopf dafür nicht mehr.
- Wer neue Versionen hochladen darf, sieht dafür jetzt auch den Knopf an der Programmkarte – bisher war er an Bauteil-Rechte gebunden.
- Uhrzeiten und Datum bei Messprogrammen und Einrichteblättern stimmen jetzt: Bisher erschienen sie 1–2 Stunden zu spät, ein Upload kurz vor Mitternacht stand beim nächsten Tag. Vorhandene Einträge werden beim Update richtiggestellt.
- Ändern zwei Personen gleichzeitig ein freigegebenes Einrichteblatt, geht die zweite Änderung nicht mehr mit „nicht gefunden“ verloren.

### Fixed
- Programme: Schreibrouten prüfen die Rechte – Anlegen (`POST /api/programs`, `/cmm`, auch Probelauf) `program.create`, neue Version (`/:id/revisions`, `/:id/cmm-revisions`) `program.upload`, Ändern und Zurückrollen `program.update`, Löschen `program.delete`. Bisher reichte die Anmeldung, auch eine reine Leserolle konnte hochladen, ändern und löschen. Prüfung vor multer, ohne Recht wird keine Datei abgelegt
- Bauteil-Dokumente: Hochladen, Ändern, Löschen und Hauptdokument setzen prüfen `part.update`
- Oberfläche: Programm-Knöpfe hingen an `part.update`/`part.delete` statt an den Programmrechten; jetzt dieselben Rechte wie im Backend (auch Zurückrollen in der Versionsliste und die Dokument-Aktionen). Der Altbestand-Import verlangt zusätzlich `program.create` und `part.update`
- Zeitstempel im Modul Programme: Migration `1737000129000` stellt `programs.created_at`/`updated_at`, `program_revisions.created_at`/`released_at`, `workflow_history.created_at`, `setup_sheets.created_at`/`updated_at` und `setup_sheet_photos.uploaded_at` auf `timestamptz`. Altdaten je Schreiber: zentraler Pool (Messprogramme, Einrichteblätter) Berliner Zeit, eigene Pools (NC-Programme, Statuswechsel, Variantenkopie) UTC; den Schreiber von `updated_at` erkennt die gleiche Transaktionszeit. Regeln vorher in Produktion gegen Audit-Log und Messprogramm-Dateien geprüft. `programsController` und `workflowController` nutzen jetzt `config/db`, die Ausgleichsrechnungen (`AT TIME ZONE` in der Versionshistorie, `now() AT TIME ZONE 'UTC'` beim Rückfall des Einrichteblatts) entfallen. Rückweg (down) stellt einheitlich UTC her, nicht den gemischten Stand
- Einrichteblatt: `withSheetChange`/`restoreVersion` sperren die Zeile ohne Join (`lockSheet`). Mit Join fiel das Blatt bei einer wartenden zweiten Änderung nach einem Statuswechsel aus der Sperrabfrage (Postgres prüft den Join mit der alten Statuszeile), die Änderung endete mit 404

---

## [2.27.2] - 2026-11-10 - Backup-Status

### Für Anwender
- Der Backup-Status im MDS ist jetzt wirklich wieder grün – die Korrektur aus 2.27.1 griff noch nicht. Die Sicherungen selbst waren die ganze Zeit in Ordnung.

### Fixed
- Backup-Monitor: Der Backend-Container bekommt per `group_add` in `compose.yaml` die Gruppe `BACKUP_READ_GID` (Standard 1001), damit er die Dumps (root:1001, 640, seit 2.27.1) lesen kann. Der Benutzer `nodejs` im Image gehört nur zu `nogroup` (65533) – 2.27.1 setzte die Gruppe 1001 auf den Dateien, aber niemand im Container hatte sie, der Monitor meldete weiter EACCES

---

## [2.27.1] - 2026-11-10 - Backup-Status, Preset 0, Bauteilliste

### Für Anwender
- Der Backup-Status im MDS ist wieder grün: Seit 2.27.0 konnte die Prüfung die Sicherungen nicht mehr lesen, die Sicherungen selbst waren in Ordnung.
- Einrichteblatt: Preset 0 lässt sich jetzt eingeben und wird angezeigt.
- Eine Datei ins Fenster „Messprogramm hochladen“ zu ziehen, lässt das Fenster nicht mehr springen.
- Die Bauteilliste zeigt in der Tabellen- und der Kartenansicht klein die Kunden-Zeichnungsnummer unter der Bezeichnung und die Kundennummer beim Kunden.

### Changed
- Bauteile, Tabellen- und Kartenansicht: Kunden-Zeichnungsnummer (`customer_part_number`) unter der Bezeichnung, Kundennummer beim Kunden (Tabelle darunter, Karte in Klammern) – klein und nur, wenn gesetzt

### Fixed
- `scripts/backup.sh`: Dumps jetzt root:1001 mit 640 statt root:600 (2.27.0) – der Backup-Monitor entpackt jeden Dump zur Prüfung und läuft im Backend-Container als `nodejs` (1001), er bekam EACCES und meldete „Letztes gültiges Backup: keins“. Gruppe über `BACKUP_READ_GID` änderbar; ältere Dumps werden mit umgestellt
- Einrichteblatt: Preset-Nummer nimmt 0 an (`min=0`, ohne Obergrenze 99, Beschriftung ohne „(1-99)“); Karte und Detailansicht zeigen Preset 0 (Prüfung `!= null` statt Wahrheitswert)
- Arbeitsgänge: Die Karte (Umsortieren per Drag) hebt sich nur noch beim Ziehen eines Arbeitsgangs hervor. Vorher reagierte sie auch auf Dateien – `scale-[1.01]` machte sie zum Bezugsrahmen des `fixed`-Fensters „Messprogramm hochladen“ darin, das Fenster sprang aus der Bildmitte und flackerte beim Ziehen über den Rand. Dateien außerhalb einer Ablagefläche werden in der Karte abgelehnt, damit der Browser sie nicht öffnet

---

## [2.27.0] - 2026-11-09 - Bauteile: Drag & Drop, Suche, Variante kopieren

### Für Anwender
- Die Nummer eines gelöschten Bauteils wird nicht mehr neu vergeben. „Auto“ schlägt die nächste freie Nummer vor, statt beim Anlegen mit einer unverständlichen Datenbank-Meldung abzubrechen.
- Bauteil-Dokumente lassen sich per Drag & Drop hochladen (Dateien auf die gestrichelte Fläche ziehen), und die Suche auf der Bauteile-Seite findet auch die Kunden-Zeichnungsnummer und die Zeichnungsnummer.
- Einrichteblatt: Preset 0 und Nullpunkt-Werte 0 bleiben beim Speichern erhalten (vorher wurden sie geleert, ein freigegebenes Blatt fiel dadurch auf Entwurf).
- Die Bauteilseite passt jetzt aufs Handy, und eine Zykluszeit mit zwei Nachkommastellen lässt sich wieder speichern.
- Variante anlegen: „Einrichteblatt kopieren“ und „Prüfplan kopieren“ funktionieren wieder. Das Einrichteblatt kommt als Entwurf für die neue Maschine mit Spannmitteln, Vorrichtungen und Fotos, aber ohne Programm. NC-Programme und Werkzeuglisten werden nicht mehr angeboten, weil sie zur Maschine gehören.

### Added
- Bauteil-Dokumente: Drag & Drop auf die Upload-Fläche (`PartDocuments`), Hervorhebung beim Ziehen, nur Dateien werden angenommen; Arbeitsgang- und Maschinen-Dokumente nehmen Dateien schon über das sichtbare Dateifeld an

### Fixed
- Bauteile: „# Auto“ (`generatePartNumber`, Auto-Vergabe in `createPart`) und die Doppelt-Prüfung beim Anlegen/Ändern berücksichtigen gelöschte Bauteile (Soft-Delete) – vorher Vorschlag der gelöschten Nummer und 500 durch `parts_part_number_key`; Eingabe einer gelöschten Nummer → 409 mit Hinweis, Unique-Verletzung (gleichzeitiges Anlegen) → 409; Integrationstest `test-bauteilnummer-geloescht.js`
- Bauteile-Suche (`getAllParts`) durchsucht zusätzlich `customer_part_number` und `drawing_number`; Platzhalter im Suchfeld angepasst; Integrationstest `test-bauteile-suche.js`
- Einrichteblatt: Preset/Nullpunkt 0 – Formular belegte mit `|| ''` vor und wandelte beim Speichern mit `x ? parse(x) : null`, Anlegen im Backend mit `|| null`; jetzt `frontend/src/utils/setupSheetForm.js` (0 bleibt, leer → null) und `emptyToNull` in `createSetupSheet`; Tests `test-setup-sheet-form.js`, `test-einrichteblatt-werte.js`
- Einrichteblatt: Bildunterschrift (`PUT …/photos/:photoId`) und Notiz an Spannmittel/Vorrichtung (`PUT …/clamping-devices|fixtures/:itemId`) werden nur geschrieben, wenn sie im Request stehen; `null` oder `''` leert (vorher `COALESCE`, `null` ließ den alten Wert stehen)
- Arbeitsgang: Zykluszeit-Feld mit `step="any"` statt `0.1` – Werte wie 2.61 min (aus Sekunden umgerechnet) galten als ungültig und blockierten das Speichern ohne sichtbare Meldung; gespeichert wird weiter auf ganze Sekunden
- Bauteilseite auf Handybreite: Reiterleiste scrollt in sich (`overflow-x-auto`, „Historie“ ragte 85 px hinaus), Status und Knöpfe rutschen unter den Titel (vorher Titel bis auf ein Zeichen abgeschnitten)
- Variante anlegen (`POST /api/operations/:id/create-variant`): alle vier Kopierpfade schrieben in alte Spalten (`programs.name`, `setup_sheets.title`, `inspection_plans.name`, `tool_lists.operation_id`) – Haken angehakt → 500, Variante nicht angelegt. Neu `services/variantCopy.js`: Einrichteblätter als Entwurf (neue Maschine, `program_id` leer, ohne Stände), Spannmittel/Vorrichtungen (ohne gelöschte), Fotos als eigene Datei im Ordner des neuen Blatts (fehlende Datei übersprungen, Meldung im Dialog; bei Fehler Rollback samt Dateien); Prüfplan samt Merkmalen. `copy_programs`/`copy_tools` entfallen (Entscheidung Nutzer 09.11.2026: maschinenspezifisch), Dialog angepasst; Integrationstest `test-variante-kopieren.js`
- `scripts/backup.sh`: Dumps mit `umask 077` (600), ältere Dumps werden auf 600 nachgezogen; der Backup-Monitor liest nur Dateiliste, Größe und Datum
- Integrationstest `test-zeitmodell-aenderung.js` („Künftig datiert“) war datumsabhängig rot: Urlaub 19.12.–01.01. enthält nur Freitage, die Feiertage sind – das 4-Tage-Modell ändert dann nichts. Zeitraum auf 3 Wochen verlängert (immer ein normaler Freitag); Code unverändert

---

## [2.26.0] - 2026-11-08 - Altbestand: mehrere Messprogramme je Ordner

### Für Anwender
- Altbestand übernehmen: Liegen in einem Programmordner mehrere Messprogramme in Unterordnern (z. B. für FAI, verschiedene Aufspannungen oder Fertigungsstände), wird jedes ein eigenes Messprogramm mit eigenem Mess-Arbeitsgang und Einrichteblatt.
- Je Programm lassen sich OP-Nummer und Name ändern oder das Programm abwählen. Fotos und Excel-Vorlage ordnest du einem Programm zu, die gestempelte Zeichnung kommt in jedes.
- Ordner, die schon übernommen sind, werden weiter erkannt. Fehlen dort noch Unterordner-Programme, steht die Zeile auf „Teilweise übernommen“ und sie lassen sich nachholen.

### Added
- Altbestand übernehmen: mehrere Messprogramme in einem Programmordner – jeder Ordner im Messprogramm-Ordner, der direkt eine `.prg` enthält (beliebig tief, z. B. `Messprogramm_FAI`, `Messprogramm_Fertigung/AG1`), wird ein eigenes Messprogramm mit eigenem Mess-Arbeitsgang und Einrichteblatt. Je Programm abwählbar, OP-Nummer und Name änderbar (Vorgabe „Messen <Bezeichnung>“); Fotos und Excel-Vorlage (aus einem Ordner ohne `.prg`, z. B. `Vorlage`) einem Programm zuordnen; gestempelte Zeichnung und Kalibrierprogramm in jedem. Herkunftsvermerk je Programm mit Unterordner-Pfad; Wiedererkennen, Teil-Übernahme, Status und Archiv je Programm. Ein Programm direkt im Messprogramm-Ordner verhält sich wie bisher. Schutz: Programm eines anderen Altbestand-Ordners an einem Mess-Arbeitsgang des Bauteils sperrt die Zeile; dieselbe Excel-Vorlage an zwei Programmen oder mehrere an einem ist ein Fehler; Ordner wie „Alte Daten“ bleiben auch im Messprogramm-Ordner liegen; mit der alten Version übernommene Ordner gelten erst als vollständig, wenn auch ihre Unterordner-Programme übernommen sind

### Changed
- Altbestand übernehmen: Dateien in Unterordnern des Messprogramm-Ordners werden nicht mehr pauschal aussortiert (Unterordner mit `.prg` = eigenes Messprogramm, Excel-Vorlagen wählbar, Übriges mit Grund „Unterordner ohne .prg“)

---

## [2.25.0] - 2026-11-08 - Altbestand: Wiedererkennen und Vorschläge

### Für Anwender
- Altbestand übernehmen: Schon übernommene Ordner werden beim erneuten Einlesen erkannt. Die damals eingetragenen Werte und die Dateiauswahl kommen aus dem MDS, die Zeile steht auf „Übernommen“ und kommt ins Archiv-Skript.
- Kunden-Teilenummer, Revision und Bezeichnung bieten Vorschläge aus dem Ordnernamen an (▾), Freitext geht weiterhin. Das hilft bei Ordnern, die anders benannt sind.
- Dateien, die damals weggelassen wurden, lassen sich nachträglich anhaken und übernehmen.

### Added
- Altbestand übernehmen: Kunden-Teilenummer, Revision und Bezeichnung mit Vorschlägen aus dem Ordnernamen (▾, Freitext bleibt) – hilft bei Ordnern mit anderem Schema, z. B. Kürzel am Ende oder Revision direkt an der Nummer (`utils/legacyImport/suggest.js`, `SuggestInput`)

### Fixed
- Altbestand übernehmen: Schon übernommene Ordner werden beim erneuten Einlesen am Herkunftsvermerk des Messprogramms erkannt. Kunde, Teilenummer, Revision, Bezeichnung und Bauteil kommen aus dem MDS, die Dateiauswahl richtet sich nach dem Stand im MDS. Vorher gingen Korrekturen und Auswahl beim Neuladen verloren: ein von Hand korrigierter Ordner erschien als „Neu“ (Gefahr eines zweiten Bauteils), ein Ordner mit abgewählten Dateien als „Teilweise übernommen“ und fehlte im Archiv-Skript

---

## [2.24.0] - 2026-11-08 - Altbestand: Auswahl je Datei mit Vorschau

### Für Anwender
- Altbestand übernehmen: Vor dem Übernehmen lässt sich je Datei festlegen, was ins MDS kommt – Dateien abwählen, PDFs als Prüfzeichnung, Bauteil-Dokument oder gar nicht übernehmen und das Haupt-CAD wählen.
- Jede Bild-, PDF- und 3D-Datei lässt sich vorher in der Vorschau ansehen, noch bevor etwas hochgeladen wird.
- Eine kurze Übersicht pro Programm zeigt auch bei zugeklappter Zeile, was übernommen wird. Ein Messprotokoll im Messprogramm-Ordner wird nicht mehr automatisch zur Prüfzeichnung.

### Added
- Altbestand übernehmen: Auswahl je Datei vor dem Übernehmen – Dateien abwählen, PDFs als Prüfzeichnung, Bauteil-Dokument oder gar nicht übernehmen, Haupt-CAD festlegen; Kurzfassung („1 Prüfzeichnung · 2 CAD · 3 Fotos“) auch bei zugeklappter Zeile; Vorschau für Bilder, PDFs und 3D-Modelle direkt aus dem eingelesenen Ordner, noch vor dem Hochladen (`utils/legacyImport/selection.js`, `FileSelection`, `LocalFilePreview`)

### Changed
- Altbestand übernehmen: PDF im Messprogramm-Ordner ist abgewählt, wenn es eine Zeichnung im Zeichnungs-Ordner gibt (war oft ein Messprotokoll und landete als Prüfzeichnung); Haupt-CAD-Vorschlag ist das Modell mit der Kunden-Teilenummer im Namen, sonst das alphabetisch erste (vorher das erste in der zufälligen Reihenfolge des Browsers)
- Altbestand übernehmen, Archiv: Beispieltexte in Quell- und Archivordner beginnen mit „z. B.“ und sind kursiv und blasser (sahen wie eingetragene Werte aus); Hinweis, dass der Quellordner der Ordner mit den Kundenordnern ist

---

## [2.23.0] - 2026-11-08 - Altbestand-Import, mehrere Fotos auf einmal

### Für Anwender
- Messprogramme: Neue Seite „Altbestand übernehmen“. Sie liest einen Ordner mit alten Messprogrammen ein, zeigt je Programm, was wohin übernommen wird, und legt Bauteil, Mess-Arbeitsgang, Messprogramm, Einrichteblatt mit Fotos und Dokumente auf Knopfdruck an, auf Wunsch gleich freigegeben. Danach erzeugt sie ein Skript, das die übernommenen Ordner ins Archiv verschiebt.
- Einrichteblatt: Mehrere Fotos lassen sich auf einmal hochladen, per Mehrfachauswahl oder Ablegen.
- PDF-Dokumente lassen sich direkt drucken. Arbeitsgang-Dokumente haben jetzt dieselbe Vorschau wie Bauteile und Maschinen, Bilder zeigen ein Vorschaubild.
- Dateinamen mit Umlauten werden beim Hochladen richtig gespeichert (vorher wurde aus „Rückseite“ „RÃ¼ckseite“).

### Added
- Altbestand übernehmen: Quell- und Archivordner einstellen (im Browser gespeichert) und PowerShell-Skript `altbestand-archiv.ps1` erzeugen, das vollständig übernommene Programmordner ins Archiv verschiebt – überschreibt nie, Testmodus `-Probe`, Protokoll neben dem Skript; bricht ab, ohne etwas zu verschieben, wenn die Kopfzeile beschädigt ist (sonst käme `-Probe` nicht an)
- Altbestand übernehmen: Übernehmen je Programm oder für markierte – Bauteil (Nummer erzeugt, Kunden-Teilenummer aus dem Ordner), Mess-Arbeitsgang, Messprogramm, Einrichteblatt mit Fotos, Bauteil-Dokumente. Jeder Schritt prüft, ob es das Ergebnis schon gibt (Wiederaufnahme nach Abbruch); optional direkt freigeben mit Grund „Erstimport Altbestand“ (nur mit `program.release`). Zwei Programmordner für dasselbe Bauteil an derselben Messmaschine werden nicht zusammengelegt: Der zweite ist als Fehler markiert, ein später eingelesener Ordner erkennt das schon übernommene Messprogramm am Herkunftsvermerk (Beschreibung) und wird gesperrt
- Messprogramme: Seite „Altbestand übernehmen“ liest einen Ordner vom Netzlaufwerk ein und zeigt je Programm, was wohin übernommen würde – Kunde, Kunden-Teilenummer, Revision und Bezeichnung aus dem Ordnernamen, Abgleich mit vorhandenen Bauteilen, Dateien je Ziel und was liegen bleibt. Ordner werden über ein Import-Profil mit Stichwörtern erkannt (`utils/legacyImport/`)
- Einrichteblatt: mehrere Fotos auf einmal hochladen (Mehrfachauswahl oder Ablegen), nacheinander mit Fortschritt „Foto n von m“
- Arbeitsgang-Dokumente: Vorschau wie bei Bauteil und Maschine (`DocumentPreview`), neuer Endpunkt `GET /api/operation-documents/:id/view` (inline, Pfad auf den Ordner der Arbeitsgang-Dokumente begrenzt)
- Vorschaubild für Bild-Dokumente bei Bauteilen, Maschinen und Arbeitsgängen über die gemeinsame Komponente `DocumentThumbnail`
- Drucken für PDF-Dokumente: Knopf neben dem Download bei Hauptzeichnung und Hauptdokumenten (Bauteil-Details), Bauteil-Dokumenten und Arbeitsgang-Dokumenten. `printFileViaApi` lädt das PDF mit Token in ein unsichtbares iframe und öffnet den Druckdialog (Rückfall: neuer Tab), gemeinsame Komponente `PrintPdfButton`

### Changed
- Messprogramm-Probelauf (`POST /api/programs/cmm?dry_run=true`) geht ohne Arbeitsgang
- Arbeitsgang-Dokumente: Download über `downloadFileViaApi` wie im übrigen MDS

### Fixed
- Dateinamen mit Umlauten beim Hochladen: multer/busboy lieferten `originalname` als latin1, „Rückseite.jpg“ wurde als „RÃ¼ckseite.jpg“ gespeichert (Einrichteblatt-Fotos, Dokumente bei Bauteilen, Maschinen, Arbeitsgängen, Kunden, Werkzeugen, Spannmitteln, Vorrichtungen, Wiki, Wartung, Kalibrierungen, Verbrauchsmaterial). Neuer Helfer `utils/multer.js` rechnet vor Filter und Speicherung nach UTF-8 um; alle Module laden multer nur noch darüber (Test wacht darüber). Schon gespeicherte falsche Namen bleiben vorerst

---

## [2.22.0] - 2026-11-08 - Dokumentvorschau, Revision als Pflichtfeld

### Für Anwender
- Dokumente an Bauteilen und Maschinen lassen sich jetzt direkt ansehen: Fotos groß, PDF-Zeichnungen im Fenster und 3D-Modelle in der 3D-Ansicht.
- Beim Anlegen eines Bauteils ist die Revision ein Pflichtfeld und nicht mehr mit „A“ vorbelegt. Teile ohne Zeichnungsindex bekommen „-“.
- Mehrere Arbeitsgänge mit demselben OP-Code sind möglich, das Formular weist nur darauf hin. Der Reiter „Arbeitsgänge“ zeigt die Anzahl.
- Messprogramme: Ein Vorschaubild (.jpg mit dem Namen des Messprogramms) wird mit hochgeladen und erscheint am Mess-PC in PC-DMIS. Die Programmkarten nutzen bei schmalem Fenster den Platz besser.

### Added
- Bauteil- und Maschinen-Dokumente: Vorschau über die gemeinsame Komponente `DocumentPreview` – Bilder in der Lightbox (Bauteile zusätzlich mit Vorschaubild in der Liste), PDF im PDF-Viewer, 3D-Modelle (STEP, STL, IGES …) im StepViewer. Neuer Endpunkt `GET /api/parts/:partId/documents/:documentId/view` (inline, Pfad auf den Ordner der Bauteil-Dokumente begrenzt)
- Messprogramme: PC-DMIS-Vorschaubild (`.jpg`/`.jpeg` mit dem Namen der `.prg`) wird als Begleitdatei versioniert und bereitgestellt; Bilder mit anderem Namen werden mit Hinweis aufs Einrichteblatt aussortiert
- Bauteil: Anzahl der Arbeitsgänge auf dem Reiter (Varianten zählen einmal, wie im Kopf der Liste)

### Changed
- Arbeitsgang: Gleicher OP-Code an einem Bauteil ist erlaubt; das Formular zeigt nur einen Hinweis. Die Prüfung im Controller war ein Überbleibsel (Constraint seit Migration `1737000072000` entfernt)
- Arbeitsgänge-Liste: Kopf zählt Varianten einmal
- Karten von NC-Programmen, Messprogrammen und Einrichteblättern richten sich nach dem verfügbaren Platz (Mindestbreite) statt nach der Fensterbreite
- Bauteilseite: Download von Hauptzeichnung und CAD-Datei über `downloadFileViaApi` wie im übrigen MDS

### Fixed
- Bauteil: Die Revision wird nicht mehr mit „A“ vorbelegt und ist Pflichtfeld in Formular und Backend (ohne Index z. B. „-“). Vorher wurde ein leeres Feld still zu „A“, beim Ändern ließ sie sich nicht leeren

---

## [2.21.0] - 2026-11-07 - Einrichteblatt-Freigabe und Stände

### Für Anwender
- Einrichteblätter laufen jetzt durch dieselbe Freigabe wie Programme: Entwurf, zur Prüfung, geprüft, freigegeben. Im Reiter „Ablauf“ steht, wer wann welchen Schritt gemacht hat.
- Jede Freigabe sichert den Stand des Blatts samt Fotos und Spannmitteln. Wird ein freigegebenes Blatt geändert, ist es wieder Entwurf, bis es neu freigegeben wird. Der freigegebene Stand bleibt im Reiter „Stände“ abrufbar, und man kann auf ihn zurückgehen.
- Wer Einrichteblätter bearbeiten darf, wird über ein eigenes Recht in der Benutzerverwaltung festgelegt. So können zum Beispiel auch Bediener Fotos ergänzen, ohne Programme ändern zu dürfen.
- Die Karte eines Einrichteblatts hat einen Knopf „Öffnen“ und zeigt die Anzahl der Fotos. Die Maschine kommt automatisch aus dem Arbeitsgang, und auch Messprogramme lassen sich zuordnen.

### Added
- Einrichteblatt: Freigabe wie bei Programmen (Entwurf → In Prüfung → Geprüft → Freigegeben), mit Reiter „Ablauf“ (Name, Uhrzeit, Grund). Jede Freigabe sichert einen Stand in `setup_sheet_versions` (Formularfelder, Spannmittel, Vorrichtungen, Fotos)
- Recht `setup_sheet.update` (Kategorie Programme) für Anlegen, Ändern, Fotos, Spannmittel und Vorrichtungen. Migration `1737000128000` gibt es nur `admin`
- Server prüft beim Einrichteblatt die Statusschritte (ungültig → 409)
- Einrichteblatt: Reiter „Stände“ mit Ansicht jedes Stands (inkl. Fotos) und „Auf diesen Stand zurück“ (`program.release`). Vorher wird der aktuelle Inhalt als Sicherung abgelegt; zurück auf den zuletzt freigegebenen Stand → wieder Freigegeben, auf einen älteren oder wenn Verweise inzwischen gelöscht sind → Entwurf. Die Bestätigung nennt, was entfällt. Hinweis im Blatt und auf der Karte, solange der Inhalt nicht der freigegebene ist. Endpunkte `GET /api/setup-sheets/:id/versions[/:versionId]`, `…/photos/:index/view`, `POST …/restore`

### Changed
- Einrichteblatt: Jede inhaltliche Änderung außerhalb des Entwurfs setzt das Blatt auf Entwurf zurück und steht im Ablauf. Speichern ohne Änderung lässt es, wie es ist. Archivierte Blätter sind schreibgeschützt
- Einrichteblatt: `status` entfällt zugunsten von `workflow_state_id` (`active` → Freigegeben, mit Stand 1). Das Status-Feld im Formular entfällt, Status nur noch über `POST /api/workflow/change` (`program.release`)
- Einrichteblatt: Ein gelöschtes Foto bleibt als Datei erhalten, solange ein Stand es nennt
- Einrichteblatt: Ein Blatt mit Stand lässt sich nicht mehr löschen, nur archivieren (409)
- Einrichteblatt: Die Maschine kommt aus dem Arbeitsgang und wird im Formular nur angezeigt; ohne Maschine am Arbeitsgang lässt sich kein Blatt anlegen. Anzeige und Filter folgen einer späteren Änderung am Arbeitsgang (`setup_sheets.machine_id` bleibt vorerst als Altspalte)
- Einrichteblatt-Karte: Knopf „Öffnen“, Icons wie auf den Programmkarten, Fotoanzahl immer sichtbar. Nach dem Anlegen öffnet sich das neue Blatt direkt bei den Fotos
- Einrichteblatt-Formular: Feld „Programm (optional)“ statt „NC-Programm“, weil auch Messprogramme zur Auswahl stehen

### Fixed
- Einrichteblatt: Anlegen, Ändern und Löschen prüfen jetzt Rechte auf dem Server (vorher nur die Anmeldung)
- Einrichteblatt: Felder und Programm lassen sich beim Bearbeiten leeren (vorher blieb der alte Wert)
- Einrichteblatt: Die Meldung „Unbekannter Steuerungstyp“ erscheint nicht mehr, zum Beispiel bei einer Messmaschine
- Einrichteblatt-Karte: Status-Knöpfe öffnen nicht mehr nebenbei die Detailansicht
- `scripts/deploy.sh`: Auf einem frischen Klon legte die Caddyfile-Prüfung `frontend/dist` über den Docker-Mount als root an, der Deploy brach danach bei `rsync` ab. Der Ordner wird jetzt vorher angelegt.

---

## [2.20.0] - 2026-11-06 - Programmnummern, Ablauf je Version

### Für Anwender
- Neue NC- und Messprogramme bekommen ihre Nummer nach festem Schema aus der Bauteilnummer: `KD00000-00004-1` für NC, `KD00000-00004-M1` für Messprogramme. Die Nummer bleibt bis an die Maschine gleich.
- Eine vergebene Nummer wird nie ein zweites Mal vergeben. Bis zur ersten Freigabe lässt sie sich ändern, danach ist sie fest.
- Messprogramme: Die Einstellungsdatei des alten Excel-Exports (.p2x) wird jetzt mit übernommen. Begleitdateien wie .p2x, Mini-Routinen oder die Prüfzeichnung lassen sich beim Hochladen mit „nicht übernehmen“ weglassen – man kann also einfach den ganzen Ordner hochladen.
- Auf den Programmkarten steht jetzt der Programm-Name oben, der Dateiname klein darunter.
- In der Versionshistorie lässt sich bei jeder Version der Ablauf aufklappen: wer sie wann hochgeladen, zur Prüfung gegeben, geprüft und freigegeben hat – bei einer Ablehnung mit Begründung.

### Added
- Programmnummern nach Schema (Spec `docs/konzepte/PROGRAMMNUMMERN_STUFE1_SPEC.md`, PR 1 Backend): fester Zähler je Bauteil und Art (`part_program_counters`, Migration mit Startwerten aus Nummern, die schon im Schema vorliegen), Vergabe in derselben Transaktion wie das Anlegen (NC und Messprogramm), Varianten übernehmen die Nummer aus der Variantengruppe, Eindeutigkeit ohne Groß-/Kleinschreibung (409 mit Bauteil und Arbeitsgang). `GET /api/programs/suggest-number?operation_id=&kind=` liefert den Vorschlag fürs Formular, ohne eine Nummer zu verbrauchen
- Feld „Programmnummer“ beim Hochladen (NC und Messprogramm, vorbelegt mit dem Vorschlag) und beim Bearbeiten (nach der ersten Freigabe schreibgeschützt mit Schloss); Programmkarten zeigen die Nummer (`ProgramNumberField`, PR 2)
- Messprogramme: `.p2x` (Einstellung des alten Excel-Exports) als Begleitdatei (Rolle `other`, Programmordner, Bezeichnung „Excel-Export-Einstellung (.p2x)“). Hochgeladene Begleitdateien (Prüfzeichnung, Mini-Routinen, `.p2x`) lassen sich beim Anlegen und bei neuen Versionen über `remove` weglassen („nicht übernehmen“, auch im Formular); gleichnamige Datei der Vorversion entfällt mit, `.prg`/`.cad`/Vorlage nicht. Temporäre Dateien weggelassener Uploads werden aufgeräumt
- Ablauf je Programmversion: `workflow_history.revision_id` (Migration, Altbestand über die Zeit zugeordnet, mit Umrechnung Berlin/UTC je Programmart), Statuswechsel merken die aktuelle Version, die Freigabe füllt `program_revisions.released_by/released_at`. `GET /api/programs/:id/revisions` liefert je Version `history` sowie Namen; Versionshistorie mit aufklappbarem „Ablauf“

### Changed
- `PUT /api/programs/:id`: Programmnummer ändern nur, solange das Programm nie freigegeben war (sonst 409), mit derselben Prüfung wie beim Anlegen. Bestehende Nummern (z. B. `CNC-M-001`) bleiben unverändert
- Programmkarten (NC und Messprogramm): Programm-Name als Überschrift, Dateiname darunter (vorher umgekehrt)
- `GET /api/programs/:id/revisions`: `created_at`/`released_at` als echte Zeitpunkte (Messprogramm-Versionen stehen in Berliner Zeit in der DB, NC-Versionen in UTC) – Messprogramm-Versionen wurden in Produktion 1–2 h zu spät angezeigt

---

## [2.19.2] - 2026-11-05 - Versionsstatus, Selbsttest

### Für Anwender
- Im Versionsverlauf von NC- und Messprogrammen steht bei jeder Version ihr Status auf Deutsch. Eine früher freigegebene, inzwischen ersetzte Version heißt „Abgelöst“.
- Wer auf die freigegebene Version zurückgeht, hat das Programm wieder „Freigegeben“ – bei jeder anderen Version muss neu freigegeben werden.
- Agentenverwaltung: Findet der Agent am Mess-PC seinen Ordner nicht, steht das jetzt verständlich da (mit Hinweis, wo der Pfad zu sehen ist).

### Fixed
- Versionsverlauf (NC- und Messprogramme): Jede Version zeigt ihren Status auf Deutsch („Entwurf“, „In Prüfung“ …) statt immer `draft`. Ein Statuswechsel am Programm gilt jetzt auch für die aktuelle Version (`workflowController`), eine früher freigegebene Version heißt „Abgelöst“, bei der freigegebenen steht nur „Freigegeben“. Rollback auf die freigegebene Version setzt das Programm wieder auf „Freigegeben“, auf jede andere auf „Entwurf“ (vorher immer „Entwurf“). Bestehende Versionen behalten ihren Status (bisher alle Entwurf) – keine Migration
- Agentenverwaltung: Selbsttest-Warnungen in Klartext (z. B. „Programmordner nicht gefunden – Pfad in der Logdatei des Agenten und unter ‚Über‘“) statt `program_dir_ok nicht in Ordnung`; „nicht beschreibbar“ entfällt, wenn das Vorlagenverzeichnis ganz fehlt (`services/agentReport.js`). Gegenstück im Agenten: Meldung mit Pfad (mds-agent#12)

---

## [2.19.1] - 2026-11-04 - Bereitstellungen offline

### Für Anwender
- „Auf dem Mess-PC“: Ist das MDS kurz nicht erreichbar, verschwindet die Liste der Bereitstellungen nicht mehr. Der letzte Stand bleibt stehen, darüber der Hinweis „MDS nicht erreichbar – Stand hh:mm“.
- Für den Mess-PC gibt es den MDS-Agenten 1.1.1: Ein Ordner, in den PC-DMIS ein schon gelöschtes Programm zurückgeschrieben hat, wird jetzt aufgeräumt, sobald das Programm von Hand gelöscht ist.

### Fixed
- „Auf dem Mess-PC“: Bei einem Ladefehler (z. B. Netz weg) verschwand die Liste der Bereitstellungen bzw. zeigte „nichts bereitgestellt“. Jetzt bleibt der letzte Stand stehen mit Hinweis „MDS nicht erreichbar – Stand hh:mm“, bis das Laden wieder klappt (Mess-PC-Test 04.11.2026)

---

## [2.19.0] - 2026-11-03 - Freigabe-Knöpfe, PC-DMIS-Anbindung

### Für Anwender
- Die Knöpfe im Freigabe-Ablauf sagen jetzt, was passiert: „Zur Prüfung geben“, „Als geprüft markieren“, „Freigeben“, „Ablehnen“, „Archivieren“, „Zurück in Entwurf“ (Einrichteblätter: „Aktivieren“). Bisher stand dort der Zielstatus mit Pfeil, z. B. „→ Archiviert“.
- Im Versionsverlauf von NC- und Messprogrammen gibt es keinen Papierkorb mehr. Er hat nie funktioniert (nur eine Fehlermeldung); alte Versionen bleiben als Nachweis erhalten.
- „Auf dem Mess-PC“: „Lokale Dateien verwerfen“ erscheint erst, wenn es gebraucht wird – sofort, wenn ein Programm vor Ort bearbeitet wurde, sonst erst nach 15 Minuten ohne Antwort am Mess-PC.
- Agenten: neues Modul „PC-DMIS-Anbindung“. Damit lässt der Agent Programme liegen, die gerade in PC-DMIS geöffnet sind (braucht MDS-Agent ab 1.1.0).

### Added
- Agent-Modul `pcdmis` in `AGENT_MODULES` (`services/agentKeys.js`), Haken in der Agentenverwaltung

### Changed
- `WorkflowActions` und `SetupSheetStatusActions`: Knopf-Beschriftung aus `WORKFLOW_ACTION_LABELS` (`utils/workflowLabels.js`) statt `→ <Zielstatus>`
- `DeploymentsPanel`: „Lokale Dateien verwerfen“ bei offener Nachfrage („nur gemessen?“) erst `DISCARD_AFTER_MIN` (15) Minuten nach `close_requested_at`, bei bearbeiteten Dateien sofort

### Removed
- Löschen-Knopf im Versionsverlauf (`RevisionsList.jsx`) und `deleteRevision` im `programsStore` – der Endpunkt `DELETE /api/programs/:id/revisions/:revisionId` existiert nicht (404)

---

## [2.18.2] - 2026-11-01 - Vorbereitung Mess-PC

### Für Anwender
- Messprogramme → „Auf dem Mess-PC“: Wartet der Agent beim Abschließen noch auf eine Antwort am Mess-PC, steht das jetzt dort, statt schon zum Hochladen einer neuen Version aufzufordern.
- Im Protokoll steht jetzt auch beim Aktualisieren, wer es ausgelöst hat.
- Administration → Agenten: Der Ausschnitt zum Einrichten des Mess-PCs enthält die richtige Serveradresse.

### Fixed
- MDS-Agent → Bericht: Das Backend nahm JSON nur bis 100 KB an, ein Bericht darf aber bis zu 500 Dateien und 500 Transfers enthalten (ab rund 300 Einträgen 413, der Agent hätte denselben Bericht immer wieder geschickt; Befund 31.10.2026, Agent 4.7). `/api/agent/report` nimmt jetzt bis 1 MB an (500 + 500 Einträge ≈ 250 KB), alle anderen Endpunkte bleiben bei 100 KB
- Messprogramme → Protokoll: Beim Aktualisieren stand bei „nach dem Lauf gespeichert, nur gemessen – ersetzt“ sowie bei entfallenen oder wegen Bearbeitung blockierten Dateien kein Auslöser (genommen wurde, wer „Fertig“ gegeben hat – beim Aktualisieren leer; Befund 31.10.2026, Agent 4.8b). Jetzt: beim Abschließen wie bisher, sonst wer die Version festgelegt hat. Gesucht wird dafür je Programm statt je Datei, damit auch Dateien der Vorversion den Auslöser finden
- Messprogramme → „Auf dem Mess-PC“: Beim Abschließen stand schon „Vor Ort bearbeitet … als neue Version hochladen“, während der Agent am Mess-PC noch fragt, ob das nach dem Messen gespeicherte Programm bearbeitet wurde (Befund Nutzer 31.10.2026, Tray-Test Agent 4.8). Jetzt: nur `run_saved` → „Wartet auf Antwort am Mess-PC“ (Verwerfen bleibt als Notausgang); `modified` → bisheriger Hinweis; `.corrupt` → eigener Satz „löscht der Agent nie – von Hand löschen“
- Administration → Agenten: Der ini-Ausschnitt im Schlüssel-Dialog nahm als `Url` die Adresse der Seite. Im Dev-Betrieb ist das der Vite-Server (`localhost:5173`), der `/api/agent/...` mit der HTML-Startseite beantwortet; der Agent meldete dann einen Lesefehler (Befund Nutzer 31.10.2026, Vortest Agent 4.7). Die `Url` kommt jetzt aus derselben Quelle wie die API-Aufrufe (`config/api.js`: Produktion Seitenadresse, Dev `VITE_API_URL` bzw. `:5000`). Bei `localhost`/`127.0.0.1` zeigt der Dialog den Hinweis, dass die Adresse nur auf diesem PC gilt

---

## [2.18.1] - 2026-10-31 - Download der freigegebenen Version, Rechte-Kategorien

### Für Anwender
- Der Download-Knopf an NC- und Messprogrammen lädt jetzt die freigegebene Version. Ist schon eine neuere Version in Arbeit, gibt es daneben einen eigenen Knopf „Entwurf …“ zum Bearbeiten. Programme ohne Freigabe werden wie bisher geladen, mit dem Hinweis „nicht freigegeben“.
- Rollen & Berechtigungen: Die Rechte sind jetzt deutsch beschriftet und alphabetisch gruppiert; Urlaub und Zeiterfassung erscheinen je nur noch einmal.

### Fixed
- Download lud immer die aktuelle Version, auch wenn sie noch Entwurf war (Befund nach 2.18.0): Karten (NC und Messprogramm) und Übersichten laden die freigegebene Version (`released_version`), ein neuerer Entwurf hat einen eigenen Knopf; die Dateiliste zeigt beim Entwurf einen Hinweis und lädt die angezeigte Version ausdrücklich. `GET /api/programs/:id/download` versteht `?version=x.y.z` (400 bei ungültiger, 404 bei unbekannter Version); ohne `version` unverändert die aktuelle. Knopfleiste der Karten bricht um
- Rechte-Kategorie „Urlaub“ doppelt (Befund nach 2.18.0): Migration 1737000125000 vereinheitlicht `permissions.category` (`Urlaub` → `vacations`, `Zeiterfassung` → `time_tracking`; nur das Feld, Rechte und Zuordnungen unverändert). Die Rollenverwaltung zeigt deutsche Namen aus `utils/permissionCategories.js`, sortiert, unbekannte Schlüssel unverändert

---

## [2.18.0] - 2026-10-30 - Messprogramme auf dem Mess-PC bereitstellen (MDS-Seite)

### Für Anwender
- Messprogramme, neue Version: In der Vorschau lässt sich jetzt jede optionale Datei gleich behandeln. „entfernen“ bei Excel-Vorlage oder Kalibrierprogramm schaltet den passenden Haken aus, „behalten“ wieder ein. Messprogramm und CAD-Datei lassen sich nur ersetzen, nicht entfernen – PC-DMIS braucht die CAD-Datei passend zum Programm.
- NC- und Messprogramme merken sich jetzt, welche Version freigegeben ist. Lädt jemand eine neue Version hoch, steht bei der Version „freigegeben: 1.1.0“, bis die neue Version freigegeben ist; im Versionsverlauf ist die freigegebene Version markiert. Programme, die beim Update schon freigegeben sind, werden übernommen.
- Messprogramme lassen sich am Arbeitsgang „Auf Gerät bereitstellen“: Die freigegebene Version kommt auf den Mess-PC, sobald dort der MDS-Agent läuft (folgt). Unter Messprogramme zeigt „Auf dem Mess-PC“, was gerade dort liegt, ob eine neuere Version freigegeben ist, und mit „Fertig“ wird wieder aufgeräumt. Administratoren legen den Mess-PC unter Administration → Agenten an.

### Added
- Freigabe-Zeiger `programs.released_revision_id` (Migration 1737000123000, Bestand: freigegebene Programme → aktuelle Version): wird beim Wechsel auf „released“ gesetzt, neue Version, Rollback und Archivieren lassen ihn stehen. API: `released_version` in `GET /api/programs`, `GET /api/programs/:id` und `GET /api/programs/:id/files`, `is_released` in `GET /api/programs/:id/revisions`; REST-Szenarien `tests/test-programs-released.http`. Grundlage für den MDS-Agenten (Spec MESSPROGRAMME_AGENT_SPEC.md, PR 4.1)
- MDS-Agent, Datenmodell (Migration 1737000124000, Spec MESSPROGRAMME_AGENT_SPEC.md 4.2, PR 4.2): Tabellen `agents` (API-Schlüssel nur als SHA-256, Modulliste), `agent_deployments` (je Gerät und Arbeitsgang höchstens eine offene), `agent_deployment_programs` (festgehaltene Version), `agent_file_states`, `program_transfers` (Protokoll mit Schnappschüssen, `client_id` gegen doppelte Berichte). Neue Rechte `agent.manage` und `program.deploy`, per Migration nur für `admin`; Dev-Standardrechte: `program.deploy` für programmer, reviewer, supervisor. Noch ohne API und Oberfläche
- MDS-Agent, Verwaltung und Anmeldung (Spec 5.1/5.4, PR 4.3): `/api/agents` (Liste/Detail/Module für alle Angemeldeten; Anlegen, Ändern, Schlüssel neu erzeugen mit `agent.manage`; Schlüssel `mdsa_…` nur einmal ausgeliefert, gespeichert als SHA-256). Middleware `authenticateAgent` (Header `X-Agent-Key`, gleiche 401 für fehlend/falsch/deaktiviert, `last_seen_at`/`last_ip`/`agent_version` höchstens alle 30 s). `GET /api/agent/manifest` liefert vorerst nur die Gerätekonfiguration, Bereitstellungen ab PR 4.5. Unit-Tests `test-agent-keys.js`, REST-Szenarien `tests/test-agents.http`
- MDS-Agent, Bereitstellungen (Spec 5.2/5.3, PR 4.4): `/api/deployments` – Liste/Detail für alle Angemeldeten; Bereitstellen, Aktualisieren, Fertig und Verwerfen mit `program.deploy`. Bereitgestellt werden nur freigegebene, nicht archivierte Messprogramme (Version festgehalten), Vorlagenname und Programmordner je Gerät eindeutig, je Gerät und Arbeitsgang eine offene Bereitstellung. „Fertig“ ohne Rückmeldung vom Gerät nimmt die Bereitstellung gleich zurück. Zielpfade (`<Teilenummer>\<Programmnummer>`, Windows-tauglich, `Kalibrierung\`) aus einer Funktion für Gerät und ZIP. Löschschutz: Programme und Arbeitsgänge mit offener Bereitstellung → 409. Unit-Tests, REST-Szenarien `tests/test-deployments.http`
- MDS-Agent, Agent-API (Spec 5.4, PR 4.5): `GET /api/agent/manifest` liefert jetzt die offenen Bereitstellungen mit festgehaltener Version, Zielpfaden, Hash und Download-URL; `GET /api/agent/files/:fileId` nur für bereitgestellte Dateien (Header `X-File-Hash`); `POST /api/agent/report` ersetzt den Ist-Stand, schreibt das Protokoll idempotent über `client_id` (Auslöser aus der Bereitstellung), übernimmt Warnungen und schaltet `requested → active` bzw. `closing → closed`; `POST /api/agent/deployments/:id/close` für „Fertig“ im Tray. Fehlerhafte Einträge werden einzeln verworfen (`ignored`). `insideCmmDir` liegt jetzt in `uploadMiddleware`. Unit-Tests `test-agent-report.js`, Integrationstest mit simuliertem Agenten `tests/integration/test-agent-ablauf.js`, REST-Szenarien `tests/test-agent-api.http`
- MDS-Agent, Oberfläche (Spec 5.5, PR 4.6): Administration → Agenten (`agent.manage`; anlegen, bearbeiten, Schlüssel neu, (de)aktivieren, Meldungen vom Gerät; Schlüssel einmalig mit ini-Ausschnitt zum Kopieren), Bereitstellen-Dialog am Arbeitsgang (`program.deploy`; Gerät vorbelegt, nicht freigegebene Programme mit Grund gesperrt), „Auf dem Mess-PC“ auf der Messprogramm-Übersicht und am Arbeitsgang (Status, Dateizustände je Programm, Aktualisieren, Fertig, Lokale Dateien verwerfen; Auffrischen alle 30 s). Kopieren in die Zwischenablage auch über HTTP (`utils/clipboard.js`)

### Changed
- Messprogramm-Vorschau (neue Version): „entfernen“/„behalten“ auch für Excel-Vorlage und Kalibrierprogramm, wirkt über den Schalter des Bereichs (`excel_report`/`calibration` = false); Messprogramm und `.cad` zeigen „nur ersetzen“. Backend: `remove` der `.cad` → Fehler „kann nicht entfernt, nur ersetzt werden“ (die `.prg` findet sie über den Namen); REST-Szenario K9

---

## [2.17.0] - 2026-10-30 - Kalibrierprogramm für Messprogramme

### Für Anwender
- Messprogramme: Das Kalibrierprogramm für die Taster lässt sich jetzt mit dem Messprogramm zusammen ablegen. Es bekommt beim Hochladen einen eigenen Bereich, wird mit dem Messprogramm versioniert und liegt im heruntergeladenen ZIP im Ordner „Kalibrierung“. Kalibrierprotokolle (PDF) werden dabei aussortiert.
- Die Excel-Protokollvorlage hat beim Hochladen ebenfalls einen eigenen Bereich mit Schalter. Der große Ablagebereich ist nur noch für das Messprogramm selbst.

### Added
- Messprogramme: Rolle `calibration` (Kalibrierprogramm, höchstens eine `.prg` je Revision, wird wie die CAD-Datei übernommen; Migration `1737000122000_add-cmm-calibration-role` erweitert die Prüfregel von `program_revision_files.role`). Entfernen nur über `calibration=false`, Pflicht mit `calibration=true`; darf nicht wie das Messprogramm heißen. ZIP: Unterordner `Kalibrierung/`. `GET /api/programs/:id/files` meldet `calibration`

### Changed
- Messprogramm-Upload in drei Bereichen mit eigenem Filter: `files` (Messprogramm: `.prg`, `.cad`, `.pdf`, `.MiniRoutines.xml`), `template_files` (Excel-Vorlage), `calibration_files` (Kalibrierprogramm: nur die `.prg`, PDFs = Kalibrierprotokolle). Der Bereich bestimmt die Rolle; Dateien im falschen Bereich werden mit Hinweis aussortiert, unbekannte Felder → 400. **Excel-Vorlagen unter `files` werden nicht mehr angenommen.** Formular: Schalter „Excel-Protokoll“ und „Kalibrierprogramm“ mit eigener Ablagefläche, bei neuer Version vorbelegt; ausschalten = in der neuen Version entfernen

---

## [2.16.0] - 2026-10-29 - Messprogramme im eigenen Reiter

### Für Anwender
- Die Vorschau von Zeichnungen (PDF) braucht keine Internetverbindung mehr: Das Anzeigeprogramm kommt jetzt vom MDS selbst statt von einem fremden Server.
- Messprogramme: Ein ganzer Ordner lässt sich jetzt hochladen, auch wenn noch andere Dateien darin liegen (z. B. die STEP-Datei vom Import). Sie werden in der Vorschau grau als „Aussortiert“ gezeigt statt das Hochladen zu sperren. Dateien aus Unterordnern, etwa Messprotokolle, werden nicht mitgenommen.
- Messprogramme haben am Arbeitsgang einen eigenen Reiter „Messprogramme“, der bisherige Reiter heißt jetzt „NC-Programme“. Den neuen Reiter schaltet man wie die anderen Bereiche ein: beim Arbeitsgang unter „Aktivierte Bereiche“ oder als Standard beim Operationstyp (z. B. „CNC-Messen“).
- Name und Beschreibung von NC- und Messprogrammen lassen sich wieder bearbeiten – das Speichern brach bisher mit „Pflichtfelder fehlen“ ab.

### Changed
- Arbeitsgang: Messprogramme in eigenem Reiter mit neuem Bereich `cmm_programs` (Arbeitsgang-Formular, Operationstypen, `GET /api/operation-types/features`). `CmmProgramsList`/`CmmProgramCard` statt Weichen in `ProgramsList`/`ProgramCard` – die zeigen nur noch NC-Programme, mit Hinweis, falls am Arbeitsgang Messprogramme liegen. Status-Filter als `ProgramStatusFilter` für beide. Reiter „Programme“ → „NC-Programme“. Direktsprung aus der Übersicht Messprogramme öffnet den neuen Reiter (`/parts/:id?op=…&tab=cmm_programs`). Daten und Backend unverändert (gemeinsame Tabelle `programs`, `kind`); keine Migration – der Bereich wird über die Oberfläche eingeschaltet

### Fixed
- Programm bearbeiten: `PUT /api/programs/:id` verlangte `program_number`, das Formular schickt sie nicht mit → jedes Bearbeiten scheiterte mit 400. `program_number` ist jetzt optional (fehlt sie, bleibt die bisherige; leer → 400)
- Programmnummer: automatische Vergabe zählte die Programme am Arbeitsgang („Anzahl + 1“) und vergab nach dem Löschen eine Nummer doppelt – jetzt höchste vorhandene Nummer + 1 (`utils/programNumber.js`, für NC- und Messprogramme)
- Messprogramm-Upload per Ordner: Unbekannte Dateitypen sperrten das Anlegen („Dateityp nicht erlaubt“) – jetzt aussortiert mit Hinweis, STEP (`.stp`/`.step`) mit eigenem Hinweis „steckt bereits in der .cad“. Ordnerauswahl und Ziehen nahmen auch Dateien aus Unterordnern mit, Messprotokolle (PDF) landeten so als Prüfzeichnung in der Version – jetzt zählt nur die oberste Ebene der Auswahl, Dateien darunter erscheinen als „Aus Unterordner … – nicht hochgeladen“
- PDF-Viewer: Der Worker von PDF.js wurde bei jedem Seitenaufruf von `unpkg.com` geladen – Abhängigkeit vom Internet und fremder Code, der die Zeichnungen verarbeitet. Jetzt aus `pdfjs-dist` mitgebaut und vom eigenen Server ausgeliefert (`assets/pdf.worker.min-*.mjs`, Caddy liefert `.mjs` als `text/javascript`)

---

## [2.15.0] - 2026-10-29 - Messprogramme und Programm-Übersichten

### Für Anwender
- Unter „Fertigung“ gibt es zwei neue Menüpunkte: „NC-Programme“ und „Messprogramme“ zeigen alle Programme über alle Bauteile, mit Suche und Status. Ein Klick springt direkt zum Arbeitsgang am Bauteil.
- Messprogramme für die Messmaschine (PC-DMIS) lassen sich jetzt im MDS ablegen und versionieren: am Arbeitsgang „Messprogramm hochladen“ und einfach den ganzen Ordner hineinziehen. Vor dem Speichern zeigt das MDS, welche Dateien neu, geändert oder unverändert sind; Sicherungsdateien von PC-DMIS werden aussortiert.
- Eine Excel-Protokollvorlage wird nur zusammen mit ihrer Layout-Datei angenommen – ohne sie entstünde ein Protokoll ohne Messwerte.
- Der Status von Programmen steht wieder auf Deutsch, Dateinamen erscheinen ohne die Zahlen davor.
- Der NC-Viewer zeichnet Programme mit Q-Parametern in geschwenkten Ebenen jetzt richtig.

### Added
- Datenmodell für Messprogramme (KMG / PC-DMIS, Schritt 1 aus `docs/konzepte/MESSPROGRAMME_KONZEPT.md`): Migration `1737000121000` mit `programs.kind` (`nc` | `cmm`, bestehende = `nc`), Tabelle `program_revision_files` (mehrere Dateien je Revision mit Rolle und Zielort, Originalname eindeutig je Revision ohne Groß-/Kleinschreibung) und `machines.measuring_equipment_id` (KMG ↔ Messmittel). Keine neuen Rechte (Freigabe über `program.release`), keine Stammdaten; noch ohne Backend-/Oberflächen-Funktion
- Messprogramme Backend (Schritt 2): `POST /api/programs/cmm` (anlegen mit Dateigruppe), `POST /api/programs/:id/cmm-revisions` (neue Version: hochladen, was man hat – Änderungen per Hash erkannt, nicht Hochgeladenes aus der aktiven Version übernommen, Entfernen über `remove` bzw. `excel_report=false`), `GET /api/programs/:id/files[/zip|/:fileId/view|/:fileId/download]`, `GET /api/programs?kind=cmm`. Rollen nach Endung, PC-DMIS-Nebendateien (`.PRG~`, `.PRG^`, `.MiniRoutines.xml` ohne eigene Mini-Routinen) werden mit Hinweis aussortiert; Excel-Vorlage nur als Paar mit gültigem XML und eindeutigem Namen. Ablage `uploads/cmm-programs/` (im Dateisystem-Aufräumjob berücksichtigt). Neue Abhängigkeiten `archiver`, `fast-xml-parser`. NC-Upload lehnt Messprogramme ab; Löschen entfernt alle Dateien der Gruppe
- Fertigung: neue Menüpunkte „NC-Programme“ und „Messprogramme“ – Übersicht über alle Bauteile mit Status-Kacheln, Suche (Bauteil, Arbeitsgang, Programm, Datei), Status-Filter, Sortierung, Tabelle/Kacheln und Seiten; Download (NC-Datei bzw. ZIP), Sprung zum Arbeitsgang am Bauteil (`/parts/:id?op=<Arbeitsgang>` klappt ihn auf und öffnet „Programme“). Backend: `GET /api/programs` mit `page` zusätzlich `search`, `status`, `sort_by`, `sort_order`, `page_size` und `total`; `GET /api/programs/stats?kind=`
- Messprogramme am Arbeitsgang: Knopf „Messprogramm hochladen“ und „Neue Version“ öffnen ein Fenster für Dateien oder ganze Ordner (Drag & Drop oder Auswahl). Vor dem Speichern zeigt eine Vorschau je Datei Neu / Geändert / Unverändert / Übernommen bzw. Aussortiert (PC-DMIS-Sicherungen) mit Fehlern und Hinweisen; übernommene Dateien lassen sich entfernen, die Excel-Vorlage über „Ohne Excel-Protokoll“. Karte mit Kennzeichen „Messprogramm“, Dateiliste (Prüfzeichnung anzeigen, Dateien einzeln laden) und ZIP-Download. Backend: `?dry_run=true` für beide Upload-Endpunkte (prüfen ohne Speichern)

### Fixed
- Programmkarte: Status wurde englisch angezeigt (`draft`) – Status-Badge findet die Workflow-Status jetzt über `name` und zeigt deutsche Namen; NC-Programme zeigen den Dateinamen ohne internes Präfix (Zeitstempel-Zufallszahl), auch beim Download
- NC-Viewer: Programme mit Q-/QL-Parametern in `PLANE` (z. B. `PLANE SPATIAL SPA+QL101 … SYM+` im Unterprogramm `LBL "PLANE_SYM"`) wurden ungeschwenkt gezeichnet – einfache Parameter-Zuweisungen, `FN 9–12`-Sprünge und Text-Labels werden jetzt ausgewertet. Parameter mit Formel (`FN 1–8`, `Q1 = Q1 + 1`) gelten danach als unbekannt, Sprünge darauf werden nicht ausgeführt (Hinweis unter „Info“) – sonst liefe eine Zählschleife endlos
- Programm-Upload: Binärdateien (z. B. PC-DMIS-Messprogramme `.prg`) brachen mit Fehler 500 ab, weil der Inhalt als Text in die DB geschrieben wurde (Null-Bytes). Binärdateien werden jetzt erkannt und nur als Datei mit Hash gespeichert, ohne Textinhalt; NC-Programme unverändert
- Versionsvergleich: Bei Versionen ohne Textinhalt (Binärdateien) blieb das Lade-Fenster ohne Schließen-Knopf stehen – jetzt erscheint eine Meldung „Versionsvergleich nicht möglich“ mit Schließen

---

## [2.14.2] - 2026-10-28 - Breadcrumbs auf Deutsch

### Für Anwender
- Die Pfadangabe oben auf jeder Seite (z. B. „Urlaub & Arbeitszeit › Verwaltung“) ist jetzt durchgehend auf Deutsch. Bisher standen dort teils englische Begriffe wie „Vacations“ oder „Time tracking“.
- Auf Detailseiten steht dort wieder der Name, etwa die Bauteil-Nummer oder der Name des Mitarbeiters, statt einer Nummer mit „#“.
- Stufen ohne eigene Seite sind kein Link mehr – ein Klick darauf führte bisher aufs Dashboard.

### Fixed
- Breadcrumbs: alle Bereiche auf Deutsch (bisher z. B. „Vacations“, „Time tracking“, „Maintenance“); Pfadteile, die je nach Bereich anders heißen, über den ganzen Pfad („Mein Bereich“ / „Meine Aufgaben“, „Verwaltung“ / „Administration“)
- Breadcrumbs: Namen auf Detailseiten (Bauteil-Nr., Werkzeug, Maschine, Mitarbeiter …) werden wieder geladen – der Import zeigte auf die Basis-URL statt auf die Axios-Instanz, die Endpunkte hatten kein `/api`; es stand immer „#…“
- Breadcrumbs: Stufen ohne eigene Seite (`/admin`, `/qr`, einzelne Wartungsaufgabe) sind Text statt Link – ein Klick führte bisher aufs Dashboard; Zeiterfassung eines Mitarbeiters erscheint unter „Urlaub & Arbeitszeit › Verwaltung“

---

## [2.14.1] - 2026-10-25 - Nacht-Jobs bei der Zeitumstellung

### Für Anwender
- Die automatischen Aufgaben in der Nacht laufen jetzt auch an den Tagen der Zeitumstellung zuverlässig. Bisher fiel dort die Prüfung der Datensicherung für einen Tag aus.
- Offene Arbeitstage werden schon um 01:00 statt um 02:00 Uhr abgeschlossen. Für die tägliche Arbeit ändert sich nichts.

### Fixed
- Cron-Jobs bei der Zeitumstellung: node-cron 4.2.1 berechnete am Umstellungstag den nächsten Lauf mit dem alten UTC-Versatz und sprang auf den 1. Januar – Jobs ab 03:00 (Backup-Monitore, Aufräumen der Uploads) fielen dadurch einen Tag aus, bei der Umstellung auf Sommerzeit zwei. Update auf node-cron 4.6.0

### Changed
- Nächtliche Jobs „Offene Tage abschließen“, „Abwesenheiten erzeugen“ und „Wartungsaufgaben erzeugen“ laufen um 01:00/01:15/01:30 statt 02:00/02:15/02:30 – die Stunde 02:00–02:59 fehlt bzw. kommt doppelt bei der Zeitumstellung, node-cron lässt Läufe darin aus

---

## [2.14.0] - 2026-10-24 - Backup aufs Netzlaufwerk

### Für Anwender
- Die Daten des MDS – Datenbank sowie hochgeladene Fotos und Dokumente – werden jetzt jede Nacht zusätzlich auf den Firmen-Server gesichert. Fällt der MDS-Rechner aus, lassen sie sich von dort wiederherstellen, auch Stände von bis zu einem Jahr zurück.
- Administratoren sehen unter „Automatische Aufgaben“, ob die nächtliche Sicherung geklappt hat.
- Für die tägliche Arbeit ändert sich nichts.

### Added
- Backup aufs Netzlaufwerk: `scripts/backup-offsite.sh` sichert nachts (root-Crontab 02:45, nach `backup.sh`) den neuesten geprüften DB-Dump, `/srv/mds/uploads` und die `.env` per restic auf eine Windows-Freigabe (fstab-Eintrag `noauto`, nur während der Sicherung eingebunden). Aufbewahrung 30 Tage täglich + 12 Monate, sonntags `restic check` mit 10 % der Daten. Prüft vorher Dump (Größe, Endmarke, höchstens 26 h alt), Passwortdatei und Repository; schreibt nach jedem Lauf `offsite-status.json`
- Cron-Job „Netzlaufwerk-Backup“ (`backup_offsite_monitor`, täglich 03:05): liest die Statusdatei und meldet rot, wenn der letzte Lauf fehlschlug, älter als 26 h ist oder noch nie lief
- `DEPLOYMENT.md`: Einrichtung und Wiederherstellung des Netzlaufwerk-Backups; fstab-Vorlage mit `nosharesock` (sonst zufällig `mount error(13)`, wenn schon eine andere Freigabe desselben Servers mit anderem Benutzer eingebunden ist)

### Changed
- `Caddyfile` liegt jetzt in `caddy/Caddyfile`; `compose.yaml` bindet den Ordner `./caddy` statt der Einzeldatei ein

### Fixed
- `scripts/deploy.sh`: Änderungen am `Caddyfile` kamen ohne Neustart nicht an – ein Einzeldatei-Mount hängt am Inode, nach `git pull` sah Caddy weiter die alte Datei und `caddy reload` lud die alte Konfiguration. Mit dem Ordner-Mount reicht jetzt der Reload (ohne Unterbrechung)
- `scripts/deploy.sh`: prüft das `Caddyfile` direkt nach dem `git pull` in einem Einmal-Container und bricht bei Fehlern ab, bevor etwas umgestellt wird. Bisher startete ein fehlgeschlagenes `caddy validate` Caddy neu – mit ungültiger Konfiguration wäre die Seite danach weg gewesen
- `Caddyfile`: fehlende Dateien unter `/assets/` liefern `404` statt `index.html` mit Status 200 und Asset-Cache-Header (ein Jahr, `immutable`); Fehlerantworten bekommen `Cache-Control: no-store`

---

## [2.13.0] - 2026-10-21 - Versionshinweis, sicherer Deploy

### Für Anwender
- Nach einem Update zeigt das MDS oben den Hinweis „Neue Version verfügbar“ mit einem Knopf zum Neuladen. Neu geladen wird nur auf Klick – vorher ungespeicherte Eingaben speichern.
- Wer nach einem Update eine Seite neu lädt, bekommt zuverlässig die neue Version, auch auf Unterseiten. Bisher konnte dort eine leere Seite erscheinen.
- Hinter den Kulissen: Updates sichern die Datenbank jetzt automatisch vorher, und die Oberfläche bleibt während eines Updates erreichbar.

### Added
- Hinweis „Neue Version verfügbar“: Banner oben im Kopf mit „Neu laden“ und Ausblenden, sobald `/api/health` eine andere Version meldet als das geladene Frontend. Geprüft beim Laden, bei Fokus/Tabwechsel (höchstens alle 10 s) und alle 5 Minuten; ist das Backend nicht erreichbar (Deploy), wird still erneut geprüft. Kein automatisches Neuladen (ungespeicherte Eingaben)
- Fehlt eine nachgeladene Datei (`vite:preloadError`, z. B. 3D-Viewer in einem alten Tab nach einem Deploy), lädt die Seite einmal neu – höchstens einmal pro Minute

### Removed
- `users.time_model_id` (Zeitmodell-Verlauf, Schritt 4): Spalte per Migration entfernt, Zeitmodell kommt nur noch aus `user_time_models`. `PUT /api/users/:id` nimmt `time_model_id` weiter an (erstes Aktivieren → Verlaufseintrag), Löschen eines Zeitmodells prüft nur noch den Verlauf. Vor dem Release in Produktion geprüft, dass kein Modell nur in der Spalte steht

### Fixed
- `Caddyfile`: `index.html` bekommt auch unter Deep-Links (z. B. `/parts/12`) `Cache-Control: no-store` – bisher nur unter `/` und `/index.html`; sonst konnte der Browser nach einem Deploy beim Neuladen die alte Seite mit gelöschten Assets zeigen (weiße Seite). Assets und API unverändert
- `scripts/restore.sh`: aus jedem Ordner aufrufbar (wechselt ins Repo, Backup-Pfad vorher absolut); prüft die Backup-Datei (gzip + Endmarke) bevor die Datenbank gelöscht wird; Import mit `pipefail` und `ON_ERROR_STOP` – ein Fehler beim Einspielen meldete bisher trotzdem „✅ Restore abgeschlossen“
- `Sidebar.jsx`: ESLint-Befunde behoben (ungenutzter State `userMenuOpen`, fehlende Effekt-Abhängigkeit `fetchEscalations`); ESLint-Regel `react/jsx-uses-vars` aktiv – als Prop umbenannte Komponenten wie `icon: Icon` galten als unbenutzt
- `backend/.migrationrc.json` entfernt – wurde von node-pg-migrate 6 nicht gelesen und zeigte auf das nicht existierende `./src/migrations`
- `scripts/deploy.sh`: DB-Backup (`scripts/backup.sh`) direkt vor der Migration – schlägt es fehl, bricht der Deploy ab (bei nicht laufender DB, z. B. Erstinstallation, mit Hinweis übersprungen)
- `scripts/deploy.sh`: Frontend wird nach `.cache/frontend-dist` gebaut und erst nach erfolgreichem Build per `rsync` nach `frontend/dist` übernommen (Inhalt statt Ordner tauschen – Caddy hat ihn als Bind-Mount). Bisher war das Frontend während des Builds leer bzw. halb neu und nach einem Fehler weg; jetzt gehen Frontend und Backend erst kurz vor `up -d` live. Prüft vorab, ob `rsync` installiert ist
- `scripts/deploy.sh`: Autostash bricht bei Fehlern ab statt sie zu ignorieren – `git stash push`, `git pull` und Konflikte bei `git stash pop` beenden den Deploy vor dem Bauen mit Hinweis (Änderungen bleiben im Stash); die gestashten Dateien werden aufgelistet

---

## [2.12.0] - 2026-10-17 - Kalender-Tooltip, Handy-Ansicht, Audit-Log

### Für Anwender
- Im Kalender zeigt „+N mehr“ beim Drüberfahren mit der Maus, wer sich dahinter verbirgt. In der Liste aller Abwesenheiten eines Tages steht jetzt auch der Zeitraum, und jeder Eintrag zeigt dieselben Details wie im Kalender.
- Beim Ändern des Zeitmodell-Verlaufs nennt die Vorschau nur noch Abwesenheiten, deren Tageszahl sich wirklich ändert. Einträge wie „1 → 1“ erscheinen nicht mehr.
- Die Mitarbeiter-Einstellungen in der Verwaltung lassen sich jetzt auch am Handy bedienen, ohne seitlich zu scrollen. Auch der Kopf der Urlaubsseite und die Reiter passen jetzt aufs Handy.
- Bei den Aktivitäten eines Benutzers stimmen die Uhrzeiten jetzt überall. Einträge zum Zeitmodell wurden bisher ein bis zwei Stunden zu spät angezeigt.

### Changed
- Kalender (Monatsansicht): `title`-Tooltip an „+N mehr“ mit den ausgeblendeten Einträgen (Name, Art, Zeitraum); Tagesliste mit Kurz-Zeitraum je Zeile und Tooltip. Ohne `vacations.manage` sind die Einträge der Tagesliste keine deaktivierten Buttons mehr (zeigten in Chrome keinen Tooltip), sondern einfache Zeilen. Tooltip-Text als gemeinsamer Helper `vacationTooltip`

### Fixed
- Zeitmodell-Verlauf ändern: Abwesenheiten, deren Tageszahl mit altem und neuem Verlauf verschieden berechnet wird, deren gespeicherter Wert (`calculated_days`, `days_by_year`) aber schon dem neuen entspricht, stehen nicht mehr in der Vorschau („1 → 1“) und werden beim Übernehmen nicht neu geschrieben – `updated_at` bleibt aussagekräftig. Zwei neue Fälle in `tests/integration/test-zeitmodell-aenderung.js`
- Mitarbeiter-Einstellungen am Handy: Tabelle schnitt unter ~700 px ab (`overflow-hidden`), Details nur mit seitlichem Scrollen erreichbar. Unter `sm` sind die Spalten Zeitmodell und RFID/PIN ausgeblendet (Zeitmodell steht klein unter dem Namen), weniger Innenabstand, Detailzeile weitet die Tabelle nicht mehr auf (`w-0 min-w-full`), Verlaufstabelle schmaler und notfalls in sich scrollbar. Urlaubsseite: Kopf mit Titel und Buttons bricht um, Rand mobil 16 px, Verwaltungs-Reiter in sich scrollbar, Einstellungs-Bereiche kompakter. Geprüft bei 360/390/1280 px
- Audit-Log-Zeitstempel: `audit_logs.created_at` ist jetzt `timestamptz` (Migration `1737000119000`). Bisher `timestamp` ohne Zeitzone mit der Uhrzeit der Session – Middleware und `partsController` (eigene Pools ohne `SET timezone`) schrieben UTC, der Zeitmodell-Verlauf (zentraler Pool) Berliner Zeit, die dann 1–2 h zu spät angezeigt wurde. Altdaten nach Herkunft umgerechnet (`user_time_model` → Europe/Berlin, alles andere UTC; in Produktion geprüft), `down` stellt die Originalwerte wieder her. Die Middleware nutzt den zentralen Pool. Testsammlung `tests/integration/test-audit-zeitstempel.js`

---

## [2.11.0] - 2026-10-16 - Rollenfarben, Kalender, Verwaltung

### Für Anwender
- Rollen können jetzt eine eigene Farbe bekommen (Administration → Rollen → Bearbeiten). Die Rollen-Abzeichen erscheinen überall in dieser Farbe, auch bei selbst angelegten Rollen.
- Im Kalender (Monatsansicht) ist der Hinweis „+N mehr“ an vollen Tagen wieder sichtbar. Ein Klick darauf zeigt alle Abwesenheiten des Tages.
- Wird ein genehmigter Urlaub oder eine andere Abwesenheit gelöscht oder geändert, passt sich das Zeitkonto der betroffenen Tage sofort an.
- In der Verwaltung liegen die Mitarbeiter-Einstellungen jetzt unter „Einstellungen“. „Zurück“ aus einem Zeitkonto führt wieder zur Übersicht der Zeitkonten.

### Added
- Farbe je Rolle: Spalte `roles.color` mit fester Palette (rot, orange, gelb, grün, blau, lila, pink, grau; CHECK-Constraint, Migration `1737000118000` übernimmt die bisherige Farbe nach Rollenname, sonst grau). Auswahl als Farbfelder mit Vorschau im Dialog „Rolle bearbeiten/erstellen“; `POST`/`PUT /api/roles` nehmen `color` an (ungültig → 400). Testsammlung `tests/integration/test-rollen-farben.js` (12 Fälle), `.http`-Szenarien in `tests/test-users.http`

### Changed
- Verwaltung (Urlaub & Arbeitszeit): „Mitarbeiter“ ist kein eigener Tab mehr, sondern dritter Bereich unter „Einstellungen“ (neben Urlaub und Zeiterfassung); der Link aus den Benutzer-Details führt direkt dorthin. Tab, Bereich (auch die Ansicht im Tab „Arbeitszeit“: Anwesenheit/Fehlbuchungen/Zeitkonten) und Unterpunkt stehen in der Adresse (`?tab=…&bereich=…&unterpunkt=…`, Tabwechsel ersetzen den Verlaufseintrag) – „Zurück“ aus dem Zeitkonto eines Mitarbeiters landet wieder bei den Zeitkonten statt auf „Übersicht“, Neuladen und Links behalten die Stelle; Alt-Link `?tab=employees` funktioniert weiter
- Kalender-Monatsansicht: Tageszellen zeigen so viele Einträge, wie hineinpassen (3, an Feiertagen 2; bei mehr einen weniger), „+N mehr“ ist klickbar und öffnet die Liste aller Abwesenheiten des Tages (Klick auf einen Eintrag öffnet ihn wie im Kalender)
- Rollen-Abzeichen (Rollen, Benutzerliste, Benutzer-Details, Profil, Urlaubsdetails) nehmen die Farbe der Rolle statt einer festen Zuordnung nach Rollenname – selbst angelegte und umbenannte Rollen sind nicht mehr immer grau. Eine gemeinsame Hilfsfunktion `utils/roleColors.js` ersetzt fünf Kopien. Rollen in Benutzer-API (`color`), Urlaubs-API (`role_color`), Login und `/api/auth/me` (`role_colors`, `roles` bleibt eine Namensliste)

### Fixed
- Kalender-Monatsansicht: „+N mehr“ ragte aus der Tageszelle und wurde von der nächsten Kalenderzeile verdeckt; an Feiertagen schon der dritte Eintrag
- Kalender ohne Verwaltungsrecht: Klick auf einen Tag oder Eintrag warf Fehler in der Browser-Konsole (`onDayClick`/`onVacationClick is not a function`) – jetzt ohne Aktion, Zellen ohne Klick-Zeiger
- Genehmigte Abwesenheit löschen oder ändern zog die Tageswerte nicht nach: Status und Gutschrift blieben stehen (z. B. stornierter Urlaubstag weiter ±0 statt fehlender Buchung), bis der Tag aus anderem Grund neu gerechnet wurde. Jetzt rechnet Löschen die vorhandenen Tageswerte im Zeitraum (bis heute) neu; Ändern von Zeitraum, Art, Status oder Mitarbeiter rechnet den alten Zeitraum neu und den neuen über den Urlaubs-Sync. Tage ohne Stempel und ohne manuelles Soll, die laut Zeitmodell frei sind, werden entfernt; Monatssalden ab dem ersten betroffenen Monat. Ablehnen/Zurückziehen betreffen nur beantragte Einträge (ohne Tageswerte). `computeDailySummary` liefert zusätzlich `base_target_minutes`. Testsammlung `test-abwesenheit-aendern.js` (8 Fälle)

---

## [2.10.1] - 2026-10-16 - Vorschau Zeitmodell-Verlauf

### Für Anwender
- Beim Eintragen eines neuen Zeitmodells zeigt die Vorschau nur noch Abwesenheiten, deren Tage sich durch den Wechsel tatsächlich ändern. Andere Einträge bleiben beim Übernehmen unverändert.

### Fixed
- Zeitmodell-Verlauf: Vorschau und „Übernehmen“ führten auch Abwesenheiten auf, deren gespeicherte Tageszahl schon vorher nicht zur heutigen Berechnung passte (z. B. Überstundenabbau an einem inzwischen freien Tag), und setzten sie neu – auch wenn die Verlaufsänderung sie gar nicht betraf. Jetzt zählt nur, was sich durch die Änderung ändert: Tageszahl mit altem gegen neuen Verlauf berechnet; andere Abwesenheiten bleiben unangetastet. Testfall nach dem Produktionsfall (Nachtrag eines Modells vor dem ersten Eintrag)

---

## [2.10.0] - 2026-10-16 - Zeitmodell-Verlauf

### Für Anwender
- Zeitmodelle haben jetzt einen Verlauf mit „gültig ab“: Wechselt jemand z. B. von Vollzeit auf eine 4-Tage-Woche, rechnen die Tage davor weiter mit dem alten Modell – auch wenn dort später eine Buchung nachgetragen oder ein Urlaub geändert wird.
- In der Verwaltung unter „Mitarbeiter“ lässt sich ein neues Zeitmodell ab einem bestimmten Tag eintragen, auch rückwirkend oder schon für einen späteren Monat. Vorher zeigt eine Vorschau, welche Tage, Urlaube und Zeitkonten sich dadurch ändern; Einträge lassen sich auch korrigieren oder löschen.
- Wechselt das Zeitmodell mitten im Monat, stehen im Zeitnachweis beide Modelle mit Datum.
- Urlaub aus der Zeit vor dem ersten Zeitmodell zählt Montag bis Freitag.

### Added
- Zeitmodell-Verlauf, Schritt 1 (Grundlage): Tabelle `user_time_models` (Mitarbeiter, Zeitmodell, gültig ab, angelegt von/wann; Migration `1737000117000` übernimmt jedes vorhandene Zeitmodell ab dem Zeiterfassungs-Start). Beim Ändern eines Mitarbeiters entsteht ein Verlaufseintrag – erste Zuordnung ab Zeiterfassungs-Start, spätere ab heute; Entfernen des Modells lässt den Verlauf stehen. Hilfsfunktionen in `utils/timeModelHistory.js` („Modell an Datum X“). Gerechnet wird noch mit `users.time_model_id` – die Umstellung folgt in Schritt 2
- Feste Testsammlung Zeiterfassung/Urlaub: `npm run test:integration` startet eine Wegwerf-Datenbank (Docker-Container `mds-test-db`, `127.0.0.1:5434`, Daten im RAM), spielt alle Migrationen ein und prüft die echten Rechenwege (Tagesberechnung, Nacht-Job, Urlaub anlegen inkl. Sync, Urlaubstage, Zeitnachweis-Stichtag) – 22 Fälle aus den Fixes 12.–15.10. (`tests/integration/test-zeiterfassung.js`). `npm test` startet die schnellen Tests ohne Datenbank (`tests/run-unit-tests.js`). Anleitung in `backend/tests/RUN-TESTS.md`
- `getPayrollVacation` exportiert (für die Tests)
- Zeitmodell-Verlauf, Schritt 3 (Backend): `GET /api/users/:id/time-models` (Verlauf mit gültig bis, aktuell/künftig, Wochenstunden, angelegt von), `POST …/time-models/preview` (Vorschau für Anlegen/Korrigieren/Löschen: betroffene Tage mit altem/neuem Soll und Saldo, Saldo-Änderung je Monat mit Kennzeichen „vergangener Monat“, Urlaube mit alten/neuen Tagen, erhaltene manuelle Soll-Werte – speichert nichts), `POST …/time-models` (neues Zeitmodell ab Datum, auch rückwirkend oder künftig), `PUT`/`DELETE …/time-models/:entryId` (Eintrag korrigieren/löschen; der einzige Eintrag ist nicht löschbar). Speichern rechnet den betroffenen Zeitraum neu: vorhandene Tageswerte (manuelles Soll bleibt), neue Arbeitstage werden angelegt wie vom Nacht-Job, Tageswerte ohne Stempel an Tagen, die frei werden, entfernt; Urlaubstage (genehmigt/beantragt) und Monatssalden ab dem ersten betroffenen Monat. Audit-Log `user_time_model` mit optionalem Grund (`reason`). Rechte `user.read`/`user.update`. Logik in `services/timeModelChangeService.js`
- Zeitmodell-Verlauf, Schritt 3 (Oberfläche): In den Mitarbeiter-Einstellungen (Urlaub & Arbeitszeit → Verwaltung → Mitarbeiter) zeigt der aufgeklappte Mitarbeiter den Zeitmodell-Verlauf (Modell mit Wochenstunden, gültig von–bis, „aktuell“/„geplant“, angelegt am/von). „Neues Zeitmodell ab …“ (Vorschlag: nächster Monatsanfang), Korrigieren und Löschen zeigen zuerst die Vorschau – geänderte Tage, Saldo je Monat, Warnung bei vergangenen Monaten, Abwesenheiten mit alten/neuen Tagen, Tagesliste zum Aufklappen – und speichern erst mit „Übernehmen und neu berechnen“; optional mit Grund fürs Protokoll (`components/vacations/TimeModelHistory.jsx`)
- Testsammlung: `tests/integration/test-zeitmodell-aenderung.js` (25 Fälle – rückwirkend, korrigieren, löschen, neuer Arbeitstag, künftig datiert, Prüfungen, Anzeige heute gültig, Zeitmodell löschen, Deaktivieren), `.http`-Szenarien `tests/test-user-time-models.http`

### Changed
- Zeitmodell-Verlauf, Schritt 2 (Rechnen): Tagesberechnung (`updateDailySummary`), Nacht-Job (`generateAbsenceEntries`), Urlaubs-Sync, Urlaubstage (`calculateWorkingDaysByYear`, damit auch Zeitnachweis-Stichtag) und Terminal-Tagessoll nehmen das am jeweiligen Tag gültige Zeitmodell aus `user_time_models` statt `users.time_model_id`. Vor dem ersten Verlaufseintrag gilt kein Modell: Zeiterfassung ohne Soll (Nacht-Job legt keine Tage an), Urlaub Mo–Fr – erledigt das „ab“-Datum. `countWorkingDays`/`countWorkingDaysByYear` nehmen statt eines Modells auch eine Funktion „Modell je Tag“. Nacht-Jobs wählen Mitarbeiter mit Verlaufseintrag statt mit `time_model_id`. Anzeigen (Modellname) lesen weiter `users.time_model_id`
- Mitarbeiter-Einstellungen: Das Auswahlfeld „Zeitmodell“ gibt es nur noch beim ersten Aktivieren der Zeiterfassung eines Mitarbeiters ohne Modell (gilt ab Zeiterfassungs-Start); Wechsel laufen über den Verlauf. Deaktivieren entfernt das Zeitmodell nicht mehr (Hinweis und Rückfrage angepasst), die Warnung „neues Modell gilt auch für vergangene Tage“ entfällt
- Zeitmodell-Verlauf, Schritt 3 (Backend): Anzeigen des Modellnamens (Terminal, Benutzer-API, Zeitkonten, Zeitmodell-Liste „Benutzer“) zeigen das heute laut Verlauf gültige Modell (`currentTimeModelJoin` in `utils/timeModelHistory.js`, Europe/Berlin) statt `users.time_model_id` – künftig datierte Einträge greifen ab ihrem Datum. `users.time_model_id` wird bis Schritt 4 auf das heute gültige Modell mitgeführt. Zeitnachweis (einzeln und alle): bei einem Wechsel im Monat beide Modelle im Kopf („A (bis 14.09.), B (ab 15.09.)“). Zeiterfassung deaktivieren bzw. `time_model_id: null` bei `PUT /api/users/:id` lässt Zeitmodell und Verlauf stehen. `updateDailySummary` aufgeteilt in `computeDailySummary` (rechnet, speichert nicht – auch für die Vorschau) und Speichern; Option `skipBalance`. `calculateWorkingDaysByYear` nimmt optional einen Resolver „Modell je Tag“
- Testsammlung: Mitarbeiter bekommen einen Verlaufseintrag ab Zeiterfassungs-Start; neue Fälle Modellwechsel im Monat (Nacht-Job, Neuberechnung, Stempeln am neuen freien Tag), Urlaub über den Wechsel, Urlaub/Nacht-Job vor dem ersten Eintrag, Terminal-Tagessoll (31 Fälle) sowie Unit-Tests „Modell je Tag“

### Fixed
- Zeitmodell löschen, das nur noch im Zeitmodell-Verlauf steht: 400 mit Hinweis (betroffene Mitarbeiter) statt 500 durch den Fremdschlüssel

---

## [2.9.5] - 2026-10-15 - Halber Arbeitstag an Heiligabend/Silvester, Krank nach Arbeitsbeginn

### Für Anwender
- Heiligabend und Silvester sind halbe Arbeitstage: Bis Mittag gilt die halbe Sollzeit (z. B. 4:15 Std. bei 8:30 Std. Soll). Wer nicht kommt, trägt einen halben Urlaubstag ein – ohne Stempelung und ohne Urlaub erscheint der Tag als fehlende Buchung.
- Wer nach Arbeitsbeginn krank nach Hause geht (oder an dem Tag Urlaub, Schulung o. Ä. hat), bekommt im Zeitkonto die gearbeitete Zeit plus den Rest bis zum Soll gutgeschrieben – nicht mehr das volle Soll zusätzlich. Der Tag zeigt die Abwesenheit als Status.

### Changed
- Halbe Feiertage (24.12./31.12.) als halber Arbeitstag (`HALF_HOLIDAY_IS_WORKDAY = true` in `utils/dayAbsence.js`, mit der Buchhaltung abgestimmt): volles Soll, halbes Soll als Feiertag gutgeschrieben – ohne Stempel −halbes Soll, mit Urlaub ±0 (passt zur Urlaubsberechnung, die dort 0,5 Tage zählt). Ohne Abwesenheit kein Status „Feiertag“, sondern wie ein normaler Arbeitstag (ohne Stempel „fehlende Buchung“). Bisher: halbes Soll + halbe Gutschrift, Tag ohne Stempel ±0

### Fixed
- Teilweise Abwesenheit: Der Urlaubs-Sync füllte bis zum Soll auf (2 h gearbeitet + 6:30 Krank = ±0), die Tagesberechnung schrieb bei jeder späteren Neuberechnung (Korrektur, Tagesinfo, Auto-Abschluss, Stempeln nach der Krankmeldung) das volle Soll zusätzlich gut (+2 h). Jetzt überall Auffüllen nach dem Lohnausfallprinzip: `calculateDayAbsence` erhält die gestempelte Zeit (`workedMinutes`), Gutschrift = Soll − Feiertagsanteil − gestempelte Zeit, nie unter 0. Der Urlaubs-Sync rechnet Tage mit Stempelungen über `updateDailySummary` (vorher eigene Formel, Status blieb „complete“; `credited_minutes` wird nicht mehr geschrieben – wurde nirgends gelesen)

---

## [2.9.4] - 2026-10-14 - Mitarbeiter-Einstellungen mit Speichern

### Für Anwender
- Urlaub & Arbeitszeit → Verwaltung → Mitarbeiter: Einstellungen werden nicht mehr bei jedem Klick sofort gespeichert. „Details bearbeiten“ öffnet die Einstellungen direkt unter dem Mitarbeiter, gespeichert wird erst mit „Speichern“. Vor dem Ändern des Zeitmodells und dem Abschalten der Zeiterfassung kommt eine Rückfrage.

### Fixed
- Mitarbeiter-Einstellungen (`EmployeeSettingsPanel`): Schalter Urlaub/Zeiterfassung, Zeitmodell und „ab“-Datum speicherten sofort – ein versehentlicher Klick (z. B. Touchpad) schaltete die Zeiterfassung ab und entfernte das Zeitmodell, beim Eintippen des Datums wurden Zwischenstände gespeichert. Jetzt Übersicht ohne Eingabefelder, Bearbeiten im aufgeklappten Bereich mit Speichern/Abbrechen (nur geänderte Felder), Rückfrage bei Zeitmodell-Wechsel und Deaktivieren. Der aufgeklappte Bereich stand unter dem letzten Mitarbeiter statt unter dem gewählten. „Heute“ beim Aktivieren jetzt in Europe/Berlin (vorher UTC)

---

## [2.9.3] - 2026-10-14 - Feiertage in Urlaub und Zeiterfassung

### Für Anwender
- Das Bundesland unter Urlaub → Einstellungen → Allgemein gilt jetzt überall gleich: für Urlaubstage, Zeiterfassung und Kalender. Beim Umstellen erscheint ein Hinweis, dass bereits berechnete Werte nicht automatisch neu berechnet werden.
- Feiertage in der Zeiterfassung werden jetzt immer gleich gerechnet. Bisher konnte ein Feiertag nachträglich mit vollem Minus im Zeitkonto landen, z. B. wenn an dem Tag eine Notiz eingetragen oder gestempelt wurde. Urlaub über einen Feiertag zählt den Feiertag als Feiertag.

### Fixed
- Feiertage: Das Bundesland kam nur im Frontend aus der Einstellung „Standard-Region“ (`default_region`). Urlaubsberechnung, automatisches Erzeugen und die Feiertags-API ohne Regionsangabe rechneten fest mit „BY“; die Tagesberechnung der Zeiterfassung (`updateDailySummary`, Nacht-Job `generateAbsenceEntries`) und der Urlaubskalender filterten gar nicht nach Region – nach einmaligem Umstellen auf ein anderes Bundesland zählten dessen Feiertage dauerhaft für alle (z. B. Buß- und Bettag in Sachsen). Jetzt überall `getHolidayRegion()` (`utils/holidayRegion.js`, liest `default_region`, Rückfall „BY“). Hinweis im Einstellungsformular beim Umstellen
- Zeiterfassung, Feiertage und Abwesenheiten: drei Stellen rechneten Soll, Gutschrift und Status unterschiedlich. `updateDailySummary` (bei jeder Buchung, Korrektur, Tagesinfo, Auto-Abschluss) setzte an Feiertagen volles Soll ohne Gutschrift (−Soll im Saldo, Arbeit am Feiertag gegen volles Soll), der Urlaubs-Sync (`syncDailySummaryForVacation`) kannte keine Feiertage, der Nacht-Job (`generateAbsenceEntries`) priorisierte Feiertag vor Urlaub und kannte als einziger halbe Feiertage. Jetzt gemeinsame Regel `calculateDayAbsence` (`utils/dayAbsence.js`, Tests `tests/test-day-absence.js`): Feiertagsanteil bei „Feiertage gutschreiben“ als Ist gutgeschrieben, sonst vom Soll abgezogen (vorher −Soll); Abwesenheit mit Gutschrift füllt das restliche Soll; ganzer Feiertag hat Status „Feiertag“ auch im Urlaub. Halbe Feiertage unverändert wie bisher im Nacht-Job (`HALF_HOLIDAY_IS_WORKDAY = false`, Klärung offen)

### Removed
- Einstellung `holiday_region` (Migration `1737000116000`) – wurde nirgends gelesen

---

## [2.9.2] - 2026-10-13 - Backup-Anzeige, Zeitnachweis und Upload-Meldungen

### Für Anwender
- Der Backup-Status unter Administration → Cron-Jobs zeigt jetzt, wann das neueste Backup erstellt wurde (z. B. „von 13.10., 02:30“), statt der wenig aussagekräftigen Angabe „vor 0h“.
- Zeitnachweis für den laufenden Monat: Das Urlaubskonto zeigt den Stand von heute statt schon vom Monatsende. Urlaub, der erst noch kommt, steht unter „Genehmigt, nach Stichtag“ und zählt nicht mehr als genommen.
- Beim Hochladen von Wiki-Bildern und Fotos zu Einrichteblättern erscheint bei einem Fehler jetzt die konkrete Meldung (z. B. „Nur Bilder erlaubt“). Werkzeug-Dokumente und Verbrauchsmaterial melden sich durchgehend auf Deutsch.

### Changed
- `scripts/backup.sh`: Bei manuellem Aufruf im Terminal landet die Ausgabe zusätzlich in `backup.log` (Kennzeichnung „(manuell, Benutzer)“) – bisher schrieb nur der Cron-Lauf über die Umleitung in der Crontab ins Log, die Backups vor einem Deploy fehlten dort. Cron-Aufruf unverändert (keine TTY → keine doppelten Zeilen)
- Backup-Monitor (Cron-Jobs-Seite): „neuestes: … MB von TT.MM., HH:MM“ (Europe/Berlin) statt „(vor Xh)“ – die Prüfung läuft 30 min nach dem Backup, das gerundete Alter war immer 0; ohne Datum im Ergebnis weiter das Alter (Rückfall)
- `npm run dev:init`: Die verdeckte Passwortabfrage steht jetzt in einem deutlich abgesetzten Block („Admin-Passwort festlegen – Eingabe wird nicht angezeigt“) – nach den npm-Kopfzeilen ging sie leicht unter

### Fixed
- Zeitnachweis-PDF (Einzel und Sammel): Stichtag des Urlaubskontos war immer das Monatsende – im laufenden Monat stand z. B. am 13.10. schon „Stand 31.10.“, und „Genommen bis 31.10.“ enthielt künftigen genehmigten Urlaub. Stichtag jetzt Monatsende, höchstens heute (Europe/Berlin, `toDateStr`); vergangene Monate unverändert (`getPayrollVacation`)
- Upload-Fehlermeldungen: Wiki-Bilder (`WikiArticleForm`) zeigten immer nur „Fehler beim Hochladen“, Einrichteblatt-Fotos (`SetupSheetPhotos`) gar nichts – jetzt die Meldung aus der Antwort. Werkzeug-Dokumente und Verbrauchsmaterial meldeten einen falschen Dateityp auf Englisch; `consumableDocumentsController` komplett übersetzt (alle Antworten), Werkzeug-Meldung nennt jetzt auch die erlaubten Textdateien (TXT, CSV)

---

## [2.9.1] - 2026-10-13 - Urlaubsanzeige und Fehlerbehandlung

### Für Anwender
- Urlaub über den Jahreswechsel wird jetzt überall gleich angezeigt: die Tage des gewählten Jahres und daneben der Rest im anderen Jahr, z. B. „5 T (+2 in 2027)“ statt „5 von 7 T“ – im Urlaubskonto, in „Mein Bereich“ und in den Urlaubs-PDFs.
- Beim Beantragen oder Eintragen zeigt die Vorschau, wie sich die Tage auf die Jahre verteilen, z. B. „7 Arbeitstage (5 in 2026, 2 in 2027)“. Dasselbe steht bei offenen und eigenen Anträgen.
- In den Urlaubs-PDFs überdeckte der Rahmen des Urlaubskontos die untere Zeile (Genommen, Genehmigt, Beantragt, Rest) – jetzt ist sie wieder vollständig lesbar.
- Wer eine Datei mit nicht erlaubtem Dateityp hochlädt, bekommt jetzt überall die passende Meldung (z. B. „Nur Bilder erlaubt“) statt eines allgemeinen Serverfehlers.

### Changed
- Urlaub über den Jahreswechsel, einheitliche Anzeige aus `days_by_year`: neuer Helper `frontend/src/utils/vacationDays.js` (`formatDaysInYear`, `formatOtherYears`, `formatYearSplit`) für Detail-Modal (Urlaubskonto), Mein Bereich, Offene Anträge, Meine Anträge und Antragsformular; `POST /api/vacations/check-overlap` liefert zusätzlich `daysByYear`. PDFs (`vacationReportsController`): Spalte „Tage“ zeigt den Anteil im Berichtsjahr, darunter klein die übrigen Jahre – nur diese Zeilen werden höher
- Detail-Modal (Urlaubskonto): „von …, Datum“ der Genehmigung wird bei Platzmangel gekürzt (voller Text als Tooltip) statt unter die Tagesangabe zu laufen

### Fixed
- Urlaubs-PDFs: In der Box „Urlaubskonto“ lag die zweite Wertezeile (Genommen/Genehmigt/Beantragt/Rest) auf bzw. unter dem Rahmen – Sammel-PDF (`exportAll`) um 4 pt, „Mein Jahr“ und „Mitarbeiter“ um 2 pt. Boxen erhöht (75 → 85, 85 → 93, mit Korrektur 95 → 100), folgender Inhalt rückt mit; im Sammel-PDF stehen die Werte jetzt wie in den anderen PDFs mit „Tage“
- Globaler Fehler-Handler (`server.js`) antwortete bei jedem Fehler mit 500 und gab `err.message` heraus. Jetzt: Status aus dem Fehler (body-parser: kaputtes JSON 400, Body zu groß 413, unbekannter Zeichensatz 415), `MulterError` 413 bzw. 400, deutsche Meldungen für JSON-Fehler; 4xx mit Meldung in `error` und `message` (Stores lesen teils das eine, teils das andere), 500 nur noch `Interner Serverfehler` – Details im Log. Die Dateifilter der Uploads ohne eigenen Fehler-Handler (Kalibrierungen, Vorrichtungs-, Kunden-, Spannmittel-, Maschinen-, Werkzeug-Dokumente, Einrichteblatt-Fotos, Verbrauchsmaterial, Wiki-Bilder) setzen `status = 400` – ihre Meldungen kamen bisher als 500 an
- CORS war fest auf `http://localhost:5173` eingetragen, `CORS_ORIGIN` wurde nicht gelesen. Jetzt aus `CORS_ORIGIN` (mehrere Adressen kommagetrennt, ohne Variable wie bisher `http://localhost:5173`); `"*"` oder ein leerer Wert wird mit Warnung im Log abgelehnt. `CORS_ORIGIN: "*"` aus `compose.yaml` entfernt – in Produktion laufen Frontend und API über Caddy unter derselben Adresse, Verhalten unverändert. `backend/.env.example`: 3000 → 5173

---

## [2.9.0] - 2026-10-12 - Arbeitsgänge, Rollen und Rechte

### Für Anwender
- Unter Bauteil → Arbeitsgänge zeigt jeder Arbeitsgang jetzt nur noch seine eigenen NC-Programme, Einrichteblätter und Prüfpläne. Bisher konnten bei mehreren Arbeitsgängen Einträge eines anderen Arbeitsgangs erscheinen oder ein Arbeitsgang fälschlich leer aussehen.
- Den Status eines NC-Programms (z. B. Freigabe) dürfen jetzt alle ändern, deren Rolle das Recht „Programme freigeben“ hat – bisher ging das nur mit der Rolle „programmer“.
- Im Zerobot-Rechner lassen sich Parameter, Maschinen und Backen wieder bearbeiten. Das Recht dazu („Zerobot-Parameter, Maschinen und Backen verwalten“) kann in der Benutzerverwaltung jeder Rolle gegeben werden.
- Administratoren können die vorgegebenen Rollen jetzt umbenennen und löschen, sobald ihnen niemand mehr zugeordnet ist.

### Added
- `npm run dev:init` (`backend/src/config/dev-init.js`): macht eine frisch migrierte Entwicklungs-DB benutzbar – setzt das Passwort von `admin` (verdeckte Eingabe oder `DEV_ADMIN_PASSWORD`, legt den User bei Bedarf an), weist die Rolle `admin` zu und gibt ihr alle vorhandenen Berechtigungen; wiederholbar, verweigert `NODE_ENV=production`
- Migration `1737000113000_add-tool-storage-stock-permissions`: legt `tools.*`, `storage.*` und `stock.*` (16 Berechtigungen, bisher nur in `scripts/init.sh`) an und weist sie der Rolle `admin` zu; in Produktion ohne Wirkung (`ON CONFLICT DO NOTHING`), `down` bewusst leer
- Migration `1737000114000_grant-all-permissions-to-admin`: Rolle `admin` erhält alle vorhandenen Berechtigungen – gleicht Migrationen aus, die ihre Rechte nicht (`maintenance.*`, `time_tracking.manage/settings`) oder an nicht existierende Rollennamen (`measuring.*` an `Administrator`) vergeben haben; in Produktion ohne Wirkung, `down` bewusst leer
- Migration `1737000115000_add-zerobot-manage-permission`: Berechtigung `zerobot.manage` (Zerobot-Parameter, Maschinen und Backen verwalten), der Rolle `admin` zugewiesen
- Seed: Standardrechte für die Standardrollen `helper`, `operator`, `programmer`, `reviewer`, `supervisor` (`backend/src/config/devRoleDefaults.js`, Vorlage: Zuordnung der Produktion), damit Testbenutzer auf einer frischen DB wie im Betrieb arbeiten; nie bei `NODE_ENV=production`. CLAUDE.md: Migrationen vergeben Rechte nur an `admin`

### Fixed
- `npm run seed` brach mit 42P10 ab: `ON CONFLICT (part_id, op_number)` auf `operations`, der Constraint wurde in Migration `1737000072000` entfernt. Arbeitsgänge, Programm und Wartungsplan jetzt per `WHERE NOT EXISTS` – ein zweiter Lauf erzeugt keine Duplikate mehr (vorher Arbeitsgänge, Programm/Revision, Wartungsplan/Checkliste doppelt)
- Zerobot-Rechner: Parameter ändern sowie Maschinen und Backen anlegen/löschen lieferte für alle Benutzer 403 – auch für den Admin. Die Routen verlangten `requirePermission('admin')`, eine Berechtigung `admin` gab es nie. Sie verlangen jetzt `zerobot.manage`; die Seite blendet die Bearbeiten-Funktionen über dieselbe Berechtigung ein statt über die Rolle `admin`
- Migration `1737000094000_create-cron-job-logs` nutzte den App-Pool (`src/config/db`, Variablen `DB_*`) statt der Verbindung von node-pg-migrate – bei abweichender Konfiguration landete `cron_job_logs` in einer anderen DB, außerdem lief sie außerhalb der Migrations-Transaktion. Jetzt `pgm.sql` mit identischem Schema; bereits migrierte DBs sind nicht betroffen. CLAUDE.md: Regel „Migrationen nur über `pgm`“
- Backend beendete sich nach SIGTERM nicht: der Handler stoppte nur die Cron-Jobs und schloss einen der beiden DB-Pools, der HTTP-Server blieb offen – `docker stop` wartete jedes Mal 10 s bis zum SIGKILL, und der Pool war schon zu, während noch Anfragen ankamen. Jetzt in dieser Reihenfolge: Cron stoppen, `server.close()` (laufende Anfragen werden fertig), beide Pools (`server.js` und `config/db`) schließen, `exit 0`; gilt auch für SIGINT. Notbremse nach 8 s mit `exit 1`
- Programm-Workflow: `POST /api/workflow/change` prüfte die Rolle `programmer` statt einer Berechtigung – eigene Rollen konnten den Status nie ändern, und ein Umbenennen der Rolle hätte die Freigabe für alle außer admin gesperrt. Jetzt `requirePermission('program.release')`; die Workflow-Buttons erscheinen ebenfalls nur noch mit `program.release` (vorher `part.update` – Buttons sichtbar, Aktion 403)
- **Arbeitsgänge zeigten Daten anderer Arbeitsgänge** (Bauteil → Arbeitsgänge): `programsStore`, `setupSheetsStore` und `inspectionPlansStore` hielten je eine gemeinsame Liste bzw. einen gemeinsamen Prüfplan für alle Arbeitsgänge. Weil auch zugeklappte Arbeitsgänge eingebunden bleiben und laden, erschien die zuletzt eintreffende Antwort unter allen – z. B. das Programm eines anderen Arbeitsgangs mit Download- und Workflow-Buttons, das Einrichteblatt von OP10 unter OP20 mit „Löschen“, der Prüfplan von OP20 unter OP10; „Nach oben/unten“ im Prüfplan schickte dabei die Merkmale des angezeigten (falschen) Plans. Jetzt Daten je Arbeitsgang (`programsByOperation`, `setupSheetsByOperation`, `inspectionPlanByOperation` mit Lade-/Fehlerstatus je Arbeitsgang). Außerdem: Detailansicht eines Einrichteblatts nur, wenn das geladene zum geöffneten passt; Kopfzeile im Einrichteblatt-Formular nur mit passendem Arbeitsgang; Programmhistorie las nach dem Laden die alte Liste

### Changed
- Seed: echte Firmennamen und Kontaktdaten bei Kunden und Lieferanten durch Platzhalter ersetzt (`KD00001`–`KD00003`, `*.example`)
- Seed erweitert um 5 Einträge im Werkzeugstamm (aus Migration `1737000023000`), Rüstblatt, Werkzeugliste und Prüfplan für das Beispielteil sowie optional je Rolle einen Testbenutzer (`programmer1`, `reviewer1`, `operator1`, `helper1`) – nur mit `SEED_TEST_USER_PASSWORD`, nie bei `NODE_ENV=production`. Die Audit-Beispiele aus Migration `1737000020000` werden bewusst nicht übernommen
- README/`backend/docs/DATABASE.md`: Admin-Passwort `admin123` stimmte nicht (Hash der ersten Migration passt nicht dazu); Ablauf `migrate:up` → `dev:init` → `seed` dokumentiert, Hinweis dass `scripts/init.sh` das Admin-Passwort bei jedem Lauf zurücksetzt
- `scripts/init.sh`: legt keine Berechtigungen mehr an (doppelte Liste entfernt, das übernehmen die Migrationen, die `deploy.sh` bei jedem Deploy ausführt). Admin-Passwort `admin123` nur noch beim ersten Lauf (Admin neu bzw. noch mit dem Platzhalter-Hash aus der ersten Migration); ein bestehendes Passwort bleibt, Zurücksetzen nur mit `ADMIN_PASSWORD_RESET=1`. Fehler beim Anlegen des Admins brechen das Skript jetzt ab (vorher Exit 0 und „Installation abgeschlossen“). DEPLOYMENT.md, README, `backend/docs/DATABASE.md` angepasst
- CLAUDE.md: Regel „Berechtigungen nur per Migration, in derselben Migration der Rolle `admin` zuweisen“
- Rollenverwaltung: Standardrollen (`programmer`, `reviewer`, `operator`, `helper`, `supervisor`) lassen sich umbenennen und – ohne zugeordnete Benutzer – löschen; geschützt bleibt nur `admin` (Frontend und `DELETE /api/roles/:id`)

### Removed
- Testdaten aus Migrationen: `1737000005000_seed-test-customers` und `1737000020000_seed-comprehensive-testdata` sind jetzt leer (`up`/`down` ohne Wirkung), in `1737000023000_create-tool-master` entfallen die Beispielwerkzeuge. Eine frisch migrierte DB enthält nur noch Stammdaten und den User `admin`; Testdaten kommen ausschließlich über `npm run seed` (in Produktion optional über `scripts/init.sh`). Bereits migrierte DBs sind nicht betroffen – node-pg-migrate führt gelaufene Migrationen nicht erneut aus

---

## [2.8.0] - 2026-10-11 - Urlaubsberechnung und eigene Anträge

### Für Anwender
- Eigene Urlaubsanträge lassen sich unter „Mein Bereich“ → „Meine Anträge“ jetzt selbst ändern oder zurückziehen, solange sie noch nicht genehmigt sind.
- Urlaubstage werden genauer berechnet: Urlaub über den Jahreswechsel wird auf beide Jahre aufgeteilt, Feiertage werden immer berücksichtigt, und Heiligabend und Silvester zählen als halber Urlaubstag.
- Zeitnachweise zeigen das Urlaubskonto zum Ende des gewählten Monats und berücksichtigen Korrekturen und Auszahlungen; auch die Urlaubs-PDFs enthalten jetzt Korrekturen am Anspruch.
- In der Urlaubsverwaltung passt der Resturlaub immer zum angezeigten Jahr, das sich direkt neben „Resturlaub“ wechseln lässt.
- Deaktivierte Maschinen werden in Auswahlfeldern nicht mehr angeboten, und ein Fehler beim Erstellen eines PDFs startet das MDS nicht mehr neu.

### Added
- Eigene Urlaubsanträge bearbeiten/zurückziehen: `PUT /api/vacations/:id/own` (Art, Zeitraum, Uhrzeit, Notiz; nur eigene, Status `pending`/`rejected`, abgelehnte werden dabei erneut eingereicht) und `POST /api/vacations/:id/withdraw` (setzt Status `cancelled`), beide mit `vacations.read`; Buttons „Bearbeiten“ und „Zurückziehen“ in „Meine Anträge“, `.http`-Szenarien EA-1 bis EA-15
- `countWorkingDaysByYear` in `utils/workingDays.js` + 6 Tests; `.http`-Szenarien JW-1 bis JW-18 in `test-vacations.http`

### Changed
- `GET /api/vacations` liefert zurückgezogene Anträge (`cancelled`) nur noch bei ausdrücklichem `status=cancelled`; „Meine Anträge“ aktualisiert nach Aktionen auch Saldo und Abwesenheiten
- ROADMAP: Idee „Texte gestalten (Rich-Text-Editor)“, Fix-Liste um Urlaub über den Jahreswechsel, eigene Anträge bearbeiten, deaktivierte Maschinen in Auswahllisten, Wartungspläne kopieren, Rollenfarben/-deaktivierung und Berechtigungen per Migration ergänzt

### Fixed
- Zeitnachweis-PDFs (`exportPayrollPDF`, `exportPayrollAllPDF`): Urlaubskasten las `vacation_balances` und damit den Stand zum Druckdatum (genommen/genehmigt nach `CURRENT_DATE`, alle geplanten Tage vom Rest abgezogen). Jetzt Stichtag Monatsende (`getPayrollVacation`): genommen = genehmigter Urlaub bis Stichtag (über das Monatsende anteilig), Rest = Verfügbar − genommen, danach genehmigt/beantragt als Info; Korrektur angezeigt. „Saldo neu“ ohne Korrektur/Auszahlung des Monats – jetzt Saldo Vormonat + Überstunden + `adjustment_minutes` − `payout_minutes` aus `time_balances` mit eigenen Zeilen (`getPayrollTimeAccount`). Kästen beider Exporte in `drawPayrollBoxes` zusammengeführt
- Urlaubs-PDFs: Mitarbeiter-PDF (`exportMyYear`) und Gesamt-PDF (`exportAll`) rechneten „Verfügbar“/„Rest“ ohne `adjustment`. Alle drei Urlaubs-PDFs lesen den Saldo jetzt aus der View `vacation_balances` (wie die Oberfläche) statt aus je eigenen Teilabfragen; Korrektur wird angezeigt (Kasten: „Korrektur“ wenn ≠ 0 und „Verfügbar“, Gesamttabelle: Spalte „Korr.“)
- Urlaubsverwaltung: Salden blieben nach einem Jahreswechsel im Kalender auf dem Jahr des Seitenaufrufs (nur `initialize` lud sie), und Einstellungen → Urlaubsansprüche überschrieb sie mit dem dort gewählten Jahr – Überschrift, Detail-Modal und Export zeigten ein anderes Jahr als Salden-Karten und Kacheln. `vacationsStore`: `balancesYear`, veraltete Antworten werden verworfen, `setFilters` lädt Salden bei Jahreswechsel nach; Verwaltung lädt nach, wenn `balancesYear` ≠ angezeigtes Jahr. Jahreswechsel-Pfeile neben „Resturlaub“, Kacheln mit Jahr beschriftet
- Urlaubstage: halbe Feiertage (`is_half_day`, Heiligabend/Silvester) zählten als ganz frei (0 Tage), die Zeiterfassung rechnet dort aber mit halbem Soll. Jetzt 0,5 Tage, wenn laut Zeitmodell Arbeitstag (`countWorkingDays`/`countWorkingDaysByYear` mit Parameter `halfDayHolidays`). Migration `1737000112000` ergänzt bestehende Urlaube mit halben Feiertagen ab 01.01.2026 um je +0,5 (`calculated_days`, `days_by_year`; ältere Jahre unverändert, Urlaube mit erst später angelegtem Feiertag werden übersprungen und gemeldet); 5 Unit-Tests, `.http`-Szenarien HT-1/HT-2
- PDF-Exporte: Fehler nach `doc.pipe(res)` führten im `catch` zu `res.status(500).json()` auf eine bereits laufende Antwort → `ERR_STREAM_WRITE_AFTER_END`, Absturz des Backend-Prozesses. Neu `utils/pdfResponse.js` (`pipePdf`, `abortPdfResponse`: Stream abkoppeln, Verbindung abbrechen) in allen 11 gestreamten PDF-Endpunkten (Urlaub 3, Zeitnachweis/Zeitsalden 3, Reports 3, Messmittel 2); Test `backend/tests/test-pdf-response.js`
- Maschinen-Auswahl: Bearbeiten-Formulare blendeten eine zugeordnete, inzwischen deaktivierte Maschine aus (Anzeige „Keine Maschine“, obwohl zugeordnet), Rüstblatt und Wartungsplan boten inaktive Maschinen an. Neue Hilfsfunktion `selectableMachines` (aktive + bereits zugeordnete, Zusatz „(inaktiv)“) in Arbeitsgang, Einrichteblatt, Spannmittel, Vorrichtung, Wiki, Wartungsplan; Filter der Wartungsplan-Liste markiert inaktive. Vorrichtungs-Formular zeigte vor jeder Maschine „: “ (nicht vorhandenes Feld `machine.machine_id`)
- Urlaubstage: Feiertage eines Jahres wurden erst beim Aufruf des Kalenders erzeugt (`GET /api/holidays`). Fehlten sie bei der Berechnung, zählten Feiertage als Urlaubstage – dauerhaft gespeichert, auch nach späterem Erzeugen/Initialisieren. Jetzt erzeugt `calculateWorkingDaysByYear` fehlende Jahre vorab (`ensureHolidaysForYear`), für Anlegen, Antrag, Bearbeiten, erneutes Einreichen und Vorschau; `.http`-Szenarien FT-1 bis FT-3
- Urlaub über den Jahreswechsel: Tage werden je Kalenderjahr aufgeteilt (neue Spalte `vacations.days_by_year`, Migration mit Backfill). `vacation_balances`, Übertrag beim Initialisieren, die drei PDF-Reports sowie die Jahresfilter von `GET /api/vacations` und `/my-requests` rechnen mit dem Anteil des Jahres statt nach Startjahr; Listen liefern `days_in_year`
- Terminal-Benutzerinfo (`/api/time-tracking/entries/user-info`): Resturlaub war immer leer – Abfrage auf nicht existierende View `vacation_balances_view`

### Removed
- `backend/tests/seed-storage-permissions.js` und `test-reset-password.js` – überholt durch `scripts/init.sh` (legt Berechtigungen an, setzt Admin-Passwort zurück); enthielten fest eingetragene Zugangsdaten der Entwicklungs-DB

---

## [2.7.1] - 2026-10-08 - Datensicherung repariert

### Für Anwender
- Die nächtliche Datensicherung des MDS wurde repariert und wird jetzt jeden Tag automatisch auf Vollständigkeit geprüft.
- Administratoren sehen unter „Automatische Aufgaben“ sofort eine rote Fehlermeldung, falls eine Sicherung fehlt oder unvollständig ist.

### Fixed
- `scripts/backup.sh`: Die nächtlichen Backups waren leer (20 Bytes) – Cron startet in `/root`, `docker compose` fand die `compose.yaml` nicht, und ohne `pipefail` meldete das Script trotzdem Erfolg. Jetzt: Wechsel in den Repo-Ordner, `set -euo pipefail`, Prüfung auf Mindestgröße + Endmarke `PostgreSQL database dump complete`, ungültige Backups werden verworfen (Exit 1), alte Backups nur nach Erfolg gelöscht, klare Meldung ohne Schreibrechte, Zeitstempel im Log
- Backup-Monitor (`backup_monitor`): prüfte nur Existenz und Alter, leere Backups galten als „✓“. Jetzt eigenes Modul `services/backupMonitor.js` – neuestes Backup muss vollständig (Größe + Endmarke) und ≤ 26 h alt sein, sonst wird der Lauf als Fehler protokolliert (rot, mit letztem gültigen Backup in der Meldung)

### Added
- `backend/tests/test-backup-monitor.js` (10 Tests: leere/unvollständige/kaputte Backups, Alter, fehlendes Verzeichnis)

### Changed
- DEPLOYMENT.md: Backup-Abschnitt (root-Crontab, `sudo ./scripts/backup.sh`, Prüfung, Monitor); Release-Checkliste: allgemeiner Ablauf mit Backup-Prüfung, 2.7.0 als erledigt

---

## [2.7.0] - 2026-10-07 - Urlaub nach Zeitmodell & sicherer Deploy

### Für Anwender
- Bei Teilzeit-Modellen (z. B. 4-Tage-Woche) werden freie Wochentage nicht mehr als Urlaubstag abgezogen – weder beim Eintragen noch bei Urlaubsanträgen.
- Im Zeitmodell gibt es pro Wochentag (auch Samstag und Sonntag) einen Haken „Arbeitstag“.
- Beim Anlegen von Auswahlfeldern (Dropdown) in Maschinentypen und Werkzeug-Kategorien stürzt die Seite nicht mehr ab.
- Im Hintergrund wurden Sicherheits-Updates eingespielt und der Update-Ablauf des MDS abgesichert.

### Added
- Zeitmodell-Formular: Checkbox „Arbeitstag“ je Wochentag inkl. Sa/So (aus = Soll-Zeit leer)
- `backend/tests/test-working-days.js` (Arbeitstage nach Zeitmodell, Feiertage, DST)
- NC-Viewer: Rechtsklick „Öffnen mit NC-Viewer“ für `.H`/`.NC` unter Windows (`tools/nc-viewer/launcher`, Starter `NC-Viewer-Start.exe`, Einrichtung per bat ohne Adminrechte); passende STEP-Datei im selben Ordner wird automatisch mitgeladen
- NC-Viewer: `PLANE AXIAL` (Achswinkel, z. B. Horizontal-BAZ GROB G350 mit `A-90`) – Bahnen liegen jetzt auf der richtigen Werkstückseite
- Interpreter-Test für `PLANE AXIAL`

### Changed
- Abhängigkeiten ohne Breaking Changes aktualisiert (`npm audit fix`): Backend express 4.21.2 → 4.22.3 (behebt u. a. kritische Lücke in `proxy-addr`), Frontend axios 1.13 → 1.20, vite 7.1 → 7.3, react-router-dom 7.9 → 7.18, postcss, tailwindcss 3.4.19; Lücken Backend 16 → 5, Frontend 29 → 9 (Rest nur per Major-Update)
- `package-lock.json` für Backend, Frontend und `tools/nc-viewer` jetzt im Repo; `backend/Dockerfile` nutzt `npm ci --omit=dev`, `deploy.sh` baut das Frontend nur noch mit `npm ci` (kein stiller Fallback auf `npm install`, kein `--legacy-peer-deps`)
- ESLint: `eslint-plugin-react` mit Regel `react/jsx-no-undef` (fehlende Komponenten-Imports in JSX)
- `docs/RELEASE-CHECKLISTE.md` mit Sonderschritten für das nächste Release
- Repo aufgeräumt: Konzepte aus dem Root nach `docs/konzepte/` (`docs/ARCHITECTURE.md` → `MARKTANALYSE.md`, `Roadmap_wartung_infos.md` → `WARTUNG_NOTIZEN.md`), erledigte Feature-Dokus nach `docs/archiv/`, Session-Dokus bis Nov. 2025 nach `docs/sessions/archiv/` (Dateinamen ohne Leerzeichen)
- `backend/tests/`: `test-programs.http` = bisherige v6 (deckt v1–v5 ab), `test-parts.http` = bisherige `-FIXED`-Fassung
- ROADMAP aufgeräumt: Wochen-Nummern und Fortschrittsbalken entfernt, Abschnitt „Offene Fixes“, Shopfloor-Terminals vor Auftragsverwaltung, NC-Parser/Werkzeug-Extraktion in „TopSolid-Integration & NC-Programme“, Rohmaterial/Normteile in die Ideen, Erledigtes (Stammdaten-Optimierung, Urlaub, Zeit-Terminal) ins Archiv
- README neu geschrieben (Stand Okt. 2026): Module, Technik, lokale Entwicklung, Deployment, Projektstruktur – ohne Fortschrittsangaben, die auf ROADMAP/CHANGELOG verweisen

### Removed
- `backend/tests/test-programs-v2…v6.http`, `test-parts-FIXED.http`, `debug-parts.js`, ungenutztes `frontend/public/vite.svg`
- `QUICKSTART.md` (Stand Woche 3) und `CONTRIBUTING.md` – Inhalt in der README zusammengefasst

### Fixed
- `scripts/deploy.sh`: Migrationsfehler wurden verschluckt (`2>/dev/null … || echo "übersprungen"`) und der Deploy meldete trotzdem Erfolg. Jetzt: Backend-Image bauen → Migration per `docker compose run --rm` mit dem neuen Image → Frontend-Build → `up -d`; bei Migrationsfehler Abbruch mit Meldung, die bisherige Version läuft weiter. Health-Check mit `curl -f` und Wiederholung, Abbruch bei Fehler
- Custom-Fields-Editor: „Option hinzufügen“ bei Dropdown-Feldern stürzte ab (`Trash2` nicht importiert) – Maschinentypen und Werkzeug-Kategorien
- Verbrauchsmaterial: Upload-Dialog für Dokumente stürzte beim Öffnen ab (`X` nicht importiert)
- Urlaub: Urlaubstage (`calculated_days`) werden nach dem Zeitmodell des Mitarbeiters gezählt (Arbeitstag = Soll-Zeit > 0, ohne Zeitmodell weiter Mo–Fr) – betraf Eintragen, Bearbeiten, Vorschau, Antrag und erneutes Einreichen. Bestehende Einträge werden nicht neu berechnet
- NC-Viewer: Beim Herauszoomen verschwanden Aufspannung/Bahnen (Far-Clipping war an die zuletzt zentrierte Bahn gekoppelt) – Clipping-Ebenen werden jetzt laufend an Abstand und Szene angepasst

---

## [2.6.0] - 2026-10-06 - Was ist neu & TopSolid-Werkzeuge

### Für Anwender
- Neu: Ein Klick auf die Versionsnummer unten in der Seitenleiste zeigt „Was ist neu“ – eine Übersicht der Änderungen jeder Version.
- Nach einem Update erscheint an der Versionsnummer ein „Neu“-Hinweis, bis die Übersicht geöffnet wurde.

### Added
- Seite `/changelog` („Was ist neu“): Anwender-Fassung für alle, technische Abschnitte für Admins (Toggle)
- `GET /api/changelog`, `PUT /api/changelog/seen`; Parser-Service für `CHANGELOG.md` (Volume im Backend-Container)
- Migration `users.last_seen_version`, Neu-Badge in der Sidebar pro Benutzer
- `tools/`: TopSolid-Werkzeuge als Quellcode – NC-Viewer (`hh.js`-Interpreter + 3D), TS_SN_Generator, TS_ToolExport, TS_LibExport
- Konzepte `TOPSOLID_TOOL_IMPORT_KONZEPT.md` und `TOPSOLID_INTEGRATION_IDEEN.md`, ROADMAP-Abschnitt „TopSolid-Integration“
- `_lokal/` in `.gitignore` für Kundendaten und Werkzeugstamm-Exporte

### Changed
- `CLAUDE.md`: Regel „Repo ist öffentlich“ mit Platzhalter-Konvention, Release-Regel „Für Anwender“
- `.gitattributes`: `.bat`/`.cmd` werden mit CRLF ausgecheckt

---

## [2.5.1] - 2026-10-06 - Versionierung & Aufräumen

### Für Anwender
- Die aktuelle Programmversion steht jetzt unten in der Seitenleiste.

### Changed
- Version wird zentral aus `package.json` gelesen (Backend + Frontend auf 2.5.1 synchronisiert)
- Sidebar zeigt die Version aus `package.json` statt hartcodiertem `v2.4.2-dev`
- Backend: Root-Endpoint, `/api/health`, `/api/db/info` und Startup-Log liefern die echte Version; veraltete „Phase 3, Week 9“-Angaben entfernt
- `CLAUDE.md`: Arbeitsregeln an Claude-Code-Workflow angepasst (Abschnitt „Scope-Disziplin“), Versionierungs-Workflow dokumentiert
- `ROADMAP.md` auf Stand Oktober 2026 gebracht, CHANGELOG nachgetragen
- `.claude/settings.local.json` in `.gitignore`

### Removed
- Leere Dateien `mds-backend@1.0.0` und `node-pg-migrate` im Root (versehentlich durch npm-Befehle entstanden)

---

## [2.5.0] - 2026-04-19 - Stammdaten-Optimierung (PRs #66–#81)

### Für Anwender
- Vorrichtungen, Spannmittel, Maschinen, Kunden und Bauteile haben jetzt einheitliche Listen mit Kennzahlen, Schnellfilter, Kachel-/Tabellenansicht und Seitenweise-Anzeige.
- Kunden und Bauteile: Dokumente können hochgeladen und nach Typ sortiert werden.
- Maschinen: frei definierbare Zusatzfelder.
- Neue Vorrichtungen bekommen ihre Nummer automatisch.
- Wartung: Wartungstypen auf Deutsch und mit eigenem Symbol.

### Added
- **Maschinen:** Stammdaten-Verwaltung, Custom-Fields in MachineForm + DetailPage (#75, #76)
- **Kunden:** Dokumentenverwaltung (#79)
- **Bauteile:** Dokumenttypen (#80)
- **Vorrichtungen:** Vorrichtungsnummer wird beim Anlegen automatisch vergeben (#73)
- **Wartung:** dynamische Icons pro Wartungstyp (#67)

### Changed
- Einheitliches Listen-/Detail-Pattern (Stats-Cards, Live-Filter, Grid/Table, Pagination, Foto-Preview) für Vorrichtungen, Spannmittel, Maschinen, Kunden, Bauteile (#71, #72, #75, #78, #80)
- Wartungsplan-Liste: erweiterte Filter per default offen (#68)
- Wiederverwendbare Komponenten (CustomFields*, PdfViewer, StepViewer) nach `components/common/` verschoben (#81)

### Removed
- Legacy-Spalten aus `machines` (Abschluss 3-PR-Migration) (#77)

### Fixed
- Deutsche Wartungstyp-Bezeichnung in Dropdown, Tasks und Dashboard (#66, #69)
- Dark-Mode-Toggle in der Sidebar zeigt wieder dynamisches Icon (#74)

---

## [2.4.5] - 2026-04-16 - Entwicklungs-Setup (PRs #62–#65)

### Für Anwender
- Keine sichtbaren Änderungen (internes Entwicklungs-Setup).

### Added
- `CLAUDE.md` mit Projekt-Konventionen und Ordner-Struktur
- `.vscode`-Settings, Git-Workflow mit Branch-Namenskonvention

---

## [2.4.4] - 2026-04-15 - Upload-Standard & Cron (PRs #56–#61)

### Für Anwender
- Bilder und Downloads in Bauteilen, Programmen, Wartung und Verbrauchsmaterial werden zuverlässiger angezeigt.
- Wartungsaufgaben werden automatisch aus den Wartungsplänen erzeugt.

### Added
- Cron-Jobs `fs_garbage_collection` und `generate_maintenance_tasks` (#61)

### Changed
- MDS-weiter File-Upload-Standard: Bilder/Downloads nur noch via `/view` + `/download` hinter Auth (Bauteile, Programme, Wartung, Verbrauchsmaterial) (#57–#60)

### Fixed
- Setup-Sheet und Upload-Verzeichnis (#56)

---

## [2.4.3] - 2026-04-14 - Messmittel-Optimierungen (PR #55)

### Für Anwender
- Messmittel: mehrere Einträge auf einmal bearbeiten, Seitenweise-Anzeige, Tabellenansicht und erweiterte Etiketten.

### Added
- Messmittel: Bulk-Aktionen, Paginierung, Tabellen-Layout, Etiketten-Erweiterungen

---

## [2.4.2] - 2026-03-01 – 2026-04-01 - Zeiterfassung & Urlaub (PRs #49–#54)

### Für Anwender
- Urlaub: Detailansicht pro Mitarbeiter, PDF-Exporte und genauere Aufschlüsselung im Kalender.
- Zeitnachweis: Saldo aus dem Vormonat wird korrekt übernommen, nicht ausgestempelte Tage werden zur richtigen Uhrzeit geschlossen.

### Added
- Urlaubsstatus-Aufschlüsselung, Kalender-Schraffur (#49)
- VacationDetailModal, PDF-Exports, Saldo-Kaskadierung, Adjustment-Tabelle (#50, #52)

### Changed
- Lohnnachweis umbenannt in Zeitnachweis (#49)

### Fixed
- `/check-overlap` (#51)
- `auto_close_open_days` Zeitzonen-Fehler (#53)
- Zeitnachweis-Export übernimmt Vormonats-Saldo korrekt (#54)

---

## [2.4.1] - 2026-02-07 – 2026-02-23 - Zeiterfassungs-Terminal (PRs #44–#48)

### Für Anwender
- Stempeln am Terminal per NFC-Karte oder PIN; mehrere Karten pro Mitarbeiter möglich.
- Saldo-Berechnung und Lohnnachweis korrigiert.

### Added
- Terminal-API mit API-Key-Auth (`authenticateTerminal`), Stempel-/Batch-/User-Info-Endpoints
- Mehrere NFC-Chips pro Benutzer (`user_rfid_chips`)
- Server-Status-Endpoint für das Terminal (#47)

### Fixed
- `time_current_status`-View: `break_end` → `present`
- Saldo-Berechnung ohne offenen Tag, Lohnnachweis Timezone + Rundung (#48)

---

## [2.4.0] - 2026-02-06 - Zeiterfassung (PRs #41–#43)

### Für Anwender
- Neue Zeiterfassung: Kommen, Gehen und Pausen werden erfasst, offene Tage automatisch geprüft.
- Lohnnachweis als PDF.

### Added
- Zeiterfassungssystem mit Cron-Automatisierung und Selbst-Korrektur
- Mitarbeiter-Einstellungen, Pausen-Einstellungen, Dashboard-Überarbeitung
- Lohnnachweis-PDF-Export

---

## [2.3.3] - 2026-01-29 - Messmittel-Etiketten (PRs #38–#40)

### Für Anwender
- Messmittel: Etiketten drucken (mit Vorlagen) und per Barcode-Scanner aufrufen.

### Added
- Label-Generator mit Preset-System und Scanner-Integration

### Fixed
- Etiketten-Vorschau mit Lagerort

---

## [2.3.2] - 2026-01-28 - Zerobot (PR #37)

### Für Anwender
- Neuer Positionsrechner für die Zerobot-Beladeroboter.

### Added
- Positionsrechner für Beladeroboter

---

## [2.3.1] - 2026-01-25 - Urlaubs-Antrags-Workflow (PRs #35–#36)

### Für Anwender
- Urlaub kann jetzt beantragt und von Vorgesetzten genehmigt oder abgelehnt werden.

### Added
- Antrags-Workflow (beantragen → genehmigen/ablehnen)

### Changed
- Urlaubsmodul mit Tabs und Einstellungs-Panel neu strukturiert

---

## [2.3.0] - 2026-01-21 - Urlaubsplanung (PRs #32–#34)

### Für Anwender
- Neue Urlaubsplanung mit Kalender, Feiertagen und Warnung bei Überschneidungen.

### Added
- Urlaubskalender (Monat/Jahr), Überschneidungs-Check, Feiertage aller Bundesländer, Urlaubsansprüche, Rollen-Limits

---

## [2.2.4] - 2026-01-19 - Messmittel-UI (PRs #29–#31)

### Changed
- Feld-Kategorien, Checkout-Modal, Inventarnummer-Lücken, Navigation nach Erstellen, TypesModal-Redesign

---

## [2.2.3] - 2026-01-14 - Operationen-Varianten (PRs #25–#28)

### Added
- Operationstypen und Varianten-System für Arbeitsgänge
- pgAdmin-Setup in `init.sh`

### Fixed
- Löschen der primären OP-Variante

---

## [2.2.1] - 2025-12-11 - Bauteile & Suche (PRs #22–#24)

### Added
- Globale Suche, UI-Präferenzen
- Bauteile: Status-Dropdown, Historie-Tab, Hauptdokumente-Schnellzugriff, PDF-Viewer

---

## [2.2.0] - 2025-12-09 - Verbrauchsmaterial

### Added
- Vereinfachtes Verbrauchsmaterial-System mit Integrationen

---

## [2.1.4] - 2025-12-03 - Wartung & PWA (PRs #16–#21)

### Added
- Wartung: Standalone-Tasks, verbesserter Task-Workflow
- PWA-Support

### Fixed
- Hardcodierte API-URLs, MaintenanceWidget, Line-Endings auf LF normalisiert

---

## [2.1.3] - 2025-12-02 - Wiki & Maschinen-Dokumente

### Added
- Wiki-System (Kategorien, Volltext-Suche)
- MachineDetailPage mit Dokumenten-System

---

## [2.1.2] - 2025-12-01 - Erstes Deployment (PRs #11–#14)

### Added
- Docker-Setup für Raspberry Pi, `deploy.sh` mit Migrationen, erweiterte Seeds

---

## [2.1.1] - 2025-11-30 - Kundenverwaltung (PR #10)

### Added
- Kunden mit Ansprechpartnern und Bauteil-Zuordnung

---

## [2.1.0] - 2025-11-30 - Wartungssystem (PR #9)

### Added
- Wartungspläne, Checklisten, Foto-Upload, Skill-Level

---

## [2.0.0] - 2025-11-29 - UI & Benutzerverwaltung

### Added
- Sidebar-Layout (UI-Optimierung)
- User-Verwaltung mit Rollen und Berechtigungen

---

## [1.9.2] - 2025-11-29 - Vorrichtungen (PR #8)

### Added
- Vorrichtungs-Verwaltung mit Setup-Sheet-Integration

---

## [1.9.1] - 2025-11-28 - Spannmittel

### Added
- Spannmittel-Verwaltung mit Lager-Integration

---

## [1.9.0] - 2025-11-27 - Messmittel

### Added
- Messmittelverwaltung (Kalibrierung, Zertifikate, Checkout)

---

## [1.8.3] - 2025-11-25 - T-Nummern (PR #7)

### Added
- Werkzeug-Nummernlisten (T-Number-Management)

---

## [1.8.2] - 2025-11-24 - Bestellwesen (PR #6)

### Added
- Bestellungen (Purchase Orders)

---

## [1.8.1] - 2025-11-19 - Lieferanten

### Added
- Lieferantenverwaltung mit Werkzeug-Integration

---

## [1.8.0] - 2025-11-16 - Lager & Werkzeuge (PR #5)

### Added
- Lagerorte-System, Werkzeug-Datenbankschema, Lagerartikel mit Einzelgewichten

---

## [1.7.0] - 2025-11-09 - Werkzeuglisten & Prüfpläne (PR #4)

### Added
- Werkzeuglisten (Woche 11)
- Prüfpläne mit allen Toleranzarten (Woche 12)

---

## [1.6.0] - 2025-11-08 - Setup Sheets

### Added
- Setup Sheets Backend + Frontend (Woche 10)

---

## [1.5.0] - 2025-11-07 - Workflow & Dark Mode

### Added
- Workflow-System (Woche 9)
- Dark Mode für alle Komponenten

---

## [1.4.0] - 2025-11-06 - Maschinen (PRs #2–#3)

### Added
- Maschinen-Stammdaten Backend + Frontend (Woche 8)

---

## [1.3.0] - 2025-11-06 - Programm-Versionierung (PR #1)

### Added
- NC-Programm-Versionierung mit Diff-Viewer (Woche 7)

---

## [1.2.0] - 2025-11-05 - Programme

### Added
- Programme-Frontend mit Datei-Upload (Woche 6)

---

## [1.1.0] - 2025-11-04 - Arbeitsgänge

### Added
- Operations Backend CRUD + Frontend (Woche 5)

---

## [1.0.0] - 2025-11-03 - 🎉 PHASE 1 KOMPLETT!

### ✅ Woche 4: Integration & Testing - ABGESCHLOSSEN

**Datum:** 03. November 2025  
**Phase:** 1 - Fundament  
**Status:** ✅ Abgeschlossen  
**Arbeitszeit:** ~4 Stunden

#### Added
- **Frontend:**
  - Part Detail Page (`/parts/:id`) mit vollständiger Bauteil-Ansicht
  - Part Create/Edit Forms (`/parts/new`, `/parts/:id/edit`) mit Validierung
  - Toast Notification System (selbst gebaut, ohne externe Library)
  - Success/Error/Info Toasts mit Auto-dismiss und Manual Close
  - Layout Component mit Navigation und User Info
  - App.jsx mit Outlet-Pattern für verschachtelte Routes

#### Changed
- **Backend:**
  - CORS konfiguriert für Frontend (`http://localhost:5173`)
  - `customer_id` ist jetzt optional (nicht mehr Pflichtfeld)
  - Parts Controller filtert `deleted` Parts automatisch raus
  
- **Frontend:**
  - TailwindCSS v4 → v3 downgrade (Stabilität)
  - LoginPage: `login` → `username` Feld (Backend-kompatibel)
  - DashboardPage: Stats Mapping von camelCase → snake_case
  - DashboardPage: Doppeltes Layout entfernt
  - PartFormPage: `raw_material` → `dimensions` (DB-Schema kompatibel)
  - PartsPage: Verwendet Toast statt native alerts
  - Toaster: Array-Mutation Bug gefixt (push → spread operator)

#### Fixed
- **9 kritische Bugs:**
  1. ✅ TailwindCSS PostCSS Plugin Fehler
  2. ✅ Login: Falscher Feldname (login → username)
  3. ✅ Navigation: Doppeltes Layout gerendert
  4. ✅ Dashboard: Stats zeigten 0 (snake_case Problem)
  5. ✅ Parts Create: customer_id Pflichtfeld-Fehler
  6. ✅ Parts Create: raw_material Spalte existierte nicht
  7. ✅ Backend: customer_id Validierung zu strikt
  8. ✅ Audit-Log: Schema-Differenz (temporär deaktiviert)
  9. ✅ Toast: Array-Mutation verhinderte Rendering

#### Technical Details
- **Lines of Code:** ~1200 neue Frontend-Zeilen
- **Komponenten:** 3 neue Pages, 1 neue Component (Toaster)
- **Bug Fixes:** 9 kritische Fixes
- **Performance:** Toast System ohne externe Library (minimaler Footprint)

#### Deliverables
```
✅ Vollständig integriertes System (Frontend ↔ Backend)
✅ Part CRUD komplett (Create, Read, Update, Delete)
✅ Toast Notifications funktionieren
✅ Permission-based UI überall implementiert
✅ Responsive Design für alle Pages
✅ Form Validierung mit User-Feedback
✅ MEILENSTEIN 1 ERREICHT: Lauffähiges Basis-System!
```

---

## [0.3.0] - 2025-11-02 - Frontend React App

### ✅ Woche 3: Frontend Basis - ABGESCHLOSSEN

**Datum:** 02. November 2025  
**Phase:** 1 - Fundament  
**Status:** ✅ Abgeschlossen  
**Arbeitszeit:** ~2 Stunden

#### Added
- **React App Setup:**
  - React 19 + Vite 7
  - TailwindCSS v4 (später auf v3 downgraded)
  - Zustand State Management
  - React Router v7
  - Axios mit Interceptors

- **Components:**
  - ProtectedRoute mit Permission-Checks
  - Layout mit Navigation

- **Pages:**
  - LoginPage (schönes Gradient Design)
  - DashboardPage (Stats Cards + Quick Actions)
  - PartsPage (Tabelle mit Filter/Search)

- **Stores:**
  - authStore (Login, Logout, Permission-Checks)
  - partsStore (CRUD Operations, Filters)

- **Features:**
  - Token Persistence (localStorage)
  - Auto-Logout bei 401
  - Permission-based Navigation
  - Loading & Empty States

#### Technical Details
- **Lines of Code:** ~900 Frontend-Zeilen
- **Tech Stack:** React 19, Vite 7, TailwindCSS, Zustand, React Router
- **Komponenten:** 2 Components, 3 Pages, 2 Stores

#### Deliverables
```
✅ React App läuft auf localhost:5173
✅ Login/Logout funktioniert
✅ Dashboard mit Stats Cards
✅ Parts Liste mit Filter
✅ Permission-based UI
```

---

## [0.2.0] - 2025-11-02 - Backend API + Auth

### ✅ Woche 2: Backend Basis + Auth - ABGESCHLOSSEN

**Datum:** 02. November 2025  
**Phase:** 1 - Fundament  
**Status:** ✅ Abgeschlossen  
**Arbeitszeit:** ~8 Stunden

#### Added
- **Authentication:**
  - JWT Token Generation & Verification
  - bcrypt Password Hashing
  - User Registration & Login
  - Password Change Endpoint
  - Token Expiry (24h)

- **Authorization:**
  - Role-based Access Control (RBAC)
  - Permission-based Access Control
  - Auth Middleware (authenticateToken, requirePermission)

- **Parts API:**
  - GET /api/parts (mit Filtering)
  - GET /api/parts/:id
  - POST /api/parts (mit Validierung)
  - PUT /api/parts/:id
  - DELETE /api/parts/:id (Soft Delete)
  - GET /api/parts/stats

- **Audit-Log:**
  - Middleware für automatisches Logging
  - Tracking von CREATE, UPDATE, DELETE
  - User, IP, Timestamp Tracking

- **Database:**
  - 2 neue Migrations (auth enhancements, parts enhancements)
  - Test Customer Seeds (3 Kunden)
  - Enhanced Parts Schema (status, updated_by, cad_file_path)

#### Technical Details
- **API Endpoints:** 10 total (4 Auth + 6 Parts)
- **Lines of Code:** ~1500 Backend-Zeilen
- **Migrations:** 7 total (5 base + 2 enhancements)

#### Deliverables
```
✅ Backend API läuft auf localhost:5000
✅ JWT Authentication komplett
✅ Parts CRUD API komplett
✅ Audit-Log System aktiv
✅ Test-Suite vorhanden
```

---

## [0.1.0] - 2025-11-01 - Datenbank-Schema

### ✅ Woche 1: Projekt-Setup & Datenbank - ABGESCHLOSSEN

**Datum:** 01. November 2025  
**Phase:** 1 - Fundament  
**Status:** ✅ Abgeschlossen  
**Arbeitszeit:** ~8 Stunden

#### Added
- **Projekt-Struktur:**
  - Backend (Express + PostgreSQL)
  - Frontend (Vorbereitet für React)
  - Dokumentation (README, QUICKSTART, CONTRIBUTING, ROADMAP)

- **Datenbank:**
  - PostgreSQL Schema (28 Tabellen in 6 Kategorien)
  - node-pg-migrate Setup
  - 5 Basis-Migrations
  - Seed-Daten (6 Rollen, 27 Permissions, 1 Admin-User)

- **Express Server:**
  - Health Check API
  - Database Info API
  - Root Endpoint mit API-Übersicht

#### Technical Details
- **Tabellen:** 28 in 6 Kategorien
  - Authentication (users, roles, permissions, etc.)
  - Production (parts, operations, bom, etc.)
  - Machines (machines, tools, programs, etc.)
  - File Management (files, file_versions)
  - Audit (audit_logs)
  - Maintenance (maintenance_plans, tasks, etc.)

- **Migrations:** 5 Basis-Migrations
  1. create-auth-system.js
  2. create-parts-operations.js
  3. create-machines-programs.js
  4. create-audit-log.js
  5. create-maintenance-system.js

#### Deliverables
```
✅ Datenbank-Schema komplett (28 Tabellen)
✅ Migrations funktionieren
✅ Seeds vorhanden
✅ Express Server läuft
✅ Health Check API aktiv
```

---

## Kategorien

- **Added** - Neue Features
- **Changed** - Änderungen an existierenden Features
- **Deprecated** - Features die bald entfernt werden
- **Removed** - Entfernte Features
- **Fixed** - Bug Fixes
- **Security** - Sicherheits-Updates

---

## Nächste Version

### [1.1.0] - TBD - Operations System

**Geplant für:** Woche 5  
**Features:**
- Operations Backend CRUD
- Operations Frontend
- OP-Nummern System
- Maschinen-Zuweisung
- Sequence Management

---

**Letzte Aktualisierung:** 2025-11-03
