// Messprogramme: Altbestand übernehmen (Spec: docs/konzepte/ALTBESTAND_IMPORT_SPEC.md)
// Ordner vom Netzlaufwerk einlesen, je Programm vorschlagen, was wohin übernommen wird.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FolderOpen, Info, AlertTriangle, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../components/Toaster';
import { filesFromEntry } from '../utils/fileEntries';
import { parseLegacyTree } from '../utils/legacyImport/parse.js';
import {
  matchCustomer, findPartCandidates, defaultCmmMachine, rowStatus, findImportedProgram,
} from '../utils/legacyImport/match.js';
import { legacyImportApi as api } from '../utils/legacyImport/api.js';
import { importProgram, loadImportState } from '../utils/legacyImport/runImport.js';
import { withSelection, selectionFromMds } from '../utils/legacyImport/selection.js';
import LegacyImportRow from '../components/legacyImport/LegacyImportRow';
import { STATUS_INFO } from '../components/legacyImport/statusInfo';
import ArchiveSettings from '../components/legacyImport/ArchiveSettings';

const REQUIRED_PERMISSIONS = ['part.create', 'setup_sheet.update', 'program.upload'];
const NO_CANDIDATES = { same: [], otherRevisions: [] };
const BASE_FEATURES = ['programs', 'setup_sheet', 'documents'];
const OP_DEFAULTS_KEY = 'mds.legacyImport.opDefaults';
// Stand im MDS hängt an den geplanten Arbeitsgängen (Name, OP-Nummer) – bei Änderung neu laden
const targetsKey = (row) => JSON.stringify((row.targets || []).map((t) => [t.path, t.opNumber, t.opName]));
const FIRST_OP_DEFAULTS = { op_number: 'KMG', op_name: 'Messen', operation_type_id: null };
const STEP_LABELS = {
  probelauf: 'Probelauf', bauteil: 'Bauteil', arbeitsgang: 'Arbeitsgang', messprogramm: 'Messprogramm',
  einrichteblatt: 'Einrichteblatt', fotos: 'Fotos', dokumente: 'Dokumente',
  freigabe_programm: 'Freigabe Messprogramm', freigabe_einrichteblatt: 'Freigabe Einrichteblatt',
};
const inputClass = 'px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white';

function readOpDefaults() {
  try {
    const saved = JSON.parse(localStorage.getItem(OP_DEFAULTS_KEY) || 'null');
    return saved ? { ...FIRST_OP_DEFAULTS, ...saved } : FIRST_OP_DEFAULTS;
  } catch {
    return FIRST_OP_DEFAULTS;
  }
}

// Vorgabe für die Bauteil-Auswahl, solange der Nutzer nichts gewählt hat
function defaultPartChoice(candidates) {
  if (candidates.same.length === 1) return candidates.same[0].id;
  if (candidates.same.length === 0) return 'new';
  return null; // mehrere Treffer: Nutzer wählt
}

