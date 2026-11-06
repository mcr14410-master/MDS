# Spec: Programmnummern Stufe 1 – Schema im MDS

**Stand:** 05.11.2026 · Vorschläge S1–S7 vom Nutzer angenommen, Bewertung am Ergebnis im Dev-MDS
**Bezug:** [PROGRAMMNUMMERN_KONZEPT.md](PROGRAMMNUMMERN_KONZEPT.md) (Abschnitte 3, 6 und 8), ROADMAP „Programmnummern-Format“

---

## 1. Ziel und Umfang

Neue NC- und Messprogramme bekommen beim Anlegen eine Nummer nach dem Schema aus dem Konzept:

| Art | Format | Beispiel |
|---|---|---|
| NC-Programm | `<Bauteilnummer>-<n>` | `KD00000-00004-1` |
| Messprogramm | `<Bauteilnummer>-M<n>` | `KD00000-00004-M1` |

**Drin:**
- Nummernvorschlag beim Anlegen (NC- und Messprogramme), Zähler je Bauteil und Art
- Feld „Programmnummer“ im Upload-Formular (vorbelegt) und im Bearbeiten-Formular
- Nummer änderbar, solange das Programm nie freigegeben war; danach gesperrt
- Prüfung auf doppelte Nummern
- Varianten (G350/C22) übernehmen die Nummer aus der Variantengruppe

**Nicht drin (Stufe 2/3):**
- Namensregeln je Steuerung, Ziffernvergabe Mazatrol, Umbenennen beim Download/Bereitstellen
- Kopfprüfung beim Hochladen, Übergabe an TopSolid
- Umnummern des Altbestands (entschieden: bleibt, Konzept 8.3)

---

## 2. Ist-Stand (Code, 05.11.2026)

- `utils/programNumber.js`: `<OP-Code>-<lfd. Nr. 3-stellig>` je Arbeitsgang, höchste vorhandene Nummer + 1,
  NC und Messen zählen gemeinsam. Aufgerufen in `programsController.createProgram` (NC) und
  `cmmProgramsController` (Messprogramm anlegen), wenn keine Nummer mitkommt.
