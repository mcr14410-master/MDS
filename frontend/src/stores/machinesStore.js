import { create } from 'zustand';
import axios from '../utils/axios';
import { API_ENDPOINTS } from '../config/api';

export const useMachinesStore = create((set, get) => ({
  // State
  machines: [],
  currentMachine: null,
  stats: null,
  operations: [],
  loading: false,
  error: null,

  // Filters
  filters: {
    machine_type: null,
    control_type: null,
    is_active: null,
    search: '',
  },

  // Fetch all machines
  fetchMachines: async (filters = {}) => {
    try {
      set({ loading: true, error: null });
      
      // Build query string
      const params = new URLSearchParams();
      if (filters.machine_type) params.append('machine_type', filters.machine_type);
      if (filters.control_type) params.append('control_type', filters.control_type);
      if (filters.is_active !== null && filters.is_active !== undefined && filters.is_active !== '') {
        params.append('is_active', filters.is_active);
      }
      if (filters.search) params.append('search', filters.search);
      
      const url = `${API_ENDPOINTS.MACHINES}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);
      
      set({ 
        machines: response.data.data || [],
        loading: false 
      });
    } catch (error) {
      console.error('fetchMachines error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden der Maschinen';
      set({ 
        loading: false, 
        error: errorMessage,
        machines: []
      });
    }
  },

  // Fetch single machine
  fetchMachine: async (id) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.get(`${API_ENDPOINTS.MACHINES}/${id}`);
      
      set({ 
        currentMachine: response.data.data,
        loading: false 
      });
      
      return response.data.data;
    } catch (error) {
      console.error('fetchMachine error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden der Maschine';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw new Error(errorMessage);
    }
  },

  // Fetch machine stats
  fetchMachineStats: async (id) => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.MACHINES}/${id}/stats`);
      set({ stats: response.data.data });
      return response.data.data;
    } catch (error) {
      console.error('fetchMachineStats error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden der Statistiken';
      throw new Error(errorMessage);
    }
  },

  // Fetch machine operations
  fetchMachineOperations: async (id) => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.MACHINES}/${id}/operations`);
      set({ operations: response.data.data || [] });
      return response.data.data || [];
    } catch (error) {
      console.error('fetchMachineOperations error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden der Arbeitsgänge';
      throw new Error(errorMessage);
    }
  },

  // Create machine
  createMachine: async (machineData) => {
    try {
      set({ loading: true, error: null });
      
      console.log('Creating machine with data:', machineData);
      const response = await axios.post(API_ENDPOINTS.MACHINES, machineData);
      console.log('Create response:', response.data);
      
      // Add to list
      set(state => ({ 
        machines: [...state.machines, response.data.data],
        loading: false 
      }));
      
      return { success: true, machine: response.data.data };
    } catch (error) {
      console.error('createMachine error:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Erstellen der Maschine';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  // Update machine
  updateMachine: async (id, machineData) => {
    try {
      set({ loading: true, error: null });
      
      console.log('Updating machine', id, 'with data:', machineData);
      const response = await axios.put(`${API_ENDPOINTS.MACHINES}/${id}`, machineData);
      console.log('Update response:', response.data);
      
      // Update in list
      set(state => ({ 
        machines: state.machines.map(m => m.id === parseInt(id) ? response.data.data : m),
        currentMachine: state.currentMachine?.id === parseInt(id) ? response.data.data : state.currentMachine,
        loading: false 
      }));
      
      return { success: true, machine: response.data.data };
    } catch (error) {
      console.error('updateMachine error:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Aktualisieren der Maschine';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  // Delete machine (soft delete by default)
  deleteMachine: async (id, hardDelete = false) => {
    try {
      set({ loading: true, error: null });
      
      const url = hardDelete 
        ? `${API_ENDPOINTS.MACHINES}/${id}?hard_delete=true`
        : `${API_ENDPOINTS.MACHINES}/${id}`;
      
      await axios.delete(url);
      
      // Remove from list or update is_active
      if (hardDelete) {
        set(state => ({ 
          machines: state.machines.filter(m => m.id !== parseInt(id)),
          loading: false 
        }));
      } else {
        // Soft delete - update is_active to false
        set(state => ({
          machines: state.machines.map(m => 
            m.id === parseInt(id) ? { ...m, is_active: false } : m
          ),
          loading: false
        }));
      }
      
      return { success: true };
    } catch (error) {
      console.error('deleteMachine error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Löschen der Maschine';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  // Set filters
  setFilters: (filters) => {
    set({ filters });
    get().fetchMachines(filters);
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Clear current machine
  clearCurrentMachine: () => set({ currentMachine: null, stats: null, operations: [] }),
}));
