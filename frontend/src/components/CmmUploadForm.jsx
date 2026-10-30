// frontend/src/components/CmmUploadForm.jsx
// Messprogramm (KMG / PC-DMIS) hochladen: neues Programm oder neue Version.
// Man legt ab, was man hat (einzelne Dateien oder den ganzen Ordner). Das MDS prüft per
// Probelauf und zeigt vor dem Speichern, was neu, geändert, unverändert oder übernommen ist.
// Excel-Vorlage und Kalibrierprogramm haben je einen eigenen Schalter mit eigenem Upload.
import { useEffect, useRef, useState } from 'react';
import { useProgramsStore } from '../stores/programsStore';
import { toast } from './Toaster';

const FILE_STATUS = {
  new:       { label: 'Neu',         className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  changed:   { label: 'Geändert',    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  unchanged: { label: 'Unverändert', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  carried:   { label: 'Übernommen',  className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
};

// Übernommene Dateien dieser Rollen lassen sich nicht einzeln entfernen (Backend-Regel)
const NOT_REMOVABLE = ['main', 'report_xlsx', 'report_layout', 'calibration'];

// Upload-Bereiche mit eigenem Filter im Backend: Messprogramm, Excel-Vorlage, Kalibrierprogramm
const EMPTY_AREAS = { program: [], template: [], calibration: [] };

const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// Ordner aus Drag & Drop rekursiv auslesen – mit Pfad, damit Unterordner erkennbar bleiben
async function filesFromEntry(entry) {
  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
    return [{ file, path: entry.fullPath.replace(/^\//, '') }];
  }
  if (entry.isDirectory) {
    const reader = entry.createReader();
    const entries = [];
    // readEntries liefert in Blöcken, bis ein leerer Block kommt
    for (;;) {
      const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
      if (batch.length === 0) break;
      entries.push(...batch);
    }
    const nested = await Promise.all(entries.map(filesFromEntry));
    return nested.flat();
  }
  return [];
}

// Nur die oberste Ebene der Auswahl zählt: Dateien aus Unterordnern (z. B. Messprotokolle,
// die PC-DMIS neben das Programm schreibt) gehören nicht zum Messprogramm.
// items: [{ file, path }] mit Pfad relativ zur Auswahl ('' bzw. Dateiname = oberste Ebene)
function splitTopLevel(items) {
  const depth = (p) => (p ? p.split('/').length - 1 : 0);
  const top = Math.min(...items.map((i) => depth(i.path)));
  const keep = [];
  const skipped = [];
  items.forEach((i) => {
    if (depth(i.path) === top) {
      keep.push(i.file);
    } else {
      const parts = i.path.split('/');
      const folder = parts.slice(top, -1).join('/');
      skipped.push({ filename: parts.slice(top).join('/'), filesize: i.file.size, folder });
    }
  });
  return { keep, skipped };
}

export default function CmmUploadForm({ operationId, program, onClose, onSuccess }) {
  const { uploadCmm, fetchCmmFiles } = useProgramsStore();
  const isRevision = Boolean(program);

  const [areaFiles, setAreaFiles] = useState(EMPTY_AREAS);
  const [skipped, setSkipped] = useState([]);   // Dateien aus Unterordnern, nicht hochgeladen
  const [fields, setFields] = useState({ program_name: '', description: '', comment: '', version_type: 'patch' });
  const [excelReport, setExcelReport] = useState(false);   // Excel-Vorlage gehört dazu
  const [calibration, setCalibration] = useState(false);   // Kalibrierprogramm gehört dazu
  const [remove, setRemove] = useState([]);
  const [currentFiles, setCurrentFiles] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const previewRun = useRef(0);

  useEffect(() => {
    if (isRevision) {
      fetchCmmFiles(program.id)
        .then((data) => {
          setCurrentFiles(data);
          setExcelReport(Boolean(data.excel_report));
          setCalibration(Boolean(data.calibration));
        })
        .catch(() => setCurrentFiles({ files: [], excel_report: false, calibration: false }));
    }
  }, [isRevision, program, fetchCmmFiles]);

  const hadExcel = Boolean(currentFiles?.excel_report);
  const hadCalibration = Boolean(currentFiles?.calibration);
  const fileCount = areaFiles.program.length + areaFiles.template.length + areaFiles.calibration.length;
  const hasChanges = fileCount > 0 || remove.length > 0
    || (isRevision && currentFiles !== null && (excelReport !== hadExcel || calibration !== hadCalibration));

  // Schalter: an = Pflicht, aus = in der neuen Version entfernen (nur wenn vorhanden)
  const flag = (on, before) => (on ? 'true' : isRevision && before ? 'false' : '');

  const requestFields = () => (isRevision
    ? {
      version_type: fields.version_type,
      comment: fields.comment,
      excel_report: flag(excelReport, hadExcel),
      calibration: flag(calibration, hadCalibration),
    }
    : {
      operation_id: operationId,
      program_name: fields.program_name,
      description: fields.description,
      comment: fields.comment,
      excel_report: flag(excelReport, false),
      calibration: flag(calibration, false),
    });

  const requestFiles = () => ({
    files: areaFiles.program,
    templateFiles: excelReport ? areaFiles.template : [],
    calibrationFiles: calibration ? areaFiles.calibration : [],
  });

  // Vorschau per Probelauf, sobald sich Dateien oder Optionen ändern
  useEffect(() => {
    if (!hasChanges) {
      setPreview(null);
      setPreviewError(null);
      return undefined;
    }
    const run = ++previewRun.current;
    setPreviewing(true);
    const timer = setTimeout(async () => {
      try {
        const result = await uploadCmm({
          programId: program?.id || null,
          fields: requestFields(),
          ...requestFiles(),
          remove,
          dryRun: true,
        });
        if (run === previewRun.current) {
          setPreview(result);
          setPreviewError(null);
        }
      } catch (error) {
        if (run === previewRun.current) {
          setPreview(null);
          setPreviewError(error.details?.length ? error.details.join(' · ') : error.message);
        }
      } finally {
        if (run === previewRun.current) setPreviewing(false);
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaFiles, remove, excelReport, calibration]);

  // items: [{ file, path }] aus Ordnerauswahl oder Drag & Drop, je Upload-Bereich
  const addItems = (area, items) => {
    if (items.length === 0) return;
    const { keep, skipped: newSkipped } = splitTopLevel(items);
    if (newSkipped.length > 0) {
      setSkipped((prev) => {
        const byName = new Map(prev.map((s) => [s.filename.toLowerCase(), s]));
        newSkipped.forEach((s) => byName.set(s.filename.toLowerCase(), s));
        return [...byName.values()];
      });
    }
    if (keep.length === 0) return;
    setAreaFiles((prev) => {
      // Gleicher Name (ohne Groß-/Kleinschreibung) → neue Datei ersetzt die alte
      const byName = new Map(prev[area].map((f) => [f.name.toLowerCase(), f]));
      keep.forEach((f) => byName.set(f.name.toLowerCase(), f));
      return { ...prev, [area]: [...byName.values()] };
    });
    if (area === 'program' && !isRevision && !fields.program_name) {
      const prg = keep.find((f) => f.name.toLowerCase().endsWith('.prg'));
      if (prg) setFields((prev) => ({ ...prev, program_name: prg.name.replace(/\.prg$/i, '') }));
    }
  };

  const clearArea = (area) => setAreaFiles((prev) => ({ ...prev, [area]: [] }));

  // Bereich ausschalten verwirft dessen Auswahl
  const toggleOption = (area, setter, on) => {
    setter(on);
    if (!on) clearArea(area);
  };

  const toggleRemove = (name) => {
    setRemove((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await uploadCmm({
        programId: program?.id || null,
        fields: requestFields(),
        ...requestFiles(),
        remove,
      });
      toast.success(isRevision
        ? `Version ${result.revision.version} angelegt`
        : `Messprogramm ${result.program.program_number} angelegt`);
      onSuccess();
    } catch (error) {
      toast.error(error.details?.length ? error.details.join(' · ') : error.message);
    } finally {
      setSaving(false);
    }
  };

  const canSave = preview?.valid && !previewing && !saving && (isRevision || fields.program_name.trim());
  const userRemoved = new Set(remove.map((n) => n.toLowerCase()));
  const skippedRows = skipped.map((s) => ({
    ...s,
    status: 'ignored',
    reason: `Aus Unterordner „${s.folder}“ – nicht hochgeladen (z. B. Messprotokolle)`,
  }));
  const inputClass = 'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isRevision ? 'Neue Version – Messprogramm' : 'Messprogramm hochladen'}
            </h2>
            {isRevision && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {program.program_number} · {program.program_name} · aktiv: Version {program.version}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Schließen"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Messprogramm */}
          <DropArea
            onItems={(items) => addItems('program', items)}
            hint=".prg, .cad, Prüfzeichnung (.pdf), .MiniRoutines.xml – PC-DMIS-Sicherungen (.PRG~, .PRG^), andere Dateitypen und Unterordner (z. B. Messprotokolle) werden aussortiert"
          >
            {isRevision && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center">
                Einfach den ganzen Ordner ablegen – das MDS erkennt, was sich geändert hat. Nicht abgelegte Dateien werden übernommen.
              </p>
            )}
          </DropArea>

          {(fileCount > 0 || skipped.length > 0) && (
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>
                {fileCount} {fileCount === 1 ? 'Datei' : 'Dateien'} ausgewählt
                {skipped.length > 0 && ` · ${skipped.length} aus Unterordnern nicht hochgeladen`}
              </span>
              <button type="button" onClick={() => { setAreaFiles(EMPTY_AREAS); setSkipped([]); }} className="text-blue-600 dark:text-blue-400 hover:underline">
                Auswahl leeren
              </button>
            </div>
          )}

          {/* Felder */}
          {!isRevision ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Programm-Name <span className="text-red-500">*</span>
                </label>
                <input type="text" value={fields.program_name} className={inputClass}
                  onChange={(e) => setFields({ ...fields, program_name: e.target.value })}
                  placeholder="z. B. TEIL-0001_OP30" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Beschreibung</label>
                <input type="text" value={fields.description} className={inputClass}
                  onChange={(e) => setFields({ ...fields, description: e.target.value })} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Versionsart</label>
                <select value={fields.version_type} className={inputClass}
                  onChange={(e) => setFields({ ...fields, version_type: e.target.value })}>
                  <option value="patch">Patch – kleine Korrektur</option>
                  <option value="minor">Minor – Merkmale/Toleranzen geändert</option>
                  <option value="major">Major – neuer Messablauf</option>
                </select>
              </div>
            </div>
          )}

          {/* Zusätze mit eigenem Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <OptionArea
              title="Excel-Protokoll"
              description="Vorlage aus .xlsx und .layout.xml – ohne .layout.xml entsteht ein Protokoll ohne Messwerte. Zielort: PC-DMIS-Vorlagenverzeichnis."
              checked={excelReport}
              onChange={(on) => toggleOption('template', setExcelReport, on)}
              files={areaFiles.template}
              onItems={(items) => addItems('template', items)}
              onClear={() => clearArea('template')}
              dropHint=".xlsx + .layout.xml"
              keepHint={hadExcel ? 'Leer lassen = bisherige Vorlage übernehmen' : null}
              removeHint={hadExcel && !excelReport ? 'Die Vorlage wird in der neuen Version entfernt.' : null}
            />
            <OptionArea
              title="Kalibrierprogramm"
              description="Eigene .prg, die die Taster dieses Programms kalibriert – wird mit dem Messprogramm versioniert. Kalibrierprotokolle (.pdf) werden aussortiert."
              checked={calibration}
              onChange={(on) => toggleOption('calibration', setCalibration, on)}
              files={areaFiles.calibration}
              onItems={(items) => addItems('calibration', items)}
              onClear={() => clearArea('calibration')}
              dropHint=".prg oder Kalibrier-Ordner"
              keepHint={hadCalibration ? 'Leer lassen = bisheriges Kalibrierprogramm übernehmen' : null}
              removeHint={hadCalibration && !calibration ? 'Das Kalibrierprogramm wird in der neuen Version entfernt.' : null}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Änderungsnotiz</label>
            <input type="text" value={fields.comment} className={inputClass}
              onChange={(e) => setFields({ ...fields, comment: e.target.value })}
              placeholder={isRevision ? 'z. B. Ebenheitstoleranz SEGMENT_1 angepasst' : 'Initiale Version'} />
          </div>

          {/* Vorschau */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {hasChanges ? 'Vorschau' : isRevision ? 'Aktive Version' : 'Vorschau'}
              </h3>
              {previewing && (
                <span className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {!hasChanges && isRevision && currentFiles && (
              <FileTable rows={currentFiles.files.map((f) => ({ ...f, status: null }))} />
            )}
            {!hasChanges && !isRevision && (
              <p className="text-sm text-gray-500 dark:text-gray-400">Noch keine Dateien ausgewählt.</p>
            )}
            {!hasChanges && skipped.length > 0 && (
              <div className="mt-3"><FileTable rows={skippedRows} /></div>
            )}

            {previewError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                {previewError}
              </div>
            )}

            {hasChanges && preview && (
              <div className="space-y-3">
                {preview.errors.length > 0 && (
                  <ul className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300 list-disc list-inside space-y-1">
                    {preview.errors.map((e) => <li key={e}>{e}</li>)}
                  </ul>
                )}
                {preview.warnings.length > 0 && (
                  <ul className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-800 dark:text-yellow-300 list-disc list-inside space-y-1">
                    {preview.warnings.map((w) => <li key={w}>{w}</li>)}
                  </ul>
                )}
                <FileTable
                  rows={[
                    ...preview.files,
                    ...preview.removed.map((f) => ({ ...f, status: 'removed' })),
                    ...preview.ignored.map((f) => ({ filename: f.name, status: 'ignored', reason: f.reason })),
                    ...skippedRows,
                  ]}
                  onToggleRemove={isRevision ? toggleRemove : null}
                  userRemoved={userRemoved}
                />
                {preview.base_version && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Verglichen mit Version {preview.base_version}.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Speichert…' : isRevision ? 'Version anlegen' : 'Messprogramm anlegen'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Ablagefläche mit Datei- und Ordnerauswahl; liefert [{ file, path }] (Pfad relativ zur Auswahl)
function DropArea({ onItems, hint, compact = false, children = null }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const entries = [...(e.dataTransfer.items || [])]
      .map((item) => (item.webkitGetAsEntry ? item.webkitGetAsEntry() : null))
      .filter(Boolean);
    if (entries.length > 0) {
      const nested = await Promise.all(entries.map(filesFromEntry));
      onItems(nested.flat());
    } else {
      onItems([...e.dataTransfer.files].map((file) => ({ file, path: file.name })));
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-colors ${
        compact ? 'px-3 py-3' : 'px-6 py-6'
      } ${
        dragOver
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
      }`}
    >
      {!compact && (
        <svg className="h-10 w-10 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      )}
      <p className={`${compact ? '' : 'mt-2 '}text-sm text-gray-700 dark:text-gray-300 text-center`}>
        {compact ? 'Hierher ziehen – ' : 'Ordner oder Dateien hierher ziehen – '}
        <label className="cursor-pointer font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">
          Dateien wählen
          <input type="file" multiple className="sr-only"
            onChange={(e) => { onItems([...e.target.files].map((file) => ({ file, path: file.name }))); e.target.value = ''; }} />
        </label>
        {' '}oder{' '}
        <label className="cursor-pointer font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">
          Ordner wählen
          <input type="file" multiple webkitdirectory="" className="sr-only"
            onChange={(e) => {
              onItems([...e.target.files].map((file) => ({ file, path: file.webkitRelativePath || file.name })));
              e.target.value = '';
            }} />
        </label>
      </p>
      {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center">{hint}</p>}
      {children}
    </div>
  );
}

// Zusatz zum Messprogramm (Excel-Vorlage, Kalibrierprogramm): Schalter + eigener Upload
function OptionArea({ title, description, checked, onChange, files, onItems, onClear, dropHint, keepHint, removeHint }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 rounded border-gray-300 dark:border-gray-600" />
        <span className="font-medium">
          {title}
          <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">{description}</span>
        </span>
      </label>
      {removeHint && <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">{removeHint}</p>}
      {checked && (
        <div className="mt-3">
          <DropArea compact onItems={onItems} hint={dropHint} />
          <div className="mt-1 flex items-start justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="break-all">{files.length > 0 ? files.map((f) => f.name).join(', ') : keepHint || 'Noch keine Datei ausgewählt'}</span>
            {files.length > 0 && (
              <button type="button" onClick={onClear} className="text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">
                leeren
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FileTable({ rows, onToggleRemove = null, userRemoved = new Set() }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {rows.map((f) => {
            const isRemoved = f.status === 'removed';
            const isIgnored = f.status === 'ignored';
            const removable = onToggleRemove && f.status === 'carried' && !NOT_REMOVABLE.includes(f.role);
            const restorable = onToggleRemove && isRemoved && userRemoved.has(f.filename.toLowerCase());
            return (
              <tr key={`${f.status}-${f.filename}`} className={isRemoved || isIgnored ? 'opacity-60' : ''}>
                <td className="px-3 py-2">
                  <div className={`font-mono text-gray-900 dark:text-gray-100 break-all ${isRemoved ? 'line-through' : ''}`}>
                    {f.filename}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {isIgnored ? f.reason : isRemoved ? `entfällt – ${f.reason}` : f.role_label}
                    {f.target === 'template_dir' && !isRemoved && ' · PC-DMIS-Vorlagenverzeichnis'}
                    {f.role === 'calibration' && !isRemoved && ' · Unterordner Kalibrierung'}
                  </div>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(f.filesize)}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {FILE_STATUS[f.status] && (
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${FILE_STATUS[f.status].className}`}>
                      {FILE_STATUS[f.status].label}
                    </span>
                  )}
                  {isIgnored && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                      Aussortiert
                    </span>
                  )}
                  {removable && (
                    <button type="button" onClick={() => onToggleRemove(f.filename)}
                      className="ml-2 text-xs text-red-600 dark:text-red-400 hover:underline">
                      entfernen
                    </button>
                  )}
                  {restorable && (
                    <button type="button" onClick={() => onToggleRemove(f.filename)}
                      className="ml-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                      behalten
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