- Die Formulare schicken keine Nummer mit. `PUT /api/programs/:id` nimmt `program_number` optional an (#226), das
  Formular „Programm bearbeiten“ nutzt das nicht.
- `programs.program_number` ist `varchar(50) NOT NULL` und hat keinen Eindeutigkeits-Index. Der Altbestand hat Doppelte über
  Bauteile hinweg (jedes Bauteil hat sein `CNC-F-001`) → **kein globaler Unique-Index möglich**.
- `parts.part_number` ist `NOT NULL UNIQUE`. Ohne Eingabe wird es generiert: `<Kundennummer>-<5-stellig>`, ohne
  Kundennummer `K-<id 3-stellig>-<5-stellig>`. Von Hand vergebene Bauteilnummern sind möglich und können lang sein.
- Varianten: Arbeitsgänge mit gleicher `variant_group_id`, je einer Maschine (`operations.machine_id`).
- Die Programmnummer steckt in Pfaden: `local_dir` = `<Teilenummer>\<Programmnummer>` (Bereitstellung), ZIP-Name,
  Einrichteblätter, Suche.

---

## 3. Entscheidungen für diese Spec (Vorschläge, zur Abstimmung)

| # | Thema | Vorschlag |
|---|---|---|
| S1 | Zähler | Fester Zähler je Bauteil und Art in der DB, **nicht** aus den vorhandenen Nummern abgeleitet. Sonst bekäme das nächste Programm nach dem Löschen des höchsten dessen Nummer erneut (Konzept 3: „wird nie neu vergeben“) |
| S2 | Bauteilnummer im Präfix | die **aktuelle** `part_number` beim Anlegen. Wird die Bauteilnummer später geändert, behalten bestehende Programme ihre Nummer, neue bekommen das neue Präfix, der Zähler läuft weiter |
| S3 | Wann gesperrt | sobald das Programm **einmal freigegeben** war (`released_revision_id IS NOT NULL`). Ab dann kann es an einer Maschine oder einem Mess-PC liegen, der Ordnername hängt daran |
| S4 | Eindeutigkeit | Prüfung im Backend, in derselben Transaktion wie Anlegen/Ändern: Die Nummer darf an keinem anderen Programm vorkommen. **Ausnahme:** Programme gleicher Art in einem anderen Arbeitsgang derselben Variantengruppe (Konzept 8.4). Groß-/Kleinschreibung zählt nicht (`KD00000-00004-m1` = `-M1`, Windows-Dateinamen) |
| S5 | Variante | Beim Anlegen in einem Variantenarbeitsgang schlägt das MDS zuerst die kleinste Nummer gleicher Art vor, die es in der Gruppe gibt, aber in diesem Arbeitsgang noch nicht. Erst wenn keine fehlt: neue Nummer vom Zähler |
| S6 | Von Hand geändert | Gibt der Nutzer eine eigene Nummer ein (z. B. Übernahme einer alten Nummer), zählt der Zähler nicht mit. Eine eingegebene Nummer im Schema mit `n` > Zähler hebt den Zähler an, damit sie später nicht doppelt vergeben wird |
| S7 | Länge | Vorschlag länger als 24 Zeichen (Heidenhain-Anzeige) → Hinweis im Formular, kein Fehler. Länger als 50 (Spalte) → Fehler mit der Bitte, die Nummer von Hand zu kürzen |

---

## 4. Datenmodell (eine Migration)

```sql
CREATE TABLE part_program_counters (
  part_id   integer     NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  kind      varchar(10) NOT NULL CHECK (kind IN ('nc', 'cmm')),
  last_seq  integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (part_id, kind)
);
```

- Startwerte: In der Migration wird für jedes Bauteil der Zähler aus vorhandenen Nummern **im neuen Schema** bestimmt.
  Das ist für den Fall, dass schon jemand von Hand so nummeriert hat. Altbestand wie `CNC-M-001` zählt nicht. Fehlt eine Zeile,
  ist der Zähler 0 (`INSERT … ON CONFLICT DO UPDATE` beim ersten Vergeben).
- Vergabe: `UPDATE … SET last_seq = last_seq + 1 RETURNING last_seq` auf die gesperrte Zeile, im selben Client
  und in derselben Transaktion wie das `INSERT INTO programs`. Zwei gleichzeitige Uploads bekommen so verschiedene Nummern.
- Kein `part_seq` an `programs` (Abweichung von Konzept 7): Die Nummer steht vollständig in `program_number`, der
  Zähler reicht für die Vergabe. Es wird keine zweite Quelle angelegt, die auseinanderlaufen kann.
- `program_number` bleibt `varchar(50)`, keine Änderung am Altbestand.

---

## 5. Backend

### 5.1 `utils/programNumber.js` (reine Funktionen + DB-Helfer)

- `formatProgramNumber(partNumber, kind, seq)` → `KD00000-00004-1` bzw. `KD00000-00004-M1`
- `parseSchemaSeq(programNumber, partNumber, kind)` → `n` oder `null` (für S6 und die Migration)
- `normalizeForCompare(nr)` → getrimmt, Großbuchstaben (S4)
- `suggestProgramNumber(client, operationId, kind)` → Vorschlag **ohne** Zähler zu verbrauchen (für das Formular):
  Variante zuerst (S5), sonst `last_seq + 1`
- `assignProgramNumber(client, operationId, kind, requested)` → in der Transaktion:
  - ohne Eingabe: Variante (S5) oder Zähler +1
  - mit Eingabe: prüfen (S4), ggf. Zähler anheben (S6)
- `checkProgramNumberFree(client, number, { programId, operationId, kind })` → Konflikt mit Bauteil/Arbeitsgang
  für die Meldung oder `null`
- `nextProgramNumber` (altes Format) entfällt. Die Tests in `test-program-number.js` werden umgestellt.

### 5.2 Endpunkte

| Endpunkt | Änderung |
|---|---|
| `GET /api/programs/suggest-number?operation_id=&kind=` | **neu**: Vorschlag + Hinweise (Länge > 24) fürs Formular. Recht wie Programm anlegen |
| `POST /api/programs` (NC), `POST /api/programs/cmm` | `assignProgramNumber`. Eine mitgeschickte Nummer wird geprüft. Bei Konflikt 409 mit Klartext: „KD00000-00004-M1 ist schon vergeben (TEIL-0001 OP30)“ |
| `PUT /api/programs/:id` | `program_number` geändert → 409, wenn gesperrt (S3): „Nummer ist seit der ersten Freigabe fest“. Sonst Prüfung S4 und S6 |
| Variante anlegen mit „NC-Programme kopieren“ | siehe 5.3 |

- Audit: Nummernänderung über `PUT` läuft durch die Audit-Middleware. Im Eintrag steht nur der Request-Body, also die neue Nummer. Die alte Nummer steht nicht drin (gilt MDS-weit, siehe ROADMAP „Offene Fixes“). Ändern geht nur vor der ersten Freigabe, das ist für Stufe 1 vertretbar.
- `rollback`, Workflow, Bereitstellung: unverändert.

### 5.3 Varianten-Kopie

`copy_programs` in `operationsController` (Variante anlegen) schreibt in Spalten, die es an `programs` nicht gibt
(`name`, `file_path`, `version`, `machine_id`, `status`). Wer beim Anlegen einer Variante „NC-Programme“ anhakt, bekommt
einen Fehler (siehe ROADMAP „Offene Fixes“). **Nicht Teil dieser Spec.** Die Reparatur ist ein eigener Fix,
die Nummern würden dabei nach S5 gleich übernommen.

---

## 6. Oberfläche

- **Upload-Formular** NC (`ProgramUploadForm`) und Messprogramm (`CmmUploadForm`), nur beim Anlegen eines Programms:
  - Feld „Programmnummer“, vorbelegt aus `suggest-number`, änderbar, Schrift `font-mono`
  - Darunter grau: „Vorschlag nach Schema; wird beim Speichern endgültig vergeben“
  - Hinweise aus S7 gelb unter dem Feld, der Konflikt (409) als Fehlermeldung am Feld
  - Ändert der Nutzer nichts, schickt das Formular **keine** Nummer mit. Das Backend vergibt sie dann frisch. So bekommen zwei gleichzeitig offene Formulare nicht dieselbe Nummer.
- **Bearbeiten** (Programm bearbeiten): Feld „Programmnummer“
  - änderbar, solange nie freigegeben
  - danach schreibgeschützt mit Schloss-Symbol und Titel „Seit der ersten Freigabe fest“
- Anzeige sonst unverändert.

---

## 7. Tests

- **Unit** (`test-program-number.js`): Format NC/Messen, Parsen (fremde Präfixe, `-M` vs. Ziffer, Groß/klein),
  Länge 24/50, Vorschlag Variante (fehlende Nummer der Gruppe, alle vorhanden → neue)
- **Integration** (`tests/integration/test-programmnummern.js`, Wegwerf-DB):
  - erstes NC → `-1`, erstes Messprogramm → `-M1` (getrennte Zähler)
  - höchstes löschen → nächstes bekommt trotzdem die nächste Nummer, nicht die gelöschte (S1)
  - Nummer von Hand `-7` → nächstes automatisch `-8` (S6)
  - doppelte Nummer an anderem Bauteil → 409; gleiche Nummer im Variantenarbeitsgang → ok (S4/S5)
  - `-m1` gegen `-M1` → 409
  - nach Freigabe ändern → 409; im Entwurf ändern → ok
  - zwei gleichzeitige Anlagen (`Promise.all`) → verschiedene Nummern
  - Bauteilnummer geändert → neues Präfix, Zähler läuft weiter
- **`.http`**: Szenarien für `suggest-number`, Konflikt, Sperre
- **Playwright**: NC- und Messprogramm anlegen (Vorschlag übernommen und geändert), Bearbeiten im Entwurf und nach Freigabe

---

## 8. Umsetzungsplan

| PR | Inhalt | Prüfung |
|---|---|---|
| **1** | Migration `part_program_counters` + Startwerte, `programNumber.js` neu, Anlegen NC/Messen über `assignProgramNumber`, `PUT` mit Sperre und Prüfung, `suggest-number` | Unit, Integration, `.http` |
| **2** | Formulare: Feld im Upload (NC, Messen) und Bearbeiten | Playwright, Dark Mode |

Release danach als Minor. Vorher kein Prod-Check nötig, weil der Altbestand nicht angefasst wird. Siehe aber Abschnitt 9, Punkt 1.

---

## 9. Offene Punkte

1. ~~**Bauteilnummern in Produktion**~~ – entfällt (05.11.2026): Im Betrieb sind noch keine echten Bauteile,
   Arbeitsgänge oder Programme im MDS angelegt, nur Tests. Es gibt keinen Altbestand, der Start ist frisch.
   Startwerte in der Migration bleiben trotzdem drin, damit eine DB mit Testdaten nicht stolpert.
2. **Rechte:** Nummer ändern im Entwurf – reicht das Recht „Programm bearbeiten“, oder nur für bestimmte Rollen?
   Vorschlag: gleiches Recht wie Bearbeiten.
3. **Messprogramm-Dateinamen:** Hinweis beim Upload, wenn `.prg`, `.cad` oder Vorlage nicht nach der Nummer heißen
   (Konzept 4.3)? Vorschlag: erst mit dem Erstimport (Schritt 7) bzw. Stufe 2, nicht hier.
