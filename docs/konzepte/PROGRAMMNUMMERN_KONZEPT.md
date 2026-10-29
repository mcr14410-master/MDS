# Konzept: Programmnummern (NC- und Messprogramme)

**Stand:** 29.10.2026 · Entwurf zur Abstimmung, noch nichts umgesetzt
**Bezug:** ROADMAP „Programmnummern-Format“, [TOPSOLID_INTEGRATION_IDEEN.md](TOPSOLID_INTEGRATION_IDEEN.md),
[MESSPROGRAMME_KONZEPT.md](MESSPROGRAMME_KONZEPT.md)

Die Kernfrage: **Wer entscheidet, welche Nummer an die Maschine geht?**

---

## 1. Ist-Stand

**Im MDS** vergibt das Backend beim Hochladen automatisch `<OP-Code>-<lfd. Nr.>`, z. B. `OP10-001`.
Der OP-Code kommt aus dem Feld „OP-Code“ des Arbeitsgangs, beim Anlegen vorbelegt aus dem
Operationstyp (`CNC-F`, `CNC-M` …) – daher `CNC-F-001`.

- nicht eindeutig: jedes Bauteil hat sein `CNC-F-001`, die Nummer sagt allein nichts
- in der Oberfläche nicht bearbeitbar
- NC- und Messprogramme eines Arbeitsgangs teilen sich den Zähler
- verwendet in: Übersichten NC-/Messprogramme, ZIP-Name der Messprogramme
  (`Teilenummer_Programmnummer_vX.zip`), Einrichteblätter, globale Suche
- behoben in #226: Bearbeiten scheiterte an der fehlenden Nummer; Zähler vergab nach dem Löschen doppelt

**In der Fertigung** (heute TopSolid → Maschine):

- TopSolid-Dokument heißt `Zeichnungsnummer~Bezeichnung~Revision`; der Postprozessor zerlegt den
  Namen und schreibt die drei Werte in den NC-Programmkopf
- NC-Datei heißt `Zeichnungsnummer-<n>`, `n` = Reihenfolge der Aufspannungen/Bearbeitungen des
  Bauteils (1, 2, 3 …) – kommt so aus TopSolid
- Problem: Jeder Kunde hat ein eigenes Nummernsystem, Programmnamen werden teils sehr lang
  (z. B. `TEIL-0001-000-000-00_d_Z01-1`)

**Bauteile im MDS** haben das schon gelöst: Die Bauteilnummer wird generiert –
`<Kundennummer>-<lfd. Nr. 5-stellig>`, z. B. `KD00000-00004` – die Kundenzeichnungsnummer hängt
nur noch als Attribut dran.

---

## 2. Grundsatz

**Das MDS vergibt die Programmnummer.** Es ist die einzige Station, die in allen Abläufen dabei ist
und das ganze Bauteil kennt (Kunde, Arbeitsgänge, Aufspannungen, Maschinen, Versionen, Freigabe):

| Ablauf | Rolle des MDS |
|---|---|
| heute: TopSolid → Maschine | nicht beteiligt |
| nächster Schritt: TopSolid → MDS → Maschine | vergibt die Nummer beim Hochladen, liefert an die Maschine aus |
| später: MDS → TopSolid → MDS → Maschine | reserviert die Nummer **vor** dem Programmieren, TopSolid übernimmt sie |

Die Nummer entsteht **einmal** und läuft unverändert bis an die Maschine. Änderungen am Programm
laufen über die **Version** im MDS (1.0.0 → 1.1.0), nicht über eine neue Nummer.

---

## 3. Schema (Vorschlag)

| Art | Format | Beispiel |
|---|---|---|
| NC-Programm | `<Bauteil-Nr>-<n>` | `KD00000-00004-1` |
| Messprogramm | `<Bauteil-Nr>-M<n>` | `KD00000-00004-M1` |

- `n` = laufende Nummer **je Bauteil** (nicht je Arbeitsgang), getrennt für NC und Messen
- kurz, für alle Kunden gleich aufgebaut, eindeutig über alle Bauteile
- entspricht der heutigen Logik „Zeichnungsnummer-Reihenfolge“, nur mit der kurzen MDS-Bauteilnummer
- **fest:** Eine vergebene Nummer wird nie neu vergeben, auch nicht nach dem Löschen
- `n` ist eine **Kennung**, keine Sortierung: Wird ein Arbeitsgang später vorgezogen, behält das
  Programm seine Nummer; die Reihenfolge zeigt das MDS über die Arbeitsgänge

**Maschinen-Varianten** (dieselbe Aufspannung auf G350 oder C22): Vorschlag – beide Varianten
bekommen **dieselbe** Nummer, unterschieden wird über die Maschine. Es ist dieselbe Bearbeitung, an
jeder Maschine liegt nur eine davon. Eindeutig ist dann (Bauteil, Art, `n`, Maschine).

**Bearbeitbarkeit:** Vorschlag wird beim Anlegen eingetragen; solange das Programm im Entwurf ist,
änderbar (z. B. Übernahme einer alten Nummer). Ab „Freigegeben“ gesperrt – Audit-Trail.

---

