# Ballooning: Zeichnung stempeln, Prüfplan, FAI und Messwerte

**Datum:** 2026-11-12
**Status:** Entwurf – zur Freigabe
**Umsetzung:** in fünf Stufen, je Stufe ein eigener Umsetzungsplan; der erste Plan ist Stufe 1 (Stempeln)
**Klickbare Skizze:** privates Artifact „Zeichnung stempeln“ (nur Platzhalterdaten), abgestimmt am 12.11.2026

## Ziel

Merkmale einer Zeichnung werden **einmal im MDS erfasst** und dann überall genutzt:

- **Zeichnung stempeln:** Ballons mit Nummern auf die Zeichnung setzen, das Merkmal so tippen, wie es auf der Zeichnung steht. Ersetzt den Stempel auf Papier.
- **Prüfplan:** Positionen verweisen auf Merkmale. Klick auf die Nummer zeigt die Stelle auf der Zeichnung.
- **FAI (AS9102) und 100-%-Prüfung:** Messwerte je Merkmal und Stück erfassen oder aus einer PC-DMIS-Datei übernehmen, Ausgabe nach Kundenvorgabe.

Warum: FAIs werden heute analog gestempelt, Merkmale stehen mehrfach (Zeichnung, Prüfplan, PC-DMIS, Protokoll) und werden von Hand abgeglichen. Für eigene Messprotokolle hilft die Ballonnummer, das Merkmal auf der Zeichnung schnell zu finden.

**Rahmenbedingungen aus dem Betrieb**

- Kundenzeichnungen kommen meist als **Scan** (nicht markierbar, kein Text). Deshalb kein OCR, sondern schnelle Eingabe mit Parser für Zeichnungsschreibweise.
- FAI meist nach **AS9102**, einige Kunden schicken **eigene Excel-Vorlagen**.
- Manche Kunden verlangen **100 % auf bestimmte Merkmale mit Datenübermittlung** (heute Excel aus PC-DMIS per Mail) und liefern dafür **selbst gestempelte Zeichnungen**.
- Mal mit, mal ohne Seriennummern.
- In PC-DMIS heißen die Dimensionen bei FAI und fertigungsbegleitenden Messungen heute schon **`PM1`, `PM2` …** nach der Ballonnummer.

**Nicht im Umfang**

- OCR oder Texterkennung (frühestens nach einem Spike mit echten Scans, dann nur lokal im Browser als Vorschlag, nie in der Cloud).
- Dimensionen im PC-DMIS-Programm anlegen oder ändern (der Agent ändert Programminhalte nie).
- Mails an Kunden aus dem MDS verschicken.
- Kundenportale (z. B. Net-Inspect).
- Automatische Übernahme von Messläufen (siehe Ausblick).

**Betriebsneutral:** Die Stempelung ist optional, ohne sie läuft der Prüfplan wie heute. Nichts setzt PC-DMIS voraus: Messwerte gehen von Hand oder über eine einfache Tabelle, die jede Messmaschinen-Software liefern kann. Der PC-DMIS-Bezug beschränkt sich auf die Vorgabe `PM{nr}` und die Anleitung für die Standard-Ausgabe.

## Stufen

| Stufe | Inhalt | Ergebnis |
|---|---|---|
| 1 | Zeichnung stempeln | Merkmale je Zeichnung, gestempeltes PDF, Merkmalsliste als Excel/CSV |
| 2 | Prüfplan | Positionen verweisen auf Merkmale, „Aus Zeichnung übernehmen“, Abdeckung |
| 3 | Messreihen und FAI | Messwerte von Hand, FAI mit Form 1–3 nach AS9102 |
| 4 | Messwerte aus Datei | Standard-Ausgabe aus PC-DMIS hochladen, Zuordnung über `PM{nr}`, Abgleich Programm ↔ Zeichnung |
| 5 | Kundenausgabe | Ausgabeprofil je Kunde, Excel-Vorlagen, 100-%-Datenübermittlung |
| später | Ausblick | Ballons auf neuen Index übernehmen, automatische Übernahme über den Agenten, OCR-Spike |

Stufe 4 liegt bewusst vor Stufe 5: Bei 100 % tippt niemand Werte ab, ohne Datei-Übernahme lohnt die Kundenausgabe nicht.

