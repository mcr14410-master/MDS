# TopSolid ↔ MDS: Ideensammlung

**Erstellt:** 2026-10-06
**Status:** Brainstorming, nichts davon ist umgesetzt oder getestet
**Bezug:** `TOPSOLID_TOOL_IMPORT_KONZEPT.md` (Werkzeugimport, umgesetzt bis Export)

---

## 1. Überblick: einmalig vs. dauerhaft

| | Thema | Stand |
|---|---|---|
| **Einmalig** (Startphase) | Werkzeug-Erstimport aus den Bibliotheken | ✅ Export fertig (`TS_LibExport`), MDS-Import offen |
| | Bestandsaufnahme Kundenprojekte → Bauteile ins MDS (Abschn. 3) | Idee |
| | Projekte bereinigen + Bauteile in eigene Projekte umziehen (Abschn. 4) | Idee |
| **Dauerhaft** (Alltag) | Werkzeugabgleich TopSolid ↔ MDS (Re-Import mit Vorschau) | Konzept |
| | Werkzeugliste je NC-Programm inkl. abweichender Ausspannlänge | Konzept (Phase 3) |
| | NC-Viewer für Kollegen ohne Lizenz | ✅ läuft |
| | Seriennummern-Gravur (`TS_SN_Generator`) | ✅ läuft |
| | „In TopSolid anlegen“ aus dem MDS (Abschn. 2) | Idee |

**Reihenfolge im MDS:** Werkzeuge → Bauteile → NC-Programme. Alles andere baut darauf auf.

---

## 2. In TopSolid schreiben: neues Bauteil aus dem MDS anlegen

**Ziel:** Im MDS wird ein Bauteil bzw. Auftrag angelegt. Ein Klick auf „In TopSolid anlegen“ legt in
TopSolid alles fertig an, statt jedes Mal dieselbe Klickstrecke zu machen.

Ablauf:

1. Projekt aus der Firmenvorlage anlegen, z. B. `KD00000 – TEIL-0001`
2. Werkzeug-, Maschinen- und Spannmittelbibliotheken als Referenz einhängen
3. Ordnerstruktur anlegen (CAD, CAM …)
4. Kunden-STEP importieren
5. Teilenummer, Bezeichnung, Kunde und Revision setzen
6. Speichern und einchecken, die PDM-ID ins MDS zurückschreiben

