// Altbestand-Import: Dateien eines Programmordners mit Auswahl je Datei (Ziel, abwählen, Haupt-CAD) und Vorschau
import { useState } from 'react';
import { Eye } from 'lucide-react';
import {
  fileEntries, choiceOf, primaryCadPath, CHOICE_LABELS, GROUP_LABELS,
} from '../../utils/legacyImport/selection.js';
import { previewKind } from '../../utils/documentPreview';
import LocalFilePreview from './LocalFilePreview';

// Ordner ohne Dateinamen (für die kleine Zeile unter dem Namen)
const folderOf = (rel) => rel.split('/').slice(0, -1).join('/');

const selectClass = 'px-2 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white';

export default function FileSelection({ program, selection, onChange, relPath }) {
  const [preview, setPreview] = useState(null);
  const entries = fileEntries(program);
  const primary = primaryCadPath(program, selection);

  const setChoice = (entry, choice) => {
    const choices = { ...(selection.choices || {}) };
    if (choice === entry.defaultChoice) delete choices[entry.path];
    else choices[entry.path] = choice;
    onChange({ ...selection, choices });
  };

  return (
    <div className="space-y-2">
      {Object.entries(GROUP_LABELS).map(([group, label]) => {
        const list = entries.filter((e) => e.group === group);
        if (list.length === 0) return null;
        return (
          <div key={group}>
            <div className="font-medium text-gray-700 dark:text-gray-300">{label}</div>
            <ul className="ml-1 space-y-1.5">
              {list.map((entry) => {
                const choice = choiceOf(entry, selection);
                const skipped = choice === 'skip';
                const canPreview = Boolean(entry.item.file) && previewKind(entry.name) !== null;
                return (
                  <li key={entry.path} data-testid="legacy-file" data-name={entry.name}
                    className="grid grid-cols-[1rem_minmax(0,1fr)_auto] items-start gap-x-2">
                    {entry.required ? (
                      <span className="text-xs text-gray-500 dark:text-gray-400 text-center pt-0.5" title="Pflicht">✓</span>
                    ) : entry.choices.length === 2 ? (
                      <input type="checkbox" className="mt-1" checked={!skipped} aria-label={`${entry.name} übernehmen`}
                        onChange={(e) => setChoice(entry, e.target.checked ? entry.choices[0] : 'skip')} />
                    ) : (
                      <span />
                    )}
                    <div className="min-w-0" title={relPath(entry.path)}>
                      <div className={`break-all ${skipped ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                        {entry.name}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{folderOf(relPath(entry.path))}</div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {entry.choices.length > 2 && (
                        <select value={choice} className={selectClass} aria-label={`Ziel für ${entry.name}`}
                          onChange={(e) => setChoice(entry, e.target.value)}>
                          {entry.choices.map((c) => <option key={c} value={c}>{CHOICE_LABELS[c]}</option>)}
                        </select>
                      )}
                      {entry.group === 'cad' && (
                        <label className={`text-xs flex items-center gap-1 ${skipped ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          <input type="radio" name={`primary-cad-${program.key}`} disabled={skipped}
                            checked={!skipped && primary === entry.path}
                            onChange={() => onChange({ ...selection, primaryCad: entry.path })} />
                          Haupt-CAD
                        </label>
                      )}
                      {entry.required && <span className="text-xs text-gray-500 dark:text-gray-400">Pflicht</span>}
                      {canPreview && (
                        <button type="button" onClick={() => setPreview(entry)} title="Vorschau"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                          <Eye className="h-3.5 w-3.5" /> Vorschau
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      {preview && <LocalFilePreview file={preview.item.file} name={preview.name} onClose={() => setPreview(null)} />}
    </div>
  );
}
