// Altbestand-Import: Quell- und Archivordner, Skript zum Verschieben übernommener Programmordner
// Pfade bleiben im Browser (der Helfer läuft am Arbeitsrechner), das Skript entsteht ohne Server-Aufruf.
import { useState } from 'react';
import { Download, XCircle } from 'lucide-react';
import { ARCHIVE_SCRIPT_NAME, buildArchiveScript, validateArchiveSettings } from '../../utils/legacyImport/archiveScript.js';

const STORAGE_KEY = 'mds.legacyImport.archive';
const inputClass = 'w-full px-2 py-1 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white';

function readSettings() {
  try {
    return { sourceRoot: '', archiveRoot: '', ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return { sourceRoot: '', archiveRoot: '' };
  }
}

export default function ArchiveSettings({ entries }) {
  const [settings, setSettings] = useState(readSettings);
  const errors = validateArchiveSettings(settings);

  const update = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ohne Speicher weiter */ }
  };

  const download = () => {
    const script = buildArchiveScript({
      ...settings,
      entries,
      createdAt: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }),
    });
    // BOM, damit Windows PowerShell 5.1 die Umlaute als UTF-8 liest; CRLF für Windows-Editoren
    const blob = new Blob(['\uFEFF' + script.replace(/\n/g, '\r\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = ARCHIVE_SCRIPT_NAME;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
      <div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Archiv</div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Übernommene Programmordner werden per Skript vom Quell- in den Archivordner verschoben (Windows-Pfade wie am Arbeitsrechner).
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-xs text-gray-600 dark:text-gray-400">
          Quellordner
          <input value={settings.sourceRoot} placeholder="Z:\KMG\Programme" className={inputClass}
            data-testid="legacy-import-source" onChange={(e) => update({ sourceRoot: e.target.value })} />
        </label>
        <label className="text-xs text-gray-600 dark:text-gray-400">
          Archivordner
          <input value={settings.archiveRoot} placeholder="Z:\KMG\Archiv" className={inputClass}
            data-testid="legacy-import-archive" onChange={(e) => update({ archiveRoot: e.target.value })} />
        </label>
      </div>
      {errors.map((e) => (
        <p key={e} className="flex items-center gap-1 text-sm text-red-700 dark:text-red-400">
          <XCircle className="h-4 w-4 shrink-0" /> {e}
        </p>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={download} disabled={entries.length === 0 || errors.length > 0}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
          <Download className="h-4 w-4" /> Archiv-Skript ({entries.length} {entries.length === 1 ? 'Programm' : 'Programme'})
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400">nur vollständig übernommene Programme</span>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400">
        Am Arbeitsrechner zuerst prüfen:{' '}
        <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 select-all">
          powershell -ExecutionPolicy Bypass -File {ARCHIVE_SCRIPT_NAME} -Probe
        </code>
        {' '}– danach ohne <code>-Probe</code>. Das Skript überschreibt nichts und schreibt ein Protokoll daneben.
      </p>
    </div>
  );
}
