/* eslint-disable camelcase */

/**
 * Migration: Zeitstempel im Modul Programme auf timestamptz
 *
 * Bisher `timestamp` ohne Zeitzone, geschrieben in der Zeitzone der jeweiligen Datenbank-Session:
 * zentraler Pool (config/db, Europe/Berlin) → Berliner Ortszeit, eigene Pools in programsController,
 * workflowController und operationsController (Server-Standard UTC) → UTC. Folge: Messprogramme und
 * Einrichteblätter wurden 1–2 h zu spät angezeigt (ROADMAP, Offene Fixes).
 *
 * Wer welche Zeile geschrieben hat, ergibt sich aus den Daten (Prüfung in Produktion 11.11.2026:
 * Audit-Log und Messprogramm-Dateien sind timestamptz und bestätigen die Regeln; DB-Server in UTC,
 * keine Einrichteblätter vor dem Berlin-Pool vom 04.02.2026). In einer Transaktion liefert
 * CURRENT_TIMESTAMP immer denselben Wert – daran erkennt man den Schreiber von updated_at:
 *
 * - programs.created_at, program_revisions.created_at: Messprogramme (kind 'cmm') Berlin, sonst UTC
 * - programs.updated_at: NC immer UTC. Messprogramme Berlin, wenn gleich der Anlage oder einer Version
 *   (cmmProgramsController), sonst UTC (Statuswechsel, Bearbeiten, Zurückrollen über eigene Pools)
 * - program_revisions.released_at, workflow_history.created_at: immer UTC
 * - setup_sheets.created_at, setup_sheet_photos.uploaded_at: Berlin, außer beim Variante anlegen
 *   kopiert (operationsController, UTC – gleicher Wert wie die Anlage des Arbeitsgangs)
 * - setup_sheets.updated_at: wie die Anlage, wenn unverändert; UTC, wenn gleich einem Statuswechsel
 *   des Blatts (workflowController); sonst Berlin (Bearbeiten, Zurückgehen)
 *
 * Ablauf: erst alle Berliner Werte auf UTC-Ortszeit umrechnen (updated_at vor created_at, weil die
 * Regeln die unveränderten Werte vergleichen), dann die Spalten als UTC lesen und umstellen.
 * Nicht dabei: Arbeitsgänge, Bauteile, Werkzeuglisten (eigene Module, eigener Eintrag in der ROADMAP).
 */

exports.shorthands = undefined;

const BERLIN_TO_UTC = (col) => `(${col} AT TIME ZONE 'Europe/Berlin') AT TIME ZONE 'UTC'`;

const COLUMNS = [
  ['programs', 'created_at'],
  ['programs', 'updated_at'],
  ['program_revisions', 'created_at'],
  ['program_revisions', 'released_at'],
  ['workflow_history', 'created_at'],
  ['setup_sheets', 'created_at'],
  ['setup_sheets', 'updated_at'],
  ['setup_sheet_photos', 'uploaded_at'],
];

exports.up = (pgm) => {
  pgm.sql(`
    -- 1. programs.updated_at bei Messprogrammen, geschrieben vom zentralen Pool
    UPDATE programs p SET updated_at = ${BERLIN_TO_UTC('p.updated_at')}
     WHERE p.kind = 'cmm'
       AND (p.updated_at = p.created_at
            OR EXISTS (SELECT 1 FROM program_revisions r WHERE r.program_id = p.id AND r.created_at = p.updated_at));

    -- 2. setup_sheets.updated_at: nicht vom Statuswechsel und nicht unveränderte Variantenkopie
    UPDATE setup_sheets s SET updated_at = ${BERLIN_TO_UTC('s.updated_at')}
     WHERE NOT EXISTS (SELECT 1 FROM workflow_history wh
                        WHERE wh.entity_type = 'setup_sheet' AND wh.entity_id = s.id AND wh.created_at = s.updated_at)
       AND NOT (s.updated_at = s.created_at
                AND EXISTS (SELECT 1 FROM operations o WHERE o.id = s.operation_id AND o.created_at = s.created_at));

    -- 3. Fotos: außer beim Variante anlegen kopierte
    UPDATE setup_sheet_photos ph SET uploaded_at = ${BERLIN_TO_UTC('ph.uploaded_at')}
     WHERE NOT EXISTS (SELECT 1 FROM setup_sheets s JOIN operations o ON o.id = s.operation_id
                        WHERE s.id = ph.setup_sheet_id AND o.created_at = ph.uploaded_at);

    -- 4. setup_sheets.created_at: außer Variantenkopie
    UPDATE setup_sheets s SET created_at = ${BERLIN_TO_UTC('s.created_at')}
     WHERE NOT EXISTS (SELECT 1 FROM operations o WHERE o.id = s.operation_id AND o.created_at = s.created_at);

    -- 5. Messprogramme: Versionen und Anlage
    UPDATE program_revisions r SET created_at = ${BERLIN_TO_UTC('r.created_at')}
      FROM programs p WHERE p.id = r.program_id AND p.kind = 'cmm';
    UPDATE programs SET created_at = ${BERLIN_TO_UTC('created_at')} WHERE kind = 'cmm';
  `);

  // 6. Alle Werte sind jetzt UTC-Ortszeit → als UTC lesen
  for (const [table, col] of COLUMNS) {
    pgm.sql(`ALTER TABLE ${table} ALTER COLUMN ${col} TYPE timestamptz USING ${col} AT TIME ZONE 'UTC';`);
  }
};

// Zurück auf timestamp ohne Zeitzone, einheitlich in UTC. Der alte, gemischte Stand (Berlin/UTC je Schreiber)
// lässt sich nicht wiederherstellen – nach einem Rückweg zeigt der alte Code Messprogramme und Einrichteblätter
// 1–2 h zu früh an.
exports.down = (pgm) => {
  for (const [table, col] of COLUMNS) {
    pgm.sql(`ALTER TABLE ${table} ALTER COLUMN ${col} TYPE timestamp USING ${col} AT TIME ZONE 'UTC';`);
  }
};
