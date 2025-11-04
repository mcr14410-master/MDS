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
        parts: response.data.parts || [],
        loading: false 
      });
    } catch (error) {
      console.error('fetchParts error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden der Bauteile';
      set({ 
        loading: false, 
        error: errorMessage,
        parts: []
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
      console.error('fetchPart error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden des Bauteils';
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
      
      console.log('Creating part with data:', partData);
      const response = await axios.post(API_ENDPOINTS.PARTS, partData);
      console.log('Create response:', response.data);
      
      // Add to list
      set(state => ({ 
        parts: [...state.parts, response.data.part],
        loading: false 
      }));
      
      return { success: true, part: response.data.part };
    } catch (error) {
      console.error('createPart error:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Erstellen des Bauteils';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      
      // Throw error so form can catch it
      throw new Error(errorMessage);
    }
  },

  // Update part
  updatePart: async (id, partData) => {
    try {
      set({ loading: true, error: null });
      
      console.log('Updating part', id, 'with data:', partData);
      const response = await axios.put(`${API_ENDPOINTS.PARTS}/${id}`, partData);
      console.log('Update response:', response.data);
      
      // Update in list
      set(state => ({ 
        parts: state.parts.map(p => p.id === parseInt(id) ? response.data.part : p),
        currentPart: state.currentPart?.id === parseInt(id) ? response.data.part : state.currentPart,
        loading: false 
      }));
      
      return { success: true, part: response.data.part };
    } catch (error) {
      console.error('updatePart error:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Aktualisieren des Bauteils';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      
      // Throw error so form can catch it
      throw new Error(errorMessage);
    }
  },

  // Delete part
  deletePart: async (id) => {
    try {
      set({ loading: true, error: null });
      
      await axios.delete(`${API_ENDPOINTS.PARTS}/${id}`);
      
      // Remove from list
      set(state => ({ 
        parts: state.parts.filter(p => p.id !== parseInt(id)),
        loading: false 
      }));
      
      return { success: true };
    } catch (error) {
      console.error('deletePart error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Löschen des Bauteils';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      
      // Throw error so caller can catch it
      throw new Error(errorMessage);
    }
  },

  // Fetch stats
  fetchStats: async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.PARTS_STATS);
      set({ stats: response.data.stats || response.data });
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
