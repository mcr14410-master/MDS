# Messprogramm-Verwaltung (KMG / PC-DMIS) + MDS-Agent

**Erstellt:** 2026-10-13 · **Aktualisiert:** 2026-10-14 (sauberes Arbeitsverzeichnis, CNC, Vorlagenpfad, `.layout.xml`, Abschließen nur durch User, mehrere Bereitstellungen, eine Vorlage je Programm) · 2026-10-19 (`.prg` wird beim Laufstart gespeichert, PC-DMIS-Nebendateien, DocumentRecovery, MiniRoutines.xml, PC-DMIS-Automation; Testergebnisse: Laufdaten im Programm, Bereinigung, Vorlagenname, Ausgabepfade, Mini-Routinen)
**Status:** Konzept / Diskussionsgrundlage – Umsetzung später durch Claude Code nach `CLAUDE.md`
(Diagnose-First, Branch je Schritt, Migrationen nur über `pgm`, Rechte nur für `admin`).
SQL hier ist **Entwurf** zur Verständigung, keine fertige Migration.
**Ziel:** PC-DMIS-Messprogramme im MDS versioniert und freigegeben verwalten, auf dem Mess-PC lokal
bereitstellen und Änderungen an der Maschine sauber zurück ins MDS holen. Der dafür nötige
**MDS-Agent** wird so gebaut, dass er später auch TopSolid- und NC-Transfer-Aufgaben übernimmt.
Dasselbe Prinzip „Bereitstellen → Arbeiten → Abschließen“ gilt später für die CNC-Maschinen (Abschnitt 5.4).

---

## 1. Ausgangslage

**Heute im Messraum**
- Messprogramme liegen auf dem Netzlaufwerk und werden von dort direkt in PC-DMIS ausgeführt.
- Keine Versionierung, keine Freigabe, kein Nachweis, welcher Programmstand gemessen hat.
- Netzwerkausfall mitten im Messlauf = Programm weg.

**Im MDS vorhanden** (NC-Programmverwaltung)
- `programs` (am Arbeitsgang) + `program_revisions` mit SemVer (1.0.0 → 1.0.1), SHA-256-Hash,
  Workflow (`draft` → `review` → `approved` → `released`), Rollback, Download.
- Roadmap „Maschinen-Terminal → NC-Programm Transfer“ beschreibt schon `program_transfers`,
  Änderungserkennung und Rücksendung als neue Version – noch nicht umgesetzt.
- API-Key-Muster für Geräte gibt es beim Zeiterfassungs-Terminal (`time_terminals.api_key`).

**Lücken für Messprogramme**
1. **Binärdateien:** Der Upload liest jede Datei als UTF-8 in `program_revisions.content` und
   rechnet einen Zeilen-Diff. Eine `.prg` ist binär; Null-Bytes lehnt PostgreSQL in Textspalten ab
   → Upload endet mit 500. (Muss vor allem anderen behoben werden, siehe Schritt 0.)
2. **Mehrere Dateien je Stand:** Messprogramm (`.prg`) + CAD (`.cad`, gleichnamig daneben) +
   Prüfzeichnung (PDF). Heute kennt eine Revision genau eine Datei.
3. **Protokollvorlagen** (Excel + `.layout.xml`): je Programm eine eigene; PC-DMIS nimmt sie nur
   aus einem festen Vorlagenverzeichnis an, also nicht neben dem `.prg`.
4. **KMG als Maschine:** Das Koordinatenmessgerät existiert nur als Messmittel (Kalibrierung),
   nicht als Maschine mit Arbeitsgängen.
5. **Transfer:** Der Browser kann nicht auf den Mess-PC schreiben.

---

## 2. Grundsätze

- **Das MDS ist der Master.** Auf dem Mess-PC liegt eine lokale Arbeitskopie (`D:\…`), keine
  Wahrheit.
- **Sauberes Arbeitsverzeichnis:** Auf dem Gerät liegt nur, was für die **aktuelle Arbeit**
  bereitgestellt wurde – kein Spiegel aller Programme. Nach dem Abschließen ist das Verzeichnis
  wieder leer. So kann niemand versehentlich ein altes, lokal geändertes Programm verwenden.
- **An die Maschine geht nur, was freigegeben ist** (`released`).
- **Der Agent legt nie selbst Revisionen an.** Lokale Änderungen landen im MDS als *Eingang*;
  ein Mensch bestätigt sie mit Versionsart und Änderungsnotiz → Audit-Trail bleibt sauber.
- **Nie still überschreiben:** lokal geänderte oder in PC-DMIS geöffnete Dateien werden nicht
  angefasst. Geschrieben wird immer als Temp-Datei + Umbenennen.
- **Nur löschen, was unverändert im MDS liegt.** Geänderte Dateien gehen vor dem Entfernen
  automatisch in den Eingang. Dateien, die der Agent nicht selbst gebracht hat, fasst er nicht an
  (z. B. Hexagon-Standardvorlagen, Werkzeug-/Nullpunkttabellen an der CNC). Einzige Ausnahme:
  Nebendateien, die PC-DMIS selbst zu einem verwalteten Programm anlegt (4.4).
- **Ein Datenmodell für NC- und Messprogramme.** Versionierung, Workflow und Transfer gibt es
  einmal; die Oberfläche darf getrennt sein.

---

## 3. Bausteine

```
MDS (Pi)                                         Mess-PC (Windows)
┌───────────────────────────────┐   HTTPS     ┌─────────────────────────────────┐
│ programs (kind = 'cmm')       │ ◄─────────► │ MDS-Agent (C#, Tray/Dienst)     │
│  └ program_revisions          │   Agent     │  Modul Messprogramm-Sync        │
│     └ program_revision_files  │   fragt an  │   D:\Messprogramme\TEIL-0001\…  │
│   (inkl. Protokollvorlage)    │             │   PC-DMIS Vorlagenverzeichnis   │
│ agents / agent_file_states    │             │  (später: Modul TopSolid,       │
│ program_transfers             │             │   Modul NC-Transfer)            │
│ program_inbox (Eingang)       │             └─────────────────────────────────┘
└───────────────────────────────┘
```

Der Agent baut die Verbindung auf (Pull). Der Pi muss den Mess-PC nicht erreichen –
keine SMB-Freigabe, keine Zugangsdaten in der DB.

---

## 4. Datenmodell (Entwurf)

### 4.1 Programme

```sql
-- Art des Programms; bestehende Datensätze = 'nc'
ALTER TABLE programs ADD COLUMN kind varchar(10) NOT NULL DEFAULT 'nc';   -- 'nc' | 'cmm'

-- Dateien je Revision (Hauptdatei + Begleitdateien)
CREATE TABLE program_revision_files (
  id            serial PRIMARY KEY,
  revision_id   integer NOT NULL REFERENCES program_revisions ON DELETE CASCADE,
  role          varchar(20) NOT NULL,      -- 'main' | 'cad' | 'drawing' | 'other'
  filename      varchar(255) NOT NULL,     -- Originalname (PC-DMIS findet .cad über den Namen!)
  filepath      varchar(500) NOT NULL,
  filesize      integer,
  file_hash     varchar(64) NOT NULL,
  mime_type     varchar(100),
  created_at    timestamp NOT NULL DEFAULT now(),
  UNIQUE (revision_id, filename)
);
```

- `program_revisions.filename/filepath/file_hash` bleiben für die Hauptdatei (Abwärtskompatibilität
  NC); bei `kind = 'cmm'` zusätzlich alle Dateien in `program_revision_files`.
