import { create } from 'zustand';
import axios from '../utils/axios';

const API_BASE = '/api/tool';

export const useToolCategoriesStore = create((set, get) => ({
  // State
  categories: [],
  subcategories: [],
  currentCategory: null,
  currentSubcategory: null,
  loading: false,
  error: null,

  // ==========================================================================
  // TOOL CATEGORIES
  // ==========================================================================

  /**
   * Fetch all tool categories with optional filters
   */
  fetchCategories: async (includeInactive = false) => {
    try {
      set({ loading: true, error: null });

      const params = new URLSearchParams();
      if (!includeInactive) {
        params.append('is_active', 'true');
      }

      const url = `${API_BASE}/categories${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);

      set({
        categories: response.data.data || [],
        loading: false,
      });
    } catch (error) {
      console.error('fetchCategories error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden der Kategorien';
      set({
        loading: false,
        error: errorMessage,
        categories: [],
      });
    }
  },

  /**
   * Fetch single tool category by ID
   */
  fetchCategoryById: async (id) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.get(`${API_BASE}/categories/${id}`);

      set({
        currentCategory: response.data.data,
        loading: false,
      });

      return response.data.data;
    } catch (error) {
      console.error('fetchCategoryById error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden der Kategorie';
      set({
        loading: false,
        error: errorMessage,
      });
      throw new Error(errorMessage);
    }
  },

  /**
   * Create new tool category
   */
  createCategory: async (categoryData) => {
    try {
      set({ loading: true, error: null });

      console.log('Creating category with data:', categoryData);
      const response = await axios.post(`${API_BASE}/categories`, categoryData);
      console.log('Create response:', response.data);

      // Add to list
      set((state) => ({
        categories: [...state.categories, response.data.data],
        loading: false,
      }));

      return { success: true, category: response.data.data };
    } catch (error) {
      console.error('createCategory error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Erstellen der Kategorie';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Update tool category
   */
  updateCategory: async (id, categoryData) => {
    try {
      set({ loading: true, error: null });

      console.log('Updating category', id, 'with data:', categoryData);
      const response = await axios.put(`${API_BASE}/categories/${id}`, categoryData);
      console.log('Update response:', response.data);

      // Update in list
      set((state) => ({
        categories: state.categories.map((cat) => (cat.id === id ? response.data.data : cat)),
        currentCategory: state.currentCategory?.id === id ? response.data.data : state.currentCategory,
        loading: false,
      }));

      return { success: true, category: response.data.data };
    } catch (error) {
      console.error('updateCategory error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Aktualisieren der Kategorie';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Delete tool category
   */
  deleteCategory: async (id) => {
    try {
      set({ loading: true, error: null });

      console.log('Deleting category', id);
      const response = await axios.delete(`${API_BASE}/categories/${id}`);
      console.log('Delete response:', response.data);

      // Remove from list
      set((state) => ({
        categories: state.categories.filter((cat) => cat.id !== id),
        currentCategory: state.currentCategory?.id === id ? null : state.currentCategory,
        loading: false,
      }));

      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('deleteCategory error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Löschen der Kategorie';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  // ==========================================================================
  // TOOL SUBCATEGORIES
  // ==========================================================================

  /**
   * Fetch all subcategories (optionally for a specific category)
   */
  fetchSubcategories: async (categoryId = null) => {
    try {
      set({ loading: true, error: null });

      let url = `${API_BASE}/subcategories`;
      if (categoryId) {
        url = `${API_BASE}/categories/${categoryId}/subcategories`;
      }

      const response = await axios.get(url);

      set({
        subcategories: response.data.data || [],
        loading: false,
      });

      return response.data.data || [];
    } catch (error) {
      console.error('fetchSubcategories error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden der Unterkategorien';
      set({
        loading: false,
        error: errorMessage,
        subcategories: [],
      });
      throw new Error(errorMessage);
    }
  },

  /**
   * Fetch single subcategory by ID
   */
  fetchSubcategoryById: async (id) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.get(`${API_BASE}/subcategories/${id}`);

      set({
        currentSubcategory: response.data.data,
        loading: false,
      });

      return response.data.data;
    } catch (error) {
      console.error('fetchSubcategoryById error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden der Unterkategorie';
      set({
        loading: false,
        error: errorMessage,
      });
      throw new Error(errorMessage);
    }
  },

  /**
   * Create new tool subcategory
   */
  createSubcategory: async (subcategoryData) => {
    try {
      set({ loading: true, error: null });

      console.log('Creating subcategory with data:', subcategoryData);
      const response = await axios.post(`${API_BASE}/subcategories`, subcategoryData);
      console.log('Create response:', response.data);

      // Add to list
      set((state) => ({
        subcategories: [...state.subcategories, response.data.data],
        loading: false,
      }));

      return { success: true, subcategory: response.data.data };
    } catch (error) {
      console.error('createSubcategory error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Erstellen der Unterkategorie';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Update tool subcategory
   */
  updateSubcategory: async (id, subcategoryData) => {
    try {
      set({ loading: true, error: null });

      console.log('Updating subcategory', id, 'with data:', subcategoryData);
      const response = await axios.put(`${API_BASE}/subcategories/${id}`, subcategoryData);
      console.log('Update response:', response.data);

      // Update in list
      set((state) => ({
        subcategories: state.subcategories.map((sub) => (sub.id === id ? response.data.data : sub)),
        currentSubcategory: state.currentSubcategory?.id === id ? response.data.data : state.currentSubcategory,
        loading: false,
      }));

      return { success: true, subcategory: response.data.data };
    } catch (error) {
      console.error('updateSubcategory error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Aktualisieren der Unterkategorie';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Delete tool subcategory
   */
  deleteSubcategory: async (id) => {
    try {
      set({ loading: true, error: null });

      console.log('Deleting subcategory', id);
      const response = await axios.delete(`${API_BASE}/subcategories/${id}`);
      console.log('Delete response:', response.data);

      // Remove from list
      set((state) => ({
        subcategories: state.subcategories.filter((sub) => sub.id !== id),
        currentSubcategory: state.currentSubcategory?.id === id ? null : state.currentSubcategory,
        loading: false,
      }));

      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('deleteSubcategory error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Löschen der Unterkategorie';
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
   * Clear error
   */
  clearError: () => set({ error: null }),

  /**
   * Reset store
   */
  reset: () =>
    set({
      categories: [],
      subcategories: [],
      currentCategory: null,
      currentSubcategory: null,
      loading: false,
      error: null,
    }),
}));