## 1. Datenmodell

### 1.1 `drawing_stamps` – Stempelung einer Zeichnung

Genau eine je Zeichnungsdokument.

| Spalte | Typ | Bedeutung |
|---|---|---|
| `id` | serial | |
| `part_document_id` | integer, unique, FK `part_documents` | die gestempelte Zeichnung |
| `numbering` | varchar(20) | `own` (MDS zählt) oder `existing` (Ballons sind schon auf der Zeichnung: vom Kunden gestempelt oder von Hand gestempelte Prüfzeichnung aus dem Altbestand) |
| `status` | varchar(20) | `draft` oder `released` |
| `general_tolerance` | varchar(50), nullable | aus dem Schriftfeld, z. B. `ISO 2768-mK` |
| `page_rotation` | jsonb | Drehung je Seite, z. B. `{"1": 90}` |
| `previous_stamp_id` | integer, nullable, FK `drawing_stamps` | Vorgänger beim neuen Index (Ausblick) |
| `released_by`, `released_at` | integer / timestamptz | Freigabe |
| `version` | integer | für Änderungskonflikte (siehe 8) |
| `created_by`, `created_at`, `updated_by`, `updated_at` | | `timestamptz` |

### 1.2 `drawing_characteristics` – ein Merkmal je Zeile

| Spalte | Typ | Bedeutung |
|---|---|---|
| `id` | serial | |
| `stamp_id` | integer, FK `drawing_stamps` | |
| `balloon_label` | varchar(20) | Ballonnummer als Text: `12`, bei vorhandenen Ballons auch `12a`, `B3` |
| `sort_order` | integer | Reihenfolge in Listen und Ausgaben |
| `page` | integer | Seite der Zeichnung (ab 1) |
| `frame` | jsonb | Rahmen `{x, y, w, h}` relativ zur Seite (0…1) |
| `balloon_pos` | jsonb | Ballonposition `{x, y}` relativ zur Seite |
| `raw_text` | varchar(200) | getippt wie auf der Zeichnung, z. B. `Ø40 h7` |
| `char_type` | varchar(30) | `diameter`, `linear`, `radius`, `chamfer`, `angle`, `thread`, `surface`, `gdt`, `note` |
| `nominal`, `upper_dev`, `lower_dev`, `min_value`, `max_value` | numeric(12,5), nullable | erkannte oder von Hand eingetragene Werte |
| `unit` | varchar(10) | `mm`, `°`, `µm` |
| `fit` | varchar(10), nullable | z. B. `H7` |
| `gdt_symbol`, `datums` | varchar, nullable | Form/Lage mit Bezügen |
| `multiplicity` | integer, default 1 | `2x Ø6,6` → 2, Unterpositionen `5.1`, `5.2` ergeben sich daraus |
| `tolerance_source` | varchar(50) | `drawing`, `ISO 2768-m`, `ISO 286`, `manual` |
| `parse_ok` | boolean | false = „bitte prüfen“ |
| `is_inspection` | boolean | false bei theoretisch genauen Maßen `[Ø55]` und Hilfsmaßen `(25)` |
| `is_key` | boolean | Schlüsselmerkmal (KC), Dreieck am Ballon |
| `full_inspection` | boolean | „100 % dokumentieren“ nach Kundenvorgabe |
| `status` | varchar(20) | `active` oder `removed` (entfallen) |
| `added_after_release` | boolean | nach der Freigabe dazugekommen |
| `created_*`, `updated_*` | | `timestamptz` |

Unique `(stamp_id, balloon_label)`. Unterpositionen bekommen **keine** eigenen Zeilen.

### 1.3 Nummern

- **Eigene Nummerierung, Entwurf:** fortlaufend in der Reihenfolge des Setzens. Löschen schließt die Lücke (Nummern dahinter rücken nach). „Nach Lage neu nummerieren“ zählt von links oben nach rechts unten (Zeilenbänder, dann x).
- **Ballons schon auf der Zeichnung** (`existing`): Rahmen um den vorhandenen Ballon bzw. das Maß ziehen, die vorhandene Nummer wird beim Setzen mit eingegeben. Das MDS zählt nicht und nummeriert nicht um.
- **Freigegeben (beide Arten):** Nummern sind fest. Das Backend lehnt jede Änderung von `balloon_label` ab. Löschen setzt `status = 'removed'`, die Nummer bleibt belegt. Neue Merkmale bekommen die nächste freie Nummer und `added_after_release = true`.
- Verschieben eines Ballons ändert die Nummer nie.
- Freigabe und jede Änderung danach stehen im Audit-Log.

