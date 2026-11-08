// Altbestand-Import: eine Zeile je Programmordner – Vorschlag, Korrektur, Dateien je Ziel
import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, XCircle } from 'lucide-react';
import { STATUS_INFO } from './statusInfo';

const TARGETS = [
  ['program', 'Messprogramm'],
  ['template', 'Excel-Vorlage'],
  ['calibration', 'Kalibrierprogramm'],
  ['drawingPdf', 'Prüfzeichnung (im Messprogramm)'],
  ['photos', 'Fotos Einrichteblatt'],
  ['cad', 'CAD-Modell (Bauteil-Dokument)'],
  ['drawingOther', 'Zeichnung (Bauteil-Dokument)'],
];

const inputClass = 'w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white';

export default function LegacyImportRow({ program, state, customer, candidates, status, customers, onChange, children = null }) {
  const [open, setOpen] = useState(false);
  const relPath = (p) => p.slice(p.indexOf(`${program.key}/`) + program.key.length + 1);
  const info = STATUS_INFO[status];
  // Auswahl, solange es nicht genau einen passenden Treffer gibt (mehrere oder nur andere Revisionen)
  const several = candidates.same.length > 1;
  const showPartChoice = several || (candidates.same.length === 0 && candidates.otherRevisions.length > 0);
  const partOptions = several ? candidates.same : candidates.otherRevisions;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
      <div className="p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setOpen(!open)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title={open ? 'Dateien ausblenden' : 'Dateien anzeigen'}>
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <span className="font-mono text-sm text-gray-900 dark:text-white break-all">{program.key}</span>
          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${info.className}`}>{info.label}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <label className="text-xs text-gray-600 dark:text-gray-400">
            Kunde
            <select value={state.customerId ?? ''} className={inputClass}
              onChange={(e) => onChange({ customerId: e.target.value ? Number(e.target.value) : null, partChoice: undefined })}>
              <option value="">– Kunde wählen –</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.customer_number ? `${c.customer_number} – ` : ''}{c.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-600 dark:text-gray-400">
            Kunden-Teilenummer
            <input value={state.customerPartNumber} className={inputClass}
              onChange={(e) => onChange({ customerPartNumber: e.target.value, partChoice: undefined })} />
          </label>
          <label className="text-xs text-gray-600 dark:text-gray-400">
            Revision
            <input value={state.revision} className={inputClass}
              onChange={(e) => onChange({ revision: e.target.value, partChoice: undefined })} />
          </label>
          <label className="text-xs text-gray-600 dark:text-gray-400">
            Bezeichnung
            <input value={state.name} className={inputClass} onChange={(e) => onChange({ name: e.target.value })} />
          </label>
        </div>

        {showPartChoice && (
          <label className="block text-xs text-gray-600 dark:text-gray-400">
            Bauteil
            <select value={state.partChoice ?? ''} className={inputClass}
              onChange={(e) => {
                const v = e.target.value;
                onChange({ partChoice: v === 'new' || v === 'skip' || v === '' ? (v || null) : Number(v) });
              }}>
              {several && <option value="">– Bauteil wählen –</option>}
              {partOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.part_number} – {p.part_name} (Rev. {p.revision})</option>
              ))}
              <option value="new">Neues Bauteil anlegen</option>
              <option value="skip">Überspringen</option>
            </select>
          </label>
        )}

        {!customer && program.customerNumber && (
          <p className="flex items-center gap-1 text-sm text-red-700 dark:text-red-400">
            <XCircle className="h-4 w-4 shrink-0" /> Kunde {program.customerNumber} nicht im MDS – Kunde wählen
          </p>
        )}
        {program.errors.map((e) => (
          <p key={e} className="flex items-center gap-1 text-sm text-red-700 dark:text-red-400">
            <XCircle className="h-4 w-4 shrink-0" /> {e}
          </p>
        ))}
        {program.warnings.map((w) => (
          <p key={w} className="flex items-center gap-1 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {w}
          </p>
        ))}
        {children}
      </div>

      {open && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="space-y-2">
            {TARGETS.filter(([key]) => program.files[key].length > 0).map(([key, label]) => (
              <div key={key}>
                <div className="font-medium text-gray-700 dark:text-gray-300">{label}</div>
                <ul className="ml-4 list-disc text-gray-600 dark:text-gray-400">
                  {program.files[key].map((f) => <li key={f.path} className="break-all">{relPath(f.path)}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div>
            <div className="font-medium text-gray-700 dark:text-gray-300">Nicht übernommen</div>
            {program.skipped.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">–</p>
            ) : (
              <ul className="ml-4 list-disc text-gray-600 dark:text-gray-400">
                {program.skipped.map((s) => (
                  <li key={s.path} className="break-all">{relPath(s.path)} <span className="text-xs text-gray-500">({s.reason})</span></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
