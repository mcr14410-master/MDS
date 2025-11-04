// frontend/src/stores/operationsStore.js
import { create } from 'zustand';
import axios from '../utils/axios';
import { API_ENDPOINTS } from '../config/api';

export const useOperationsStore = create((set, get) => ({
  // State
  operations: [],
  currentOperation: null,
  loading: false,
  error: null,

  // Fetch all operations (optional filter by part_id)
  fetchOperations: async (partId = null) => {
    try {
      set({ loading: true, error: null });
      
      const url = partId 
        ? `${API_ENDPOINTS.OPERATIONS}?part_id=${partId}`
        : API_ENDPOINTS.OPERATIONS;
      
      const response = await axios.get(url);
      
      set({ 
        operations: response.data.data || [],
        loading: false 
      });
    } catch (error) {
      console.error('fetchOperations error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden der Arbeitsgänge';
      set({ 
        loading: false, 
        error: errorMessage,
        operations: []
      });
    }
  },

  // Fetch single operation
  fetchOperation: async (id) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.get(`${API_ENDPOINTS.OPERATIONS}/${id}`);
      
      set({ 
        currentOperation: response.data.data,
        loading: false 
      });
    } catch (error) {
      console.error('fetchOperation error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden des Arbeitsgangs';
      set({ 
        loading: false, 
        error: errorMessage 
      });
    }
  },

  // Create operation
  createOperation: async (operationData) => {
    try {
      set({ loading: true, error: null });
      
      console.log('Creating operation with data:', operationData);
      const response = await axios.post(API_ENDPOINTS.OPERATIONS, operationData);
      console.log('Create response:', response.data);
      
      // Add to list
      set(state => ({ 
        operations: [...state.operations, response.data.data],
        loading: false 
      }));
      
      return { success: true, operation: response.data.data };
    } catch (error) {
      console.error('createOperation error:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Erstellen des Arbeitsgangs';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  // Update operation
  updateOperation: async (id, operationData) => {
    try {
      set({ loading: true, error: null });
      
      console.log('Updating operation', id, 'with data:', operationData);
      const response = await axios.put(`${API_ENDPOINTS.OPERATIONS}/${id}`, operationData);
      console.log('Update response:', response.data);
      
      // Update in list
      set(state => ({ 
        operations: state.operations.map(op => op.id === parseInt(id) ? response.data.data : op),
        currentOperation: state.currentOperation?.id === parseInt(id) ? response.data.data : state.currentOperation,
        loading: false 
      }));
      
      return { success: true, operation: response.data.data };
    } catch (error) {
      console.error('updateOperation error:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Aktualisieren des Arbeitsgangs';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  // Delete operation
  deleteOperation: async (id) => {
    try {
      set({ loading: true, error: null });
      
      await axios.delete(`${API_ENDPOINTS.OPERATIONS}/${id}`);
      
      // Remove from list
      set(state => ({ 
        operations: state.operations.filter(op => op.id !== parseInt(id)),
        loading: false 
      }));
      
      return { success: true };
    } catch (error) {
      console.error('deleteOperation error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Löschen des Arbeitsgangs';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Clear operations list (useful when switching parts)
  clearOperations: () => set({ operations: [], currentOperation: null }),
}));