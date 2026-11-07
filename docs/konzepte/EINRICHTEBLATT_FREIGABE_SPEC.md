# Einrichteblatt: Freigabe und Stände – Spec

**Stand:** 07.11.2026 · **Voraussetzung:** PR #318 (Karte, Maschine aus dem Arbeitsgang)

## 1. Ziel

Einrichteblätter laufen durch dieselbe Freigabe wie Programme. Jede Freigabe sichert den Stand des Blatts, sodass man nach einer unpassenden Änderung darauf zurückgehen kann.

Heute ist der Status ein freies Feld ohne Prüfung und ohne Nachweis, und eine Änderung überschreibt den alten Stand endgültig.

**Entscheidungen des Nutzers (07.11.2026):** Freigabe wie bei den Programmen. Zurückgehen auf einen alten Stand muss möglich sein.

**Nicht Teil dieser Spec:** Kopieren beim Anlegen einer Variante (ROADMAP „Offene Fixes“), Vergleich zweier Stände, schlankeres Formular für Messarbeitsgänge.

## 2. Verhalten

### Freigabe

- Gleiche Status, Knöpfe und Schritte wie bei Programmen: Entwurf → In Prüfung → Geprüft → Freigegeben, dazu Abgelehnt und Archiviert.
- Ein neues Blatt beginnt immer als Entwurf. Das Status-Feld im Formular entfällt.
- Jeder Statuswechsel steht mit Name, Uhrzeit und Grund im Ablauf des Blatts.

### Stände

- **Ein Stand entsteht mit jeder Freigabe** und heißt „Stand 1“, „Stand 2“ usw. Er umfasst Formularfelder, Spannmittel, Vorrichtungen und Fotos samt Bildunterschrift.
- Zwischenstände im Entwurf werden nicht gesichert. So bleibt die Liste kurz.

### Änderung nach der Freigabe

- Jede inhaltliche Änderung außerhalb des Entwurfs setzt das Blatt auf Entwurf zurück, also Formular, Fotos, Spannmittel und Vorrichtungen. Der Ablauf hält das fest („Geändert nach Freigabe“).
- Solange ein freigegebener Stand existiert und das Blatt nicht freigegeben ist, zeigt es einen Hinweis: „In Bearbeitung. Letzter freigegebener Stand: Stand n vom …“ mit Link zur Ansicht dieses Stands. So sieht die Fertigung, dass sie gerade nicht den freigegebenen Inhalt vor sich hat.
- Archivierte Blätter sind schreibgeschützt.

### Zurückgehen

- Ein neuer Reiter „Stände“ listet alle Stände mit Datum und Freigeber, je mit „Ansehen“ und „Auf diesen Stand zurück“.
- Vor dem Zurückgehen sichert das MDS den aktuellen Inhalt automatisch als „Sicherung“, sofern er sich vom Ziel unterscheidet. Es geht also nichts verloren.
- Wie bei den Programmen gilt: Zurück auf den **zuletzt freigegebenen** Stand → das Blatt ist wieder Freigegeben. Zurück auf einen **älteren** Stand → Entwurf, er muss neu freigegeben werden.
- Beides steht im Ablauf.

### Löschen

- Ein Blatt mit mindestens einem Stand lässt sich nicht löschen, nur archivieren. Ein Blatt, das nie freigegeben war, bleibt löschbar.

## 3. Rechte

| Aktion | Recht |
|---|---|
| Statuswechsel, Zurückgehen | `program.release` (wie bei Programmen) |
| Anlegen, Ändern, Fotos, Spannmittel, Vorrichtungen, Löschen nie freigegebener Blätter | `setup_sheet.update` (neu) |

Das prüft künftig der Server, das Frontend blendet die Knöpfe passend aus. Lesen bleibt für alle Angemeldeten.

**Warum ein eigenes Recht (Entscheidung Nutzer 07.11.2026: Bediener, Fräser und Dreher sollen Blätter erweitern können):** `part.update` erlaubt auch das Bearbeiten von Programmen und Bauteilen. `program.update` prüft bisher keine Route; würde es später wirksam, hinge das Pflegen der Blätter ungewollt daran. Das neue Recht steht in der Kategorie `program`, in der Rollenverwaltung also bei den Programmen.

**Beim Release:** Die Migration gibt das Recht nur der Rolle `admin` (CLAUDE.md). Direkt nach dem Deploy muss es in der Benutzerverwaltung an die übrigen Rollen vergeben werden, zum Beispiel `CNC-Fräser`, `CNC-Dreher`, `Werkstatt-Team`, `programmer`, `reviewer`, `supervisor`. Bis dahin können nur Admins Blätter pflegen. Eintrag in der Release-Checkliste, Standardrechte für Dev/Test in `devRoleDefaults.js`.

## 4. Datenmodell

Migration `1737000128000`, nur über `pgm`. Sie legt auch das Recht `setup_sheet.update` an (`ON CONFLICT DO NOTHING`, nur `admin`):

```sql
ALTER TABLE setup_sheets
  ADD COLUMN workflow_state_id integer REFERENCES workflow_states(id),
  ADD COLUMN released_version_id integer;  -- FK nach Anlegen der Tabelle

CREATE TABLE setup_sheet_versions (
  id             serial PRIMARY KEY,
  setup_sheet_id integer NOT NULL REFERENCES setup_sheets(id) ON DELETE CASCADE,
  version_number integer,                  -- NULL bei Sicherungen
  kind           varchar(10) NOT NULL,     -- 'release' | 'backup'
  snapshot       jsonb NOT NULL,           -- Felder, Spannmittel, Vorrichtungen, Fotos
  created_by     integer REFERENCES users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (setup_sheet_id, version_number)
);
```

