import { create } from 'zustand';
import axios from '../utils/axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const useCustomersStore = create((set, get) => ({
  // State
  customers: [],
  currentCustomer: null,
  customerParts: [],
  loading: false,
  error: null,

  // Filters
  filters: {
    is_active: null,
    search: '',
    sort_by: 'name',
    sort_order: 'asc',
  },

  // Fetch all customers
  fetchCustomers: async (filters = {}) => {
    try {
      set({ loading: true, error: null });
      
      // Build query string
      const params = new URLSearchParams();
      if (filters.is_active !== null && filters.is_active !== undefined) {
        params.append('is_active', filters.is_active);
      }
      if (filters.search) params.append('search', filters.search);
      if (filters.sort_by) params.append('sort_by', filters.sort_by);
      if (filters.sort_order) params.append('sort_order', filters.sort_order);
      
      const url = `${API_BASE_URL}/api/customers${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);
      
      set({ 
        customers: response.data.data || [],
        loading: false 
      });
    } catch (error) {
      console.error('fetchCustomers error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der Kunden';
      set({ 
        loading: false, 
        error: errorMessage,
        customers: []
      });
    }
  },

  // Fetch single customer
  fetchCustomer: async (id) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.get(`${API_BASE_URL}/api/customers/${id}`);
      
      set({ 
        currentCustomer: response.data.data,
        loading: false 
      });
      
      return response.data.data;
    } catch (error) {
      console.error('fetchCustomer error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden des Kunden';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw error;
    }
  },

  // Fetch customer parts
  fetchCustomerParts: async (customerId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/customers/${customerId}/parts`);
      set({ customerParts: response.data.data || [] });
      return response.data.data || [];
    } catch (error) {
      console.error('fetchCustomerParts error:', error);
      throw error;
    }
  },

  // Create customer
  createCustomer: async (customerData) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.post(`${API_BASE_URL}/api/customers`, customerData);
      
      // Add to list
      set(state => ({ 
        customers: [...state.customers, response.data.data],
        loading: false 
      }));
      
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('createCustomer error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Erstellen des Kunden';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw new Error(errorMessage);
    }
  },

  // Update customer
  updateCustomer: async (id, customerData) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.put(`${API_BASE_URL}/api/customers/${id}`, customerData);
      
      // Update in list
      set(state => ({ 
        customers: state.customers.map(c => c.id === parseInt(id) ? response.data.data : c),
        currentCustomer: state.currentCustomer?.id === parseInt(id) ? response.data.data : state.currentCustomer,
        loading: false 
      }));
      
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('updateCustomer error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Aktualisieren des Kunden';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw new Error(errorMessage);
    }
  },

  // Delete customer
  deleteCustomer: async (id, hardDelete = false) => {
    try {
      set({ loading: true, error: null });
      
      const url = `${API_BASE_URL}/api/customers/${id}${hardDelete ? '?hard_delete=true' : ''}`;
      await axios.delete(url);
      
      // Remove from list or update is_active
      if (hardDelete) {
        set(state => ({ 
          customers: state.customers.filter(c => c.id !== parseInt(id)),
          loading: false 
        }));
      } else {
        // Soft delete: update is_active to false
        set(state => ({ 
          customers: state.customers.map(c => 
            c.id === parseInt(id) ? { ...c, is_active: false } : c
          ),
          loading: false 
        }));
      }
      
      return { success: true };
    } catch (error) {
      console.error('deleteCustomer error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Löschen des Kunden';
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
    get().fetchCustomers(filters);
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Clear current customer
  clearCurrentCustomer: () => set({ currentCustomer: null, customerParts: [] }),
}));