### 1.4 Rechte

Neue Rechte per Migration (`ON CONFLICT (name) DO NOTHING`, mit `description` und `category`), nur der Rolle `admin` zugewiesen:

- `drawing.stamp` – stempeln, Merkmale bearbeiten
- `drawing.release` – Stempelung freigeben

Weitere Rechte (Messreihen, FAI) legt der Plan der jeweiligen Stufe fest.

## 2. Stufe 1: Zeichnung stempeln

### 2.1 Bedienung

So wie in der Skizze abgestimmt:

- Rahmen um ein Maß ziehen, Merkmal tippen, Enter. Ballon setzt sich neben den Rahmen und lässt sich verschieben.
- Vorschau beim Tippen: Art, Nennmaß, Abmaße, Grenzmaße, Grundlage der Toleranz, Status „Erkannt“, „Kein Prüfmerkmal“ oder „Bitte prüfen“.
- KC und „100 % dokumentieren“ je Merkmal ankreuzbar.
- **Zwei Eingabe-Varianten**, wählbar pro Benutzer (`preferencesStore`, wie Kachel/Tabelle):
  - **A · Liste daneben:** Eingabe fest rechts, darunter die Merkmalsliste.
  - **B · Eingabe am Rahmen:** kleines Fenster direkt am gezogenen Rahmen, Zeichnung in voller Breite.
- Klick auf eine Zeile der Liste hebt den Ballon hervor. Zoom und Drehen je Seite.
- Statusanzeige Entwurf/Freigegeben mit Knopf „Freigeben“ (nur mit `drawing.release`).

### 2.2 Parser

Ein Modul für Zeichnungsschreibweise, an einer Stelle im Repo, genutzt von Frontend (Vorschau) und Backend (maßgeblich: rechnet beim Speichern aus `raw_text` nach, damit niemand per API andere Grenzmaße speichert). Wie Frontend und Backend dasselbe Modul laden, legt der Umsetzungsplan fest.

- Baut auf `frontend/src/utils/toleranceCalculator.js` auf (ISO 286 komplett, ISO 2768) – es gibt danach nur eine Toleranztabelle, die Handeingabe im Prüfplan nutzt dieselbe.
- Erkennt mindestens: Ø, R, Fase `1x45°`, Winkel, `±`, `+x/−y`, `max`/`min`, Passungen ISO 286, Allgemeintoleranz ISO 2768 (Längen, Radien/Fasen), Gewinde `M…` (Lehrenprüfung), `Ra`/`Rz`, Form und Lage mit Symbol und Bezügen, Anzahl `2x`, theoretisch genau `[…]`, Hilfsmaß `(…)`.
- Kürzel: `d12` → Ø12, `+-` → ±, `pos`, `eben`, `gerad`, `rund`, `zyl`, `par`, `senk`/`rw`, `neig`, `koax`, `sym`, `lauf`.
- Dezimalkomma und -punkt.
- Unbekanntes wird nicht verworfen: Merkmal wird mit `parse_ok = false` gespeichert, Nennmaß und Grenzen können von Hand eingetragen werden (`tolerance_source = 'manual'`).

### 2.3 Dateien und Anzeige

- PDF (auch mehrseitig) wird direkt angezeigt (`react-pdf` ist vorhanden).
- TIFF (auch mehrseitig), JPG, PNG bekommen beim Hochladen eine **Anzeigekopie** je Seite (PNG). Für TIFF kommt `sharp` dazu. Das Original bleibt unverändert.
- Positionen relativ zur Seite (0…1), damit die Auflösung der Anzeigekopie keine Rolle spielt.
- Dateien nur über `/view` und `/download` hinter `authenticateToken` (File-Upload-Standard).

### 2.4 Ausgaben

