/**
 * Altbestand-Import: dünne Schicht über die vorhandenen MDS-Schnittstellen
 * (Spec: docs/konzepte/ALTBESTAND_IMPORT_SPEC.md, 8 – keine eigene Import-Schnittstelle)
 *
 * Jede Funktion gibt die Nutzdaten zurück und wirft bei Fehlern einen Error mit der Servermeldung.
 */
import axios from '../axios';
import { pickCmmOperation } from './match.js';

function apiError(error, fallback) {
  const data = error.response?.data;
  const err = new Error(data?.error || data?.message || fallback);
  err.details = data?.details || [];
  return err;
}

async function get(url, pick, fallback) {
  try {
    const response = await axios.get(url);
    return pick(response.data);
  } catch (error) {
    throw apiError(error, fallback);
  }
}

export const listCustomers = () => get('/api/customers', d => d.data, 'Kunden konnten nicht geladen werden');
export const listMachines = () => get('/api/machines', d => d.data, 'Maschinen konnten nicht geladen werden');
export const listOperationTypes = () => get('/api/operation-types', d => d, 'Arbeitsgang-Typen konnten nicht geladen werden');
export const listWorkflowStates = () => get('/api/workflow/states', d => d.data, 'Workflow-Status konnten nicht geladen werden');
export const listParts = (customerId) =>
  get(`/api/parts?customer_id=${encodeURIComponent(customerId)}`, d => d.parts, 'Bauteile konnten nicht geladen werden');
export const listOperations = (partId) =>
  get(`/api/operations?part_id=${encodeURIComponent(partId)}`, d => d.data, 'Arbeitsgänge konnten nicht geladen werden');
export const listCmmPrograms = (operationId) =>
  get(`/api/programs?operation_id=${encodeURIComponent(operationId)}&kind=cmm`, d => d.data, 'Messprogramme konnten nicht geladen werden');
export const listSetupSheets = (operationId) =>
  get(`/api/setup-sheets?operation_id=${encodeURIComponent(operationId)}`, d => d.data, 'Einrichteblätter konnten nicht geladen werden');
export const getSetupSheet = (id) =>
  get(`/api/setup-sheets/${id}`, d => d.data, 'Einrichteblatt konnte nicht geladen werden');
export const listPartDocuments = (partId) =>
  get(`/api/parts/${partId}/documents`, d => d.documents, 'Bauteil-Dokumente konnten nicht geladen werden');

/** Vorläufiger Stand je Bauteil: Mess-Arbeitsgang und Messprogramm (vollständig mit Übernehmen) */
export async function loadProgramState(partId, cmmMachineId) {
  const operation = pickCmmOperation(await listOperations(partId), cmmMachineId);
  const programs = operation ? await listCmmPrograms(operation.id) : [];
  return {
    operationId: operation?.id ?? null,
    programId: programs[0]?.id ?? null,
    programState: programs[0]?.workflow_state ?? null,
    setupSheetId: null,
    setupSheetState: null,
    photoNames: [],
    documentNames: [],
  };
}

export const legacyImportApi = {
  listCustomers,
  listMachines,
  listOperationTypes,
  listWorkflowStates,
  listParts,
  listOperations,
  listCmmPrograms,
  listSetupSheets,
  getSetupSheet,
  listPartDocuments,
};
