# Cron-System

Automatisierte Hintergrundprozesse für MDS. Jobs laufen zeitgesteuert ohne Benutzerinteraktion.

## Architektur

```
server.js → cronService.js → Job-Handler (Controller-Funktionen)
                ↓
          cron_job_logs (PostgreSQL)
                ↓
          cronController.js → Admin-API
```

- **cronService.js** – Job-Registry, Scheduler (`node-cron`), Ausführung mit Logging
- **cronController.js** – REST-API für Status, manuelle Trigger, Historie
- **cronRoutes.js** – Routen (`/api/system/cron/*`), nur Admin-Rolle
- **cron_job_logs** – Protokollierung aller Läufe (Zeitpunkt, Dauer, Ergebnis, Fehler)

## Registrierte Jobs

| Job | Schedule | Beschreibung |
|-----|----------|--------------|
| `auto_close_open_days` | `0 2 * * *` (täglich 02:00) | Schließt offene Tage aller aktiven User automatisch ab, setzt `needs_review = true` |

## API-Endpoints

Alle Endpoints erfordern Admin-Rolle.

```
GET  /api/system/cron/status                    → Alle Jobs mit Health-Status
POST /api/system/cron/trigger/:jobName          → Job manuell auslösen
GET  /api/system/cron/history/:jobName?limit=50 → Log-Historie
```

### Health-Status

| Status | Bedeutung |
|--------|-----------|
| `healthy` | Letzter Lauf erfolgreich, < 26h her |
| `error` | Letzter Lauf fehlgeschlagen |
| `stale` | Letzter Lauf > 26h her (Job läuft vermutlich nicht) |
| `running` | Job läuft gerade |
| `unknown` | Noch nie gelaufen |

## Neuen Job registrieren

In `cronService.js`:

```javascript
registerJob(
  'job_name',           // Eindeutiger Name
  '0 7 * * 1',         // Cron-Expression (Montags 07:00)
  handlerFunction,      // async function – gibt Result-Objekt zurück
  'Beschreibung'        // Für Admin-Übersicht
);
```

### Cron-Expressions

```
┌───── Minute (0-59)
│ ┌───── Stunde (0-23)
│ │ ┌───── Tag (1-31)
│ │ │ ┌───── Monat (1-12)
│ │ │ │ ┌───── Wochentag (0-7, 0+7=So)
│ │ │ │ │
* * * * *
```

Beispiele:
- `0 2 * * *` – Täglich 02:00
- `0 7 * * 1` – Montags 07:00
- `0 */6 * * *` – Alle 6 Stunden
- `30 23 * * 1-5` – Werktags 23:30

Alle Zeiten in `Europe/Berlin` (CET/CEST).

## Abhängigkeiten

```bash
npm install node-cron
```

## Testdatei

`backend/tests/test-cron.http` – VS Code REST Client Tests für alle Endpoints.
