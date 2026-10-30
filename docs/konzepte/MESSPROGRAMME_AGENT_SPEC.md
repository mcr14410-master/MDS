# Spec: MDS-Agent v1 – Messprogramme bereitstellen und abschließen (Schritt 4)

**Stand:** 30.10.2026 · abgestimmt, Umsetzung in kleinen PRs (Abschnitt 9)
**Bezug:** [MESSPROGRAMME_KONZEPT.md](MESSPROGRAMME_KONZEPT.md) (4.2–4.4, 5.1–5.2, 6, 7),
[MODULE_KONZEPT.md](MODULE_KONZEPT.md) 4, ROADMAP „Messmaschinen-Terminal“
**Verhältnis zum Konzept:** Das Konzept bleibt die Begründung. Wo diese Spec abweicht oder genauer
ist, gilt die Spec. SQL ist Entwurf für die Migrationen, Feldnamen sind verbindlich.

---

## 1. Ziel und Umfang

Ein Messtechniker klickt im MDS „Bereitstellen“. Kurz danach liegen auf dem Mess-PC:
- **Programmordner:** `.prg`, `.cad` und Prüfzeichnung, im Unterordner `Kalibrierung\` das Kalibrierprogramm,
- **Vorlagenverzeichnis:** `.xlsx` und `.layout.xml`.

Er misst wochenlang lokal. Wenn er auf „Fertig“ klickt, räumt der Agent alles wieder weg.

**In v1 enthalten**
- Freigegebene Version eines Programms festhalten (Vorarbeit, betrifft auch NC)
- Agenten im MDS verwalten: Gerät, API-Schlüssel, Module
- Bereitstellen, Version je Programm festgehalten, „Aktualisieren“ nur per Knopf
- Agent v1 (Tray, .NET Framework 4.8, Modul `cmm_sync`):
  - Dateien ablegen: Reihenfolge, Temp-Datei + Umbenennen, gesperrte Dateien
  - fremde Dateien gleichen Namens
  - Gesundheitscheck
  - Offline-Betrieb
- Abschließen **ohne Eingang**:
  - unverändert → löschen,
  - `.prg` gespeichert → Nachfrage „nur gemessen?“,
  - bearbeitet → bleibt liegen, bis es im MDS erledigt ist

**Nicht in v1** (Schritt 5 und später)
- Eingang (`program_inbox`), „Änderung ans MDS melden“
- Nachfrage nach X Tagen ohne Aktivität. `last_activity_at` wird aber schon erfasst
- Bereitstellen aus dem Agenten (Bauteilsuche), „sofort auf Geräte verteilen“
- PC-DMIS-Automation (Konzept 6.1), Vorlagenname aus dem `.prg` lesen
- Erstimport, NC-Transfer, TopSolid
- globales Modul-System (`requireModule`), siehe MODULE_KONZEPT

---

## 2. Entscheidungen (30.10.2026)

| # | Frage | Entscheidung |
|---|---|---|
| E1 | Welche Version ist freigegeben, solange eine neue in Arbeit ist? | **`programs.released_revision_id`**: wird beim Freigeben gesetzt, ein neuer Entwurf lässt ihn stehen |
| E2 | Umfang v1 | **Bereitstellen + Abschließen ohne Eingang** |
| E3 | Neue Freigabe während einer Bereitstellung | **Version wird je Bereitstellung festgehalten**, Hinweis „neue Version verfügbar“, Tausch nur per „Aktualisieren“ |
| E4 | Ablage am Mess-PC | **`<Programmordner>\<Teilenummer>\<Programmnummer>\`**, darin `Kalibrierung\` (wie im ZIP) |
| E5 | Auslöser | **Nur im MDS** (Browser am Mess-PC). Der Agent zeigt an, synchronisiert und bietet „Fertig“ |
| E6 | Form | **Tray-Programm, .NET Framework 4.8** (wie `ts-sn-generator`), Autostart über den Autostart-Ordner |
| E7 | Rechte | **`agent.manage`** (Geräte, Schlüssel, Module) und **`program.deploy`** (Bereitstellen, Aktualisieren, Abschließen, Verwerfen). Per Migration nur für `admin` |
| E8 | Fremde Datei gleichen Namens am Ziel | **Gleicher Hash → übernehmen** (gilt danach als verwaltet). **Anderer Hash → nicht anfassen**, Programm wird nicht bereitgestellt, Warnung |
| E9 | Wo liegt der Agent-Code? | **Eigenes privates Repo [`mds-agent`](https://github.com/mcr14410-master/mds-agent)** wie beim Time-Terminal: andere Plattform, eigener Release-Takt, eigene Tags (`vX.Y.Z`) und GitHub-Releases. Vereinbart am 30.10.2026 |

Ohne Rückfrage festgelegt, weil nur Technik:
- Alle neuen Zeitspalten sind `timestamptz`.
- Der API-Schlüssel wird nur als SHA-256-Hash gespeichert und einmal angezeigt. Das Terminal speichert seinen Schlüssel im Klartext, dieses Muster übernehmen wir nicht.
- Header `X-Agent-Key`, analog `X-Terminal-Key`.
- Den Zielpfad rechnet das MDS aus, nicht der Agent.
- Das Kalibrier-`.prg` wird behandelt wie das Haupt-`.prg` (`run_saved`, siehe 6.3).

---

## 3. Abweichungen Konzept ↔ Code (Stand v2.17.0)

1. **Die freigegebene Version ist nicht greifbar.** Den Workflow-Status gibt es nur an `programs`. Eine neue Version setzt das Programm auf `draft` und `current_revision_id` auf den Entwurf. `program_revisions.workflow_state_id` wird nie aktualisiert. → E1, PR 4.1.
2. **Die Bereitstellung hält im Konzept keine Version fest.** Das Manifest liefert dort „die freigegebenen Revisionen“, eine neue Freigabe würde den Soll-Stand also still ändern. → E3, Tabelle `agent_deployment_programs`.
3. **Abschließen** steht erst in Schritt 5. Das `.prg` ist aber nach jedem Lauf `run_saved` (4.4), ohne Abschließen bleibt `D:\` also nie leer. → E2.
4. **Rolle `calibration`** fehlt im SQL-Entwurf 4.1/4.3, der Ablageort am Mess-PC war offen. → E4, Pfadregel 5.3.
5. **Zeitspalten** im Entwurf 4.3 sind `timestamp`. → `timestamptz` (CLAUDE.md).
6. **API-Schlüssel:** Das Terminal-Muster speichert Klartext, das Konzept will nur einen Hash. → Hash (4.1).
7. **Vorlagenname nach einem Rollback** (ROADMAP-Hinweis): Zwei Programme können dieselbe Vorlage aktiv haben. → Prüfung beim Bereitstellen (5.2).
8. **`agent_file_states.local_path`** wäre ein absoluter Pfad des Geräts und hängt damit an der ini. → `target` + relativer Pfad.
9. **Modul-System** gibt es noch nicht. → `agents.modules` jetzt, `requireModule('agent')` mit dem Modul-Grundgerüst.
10. **Caddy spricht nur HTTP.** Schlüssel und Logins gehen im LAN im Klartext. Eigenes Thema, nicht Teil von Schritt 4 (Abschnitt 10).

Nebenbefund, nicht Teil von Schritt 4: Ein Rollback übernimmt `program_revisions.workflow_state_id` der Zielversion. Weil dieser Wert immer `draft` ist, landet jedes Programm nach einem Rollback auf „Entwurf“, auch wenn die Zielversion freigegeben war. Mit `released_revision_id` ließe sich das korrigieren (Rollback auf die freigegebene Version bleibt freigegeben). Das wäre ein eigener Fix.

---

## 4. Datenmodell

### 4.1 Freigabe-Zeiger (PR 4.1)

```sql
ALTER TABLE programs ADD COLUMN released_revision_id INTEGER
  REFERENCES program_revisions(id) ON DELETE SET NULL;

