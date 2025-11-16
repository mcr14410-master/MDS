import { create } from 'zustand';
import axios from '../utils/axios';

export const useToolCompatibleInsertsStore = create((set, get) => ({
  // ============================================================================
  // STATE
  // ============================================================================
  compatibleInserts: [],
  availableInserts: [],
  loading: false,
  error: null,

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  /**
   * Fetch all compatible inserts for a tool
   */
  fetchCompatibleInserts: async (toolId) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.get(`/api/tools/${toolId}/compatible-inserts`);

      set({
        compatibleInserts: response.data.data || [],
        loading: false,
      });

      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('fetchCompatibleInserts error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden der kompatiblen Wendeschneidplatten';
      set({
        loading: false,
        error: errorMessage,
        compatibleInserts: [],
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Fetch available inserts (not yet linked to this tool)
   */
  fetchAvailableInserts: async (toolId, filters = {}) => {
    try {
      set({ loading: true, error: null });

      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.is_active !== undefined && filters.is_active !== '') {
        params.append('is_active', filters.is_active);
      }

      const url = `/api/tools/${toolId}/available-inserts${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);

      set({
        availableInserts: response.data.data || [],
        loading: false,
      });

      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('fetchAvailableInserts error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden der verfügbaren Wendeschneidplatten';
      set({
        loading: false,
        error: errorMessage,
        availableInserts: [],
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Add compatible insert to tool
   */
  addCompatibleInsert: async (toolId, data) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.post(`/api/tools/${toolId}/compatible-inserts`, data);

      // Add new insert to list
      set((state) => ({
        compatibleInserts: [response.data.data, ...state.compatibleInserts],
        loading: false,
      }));

      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      console.error('addCompatibleInsert error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Hinzufügen der Wendeschneidplatte';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Update compatible insert relationship
   */
  updateCompatibleInsert: async (compatibilityId, data) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.put(`/api/tool-compatible-inserts/${compatibilityId}`, data);

      // Update insert in list
      set((state) => ({
        compatibleInserts: state.compatibleInserts.map((insert) =>
          insert.id === compatibilityId ? response.data.data : insert
        ),
        loading: false,
      }));

      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      console.error('updateCompatibleInsert error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Aktualisieren der Wendeschneidplatte';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Delete compatible insert relationship
   */
  deleteCompatibleInsert: async (compatibilityId) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.delete(`/api/tool-compatible-inserts/${compatibilityId}`);

      // Remove insert from list
      set((state) => ({
        compatibleInserts: state.compatibleInserts.filter((insert) => insert.id !== compatibilityId),
        loading: false,
      }));

      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('deleteCompatibleInsert error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Löschen der Wendeschneidplatte';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Toggle preferred status
   */
  togglePreferred: async (compatibilityId, currentStatus) => {
    return get().updateCompatibleInsert(compatibilityId, {
      is_preferred: !currentStatus,
    });
  },

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Calculate total stock for an insert
   */
  getTotalStock: (insert) => {
    const stockNew = parseFloat(insert.insert_stock_new || 0);
    const stockUsed = parseFloat(insert.insert_stock_used || 0);
    const stockReground = parseFloat(insert.insert_stock_reground || 0);
    return stockNew + stockUsed + stockReground;
  },

  /**
   * Calculate effective stock for an insert (weighted)
   */
  getEffectiveStock: (insert) => {
    const stockNew = parseFloat(insert.insert_stock_new || 0);
    const stockUsed = parseFloat(insert.insert_stock_used || 0);
    const stockReground = parseFloat(insert.insert_stock_reground || 0);

    // Use default weights if not provided
    return stockNew * 1.0 + stockUsed * 0.5 + stockReground * 0.8;
  },

  /**
   * Check if insert stock is sufficient for tool quantity
   */
  hasEnoughStock: (insert, toolQuantity = 1) => {
    const totalStock = get().getTotalStock(insert);
    const requiredQuantity = (insert.quantity_per_tool || 1) * toolQuantity;
    return totalStock >= requiredQuantity;
  },

  /**
   * Get stock status for insert
   */
  getStockStatus: (insert) => {
    const totalStock = get().getTotalStock(insert);
    const requiredQuantity = insert.quantity_per_tool || 1;

    if (totalStock === 0) return 'out-of-stock';
    if (totalStock < requiredQuantity) return 'low-stock';
    if (totalStock < requiredQuantity * 3) return 'warning';
    return 'ok';
  },

  /**
   * Get stock status color
   */
  getStockStatusColor: (status) => {
    const colors = {
      'out-of-stock': 'red',
      'low-stock': 'orange',
      'warning': 'yellow',
      'ok': 'green',
    };
    return colors[status] || 'gray';
  },

  /**
   * Get stock status text
   */
  getStockStatusText: (status) => {
    const texts = {
      'out-of-stock': 'Nicht verfügbar',
      'low-stock': 'Niedriger Bestand',
      'warning': 'Bestand niedrig',
      'ok': 'Verfügbar',
    };
    return texts[status] || 'Unbekannt';
  },

  /**
   * Sort inserts (preferred first, then by tool number)
   */
  sortInserts: (inserts) => {
    return [...inserts].sort((a, b) => {
      // Preferred first
      if (a.is_preferred !== b.is_preferred) {
        return a.is_preferred ? -1 : 1;
      }
      // Then by tool number
      return (a.insert_tool_number || '').localeCompare(b.insert_tool_number || '');
    });
  },

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),

  /**
   * Reset store
   */
  reset: () => set({
    compatibleInserts: [],
    availableInserts: [],
    loading: false,
    error: null,
  }),
}));