- **Gestempeltes PDF:** Ballons, Linien und KC-Dreiecke werden über das Original gelegt und als neue Datei erzeugt (`pdf-lib` kommt dazu). Bei `existing` wird das Original unverändert ausgegeben, die Ballons stehen schon darauf.
- **Merkmalsliste als Excel/CSV** (`exceljs` ist vorhanden): Ballonnummer, vorgeschlagene PC-DMIS-ID nach Regel (Vorgabe `PM{nr}`), Art, Nennmaß, Abmaße, Grenzmaße, KC, 100 %. Dient dem Programmierer beim Anlegen der Dimensionen.

## 3. Stufe 2: Prüfplan

- `inspection_plan_items` bekommt `characteristic_id` (nullable, FK `drawing_characteristics`).
- **Verknüpfte Position:** Nennmaß, Grenzmaße, Toleranz und Beschreibung kommen live aus dem Merkmal und sind im Prüfplan nur lesbar. Messmittel, Anweisung und Reihenfolge bleiben Sache des Prüfplans.
- **Positionen ohne Ballon** bleiben möglich (Sichtprüfung, Gratfreiheit).
- **„Aus Zeichnung übernehmen“:** nimmt standardmäßig die Hauptzeichnung (`is_primary_drawing`), wählbar ist jede andere gestempelte Zeichnung des Bauteils (z. B. Vorbearbeitungszeichnung). Nur **freigegebene** Stempelungen. Dialog mit Häkchen, schon übernommene Merkmale ausgegraut, Filter KC/100 %/Seite. Eine Position je Merkmal, Unterpositionen erscheinen darin.
- **Mehrere Arbeitsgänge:** Jeder Arbeitsgang wählt seine Merkmale aus derselben Stempelung. Ein Merkmal darf in mehreren Arbeitsgängen vorkommen, jede Position hat eigene Messmittel und Anweisungen.
- **Abdeckung:** In der Merkmalsliste zeigt eine Spalte, in welchen Arbeitsgängen das Merkmal geprüft wird. Merkmale ohne Arbeitsgang fallen auf.
- **Klick auf die Ballonnummer** im Prüfplan öffnet die Zeichnung am Ballon.
- **Bestehende Prüfpläne** bleiben unverändert. Je Position „Ballon zuordnen“; weichen die Werte ab, zeigt das MDS alt und neu, der Benutzer bestätigt. Keine automatische Zuordnung.
- **Merkmal entfallen:** Position bleibt mit Warnhinweis, bis sie entfernt wird.
- **Neuer Zeichnungsindex:** Prüfplan zeigt weiter auf die alte Stempelung, Hinweis „Zeichnung jetzt Index C, Prüfplan bezieht sich auf B“.
- **Variante kopieren** (`variantCopy.js`): Verknüpfungen fallen weg, die Werte werden als normale Positionen kopiert.
- Ein Prüfplan je Arbeitsgang bleibt.

## 4. Stufe 3: Messreihen und FAI

### 4.1 Messreihe

Eine Messreihe fasst Messungen zusammen: Bauteil, Stempelung (= Zeichnungsindex), Auftrag/Los (vorerst Freitext, es gibt noch kein Auftragsmodul), Art (`fai`, `full_inspection`, später `series`), Stückzahl, Status `open`, `in_progress`, `closed`.

- **Stück:** Seriennummer, wenn vorhanden, sonst laufende Nummer 1…n.
- **FAI:** Messreihe mit allen Merkmalen (Voll-FAI) oder gewählten (Teil-FAI, z. B. nach Indexänderung), meist ein Stück, plus Form 1/2.
- **100-%-Prüfung:** Messreihe mit den Merkmalen `full_inspection = true` über alle Stücke.
- Eigene Serienprotokolle nutzen später dieselbe Struktur.

### 4.2 Messwerte – `characteristic_results`

Je Wert: Messreihe, Stück, Merkmal, Unterposition, Messwert **oder** Attribut (i.O./n.i.O. bei Lehre, Sichtprüfung), Messmittel (Messmittelverwaltung), Quelle (`manual`, `file`), Verweis auf den Messlauf/die Datei (Stufe 4), wer und wann (`timestamptz`).

- **Grenzmaße zum Messzeitpunkt** werden mitgespeichert. Ein altes FAI bleibt richtig, auch wenn sich die Zeichnung ändert.
- **i.O./n.i.O.** ergibt sich aus den Grenzen der Zeichnung.
- **Unveränderlich:** Korrektur = neuer Eintrag mit Begründung, der alte bleibt sichtbar. Bei mehreren Werten zum selben Merkmal und Stück zählt der neueste.
- **Messmittel nicht kalibriert** zum Messzeitpunkt → Warnung.