-- Bestand: freigegebene Programme zeigen auf ihre aktuelle Version
UPDATE programs SET released_revision_id = current_revision_id
 WHERE workflow_state_id = (SELECT id FROM workflow_states WHERE name = 'released');
```

- **Wechsel nach `released`** (`workflowController`, nur `entityType = 'program'`) → `released_revision_id = current_revision_id` in derselben Transaktion.
- **Neue Version** (NC und Messprogramm) lässt den Zeiger stehen.
- **Rollback** ändert ihn nicht.
- **`archived`** lässt ihn stehen (Historie). Bereitstellbar ist ein Programm aber nur, wenn es nicht archiviert ist.
- **Anzeige:** In den Programmlisten und der Dateiliste steht neben der aktuellen Version „freigegeben: 1.1.0“, sobald beide verschieden sind.
- Vor dem Merge per Prüfabfrage auf rpi01 belegen: Anzahl Programme je Status, freigegebene ohne `current_revision_id`. Programme, die heute auf Entwurf stehen und früher freigegeben waren, lassen sich nicht rekonstruieren und brauchen eine neue Freigabe.

### 4.2 Agent-Schema (PR 4.2)

```sql
CREATE TABLE agents (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(100) NOT NULL UNIQUE,            -- z. B. 'Mess-PC'
  machine_id     INTEGER REFERENCES machines(id) ON DELETE SET NULL,
  api_key_hash   CHAR(64) NOT NULL UNIQUE,                -- SHA-256 (hex) des Schlüssels
  api_key_prefix VARCHAR(16) NOT NULL,                    -- Anzeige „mdsa_3f9c…“
  modules        JSONB NOT NULL DEFAULT '[]',             -- ['cmm_sync'], später 'topsolid', 'nc_transfer'
  poll_interval_sec INTEGER NOT NULL DEFAULT 30 CHECK (poll_interval_sec BETWEEN 5 AND 3600),
  last_seen_at   TIMESTAMPTZ,
  last_ip        VARCHAR(45),
  agent_version  VARCHAR(20),
  last_warnings  JSONB NOT NULL DEFAULT '[]',             -- letzte Meldungen des Agenten (Selbsttest, Konflikte)
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bereitstellung = „diese Arbeit läuft gerade auf diesem Gerät“
CREATE TABLE agent_deployments (
  id               SERIAL PRIMARY KEY,
  agent_id         INTEGER NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
  operation_id     INTEGER NOT NULL REFERENCES operations(id) ON DELETE CASCADE, -- wie programs
  order_ref        VARCHAR(100),                          -- sobald es Aufträge gibt
  status           VARCHAR(15) NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'active', 'closing', 'closed')),
  requested_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  close_requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL, -- NULL + closing = „Fertig“ im Agenten
  close_reason     VARCHAR(20),                           -- 'manual'
  discard_local_by INTEGER REFERENCES users(id) ON DELETE SET NULL,   -- „Lokale Dateien verwerfen“ (6.4)
  discard_local_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,                           -- Bereitstellen, Lauf (Hash-Wechsel), Aktualisieren
  remind_after     TIMESTAMPTZ,                           -- Schritt 5
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at     TIMESTAMPTZ,
  close_requested_at TIMESTAMPTZ,
  closed_at        TIMESTAMPTZ
);
CREATE UNIQUE INDEX agent_deployments_open_key
  ON agent_deployments (agent_id, operation_id) WHERE status IN ('requested', 'active', 'closing');

-- Festgehaltene Version je Programm der Bereitstellung (E3)
CREATE TABLE agent_deployment_programs (
  deployment_id  INTEGER NOT NULL REFERENCES agent_deployments(id) ON DELETE CASCADE,
  program_id     INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  revision_id    INTEGER NOT NULL REFERENCES program_revisions(id) ON DELETE CASCADE,
  local_dir      VARCHAR(255) NOT NULL,                   -- relativ, z. B. TEIL-0001\KD00000-00004-M1
  updated_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (deployment_id, program_id)
);