- `program_revisions.content` / `diff_from_previous` nur bei Textdateien; bei Binärdateien `NULL`,
  Vergleich nur über Hash (+ Dateiliste: welche Datei hat sich geändert).

### 4.2 Protokollvorlagen – Teil des Messprogramms

**Festlegung (14.10.2026):** Die Excel-Protokollvorlage ist **optional** – nicht jedes Bauteil
braucht eine Excel-Ausgabe. *Wenn* ein Messprogramm eine hat, dann seine **eigene**, auch wenn sie
inhaltlich identisch mit einer anderen ist. Es gibt keine geteilten oder globalen Vorlagen.

Schalter je Programm im MDS: **„Excel-Protokoll“ ja/nein**.
- **nein** → keine Vorlagendateien, nichts zu prüfen.
- **ja** → `.xlsx` + `.layout.xml` sind Pflicht (Upload ohne beide wird abgelehnt). Der Schalter
  verhindert, dass eine Vorlage beim Hochladen einfach vergessen wird – das MDS kann (noch) nicht
  aus dem `.prg` lesen, ob es ein Excel-Protokoll erwartet.

⇒ Die Vorlage ist **kein eigenes Stammdatum**, sondern gehört als Dateien zur Programmrevision
(`program_revision_files`, Rollen `report_xlsx` + `report_layout`). Sie wird mit dem Programm
versioniert, freigegeben, bereitgestellt und abgeschlossen. Eigene Tabellen für Vorlagen entfallen.

```sql
-- program_revision_files.role erweitert:
--   'main' (.prg) | 'cad' | 'drawing' | 'report_xlsx' | 'report_layout' | 'other'
-- plus Zielort, weil die Vorlage nicht neben dem .prg liegt:
ALTER TABLE program_revision_files ADD COLUMN target varchar(20) NOT NULL DEFAULT 'program_dir';
--   'program_dir'  → D:\Messprogramme\…
--   'template_dir' → PC-DMIS-Vorlagenverzeichnis
```

**Namensschema:** `KdNr_TeilNr_Rev.xlsx` – PC-DMIS legt beim ersten Speichern im
ExcelFormReport-Dialog `KdNr_TeilNr_Rev.layout.xml` mit demselben Basisnamen an.
- Weil alle Vorlagen in **einem** Verzeichnis liegen, muss der Name eindeutig sein → das MDS prüft
  beim Upload, dass kein anderes Programm denselben Vorlagennamen benutzt.
- Das MDS kann den erwarteten Namen aus Kundennummer, Teilenummer und Revision vorschlagen und
  beim Upload Abweichungen anzeigen.
- Der Vorlagenname steht **im `.prg`** (bestätigt 19.10.2026):
  `EXCEL_FORMULAR1=EXCELFORMREPORT/TEMPLATE=KUNDE_TEIL-0001, TYPE=EXCEL` (Basisname ohne Endung).
  Das MDS darf Vorlagendateien deshalb **nicht selbst umbenennen** – sonst findet PC-DMIS sie nicht
  mehr. Umbenennen nur in PC-DMIS, danach als neue Revision hochladen.
- Health-Check (Ausbaustufe mit Automation, 6.1): Agent liest den Vorlagennamen aus dem offenen
  Programm und meldet, wenn `NAME.xlsx` oder `NAME.layout.xml` im Vorlagenverzeichnis fehlt –
  genau der Fall „Protokoll ohne Messwerte, ohne Fehlermeldung“. Später kann auch das MDS beim
  Upload den Namen prüfen, wenn der Programmtext mit hochgeladen wird.

**Ablage:** PC-DMIS nimmt Excel-Vorlagen nur aus seinem Vorlagenverzeichnis an
(PC-DMIS 2024.1: `C:\Users\Public\Documents\Hexagon\PC-DMIS\2024.1\ExcelFormReport\Templates`).
Der Pfad hängt an der Versionsnummer → in der Agent-ini, nicht fest im Code; bei einem
PC-DMIS-Update ini anpassen. Hexagon-Standardvorlagen im selben Ordner fasst der Agent nicht an –
er verwaltet nur Dateien, die er selbst abgelegt hat (Liste in `state.json`).

**`.layout.xml` – Verhalten PC-DMIS 2024.1** (getestet 14.10.2026):
- wird **nur** beim Speichern im ExcelFormReport-Dialog geschrieben, **nicht** beim Protokolllauf
  → Änderungserkennung auf beiden Dateien ist unkritisch; eine Änderung bedeutet wirklich
  „Vorlage bearbeitet“ → Eingang (5.3).
- fehlt sie beim Öffnen des Programms: Protokoll wird mit der Vorlage erzeugt, aber **ohne
  Messdaten** – und **ohne Fehlermeldung**; beim Protokolllauf wird sie nicht neu erzeugt.
- fehlt sie beim Öffnen des ExcelFormReport-Dialogs: Vorlage lädt, Feldzuordnung fehlt.
- ⇒ **Die `.layout.xml` ist Pflicht.** Ohne sie entsteht ein leeres Protokoll, das man leicht
  übersieht (Aerospace: Protokoll ohne Messwerte = Nachweis fehlt).

**Regeln daraus**
- **Upload im MDS:** Hat ein Programm eine Vorlage, müssen `.xlsx` **und** `.layout.xml` mit
  gleichem Basisnamen dabei sein – sonst **Fehler**, nicht Warnung. `.layout.xml` muss gültiges XML sein.
- **Bereitstellen:** erst die Vorlage (`.layout.xml`, dann `.xlsx`) ins Vorlagenverzeichnis, danach
  `.prg`/`.cad` – damit kein Programm geöffnet wird, solange das Layout fehlt.
- **Abschließen:** umgekehrt; nie die `.layout.xml` entfernen, solange die `.xlsx` noch liegt.
- **Gesundheitscheck:** liegt eine verwaltete `.xlsx` ohne `.layout.xml` im Vorlagenverzeichnis
  (z. B. von Hand gelöscht), sofort nachladen und im MDS als Warnung melden.
- Allgemein behandelt der Agent ein Messprogramm als **eine Dateigruppe** (`.prg` + `.cad` +
  Prüfzeichnung, ggf. `.xlsx` + `.layout.xml`) – nie eine Datei ohne die anderen.

### 4.3 Agent, Zustände, Transfers

