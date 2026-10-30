# Konzept: Programmnummern (NC- und Messprogramme)

**Stand:** 30.10.2026 (Steuerungsgrenzen, TopSolid-Zuordnung, PC-DMIS) · Entwurf zur Abstimmung, noch nichts umgesetzt
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

- Teile-Dokument in TopSolid heißt `Zeichnungsnummer~Bezeichnung~Index`; der Postprozessor zerlegt den
  Namen und schreibt die drei Werte in den NC-Programmkopf (Abschnitt 5)
- NC-Dokument im TopSolid-Projekt heißt `Zeichnungsnummer-<n>`, `n` = Reihenfolge der
  Aufspannungen/Bearbeitungen des Bauteils (1, 2, 3 …). Der Name steht als erste Kommentarzeile im
  Programm und ist bei Text-Steuerungen auch der Dateiname
- Mazatrol: Dateiname kommt aus dem Feld „Dateiname“ im Programm-Dialog (7-stellige Zahl, 4.2), das
  NC-Dokument heißt trotzdem `Zeichnungsnummer-<n>` und steht im Kopf
- Das Feld „Programmname“ im Programm-Dialog wird nicht genutzt (nicht erzwungen, Standard `Programm1`)
- **Transfer:** je Maschine ein Transferverzeichnis (`Z:\NC\MASCHINE\__NEU__\`), an der Maschine
  verbunden; dort holt man sich die neuen Programme. Mazatrol: Steuerungsverzeichnis am PC verbunden,
  neue Dateien werden direkt draufgeschoben. **Einen Rückweg gibt es nicht** (offene Frage 7)
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

**Was die Steuerungen erlauben** (Stand 30.10.2026):

| Steuerung | erlaubt | Länge | Folge |
|---|---|---|---|
| Heidenhain (TNC 640) | `A–Z a–z 0–9 _ -` (und `.`, der trennt aber die Endung); keine Umlaute/Sonderzeichen | 24 Zeichen für vollständige Anzeige; hart nur Pfad ≤ 255 | passt direkt: `KD00000-00004-1.H` |
| Siemens (840D sl / 828D) | `A–Z a–z 0–9 _` – **kein Bindestrich** | 24 Zeichen für vollständige Anzeige | mit `-` → `_`: `KD00000_00004_1.MPF` |
| Mazatrol (640M, Fusion-Generation) | **nur Ziffern**, 1–99999999; unter 10000 belegt (Makros) | max. 8 Ziffern | eigene Ziffernfolge je Programm, vom MDS vergeben und gespeichert (4.2): `1000141.EIA` |
| PC-DMIS (KMG) | Windows-Dateiname (verboten nur `\ / : * ? " < > \|`) | unkritisch | passt direkt: `KD00000-00004-M1.prg` (4.3) |

- **Siemens:** Für den Aufruf als Unterprogramm **ohne** `CALL` sollte der Name mit zwei Buchstaben oder
  `_` + Buchstabe beginnen. Für Hauptprogramme egal; beginnt die Kundennummer mit Ziffern → Hinweis, kein Fehler
- **Mazatrol:** „nur Ziffern“ gilt für die Steuerungsgeneration, nicht für den Hersteller – Matrix/Smooth
  erlauben laut Sekundärquelle Buchstaben und `- _ . +` bis 32 Zeichen. Deshalb Regel je Steuerungstyp (4.1)
- Quellen: Siemens Programmierhandbuch Grundlagen (06/2009), TNC-640-Benutzerhandbuch „Namen von Dateien“,
  Mazatrol aus der Praxis an der 640M

Passt eine Nummer nicht zur Regel, meldet das MDS das beim Anlegen bzw. bei der Zuordnung zur
Maschine – nicht erst an der Maschine.

### 4.1 Namensregel in den Stammdaten

Die Steuerungstypen gibt es schon (Stammdaten → Steuerungen, Tabelle `control_types`, Maschinen
verweisen über `control_type_id`). Dort kommt je Steuerung eine Namensregel dazu:

| Einstellung | Heidenhain | Siemens | Mazatrol 640M |
|---|---|---|---|
| Art | Text | Text | Nur Ziffern |
| Vorlage (Text) | `{programmnummer}` | `{programmnummer}` | – |
| Zeichen ersetzen | – | `-` → `_` | – |
| Ziffernbereich (Ziffern) | – | – | ab `10000` (darunter Makros); Startwert 4.2 |
| erlaubte Zeichen | `A–Z a–z 0–9 - _` | `A–Z a–z 0–9 _` | `0–9` |
| Großbuchstaben erzwingen | nein | nein | – |
| max. Länge | 24 (Warnung) | 24 (Warnung) | 8 Ziffern (hart) |
| Dateiendung | `.H` | `.MPF` (Unterprogramm `.SPF`) | `.EIA` |

- **Vorlage** mit Platzhaltern, z. B. `{programmnummer}`, `{bauteil}`, `{n}`, `{kunde}`. Standard ist
  `{programmnummer}`; braucht eine Steuerung etwas Kürzeres, stellt man es hier um, ohne Code
- **Umlaute/Sonderzeichen** werden nicht still ersetzt, sondern gemeldet (ä → ae wäre an der
  Maschine überraschend)
- **Zeichen ersetzen** ist dagegen eine feste, je Steuerung sichtbar eingestellte Regel (Siemens `-` → `_`):
  immer gleich, an der Maschine vorhersehbar – kein Widerspruch zum Punkt davor
- **max. Länge:** Heidenhain und Siemens zeigen längere Namen nur nicht vollständig an → Warnung, kein
  Fehler. Das Schema liegt bei 15–16 Zeichen; knapp wird es erst mit Zusätzen (Variante, Maschine)
- Später bei Bedarf: Abweichung je Maschine (gleiche Steuerung, andere Gewohnheit) als Übersteuerung an
  `machines`; erst einbauen, wenn es den Fall gibt
- Einrichten über die Oberfläche (Stammdaten), keine Werte per Migration – wie Operationstypen

### 4.2 Nur-Ziffern-Steuerungen (Mazatrol)

**Heute schon so:** Mazatrol-Programme bekommen eine fortlaufende Nummer (7-stellig, z. B. `1000010`),
von Hand vergeben. In TopSolid steht sie nicht im Dokumentnamen, sondern im Programm-Dialog unter
„Dateiname“ – getrennt vom „Programmname“ (der lässt sich „erzwingen“). Beides ist parametrisch.
Das MDS übernimmt also nur die Vergabe, die Arbeitsweise bleibt.

- **An der Maschine** erscheint das Programm unter dem Dateinamen (`1000059.EIA` → `1000059`); die
  O-Nummer im Code ist fest `O0001` aus dem Postprozessor und spielt keine Rolle
- **Bereich:** unter `10000` liegen Makros u. Ä. → reserviert; vergeben wird 7-stellig ab `1000000`
- **Startwert:** höchste bisher vergebene Nummer als Start in der Namensregel eintragen, damit das MDS
  nahtlos weiterzählt und nichts doppelt vergibt. Stand 30.10.2026: `1000140`. Bis zum Einrichten wird
  weiter von Hand vergeben – dann die **dann** aktuelle höchste Nummer eintragen
- Das MDS vergibt je Programm und Maschine eine **Ziffernfolge** aus dem eingestellten Bereich
  (nächste freie), einmal vergeben bleibt sie
- gespeichert als Zuordnung Programm ↔ Maschine ↔ Name (neue Tabelle, siehe 7) – an der Maschine
  steht `1000141`, im MDS sieht man dazu `KD00000-00004-1`
- Suche im MDS auch nach dieser Ziffernfolge (wer an der Maschine `1000141` liest, findet das Programm)
- Eindeutig je Maschine bzw. je Steuerungsspeicher – zwei Mazatrol-Maschinen dürfen dieselbe Zahl haben,
  wenn sie getrennte Speicher haben (offen: einfacher wäre eindeutig über alle Mazatrol)

### 4.3 PC-DMIS (Messprogramme)

- **`.prg`** heißt nach der MDS-Nummer: `KD00000-00004-M1.prg`. Heute gibt es kein festes System
  (meist `Zeichnungsnummer_Bezeichnung_Index`, bei mehreren Programmen mit Zusatz)
- **`.cad`** gleich benannt – PC-DMIS findet sie über den Namen (das MDS warnt schon heute bei Abweichung)
- **Excel-Vorlage** ist je Programm eigen (gleiche Excel, aber das Layout ist je Programm anders) →
  Vorlage ebenfalls nach der MDS-Nummer: `KD00000-00004-M1.xlsx` / `.layout.xml`. Damit ist der Name im
  gemeinsamen Vorlagenverzeichnis automatisch eindeutig, auch bei mehreren Messprogrammen je Bauteil
- Der Vorlagenname steht **in der `.prg`** (`EXCELFORMREPORT/TEMPLATE=…`) → beim Anlegen des Programms
  gleich richtig setzen; nachträglich umbenennen heißt Programm ändern
- Kalibrierprogramm (Taster) gehört zur Dateigruppe, siehe MESSPROGRAMME_KONZEPT.md 4.2a
- Der „Teilename“ (Part Name) in PC-DMIS wird nicht einheitlich genutzt; die Kopfwerte kommen über
  Überwachungsfelder (siehe MESSPROGRAMME_KONZEPT.md 4.2a)

---

## 5. Programmkopf und Postprozessor

Im NC-Kopf stehen heute (Beispiel Mazatrol-Postprozessor):

| Kopfzeile | Quelle |
|---|---|
| erste Kommentarzeile | Name des NC-Dokuments (`Zeichnungsnummer-<n>`) |
| ZG.NR, NAME, INDEX | Postprozessor zerlegt den Namen des Teile-Dokuments (`Zeichnungsnummer~Bezeichnung~Index`) |
| Maschine, Kd.-Nr., Rohteil, Material, Autor, Datum | automatisch aus der TopSolid-Datei |
| Info-Block | Feld „Kopf“ im Programm-Dialog, von Hand (z. B. Anzugsmoment) |

- **Der Postprozessor hängt am Format des Teile-Dokumentnamens** (`~` als Trenner). Jede Automatisierung
  muss dieses Format erhalten – oder der PP liest die Werte später aus Parametern (robuster, Stufe 3)
- Der Zeichnungsindex steht im Kopf, nicht im Dateinamen (siehe offene Frage 6)

- **Stufe 2:** Beim Hochladen liest das MDS den Kopf und vergleicht mit dem Bauteil
  (Zeichnungsnummer/Revision). Abweichung → Warnung, z. B. Programm vom falschen Bauteil oder alter Index.
- **Stufe 1 reicht dafür schon:** Heißt das NC-Dokument nach der MDS-Nummer (`KD00000-00004-1` statt
  `Zeichnungsnummer-1`), steht sie in der ersten Kommentarzeile – **ohne Änderung am Postprozessor**.
  Dann ist an der Maschine sichtbar, welches MDS-Programm läuft – Grundlage für spätere Rückmeldungen
  (Laufzeit, Stückzahl) und für den Abgleich Maschine ↔ MDS. Die Zeichnungsnummer bleibt in ZG.NR.

---

## 6. Stufen

**Stufe 1 – Schema im MDS** (ohne TopSolid-Änderung)
- Nummernvorschlag nach Schema 3 beim Anlegen, Feld „Programmnummer“ im Upload- und Bearbeiten-Formular
- In TopSolid das NC-Dokument von Hand nach der MDS-Nummer benennen (Abschnitt 5) – Mazatrol-Dateiname
  weiter von Hand, bis Stufe 2 die Ziffern vergibt
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
- Ein MDS-Agent bzw. die TopSolid-API setzt den **Namen des NC-Dokuments** (= MDS-Nummer) und das
  parametrische Feld **„Dateiname“** im Programm-Dialog (Mazatrol: die vergebene Ziffernfolge). Das Feld
  „Programmname“ wird heute nicht genutzt und bleibt außen vor; der Teile-Dokumentname bleibt im
  Format für den Postprozessor (Abschnitt 5)
- Die übrigen Kopfwerte kommen heute schon automatisch aus TopSolid – von Hand ist nur der Info-Block
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

1. ~~**Namensgrenzen der Steuerungen**~~ – geklärt 30.10.2026 (Abschnitt 4: Heidenhain, Siemens,
   Mazatrol 640M, PC-DMIS; Startwert und reservierter Bereich Mazatrol in 4.2)
2. **Mehrere Programme je Aufspannung** (z. B. Hauptprogramm mit Unterprogrammen, Schruppen/Schlichten
   getrennt): eigene Nummern (`-1`, `-2`) oder Zusatz (`-1A`, `-1B`)?
3. **Bestehende Programme:** alte Nummern behalten und nur neue nach Schema vergeben, oder einmalig
   umnummern (nur Entwürfe? auch freigegebene, mit Vermerk im Audit-Trail)? Vorher in Produktion
   zählen, wie viele es sind.
4. **Maschinen-Varianten:** gleiche Nummer (Vorschlag) oder eigener Zusatz je Maschine?
5. **Messprogramme:** `M` als Kennung ok? Gleicher Zähler wie NC (`-1`, `-2`, `-M3`) oder getrennt
   (Vorschlag: getrennt)?
6. **Revision im Namen:** Zeichnungsindex gehört zum Bauteil, Programmversion zum MDS – beides nicht
   in die Nummer (Vorschlag). Heute steht der Index im Kopf (INDEX), nicht im Dateinamen → bestätigt
   für NC; bei PC-DMIS steckt er heute meist im `.prg`-Namen, künftig nicht mehr (4.3)
7. **Rückweg von der Maschine:** Heute gibt es nur den Hinweg (Transferverzeichnis). An der Maschine
   geänderte Programme kommen nicht ins MDS zurück. Soll das MDS sie zurückholen (Vergleich, Eingang
   als neue Version wie bei den Messprogrammen, MESSPROGRAMME_KONZEPT.md 5.3/5.4)?