-- Ist-Zustand auf dem Gerät (vom Agenten gemeldet, je Bericht ersetzt)
CREATE TABLE agent_file_states (
  agent_id       INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  target         VARCHAR(20) NOT NULL CHECK (target IN ('program_dir', 'template_dir')),
  rel_path       VARCHAR(500) NOT NULL,                   -- relativ zum Ordner aus der ini
  deployment_id  INTEGER REFERENCES agent_deployments(id) ON DELETE CASCADE,
  file_id        INTEGER REFERENCES program_revision_files(id) ON DELETE SET NULL,  -- NULL = Nebendatei/fremd
  expected_hash  VARCHAR(64),
  local_hash     VARCHAR(64),
  state          VARCHAR(20) NOT NULL CHECK (state IN
    ('current', 'pending', 'locked', 'run_saved', 'modified', 'missing', 'conflict', 'corrupt', 'unknown')),
  message        TEXT,
  reported_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (agent_id, target, rel_path)
);

-- Protokoll jeder Dateibewegung (Audit-Trail), Texte als Schnappschuss
CREATE TABLE program_transfers (
  id             SERIAL PRIMARY KEY,
  client_id      UUID NOT NULL UNIQUE,                    -- vom Agenten, macht Wiederholungen harmlos
  agent_id       INTEGER NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
  deployment_id  INTEGER REFERENCES agent_deployments(id) ON DELETE SET NULL,
  program_id     INTEGER REFERENCES programs(id) ON DELETE SET NULL,
  revision_id    INTEGER REFERENCES program_revisions(id) ON DELETE SET NULL,
  file_id        INTEGER REFERENCES program_revision_files(id) ON DELETE SET NULL,
  program_number VARCHAR(100),                            -- Schnappschuss
  version_string VARCHAR(20),                             -- Schnappschuss
  filename       VARCHAR(255) NOT NULL,
  direction      VARCHAR(20) NOT NULL CHECK (direction IN
    ('to_device', 'adopted', 'removed', 'discarded_run_save', 'discarded', 'kept_modified')),
  result         VARCHAR(20) NOT NULL CHECK (result IN ('ok', 'skipped_locked', 'skipped_conflict', 'error')),
  file_hash      VARCHAR(64),
  message        TEXT,
  triggered_by   INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Auslöser im MDS, NULL = am Gerät
  occurred_at    TIMESTAMPTZ NOT NULL,                    -- Zeitpunkt am Gerät
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX program_transfers_deployment_idx ON program_transfers (deployment_id);
CREATE INDEX program_transfers_program_idx ON program_transfers (program_id);
```

Rechte in derselben Migration: `agent.manage` und `program.deploy` mit `ON CONFLICT (name) DO NOTHING`, Beschreibung, Kategorie, nur für `admin`. Dev-Standardrechte stehen in `devRoleDefaults.js`.

**Löschregeln**
- Ein Programm oder Arbeitsgang mit offener Bereitstellung lässt sich nicht löschen (409, Prüfung im Controller).
- Abgeschlossene Bereitstellungen blockieren nichts: Wird ein Arbeitsgang gelöscht, verschwinden seine Bereitstellungen per CASCADE wie seine Programme. Das Protokoll behält seine Schnappschüsse.
- Agenten werden nie gelöscht, nur deaktiviert. Ein deaktivierter Schlüssel → 401.

`program_inbox` kommt erst in Schritt 5.

---

## 5. MDS-Seite

### 5.1 Agenten verwalten (`agent.manage`, Lesen für alle Angemeldeten)

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/agents?active=true` | Liste: Name, Maschine, Module, zuletzt gesehen, Version, aktiv, offene Bereitstellungen, letzte Warnungen. Auch ohne `agent.manage` lesbar (Gerätewahl beim Bereitstellen), Hash wird nie ausgeliefert |
| GET | `/api/agents/:id` | Detail |
| GET | `/api/agents/modules` | bekannte Agent-Module (Haken in der Oberfläche) |
| POST | `/api/agents` | anlegen → Antwort enthält den **Schlüssel einmalig** |
| PUT | `/api/agents/:id` | Name, Maschine, Module, Intervall, aktiv – nur übergebene Felder, `machine_id: null` leert |
| POST | `/api/agents/:id/regenerate-key` | neuer Schlüssel (einmalig angezeigt), der alte gilt sofort nicht mehr |

- Schlüssel: `mdsa_` + 32 Zufallsbytes (base64url). Gespeichert werden `sha256(schlüssel)` und die ersten 12 Zeichen zur Anzeige.
- Module: In v1 ist nur `cmm_sync` bekannt (Liste im Code mit Name und Beschreibung). Unbekannte Schlüssel → 400.

### 5.2 Bereitstellungen (`program.deploy`, Lesen für alle Angemeldeten)

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/deployments?status=open\|closed&agent_id=` | Liste mit Programmen, festgehaltener Version, neuerer Freigabe, Dateizuständen |
| GET | `/api/deployments/:id` | Detail mit Dateien und Protokoll (`program_transfers`) |
| POST | `/api/deployments` | `{ agent_id, operation_id, program_ids? }` → `requested` |
| POST | `/api/deployments/:id/programs/:programId/update` | auf die aktuell freigegebene Version umstellen (E3) |
| POST | `/api/deployments/:id/close` | „Fertig“ → `closing` |
| POST | `/api/deployments/:id/discard-local` | bearbeitete Dateien verwerfen (6.4), Bestätigung im Dialog |

**Prüfungen beim Bereitstellen** (alle Fehler gesammelt, 400/409 mit `details`):
- Der Agent ist aktiv und hat das Modul `cmm_sync`.
- Für Agent und Arbeitsgang gibt es noch keine offene Bereitstellung. Sonst 409 mit Hinweis auf die vorhandene.
- `program_ids` fehlt → alle Messprogramme (`kind = 'cmm'`) des Arbeitsgangs mit `released_revision_id`, die nicht archiviert sind. Programme ohne Freigabe werden im Ergebnis als „nicht freigegeben, nicht bereitgestellt“ genannt. Bleibt keins übrig → 400.
- **Vorlagenname eindeutig je Gerät:** Keine `report_xlsx` der festgehaltenen Versionen darf (ohne Groß-/Kleinschreibung) in einer anderen offenen Bereitstellung desselben Agenten vorkommen. Das fängt den Rollback-Fall ab.
- `local_dir` wird berechnet (5.3) und muss je Agent unter den offenen Bereitstellungen eindeutig sein.

**Aktualisieren:** Nur möglich, wenn `released_revision_id` neuer ist als die festgehaltene Version. Dabei werden `revision_id`, `updated_by` und `updated_at` neu gesetzt. Für den Vorlagennamen gilt dieselbe Prüfung. Den Tausch auf dem Gerät erledigt der Agent (6.2).

**Statuswechsel** (nur durch das MDS, ausgelöst durch Klicks oder Berichte):
- `requested → active`: Der erste Bericht meldet alle Dateien der Bereitstellung `current` oder `run_saved`.
- `active/requested → closing`: „Fertig“ im MDS oder Agenten. `requested → closing` ist erlaubt, damit ein Fehlgriff verschwindet, solange der Agent noch nichts abgelegt hat.
- `closing → closed`: Der Agent meldet `closed: true` für die Bereitstellung, also keine verwaltete Datei mehr auf dem Gerät.
- Ein `failed` gibt es nicht. Konflikte und Fehler stehen je Datei in `agent_file_states`. Die Bereitstellung bleibt `requested`, bis sie gelöst oder abgeschlossen ist.

### 5.3 Zielpfade (eine Funktion für ZIP und Agent)

In `cmmProgramFiles.js` kommt die reine Funktion `deviceLocation({ role, target, filename }, localDir)`. Der ZIP-Download nutzt sie ebenfalls, damit ZIP und Gerät nie auseinanderlaufen:

| Rolle | `target` | `rel_path` am Gerät | im ZIP |
|---|---|---|---|
| main, cad, drawing, other | program_dir | `<local_dir>\<filename>` | `<filename>` |
| calibration | program_dir | `<local_dir>\Kalibrierung\<filename>` | `Kalibrierung/<filename>` |
| report_xlsx, report_layout | template_dir | `<filename>` (direkt im Vorlagenverzeichnis) | `PC-DMIS-Vorlagen/<filename>` |

- `local_dir` = `<Teilenummer>\<Programmnummer>`. Für Windows bereinigt:
  - `<>:"/\|?*` und Steuerzeichen werden zu `_`,
  - Punkte und Leerzeichen am Ende fallen weg,
  - reservierte Namen (`CON`, `NUL`, `COM1` …) bekommen ein `_` angehängt,
  - jeder Teil ist höchstens 80 Zeichen lang.
- Ohne Teilenummer: `_ohne-Teil\<Programmnummer>`.
- Dateinamen bleiben unverändert (PC-DMIS findet `.cad` und Vorlage über den Namen). Sie sind beim Upload schon geprüft.
- Unit-Tests: Sonderzeichen, reservierte Namen, Umlaute, Kalibrierung, Vorlage.

### 5.4 Agent-API (`/api/agent/*`, Header `X-Agent-Key`, kein JWT)

Middleware `authenticateAgent`:
- `sha256(header)` → aktiver Agent → `req.agent`
- setzt `last_seen_at`, `last_ip` und `agent_version` aus `X-Agent-Version`, höchstens einmal je 30 s schreiben
- ohne Schlüssel, mit falschem oder deaktiviertem → 401, ohne Hinweis, welcher Fall vorliegt

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/agent/manifest` | Konfiguration + Soll-Stand aller offenen Bereitstellungen |
| GET | `/api/agent/files/:fileId` | Datei laden – nur wenn sie zu einer festgehaltenen Version einer offenen Bereitstellung dieses Agenten gehört, sonst 404 |
| POST | `/api/agent/report` | Ist-Zustand, Transfers, Warnungen |
| POST | `/api/agent/deployments/:id/close` | „Fertig“ im Tray (nur eigene Bereitstellung) |

**Manifest** (Beispiel, Platzhalter):
```json
{
  "config": { "agent_id": 3, "name": "Mess-PC", "modules": ["cmm_sync"],
              "poll_interval_sec": 30, "server_version": "2.18.0" },
  "deployments": [{
    "id": 17, "status": "active", "part_number": "TEIL-0001", "op_number": "OP30",
    "operation_name": "Messen", "requested_by": "M. Muster", "created_at": "2026-11-02T08:12:00+01:00",
    "discard_local": false,
    "programs": [{
      "program_id": 42, "program_number": "KD00000-00004-M1", "version": "1.1.0", "revision_id": 311,
      "newer_release": "1.2.0", "local_dir": "TEIL-0001\\KD00000-00004-M1",
      "files": [
        { "file_id": 901, "role": "main", "target": "program_dir",
          "rel_path": "TEIL-0001\\KD00000-00004-M1\\KD00000-00004-M1.prg",
          "hash": "…", "size": 692224, "url": "/api/agent/files/901" },
        { "file_id": 904, "role": "report_layout", "target": "template_dir",
          "rel_path": "KD00000-00004-M1.layout.xml", "hash": "…", "size": 5120, "url": "/api/agent/files/904" }
      ]
    }]
  }]
}
```
Abgeschlossene Bereitstellungen tauchen nicht auf. Für den Agenten heißt das: Alles, was er nach `state.json` verwaltet und was nicht mehr im Manifest steht, gehört zu einer Bereitstellung, die im MDS ohne ihn erledigt wurde. Er meldet das als Warnung und **löscht nichts** (6.5).

**Report** (idempotent über `client_id`):
```json
{
  "agent_version": "1.0.0",
  "self_test": { "program_dir_ok": true, "template_dir_ok": true, "template_dir_writable": true },
  "deployments": [{ "id": 17, "closed": false, "activity_at": "2026-11-03T10:41:00+01:00" }],
  "files": [{ "target": "program_dir", "rel_path": "TEIL-0001\\KD00000-00004-M1\\KD00000-00004-M1.prg",
              "deployment_id": 17, "file_id": 901, "local_hash": "…", "state": "run_saved", "message": null }],
  "transfers": [{ "client_id": "uuid", "deployment_id": 17, "file_id": 901, "filename": "KD00000-00004-M1.prg",
                  "direction": "to_device", "result": "ok", "file_hash": "…", "occurred_at": "…" }],
  "warnings": [{ "code": "conflict", "deployment_id": 17, "text": "KD00000-00004-M1.xlsx liegt schon im Vorlagenverzeichnis (anderer Inhalt)" }]
}
```
- `files` ist der **vollständige** Ist-Stand. Das MDS ersetzt alle `agent_file_states` des Agenten in einer Transaktion.
- Transfers mit bekannter `client_id` werden übersprungen. `program_id`, `revision_id` und die Schnappschüsse ergänzt das MDS aus `file_id`.
- `activity_at` setzt `last_activity_at`, wenn der Wert neuer ist.
- `closed: true` ist nur bei `closing` gültig und setzt `closed`, `closed_at` und `close_reason`.
- `warnings` landen in `agents.last_warnings` (ersetzt). Sie erscheinen in der Agentenliste und an der Bereitstellung.

### 5.5 Oberfläche

- **Administration → Agenten** (`agent.manage`):
  - Liste mit Status: grün = in den letzten 3 Intervallen gesehen, sonst grau mit „zuletzt gesehen“
  - Anlegen und Schlüssel neu erzeugen, jeweils mit Dialog „Schlüssel jetzt kopieren, er wird nicht wieder angezeigt“ und ini-Ausschnitt zum Kopieren
  - Module als Haken, Deaktivieren
- **Messprogramme → „Auf dem Mess-PC“** (oben auf der Seite, nur wenn Agenten mit `cmm_sync` existieren). Je offene Bereitstellung:
  - Teil, Arbeitsgang, bereitgestellt seit/von, letzte Aktivität, Status
  - je Programm: Version, Dateistatus (bereit / wird übertragen / gesperrt / nach Lauf gespeichert / bearbeitet / Konflikt) und „neue Version 1.2.0 verfügbar → Aktualisieren“
  - Knöpfe „Fertig“ und, solange bearbeitete Dateien liegen, „Lokale Dateien verwerfen“
  - aufklappbar das Protokoll
- **Bereitstellen:**
  - Knopf am Arbeitsgang (Messprogramme-Liste) und in der Messprogramm-Übersicht
  - Dialog mit Gerät (vorbelegt, wenn es nur eines gibt) und Programmen (Haken, nicht freigegebene ausgegraut mit Grund)
- **Freigabe-Zeiger:** „freigegeben: 1.1.0“ neben der aktuellen Version (PR 4.1).

---

## 6. Agent v1 (Repo `mds-agent`)

### 6.1 Aufbau

**Repo und Schnittstelle (E9):**
- Der Code liegt im privaten Repo `mcr14410-master/mds-agent`, mit eigener Version (SemVer), eigenem CHANGELOG und eigenen Tags `vX.Y.Z`.
- Jedes Release ist ein GitHub-Release mit einem ZIP aus `.exe` und `MDS-Agent.example.ini`. Gebaut wird auf einem Windows-Rechner oder per GitHub Actions (Windows-Runner).
- **Die Agent-API beschreibt nur diese Spec im MDS-Repo** (5.4). Das Agent-Repo verlinkt darauf und beschreibt sie nicht ein zweites Mal.
- Das MDS ändert die Agent-API nur ergänzend (neue Felder, neue Endpunkte). Der Agent ignoriert Felder, die er nicht kennt. Wird ein Bruch doch einmal nötig, prüft das MDS `X-Agent-Version` und antwortet mit 426 „Agent zu alt“, die Agentenliste zeigt das an.
- Wer im MDS eine Agent-Funktion ändert, nennt im PR die nötige Agent-Version. Wer im Agenten etwas ändert, nennt die nötige MDS-Version.


- .NET Framework 4.8, WinForms-Tray (`NotifyIcon`), eine `.exe` mit `MDS-Agent.ini` daneben. Im Repo liegt nur `MDS-Agent.example.ini`. Die Regeln aus dem MDS gelten auch hier, obwohl das Repo privat ist: keine Kundendaten, keine TopSolid-DLLs, Platzhalter in Beispielen.
- Projekte:
  - `MdsAgent.Core`: Abgleich, Zustände, Pfadregeln, ohne UI und ohne Dateisystem-Zugriff hinter Schnittstellen, damit testbar
  - `MdsAgent.Tray`: UI, HTTP, Dateisystem
  - `MdsAgent.Core.Tests`
- Module als Schnittstelle `IAgentModule` (`Start`, `Sync(manifest)`, `Stop`). Geladen wird nur, was `config.modules` freischaltet. Das Tray-Menü zeigt die aktiven Module.
- Lokaler Zustand in `<Programmordner>\.mds-agent\`:
  - `state.json`: verwaltete Dateien mit `target`, `rel_path`, Soll-Hash, `deployment_id`, `file_id`, Zeitpunkt, ggf. „übernommen“
  - `outbox.json`: noch nicht gemeldete Transfers
  - `logs\`: Tageslog, 30 Tage
- Schreibt `state.json` immer als Temp-Datei + Umbenennen.

```ini
[MDS]
Url=http://mds.local
ApiKey=mdsa_…                    ; nicht ins Repo
[CmmSync]
Programmordner=D:\Messprogramme
; versionsabhängig – nach PC-DMIS-Update anpassen
Vorlagenordner=C:\Users\Public\Documents\Hexagon\PC-DMIS\2024.1\ExcelFormReport\Templates
Nebendateien=*.PRG~;*.PRG^;*.MiniRoutines.xml
```
Intervall und Module kommen aus dem MDS. In der ini stehen nur Pfade und der Schlüssel (MODULE_KONZEPT 4).

**Selbsttest beim Start und bei jedem 10. Abgleich**
- Ordner vorhanden?
- Vorlagenverzeichnis beschreibbar? (Testdatei anlegen und löschen, erledigt den offenen Punkt aus Konzept 10)
- MDS erreichbar? Schlüssel gültig?
- Ist `cmm_sync` freigeschaltet, aber die ini-Sektion fehlt → rotes Symbol + Warnung an das MDS.

### 6.2 Abgleich (alle `poll_interval_sec` und bei „Jetzt synchronisieren“)

Für jede Bereitstellung im Manifest und darin für jedes Programm, immer als **Dateigruppe**:

1. **Pfade prüfen.** `rel_path` muss relativ sein, darf kein `..` und kein Laufwerk enthalten und muss nach dem Auflösen im jeweiligen Ordner liegen. Sonst Programm überspringen und Warnung.
2. **Ist-Stand je Soll-Datei:**
   - fehlt → `pending`
   - Hash = Soll → `current`
   - verwaltet (in `state.json`) und Hash ≠ Soll:
     - `.prg` (main und calibration) → `run_saved`
     - sonst → `modified`
   - nicht verwaltet und Hash = Soll → **übernehmen** (E8, Transfer `adopted`)
   - nicht verwaltet und Hash ≠ Soll → `conflict`
   - Datei ist zum Lesen gesperrt → `locked`
3. **Konflikt in der Gruppe** → nichts von diesem Programm ablegen (keine halben Gruppen), Warnung. Danach wird nicht neu geladen, bis die fremde Datei weg ist.
4. **Ablegen**, wenn Dateien `pending` sind und kein Konflikt besteht:
   - alle fehlenden Dateien laden, nach `<Zielordner>\.<name>.mds-tmp` im **Zielordner** (gleiches Laufwerk, das Umbenennen ist atomar), Hash prüfen
   - Reihenfolge: `.layout.xml` → `.xlsx` → `.cad`, Prüfzeichnung, `other`, Kalibrierprogramm → `.prg` zuletzt. So ist kein Programm öffnungsbereit, bevor Layout und CAD liegen.
   - danach umbenennen und in `state.json` eintragen, Transfer `to_device`
5. **Neue Soll-Version** (nach „Aktualisieren“ hat eine verwaltete Datei einen anderen Soll-Hash, als `state.json` kennt):
   - Liegt die Datei unverändert auf dem alten Soll-Stand → wie Ablegen (in Reihenfolge ersetzen).
   - `.prg` nach dem Lauf gespeichert → Nachfrage im Tray-Dialog: „KD00000-00004-M1: Programm vor Ort bearbeitet? Sonst wird es durch Version 1.2.0 ersetzt.“
     - [Nur gemessen – ersetzen] → ersetzen, Transfer `discarded_run_save` für den alten Stand
     - [Bearbeitet – behalten] → `modified`, nicht ersetzen. Im MDS steht dann „Aktualisieren blockiert: lokal bearbeitet“ mit Weg wie 6.4.
   - Andere Datei bearbeitet → `modified`, nicht ersetzen.
   - Datei, die in der neuen Version weggefallen ist → löschen, wenn unverändert, sonst `modified`.
6. **Gesundheitscheck:** Fehlt eine verwaltete Datei, die zuvor `current` war (z. B. `.layout.xml` von Hand gelöscht) → sofort neu laden. Das MDS bekommt eine Warnung „… fehlte und wurde nachgeladen“.
7. **Aktivität:** Ändert sich der Hash eines `.prg` seit dem letzten Abgleich → `activity_at = jetzt`.
8. **Bericht** an das MDS. Läuft er ins Leere, bleiben die Transfers in `outbox.json` und gehen beim nächsten Mal mit.

**Gesperrte Dateien:** Nie anfassen, Transfer `skipped_locked` (nur beim ersten Mal je Datei), beim nächsten Abgleich erneut versuchen. Gilt für Ablegen, Ersetzen und Löschen.

**Offline:** Ohne MDS arbeitet der Agent mit den vorhandenen Dateien weiter, das Symbol wird gelb. Es wird nichts gelöscht und nichts heruntergeladen. Genau dafür liegen die Dateien lokal.

### 6.3 Nebendateien und Sonderfälle

- **Nebendateien** (Muster aus der ini, Groß-/Kleinschreibung egal) mit dem Basisnamen eines verwalteten `.prg`:
  - Sie werden nicht gemeldet, nicht hochgeladen und nicht als `unknown` geführt.
  - Beim Abschließen werden sie mitgelöscht.
- **`.MiniRoutines.xml`** wird nach Inhalt beurteilt (Konzept 4.4, gleiche Regel wie `hasCustomMiniRoutines`):
  - nur Standardinhalt → Nebendatei
  - mit eigenen Mini-Routinen und nicht Teil der Gruppe → `modified` (neue Mini-Routinen sind eine Programmänderung)
- **`.prg.corrupt`** → Zustand `corrupt`. Die Datei wird nie gelöscht, das MDS bekommt eine Warnung „Programm war beschädigt und wurde von PC-DMIS aus der Sicherung wiederhergestellt“. Den Verbleib klärt Schritt 5 (Eingang). Bis dahin bleibt die Bereitstellung beim Abschließen `closing`, wie bei „bearbeitet“.
- **Fremde Dateien** im Programmordner einer Bereitstellung → `unknown`, Hinweis im MDS. Der Agent fasst sie nie an.
- **Kalibrier-`.prg`** wird wie das Hauptprogramm behandelt (`run_saved` statt `modified`). Am Mess-PC prüfen, ob PC-DMIS es beim Kalibrierlauf ebenfalls speichert (Abschnitt 10).

### 6.4 Abschließen (Status `closing`)

Je Programm der Bereitstellung, die Gruppe zusammen:

| Ist-Zustand | Aktion |
|---|---|
| `current` | löschen, Transfer `removed` |
| `run_saved` (`.prg`) | **einmal je Programm** ein Tray-Dialog „KD00000-00004-M1 (TEIL-0001 OP30): Wurde das Programm bearbeitet?“ → [Nur gemessen – löschen] = `discarded_run_save` und löschen · [Bearbeitet – behalten] = `kept_modified` |
| `modified`, `corrupt`, Mini-Routinen mit eigenem Inhalt | bleibt liegen, `kept_modified` |
| `locked` | später erneut, Hinweis im MDS „gesperrt – PC-DMIS schließen“ |
| Nebendateien | mitlöschen, sobald das zugehörige `.prg` gelöscht wird |
| `unknown` | nicht anfassen |

- **Reihenfolge beim Löschen:** `.prg` zuerst, danach die übrigen Programmdateien, zum Schluss im Vorlagenverzeichnis `.xlsx` vor `.layout.xml`. So liegt nie eine `.xlsx` ohne Layout herum.
- Leere Ordner (`Kalibrierung\`, `<Programmnummer>\`, `<Teilenummer>\`) entfernt der Agent. Ordner mit fremden Dateien bleiben stehen.
- **Bearbeitet behalten:** Die Bereitstellung bleibt `closing`. Im MDS steht dann:
  - „TEIL-0001 OP30: Programm vor Ort bearbeitet – liegt unter `D:\Messprogramme\TEIL-0001\KD00000-00004-M1\`. Als neue Version hochladen, danach ‚Lokale Dateien verwerfen‘.“
  - Bis Schritt 5 ist der Weg also: Dateien am Mess-PC wie heute hochladen (Upload-Bereiche), dann verwerfen.
- **„Lokale Dateien verwerfen“** (`program.deploy`, mit Bestätigung):
  - setzt `discard_local_by/at`, das Manifest liefert `discard_local: true`
  - Der Agent löscht dann auch `kept_modified` und `run_saved`, Transfer `discarded` mit `triggered_by`.
  - `corrupt` wird nur verworfen, wenn der Dialog das ausdrücklich mit anbietet (eigener Haken).
- Sind keine verwalteten Dateien der Bereitstellung mehr da → `closed: true` im Bericht.
- Die Antwort im Tray-Dialog gilt für diesen Abschluss. Bricht der Benutzer den Dialog ab, wird beim nächsten Abgleich erneut gefragt, höchstens einmal je 10 Minuten.

### 6.5 Unstimmigkeiten

- Datei in `state.json`, ihre Bereitstellung fehlt aber im Manifest (z. B. MDS-DB zurückgespielt) → **nichts löschen**. Warnung „verwaltete Dateien ohne offene Bereitstellung“ mit Liste. Im Tray: „Aufräumen…“ mit Rückfrage, dabei gelten dieselben Regeln wie 6.4.
- Manifest-Datei, deren Hash nicht zum Download passt → Download verwerfen, Fehler melden, nicht ablegen.
- Schlüssel ungültig (401) → rotes Symbol „Schlüssel ungültig – im MDS neu erzeugen“. Der Agent arbeitet mit den lokalen Dateien weiter.

### 6.6 Tray

- **Symbol:** grün = alles bereit · gelb = Hinweis (offline, gesperrt, neue Version verfügbar, wartet auf Antwort) · rot = Fehler (Konflikt, Schlüssel, Selbsttest).
- **Menü:**
  - je offene Bereitstellung „TEIL-0001 OP30 – KD00000-00004-M1 v1.1.0“ mit den Unterpunkten „Ordner öffnen“ und „Fertig“
  - „Jetzt synchronisieren“, „MDS öffnen“, „Protokoll öffnen“, „Über“ (Version, Module, Selbsttest), „Beenden“
- **Sprechblasen:** „bereitgestellt“, „neue Version verfügbar“, „abgeschlossen“, „Konflikt“.
- **Dialoge:** Nachfragen sind eigene, nicht modale Fenster, damit PC-DMIS nie blockiert wird.

---

## 7. Sicherheit

- Der Schlüssel ist nur als Hash in der DB. Er wird einmal angezeigt und steht in der ini auf dem Mess-PC. Die ini gehört nicht ins Repo und nicht in Backups außerhalb des Mess-PCs.
- Der Agent darf nur:
  - das eigene Manifest lesen,
  - Dateien aus seinen offenen Bereitstellungen laden,
  - den eigenen Zustand melden,
  - eigene Bereitstellungen schließen.
  
  Keine Programme anlegen, nichts freigeben, keine fremden Geräte.
- Pfade werden doppelt geprüft: Das MDS bereinigt (5.3), der Agent prüft vor jedem Schreiben und Löschen, ob das Ziel im konfigurierten Ordner liegt.
- Der Agent löscht nur Dateien aus `state.json` und Nebendateien eines verwalteten `.prg`. Hexagon-Standardvorlagen und fremde Dateien bleiben unberührt.
- Der Transport läuft heute über HTTP im LAN (Abschnitt 10).

---

## 8. Tests

- **Backend unit** (`npm test`): `deviceLocation`, Bereinigung von `local_dir`, Statuswechsel aus Berichten, Vorlagen-Konfliktprüfung.
- **`.http`** (`backend/http/agent.http`, `deployments.http`, 25+ Szenarien):
  - Schlüssel fehlt, falsch oder deaktiviert
  - Manifest leer bzw. mit Bereitstellung
  - Datei außerhalb des Manifests → 404
  - Report idempotent
  - `requested → active → closing → closed`
  - Aktualisieren
  - Vorlagenname doppelt → 409
  - Programm ohne Freigabe
  - Verwerfen
  - Löschen eines bereitgestellten Programms → 409
- **Integration** (`backend/tests/integration`): einen Agenten per Skript simulieren (Node). Ablauf Bereitstellen → Bericht → Fertig → Bericht `closed` auf einer Wegwerf-DB.
- **Agent:**
  - Unit-Tests in `MdsAgent.Core.Tests`: Abgleich-Tabelle 6.2/6.4 mit gespieltem Dateisystem
  - am Mess-PC nach Checkliste (9, PR 4.8)
  - gebaut wird auf einem Windows-Rechner (`dotnet build`), auf homepi gibt es kein .NET
- **Frontend:** Playwright-Skript gegen Dev-MDS. Agent anlegen (Schlüssel-Dialog), Bereitstellen, Anzeige der Zustände aus einem simulierten Bericht.

---

## 9. Umsetzungsplan (kleine PRs)

| PR | Inhalt | Ergebnis / Abnahme |
|---|---|---|
| **4.0** | diese Spec, Konzept und ROADMAP aktualisiert | abgestimmt (Doku) |
| **4.1** | Freigabe-Zeiger: Migration `programs.released_revision_id` mit Bestandsübernahme (Prüfabfrage rpi01 vorher), Setzen beim Freigeben, Anzeige „freigegeben: x.y.z“, `.http` | neue Entwurfsversion lässt die freigegebene stehen; NC unverändert nutzbar |
| **4.2** | Migration Agent-Schema (4.2) + Rechte `agent.manage`, `program.deploy` (nur admin) + `devRoleDefaults` | `migrate:up`/`down` auf Wegwerf-DB sauber |
| **4.3** | Backend Agentenverwaltung (`/api/agents`, Schlüssel, `authenticateAgent`) + `.http` | Schlüssel nur als Hash, 401-Fälle |
| **4.4** | Backend Bereitstellungen (`/api/deployments`, Prüfungen, `deviceLocation` + ZIP darauf umgestellt, Löschschutz) + Unit-Tests + `.http` | ZIP unverändert (Vergleich vorher/nachher), Prüfungen greifen |
| **4.5** | Backend Agent-API (Manifest, Dateien, Bericht, Fertig) + `.http` + Integrationstest mit simuliertem Agenten | kompletter Ablauf ohne echten Agenten |
| **4.6** | Frontend: Administration → Agenten, „Auf dem Mess-PC“, Bereitstellen-Dialog, Aktualisieren/Fertig/Verwerfen | Playwright-Durchlauf mit simuliertem Agenten |
| **4.7** | Agent Grundgerüst: Tray, ini, Selbsttest, Manifest, **Bereitstellen** inkl. Reihenfolge, Temp + Umbenennen, Übernahme/Konflikt, Sperre, Gesundheitscheck, Outbox, Core-Tests | am Mess-PC: Bereitstellen eines Testprogramms (Kopie, Platzhalter) |
| **4.8** | Agent **Abschließen** und **Aktualisieren**: `run_saved`-Dialoge, Nebendateien, `.corrupt`, Verwerfen, leere Ordner, Unstimmigkeiten | Checkliste am Mess-PC (unten) |
| Release | MDS: Minor-Release (Backend + Frontend). Agent: `v1.0.0` als GitHub-Release im Repo `mds-agent` | Pi aktualisiert, Agent installiert |

Die PRs 4.1 bis 4.6 liegen im MDS-Repo, bauen aufeinander auf und sind ohne Agent testbar. 4.7 und 4.8 liegen im Repo `mds-agent`. Sie brauchen einen Windows-Rechner oder GitHub Actions zum Bauen und den Mess-PC zum Testen.

**Checkliste am Mess-PC** (für 4.7/4.8, an einer Kopie, nie an Produktionsprogrammen):
1. Selbsttest grün, Schreibrecht im Vorlagenverzeichnis bestätigt
2. Bereitstellen: Ordner und Vorlage liegen da. PC-DMIS öffnet das Programm mit CAD, das Excel-Protokoll hat Messwerte.
3. Kalibrierprogramm aus `Kalibrierung\` öffnen und ausführen. Wird es dabei gespeichert? Dann gilt `run_saved`.
4. Messlauf → `run_saved` im MDS, `last_activity_at` steigt
5. Programm offen lassen + „Fertig“ → `locked`. PC-DMIS schließen → Nachfrage „nur gemessen“ → alles weg, Nebendateien inklusive
6. Zweiter Durchgang mit „Bearbeitet – behalten“ → MDS-Hinweis, von Hand hochladen, „Lokale Dateien verwerfen“ → `closed`
7. Neue Version freigeben während der Bereitstellung → Hinweis, Aktualisieren, Nachfrage
8. Netzwerk trennen während der Bereitstellung → Messen geht weiter, nach Wiederkehr Bericht nachgeholt
9. Vorlage von Hand gelöscht → nachgeladen + Warnung
10. Gleichnamige Vorlage mit anderem Inhalt vorher abgelegt → Konflikt, nichts abgelegt

---

## 10. Offene Punkte

- [ ] HTTPS für das MDS im LAN (Caddy mit interner CA oder eigenem Zertifikat). Betrifft Login, Terminal und Agent gleichermaßen. Eigenes Thema, nicht Voraussetzung für v1.
- [ ] Speichert PC-DMIS auch das Kalibrier-`.prg` beim Lauf? Am Mess-PC prüfen (Checkliste 3). Bis dahin gilt `run_saved` sicherheitshalber.
- [x] Versionierung und Verteilung des Agenten → eigenes privates Repo `mds-agent`, Tags `vX.Y.Z`, GitHub-Release mit ZIP (E9, 30.10.2026). Ob per GitHub Actions oder lokal gebaut wird, klären wir mit PR 4.7.
- [ ] Rollback-Nebenbefund (Abschnitt 3): als eigener Fix in „Offene Fixes“ aufnehmen.
- [ ] Mehrere Mess-PCs: Das Modell erlaubt sie. Die Oberfläche wählt das Gerät, sobald es mehr als eines gibt.
- Schritt 5: Eingang, „Änderung ans MDS melden“, Nachfrage-Frist (Konzept 5.2, Vorschlag 14 Tage, einstellbar je Agent).
