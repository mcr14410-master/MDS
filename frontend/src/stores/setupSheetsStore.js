// frontend/src/stores/setupSheetsStore.js
import { create } from 'zustand';
import axios from '../utils/axios';
import { API_ENDPOINTS } from '../config/api';

export const useSetupSheetsStore = create((set, get) => ({
  // State
  setupSheets: [],
  currentSetupSheet: null,
  loading: false,
  error: null,
  uploadProgress: 0,

  // Fetch all setup sheets (optional filter by operation_id, machine_id, status)
  fetchSetupSheets: async (filters = {}) => {
    try {
      set({ loading: true, error: null });
      
      const params = new URLSearchParams();
      if (filters.operation_id) params.append('operation_id', filters.operation_id);
      if (filters.machine_id) params.append('machine_id', filters.machine_id);
      if (filters.status) params.append('status', filters.status);
      
      const url = `${API_ENDPOINTS.SETUP_SHEETS}${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await axios.get(url);
      
      const setupSheetsData = response.data?.data;
      const validSetupSheets = Array.isArray(setupSheetsData) ? setupSheetsData : [];
      
      set({ 
        setupSheets: validSetupSheets,
        loading: false 
      });
    } catch (error) {
      console.error('fetchSetupSheets error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der Einrichteblätter';
      set({ 
        loading: false, 
        error: errorMessage,
        setupSheets: []
      });
    }
  },

  // Fetch single setup sheet (with photos)
  fetchSetupSheet: async (id) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.get(`${API_ENDPOINTS.SETUP_SHEETS}/${id}`);
      
      set({ 
        currentSetupSheet: response.data.data,
        loading: false 
      });
      
      return response.data.data;
    } catch (error) {
      console.error('fetchSetupSheet error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden des Einrichteblatts';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw error;
    }
  },

  // Create setup sheet
  createSetupSheet: async (data) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.post(API_ENDPOINTS.SETUP_SHEETS, data);
      
      const newSetupSheet = response.data?.data;
      if (newSetupSheet && newSetupSheet.id) {
        set(state => ({ 
          setupSheets: [...state.setupSheets, newSetupSheet],
          currentSetupSheet: newSetupSheet,
          loading: false
        }));
      } else {
        set({ loading: false });
      }
      
      return { success: true, setupSheet: newSetupSheet };
    } catch (error) {
      console.error('createSetupSheet error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Erstellen des Einrichteblatts';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  },

  // Update setup sheet
  updateSetupSheet: async (id, data) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.put(`${API_ENDPOINTS.SETUP_SHEETS}/${id}`, data);
      
      const updatedSetupSheet = response.data?.data;
      if (updatedSetupSheet) {
        set(state => ({
          setupSheets: state.setupSheets.map(sheet => 
            sheet.id === id ? updatedSetupSheet : sheet
          ),
          currentSetupSheet: state.currentSetupSheet?.id === id 
            ? updatedSetupSheet 
            : state.currentSetupSheet,
          loading: false
        }));
      } else {
        set({ loading: false });
      }
      
      return { success: true, setupSheet: updatedSetupSheet };
    } catch (error) {
      console.error('updateSetupSheet error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Aktualisieren des Einrichteblatts';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  },

  // Delete setup sheet
  deleteSetupSheet: async (id) => {
    try {
      set({ loading: true, error: null });
      
      await axios.delete(`${API_ENDPOINTS.SETUP_SHEETS}/${id}`);
      
      set(state => ({
        setupSheets: state.setupSheets.filter(sheet => sheet.id !== id),
        currentSetupSheet: state.currentSetupSheet?.id === id ? null : state.currentSetupSheet,
        loading: false
      }));
      
      return { success: true };
    } catch (error) {
      console.error('deleteSetupSheet error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Löschen des Einrichteblatts';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  },

  // Upload photo
  uploadPhoto: async (setupSheetId, formData, onUploadProgress) => {
    try {
      set({ loading: true, error: null, uploadProgress: 0 });
      
      const response = await axios.post(
        `${API_ENDPOINTS.SETUP_SHEETS}/${setupSheetId}/photos`, 
        formData,
        {
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
        }
      );
      
      // Refresh current setup sheet to get updated photos
      if (get().currentSetupSheet?.id === setupSheetId) {
        await get().fetchSetupSheet(setupSheetId);
      }
      
      set({ loading: false, uploadProgress: 0 });
      
      return { success: true, photo: response.data?.data };
    } catch (error) {
      console.error('uploadPhoto error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Hochladen des Fotos';
      set({ 
        loading: false, 
        error: errorMessage,
        uploadProgress: 0
      });
      return { success: false, error: errorMessage };
    }
  },

  // Update photo metadata
  updatePhoto: async (setupSheetId, photoId, data) => {
    try {
      set({ loading: true, error: null });
      
      await axios.put(
        `${API_ENDPOINTS.SETUP_SHEETS}/${setupSheetId}/photos/${photoId}`, 
        data
      );
      
      // Refresh current setup sheet to get updated photos
      if (get().currentSetupSheet?.id === setupSheetId) {
        await get().fetchSetupSheet(setupSheetId);
      }
      
      set({ loading: false });
      
      return { success: true };
    } catch (error) {
      console.error('updatePhoto error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Aktualisieren des Fotos';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  },

  // Delete photo
  deletePhoto: async (setupSheetId, photoId) => {
    try {
      set({ loading: true, error: null });
      
      await axios.delete(
        `${API_ENDPOINTS.SETUP_SHEETS}/${setupSheetId}/photos/${photoId}`
      );
      
      // Refresh current setup sheet to get updated photos
      if (get().currentSetupSheet?.id === setupSheetId) {
        await get().fetchSetupSheet(setupSheetId);
      }
      
      set({ loading: false });
      
      return { success: true };
    } catch (error) {
      console.error('deletePhoto error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Löschen des Fotos';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Clear current setup sheet
  clearCurrentSetupSheet: () => set({ currentSetupSheet: null }),

  // ============================================================================
  // SPANNMITTEL ZUORDNUNGEN
  // ============================================================================

  // Add clamping device to setup sheet
  addClampingDevice: async (setupSheetId, clampingDeviceId, quantity = 1, notes = '') => {
    try {
      const response = await axios.post(
        `${API_ENDPOINTS.SETUP_SHEETS}/${setupSheetId}/clamping-devices`,
        { clamping_device_id: clampingDeviceId, quantity, notes }
      );
      
      // Refresh current setup sheet
      if (get().currentSetupSheet?.id === setupSheetId) {
        await get().fetchSetupSheet(setupSheetId);
      }
      
      return { success: true, data: response.data?.data };
    } catch (error) {
      console.error('addClampingDevice error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Hinzufügen';
      return { success: false, error: errorMessage };
    }
  },

  // Update clamping device assignment
  updateClampingDevice: async (setupSheetId, itemId, data) => {
    try {
      const response = await axios.put(
        `${API_ENDPOINTS.SETUP_SHEETS}/${setupSheetId}/clamping-devices/${itemId}`,
        data
      );
      
      if (get().currentSetupSheet?.id === setupSheetId) {
        await get().fetchSetupSheet(setupSheetId);
      }
      
      return { success: true, data: response.data?.data };
    } catch (error) {
      console.error('updateClampingDevice error:', error);
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Remove clamping device from setup sheet
  removeClampingDevice: async (setupSheetId, itemId) => {
    try {
      await axios.delete(
        `${API_ENDPOINTS.SETUP_SHEETS}/${setupSheetId}/clamping-devices/${itemId}`
      );
      
      if (get().currentSetupSheet?.id === setupSheetId) {
        await get().fetchSetupSheet(setupSheetId);
      }
      
      return { success: true };
    } catch (error) {
      console.error('removeClampingDevice error:', error);
      return { success: false, error: error.response?.data?.message };
    }
  },

  // ============================================================================
  // VORRICHTUNGEN ZUORDNUNGEN
  // ============================================================================

  // Add fixture to setup sheet
  addFixture: async (setupSheetId, fixtureId, quantity = 1, notes = '') => {
    try {
      const response = await axios.post(
        `${API_ENDPOINTS.SETUP_SHEETS}/${setupSheetId}/fixtures`,
        { fixture_id: fixtureId, quantity, notes }
      );
      
      if (get().currentSetupSheet?.id === setupSheetId) {
        await get().fetchSetupSheet(setupSheetId);
      }
      
      return { success: true, data: response.data?.data };
    } catch (error) {
      console.error('addFixture error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Hinzufügen';
      return { success: false, error: errorMessage };
    }
  },

  // Update fixture assignment
  updateFixture: async (setupSheetId, itemId, data) => {
    try {
      const response = await axios.put(
        `${API_ENDPOINTS.SETUP_SHEETS}/${setupSheetId}/fixtures/${itemId}`,
        data
      );
      
      if (get().currentSetupSheet?.id === setupSheetId) {
        await get().fetchSetupSheet(setupSheetId);
      }
      
      return { success: true, data: response.data?.data };
    } catch (error) {
      console.error('updateFixture error:', error);
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Remove fixture from setup sheet
  removeFixture: async (setupSheetId, itemId) => {
    try {
      await axios.delete(
        `${API_ENDPOINTS.SETUP_SHEETS}/${setupSheetId}/fixtures/${itemId}`
      );
      
      if (get().currentSetupSheet?.id === setupSheetId) {
        await get().fetchSetupSheet(setupSheetId);
      }
      
      return { success: true };
    } catch (error) {
      console.error('removeFixture error:', error);
      return { success: false, error: error.response?.data?.message };
    }
  },
}));