```sql
CREATE TABLE agents (
  id           serial PRIMARY KEY,
  name         varchar(100) NOT NULL UNIQUE,    -- z. B. 'Mess-PC'
  machine_id   integer REFERENCES machines ON DELETE SET NULL,
  api_key_hash varchar(128) NOT NULL,           -- nur Hash speichern
  modules      jsonb NOT NULL DEFAULT '[]',     -- ['cmm_sync'] | ['topsolid'] …
  last_seen_at timestamp,
  agent_version varchar(20),
  is_active    boolean NOT NULL DEFAULT true
);

-- Bereitstellung = „diese Arbeit läuft gerade auf diesem Gerät“
CREATE TABLE agent_deployments (
  id            serial PRIMARY KEY,
  agent_id      integer NOT NULL REFERENCES agents,
  operation_id  integer NOT NULL REFERENCES operations,    -- Arbeitsgang (z. B. OP30 Messen)
  order_ref     varchar(100),                             -- Auftrag/Los, sobald es Aufträge gibt
  status        varchar(15) NOT NULL DEFAULT 'requested',
                -- 'requested' | 'active' | 'closing' | 'closed' | 'failed'
  requested_by  integer REFERENCES users,
  closed_by     integer REFERENCES users,
  close_reason  varchar(20),          -- 'manual' (später ggf. 'order_done' an der CNC)
  last_activity_at timestamp,         -- letzte Dateiänderung / Eingang / Bereitstellen
  remind_after  timestamp,            -- nächste Nachfrage „abschließen?“ (verschoben per „Weiter behalten“)
  created_at    timestamp NOT NULL DEFAULT now(),
  closed_at     timestamp
);
-- Mehrere Bereitstellungen je Gerät gleichzeitig erlaubt (Bauteile teils wochenlang in Arbeit).
-- je Gerät höchstens eine aktive Bereitstellung je Arbeitsgang
CREATE UNIQUE INDEX ON agent_deployments (agent_id, operation_id)
  WHERE status IN ('requested','active','closing');

-- Was liegt gerade auf dem Gerät? (vom Agent gemeldet)
CREATE TABLE agent_file_states (
  agent_id     integer REFERENCES agents ON DELETE CASCADE,
  local_path   varchar(500),
  program_id   integer REFERENCES programs ON DELETE SET NULL,
  expected_hash varchar(64),       -- was das MDS dort erwartet
  local_hash   varchar(64),        -- was wirklich dort liegt
  state        varchar(20),        -- 'current' | 'outdated' | 'modified' | 'run_saved' | 'missing' | 'unknown'
  reported_at  timestamp,
  PRIMARY KEY (agent_id, local_path)
);

CREATE TABLE program_transfers (
  id           serial PRIMARY KEY,
  agent_id     integer REFERENCES agents,
  deployment_id integer REFERENCES agent_deployments,
  program_id   integer REFERENCES programs,
  revision_id  integer REFERENCES program_revisions,
  direction    varchar(20) NOT NULL,   -- 'to_device' | 'from_device' | 'removed' | 'discarded' | 'discarded_run_save'
  file_hash    varchar(64),
  result       varchar(20) NOT NULL,   -- 'ok' | 'skipped_locked' | 'skipped_modified' | 'error'
  message      text,
  triggered_by integer REFERENCES users,
  created_at   timestamp NOT NULL DEFAULT now()
);

-- Eingang: lokal geänderte/neue Dateien, die ein Mensch übernehmen muss
CREATE TABLE program_inbox (
  id           serial PRIMARY KEY,
  agent_id     integer REFERENCES agents,
  deployment_id integer REFERENCES agent_deployments,  -- aus welcher Arbeit stammt die Änderung
  program_id   integer REFERENCES programs,  -- NULL = unbekanntes Programm (Erstimport)
  note         text,                          -- Änderungsnotiz vom Bediener (CNC) / Messtechniker
  files        jsonb NOT NULL,                -- [{filename, role, hash, size, path}]
  status       varchar(15) NOT NULL DEFAULT 'open',  -- 'open' | 'accepted' | 'rejected'
  resolved_revision_id integer REFERENCES program_revisions,
  resolved_by  integer REFERENCES users,
  created_at   timestamp NOT NULL DEFAULT now(),
  resolved_at  timestamp
);
```

### 4.4 `.prg` wird von PC-DMIS selbst gespeichert

**Beobachtung (19.10.2026):** PC-DMIS speichert das `.prg` **beim Start jedes Messlaufs** –
vermutlich wegen der Eingabefelder (Seriennummer usw.), die im Programm abgelegt werden.
Die `.cad` bleibt dabei unverändert. Ein reiner Hash-Vergleich des `.prg` kann deshalb
**nicht** unterscheiden zwischen
- **„nur gemessen“** (Inhalt des Programms unverändert, nur Laufdaten) und
- **„Programm bearbeitet“** (Elemente, Toleranzen, Ausrichtung … geändert).

Folgen für das Konzept:
- Das MDS **spiegelt das `.prg` nicht zurück, nur weil sich der Hash geändert hat** – sonst landet
  nach jeder Messung ein Eingang im MDS und jede neue Freigabe wäre „lokal geändert“ blockiert.
- `.prg` bekommt einen eigenen Zustand **`run_saved`** („seit Bereitstellung gespeichert – evtl. nur
  Messlauf“) statt `modified`. Für `.xlsx`/`.layout.xml` bleibt die strenge Hash-Logik
  (die werden nur beim bewussten Speichern im Dialog geschrieben).
- **Entscheidung trifft der Mensch**, nicht der Hash:
  - **Beim Abschließen:** Ist das `.prg` `run_saved`, fragt der Agent: „Wurde das Programm
    bearbeitet?“ → **Ja** = in den Eingang (mit Notiz) · **Nein, nur gemessen** = verwerfen
    (protokolliert als `discarded_run_save`, Datei wird nicht hochgeladen).
  - **Jederzeit:** Knopf „Änderung ans MDS melden“ im Agenten für bewusste Programmänderungen.
  - **Neue Freigabe während der Bereitstellung:** `run_saved` blockiert nicht – Nachfrage
    „Programm vor Ort bearbeitet? Sonst wird es durch Version 1.2.0 ersetzt.“
- **Ausbaustufe (optional, später):** Agent liest über die Automation-API den Programmtext
  (`EditWindowTextAll`), entfernt die Laufdaten (siehe Testergebnisse unten) und vergleicht den
  Hash dieses **bereinigten Textes** mit einer Basis → echte Erkennung „Programm inhaltlich
  geändert“, ohne Nachfrage. Die Basis entsteht beim **ersten Öffnen** nach der Bereitstellung
  (`OnOpenPartProgram`, solange der Datei-Hash noch dem freigegebenen Stand entspricht) – das
  MDS muss dafür selbst kein PC-DMIS haben.

**Testergebnisse 19.10.2026** (Testprogramm `D:\PCDMIS_Tests\test\test.PRG`, Skripte `PCDMIS_Tests`):
- **Messwerte stehen im Programm.** Der Programmtext vor und nach einem Messlauf unterscheidet sich
  in 328 von 1786 Zeilen – ausschließlich Laufdaten: `DATE=/TIME=`, Temperaturen
  (`PART TEMP`, `X/Y/Z MASSTAB`), Antworten der Eingabefelder (z. B. Seriennummer 27 → 28), Ist-Werte
  in `MESS/…` und `MESSPKT/…`, Formabweichungen (`EBENE16:0.004`), Maßzeilen (`M 5.500 5.505 …`)
  und die Summenzeile `TOTAL # OF MEAS / # OUT OF TOL / # OF HOURS`. Keine einzige Befehls- oder
  Nennwertänderung. → Der Datei-Hash ändert sich **nach jedem Lauf**, `run_saved` ist also der
  Normalfall, nicht die Ausnahme.
- **Dateigröße bleibt gleich** (692 224 Bytes vor und nach dem Lauf) – PC-DMIS schreibt in festen
  Blöcken. Größe taugt nicht als Änderungsmerkmal, nur Zeitstempel/Hash.
- **Speichern beim Laufstart bestätigt:** Zeitstempel des `.prg` springt wenige Sekunden nach dem
  Start; dabei wird das bisherige `.prg` zum `.PRG~` (dessen Zeitstempel = vorheriger `.prg`-Stand).
- **Manuelles Speichern nach dem Lauf ändert den Programmtext nicht** (Text identisch) – die
  Messwerte werden also schon während/nach dem Lauf im Speicher übernommen.
- `IsModified` blieb während des ganzen Tests `False` – PC-DMIS meldet Laufdaten nicht als
  „ungespeicherte Änderung“.
- Der Name der **Excel-Protokollvorlage steht im Programmtext**:
  `EXCEL_FORMULAR1=EXCELFORMREPORT/TEMPLATE=KUNDE_TEIL-0001, TYPE=EXCEL` (ohne Endung) → siehe 4.2.

