# Session 28./29. Oktober 2026 – Messprogramme (KMG / PC-DMIS) Schritte 0–3, Releases 2.15.0/2.16.0

**PRs:** #214 – #231, Tags `v2.15.0`, `v2.16.0` · Arbeit auf dem Dev-Server `homepi`, Deploy und Test am Arbeitsplatz durch den Nutzer

Konzept für die Messprogramm-Verwaltung ins Repo übernommen und die ersten vier Umsetzungsschritte gebaut: Messprogramme lassen sich jetzt ohne Agent im MDS ablegen, versionieren und freigeben. Dazu kamen die bisher fehlenden Übersichten „NC-Programme“ und „Messprogramme“.

---

## Erledigt

| PR | Inhalt |
|---|---|
| #214 | Konzept `docs/konzepte/MESSPROGRAMME_KONZEPT.md` (Kunden-/Teilenummern durch Platzhalter ersetzt), ROADMAP Phase 10 „Messmaschinen-Terminal“ |
| #215 | **Schritt 0 – Binär-Upload:** Dateien mit Null-Byte ohne `content` speichern (vorher 500, PostgreSQL 22021); Versionsvergleich zeigt bei Binärdateien eine Meldung statt Endlos-Spinner |
| #216 | **Schritt 1 – Datenmodell:** `programs.kind`, `program_revision_files`, `machines.measuring_equipment_id` |
| #217 | **Schritt 2 – Backend:** Anlegen/neue Version mit Dateigruppe, Hash-Vergleich mit der aktiven Version, Übernahme nicht hochgeladener Dateien, Dateiliste, Einzel-/ZIP-Download, Aufräumjob; `archiver`, `fast-xml-parser` |
| #218 | **Schritt 3a – Übersichten** NC-Programme/Messprogramme unter Fertigung, Direktsprung `/parts/:id?op=` |
| #219 | **Schritt 3b – am Arbeitsgang:** Upload-Fenster für Dateien/Ordner mit Vorschau per Probelauf (`?dry_run=true`), Dateiliste, ZIP; Programmkarte: Status deutsch, Dateiname ohne Präfix |
| #220, #221 | **Release 2.15.0** und Deploy am 29.10. (Deploy und Klicktest grün), Tag `v2.15.0`; diese Session-Doku |
| #222, #223 | **PDF-Worker vom eigenen Server** statt unpkg.com (verarbeitet die Zeichnungen); Fixliste „weitere externe Adressen prüfen“ |
| #224 | **Ordner-Upload Messprogramme** (Befund erster Test am Arbeitsplatz): unbekannte Typen und STEP aussortiert statt Fehler, nur oberste Ordnerebene – Messprotokolle im Unterordner bleiben draußen |
| #225 | **Eigener Reiter „Messprogramme“** am Arbeitsgang, Bereich `cmm_programs`; NC-Liste/-Karte ohne Messprogramm-Weichen |
| #226 | **Programm bearbeiten** scheiterte immer (Backend verlangte die Nummer); automatische Nummer ohne Doppelte nach dem Löschen |
| #227 – #229 | **Konzept Programmnummern** (`docs/konzepte/PROGRAMMNUMMERN_KONZEPT.md`): MDS vergibt, Schema `<Bauteil-Nr>-<n>`, Namensregel je Steuerung in den Stammdaten, Mazatrol nur Ziffern, TopSolid-Felder Programm-/Dateiname |
| #230, #231 | **Release 2.16.0** und Deploy am 29.10. (Deploy grün, Bereich „Messprogramme“ eingeschaltet), Tag `v2.16.0`; diese Session-Doku |

## Entscheidungen

- **Freigabe über `program.release`**, kein eigenes Recht; keine neuen Rechte in Schritt 1–3
- **Keine Stammdaten per Migration:** Maschinentyp „Messmaschine“ und Arbeitsgangtyp über die Oberfläche; Messprogramme erkennt das MDS an `kind = 'cmm'`
- **Neue Version = hochladen, was man hat:** Der Mensch erkennt schlecht, was sich geändert hat → ganzen Ordner ablegen, das MDS vergleicht per Hash; der Agent schickt später nur Geändertes. Nicht Hochgeladenes wird übernommen (physisch kopiert), Entfernen nur ausdrücklich
- **Excel-Schalter aus der Vorversion abgeleitet** (keine Spalte); Vorlage nur als Paar `.xlsx` + `.layout.xml`, Name eindeutig über alle aktiven Messprogramme
- **Vorschau per Probelauf auf dem Server** statt Hash im Browser: Produktion läuft über `http://`, dort fehlt `crypto.subtle`; Regeln stehen nur an einer Stelle
- **Eigene Menüpunkte** „Messprogramme“ und (neu) „NC-Programme“ unter Fertigung; Anlegen und Freigeben bleiben am Arbeitsgang
- **Eigener Reiter „Messprogramme“ am Arbeitsgang** (29.10., nach dem ersten Test): zuerst teilten sich NC- und Messprogramme den Reiter „Programme“. Mit Schritt 4 (Bereitstellen, Agent-Status, Protokolle) wären die Weichen in Liste und Karte gewachsen → getrennte Komponenten und eigener Bereich `cmm_programs`; Daten und Backend bleiben gemeinsam (Workflow, Versionen, Audit)

## Hinweise / Lehren

- **multer/busboy liefert Dateinamen als latin1** – UTF-8-Namen (Umlaute) mit `Buffer.from(name, 'latin1').toString('utf8')` zurückwandeln, nur wenn das Ergebnis gültig ist
- **`fast-xml-parser` 4.x** hat eine offene Sicherheitsmeldung (XMLBuilder) → 5.11.2 genommen
- **`exceljs` bringt `archiver@5` mit:** nach `archiver@7` liegt die alte Version verschachtelt; Excel-Export gegengeprüft
- **Abspielen von `.http`-Dateien:** kleines Node-Skript (Variablen, `< ./datei` binär) spielt die REST-Client-Szenarien gegen ein Test-Backend ab
- **Test-Backends ohne nodemon** laden Code-Änderungen nicht nach – nach jeder Änderung neu starten (zweimal falsche Meldungen gesehen)

## Offen

- Version löschen in der Versionsliste ruft einen Endpunkt auf, den es nicht gibt (betrifft auch NC) – eigener Fix
- Rollback prüft den Vorlagennamen nicht (zwei aktive Programme mit derselben Vorlage möglich) – spätestens beim Bereitstellen (Schritt 4) abfangen
- ~~PDF-Viewer lädt seinen Worker von unpkg.com~~ – in Produktion lief die Vorschau, der Worker kommt seit #222 vom eigenen Server
- Alte ESLint-Befunde in `ProgramsList`, `programsStore`, `OperationsAccordion`, `Breadcrumbs`
- Siehe ROADMAP „Nächste Session“
