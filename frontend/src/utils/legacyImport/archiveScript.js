/**
 * Altbestand-Import: PowerShell-Skript, das übernommene Programmordner ins Archiv verschiebt
 * (Spec: docs/konzepte/ALTBESTAND_IMPORT_SPEC.md, 6)
 *
 * Der Browser darf keine Dateien verschieben – der Nutzer führt das Skript am Arbeitsrechner aus,
 * zuerst mit -Probe. Es überschreibt nie und protokolliert jede Zeile neben dem Skript.
 *
 * Reines Modul ohne React/axios (wird auch von Node-Tests geladen).
 */

export const ARCHIVE_SCRIPT_NAME = 'altbestand-archiv.ps1';

const normalizePath = (p) => String(p ?? '').trim().replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase();

/** Fehlermeldungen zu Quell- und Archivordner (leer = in Ordnung) */
export function validateArchiveSettings({ sourceRoot, archiveRoot }) {
  const errors = [];
  const source = normalizePath(sourceRoot);
  const archive = normalizePath(archiveRoot);
  if (!source) errors.push('Quellordner fehlt');
  if (!archive) errors.push('Archivordner fehlt');
  if (source && archive) {
    if (source === archive) errors.push('Quell- und Archivordner sind gleich');
    else if (archive.startsWith(`${source}\\`)) errors.push('Archivordner darf nicht im Quellordner liegen');
  }
  return errors;
}

// PowerShell-String in einfachen Anführungszeichen; dort gelten auch ‘ ’ ‚ ‛ als Anführungszeichen
const psQuote = (value) => `'${String(value).replace(/['‘’‚‛]/g, (q) => q + q)}'`;
const psPath = (value) => psQuote(String(value).trim().replace(/\//g, '\\').replace(/\\+$/, ''));

/**
 * @param {{ sourceRoot: string, archiveRoot: string, entries: {customerFolder: string, programFolder: string}[], createdAt: string }} args
 * @returns {string} Skript ohne BOM (die Seite stellt beim Speichern ﻿ voran)
 */
export function buildArchiveScript({ sourceRoot, archiveRoot, entries, createdAt }) {
  const lines = entries.map((e) => `  @{ Kunde = ${psQuote(e.customerFolder)}; Programm = ${psQuote(e.programFolder)} }`);
  return `# Altbestand-Import: übernommene Programmordner ins Archiv verschieben
# Erzeugt vom MDS am ${createdAt} für ${entries.length} Programm(e)
# Quelle und Archiv sollten auf derselben Freigabe liegen (dann ist Verschieben nur Umbenennen).
# Erst prüfen:  powershell -ExecutionPolicy Bypass -File ${ARCHIVE_SCRIPT_NAME} -Probe
# Dann:         powershell -ExecutionPolicy Bypass -File ${ARCHIVE_SCRIPT_NAME}
param([switch]$Probe)
$ErrorActionPreference = 'Stop'

$Quelle = ${psPath(sourceRoot)}
$Archiv = ${psPath(archiveRoot)}
$Eintraege = @(
${lines.join(',\n')}
)

$Protokoll = Join-Path $PSScriptRoot ('altbestand-archiv_' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
function Melde([string]$Text) {
  Write-Host $Text
  Add-Content -LiteralPath $Protokoll -Value $Text -Encoding UTF8
}

$verschoben = 0; $uebersprungen = 0; $fehler = 0
if ($Probe) { Melde 'Probelauf - es wird nichts verschoben' }
foreach ($e in $Eintraege) {
  $von = [System.IO.Path]::Combine($Quelle, $e.Kunde, $e.Programm)
  $zielKunde = [System.IO.Path]::Combine($Archiv, $e.Kunde)
  $nach = [System.IO.Path]::Combine($zielKunde, $e.Programm)
  if (-not (Test-Path -LiteralPath $von)) { Melde "fehlt: $von"; $fehler++; continue }
  if (Test-Path -LiteralPath $nach) { Melde "übersprungen, Ziel vorhanden: $nach"; $uebersprungen++; continue }
  if ($Probe) { Melde "würde verschieben: $von -> $nach"; $verschoben++; continue }
  try {
    [System.IO.Directory]::CreateDirectory($zielKunde) | Out-Null
    Move-Item -LiteralPath $von -Destination $nach
    Melde "verschoben: $von -> $nach"
    $verschoben++
  } catch {
    Melde "FEHLER: $von - $($_.Exception.Message)"
    $fehler++
  }
}
if ($Probe) { Melde "Probelauf fertig: $verschoben würden verschoben, $uebersprungen übersprungen, $fehler Fehler" }
else { Melde "Fertig: $verschoben verschoben, $uebersprungen übersprungen, $fehler Fehler" }
`;
}