**Prototyp Bereinigung (19.10.2026, an den echten Testdaten):** Entfernt/maskiert werden
`DATE=`-Zeile, Summenzeile, `MESS/`-Zeilen, der Ist-Vektor in `MESSPKT/`, Formwerte (`EBENE16:0.004,`),
`UNTERE/OBERE GRÖSSE`, Mess- und Abweichungsspalte der Maßzeilen, Temperaturwerte und die
Antworten der Eingabefelder. Ergebnis: vorher/nachher eines Messlaufs **0 Unterschiede**, 1593 von
1786 Zeilen bleiben für den Vergleich.

**Gegenprobe echte Änderung (19.10.2026):** Ebenheitstoleranz 0.005 → 0.055 geändert.
Vergleich mit dem Stand **vor dem Messlauf**: roh 330 Unterschiede, **bereinigt genau 1 Änderung**
(`SEGMENT_1,EBENHEIT,0.005` → `0.055`). Bereinigung trennt also sauber „nur gemessen“ (0) von
„bearbeitet“ (zeigt exakt die Änderung). Außerdem: `EditWindowTextAll` liefert Änderungen schon
**vor dem Speichern** (Text geändert = Text geändert+gespeichert) – der Agent sieht also den Stand
im Editor, nicht den auf der Platte.
→ Die Ausbaustufe ist damit **machbar und einfach**; Nebeneffekt: Das MDS kann im Eingang statt
„Datei geändert“ den **konkreten Unterschied** anzeigen („Ebenheit SEGMENT_1: 0.005 → 0.055“).

Folge für die Bereinigung (Ausbaustufe): Zeilenmuster für Laufdaten als Liste in der Agent-ini
(erweiterbar), bei `MESS/`/`MESSPKT/` nur den Ist-Anteil entfernen, Nennwerte behalten. Vor der
Umsetzung an weiteren echten Programmen gegenprüfen (siehe 10).

**Ausgabepfade im Programm** (geklärt 19.10.2026):
- `ZUWEISEN/V_PROTOKOLLPFAD=…` = Ziel des **PDF-Protokolls**,
  `RESULT FOLDER/…` = Ziel des **Excel-Protokolls**.
- Beide stehen **fest im Programm** und ändern sich nicht automatisch (auch nicht, wenn das
  Programm von D:\ statt vom Netzlaufwerk läuft).
- **Soll:** Beide zeigen auf **dasselbe** Messdaten-Verzeichnis des Bauteils auf dem Netzlaufwerk
  (z. B. `Z:\…\KD00000\TEIL-0001\02_Messdaten`). Im Testprogramm zeigte `RESULT FOLDER` versehentlich
  auf `D:\PCDMIS_Tests\test` – genau der Fehler, den eine Prüfung abfangen soll.
- Der Agent ändert Programminhalte **nie**. Prüfung (Ausbaustufe, über den Programmtext beim
  Öffnen bzw. später schon beim Upload im MDS) → **Warnung**, wenn
  - `V_PROTOKOLLPFAD` und `RESULT FOLDER` **verschieden** sind,
  - ein Ausgabepfad **ins Arbeitsverzeichnis** (D:\…) oder auf ein lokales Laufwerk zeigt
    (Protokolle würden beim Abschließen als `unknown` auftauchen bzw. nie im Archiv landen),
  - das Ziel **nicht erreichbar** ist (Netzlaufwerk weg) – besser vor als nach einem 13-Minuten-Lauf.
- Ergebnisdateien gehören **nicht** zur Dateigruppe des Programms und werden nie ins MDS
  versioniert (Messergebnisse ins MDS = Stufe 3, eigener Weg).

**Von PC-DMIS automatisch angelegte Nebendateien** (beobachtet 19.10.2026, neben dem `.prg`;
Bedeutung laut Hexagon-Support-Artikel „What are the .PRG~ and .PRG^ files“):

| Datei | Bedeutung |
|---|---|
| `NAME.PRG~` | Sicherung, angelegt **unmittelbar vor dem letzten Speichern** (Funktion *DocumentRecovery*) |
| `NAME.PRG^` | ältere Sicherung, angelegt **beim Laden des Programms in der vorigen Sitzung** |
| `NAME.MiniRoutines.xml` | XML mit Laufzeit (`EntireRoutine Time`), Standard-Mini-Routinen und selbst angelegte Mini-Routinen (`<MiniRoutine>`) und `MarkSets`; wird mit dem `.prg` geschrieben |
| `NAME.prg.corrupt` | entsteht nur bei **Wiederherstellung**: PC-DMIS benennt ein beschädigtes `.prg` so um und macht das `.PRG~` zum aktiven `.prg` |

**DocumentRecovery bleibt eingeschaltet** (PC-DMIS Settings Editor) – die Sicherungen sind während
langer Bereitstellungen ein sinnvolles Sicherheitsnetz. Der Agent rührt `.PRG~`/`.PRG^` deshalb
**während** der Bereitstellung nicht an, erst beim Abschließen.

Regeln:
- **Nebendateien** = Dateien mit dem Basisnamen eines verwalteten Programms und einem bekannten
  Muster (Liste in der Agent-ini, erweiterbar: `*.PRG~`, `*.PRG^`, `*.MiniRoutines.xml`).
- Sie werden **nicht versioniert, nicht hochgeladen, nicht in den Eingang** gemeldet, und der
  FileSystemWatcher ignoriert ihre Änderungen (sonst Rauschen bei jedem Lauf).
- **Beim Abschließen löscht der Agent sie mit** – sie gehören zum Programm dieser Bereitstellung.
  (Ausnahme zur Regel „nur löschen, was unverändert im MDS liegt“, weil sie nie im MDS liegen
  und PC-DMIS sie bei Bedarf neu anlegt.)
- Unbekannte Dateien, die **nicht** zu einem verwalteten Programm passen, bleiben weiterhin
  unangetastet und werden als `unknown` gemeldet.
- Groß-/Kleinschreibung der Endungen ignorieren (`.PRG` = `.prg`, `.CAD` = `.cad`).
- **Sonderfall `.prg.corrupt`** (Wiederherstellung durch PC-DMIS):
  - Agent meldet sofort **Warnung im MDS**: „TEIL-0001 OP30: Programm war beschädigt und wurde von
    PC-DMIS aus der Sicherung wiederhergestellt.“
  - Das wiederhergestellte `.prg` gilt als `run_saved` (Inhalt = letzter Stand vor dem Speichern,
    nicht zwingend die freigegebene Version) → Empfehlung im Hinweis: „Freigegebene Version neu
    bereitstellen“ (Knopf).
  - Die `.corrupt`-Datei wird **nicht** stillschweigend gelöscht: beim Abschließen mit in den Eingang
    (als Diagnose, nicht als Revision) oder bis zur Quittierung der Warnung liegen lassen.
