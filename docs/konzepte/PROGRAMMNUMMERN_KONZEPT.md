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

Der Dateiname an der Steuerung wird aus der MDS-Nummer **abgeleitet** – mit einer Namensregel je
Steuerung, die in den Stammdaten eingestellt wird (Abschnitt 4.1), nicht fest im Code.

**Was die Steuerungen erlauben** (Stand 29.10.2026):

| Steuerung | erlaubt | Folge |
|---|---|---|
| Heidenhain (TNC 640) | Ziffern, Buchstaben, `-`, `_`; keine Umlaute/Sonderzeichen | MDS-Nummer passt direkt: `KD00000-00004-1.H` |
| Mazatrol (640M) | **nur Ziffern** | MDS-Nummer passt nicht → eigene Ziffernfolge je Programm, vom MDS vergeben und gespeichert (4.2) |
| Siemens | **offen** – nachschauen | |
| PC-DMIS (KMG) | **offen**; Name der Excel-Vorlage muss eindeutig sein (siehe Messprogramme-Konzept) | |

Passt eine Nummer nicht zur Regel, meldet das MDS das beim Anlegen bzw. bei der Zuordnung zur
Maschine – nicht erst an der Maschine.

### 4.1 Namensregel in den Stammdaten

Die Steuerungstypen gibt es schon (Stammdaten → Steuerungen, Tabelle `control_types`, Maschinen
verweisen über `control_type_id`). Dort kommt je Steuerung eine Namensregel dazu:

| Einstellung | Beispiel Heidenhain | Beispiel Mazatrol |
|---|---|---|
| Art | Text | Nur Ziffern |
| Vorlage (Text) | `{programmnummer}` | – |
| Ziffernbereich (Ziffern) | – | z. B. `1000`–`9999` (offen, siehe Fragen) |
| erlaubte Zeichen | `A–Z a–z 0–9 - _` | `0–9` |
| Großbuchstaben erzwingen | nein | – |
| max. Länge | offen | offen |
| Dateiendung | `.H` | offen |

- **Vorlage** mit Platzhaltern, z. B. `{programmnummer}`, `{bauteil}`, `{n}`, `{kunde}`. Standard ist
  `{programmnummer}`; braucht eine Steuerung etwas Kürzeres, stellt man es hier um, ohne Code
- **Umlaute/Sonderzeichen** werden nicht still ersetzt, sondern gemeldet (ä → ae wäre an der
  Maschine überraschend)
- Später bei Bedarf: Abweichung je Maschine (gleiche Steuerung, andere Gewohnheit) als Übersteuerung an
  `machines`; erst einbauen, wenn es den Fall gibt
- Einrichten über die Oberfläche (Stammdaten), keine Werte per Migration – wie Operationstypen

### 4.2 Nur-Ziffern-Steuerungen (Mazatrol)

**Heute schon so:** Mazatrol-Programme bekommen eine fortlaufende Nummer (7-stellig, z. B. `1000010`),
von Hand vergeben. In TopSolid steht sie nicht im Dokumentnamen, sondern im Programm-Dialog unter
„Dateiname“ – getrennt vom „Programmname“ (der lässt sich „erzwingen“). Beides ist parametrisch.
Das MDS übernimmt also nur die Vergabe, die Arbeitsweise bleibt.

- **Startwert:** höchste bisher vergebene Nummer als Start in der Namensregel eintragen, damit das MDS
  nahtlos weiterzählt und nichts doppelt vergibt
- Das MDS vergibt je Programm und Maschine eine **Ziffernfolge** aus dem eingestellten Bereich
  (nächste freie), einmal vergeben bleibt sie
- gespeichert als Zuordnung Programm ↔ Maschine ↔ Name (neue Tabelle, siehe 7) – an der Maschine
  steht `4711`, im MDS sieht man dazu `KD00000-00004-1`
- Suche im MDS auch nach dieser Ziffernfolge (wer an der Maschine `4711` liest, findet das Programm)
- Eindeutig je Maschine bzw. je Steuerungsspeicher – zwei Mazatrol-Maschinen dürfen dieselbe Zahl haben,
  wenn sie getrennte Speicher haben (offen: einfacher wäre eindeutig über alle Mazatrol)

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
- Namensregel je Steuerung in den Stammdaten (4.1), Ziffernvergabe für Mazatrol (4.2)
- Download/Bereitstellung benennt die Datei nach der Namensregel der Ziel-Steuerung
- Kopf-Prüfung beim Hochladen (Abschnitt 5)

**Stufe 3 – MDS → TopSolid**
- Programm im MDS anlegen (Nummer reserviert, Status „geplant“), bevor programmiert wird
- TopSolid übernimmt die Nummer: über den Dokumentnamen (wertet der Postprozessor heute schon aus)
  oder per TopSolid-API (Erfahrung aus dem Seriennummern-Generator)
- Im Programm-Dialog von TopSolid sind **„Programmname“ und „Dateiname“ getrennte, parametrische
  Felder** – ein MDS-Agent bzw. die TopSolid-API kann beide setzen: Dateiname nach der Namensregel der
  Steuerung (Heidenhain `KD00000-00004-1`, Mazatrol die vergebene Ziffernfolge), Programmname = MDS-Nummer.
  Damit braucht es dafür keinen Umbau am Dokumentnamen
- Idee für später: Das Feld „Kopf“ im selben Dialog (heute Freitext wie Spanndruck, Standzeit,
  Einstellhinweise) könnte aus dem MDS kommen, etwa aus Einrichteblatt bzw. Vorrichtung – dann stehen die
  Hinweise an einer Stelle
- passt zu „In TopSolid anlegen“ aus TOPSOLID_INTEGRATION_IDEEN.md, Abschnitt 2

---

## 7. Datenmodell (Skizze, Stufe 1)

- `programs.program_number` bleibt (Anzeige, Suche, Einrichteblätter)
- neu: `programs.part_seq` (integer) – das `n`; Zähler je Bauteil und Art
- Eindeutigkeit: (Bauteil, `kind`, `part_seq`, Maschine) – das Bauteil hängt über den Arbeitsgang
  dran, daher per Prüfung im Backend oder Trigger statt einfachem Index; genaue Form bei der Umsetzung
- Vergabe in derselben Transaktion wie das Anlegen (zwei gleichzeitige Uploads dürfen nicht dieselbe
  Nummer bekommen)
- Namensregel je Steuerung: neue Spalten an `control_types` (Art, Vorlage, Ziffernbereich, erlaubte
  Zeichen, max. Länge, Endung) – Stufe 2
- Name an der Maschine: neue Tabelle `program_machine_names` (Programm, Maschine, Name, vergeben am/von)
  – für Ziffern-Steuerungen nötig, für Text-Steuerungen als Nachweis, welcher Name an die Maschine ging

---

## 8. Offene Fragen

1. **Namensgrenzen der Steuerungen:** Heidenhain (Ziffern, Buchstaben, `-`, `_`) und Mazatrol (nur
   Ziffern) geklärt. Offen: Siemens; max. Länge bei Heidenhain; bei Mazatrol 7-stellig fortlaufend
   (z. B. `1000010`) – offen: höchste bisher vergebene Nummer als Startwert, gibt es reservierte Bereiche?; Dateiendungen;
   PC-DMIS
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
