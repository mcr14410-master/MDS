import { create } from 'zustand';
import axios from '../utils/axios';

const API_BASE = '/api/tool-master';

export const useToolMasterStore = create((set, get) => ({
  // ============================================================================
  // STATE
  // ============================================================================
  tools: [],
  currentTool: null,
  loading: false,
  error: null,

  // Filters
  filters: {
    category_id: null,
    subcategory_id: null,
    item_type: null,
    tool_category: null,
    is_active: 'true',
    is_low_stock: null,
    manufacturer: '',
    search: '',
  },

  // Pagination
  pagination: {
    total: 0,
    limit: 20,
    offset: 0,
  },

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Fetch all tools with filters and pagination
   */
  fetchTools: async (customFilters = null, limit = 20, offset = 0) => {
    try {
      set({ loading: true, error: null });

      const filters = customFilters || get().filters;
      const params = new URLSearchParams();

      // Apply filters
      if (filters.category_id) {
        params.append('category_id', filters.category_id);
      }
      if (filters.subcategory_id) {
        params.append('subcategory_id', filters.subcategory_id);
      }
      if (filters.item_type) {
        params.append('item_type', filters.item_type);
      }
      if (filters.tool_category) {
        params.append('tool_category', filters.tool_category);
      }
      if (filters.is_active !== null && filters.is_active !== '') {
        params.append('is_active', filters.is_active);
      }
      if (filters.is_low_stock === 'true') {
        params.append('is_low_stock', 'true');
      }
      if (filters.manufacturer) {
        params.append('manufacturer', filters.manufacturer);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }

      // Pagination
      params.append('limit', limit);
      params.append('offset', offset);

      const url = `${API_BASE}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);

      set({
        tools: response.data.data || [],
        pagination: response.data.pagination || { total: 0, limit: 20, offset: 0 },
        loading: false,
      });
    } catch (error) {
      console.error('fetchTools error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden der Werkzeuge';
      set({
        loading: false,
        error: errorMessage,
        tools: [],
      });
    }
  },

  /**
   * Fetch single tool by ID
   */
  fetchToolById: async (id) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.get(`${API_BASE}/${id}`);

      set({
        currentTool: response.data.data,
        loading: false,
      });

      return response.data.data;
    } catch (error) {
      console.error('fetchToolById error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden des Werkzeugs';
      set({
        loading: false,
        error: errorMessage,
        currentTool: null,
      });
      throw new Error(errorMessage);
    }
  },

  /**
   * Fetch tools by category
   */
  fetchToolsByCategory: async (categoryId, limit = 20, offset = 0) => {
    try {
      set({ loading: true, error: null });

      const params = new URLSearchParams();
      params.append('limit', limit);
      params.append('offset', offset);

      const url = `${API_BASE}/category/${categoryId}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);

      set({
        tools: response.data.data || [],
        pagination: response.data.pagination || { total: 0, limit: 20, offset: 0 },
        loading: false,
      });
    } catch (error) {
      console.error('fetchToolsByCategory error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden der Werkzeuge';
      set({
        loading: false,
        error: errorMessage,
        tools: [],
      });
    }
  },

  /**
   * Create new tool
   */
  createTool: async (toolData) => {
    try {
      set({ loading: true, error: null });

      console.log('Creating tool with data:', toolData);
      const response = await axios.post(API_BASE, toolData);
      console.log('Create response:', response.data);

      // Add to list
      set((state) => ({
        tools: [response.data.data, ...state.tools],
        loading: false,
      }));

      return { success: true, tool: response.data.data };
    } catch (error) {
      console.error('createTool error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Erstellen des Werkzeugs';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Update tool
   */
  updateTool: async (id, toolData) => {
    try {
      set({ loading: true, error: null });

      console.log('Updating tool', id, 'with data:', toolData);
      const response = await axios.put(`${API_BASE}/${id}`, toolData);
      console.log('Update response:', response.data);

      // Update in list
      set((state) => ({
        tools: state.tools.map(tool =>
          tool.id === id ? response.data.data : tool
        ),
        currentTool: state.currentTool?.id === id ? response.data.data : state.currentTool,
        loading: false,
      }));

      return { success: true, tool: response.data.data };
    } catch (error) {
      console.error('updateTool error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Aktualisieren des Werkzeugs';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Delete tool (soft delete)
   */
  deleteTool: async (id) => {
    try {
      set({ loading: true, error: null });

      console.log('Deleting tool:', id);
      await axios.delete(`${API_BASE}/${id}`);

      // Remove from list or mark as inactive
      set((state) => ({
        tools: state.tools.filter(tool => tool.id !== id),
        loading: false,
      }));

      return { success: true };
    } catch (error) {
      console.error('deleteTool error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Löschen des Werkzeugs';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Set filters
   */
  setFilters: (newFilters) => {
    set((state) => ({
      filters: {
        ...state.filters,
        ...newFilters,
      },
    }));
  },

  /**
   * Clear all filters
   */
  clearFilters: () => {
    set({
      filters: {
        category_id: null,
        subcategory_id: null,
        item_type: null,
        tool_category: null,
        is_active: 'true',
        manufacturer: '',
        search: '',
      },
    });
  },

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),

  // ============================================================================
  // LOW STOCK ALERTS
  // ============================================================================

  /**
   * Low stock alerts state
   */
  lowStockTools: [],
  lowStockLoading: false,
  lowStockError: null,
  lowStockPagination: {
    total: 0,
    limit: 50,
    offset: 0,
  },

  /**
   * Fetch tools with low stock (weighted calculation)
   */
  fetchLowStockTools: async (limit = 50, offset = 0, sortBy = 'effective_stock', sortOrder = 'ASC') => {
    try {
      set({ lowStockLoading: true, lowStockError: null });

      const params = new URLSearchParams({
        sort_by: sortBy,
        sort_order: sortOrder,
        limit: limit.toString(),
        offset: offset.toString(),
      });

      const response = await axios.get(`${API_BASE}/alerts/low-stock?${params.toString()}`);

      set({
        lowStockTools: response.data.data || [],
        lowStockPagination: response.data.pagination || {
          total: 0,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
        lowStockLoading: false,
      });

      return { success: true, data: response.data.data || [] };
    } catch (error) {
      console.error('fetchLowStockTools error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der Werkzeuge mit niedrigem Bestand';
      set({
        lowStockLoading: false,
        lowStockError: errorMessage,
        lowStockTools: [],
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Clear low stock data
   */
  clearLowStockTools: () => set({
    lowStockTools: [],
    lowStockError: null,
    lowStockPagination: {
      total: 0,
      limit: 50,
      offset: 0,
    },
  }),

  /**
   * Reset store
   */
  reset: () => set({
    tools: [],
    currentTool: null,
    loading: false,
    error: null,
    filters: {
      category_id: null,
      subcategory_id: null,
      item_type: null,
      tool_category: null,
      is_active: 'true',
      is_low_stock: null,
      manufacturer: '',
      search: '',
    },
    pagination: {
      total: 0,
      limit: 20,
      offset: 0,
    },
  }),
}));