- **`MiniRoutines.xml` – Regel nach Inhalt** (Beispiel 19.10.2026: nur Standard-Mini-Routinen
  „Gesamte Routine / Außer Toleranz / Auswahl“, `<MarkSets />` leer):
  ```xml
  <FeatureBasedMeasurement>
    <EntireRoutine Time="00:12:44" TimeUpdatable="True" />
    <DefaultMiniRoutines> … EntireRoutine / OOT / Selection … </DefaultMiniRoutines>
    <MarkSets />
  </FeatureBasedMeasurement>
  ```
  - **Getestet 19.10.2026:** Selbst angelegte Mini-Routinen stehen **nicht** unter `MarkSets`, sondern
    als eigene Elemente (`MarkSets` blieb leer):
    ```xml
    <MiniRoutine ID="MiniRoutine1" UID="1652773504" Time="00:00:00" TimeUpdatable="True">
      <Dimension ID="PM1" Marked="True" MarkDependencies="True" UID="11133" />
    </MiniRoutine>
    ```
  - Regel daher: **kein** `<MiniRoutine>`-Element **und** `MarkSets` leer → reine Nebendatei:
    ignorieren, beim Abschließen löschen.
  - Mindestens ein `<MiniRoutine>` **oder** `MarkSets` gefüllt → **nicht** löschen; als Teil der
    Dateigruppe behandeln (Rolle `other`, Änderung → Eingang), damit die Mini-Routinen versioniert sind.
    Beim Vergleich `Time`-Attribute ignorieren (ändern sich mit jedem Lauf).
  - Bonus: `EntireRoutine Time` = tatsächliche **Laufzeit** des Messprogramms → Agent meldet sie mit;
    MDS kann Messzeit je Programm anzeigen (Planung, Rüstblatt).

### 4.5 KMG als Maschine

- Maschinentyp **„Messmaschine“** anlegen (Seed per Migration).
- KMG als Maschine erfassen, optional Verknüpfung zum Messmittel (Kalibrierung bleibt dort):
  `machines.measuring_equipment_id`.
- Arbeitsgang „Messen“ (Operation-Typ) am Bauteil → Maschine = KMG → Messprogramme hängen
  daran wie NC-Programme.

### 4.6 Rechte (per Migration, nur `admin`)

`cmm_program.read`, `cmm_program.write`, `cmm_program.release` (oder bestehendes
`program.release` wiederverwenden – offen), `agent.manage`.

---

## 5. Abläufe

### 5.1 Bereitstellen (MDS → Mess-PC)

Auslöser: Im MDS (Messraum-Ansicht, später Auftrag scannen am Messraum-Terminal) oder im Agenten
(Bauteilsuche) wird ein Arbeitsgang **bereitgestellt** → `agent_deployments` mit Status `requested`.

1. Agent fragt alle *n* Sekunden `GET /api/agent/manifest` ab.
2. Manifest = Soll-Dateien für dieses Gerät: lokaler Zielpfad, Hash, Download-URL. Enthalten:
   - die **freigegebenen** Revisionen der Messprogramme aller *aktiven Bereitstellungen*, je mit
     allen Dateien der Gruppe (`.prg`, `.cad`, Prüfzeichnung → Programmordner;
     `.xlsx` + `.layout.xml` → Vorlagenverzeichnis)
3. Agent gleicht ab:
   - fehlt → herunterladen, Temp-Datei, umbenennen
   - veraltet (neue Freigabe) → siehe „Neue Freigabe während der Bereitstellung“
   - lokal geändert → **nicht** überschreiben, Zustand `modified` melden
     (beim `.prg`: Zustand `run_saved`, siehe 4.4 – blockiert nicht, sondern führt zur Nachfrage)
   - gesperrt (PC-DMIS hat die Datei offen) → später erneut, `skipped_locked`
4. Agent meldet Ergebnis (`POST /api/agent/report`) → Bereitstellung `active`,
   `agent_file_states`, `program_transfers`.

**Neue Freigabe während der Bereitstellung** (bei wochenlangen Bereitstellungen der Normalfall):
- Wird im MDS eine neue Revision freigegeben, während das Programm bereitgestellt ist, tauscht der
  Agent **nicht still** aus. Tray-Hinweis + Anzeige im MDS: „TEIL-0001 OP30: neue Version 1.2.0
  freigegeben (bereitgestellt: 1.1.0) – jetzt aktualisieren?“
- **Aktualisieren** → nur wenn die Datei nicht gesperrt und lokal unverändert ist; sonst erst
  PC-DMIS schließen bzw. lokale Änderung über den Eingang klären.
- Vorschlag: Freigebender kann im MDS „sofort auf Geräte verteilen“ ankreuzen (z. B. Korrektur eines
  Fehlers) → dann aktualisiert der Agent automatisch, sobald die Datei frei und unverändert ist.
- Grund: mitten in einer Serie die Programmversion zu wechseln, ohne dass es der Messtechniker
  merkt, wäre genau die Unklarheit, die das System beseitigen soll.

### 5.2 Abschließen (Arbeitsverzeichnis aufräumen)

**Abgeschlossen wird nur durch den User** – Knopf „Fertig“ im MDS oder im Agenten. Nie automatisch
(kein Leerlauf-Timeout, kein „nächstes Bauteil schließt das vorige“). Bereitstellung → `closing`.

**Nachfrage statt Automatik:** Gab es an einer Bereitstellung *X Tage keine Aktivität* (Standard 14,
einstellbar; gemessen ab `last_activity_at`, nicht ab Anlage – ein Bauteil darf wochenlang laufen),
fragt der Agent per Tray-Hinweis und das MDS in der Messraum-Ansicht:
„TEIL-0001 OP30 seit 14 Tagen ohne Änderung – abschließen?“
- **Fertig** → Abschließen wie unten
- **Weiter behalten** → `remind_after` + X Tage, erneute Nachfrage dann
- Ignorieren → Hinweis bleibt sichtbar, es passiert nichts

**Mehrere Bereitstellungen gleichzeitig:** Jedes Bauteil hat seinen eigenen Ordner, jedes Programm
seine eigene Vorlage; Abschließen betrifft nur die Dateien *dieser* Bereitstellung. Geteilte
Dateien gibt es nicht.

