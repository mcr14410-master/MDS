# Session 11./12. November 2026 – Rechte und Zeitstempel bei Programmen, Release 2.27.3, Spec Ballooning

**PRs:** #364 bis #370 · Arbeit auf dem Dev-Server `homepi`, Deploy auf rpi01 durch den Nutzer

---

## Erledigt

| PR | Inhalt |
|---|---|
| #364 | ROADMAP-Idee: MDS unter einem Namen statt der IP erreichbar |
| #365 | Rechteprüfung für Programme und Bauteil-Dokumente: Routen und Knöpfe folgen `program.*`; Bauteil-Dokumente schreiben braucht `part.update`. CNC-Rollen mit nur `program.upload` laden neue Versionen hoch, legen aber keine Programme an, ändern oder löschen sie nicht |
| #366 | Modul Programme auf `timestamptz` (Migration `1737000129000`, 8 Spalten, Altdaten je Schreiber umgerechnet); Einrichteblatt-Sperre `lockSheet()` ohne Join |
| #367 | Release 2.27.3 (Tag `v2.27.3` auf `63781cd`) |
| #368 | Release-Checkliste 2.27.3 erledigt (Prüfpunkte in Produktion grün) |
| #369 | Spec Ballooning `docs/superpowers/specs/2026-11-12-ballooning-design.md`, ROADMAP-Eintrag, Verweis im Messprogramm-Konzept |
| #370 | Spec Ballooning: Zeichnung je Arbeitsgang nur mit dessen Ballons |

**Release 2.27.3** läuft auf rpi01, Prüfungen grün: `timestamp with time zone`, NC 3/3, Einrichteblätter 65/65, Messprogramm-Versionen 87/87, Klicktests. Die Testplan-Häkchen in #365–#367 wurden über `gh api -X PATCH …/pulls/N` gesetzt, weil `gh pr edit` am Projects-(classic)-Fehler scheitert.

## Ballooning – Entscheidungen des Nutzers

Ausgangslage: FAIs werden analog gestempelt (Stempel auf Papier), Kundenzeichnungen kommen meist als Scan, das FAI-Formular ist ein eigenes. Entwurf mit klickbarer Skizze (privates Artifact „Zeichnung stempeln“, nur Platzhalterdaten).

- **Im MDS, kein eigenes Windows-Programm.** Windows nur für den Agenten (PC-DMIS, nur lesend).
- **Merkmale gehören zur Zeichnung**, nicht zum Prüfplan. Jeder Arbeitsgang wählt seine Merkmale aus derselben Stempelung, ein Merkmal darf in mehreren Arbeitsgängen vorkommen.
- **Kein OCR** (Scans). Schnelle Eingabe mit Parser für Zeichnungsschreibweise.
- **Beide Eingabe-Varianten** (Liste daneben / Eingabe am Rahmen) als Benutzereinstellung.
- **Nummern:** im Entwurf lose (Löschen schließt die Lücke, neu nummerieren nach Lage), nach Freigabe fest (gelöscht = „entfallen“, Nummer bleibt belegt).
- **Ballons schon auf der Zeichnung** (vom Kunden gestempelt oder Altbestand von Hand gestempelt) als eigener Modus; Nummern als Text.
- **FAI** meist AS9102, einige Kunden mit eigener Excel-Vorlage; **100 %** auf bestimmte Merkmale mit Datenübermittlung (heute Excel aus PC-DMIS per Mail), mal mit, mal ohne Seriennummern.
- **PC-DMIS:** Dimensionen heißen `PM1`, `PM2` … nach der Ballonnummer.
- **Messwerte per Datei-Upload** statt automatischer Übernahme nach jedem Lauf (Nutzer: Sorge, dass es für Mitarbeiter zu kompliziert wird). Format: eine Zeile je Merkmal, eine Spalte je Seriennummer. Automatische Übernahme über den Agenten bleibt als Ausblick.
- **Zeichnung beim Bauteil als Master**, das Original wird nie verändert; das gestempelte PDF ist eine erzeugte Datei, die Prüfzeichnung im Messprogramm eine festgehaltene Kopie davon.
- **Je Arbeitsgang nur dessen Ballons** (Anzeige, Druck, später Terminal), Nummern bleiben gleich.

## Befunde

- `part_documents` hängt per `ON DELETE CASCADE` am Bauteil und wird beim Löschen hart entfernt – für freigegebene Stempelungen und Messwerte muss das gesperrt werden (in der Spec, Abschnitt 8).
- `frontend/src/utils/toleranceCalculator.js` kann ISO 286 komplett und ISO 2768 – Grundlage für den Parser, damit es nur eine Toleranztabelle gibt.

## Lehren

- **Skizze statt Beschreibung:** Die klickbare Skizze hat die Bedienfragen (Variante A/B, Nummern) schneller geklärt als jede Textbeschreibung. Ein Artifact geht auch vom Handy aus; der Brainstorming-Begleiter im Browser wäre auf homepi nur auf localhost erreichbar.
- **Vereinfachen, wenn der Nutzer zögert:** Der Datei-Upload ersetzt Eingang und Übernahmeregeln – gleiche Daten, deutlich weniger Bedienung. Die aufwendigere Lösung bleibt als Ausblick notiert.
- **Neue Konzepte gegen bestehende abgleichen:** Erst der Abgleich mit Messprogramm-, Agent- und Altbestand-Spec zeigte den Widerspruch bei der Prüfzeichnung („keine zweite Kopie“).

## Nächste Sitzung

1. Ballooning erst bei Start der Umsetzung weiter: „Ballooning Stufe 1 planen“ → Plan aus der Spec, vorher gegen den aktuellen Code abgleichen. Für Stufe 3 eine leere Vorlage des eigenen FAI-Formulars, für Stufe 4 vorher Spike in der Test-VM (Standard-Ausgabe PC-DMIS, Zeichen in IDs)
2. Offene Punkte aus der ROADMAP „Offene Fixes“: 28 Routen ohne Rechteprüfung beim Schreiben, `timestamptz` für Arbeitsgänge, Bauteile, Werkzeuglisten und Prüfpläne, Zuordnung der Entitäten im Audit-Log, Modals in Karten (Portal), Datei-Drop außerhalb der Ablagefläche, Lint `OperationsAccordion.jsx:231`
3. Erstimport-Helfer: zwei Befunde (mehrere `.prg` in einem Ordner, ~10 s ohne Anzeige bei großen Ordnern), geplant als 2.28.0
4. Handy-Kameratest am Pixel 6a, Eingang (Schritt 5), rpi01 aufräumen
