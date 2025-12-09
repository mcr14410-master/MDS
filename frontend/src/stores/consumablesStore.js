import { create } from 'zustand';
import axios from '../utils/axios';

export const useConsumablesStore = create((set, get) => ({
  // State
  consumables: [],
  categories: [],
  currentConsumable: null,
  reorderList: [],
  loading: false,
  error: null,

  // Filters
  filters: {
    category_id: null,
    supplier_id: null,
    stock_status: null,
    is_active: true,
    is_hazardous: null,
    search: '',
    sort_by: 'name',
    sort_order: 'asc',
  },

  setFilters: (newFilters) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters }
    }));
  },

  // ============================================================================
  // CATEGORIES
  // ============================================================================

  fetchCategories: async () => {
    try {
      const response = await axios.get('/api/consumable-categories');
      set({ categories: response.data.data || [] });
      return response.data.data;
    } catch (error) {
      console.error('fetchCategories error:', error);
      throw error;
    }
  },

  createCategory: async (data) => {
    try {
      const response = await axios.post('/api/consumable-categories', data);
      set(state => ({
        categories: [...state.categories, response.data.data]
      }));
      return response.data.data;
    } catch (error) {
      console.error('createCategory error:', error);
      throw new Error(error.response?.data?.message || 'Fehler beim Erstellen der Kategorie');
    }
  },

  updateCategory: async (id, data) => {
    try {
      const response = await axios.put(`/api/consumable-categories/${id}`, data);
      set(state => ({
        categories: state.categories.map(c => c.id === parseInt(id) ? response.data.data : c)
      }));
      return response.data.data;
    } catch (error) {
      console.error('updateCategory error:', error);
      throw new Error(error.response?.data?.message || 'Fehler beim Aktualisieren der Kategorie');
    }
  },

  deleteCategory: async (id) => {
    try {
      await axios.delete(`/api/consumable-categories/${id}`);
      set(state => ({
        categories: state.categories.filter(c => c.id !== parseInt(id))
      }));
    } catch (error) {
      console.error('deleteCategory error:', error);
      throw new Error(error.response?.data?.message || 'Fehler beim Löschen der Kategorie');
    }
  },

  // ============================================================================
  // CONSUMABLES
  // ============================================================================

  fetchConsumables: async (filters = {}) => {
    try {
      set({ loading: true, error: null });

      const params = new URLSearchParams();
      if (filters.category_id) params.append('category_id', filters.category_id);
      if (filters.supplier_id) params.append('supplier_id', filters.supplier_id);
      if (filters.stock_status) params.append('stock_status', filters.stock_status);
      if (filters.is_active !== null && filters.is_active !== undefined) {
        params.append('is_active', filters.is_active);
      }
      if (filters.is_hazardous !== null && filters.is_hazardous !== undefined) {
        params.append('is_hazardous', filters.is_hazardous);
      }
      if (filters.search) params.append('search', filters.search);
      if (filters.sort_by) params.append('sort_by', filters.sort_by);
      if (filters.sort_order) params.append('sort_order', filters.sort_order);

      const url = `/api/consumables${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);

      set({
        consumables: response.data.data || [],
        loading: false
      });
      return response.data.data;
    } catch (error) {
      console.error('fetchConsumables error:', error);
      set({
        loading: false,
        error: error.response?.data?.message || 'Fehler beim Laden der Verbrauchsmaterialien',
        consumables: []
      });
    }
  },

  fetchConsumable: async (id) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.get(`/api/consumables/${id}`);

      set({
        currentConsumable: response.data.data,
        loading: false
      });

      return response.data.data;
    } catch (error) {
      console.error('fetchConsumable error:', error);
      set({
        loading: false,
        error: error.response?.data?.message || 'Fehler beim Laden'
      });
      throw error;
    }
  },

  createConsumable: async (data) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.post('/api/consumables', data);

      set(state => ({
        consumables: [...state.consumables, response.data.data],
        loading: false
      }));

      return response.data.data;
    } catch (error) {
      console.error('createConsumable error:', error);
      set({ loading: false });
      throw new Error(error.response?.data?.message || 'Fehler beim Erstellen');
    }
  },

  updateConsumable: async (id, data) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.put(`/api/consumables/${id}`, data);

      set(state => ({
        consumables: state.consumables.map(c => c.id === parseInt(id) ? response.data.data : c),
        currentConsumable: state.currentConsumable?.id === parseInt(id) ? response.data.data : state.currentConsumable,
        loading: false
      }));

      return response.data.data;
    } catch (error) {
      console.error('updateConsumable error:', error);
      set({ loading: false });
      throw new Error(error.response?.data?.message || 'Fehler beim Aktualisieren');
    }
  },

  deleteConsumable: async (id) => {
    try {
      set({ loading: true, error: null });

      await axios.delete(`/api/consumables/${id}`);

      set(state => ({
        consumables: state.consumables.filter(c => c.id !== parseInt(id)),
        loading: false
      }));
    } catch (error) {
      console.error('deleteConsumable error:', error);
      set({ loading: false });
      throw new Error(error.response?.data?.message || 'Fehler beim Löschen');
    }
  },

  // ============================================================================
  // STATUS (NEU - Vereinfacht)
  // ============================================================================

  updateStatus: async (id, status) => {
    try {
      const response = await axios.patch(`/api/consumables/${id}/status`, { stock_status: status });
      
      set(state => ({
        consumables: state.consumables.map(c => 
          c.id === parseInt(id) ? { ...c, stock_status: status } : c
        ),
        currentConsumable: state.currentConsumable?.id === parseInt(id) 
          ? { ...state.currentConsumable, stock_status: status } 
          : state.currentConsumable
      }));

      return response.data;
    } catch (error) {
      console.error('updateStatus error:', error);
      throw new Error(error.response?.data?.message || 'Fehler beim Aktualisieren des Status');
    }
  },

  // ============================================================================
  // REORDER LIST (NEU)
  // ============================================================================

  fetchReorderList: async () => {
    try {
      const response = await axios.get('/api/consumables/reorder-list');
      set({ reorderList: response.data || [] });
      return response.data;
    } catch (error) {
      console.error('fetchReorderList error:', error);
      throw error;
    }
  },

  resetStatusFromOrder: async (orderId) => {
    try {
      const response = await axios.post(`/api/consumables/reset-status-from-order/${orderId}`);
      // Refresh lists
      await get().fetchConsumables(get().filters);
      await get().fetchReorderList();
      return response.data;
    } catch (error) {
      console.error('resetStatusFromOrder error:', error);
      throw new Error(error.response?.data?.message || 'Fehler beim Zurücksetzen');
    }
  },

  // ============================================================================
  // LOCATIONS (NEU)
  // ============================================================================

  fetchLocations: async (consumableId) => {
    try {
      const response = await axios.get(`/api/consumables/${consumableId}/locations`);
      return response.data;
    } catch (error) {
      console.error('fetchLocations error:', error);
      throw error;
    }
  },

  addLocation: async (consumableId, data) => {
    try {
      const response = await axios.post(`/api/consumables/${consumableId}/locations`, data);
      
      // Update currentConsumable locations if loaded
      const current = get().currentConsumable;
      if (current?.id === parseInt(consumableId)) {
        set({
          currentConsumable: {
            ...current,
            locations: [...(current.locations || []), response.data]
          }
        });
      }
      
      return response.data;
    } catch (error) {
      console.error('addLocation error:', error);
      throw new Error(error.response?.data?.message || 'Fehler beim Hinzufügen des Lagerorts');
    }
  },

  updateLocation: async (consumableId, locationId, data) => {
    try {
      const response = await axios.put(`/api/consumables/${consumableId}/locations/${locationId}`, data);
      
      // Update currentConsumable locations
      const current = get().currentConsumable;
      if (current?.id === parseInt(consumableId) && current.locations) {
        set({
          currentConsumable: {
            ...current,
            locations: current.locations.map(loc => 
              loc.id === parseInt(locationId) ? { ...loc, ...response.data } : loc
            )
          }
        });
      }
      
      return response.data;
    } catch (error) {
      console.error('updateLocation error:', error);
      throw new Error(error.response?.data?.message || 'Fehler beim Aktualisieren');
    }
  },

  removeLocation: async (consumableId, locationId) => {
    try {
      await axios.delete(`/api/consumables/${consumableId}/locations/${locationId}`);
      
      // Update currentConsumable locations
      const current = get().currentConsumable;
      if (current?.id === parseInt(consumableId) && current.locations) {
        set({
          currentConsumable: {
            ...current,
            locations: current.locations.filter(loc => loc.id !== parseInt(locationId))
          }
        });
      }
    } catch (error) {
      console.error('removeLocation error:', error);
      throw new Error(error.response?.data?.message || 'Fehler beim Entfernen');
    }
  },

  // ============================================================================
  // DOCUMENTS
  // ============================================================================

  fetchDocuments: async (consumableId) => {
    try {
      const response = await axios.get(`/api/consumables/${consumableId}/documents`);
      return response.data.data || [];
    } catch (error) {
      console.error('fetchDocuments error:', error);
      throw error;
    }
  },

  uploadDocument: async (consumableId, formData) => {
    try {
      const response = await axios.post(
        `/api/consumables/${consumableId}/documents`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data.data;
    } catch (error) {
      console.error('uploadDocument error:', error);
      throw new Error(error.response?.data?.message || 'Fehler beim Hochladen');
    }
  },

  deleteDocument: async (documentId) => {
    try {
      await axios.delete(`/api/consumable-documents/${documentId}`);
    } catch (error) {
      console.error('deleteDocument error:', error);
      throw new Error(error.response?.data?.message || 'Fehler beim Löschen');
    }
  },

  setPrimaryImage: async (documentId) => {
    try {
      await axios.put(`/api/consumable-documents/${documentId}/primary`);
    } catch (error) {
      console.error('setPrimaryImage error:', error);
      throw new Error(error.response?.data?.message || 'Fehler beim Setzen des Hauptbilds');
    }
  },

  // ============================================================================
  // STORAGE LOCATION QUERIES
  // ============================================================================

  fetchByStorageLocation: async (locationId) => {
    try {
      const response = await axios.get(`/api/consumables/by-storage-location/${locationId}`);
      return response.data || [];
    } catch (error) {
      console.error('fetchByStorageLocation error:', error);
      return [];
    }
  },

  fetchByCompartment: async (compartmentId) => {
    try {
      const response = await axios.get(`/api/consumables/by-compartment/${compartmentId}`);
      return response.data || [];
    } catch (error) {
      console.error('fetchByCompartment error:', error);
      return [];
    }
  },

  // ============================================================================
  // HELPERS
  // ============================================================================

  clearCurrentConsumable: () => {
    set({ currentConsumable: null });
  },

  clearError: () => {
    set({ error: null });
  },

  // Status Labels & Colors
  getStatusInfo: (status) => {
    const statusMap = {
      ok: { label: 'OK', color: 'green', icon: '✓' },
      low: { label: 'Wird knapp', color: 'yellow', icon: '⚠' },
      reorder: { label: 'Nachbestellen', color: 'red', icon: '!' }
    };
    return statusMap[status] || statusMap.ok;
  }
}));
