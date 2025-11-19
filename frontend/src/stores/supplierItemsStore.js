import { create } from 'zustand';
import axios from '../utils/axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const useSupplierItemsStore = create((set, get) => ({
  // State
  supplierItems: [],
  loading: false,
  error: null,

  // Get suppliers for a storage item
  getItemSuppliers: async (storageItemId) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.get(`${API_BASE_URL}/api/storage/items/${storageItemId}/suppliers`);
      
      set({ 
        supplierItems: response.data.data || [],
        loading: false 
      });
      
      return response.data.data || [];
    } catch (error) {
      console.error('getItemSuppliers error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der Lieferanten';
      set({ 
        loading: false, 
        error: errorMessage,
        supplierItems: []
      });
      throw error;
    }
  },

  // Link supplier to item
  createSupplierItem: async (supplierItemData) => {
    try {
      set({ loading: true, error: null });
      
      console.log('Creating supplier item with data:', supplierItemData);
      const response = await axios.post(`${API_BASE_URL}/api/supplier-items`, supplierItemData);
      console.log('Create response:', response.data);
      
      // Add to list
      set(state => ({ 
        supplierItems: [...state.supplierItems, response.data.data],
        loading: false 
      }));
      
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('createSupplierItem error:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || 'Fehler beim Verknüpfen des Lieferanten';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  // Update supplier item
  updateSupplierItem: async (id, supplierItemData) => {
    try {
      set({ loading: true, error: null });
      
      console.log('Updating supplier item', id, 'with data:', supplierItemData);
      const response = await axios.put(`${API_BASE_URL}/api/supplier-items/${id}`, supplierItemData);
      console.log('Update response:', response.data);
      
      // Update in list
      set(state => ({ 
        supplierItems: state.supplierItems.map(si => 
          si.id === parseInt(id) ? response.data.data : si
        ),
        loading: false 
      }));
      
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('updateSupplierItem error:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || 'Fehler beim Aktualisieren der Verknüpfung';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  // Remove supplier from item
  deleteSupplierItem: async (id) => {
    try {
      set({ loading: true, error: null });
      
      await axios.delete(`${API_BASE_URL}/api/supplier-items/${id}`);
      
      // Remove from list
      set(state => ({ 
        supplierItems: state.supplierItems.filter(si => si.id !== parseInt(id)),
        loading: false 
      }));
      
      return { success: true };
    } catch (error) {
      console.error('deleteSupplierItem error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Entfernen des Lieferanten';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  // Set as preferred supplier
  setPreferredSupplier: async (id) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.put(`${API_BASE_URL}/api/supplier-items/${id}/preferred`);
      
      // Update all items: set preferred only for this one
      set(state => ({ 
        supplierItems: state.supplierItems.map(si => ({
          ...si,
          is_preferred: si.id === parseInt(id)
        })),
        loading: false 
      }));
      
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('setPreferredSupplier error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Setzen des bevorzugten Lieferanten';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      
      throw new Error(errorMessage);
    }
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Clear supplier items
  clearSupplierItems: () => set({ supplierItems: [] }),
}));