export default function LegacyImportPage() {
  const { hasPermission } = useAuthStore();
  const missingPermissions = REQUIRED_PERMISSIONS.filter((p) => !hasPermission(p));
  const canRelease = hasPermission('program.release');

  const [programs, setPrograms] = useState([]);
  const [notices, setNotices] = useState([]);
  const [ctx, setCtx] = useState(null);                 // { customers, machines, operationTypes, workflowStates }
  const [partsByCustomer, setPartsByCustomer] = useState({});
  const [machineMap, setMachineMap] = useState({});     // Kürzel → Maschinen-ID
  const [rowState, setRowState] = useState({});         // key → { customerId, customerPartNumber, revision, name, partChoice, selection, fromMds }
  const [importStates, setImportStates] = useState({}); // key → { partId, machineId, state }
  const [reading, setReading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [opDefaults, setOpDefaults] = useState(readOpDefaults);
  const [release, setRelease] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [running, setRunning] = useState(null);           // key der Zeile, die gerade übernommen wird
  const [results, setResults] = useState({});             // key → { ok, steps }
  const loadingParts = useRef(new Set());
  const loadingStates = useRef(new Set());

  const loadContext = useCallback(async () => {
    if (ctx) return ctx;
    const [customers, machines, operationTypes, workflowStates] = await Promise.all([
      api.listCustomers(), api.listMachines(), api.listOperationTypes(), api.listWorkflowStates(),
    ]);
    const loaded = { customers, machines, operationTypes, workflowStates };
    setCtx(loaded);
    return loaded;
  }, [ctx]);

  const ensureParts = useCallback(async (customerId, force = false) => {
    if (!customerId || (!force && loadingParts.current.has(customerId))) return;
    loadingParts.current.add(customerId);
    try {
      const parts = await api.listParts(customerId);
      setPartsByCustomer((prev) => ({ ...prev, [customerId]: parts }));
    } catch (error) {
      loadingParts.current.delete(customerId);
      toast.error(error.message);
    }
  }, []);

  const onItems = async (items) => {
    if (items.length === 0) return;
    setReading(true);
    try {
      const context = await loadContext();
      const result = parseLegacyTree(items);
      // Schon übernommene Ordner am Herkunftsvermerk erkennen: Werte und Bauteil aus dem MDS
      const imported = await api.listAllCmmPrograms();
      const fromMds = {};
      await Promise.all(result.programs.filter((p) => !rowState[p.key]).map(async (p) => {
        const known = findImportedProgram(imported, p);
        if (!known?.part_id) return;
        try {
          const part = await api.getPart(known.part_id);
          fromMds[p.key] = {
            customerId: part.customer_id ?? null,
            customerPartNumber: part.customer_part_number ?? '',
            revision: part.revision ?? '',
            name: part.part_name ?? p.name,
            partChoice: part.id,
            fromMds: true,
          };
        } catch { /* Bauteil nicht lesbar – dann wie ein neuer Ordner */ }
      }));
      const initial = {};
      result.programs.forEach((p) => {
        // Schon bekannte Zeile: Eingaben (Revision, Bauteil-Wahl …) behalten
        if (rowState[p.key]) { initial[p.key] = rowState[p.key]; return; }
        if (fromMds[p.key]) { initial[p.key] = fromMds[p.key]; return; }
        initial[p.key] = {
          customerId: matchCustomer(p.customerNumber, context.customers)?.id ?? null,
          customerPartNumber: p.customerPartNumber,
          revision: p.revision ?? '',
          name: p.name,
          partChoice: undefined,
        };
      });
      const cmm = defaultCmmMachine(context.machines);
      setMachineMap((prev) => {
        const next = { ...prev };
        result.programs.forEach((p) => {
          if (!(p.machineCode in next)) next[p.machineCode] = cmm?.id ?? null;
        });
        return next;
      });
      setPrograms(result.programs);
      setNotices(result.notices);
      setRowState(initial);
      setImportStates({});
      setResults({});
      setSelected(new Set());
      loadingStates.current = new Set();
      [...new Set(Object.values(initial).map((s) => s.customerId).filter(Boolean))].forEach(ensureParts);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setReading(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const entries = [...(e.dataTransfer.items || [])]
      .map((item) => (item.webkitGetAsEntry ? item.webkitGetAsEntry() : null))
      .filter(Boolean);
    const nested = await Promise.all(entries.map(filesFromEntry));
    onItems(nested.flat());
  };

  const updateRow = (key, patch) => {
    setRowState((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    if (patch.customerId) ensureParts(patch.customerId);
  };

  // Abgeleitete Zeilen: Kunde, Kandidaten, gewähltes Bauteil, Status
  const rows = useMemo(() => programs.map((program) => {
    const state = rowState[program.key];
    const customer = ctx?.customers.find((c) => c.id === state.customerId) || null;
    const candidates = customer
      ? findPartCandidates({ customerId: customer.id, customerPartNumber: state.customerPartNumber, revision: state.revision },
        partsByCustomer[customer.id] || [])
      : NO_CANDIDATES;
    const partChoice = state.partChoice !== undefined ? state.partChoice : defaultPartChoice(candidates);
    const machineId = machineMap[program.machineCode] ?? null;
    // Eingetragene Revision behebt „Revision fehlt“
    const parsed = state.revision.trim()
      ? { ...program, errors: program.errors.filter((e) => !e.startsWith('Revision fehlt')) }
      : program;
    const chosenPart = typeof partChoice === 'number'
      ? [...candidates.same, ...candidates.otherRevisions].find((p) => p.id === partChoice) : null;
    // Nur die ausgewählten Dateien zählen für Status und Übernehmen
    const effective = withSelection(parsed, state.selection, opDefaults);
    const loaded = importStates[program.key];
    const importState = chosenPart && loaded && loaded.partId === chosenPart.id && loaded.machineId === machineId
      && loaded.targetsKey === targetsKey(effective) ? loaded.state : null;
    const status = rowStatus({
      parsed: effective,
      customer,
      candidates: chosenPart ? { same: [chosenPart], otherRevisions: [] } : candidates,
      importState,
      release: release && canRelease,
    });
    return { program: effective, source: parsed, state, customer, candidates, partChoice, chosenPart, machineId, status };
  }), [programs, rowState, ctx, partsByCustomer, machineMap, importStates, release, canRelease, opDefaults]);

  // Aktueller Stand für „Markierte übernehmen“ (läuft über mehrere Renders)
  const rowsRef = useRef(rows);
  useEffect(() => { rowsRef.current = rows; }, [rows]);

  // Stand je gewähltem Bauteil nachladen (Mess-Arbeitsgang, Messprogramm)
  useEffect(() => {
    rows.forEach((row) => {
      if (!row.chosenPart || !row.machineId) return;
      const loaded = importStates[row.program.key];
      const key = targetsKey(row.program);
      if (loaded && loaded.partId === row.chosenPart.id && loaded.machineId === row.machineId && loaded.targetsKey === key) return;
      const flag = `${row.program.key}|${row.chosenPart.id}|${row.machineId}|${key}`;
      if (loadingStates.current.has(flag)) return;
      loadingStates.current.add(flag);
      loadImportState(api, row.chosenPart.id, row.machineId, row.program.targets, row.source)
        .then((state) => {
          setImportStates((prev) => ({
            ...prev, [row.program.key]: { partId: row.chosenPart.id, machineId: row.machineId, targetsKey: key, state },
          }));
          // Schon übernommen: Dateiauswahl einmalig auf den Stand im MDS setzen (damals Abgewähltes bleibt abgewählt)
          setRowState((prev) => {
            const rs = prev[row.program.key];
            if (!rs?.fromMds || rs.selection) return prev;
            return { ...prev, [row.program.key]: { ...rs, selection: selectionFromMds(row.source, state) } };
          });
        })
        .catch((error) => toast.error(error.message));
    });
  }, [rows, importStates]);

  const updateOpDefaults = (patch) => {
    const next = { ...opDefaults, ...patch };
    setOpDefaults(next);
    try { localStorage.setItem(OP_DEFAULTS_KEY, JSON.stringify(next)); } catch { /* ohne Speicher weiter */ }
  };

  const canImport = (row) => missingPermissions.length === 0 && row.machineId
    && row.status !== 'error' && row.status !== 'conflict' && row.status !== 'imported'
    && (row.partChoice === 'new' || row.partChoice === 'skip' || typeof row.partChoice === 'number');

  const runOne = async (row) => {
    const type = ctx.operationTypes.find((t) => t.id === opDefaults.operation_type_id);
    const enabledFeatures = [...new Set([...(type?.default_features || []), ...BASE_FEATURES])];
    setRunning(row.program.key);
    const result = await importProgram({
      row: {
        parsed: row.program,
        customerId: row.state.customerId,
        partChoice: row.partChoice,
        customerPartNumber: row.state.customerPartNumber.trim(),
        revision: row.state.revision.trim(),
        name: row.state.name.trim(),
      },
      settings: {
        cmmMachineId: row.machineId,
        opDefaults: { ...opDefaults, enabled_features: enabledFeatures },
        workflowStates: ctx.workflowStates,
      },
      api,
      release: release && canRelease,
    });
    setResults((prev) => ({ ...prev, [row.program.key]: result }));
    // Bauteile immer neu laden – auch wenn der Server ein Bauteil angelegt hat, die Antwort aber fehlte
    await ensureParts(row.state.customerId, true);
    if (result.partId) {
      // Zeile auf das (neue) Bauteil festlegen und Stand neu laden
      setRowState((prev) => ({ ...prev, [row.program.key]: { ...prev[row.program.key], partChoice: result.partId } }));
      setImportStates((prev) => {
        const next = { ...prev };
        delete next[row.program.key];
        return next;
      });
      loadingStates.current = new Set([...loadingStates.current].filter((f) => !f.startsWith(`${row.program.key}|`)));
    }
    setRunning(null);
    return result.ok;
  };

  const runSelected = async () => {
    let failed = 0;
    let done = 0;
    for (const key of [...selected]) {
      // Zeile jedes Mal frisch aus dem aktuellen Stand – frühere Läufe können Bauteile angelegt haben
      await new Promise((resolve) => { setTimeout(resolve, 50); });
      const row = rowsRef.current.find((r) => r.program.key === key);
      if (!row || !canImport(row)) continue;
      if (await runOne(row)) done++; else failed++;
    }
    setSelected(new Set());
    if (failed) toast.error(`${done} übernommen, ${failed} mit Fehler`);
    else toast.success(`${done} übernommen`);
  };

  const toggleSelected = (key) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const importable = rows.filter(canImport);
  const archiveEntries = rows
    .filter((r) => r.status === 'imported' && r.program.customerFolder)
    .map((r) => ({ customerFolder: r.program.customerFolder, programFolder: r.program.programFolder }));

  const counts = rows.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});
  const machineCodes = Object.keys(machineMap).filter((code) => programs.some((p) => p.machineCode === code));

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link to="/cmm-programs" className="mt-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="Zurück zu den Messprogrammen">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Altbestand übernehmen</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Messprogramme vom Netzlaufwerk einlesen – je Programm siehst du, was wohin übernommen wird
          </p>
        </div>
      </div>

      {missingPermissions.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Zum Übernehmen fehlen Rechte: {missingPermissions.join(', ')}. Einlesen und Ansehen geht trotzdem.</span>
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg px-6 py-6 transition-colors ${
          dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        <FolderOpen className="h-10 w-10 text-gray-400 dark:text-gray-500" />
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 text-center">
          Kunden- oder Quellordner hierher ziehen –{' '}
          <label className="cursor-pointer font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">
            Ordner wählen
            <input type="file" multiple webkitdirectory="" className="sr-only" data-testid="legacy-import-folder"
              onChange={(e) => {
                onItems([...e.target.files].map((file) => ({ file, path: file.webkitRelativePath || file.name })));
                e.target.value = '';
              }} />
          </label>
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center">
          Es wird nur die Dateiliste gelesen – hochgeladen wird erst beim Übernehmen
        </p>
        {reading && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Lese Ordner …</p>}
      </div>

      {notices.map((n) => (
        <div key={n} className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-800 dark:text-blue-300">
          <Info className="h-4 w-4 mt-0.5 shrink-0" /> {n}
        </div>
      ))}

      {programs.length > 0 && (
        <>
          <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-2">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Messmaschine je Kürzel</div>
            <div className="flex flex-wrap gap-4">
              {machineCodes.map((code) => (
                <label key={code} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <span className="font-mono">{code}</span>
                  <select value={machineMap[code] ?? ''}
                    onChange={(e) => setMachineMap((prev) => ({ ...prev, [code]: e.target.value ? Number(e.target.value) : null }))}
                    className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="">– Maschine wählen –</option>
                    {(ctx?.machines || []).map((m) => (
                      <option key={m.id} value={m.id}>{m.name}{m.measuring_equipment_id != null ? ' (KMG)' : ''}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-2">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Vorgaben für neue Arbeitsgänge</div>
            <div className="flex flex-wrap gap-4 items-end">
              <label className="text-xs text-gray-600 dark:text-gray-400 flex flex-col">
                OP-Nummer
                <input value={opDefaults.op_number} onChange={(e) => updateOpDefaults({ op_number: e.target.value })} className={inputClass} />
              </label>
              <label className="text-xs text-gray-600 dark:text-gray-400 flex flex-col">
                Name
                <input value={opDefaults.op_name} onChange={(e) => updateOpDefaults({ op_name: e.target.value })} className={inputClass} />
              </label>
              <label className="text-xs text-gray-600 dark:text-gray-400 flex flex-col">
                Arbeitsgang-Typ
                <select value={opDefaults.operation_type_id ?? ''} className={inputClass}
                  onChange={(e) => updateOpDefaults({ operation_type_id: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">– ohne Typ –</option>
                  {(ctx?.operationTypes || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              {canRelease && (
                <label className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <input type="checkbox" checked={release} onChange={(e) => setRelease(e.target.checked)} data-testid="legacy-import-release" />
                  Direkt freigeben (Grund „Erstimport Altbestand“)
                </label>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={runSelected}
              disabled={running !== null || ![...selected].some((k) => importable.some((r) => r.program.key === k))}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
              Markierte übernehmen ({[...selected].filter((k) => importable.some((r) => r.program.key === k)).length})
            </button>
            <button type="button" onClick={() => setSelected(new Set(importable.map((r) => r.program.key)))}
              disabled={running !== null || importable.length === 0}
              className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50">
              Alle übernehmbaren markieren
            </button>
            {running && <span className="text-sm text-gray-600 dark:text-gray-400">Übernehme {running} …</span>}
          </div>

          <div className="flex flex-wrap gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span>{programs.length} Programme:</span>
            {Object.entries(counts).map(([status, n]) => (
              <span key={status} className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_INFO[status].className}`}>
                {n} {STATUS_INFO[status].label}
              </span>
            ))}
          </div>

          <div className="space-y-3">
            {rows.map((row) => (
              <LegacyImportRow
                key={row.program.key}
                program={row.program}
                source={row.source}
                state={{ ...row.state, partChoice: row.partChoice }}
                customer={row.customer}
                candidates={row.candidates}
                status={row.status}
                customers={ctx?.customers || []}
                opDefaults={opDefaults}
                onChange={(patch) => updateRow(row.program.key, patch)}
              >
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <label className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <input type="checkbox" checked={selected.has(row.program.key)} disabled={!canImport(row) || running !== null}
                      onChange={() => toggleSelected(row.program.key)} />
                    markieren
                  </label>
                  <button type="button" onClick={() => runOne(row)} disabled={!canImport(row) || running !== null}
                    className="px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed">
                    {running === row.program.key ? 'Übernehme …' : 'Übernehmen'}
                  </button>
                  {!row.machineId && <span className="text-xs text-amber-700 dark:text-amber-400">Messmaschine für {row.program.machineCode} wählen</span>}
                </div>
                {results[row.program.key] && (
                  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" data-testid="legacy-import-steps">
                    {results[row.program.key].steps.map((step) => (
                      <li key={`${step.key}|${step.unitPath ?? ''}`} className={`flex items-center gap-1 ${
                        step.status === 'error' ? 'text-red-700 dark:text-red-400'
                          : step.status === 'done' ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {step.status === 'error' ? <XCircle className="h-3.5 w-3.5" />
                          : step.status === 'done' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <MinusCircle className="h-3.5 w-3.5" />}
                        {STEP_LABELS[step.key]}{step.unit ? ` (${step.unit})` : ''}{step.message ? `: ${step.message}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </LegacyImportRow>
            ))}
          </div>

          <ArchiveSettings entries={archiveEntries} />
        </>
      )}
    </div>
  );
}