- **Umstellung Altbestand:** `draft`, `review`, `approved`, `archived` gleichnamig, `active` → `released`. Für `active` entsteht zugleich Stand 1.
- Danach `workflow_state_id` NOT NULL, `status` und das ungenutzte `version_number` von `setup_sheets` entfallen.
- **Fotos:** Der Stand verweist auf die Datei im Ordner des Blatts. Beim Löschen eines Fotos bleibt die Datei liegen, solange ein Stand sie nennt. Der Garbage Collector räumt nur Ordner gelöschter Blätter ab und muss nicht geändert werden.
- **Verweise beim Zurückgehen:** Ein inzwischen gelöschtes Programm, Spannmittel oder eine Vorrichtung wird ausgelassen, und die Antwort nennt das als Warnung. Die Zuordnung kann dann im Entwurf nachgetragen werden.

## 5. Backend

- `workflowController`: Der Zweig für `setup_sheet` funktioniert mit der neuen Spalte. Beim Übergang nach `released` legt er in derselben Transaktion den Stand an und setzt `released_version_id`.
- `changeWorkflowState` prüft beim Einrichteblatt den Schritt gegen die erlaubten Übergänge (sonst 409). Bei Programmen bleibt es vorerst bei der Knopfliste (ROADMAP „Offene Fixes“).
- Neue Hilfsfunktion: `withSheetChange` (im Plan statt `markChangedAfterRelease`) setzt das Blatt in derselben Transaktion auf Entwurf und schreibt den Ablauf. Sie läuft in `PUT`, Fotos, Spannmittel und Vorrichtungen (je anlegen, ändern, löschen).
- `updateSetupSheet` ohne `COALESCE`, damit Felder leerbar sind. Fehlende Felder im Request bleiben unverändert.
- Neu: `GET /api/setup-sheets/:id/versions`, `GET …/versions/:versionId`, `POST …/versions/:versionId/restore`.
- Status-Filter der Liste über den Status-Namen. `seeds.js` und `.http`-Tests anpassen.
- Neuer Code nutzt den zentralen Pool. `workflowController` behält seinen eigenen, weil die Umstellung laut ROADMAP modulweise läuft. `setup_sheet_versions.created_at` ist `timestamptz` und davon unabhängig.

## 6. Frontend

- Karte und Detailansicht nutzen `WorkflowStatusBadge` und `WorkflowActions`, `SetupSheetStatusActions` entfällt.
- Formular ohne Status-Feld.
- Detailansicht: Hinweis zum letzten freigegebenen Stand, neuer Reiter „Stände“, Reiter oder Bereich „Ablauf“ wie bei den Programmen. Stand-Ansicht schreibgeschützt.
- Warnung vor dem Zurückgehen, wenn dabei Verweise ausfallen.

## 7. Stand auf rpi01 (Abfrage 07.11.2026)

- 7 Blätter: 1 `active`, 6 `draft`, zum Teil Testdaten. Das aktive Blatt bekommt bei der Migration Stand 1.
- 4 Fotos, bleiben unverändert.
- 2 Entwürfe (Blatt 6 und 11) haben eine Maschine, ihr Arbeitsgang keine. Sie zeigen weiter ihre eigene; zum Bearbeiten muss die Maschine am Arbeitsgang eingetragen werden.
- Rollen mit Benutzern: `admin`, `programmer`, `reviewer`, `supervisor`, dazu die eigenen `Buchhaltung`, `CNC-Dreher`, `CNC-Fräser`, `Terminal Dreherei`, `Werkstatt-Team`.

## 8. Umsetzung und Test

| PR | Inhalt | Test |
|---|---|---|
| A | Migration, Freigabe mit Rechten, Sichern der Stände, automatischer Rückfall auf Entwurf, Formular und Karte | Migration hoch und runter auf Wegwerf-DB mit Altdaten aller Status, API-Szenarien inkl. fehlender Rechte, Playwright |
| B | Reiter „Stände“, Ansicht, Zurückgehen, Löschschutz | API-Szenarien zum Zurückgehen (zuletzt freigegeben, älter, gelöschte Verweise, Foto seit dem Stand gelöscht), Playwright |

Das Sichern gehört schon in PR A, damit keine Freigabe ohne Stand bleibt. Beide PRs gehen gemeinsam ins nächste Minor-Release.

## 9. Ausblick: Maschinen-Terminal

Nicht Teil dieser Spec, aber durch sie nicht verbaut (Nutzer 07.11.2026):

- **Blatt optimieren:** Der Bediener ändert das Blatt direkt am Terminal, es fällt auf Entwurf. Dafür braucht das Terminal eine Anmeldung (zum Beispiel NFC), damit Recht und Ablauf stimmen. Beim Einrichten zeigt es den letzten freigegebenen Stand und den Entwurf als Hinweis.
- **Programm einreichen:** Weg über den Eingang ([MESSPROGRAMME_KONZEPT.md](MESSPROGRAMME_KONZEPT.md) 5.3 und 5.4), nicht über das Blatt. An der freigegebenen Version ändert sich nichts, bis jemand übernimmt und freigibt.