### 4.3 Erfassung und Abschluss

- Erfassen wie Stempeln: offene Merkmale untereinander, Wert tippen, Enter, weiter. Rot/grün sofort. Klick auf die Nummer zeigt den Ballon.
- **Abschließen** nur, wenn jedes Merkmal (je Unterposition und Stück) einen Wert hat oder ausdrücklich „nicht zutreffend“ mit Begründung ist.
- **Form 1/2** als Felder mit Anhängen (Kopf, FAI-Anlass, Material, Sonderprozesse, Funktionsprüfungen, Zeugnisse). Kein eigenes Materialmodul.
- **Ausgabe** in Stufe 3: Form 1–3 nach AS9102 und das eigene FAI-Formular des Betriebs (eingebaut, PDF über `pdfkit`; Grundlage ist eine leere Vorlage vom Nutzer), gestempelte Zeichnung als Anlage.

## 5. Stufe 4: Messwerte aus Datei

### 5.1 Standard-Ausgabe

Jedes Messprogramm bekommt **zusätzlich** zum Kundenprotokoll eine Standard-Ausgabe fürs MDS, für alle Programme gleich:

- **Eine Zeile je Merkmal** (Dimension): ID, Achse, Soll, obere/untere Toleranz.
- **Eine Spalte je Seriennummer** mit dem Ist-Wert. Eine Datei kann eine ganze Messreihe enthalten; eine Datei mit einer Ist-Spalte ist der Sonderfall „ein Stück“.
- **Kopf:** Zeichnungsnummer, Index, Auftrag, FAI-Nr. (aus den Überwachungsfeldern, vgl. MESSPROGRAMME_KONZEPT 4.2).
- Welche PC-DMIS-2024-Ausgabe das liefert (zweite ExcelFormReport-Vorlage, CSV über Dateibefehle, XML-Export), klärt ein **Spike in der Test-VM** vor dem Plan der Stufe 4. Dabei auch: Zeichen in IDs (`PM5.1` oder `PM5_1`).
- Für andere Messmaschinen-Software: Spaltenzuordnung in den Einstellungen.

### 5.2 Hochladen und übernehmen

1. In der Messreihe die Dateien hineinziehen (mehrere Dateien oder ein Ordner). Mehrere Dateien zur selben Messreihe werden zusammengeführt.
2. **Vorschau:** je Stück die Merkmale rot/grün; IDs ohne Merkmal („nicht zugeordnet“); Merkmale ohne Wert; Abweichungen Programm ↔ Zeichnung.
3. „Übernehmen“ – erst ab hier sind die Werte Teil der Messreihe und unveränderlich.

- **Zuordnung:** Dimensions-ID nach Regel in den Einstellungen, Vorgabe `PM{nr}`, Unterpositionen nach dem Ergebnis des Spikes. Mehrachsige Dimensionen: Position → TP, Durchmesser → D; nicht eindeutig → „nicht zugeordnet“, nie still verworfen.
- **Abgleich Programm ↔ Zeichnung:** Weichen Soll oder Toleranz der Datei vom Merkmal ab, meldet das MDS z. B. „Merkmal 7: Programm ±0,1, Zeichnung ±0,05“. Für i.O./n.i.O. zählen die Grenzen der Zeichnung.
- **Nachmessung:** dieselbe Seriennummer erneut hochgeladen → neuer Wert zählt, alter bleibt sichtbar.
- Die Datei wird als **Original** am Messlauf abgelegt und nie verändert.
- Die PC-DMIS-Protokolle für Kunden laufen unverändert weiter, bis sich die Ausgabe aus dem MDS bewährt hat.

## 6. Stufe 5: Kundenausgabe

