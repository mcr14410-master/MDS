import { create } from 'zustand';
import axios from '../utils/axios';

const API_BASE = '/api/storage';

export const useStorageStore = create((set, get) => ({
  // State
  locations: [],
  compartments: [],
  currentLocation: null,
  currentCompartment: null,
  loading: false,
  error: null,

  // Filters for locations
  locationFilters: {
    location_type: null,
    item_category: null,
    is_active: null,
    search: '',
    building: '',
    floor: '',
    room: '',
  },

  // Filters for compartments
  compartmentFilters: {
    location_id: null,
    compartment_type: null,
    is_active: null,
    search: '',
  },

  // ==========================================================================
  // STORAGE LOCATIONS
  // ==========================================================================

  /**
   * Fetch all storage locations with optional filters
   */
  fetchLocations: async (filters = {}) => {
    try {
      set({ loading: true, error: null });

      // Build query string
      const params = new URLSearchParams();
      if (filters.location_type) params.append('location_type', filters.location_type);
      if (filters.item_category) params.append('item_category', filters.item_category);
      if (filters.is_active !== null && filters.is_active !== undefined && filters.is_active !== '') {
        params.append('is_active', filters.is_active);
      }
      if (filters.search) params.append('search', filters.search);
      if (filters.building) params.append('building', filters.building);
      if (filters.floor) params.append('floor', filters.floor);
      if (filters.room) params.append('room', filters.room);

      const url = `${API_BASE}/locations${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);

      set({
        locations: response.data.data || [],
        loading: false,
      });
    } catch (error) {
      console.error('fetchLocations error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden der Lagerorte';
      set({
        loading: false,
        error: errorMessage,
        locations: [],
      });
    }
  },

  /**
   * Fetch single storage location by ID
   */
  fetchLocation: async (id) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.get(`${API_BASE}/locations/${id}`);

      set({
        currentLocation: response.data.data,
        loading: false,
      });

      return response.data.data;
    } catch (error) {
      console.error('fetchLocation error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden des Lagerorts';
      set({
        loading: false,
        error: errorMessage,
      });
      throw new Error(errorMessage);
    }
  },

  /**
   * Create new storage location
   */
  createLocation: async (locationData) => {
    try {
      set({ loading: true, error: null });

      console.log('Creating location with data:', locationData);
      const response = await axios.post(`${API_BASE}/locations`, locationData);
      console.log('Create response:', response.data);

      // Add to list
      set((state) => ({
        locations: [...state.locations, response.data.data],
        loading: false,
      }));

      return { success: true, location: response.data.data };
    } catch (error) {
      console.error('createLocation error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Erstellen des Lagerorts';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Update storage location
   */
  updateLocation: async (id, locationData) => {
    try {
      set({ loading: true, error: null });

      console.log('Updating location', id, 'with data:', locationData);
      const response = await axios.put(`${API_BASE}/locations/${id}`, locationData);
      console.log('Update response:', response.data);

      // Update in list
      set((state) => ({
        locations: state.locations.map((loc) => (loc.id === id ? response.data.data : loc)),
        currentLocation: state.currentLocation?.id === id ? response.data.data : state.currentLocation,
        loading: false,
      }));

      return { success: true, location: response.data.data };
    } catch (error) {
      console.error('updateLocation error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Aktualisieren des Lagerorts';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Delete storage location
   */
  deleteLocation: async (id) => {
    try {
      set({ loading: true, error: null });

      console.log('Deleting location', id);
      const response = await axios.delete(`${API_BASE}/locations/${id}`);
      console.log('Delete response:', response.data);

      // Remove from list
      set((state) => ({
        locations: state.locations.filter((loc) => loc.id !== id),
        currentLocation: state.currentLocation?.id === id ? null : state.currentLocation,
        loading: false,
      }));

      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('deleteLocation error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Löschen des Lagerorts';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Get compartments for a specific location
   */
  fetchCompartmentsByLocation: async (locationId) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.get(`${API_BASE}/locations/${locationId}/compartments`);

      set({
        compartments: response.data.data || [],
        loading: false,
      });

      return response.data.data || [];
    } catch (error) {
      console.error('fetchCompartmentsByLocation error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden der Fächer';
      set({
        loading: false,
        error: errorMessage,
        compartments: [],
      });
      throw new Error(errorMessage);
    }
  },

  // ==========================================================================
  // STORAGE COMPARTMENTS
  // ==========================================================================

  /**
   * Fetch all storage compartments with optional filters
   */
  fetchCompartments: async (filters = {}) => {
    try {
      set({ loading: true, error: null });

      // Build query string
      const params = new URLSearchParams();
      if (filters.location_id) params.append('location_id', filters.location_id);
      if (filters.compartment_type) params.append('compartment_type', filters.compartment_type);
      if (filters.is_active !== null && filters.is_active !== undefined && filters.is_active !== '') {
        params.append('is_active', filters.is_active);
      }
      if (filters.search) params.append('search', filters.search);

      const url = `${API_BASE}/compartments${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);

      set({
        compartments: response.data.data || [],
        loading: false,
      });
    } catch (error) {
      console.error('fetchCompartments error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden der Fächer';
      set({
        loading: false,
        error: errorMessage,
        compartments: [],
      });
    }
  },

  /**
   * Fetch single storage compartment by ID
   */
  fetchCompartment: async (id) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.get(`${API_BASE}/compartments/${id}`);

      set({
        currentCompartment: response.data.data,
        loading: false,
      });

      return response.data.data;
    } catch (error) {
      console.error('fetchCompartment error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden des Fachs';
      set({
        loading: false,
        error: errorMessage,
      });
      throw new Error(errorMessage);
    }
  },

  /**
   * Create new storage compartment
   */
  createCompartment: async (compartmentData) => {
    try {
      set({ loading: true, error: null });

      console.log('Creating compartment with data:', compartmentData);
      const response = await axios.post(`${API_BASE}/compartments`, compartmentData);
      console.log('Create response:', response.data);

      // Add to list
      set((state) => ({
        compartments: [...state.compartments, response.data.data],
        loading: false,
      }));

      return { success: true, compartment: response.data.data };
    } catch (error) {
      console.error('createCompartment error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Erstellen des Fachs';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Update storage compartment
   */
  updateCompartment: async (id, compartmentData) => {
    try {
      set({ loading: true, error: null });

      console.log('Updating compartment', id, 'with data:', compartmentData);
      const response = await axios.put(`${API_BASE}/compartments/${id}`, compartmentData);
      console.log('Update response:', response.data);

      // Update in list
      set((state) => ({
        compartments: state.compartments.map((comp) => (comp.id === id ? response.data.data : comp)),
        currentCompartment: state.currentCompartment?.id === id ? response.data.data : state.currentCompartment,
        loading: false,
      }));

      return { success: true, compartment: response.data.data };
    } catch (error) {
      console.error('updateCompartment error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Aktualisieren des Fachs';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Delete storage compartment
   */
  deleteCompartment: async (id) => {
    try {
      set({ loading: true, error: null });

      console.log('Deleting compartment', id);
      const response = await axios.delete(`${API_BASE}/compartments/${id}`);
      console.log('Delete response:', response.data);

      // Remove from list
      set((state) => ({
        compartments: state.compartments.filter((comp) => comp.id !== id),
        currentCompartment: state.currentCompartment?.id === id ? null : state.currentCompartment,
        loading: false,
      }));

      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('deleteCompartment error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Löschen des Fachs';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  // ==========================================================================
  // UTILITY FUNCTIONS
  // ==========================================================================

  /**
   * Set location filters
   */
  setLocationFilters: (filters) => {
    set({ locationFilters: { ...get().locationFilters, ...filters } });
  },

  /**
   * Set compartment filters
   */
  setCompartmentFilters: (filters) => {
    set({ compartmentFilters: { ...get().compartmentFilters, ...filters } });
  },

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),

  /**
   * Reset store
   */
  reset: () => set({
    locations: [],
    compartments: [],
    currentLocation: null,
    currentCompartment: null,
    loading: false,
    error: null,
  }),
}));
