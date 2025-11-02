import { create } from 'zustand';
import axios from '../utils/axios';
import { API_ENDPOINTS } from '../config/api';

export const usePartsStore = create((set, get) => ({
  // State
  parts: [],
  currentPart: null,
  stats: null,
  loading: false,
  error: null,

  // Filters
  filters: {
    customer_id: null,
    status: null,
    search: '',
  },

  // Fetch all parts
  fetchParts: async (filters = {}) => {
    try {
      set({ loading: true, error: null });
      
      // Build query string
      const params = new URLSearchParams();
      if (filters.customer_id) params.append('customer_id', filters.customer_id);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      
      const url = `${API_ENDPOINTS.PARTS}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);
      
      set({ 
        parts: response.data.parts,
        loading: false 
      });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Fehler beim Laden der Bauteile';
      set({ 
        loading: false, 
        error: errorMessage 
      });
    }
  },

  // Fetch single part
  fetchPart: async (id) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.get(`${API_ENDPOINTS.PARTS}/${id}`);
      
      set({ 
        currentPart: response.data.part,
        loading: false 
      });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Fehler beim Laden des Bauteils';
      set({ 
        loading: false, 
        error: errorMessage 
      });
    }
  },

  // Create part
  createPart: async (partData) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.post(API_ENDPOINTS.PARTS, partData);
      
      // Add to list
      set(state => ({ 
        parts: [...state.parts, response.data.part],
        loading: false 
      }));
      
      return { success: true, part: response.data.part };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Fehler beim Erstellen des Bauteils';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  },

  // Update part
  updatePart: async (id, partData) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.put(`${API_ENDPOINTS.PARTS}/${id}`, partData);
      
      // Update in list
      set(state => ({ 
        parts: state.parts.map(p => p.id === id ? response.data.part : p),
        currentPart: state.currentPart?.id === id ? response.data.part : state.currentPart,
        loading: false 
      }));
      
      return { success: true, part: response.data.part };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Fehler beim Aktualisieren des Bauteils';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  },

  // Delete part
  deletePart: async (id) => {
    try {
      set({ loading: true, error: null });
      
      await axios.delete(`${API_ENDPOINTS.PARTS}/${id}`);
      
      // Remove from list
      set(state => ({ 
        parts: state.parts.filter(p => p.id !== id),
        loading: false 
      }));
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Fehler beim Löschen des Bauteils';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  },

  // Fetch stats
  fetchStats: async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.PARTS_STATS);
      set({ stats: response.data });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  },

  // Set filters
  setFilters: (filters) => {
    set({ filters });
    get().fetchParts(filters);
  },

  // Clear error
  clearError: () => set({ error: null }),
}));