- **Ausgabeprofil je Kunde** (Kundenverwaltung): welche Formulare, welche Vorlage, Dezimalkomma/-punkt, gestempelte Zeichnung beilegen ja/nein, Sprache der Spaltenköpfe, bei Tabellen Stücke als Spalten (Vorgabe) oder Zeilen.
- **Vorlagen:** eigenes FAI-Formular und AS9102 Form 1–3 aus Stufe 3; Kunden-Excel-Vorlagen werden im MDS hochgeladen und über `exceljs` befüllt (Zuordnung von Feldern und Tabellenbereich je Vorlage).
- **100-%-Datenübermittlung:** Excel nach Ausgabeprofil zum Herunterladen, Versand per Mail bleibt beim Benutzer.
- Kundenvorlagen sind Kundenunterlagen: nie ins Repo, nie auf den Dev-Server. Entwickelt und getestet wird mit nachgebauten Dummy-Vorlagen.

## 7. Bezug zu den Messprogrammen

Abgeglichen mit MESSPROGRAMME_KONZEPT, MESSPROGRAMME_AGENT_SPEC und ALTBESTAND_IMPORT_SPEC (12.11.2026). Festgehalten als Richtung; die Feinheiten klärt der Plan der jeweiligen Stufe.

**Passt ohne Änderung**
- **Überwachungsfelder** (Kunde, Zeichnungsnummer, Index, Auftrag, FAI-Nr., Seriennummer) liefern den Kopf der Standard-Ausgabe (5.1).
- **Rückweg der Ergebnisse:** Die im Messprogramm-Konzept vorgesehene Stufe „Ergebnisse ins MDS, verknüpft mit Auftrag und Seriennummer“ ist Stufe 4 dieser Spec – kein zweites Konzept dafür.
- **Bereitstellen über den Agenten** bleibt für die Stufen 1–4 unverändert; der Agent liest nur und ändert keine Programminhalte.
- **Programmversion je Messlauf:** Die Bereitstellung hält die Version je Programm fest (`agent_deployment_programs`). Beim Hochladen einer Ergebnisdatei ermittelt das MDS daraus die Version, mit der gemessen wurde – eindeutig, wenn zur Messzeit genau eine Bereitstellung des Programms aktiv war, sonst fragt es nach. Der Abgleich Programm ↔ Zeichnung nennt dann die Version.

**Prüfzeichnung**
- Heute ist die Prüfzeichnung eine PDF in der Messprogramm-Version (Rolle `drawing`, Ziel Programmordner). Beim Altbestand gilt „gestempelte Zeichnung wird Prüfzeichnung, keine zweite Kopie“.
- **Neu (Entscheidung 12.11.2026):** Die Zeichnung gehört zum **Bauteil** (`part_documents`), dort wird gestempelt. Die Prüfzeichnung im Messprogramm ist eine **festgehaltene Kopie des gestempelten PDFs** in der Programmversion – beim Hochladen einer neuen Version „Gestempelte Zeichnung aus dem MDS übernehmen“. So bleibt die Version reproduzierbar und der Agent stellt weiter genau das bereit, was zur Version gehört.
- Ändert sich die Stempelung danach, zeigt das Messprogramm „Prüfzeichnung ist älter als die Stempelung“.
- **Altbestand:** Die von Hand gestempelten Prüfzeichnungen bleiben unverändert im Messprogramm. Wird eine davon für Prüfplan oder FAI gebraucht, wird sie per Knopf als Bauteil-Zeichnung übernommen (Kopie) und im Modus `existing` nachgezogen – nur bei Bedarf, nicht für alle auf einmal. Die Altbestand-Regel „keine zweite Kopie“ gilt damit nur noch für Zeichnungen, die nicht gestempelt werden.

**Standard-Ausgabe neben den Protokollvorlagen**
- Heute hat jedes Programm genau eine eigene Protokollvorlage (`.xlsx` + `.layout.xml`, Name = Programmnummer); sie bleibt unverändert.
- Wird die Standard-Ausgabe (5.1) eine zweite ExcelFormReport-Vorlage, ist sie **global** – einmal im MDS gepflegt, vom Agenten auf jedem Mess-PC ins Vorlagenverzeichnis gelegt, vom Gesundheitscheck geprüft. Globale Dateien kennt der Agent bisher nicht (Erweiterung).
- Wird es eine CSV über Dateibefehle, braucht es keine Vorlage, sondern einen Baustein im Programm, den der Programmierer einfügt.
- Welcher Weg, entscheidet der Spike vor dem Plan der Stufe 4.

## 8. Fehlerfälle

