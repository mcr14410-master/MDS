// Messprogramme: Altbestand übernehmen (Spec: docs/konzepte/ALTBESTAND_IMPORT_SPEC.md)
// Ordner vom Netzlaufwerk einlesen, je Programm vorschlagen, was wohin übernommen wird.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FolderOpen, Info, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../components/Toaster';
import { filesFromEntry } from '../utils/fileEntries';
import { parseLegacyTree } from '../utils/legacyImport/parse.js';
import {
  matchCustomer, findPartCandidates, defaultCmmMachine, rowStatus,
} from '../utils/legacyImport/match.js';
import { legacyImportApi as api, loadProgramState } from '../utils/legacyImport/api.js';
import LegacyImportRow from '../components/legacyImport/LegacyImportRow';
import { STATUS_INFO } from '../components/legacyImport/statusInfo';

const REQUIRED_PERMISSIONS = ['part.create', 'setup_sheet.update', 'program.upload'];
const NO_CANDIDATES = { same: [], otherRevisions: [] };

// Vorgabe für die Bauteil-Auswahl, solange der Nutzer nichts gewählt hat
function defaultPartChoice(candidates) {
  if (candidates.same.length === 1) return candidates.same[0].id;
  if (candidates.same.length === 0) return 'new';
  return null; // mehrere Treffer: Nutzer wählt
}

export default function LegacyImportPage() {
  const { hasPermission } = useAuthStore();
  const missingPermissions = REQUIRED_PERMISSIONS.filter((p) => !hasPermission(p));

  const [programs, setPrograms] = useState([]);
  const [notices, setNotices] = useState([]);
  const [ctx, setCtx] = useState(null);                 // { customers, machines, operationTypes, workflowStates }
  const [partsByCustomer, setPartsByCustomer] = useState({});
  const [machineMap, setMachineMap] = useState({});     // Kürzel → Maschinen-ID
  const [rowState, setRowState] = useState({});         // key → { customerId, customerPartNumber, revision, name, partChoice }
  const [importStates, setImportStates] = useState({}); // key → { partId, machineId, state }
  const [reading, setReading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
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

  const ensureParts = useCallback(async (customerId) => {
    if (!customerId || loadingParts.current.has(customerId)) return;
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
      const initial = {};
      result.programs.forEach((p) => {
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
    const loaded = importStates[program.key];
    const importState = chosenPart && loaded && loaded.partId === chosenPart.id && loaded.machineId === machineId
      ? loaded.state : null;
    const status = rowStatus({
      parsed,
      customer,
      candidates: chosenPart ? { same: [chosenPart], otherRevisions: [] } : candidates,
      importState,
    });
    return { program: parsed, state, customer, candidates, partChoice, chosenPart, machineId, status };
  }), [programs, rowState, ctx, partsByCustomer, machineMap, importStates]);

  // Stand je gewähltem Bauteil nachladen (Mess-Arbeitsgang, Messprogramm)
  useEffect(() => {
    rows.forEach((row) => {
      if (!row.chosenPart || !row.machineId) return;
      const loaded = importStates[row.program.key];
      if (loaded && loaded.partId === row.chosenPart.id && loaded.machineId === row.machineId) return;
      const flag = `${row.program.key}|${row.chosenPart.id}|${row.machineId}`;
      if (loadingStates.current.has(flag)) return;
      loadingStates.current.add(flag);
      loadProgramState(row.chosenPart.id, row.machineId)
        .then((state) => setImportStates((prev) => ({
          ...prev, [row.program.key]: { partId: row.chosenPart.id, machineId: row.machineId, state },
        })))
        .catch((error) => toast.error(error.message));
    });
  }, [rows, importStates]);

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
                state={{ ...row.state, partChoice: row.partChoice }}
                customer={row.customer}
                candidates={row.candidates}
                status={row.status}
                customers={ctx?.customers || []}
                onChange={(patch) => updateRow(row.program.key, patch)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