Vorhandene API (TopSolid'Automation 7.17):

| Schritt | API |
|---|---|
| Projekt | `Pdm.CreateProject(name, false)`, `Pdm.CreateProjectWithTemplate(name, vorlage)` |
| Bibliotheken | `Pdm.AddReferencedProjects(projekt, [...])` |
| Ordner | `Pdm.CreateFolder(owner, name)` |
| STEP-Import | `Documents.Import(importerIx, datei, ordner, out log, out bad)` |
| Kopieren | `Documents.SaveAs(dok, zielordner, name)`, `Pdm.ImportPackageAsDistinctCopy` |
| Stammdaten | `Pdm.SetName / SetDescription / SetPartNumber / SetComment / SetManufacturer / SetRevisionTexts` |
| Abschluss | `Pdm.Save`, `Pdm.CheckIn` |

Noch zu klären:

- Projektvorlage: Wie heißt sie und was enthält sie?
- Welchen Importer-Index hat STEP?
- Öffnet der Import Dialoge?
- Namenskonvention für Projekte

**Erster Schritt:** `TS_ProjektAnlage --test` in einem Testprojekt (`ZZ_API_Test`) mit einem
unverfänglichen STEP. Danach löschst du das Projekt von Hand.

---

## 3. Bestandsaufnahme: Kundenprojekte → Bauteile ins MDS (nur lesend)

**Ziel:** den Ist-Stand ins MDS holen. Ab dann wird aus dem MDS heraus gearbeitet.

**Stufe 1 – PDM, schnell:** Kundenprojekte → Bauteil-Ordner → Dokumente mit Name, Typ, Teilenummer,
Bezeichnung, Revision, Änderungsdatum, Autor und PDM-ID. Technisch fast identisch mit dem
Bibliotheks-Erkundungslauf (`TS_LibExport`). Dauer: Minuten.

**Stufe 2 – CAM-Inhalte, gründlich:** Die CAM-Dokumente werden geladen und ausgelesen: Maschine,
Werkzeuge (T-Nummer, Ausspannlänge), Bearbeitungen, Laufzeit, NC-Dateinamen, Spannmittel und Verweise
auf andere Ordner oder Projekte. Das wird eher ein Nachtlauf.

Mapping:

| TopSolid | MDS |
|---|---|
| Kundenprojekt | Kunde |
| Bauteil-Unterordner | Bauteil (+ TopSolid-Projekt/-Ordner als `external_ref`) |
| CAM-Dokument | Operation / Aufspannung |
| NC-Ausgabe | NC-Programm |
| verwendete Werkzeuge | `tool_lists` je Programm, abgeglichen mit den T-Nummern-Listen |
| Spannmittel (Bibliothek) | Spannmittel-Zuordnung |

Nebeneffekt: Man sieht, welche Bauteile seit Jahren keiner mehr angefasst hat. Die müssen nicht
umziehen und können als Archiv im alten Kundenprojekt bleiben.

---

## 4. Projekt-Umzug: ein Projekt je Bauteil statt je Kunde

**Problem:** Heute gibt es ein Projekt je Kunde mit allen Bauteilen als Unterordnern. Bei manchen
Kunden sind das hunderte, und TopSolid wird spürbar langsam.

**Ziel:** jedes Bauteil in ein eigenes Projekt, automatisiert und mit gebotener Vorsicht.

### Vorbereitung

1. **Sicherung** des TopSolid-PDM, denn „Projekt bereinigen“ lässt sich nicht rückgängig machen
2. In TopSolid **„Projekt bereinigen“** laufen lassen: Papierkorb, Wiederherstellungsdaten und alte
   Speicherstände fliegen raus, das entschlackt erheblich
3. Den Hersteller bzw. Händler fragen, ob es ein eigenes Werkzeug zum Aufteilen von Projekten gibt

### Technischer Weg

Eine Verschiebe-Funktion habe ich in der API nicht gefunden, deshalb **Paket-Kopie**:

- `Pdm.ExportPackage(ordnerDokumente, …)` → Paketdatei
- `Pdm.CreateProject(...)` + `AddReferencedProjects` (Werkzeuge, Maschinen, Spannmittel)
- `Pdm.ImportPackageAsDistinctCopy(paket, …)` ins neue Projekt; Verweise innerhalb des Pakets bleiben erhalten
- Das **alte Projekt bleibt unangetastet** und dient als Archiv bzw. Rückfallebene

Offen: Kommt die Revisionshistorie bei einer Kopie mit? Das muss der Pilot zeigen.

### Ablauf

1. **Analyse, nur lesend.** Für jedes Bauteil wird geprüft, worauf seine Dokumente verweisen:
   - 🟢 nur der eigene Ordner + Bibliotheken → zieht problemlos um
   - 🟡 andere Ordner im selben Projekt, z. B. eine gemeinsame Vorrichtung → das gemeinsame Teil kommt in ein
     eigenes Projekt „Kunde X – Vorrichtungen“, das die Bauteil-Projekte referenzieren
   - 🔴 ausgecheckte Dokumente oder Verweise auf fremde Projekte → Handarbeit
2. **Pilot mit einem Bauteil.** Umziehen, in TopSolid öffnen und das NC-Programm neu ausgeben. Den G-Code
   mit dem alten vergleichen, gleiche Methode wie bei den Seriennummern: identisch bis auf den Kopf = OK.
3. **Stapelbetrieb aus dem MDS gesteuert.** Status je Bauteil: *im Kundenprojekt → umgezogen → geprüft*.
   Mit Protokoll und Wiederaufsetzen nach Abbruch. Bauteile, die gerade in Arbeit sind, bleiben stehen,
   bis sie fertig sind.
4. Wenn ein Kunde komplett geprüft ist, das alte Projekt schreibgeschützt setzen bzw. archivieren.

---

## 5. Weitere Ideen (lose)

- **NC-Viewer + MDS:** Programme, Aufspannung (STEP) und Werkzeugmodelle (glb) direkt aus dem MDS laden.
  Radiuskorrektur mit dem echten Werkzeug-Ø aus `tool_master`.
- **Rüstblatt:** Abweichende Ausspannlänge je Programm hervorheben, außerhalb von `LPR_MIN`/`LPR_MAX` als Fehler.
- **Sonderwerkzeuge:** nach Auftragsende fragen „archivieren oder behalten?“
- **Datenpflege in TopSolid:** doppelte T-Nummern, kopierte Bestellnummern und Hersteller-Schreibweisen
  bereinigen (Liste: `Datenpruefung_Bibliotheken.md`)
- **Automatischer STEP-Export** der Aufspannung bei der NC-Ausgabe, damit `.H` und `.stp` immer zusammen liegen

---

## Leitplanken

- Lesen ist harmlos, **Schreiben immer zuerst im Testprojekt**
- Nie in Bibliotheken schreiben, ohne dass es ausdrücklich so gewollt ist
- Alte Daten erst löschen oder archivieren, wenn die neuen geprüft sind
- TopSolid-DLLs, Automation-Doku, Kundendaten und der Werkzeugstamm gehören **nicht** ins öffentliche Repo