| Fall | Verhalten |
|---|---|
| Parser erkennt Merkmal nicht | Speichern mit „bitte prüfen“, Werte von Hand; Stempeln wird nie blockiert |
| Zeichnung löschen, Stempelung freigegeben oder Messwerte vorhanden | abgelehnt mit Hinweis (heute löscht `part_documents` per CASCADE mit – muss für diese Fälle gesperrt werden) |
| Zeichnung löschen, Stempelung im Entwurf | nach Rückfrage mitgelöscht |
| Bauteil löschen mit Stempelung/Messwerten | abgelehnt |
| Zwei Benutzer stempeln gleichzeitig | Speichern mit `version`; der Zweite bekommt „wurde zwischenzeitlich geändert, neu laden“ |
| Nummer ändern nach Freigabe (auch per API) | 409, Audit-Log unverändert |
| Datei: ID ohne Merkmal | „nicht zugeordnet“ in der Vorschau |
| Datei: Ist-Wert keine Zahl | Fehler in der Zeile, Rest wird gelesen |
| Datei: Zeichnungsnummer oder Index passt nicht | Übernehmen gesperrt |
| Datei: keine Seriennummer | laufende Nummer |
| Datei: dieselbe Seriennummer doppelt in einer Datei | Fehler, Übernehmen gesperrt |
| Messmittel abgelaufen | Warnung beim Erfassen, Wert wird gespeichert |

## 9. Tests

- **Parser:** Tabellentest mit Eingabe → erwartetem Ergebnis, mindestens die 19 Fälle der Skizze (u. a. `Ø40 h7` → 39,975–40,000; `g6` außerhalb der Skizzen-Tabelle muss im MDS erkannt werden), Stichproben ISO 286 gegen `toleranceCalculator`.
- **Backend** (`npm run test:integration`): Nummernregeln (Entwurf, vorhandene Ballons, Freigabe, entfallen), Rechte, Löschsperren, unveränderliche Messwerte, Datei-Upload mit Dummy-Dateien (mehrere Spalten, mehrere Dateien, Duplikate, falsche Zeichnung).
- **Oberfläche** (Playwright): Stempeln in beiden Varianten, Freigeben, „Aus Zeichnung übernehmen“, FAI erfassen und abschließen.
- **PC-DMIS:** Spike und Logik in der Test-VM; am Mess-PC prüft der Nutzer nur das echte Gerät.
- **Testdaten:** nur Platzhalter (`TEIL-0001`, `KD00000`, `FIRMA`) und erzeugte Dummy-Zeichnungen, keine Kundenzeichnungen.

## 10. Ausblick

- **Neuer Zeichnungsindex:** Ballons aus der Vorgänger-Stempelung übernehmen (`previous_stamp_id`), übernommene Merkmale als „prüfen“ markiert, Nummern bleiben, Entfallenes bleibt entfallen, Neues hinten an. Prüfplan-Positionen auf den neuen Index umhängen.
- **Automatische Übernahme über den Agenten:** Voraussetzung ist der feste Messdaten-Stamm statt `02_Messdaten` im Bauteilordner (MESSPROGRAMME_KONZEPT 4.2, Ausgabepfade). Der Agent schaut in den Ausgabeordner und lädt neue Dateien hoch (dieselbe Datei, derselbe Leser). Sie landen im **Eingang** „Messläufe ohne Zuordnung“. Automatisch übernommen wird nur, wenn alles eindeutig ist: freigegebene Messprogramm-Version, Auftrag/FAI-Nr. passt zu einer offenen Messreihe, Lauf nicht abgebrochen. Läufe mit nicht freigegebenem Programm nie automatisch. Verwerfen mit Grund, nie übernommene Läufe fallen nach z. B. 30 Tagen aus dem Eingang. Je Messreihe abschaltbar. Ist das Netz weg, hält der Agent zurück.
- **Fertiges PC-DMIS-Protokoll** (`OnReportPrintEnd`) als Anhang am Messlauf.
- **Überwachungsfelder vorbelegen** aus dem MDS (MESSPROGRAMME_KONZEPT 4.2, Idee A/B).
- **OCR-Spike** mit echten Scans, nur lokal im Browser als Vorschlag.
- **Mehrere Prüfpläne je Arbeitsgang** (Erstmuster/Serie, ROADMAP) – unabhängig von diesem Entwurf.
