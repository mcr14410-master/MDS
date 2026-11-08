// Altbestand-Import: Messprogramme und Dateien eines Programmordners mit Auswahl (Programm abwählen, eigener
// Arbeitsgang, Ziel je Datei, Haupt-CAD, Foto/Vorlage zu welchem Messprogramm) und Vorschau
import { useState } from 'react';
import { Eye } from 'lucide-react';
import {
  fileEntries, choiceOf, choiceUnit, unitSelected, primaryCadPath, CHOICE_LABELS, GROUP_LABELS,
} from '../../utils/legacyImport/selection.js';
import { previewKind } from '../../utils/documentPreview';
import LocalFilePreview from './LocalFilePreview';

// Ordner ohne Dateinamen (für die kleine Zeile unter dem Namen)
const folderOf = (rel) => rel.split('/').slice(0, -1).join('/');

const selectClass = 'px-2 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white';
const opInputClass = 'px-2 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500';

export default function FileSelection({ program, selection, onChange, relPath, opDefaults = {} }) {
  const [preview, setPreview] = useState(null);
  const entries = fileEntries(program);
  const primary = primaryCadPath(program, selection);
  const several = program.units.length > 1;
  const labelOf = (unitPath) => program.units.find((u) => u.path === unitPath)?.label ?? unitPath;
  const choiceLabel = (c) => {
    if (c.startsWith('photo:')) return `Einrichteblatt ${labelOf(choiceUnit(c))}`;
    if (c.startsWith('template:')) return `zu ${labelOf(choiceUnit(c))}`;
    return CHOICE_LABELS[c];
  };

  // Excel-Vorlage: .xlsx und .layout.xml gleichen Namens gehören zusammen
  const templateBase = (name) => name.toLowerCase().replace(/\.(xlsx|layout\.xml)$/, '');
  const setChoice = (entry, choice) => {
    const choices = { ...(selection.choices || {}) };
    const targets = entry.group === 'template'
      ? entries.filter((e) => e.group === 'template' && templateBase(e.name) === templateBase(entry.name))
      : [entry];
    targets.forEach((t) => {
      if (choice === t.defaultChoice) delete choices[t.path];
      else choices[t.path] = choice;
    });
    onChange({ ...selection, choices });
  };
  const setUnit = (unitPath, patch) => {
    const units = { ...(selection.units || {}) };
    const next = { ...(units[unitPath] || {}), ...patch };
    Object.keys(next).forEach((k) => { if (next[k] === '' || next[k] === false) delete next[k]; });
    if (Object.keys(next).length) units[unitPath] = next;
    else delete units[unitPath];
    onChange({ ...selection, units });
  };

  const fileRow = (entry, disabled = false) => {
    const choice = choiceOf(entry, selection);
    const skipped = choice === 'skip' || disabled;
    const canPreview = Boolean(entry.item.file) && previewKind(entry.name) !== null;
    return (
      <li key={entry.path} data-testid="legacy-file" data-name={entry.name}
        className="grid grid-cols-[1rem_minmax(0,1fr)_auto] items-start gap-x-2">
        {entry.required ? (
          <span className="text-xs text-gray-500 dark:text-gray-400 text-center pt-0.5" title="Pflicht">✓</span>
        ) : entry.choices.length === 2 ? (
          <input type="checkbox" className="mt-1" checked={choice !== 'skip'} disabled={disabled}
            aria-label={`${entry.name} übernehmen`}
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
            <select value={choice} className={selectClass} aria-label={`Ziel für ${entry.name}`} disabled={disabled}
              onChange={(e) => setChoice(entry, e.target.value)}>
              {entry.choices.map((c) => <option key={c} value={c}>{choiceLabel(c)}</option>)}
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
  };

  return (
    <div className="space-y-2">
      <div>
        <div className="font-medium text-gray-700 dark:text-gray-300">
          {several ? `Messprogramme (${program.units.length}) – je Programm ein eigener Mess-Arbeitsgang` : 'Messprogramm'}
        </div>
        <div className="space-y-2">
          {program.units.map((u) => {
            const on = unitSelected(u.path, selection);
            const own = selection.units?.[u.path] || {};
            return (
              <div key={u.path} data-testid="legacy-unit" data-unit={u.label}
                className={several ? 'rounded border border-gray-200 dark:border-gray-700 p-2' : ''}>
                {several && (
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <label className="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-200">
                      <input type="checkbox" checked={on} aria-label={`${u.label} übernehmen`}
                        onChange={(e) => setUnit(u.path, { skip: !e.target.checked })} />
                      <span className={on ? '' : 'line-through text-gray-400 dark:text-gray-500'}>{u.label}</span>
                    </label>
                    {on && (
                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Arbeitsgang</span>
                        <input className={`${opInputClass} w-20`} value={own.opNumber || ''} placeholder={opDefaults.op_number}
                          aria-label={`OP-Nummer ${u.label}`} onChange={(e) => setUnit(u.path, { opNumber: e.target.value })} />
                        <input className={`${opInputClass} w-48`} value={own.opName || ''}
                          placeholder={`${opDefaults.op_name || ''} ${u.label}`.trim()}
                          aria-label={`Arbeitsgang-Name ${u.label}`} onChange={(e) => setUnit(u.path, { opName: e.target.value })} />
                      </div>
                    )}
                  </div>
                )}
                <ul className="ml-1 space-y-1.5">
                  {entries.filter((e) => e.group === 'program' && e.unit === u.path).map((e) => fileRow(e, !on))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
      {Object.entries(GROUP_LABELS).map(([group, label]) => {
        const list = entries.filter((e) => e.group === group);
        if (list.length === 0) return null;
        return (
          <div key={group}>
            <div className="font-medium text-gray-700 dark:text-gray-300">{label}</div>
            <ul className="ml-1 space-y-1.5">{list.map((e) => fileRow(e))}</ul>
          </div>
        );
      })}
      {preview && <LocalFilePreview file={preview.item.file} name={preview.name} onClose={() => setPreview(null)} />}
    </div>
  );
}
