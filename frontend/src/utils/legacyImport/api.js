/**
 * Altbestand-Import: dünne Schicht über die vorhandenen MDS-Schnittstellen
 * (Spec: docs/konzepte/ALTBESTAND_IMPORT_SPEC.md, 8 – keine eigene Import-Schnittstelle)
 *
 * Jede Funktion gibt die Nutzdaten zurück und wirft bei Fehlern einen Error mit der Servermeldung.
 */
import axios from '../axios';

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
// Alle Messprogramme (ohne Seiten) – zum Wiedererkennen schon übernommener Ordner am Herkunftsvermerk
export const listAllCmmPrograms = () =>
  get('/api/programs?kind=cmm', d => d.data, 'Messprogramme konnten nicht geladen werden');
export const getPart = (id) => get(`/api/parts/${id}`, d => d.part, 'Bauteil konnte nicht geladen werden');
export const listPartDocuments = (partId) =>
  get(`/api/parts/${partId}/documents`, d => d.documents, 'Bauteil-Dokumente konnten nicht geladen werden');

async function send(method, url, body, pick, fallback) {
  try {
    const response = await axios[method](url, body, body instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined);
    return pick(response.data);
  } catch (error) {
    throw apiError(error, fallback);
  }
}

// Messprogramm-Dateien in die drei Upload-Bereiche wie programsStore.uploadCmm
function cmmForm(fields, { files = [], templateFiles = [], calibrationFiles = [] }) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) form.append(key, value);
  });
  files.forEach((file) => form.append('files', file, file.name));
  templateFiles.forEach((file) => form.append('template_files', file, file.name));
  calibrationFiles.forEach((file) => form.append('calibration_files', file, file.name));
  return form;
}

export const dryRunCmm = (groups) =>
  send('post', '/api/programs/cmm?dry_run=true', cmmForm({}, groups), d => d.data, 'Probelauf des Messprogramms fehlgeschlagen');
export const createCmmProgram = ({ operation_id, program_name, comment, description, ...groups }) =>
  send('post', '/api/programs/cmm', cmmForm({ operation_id, program_name, comment, description }, groups), d => d.data, 'Messprogramm konnte nicht angelegt werden');
export const createPart = (body) => send('post', '/api/parts', body, d => d.part, 'Bauteil konnte nicht angelegt werden');
export const createOperation = (body) => send('post', '/api/operations', body, d => d.data, 'Arbeitsgang konnte nicht angelegt werden');
// Antwort: { success, data: Datensatz } (setupSheetsController.createSetupSheet)
export const createSetupSheet = (body) => send('post', '/api/setup-sheets', body, d => d.data, 'Einrichteblatt konnte nicht angelegt werden');
export function uploadSetupPhoto(sheetId, file) {
  const form = new FormData();
  form.append('photo', file, file.name);
  return send('post', `/api/setup-sheets/${sheetId}/photos`, form, d => d.data, `Foto ${file.name} konnte nicht hochgeladen werden`);
}
export function uploadPartDocument(partId, file, { document_type, is_primary_cad }) {
  const form = new FormData();
  form.append('file', file, file.name);
  form.append('document_type', document_type);
  form.append('is_primary_cad', is_primary_cad ? 'true' : 'false');
  return send('post', `/api/parts/${partId}/documents`, form, d => d, `Dokument ${file.name} konnte nicht hochgeladen werden`);
}
export const workflowChange = ({ entityType, entityId, toStateId, changeReason }) =>
  send('post', '/api/workflow/change', { entityType, entityId, toStateId, changeReason }, d => d, 'Statuswechsel fehlgeschlagen');

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
  listAllCmmPrograms,
  getPart,
  dryRunCmm,
  createCmmProgram,
  createPart,
  createOperation,
  createSetupSheet,
  uploadSetupPhoto,
  uploadPartDocument,
  workflowChange,
};