Agent je Datei der Bereitstellung:
- **unverändert** (Hash = MDS) → löschen, Transfer `removed`
- **geändert** → erst in den **Eingang** hochladen (5.3), nach erfolgreichem Upload löschen
- **`.prg` mit `run_saved`** → Nachfrage „bearbeitet oder nur gemessen?“ (4.4), danach Eingang oder verwerfen
- **gesperrt** → warten, später erneut; Bereitstellung bleibt `closing`, Hinweis im MDS
- **Nebendateien** von PC-DMIS (`.PRG~`, `.PRG^`, `.MiniRoutines.xml`, siehe 4.4) → mitlöschen
- Dateien, die der Agent nicht selbst gebracht hat und die keine Nebendateien sind → nicht anfassen;
  liegen im Arbeitsverzeichnis fremde Dateien (z. B. Kopie auf `D:\` abgelegt), meldet er sie als
  `unknown` → Hinweis im MDS

Danach Bereitstellung `closed`. Programmordner und Vorlagenverzeichnis enthalten von dieser Arbeit nichts mehr
(Hexagon-Standardvorlagen bleiben unberührt).
Den `_archiv\`-Ordner gibt es nicht: alte Stände liegen im MDS, nicht auf dem Gerät.

**Ablage auf dem Mess-PC (während einer Bereitstellung)**
```
D:\Messprogramme\
   TEIL-0001\
      OP30_Messen\
         TEIL-0001_OP30.prg
         TEIL-0001_OP30.cad
         TEIL-0001_OP30_Pruefzeichnung.pdf
         TEIL-0001_OP30.PRG~                 ┐ legt PC-DMIS selbst an (Nebendateien),
         TEIL-0001_OP30.PRG^                 │ nicht im MDS, beim Abschließen mitgelöscht
         TEIL-0001_OP30.MiniRoutines.xml     ┘
   .mds-agent\state.json        (lokaler Zustand: welche Dateien hat der Agent gebracht, Hashes)

C:\Users\Public\Documents\Hexagon\PC-DMIS\2024.1\ExcelFormReport\Templates\
   (Hexagon-Standardvorlagen – unberührt)
   KD00000_TEIL-0001_C.xlsx             gehört zu TEIL-0001 OP30, nur während der Bereitstellung
   KD00000_TEIL-0001_C.layout.xml       ┘
```

### 5.3 Änderung an der Maschine (Mess-PC → MDS)

1. FileSystemWatcher + Hash erkennt geänderte Dateien. `.xlsx`/`.layout.xml`/`.cad`: geändert = bearbeitet
   → Eingang. `.prg`: nur Zustand `run_saved`, **kein** automatischer Eingang (4.4) – Eingang erst nach
   „Änderung ans MDS melden“ oder Antwort „bearbeitet“ beim Abschließen. Nebendateien
   (`.PRG~`, `.PRG^`, `.MiniRoutines.xml`) werden ignoriert.
2. Agent wartet, bis die Datei nicht mehr gesperrt und einige Sekunden stabil ist.
3. Upload aller Dateien des Programms in den **Eingang** (`POST /api/agent/inbox`), optional mit
   Notiz aus dem Agent-Dialog.
4. Im MDS: Hinweis „lokal geändert“ am Programm → Benutzer prüft und entscheidet:
   - **Übernehmen:** Patch/Minor/Major + Änderungsnotiz → neue Revision (`draft`), Freigabe wie gewohnt
   - **Verwerfen:** mit Grund; wird protokolliert (`program_transfers.direction = 'discarded'`).
     Die Dateien bleiben im Eingang erhalten – manchmal war die verworfene Optimierung die gute.
5. Nach Freigabe und erneutem Bereitstellen kommt der neue Stand aufs Gerät.

### 5.4 Gleiches Prinzip an der CNC-Maschine (später)

Bezug: Roadmap „Maschinen-Terminal → NC-Programm Transfer“.

- **Rüsten** (Auftrag/Arbeitsgang gescannt) = Bereitstellen: nur die freigegebenen Programme dieses
  Arbeitsgangs kommen auf die Steuerung.
- **Abschließen** = unverändert → löschen; geändert → Bediener wählt **Hochladen** (mit Notiz, z. B.
  „Vorschub Schlichten +20 %“, landet im Eingang) oder **Verwerfen** (protokolliert).
- **Unterschiede zum Mess-PC**
  - Der Agent läuft **nicht** auf der Steuerung, sondern am Maschinen-Terminal oder zentral, und
    spricht die Steuerung über einen **Adapter je Steuerung** an: Heidenhain per Netzwerk
    (Freigabe/FTP), Siemens per Netzwerk, Mazatrol 640M prüfen – ggf. USB-Fallback (Roadmap).
  - **Nur eigene Dateien:** Werkzeugtabelle, Nullpunkttabelle, globale Unterprogramme/Zyklen bleiben
    unberührt.
  - **Mannlose Nachtfertigung / Zerobot:** wie am Mess-PC schließt nur der User ab (bzw. später
    das Auftragsende) – nie Schichtende oder Leerlauf, sonst räumt der Agent der Nachtbeladung die
    Programme weg.
- Datenmodell bleibt gleich (`agent_deployments`, `program_transfers`, `program_inbox`);
  neu ist nur der Steuerungs-Adapter im Agenten.

### 5.5 Erstimport vom Netzlaufwerk

Einmalig: Agent scannt den bisherigen Netzlaufwerk-Ordner (Pfad per ini) und meldet alle
Programme mit Begleitdateien in den Eingang (`program_id = NULL`) – **ohne** Nebendateien
(`.PRG~`, `.PRG^`, `.MiniRoutines.xml`). Im MDS eine
Zuordnungsansicht: Vorschlag Bauteil/Arbeitsgang anhand des Ordner-/Dateinamens, Benutzer
bestätigt → Programm 1.0.0 angelegt. Danach Netzlaufwerk nur noch lesend/Archiv.

---

## 6. MDS-Agent

- **Sprache:** C# / .NET (wie `ts-sn-generator`, `ts-tool-export` → später TopSolid-Module im
  selben Programm möglich).
- **Form:** Tray-Programm (Statussymbol, „Jetzt synchronisieren“, Hinweise) – optional später als
  Windows-Dienst. Tray zuerst, weil man Sperren/Hinweise sieht.
- **Konfiguration:** `MDS-Agent.ini` (im Repo nur `MDS-Agent.example.ini`):
  ```ini
  [MDS]
  Url=https://mds.local
  ApiKey=…                        ; nicht ins Repo
  [CmmSync]
  Aktiv=1
  Programmordner=D:\Messprogramme
  ; versionsabhängig – nach PC-DMIS-Update anpassen
  Vorlagenordner=C:\Users\Public\Documents\Hexagon\PC-DMIS\2024.1\ExcelFormReport\Templates
  Importordner=Z:\NC\MASCHINE\…   ; nur für Erstimport
  IntervallSek=30
  ; Abschließen nur durch den User; Nachfrage nach X Tagen ohne Aktivität (0 = nie fragen)
  NachfrageNachTagen=14
  ; von PC-DMIS selbst angelegte Nebendateien: ignorieren, beim Abschließen mitlöschen
  Nebendateien=*.PRG~;*.PRG^;*.MiniRoutines.xml
  [TopSolid]
  Aktiv=0
  ```
- **Module:** `CmmSync` (jetzt), `TopSolid` (CAM-Ausgabeordner überwachen, Seriennummern-
  Aufträge, Werkzeugexport – später), `NcTransfer` (Steuerungen – später).
- **Auth:** API-Key je Agent, im MDS nur als Hash; Endpoints unter `/api/agent/*` mit eigener
  Middleware (nicht JWT). Agent darf nur lesen, was im Manifest steht, und nur in den Eingang
  schreiben.
- **Ablage im Repo:** `tools/mds-agent/`.

### 6.1 PC-DMIS-Automation (optional, Ausbaustufe)

Grundsatz: Der Agent funktioniert **zuerst rein dateibasiert** (Abschnitte 4–5). Die Anbindung an
PC-DMIS über die Automation-Schnittstelle (COM, `PCDLRN.Application`, Objektbibliothek
„PCDLRN“) ist eine **zusätzliche** Schicht: Fällt sie aus oder ändert sich mit einem Update, läuft
der Dateiabgleich weiter. Der Agent **hört nur zu und liest** – er steuert PC-DMIS nicht
(kein Ausführen, kein Speichern, kein Öffnen).

Nützliche Teile der Objektbibliothek (laut Doku 2021.2/2023.2; für **2024.1 gegenprüfen**):

| Objekt / Ereignis | Nutzen im Konzept |
|---|---|
| `OnOpenPartProgram`, `OnClosePartProgram` | Wann ist welches bereitgestellte Programm offen → Sperren erklären, nicht während offener Sitzung austauschen |
| `OnStartExecution`, `OnEndExecution` | Messlauf-Beginn/-Ende sicher erkennen → `last_activity_at`, Laufprotokoll |
| `OnSavePartProgram` | Speichern **außerhalb** eines Messlaufs = bewusst gespeichert → Hinweis „Programm bearbeitet?“ schon zu diesem Zeitpunkt statt erst beim Abschließen (4.4). *Vorsicht: Auch Strg+S nach einem reinen Lauf ist „außerhalb“ – deshalb nur Hinweis, keine Entscheidung. Reihenfolge Speichern ↔ `OnStartExecution` noch per Ereignis-Test klären.* |
| `PartProgram.FullName` | Zuordnung Ereignis → bereitgestellte Datei |
| `PartProgram.IsModified` | ungespeicherte Änderungen im offenen Programm → vor Austausch/Abschließen warnen |
| `PartProgram.SerialNumber`, `GetVariableValue` | Seriennummer/Eingabefelder des Laufs → **Stufe 3**: welche Programmversion hat welche Seriennummer gemessen |
| `PartProgram.RoutineExecutionTimeManager` | Laufzeit (alternativ zu `MiniRoutines.xml`) |
| `PartProgram.ExportToXML`, `EditWindowTextAll` | Programminhalt als Text/XML → Grundlage für einen **Inhalts-Hash ohne Laufdaten** (4.4, Ausbaustufe), für den Merkmalsimport (Stufe 2) und zum Auslesen des Vorlagennamens (4.2). **Getestet 19.10.2026:** `EditWindowTextAll` liefert den kompletten Text (≈85 000 Zeichen), **enthält Ist-Werte und Laufdaten** → vor dem Hash bereinigen. `ExportToXML` noch nicht getestet (evtl. sauberer trennbar). |
| `ExecuteDialogVisible` | **Getestet: ungeeignet** als „Lauf aktiv“-Anzeige – blieb im Test durchgehend `True`, auch nach Laufende (Ausführungsdialog bleibt offen). Laufbeginn/-ende nur über die Ereignisse. |
| `OnReportPrintEnd` | Protokoll fertig → später Protokoll/PDF einsammeln |
| `OnClosingApplication` | Verbindung sauber lösen, wenn PC-DMIS beendet wird |

Vorsicht bei der Umsetzung:
- An die **laufende** PC-DMIS-Instanz anhängen, keine neue starten; ist PC-DMIS zu, wartet der Agent
  (kein automatischer Start).
- COM-Ereignisse kommen auf dem UI-Thread von PC-DMIS – im Agenten nur Daten übernehmen, Arbeit
  (Hash, Upload) asynchron erledigen, damit PC-DMIS nie wartet.
- Version der Objektbibliothek beim Start prüfen und melden; bei unbekannter Version Automation
  abschalten, Dateimodus weiter.
- **Spät gebundener Zugriff (IDispatch über den Namen).** Getestet mit PowerShell 5.1: Normaler
  Eigenschaftszugriff lieferte stumm `$null`, erst `InvokeMember` funktionierte. In C# daher
  entweder die Typbibliothek als Interop-Referenz einbinden oder konsequent `dynamic`/`InvokeMember`
  – und beim Start einen Selbsttest (`ActivePartProgram.FullName` lesbar?) mit klarer Meldung.
- `Major`/`Minor` am Application-Objekt gibt es in 2024.1 nicht (`DISP_E_UNKNOWNNAME`) → Version
  anders ermitteln (z. B. `VersionString` oder Dateiversion der `PCDLRN.exe`).
- Rechte: Agent und PC-DMIS müssen unter **gleichem Benutzer und gleicher Rechtestufe** laufen
  (beide ohne Administrator – getestet), sonst findet `GetActiveObject` die Instanz nicht.

Quellen: PC-DMIS Object Library – [ApplicationObjectEvents](https://docs.hexagonmi.com/pcdmis/2023.2/en/helpcenter/mergedprojects/automationobjects/PCDLRN_ApplicationObjectEvents_members.html),
[PartProgram](https://docs.hexagonmi.com/pcdmis/2021.2/en/helpcenter/mergedProjects/automationobjects/PCDLRN~PartProgram_members.html);
2024.1: [Hexagon Documentation Center – Automation Objects](https://nexus.hexagon.com/documentationcenter/en-US/bundle/pcdmis-2024.1-automationobjects/page/Introduction.html)

---

## 7. API (Entwurf)

| Methode | Pfad | Zweck |
|---|---|---|
| GET  | `/api/agent/manifest` | Soll-Dateien für dieses Gerät (aus aktiven Bereitstellungen) |
| POST | `/api/agent/deployments` | Bereitstellen aus dem Agenten (Bauteilsuche) |
| POST | `/api/agent/deployments/:id/close` | „Fertig“ im Agenten |
| GET  | `/api/agent/files/:fileId` | Datei herunterladen (nur wenn im Manifest) |
| POST | `/api/agent/report` | Ist-Zustand + Transfer-Ergebnisse melden |
| POST | `/api/agent/inbox` | geänderte/neue Dateien einliefern (multipart) |
| GET  | `/api/programs?kind=cmm` | Liste Messprogramme (UI) |
| GET  | `/api/programs/:id/files` | Dateien der aktuellen Revision |
| GET  | `/api/program-inbox` | offene Eingänge (UI) |
| POST | `/api/program-inbox/:id/accept` | als neue Revision / neues Programm übernehmen |
| POST | `/api/program-inbox/:id/reject` | verwerfen (mit Grund) |
| GET/POST | `/api/deployments` | Bereitstellungen anzeigen / anlegen (UI) |
| POST | `/api/deployments/:id/close` | Abschließen (UI) |
| CRUD | `/api/agents` | Agenten verwalten, API-Key erzeugen (einmalig anzeigen) |

---

## 8. Oberfläche

- **Eigener Menüpunkt „Messprogramme“** (Messraum-Sicht):
  - oben **„Auf dem Mess-PC“**: alle aktiven Bereitstellungen (mehrere, teils wochenlang) mit
    Dateistatus (bereit / lokal geändert / gesperrt / neue Version verfügbar), bereitgestellt seit,
    letzte Aktivität, Knopf „Fertig“; Nachfrage-Hinweis bei langer Inaktivität
  - darunter alle Messprogramme nach Bauteil: freigegebene Version, Knopf „Bereitstellen“,
    letzter Transfer, offene Eingänge als Badge
- **Agent (Tray)**: aktuelle Bereitstellung, „Bauteil bereitstellen…“, „Fertig“, Hinweise bei
  gesperrten oder fremden Dateien.
- **Arbeitsgang „Messen“** zeigt dieselben Programme wie heute die NC-Programme.
- **Programm-Upload:** Dateien per Drag & Drop; das MDS ordnet Rollen nach Endung zu, prüft
  Vorlage vollständig (`.xlsx` + `.layout.xml`) und Vorlagenname eindeutig. Nebendateien
  (`.PRG~`, `.PRG^`, `.MiniRoutines.xml`) werden beim Upload mit Hinweis aussortiert.
- **Einstellungen → Agenten**: Gerät anlegen, Key erzeugen, zuletzt gesehen, Version.
- Später ändert sich nur die Oberfläche, falls Messprogramme doch unter „NC-Programme“ landen.

---

## 9. Umsetzungsschritte

| # | Schritt | Ergebnis |
|---|---|---|
| 0 | **Binär-Fix Programm-Upload**: Binärdateien erkennen, `content`/Diff nur bei Text | `.prg` lässt sich hochladen, NC unverändert |
| 1 | Migration: `programs.kind`, `program_revision_files`, Maschinentyp „Messmaschine“, Rechte | Datenmodell steht |
| 2 | Backend: Upload mit mehreren Dateien, Download einzeln/als ZIP, `.http`-Tests | Messprogramme manuell im MDS pflegbar |
| 3 | Frontend: Menüpunkt „Messprogramme“ | **Nutzbar ohne Agent** (manuell hoch/runter) |
| 4 | `agents`, `agent_deployments`, Manifest-/Report-API, Agent v1: Bereitstellen | Mess-PC arbeitet lokal auf `D:\` |
| 5 | Abschließen + Eingang (unverändert löschen, geändert hochladen) | sauberes Arbeitsverzeichnis, Kreislauf geschlossen |
| 6 | Protokollvorlage als Teil der Programmgruppe (Vorlagenverzeichnis, Pflicht-Layout, Gesundheitscheck) | Protokolle zuverlässig mit Messwerten |
| 7 | Erstimport vom Netzlaufwerk | Altbestand übernommen, Netzlaufwerk nur noch Archiv |
| 8 | Agent-Modul NC-Transfer (Steuerungs-Adapter, Rüsten/Abschließen an der CNC) | siehe 5.4, Roadmap Maschinen-Terminal |
| 9 | Agent-Modul TopSolid | siehe Roadmap TopSolid |
| (opt.) | PC-DMIS-Automation im Agenten (6.1): Ereignisse, Laufprotokoll mit Seriennummer, Inhalts-Hash | weniger Nachfragen, Rückverfolgbarkeit Messlauf ↔ Programmversion |

Ab Schritt 3 ist schon Nutzen da; der Agent kommt danach, ohne dass sich das Datenmodell ändert.

---

## 10. Offene Punkte

- [x] Erreicht der Mess-PC den Pi? → **Ja**, MDS im Browser auf dem Mess-PC erreichbar (14.10.2026)
- [x] Pfad Vorlagenverzeichnis → `C:\Users\Public\Documents\Hexagon\PC-DMIS\2024.1\ExcelFormReport\Templates`
- [ ] Schreibrecht des Agenten im Vorlagenverzeichnis prüfen (`Public` ist normalerweise für alle
      Benutzer beschreibbar – beim ersten Test bestätigen)
- [x] Je Programm eine eigene Protokollvorlage, Name `KdNr_TeilNr_Rev.xlsx` / `.layout.xml` (14.10.2026)
- [x] Vorlagenname steht im `.prg` (`EXCELFORMREPORT/TEMPLATE=KUNDE_TEIL-0001`, ohne Endung) →
      MDS benennt Vorlagen nie um; Agent kann prüfen, ob die referenzierte Vorlage bereitliegt (19.10.2026)
- [ ] Namenskonvention gegen die Praxis abgleichen: im Test `KUNDE_TEIL-0001` (Kundenkürzel_Teilnummer,
      ohne Rev) statt `KdNr_TeilNr_Rev`
- [x] Excel-Protokollvorlage ist optional (nicht jedes Bauteil braucht Excel-Ausgabe) → Schalter je Programm (14.10.2026)
- [ ] **Zu durchdenken:** mehrere Messprogramme für dieselbe Teil-Revision (z. B. OP30 und OP50 auf
      dem KMG) – `KdNr_TeilNr_Rev` ist dann nicht eindeutig. Mögliche Lösung `KdNr_TeilNr_Rev_OP30`;
      betrifft ggf. auch die `.prg`-Namen. Bis zur Entscheidung: MDS lehnt doppelte Vorlagennamen ab.
- [ ] „Rev“ im Namen = Zeichnungsindex des Teils (nicht MDS-Programmversion)? Bei neuem Index:
      Vorlage in PC-DMIS unter neuem Namen speichern, damit auch die `.layout.xml` neu entsteht
- [x] Zu jeder Vorlage gehört eine `.layout.xml` (gleicher Basisname, von PC-DMIS angelegt) → Dateigruppe (14.10.2026)
- [x] `.layout.xml` wird nur beim Speichern im ExcelFormReport-Dialog geschrieben, nicht beim
      Protokolllauf (14.10.2026)
- [x] Fehlt die `.layout.xml`, wird sie nicht neu erzeugt; Protokoll entsteht ohne Messdaten und
      ohne Fehlermeldung → Pflichtdatei (14.10.2026)
- [ ] Nebenbefund für Stufe 3: Ein Protokoll ohne Messwerte sollte beim Einlesen der Ergebnisse
      ins MDS als Fehler auffallen.
- [x] Abschließen nur durch den User; nach einer gewissen Zeit Nachfrage (14.10.2026)
- [x] Mehrere Bereitstellungen gleichzeitig; ein Bauteil kann mehrere Wochen in Arbeit sein (14.10.2026)
- [ ] Neue Freigabe während einer laufenden Bereitstellung: automatisch austauschen oder erst nach
      Bestätigung am Mess-PC? (Vorschlag siehe 5.1 „Neue Freigabe während der Bereitstellung“)
- [ ] Nachfrage-Frist: 14 Tage ohne Aktivität passend?
- [ ] Übertragungswege der Steuerungen (Heidenhain, Siemens, Mazatrol 640M) – erst für Schritt 8
- [ ] Gehören noch weitere Dateien zu einem Programm (Tasterdateien sind global, eher nicht)?
- [x] `.prg` wird von PC-DMIS regelmäßig gespeichert, vermutlich bei jedem Lauf (19.10.2026) → 4.4
- [x] `.prg` wird **beim Laufstart** gespeichert (vermutlich wegen Eingabefeldern wie Seriennummer);
      `.cad` bleibt unverändert (19.10.2026)
- [x] PC-DMIS legt Nebendateien an: `.PRG~`, `.PRG^`, `.MiniRoutines.xml` (19.10.2026) → 4.4
- [x] Bedeutung `.PRG~` / `.PRG^` geklärt (Hexagon-Support, DocumentRecovery); Sonderfall
      `.prg.corrupt` bei Wiederherstellung → Warnung im MDS (19.10.2026)
- [x] `MiniRoutines.xml` enthält Laufzeit, Standard-Mini-Routinen und `MarkSets` (19.10.2026) →
      Regel nach Inhalt (eigene Mini-Routinen = Teil der Dateigruppe)
- [x] Selbst angelegte Mini-Routinen stehen als `<MiniRoutine>`-Elemente in der XML, **nicht** unter `MarkSets` → Regel in 4.4 angepasst (19.10.2026)
- [ ] Gibt es weitere Nebendateien (z. B. bei Protokolllauf, Abbruch, Absturz)? Liste in der ini ergänzen
- [x] Automation-Zugriff auf 2024.1 funktioniert (über `InvokeMember`), gleiche Rechtestufe nötig (19.10.2026)
- [x] `EditWindowTextAll` enthält Ist-Werte/Laufdaten; Datei-Hash ändert sich nach jedem Lauf,
      Dateigröße nicht; manuelles Speichern nach dem Lauf ändert den Text nicht (19.10.2026) → 4.4
- [x] `ExecuteDialogVisible` ist kein brauchbarer „Lauf aktiv“-Anzeiger (19.10.2026) → 6.1
- [ ] Ereignis-Test: Reihenfolge Speichern ↔ `OnStartExecution`/`OnEndExecution` (erst relevant
      für die Ausbaustufe)
- [x] Bereinigung getestet: reiner Lauf → 0 Unterschiede, Toleranzänderung → genau 1 (19.10.2026) → 4.4
- [ ] Bereinigungsmuster an weiteren Programmen prüfen (andere Elementtypen, Scans, Schleifen,
      Variablen-Zuweisungen mit Laufwerten); `ExportToXML` als Alternative ansehen
- [x] `V_PROTOKOLLPFAD` = PDF, `RESULT FOLDER` = Excel; beide fest im Programm, sollen auf dasselbe
      Messdaten-Verzeichnis zeigen → Pfad-Prüfung mit Warnung (4.4) (19.10.2026)
- [ ] Freigaberecht: eigenes `cmm_program.release` oder `program.release` mitbenutzen?
- [ ] Menüpunkt eigenständig oder unter „NC-Programme“ (Oberfläche, nicht Datenmodell)
- [ ] Agent als Tray-Programm genügt, oder von Anfang an Dienst (Mess-PC ohne Anmeldung)?
