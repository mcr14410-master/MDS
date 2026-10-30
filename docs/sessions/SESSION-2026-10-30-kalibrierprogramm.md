# Session 30. Oktober 2026 – Programmnummern-Praxis, Grundsätze, Kalibrierprogramm, Release 2.17.0

**PRs:** #232 – #238, Tag `v2.17.0` · Arbeit auf dem Dev-Server `homepi`, Deploy und Test am Arbeitsplatz durch den Nutzer

Das Programmnummern-Konzept um die Namensregeln der Steuerungen und die gelebte TopSolid- und PC-DMIS-Praxis ergänzt. Zwei Grundsätze stehen jetzt in `CLAUDE.md`: betriebsneutral bleiben und alte Strukturen nicht nachbauen. Daraus folgt ein Konzept für abschaltbare Module. Umgesetzt wurde das Kalibrierprogramm als Teil eines Messprogramms. Messprogramm, Excel-Vorlage und Kalibrierung haben dafür jetzt je einen eigenen Upload-Bereich.

---

## Erledigt

| PR | Inhalt |
|---|---|
| #232 | Restprüfung 2.16.0 (Umbenennen, Reiter, PDF-Vorschau, Ordner-Upload) |
| #233 | **Programmnummern:** Namensregeln Siemens / Heidenhain / Mazatrol 640M (nur Ziffern, `.EIA`, < 10000 reserviert) / PC-DMIS, Zuordnung der TopSolid-Felder (NC-Dokumentname → Zeile 2), Transferverzeichnisse ohne Rückweg. **Messprogramme 4.2a:** heutige Ordnerablage, Kalibrierprogramm, Überwachungsfelder, Ausgabepfade |
| #234 | `CLAUDE.md`: **Betriebsneutral bleiben** (TopSolid, PC-DMIS usw. als optionale Module, Betriebsregeln in Stammdaten) und **Alte Strukturen nicht nachbauen** |
| #235 | Konzept `docs/konzepte/MODULE_KONZEPT.md`: Modul → Operationstyp-Feature → Recht; Abschalten blendet aus, Daten bleiben; Agent-Module zentral je Gerät |
| #236 | **Kalibrierprogramm:** Rolle `calibration` (Migration `1737000122000`), Upload in drei Bereichen (`files`, `template_files`, `calibration_files`) mit eigenem Filter, ZIP-Unterordner `Kalibrierung/`; Formular mit Schaltern und eigener Ablagefläche |
| #237 | **Release 2.17.0**, Deploy und Test mit echten Daten am 30.10. grün, Tag `v2.17.0` |
| #238 | **Entfernen einheitlich** (Befund aus dem Test): Vorlage/Kalibrierung über ihren Schalter auch aus der Vorschau, Messprogramm und `.cad` nur ersetzen; Release 2.17.0 in der Checkliste |

Am Mess-PC bestanden: Excel-Vorlage über den Weg MDS → ZIP → Vorlagenverzeichnis wird sofort erkannt (letzter Prüfpunkt aus 2.16.0).

## Entscheidungen

- **Upload-Bereich statt Erkennung:** Das Kalibrierprogramm wird nicht am Ordner- oder Dateinamen erkannt, sondern über seinen eigenen Bereich. `04_Taster kalibrieren` liegt heute neben dem Programmordner, nicht darin. Der Bereich ist eindeutig und hängt an keiner Ablage. Die Excel-Vorlage bekam aus demselben Grund einen eigenen Bereich, sie liegt am Mess-PC ohnehin in einem anderen Verzeichnis
- **Excel-Vorlage unter `files` wird aussortiert** (API-Änderung), Dateien im falschen Bereich mit Hinweis
- **Kalibrierprogramm:** höchstens eins je Revision, nicht gleichnamig mit dem Messprogramm, wird nicht vom Hauptprogramm aufgerufen (Lage frei). Name/Schema → Programmnummern-Konzept. `.MiniRoutines.xml` zur Kalibrierung erst bei Bedarf
- **`.cad` nur ersetzen:** Die `.prg` findet sie über den Namen; beim Neuanlegen bleibt sie optional (Programme ohne CAD)
- **Programmnummer im NC-Dokumentnamen** von TopSolid, ohne Änderung am Postprozessor (Stufe 1)

## Hinweise / Lehren

- **multer `.fields()`:** `req.files` ist dann ein Objekt je Feld, kein Array; unbekannte Feldnamen → `Unexpected field` (400 über `handleMulterError`)
- **Dev-Backend läuft aus dem Checkout:** Nach einem Branch-Wechsel lädt nodemon den neuen Code, die Dev-DB hat aber noch keine Migration → vor Tests in der Dev-Umgebung `migrate:up`
- **Testdateien im Upload-Ordner:** Test-Backends schreiben in `backend/uploads/cmm-programs` des Checkouts. Testprogramme am Ende per API löschen, sonst bleiben Dateien ohne DB-Eintrag liegen
- **Playwright:** `button[title="Neue Version hochladen"]` gibt es auch bei NC-Programmen anderer Arbeitsgänge → auf die Messprogramm-Karte eingrenzen

## Offen

- Am Mess-PC: Kalibrierprogramm aus dem ZIP in PC-DMIS öffnen; an einer **Kopie** prüfen, was ohne `.cad` passiert (Release-Checkliste „Noch offen aus 2.17.0“)
- Schritt 4 (MDS-Agent) wird in einer eigenen Sitzung geplant
- Programmnummern: offene Fragen Q2–Q5, Q7; Module: offene Fragen im Konzept
- Bauteilseite auf Handybreite 443 statt 390 px breit (vor dieser Session schon so)
- Siehe ROADMAP „Nächste Session“
