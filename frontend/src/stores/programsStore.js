// frontend/src/stores/programsStore.js
import { create } from 'zustand';
import axios from '../utils/axios';
import { API_ENDPOINTS } from '../config/api';

export const useProgramsStore = create((set, get) => ({
  // State
  programs: [],
  currentProgram: null,
  loading: false,
  error: null,
  uploadProgress: 0,

  // Fetch all programs (optional filter by operation_id)
  fetchPrograms: async (operationId = null) => {
    try {
      set({ loading: true, error: null });
      
      const url = operationId 
        ? `${API_ENDPOINTS.PROGRAMS}?operation_id=${operationId}`
        : API_ENDPOINTS.PROGRAMS;
      
      const response = await axios.get(url);
      
      // Sicherstellen dass es ein Array ist
      const programsData = response.data?.data;
      const validPrograms = Array.isArray(programsData) ? programsData : [];
      
      set({ 
        programs: validPrograms,
        loading: false 
      });
    } catch (error) {
      console.error('fetchPrograms error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden der Programme';
      set({ 
        loading: false, 
        error: errorMessage,
        programs: []
      });
    }
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
      
      // Add to list (mit Null-Check)
      const newProgram = response.data?.data;
      if (newProgram && newProgram.id) {
        set(state => ({ 
          programs: [...state.programs, newProgram],
          loading: false,
          uploadProgress: 0
        }));
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
        programs: state.programs.map(prog => prog.id === parseInt(id) ? response.data.data : prog),
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
        programs: state.programs.filter(prog => prog.id !== parseInt(id)),
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
  clearPrograms: () => set({ programs: [], currentProgram: null }),
}));