## 4. Name an der Maschine

Der Dateiname an der Steuerung wird aus der MDS-Nummer **abgeleitet**, je Steuerung mit eigener
Regel (Endung, Länge, erlaubte Zeichen). Das MDS hält dafür je Steuerungstyp eine Namensregel – ähnlich
einem Postprozessor, nur für den Namen.

| Steuerung | Endung | Regeln (Länge, Zeichen) | Beispiel |
|---|---|---|---|
| Heidenhain TNC 640 | `.H` | **offen** | `KD00000-00004-1.H` |
| Siemens (Drehen) | `.MPF` | **offen** | |
| Mazatrol 640M | | **offen** – evtl. nur Ziffern (Work-Nr.)? Dann Zuordnungstabelle MDS-Nummer ↔ Work-Nr. | |
| PC-DMIS (KMG) | `.PRG` | **offen**; Name der Excel-Vorlage muss eindeutig sein (siehe Messprogramme-Konzept) | `KD00000-00004-M1.PRG` |

Passt eine Nummer nicht zur Regel, meldet das MDS das beim Anlegen – nicht erst an der Maschine.

---

## 5. Programmkopf und Postprozessor

Im NC-Kopf stehen heute Zeichnungsnummer, Bezeichnung und Revision aus dem TopSolid-Dokumentnamen.

- **Stufe 2:** Beim Hochladen liest das MDS den Kopf und vergleicht mit dem Bauteil
  (Zeichnungsnummer/Revision). Abweichung → Warnung, z. B. Programm vom falschen Bauteil oder alter Index.
- **Stufe 3:** Der Dokumentname enthält die MDS-Bauteilnummer bzw. Programmnummer, der Postprozessor
  schreibt sie zusätzlich in den Kopf. Dann ist an der Maschine sichtbar, welches MDS-Programm läuft –
  Grundlage für spätere Rückmeldungen (Laufzeit, Stückzahl) und für den Abgleich Maschine ↔ MDS.

---

## 6. Stufen

**Stufe 1 – Schema im MDS** (ohne TopSolid-Änderung)
- Nummernvorschlag nach Schema 3 beim Anlegen, Feld „Programmnummer“ im Upload- und Bearbeiten-Formular
- Sperre ab Freigabe, Eindeutigkeit per DB-Index
- Bestehende Programme behalten ihre Nummer (siehe offene Fragen)

**Stufe 2 – MDS → Maschine**
- Download/Bereitstellung benennt die Datei nach der Namensregel der Ziel-Steuerung
- Kopf-Prüfung beim Hochladen (Abschnitt 5)

**Stufe 3 – MDS → TopSolid**
- Programm im MDS anlegen (Nummer reserviert, Status „geplant“), bevor programmiert wird
- TopSolid übernimmt die Nummer: über den Dokumentnamen (wertet der Postprozessor heute schon aus)
  oder per TopSolid-API (Erfahrung aus dem Seriennummern-Generator)
- passt zu „In TopSolid anlegen“ aus TOPSOLID_INTEGRATION_IDEEN.md, Abschnitt 2

---

## 7. Datenmodell (Skizze, Stufe 1)

- `programs.program_number` bleibt (Anzeige, Suche, Einrichteblätter)
- neu: `programs.part_seq` (integer) – das `n`; Zähler je Bauteil und Art
- Eindeutigkeit: (Bauteil, `kind`, `part_seq`, Maschine) – das Bauteil hängt über den Arbeitsgang
  dran, daher per Prüfung im Backend oder Trigger statt einfachem Index; genaue Form bei der Umsetzung
- Vergabe in derselben Transaktion wie das Anlegen (zwei gleichzeitige Uploads dürfen nicht dieselbe
  Nummer bekommen)
- Namensregeln je Steuerung: an `machines` bzw. Steuerungstyp, erst in Stufe 2

---

## 8. Offene Fragen

1. **Namensgrenzen der Steuerungen:** TNC 640, Siemens, Mazatrol 640M, PC-DMIS – max. Länge,
   erlaubte Zeichen (Bindestrich?), Mazatrol nur Ziffern?
2. **Mehrere Programme je Aufspannung** (z. B. Hauptprogramm mit Unterprogrammen, Schruppen/Schlichten
   getrennt): eigene Nummern (`-1`, `-2`) oder Zusatz (`-1A`, `-1B`)?
3. **Bestehende Programme:** alte Nummern behalten und nur neue nach Schema vergeben, oder einmalig
   umnummern (nur Entwürfe? auch freigegebene, mit Vermerk im Audit-Trail)? Vorher in Produktion
   zählen, wie viele es sind.
4. **Maschinen-Varianten:** gleiche Nummer (Vorschlag) oder eigener Zusatz je Maschine?
5. **Messprogramme:** `M` als Kennung ok? Gleicher Zähler wie NC (`-1`, `-2`, `-M3`) oder getrennt
   (Vorschlag: getrennt)?
6. **Revision im Namen:** Zeichnungsindex gehört zum Bauteil, Programmversion zum MDS – beides nicht
   in die Nummer (Vorschlag). Braucht die Maschine den Index im Dateinamen?
