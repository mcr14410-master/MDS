import { create } from 'zustand';
import axios from '../utils/axios';


export const useSuppliersStore = create((set, get) => ({
  // State
  suppliers: [],
  currentSupplier: null,
  loading: false,
  error: null,

  // Filters
  filters: {
    is_active: null,
    is_preferred: null,
    search: '',
    sort_by: 'name',
    sort_order: 'asc',
  },

  // Fetch all suppliers
  fetchSuppliers: async (filters = {}) => {
    try {
      set({ loading: true, error: null });
      
      // Build query string
      const params = new URLSearchParams();
      if (filters.is_active !== null && filters.is_active !== undefined) {
        params.append('is_active', filters.is_active);
      }
      if (filters.is_preferred !== null && filters.is_preferred !== undefined) {
        params.append('is_preferred', filters.is_preferred);
      }
      if (filters.search) params.append('search', filters.search);
      if (filters.sort_by) params.append('sort_by', filters.sort_by);
      if (filters.sort_order) params.append('sort_order', filters.sort_order);
      
      const url = `/api/suppliers${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);
      
      set({ 
        suppliers: response.data.data || [],
        loading: false 
      });
    } catch (error) {
      console.error('fetchSuppliers error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der Lieferanten';
      set({ 
        loading: false, 
        error: errorMessage,
        suppliers: []
      });
    }
  },

  // Fetch single supplier
  fetchSupplier: async (id) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.get(`/api/suppliers/${id}`);
      
      set({ 
        currentSupplier: response.data.data,
        loading: false 
      });
      
      return response.data.data;
    } catch (error) {
      console.error('fetchSupplier error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden des Lieferanten';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw error;
    }
  },

  // Create supplier
  createSupplier: async (supplierData) => {
    try {
      set({ loading: true, error: null });
      
      console.log('Creating supplier with data:', supplierData);
      const response = await axios.post(`/api/suppliers`, supplierData);
      console.log('Create response:', response.data);
      
      // Add to list
      set(state => ({ 
        suppliers: [...state.suppliers, response.data.data],
        loading: false 
      }));
      
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('createSupplier error:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || 'Fehler beim Erstellen des Lieferanten';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  // Update supplier
  updateSupplier: async (id, supplierData) => {
    try {
      set({ loading: true, error: null });
      
      console.log('Updating supplier', id, 'with data:', supplierData);
      const response = await axios.put(`/api/suppliers/${id}`, supplierData);
      console.log('Update response:', response.data);
      
      // Update in list
      set(state => ({ 
        suppliers: state.suppliers.map(s => s.id === parseInt(id) ? response.data.data : s),
        currentSupplier: state.currentSupplier?.id === parseInt(id) ? response.data.data : state.currentSupplier,
        loading: false 
      }));
      
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('updateSupplier error:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || 'Fehler beim Aktualisieren des Lieferanten';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  // Delete supplier
  deleteSupplier: async (id, hardDelete = false) => {
    try {
      set({ loading: true, error: null });
      
      const url = `/api/suppliers/${id}${hardDelete ? '?hard_delete=true' : ''}`;
      await axios.delete(url);
      
      // Remove from list or update is_active
      if (hardDelete) {
        set(state => ({ 
          suppliers: state.suppliers.filter(s => s.id !== parseInt(id)),
          loading: false 
        }));
      } else {
        // Soft delete: update is_active to false
        set(state => ({ 
          suppliers: state.suppliers.map(s => 
            s.id === parseInt(id) ? { ...s, is_active: false } : s
          ),
          loading: false 
        }));
      }
      
      return { success: true };
    } catch (error) {
      console.error('deleteSupplier error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Löschen des Lieferanten';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  // Get supplier items
  getSupplierItems: async (supplierId) => {
    try {
      const response = await axios.get(`/api/suppliers/${supplierId}/items`);
      return response.data.data || [];
    } catch (error) {
      console.error('getSupplierItems error:', error);
      throw error;
    }
  },

  // Set filters
  setFilters: (filters) => {
    set({ filters });
    get().fetchSuppliers(filters);
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Clear current supplier
  clearCurrentSupplier: () => set({ currentSupplier: null }),
}));
