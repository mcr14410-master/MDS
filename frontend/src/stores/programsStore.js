// frontend/src/stores/programsStore.js
import { create } from 'zustand';
import axios from '../utils/axios';
import { API_ENDPOINTS } from '../config/api';

// Stabile leere Liste für Arbeitsgänge, deren Programme noch nicht geladen sind
export const EMPTY_PROGRAMS = [];

// fn auf die Programmliste jedes Arbeitsgangs anwenden
const mapAllOperations = (byOperation, fn) =>
  Object.fromEntries(Object.entries(byOperation).map(([key, list]) => [key, fn(list)]));

export const useProgramsStore = create((set, get) => ({
  // State – Programme je Arbeitsgang ({ [operationId]: [...] }): mehrere Arbeitsgänge sind
  // gleichzeitig eingebunden, eine gemeinsame Liste würde die jeweils letzte Antwort überall zeigen
  programsByOperation: {},
  loadingByOperation: {},
  errorByOperation: {},
  currentProgram: null,
  loading: false,
  error: null,
  uploadProgress: 0,

  // Fetch programs of one operation
  fetchPrograms: async (operationId) => {
    set(state => ({
      loadingByOperation: { ...state.loadingByOperation, [operationId]: true },
      errorByOperation: { ...state.errorByOperation, [operationId]: null },
    }));
    try {
      const response = await axios.get(`${API_ENDPOINTS.PROGRAMS}?operation_id=${operationId}`);
      
      // Sicherstellen dass es ein Array ist
      const programsData = response.data?.data;
      const validPrograms = Array.isArray(programsData) ? programsData : [];
      
      set(state => ({
        programsByOperation: { ...state.programsByOperation, [operationId]: validPrograms },
        loadingByOperation: { ...state.loadingByOperation, [operationId]: false },
      }));
      return validPrograms;
    } catch (error) {
      console.error('fetchPrograms error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden der Programme';
      set(state => ({
        programsByOperation: { ...state.programsByOperation, [operationId]: [] },
        loadingByOperation: { ...state.loadingByOperation, [operationId]: false },
        errorByOperation: { ...state.errorByOperation, [operationId]: errorMessage },
      }));
      return [];
    }
  },

  // Übersichtsseiten NC-Programme / Messprogramme (seitenweise, über alle Bauteile)
  overviewPrograms: [],
  overviewTotal: 0,
  overviewStats: null,
  overviewLoading: false,
  overviewError: null,

  fetchProgramsOverview: async (params) => {
    set({ overviewLoading: true, overviewError: null });
    try {
      const query = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
      ).toString();
      const response = await axios.get(`${API_ENDPOINTS.PROGRAMS}?${query}`);
      set({
        overviewPrograms: Array.isArray(response.data?.data) ? response.data.data : [],
        overviewTotal: response.data?.total || 0,
        overviewLoading: false,
      });
    } catch (error) {
      console.error('fetchProgramsOverview error:', error);
      set({
        overviewPrograms: [],
        overviewTotal: 0,
        overviewLoading: false,
        overviewError: error.response?.data?.error || 'Fehler beim Laden der Programme',
      });
    }
  },

  fetchProgramStats: async (kind) => {
    const response = await axios.get(`${API_ENDPOINTS.PROGRAMS}/stats?kind=${kind}`);
    set({ overviewStats: response.data?.data || null });
  },

  // Messprogramme (KMG): Dateigruppe hochladen. programId = null → neues Programm.
  // dryRun → nur prüfen, Antwort ist die Vorschau ({ valid, errors, files, removed, ... })
  // Drei Upload-Bereiche: files (Messprogramm), templateFiles (Excel-Vorlage), calibrationFiles
  uploadCmm: async ({ programId = null, fields, files, templateFiles = [], calibrationFiles = [], remove = [], dryRun = false }) => {
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) formData.append(key, value);
    });
    remove.forEach((name) => formData.append('remove', name));
    files.forEach((file) => formData.append('files', file, file.name));
    templateFiles.forEach((file) => formData.append('template_files', file, file.name));
    calibrationFiles.forEach((file) => formData.append('calibration_files', file, file.name));
    const url = programId
      ? `${API_ENDPOINTS.PROGRAMS}/${programId}/cmm-revisions`
      : `${API_ENDPOINTS.PROGRAMS}/cmm`;
    try {
      const response = await axios.post(`${url}${dryRun ? '?dry_run=true' : ''}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data;
    } catch (error) {
      console.error('uploadCmm error:', error);
      const data = error.response?.data;
      const err = new Error(data?.error || 'Fehler beim Hochladen des Messprogramms');
      err.details = data?.details || [];
      throw err;
    }
  },

  fetchCmmFiles: async (programId, version = null) => {
    const response = await axios.get(
      `${API_ENDPOINTS.PROGRAMS}/${programId}/files${version ? `?version=${encodeURIComponent(version)}` : ''}`
    );
    return response.data.data;
  },

  // Fetch single program
  fetchProgram: async (id) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.get(`${API_ENDPOINTS.PROGRAMS}/${id}`);
      
      set({ 
        currentProgram: response.data.data,
        loading: false 
      });
    } catch (error) {
      console.error('fetchProgram error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden des Programms';
      set({ 
        loading: false, 
        error: errorMessage 
      });
    }
  },

  // Upload program (with file)
  uploadProgram: async (formData, onUploadProgress) => {
    try {
      set({ loading: true, error: null, uploadProgress: 0 });
      
      const response = await axios.post(API_ENDPOINTS.PROGRAMS, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          set({ uploadProgress: percentCompleted });
          if (onUploadProgress) {
            onUploadProgress(percentCompleted);
          }
        },
      });
      
      // Add to list of its operation (mit Null-Check)
      const newProgram = response.data?.data;
      if (newProgram && newProgram.id) {
        set(state => {
          const list = state.programsByOperation[newProgram.operation_id];
          return {
            programsByOperation: list
              ? { ...state.programsByOperation, [newProgram.operation_id]: [...list, newProgram] }
              : state.programsByOperation,
            loading: false,
            uploadProgress: 0
          };
        });
      } else {
        console.error('Invalid program response:', response.data);
        set({ loading: false, uploadProgress: 0 });
      }
      
      return { success: true, program: newProgram };
    } catch (error) {
      console.error('uploadProgram error:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Hochladen des Programms';
      set({ 
        loading: false, 
        error: errorMessage,
        uploadProgress: 0
      });
      
      throw new Error(errorMessage);
    }
  },

  // Update program metadata (not the file)
  updateProgram: async (id, programData) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.put(`${API_ENDPOINTS.PROGRAMS}/${id}`, programData);
      
      // Update in list
      set(state => ({ 
        programsByOperation: mapAllOperations(state.programsByOperation,
          list => list.map(prog => prog.id === parseInt(id) ? response.data.data : prog)),
        currentProgram: state.currentProgram?.id === parseInt(id) ? response.data.data : state.currentProgram,
        loading: false 
      }));
      
      return { success: true, program: response.data.data };
    } catch (error) {
      console.error('updateProgram error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Aktualisieren des Programms';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  // Delete program
  deleteProgram: async (id) => {
    try {
      set({ loading: true, error: null });
      
      await axios.delete(`${API_ENDPOINTS.PROGRAMS}/${id}`);
      
      // Remove from list
      set(state => ({ 
        programsByOperation: mapAllOperations(state.programsByOperation,
          list => list.filter(prog => prog.id !== parseInt(id))),
        loading: false 
      }));
      
      return { success: true };
    } catch (error) {
      console.error('deleteProgram error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Löschen des Programms';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  // Download program
  downloadProgram: async (id, filename) => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.PROGRAMS}/${id}/download`, {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('downloadProgram error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Herunterladen des Programms';
      throw new Error(errorMessage);
    }
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Clear programs list
  clearPrograms: () => set({ programsByOperation: {}, loadingByOperation: {}, errorByOperation: {}, currentProgram: null }),

  // --- VERSIONIERUNG (Woche 7) ---
  
  // Fetch all revisions for a program
  fetchRevisions: async (programId) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.get(`${API_ENDPOINTS.PROGRAMS}/${programId}/revisions`);
      
      set({ loading: false });
      // Backend gibt { data: { program, revisions, total } } zurück
      return response.data.data?.revisions || [];
    } catch (error) {
      console.error('fetchRevisions error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der Versionen';
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Upload new revision
  uploadRevision: async (programId, formData, onUploadProgress) => {
    try {
      set({ loading: true, error: null, uploadProgress: 0 });
      
      const response = await axios.post(
        `${API_ENDPOINTS.PROGRAMS}/${programId}/revisions`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            set({ uploadProgress: percentCompleted });
            if (onUploadProgress) onUploadProgress(percentCompleted);
          },
        }
      );
      
      set({ loading: false, uploadProgress: 0 });
      return response.data.data;
    } catch (error) {
      console.error('uploadRevision error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Hochladen der Revision';
      set({ loading: false, error: errorMessage, uploadProgress: 0 });
      throw new Error(errorMessage);
    }
  },

  // Compare two revisions
  compareRevisions: async (programId, fromVersion, toVersion) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.get(
        `${API_ENDPOINTS.PROGRAMS}/${programId}/compare?from=${fromVersion}&to=${toVersion}`
      );
      
      set({ loading: false });
      return response.data.data;
    } catch (error) {
      console.error('compareRevisions error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Vergleichen der Versionen';
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Rollback to a specific version
  rollbackProgram: async (programId, versionTo) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.post(
        `${API_ENDPOINTS.PROGRAMS}/${programId}/rollback?to=${versionTo}`
      );
      
      set({ loading: false });
      return response.data.data;
    } catch (error) {
      console.error('rollbackProgram error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Rollback';
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Delete a specific revision (requires backend endpoint)
  deleteRevision: async (programId, revisionId) => {
    try {
      set({ loading: true, error: null });
      
      await axios.delete(
        `${API_ENDPOINTS.PROGRAMS}/${programId}/revisions/${revisionId}`
      );
      
      set({ loading: false });
      return { success: true };
    } catch (error) {
      console.error('deleteRevision error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Löschen der Revision';
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },
}));
