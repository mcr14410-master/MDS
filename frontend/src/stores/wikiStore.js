import { create } from 'zustand';
import axios from '../utils/axios';
import { API_ENDPOINTS } from '../config/api';

export const useWikiStore = create((set, get) => ({
  // State
  categories: [],
  articles: [],
  currentArticle: null,
  loading: false,
  error: null,
  total: 0,

  // ============================================================================
  // CATEGORIES
  // ============================================================================

  fetchCategories: async () => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get(`${API_ENDPOINTS.WIKI}/categories`);
      set({ categories: response.data.data || [], loading: false });
      return response.data.data;
    } catch (error) {
      console.error('fetchCategories error:', error);
      set({ loading: false, error: error.response?.data?.error || 'Fehler beim Laden' });
      throw error;
    }
  },

  // ============================================================================
  // ARTICLES
  // ============================================================================

  fetchArticles: async (filters = {}) => {
    try {
      set({ loading: true, error: null });
      
      const params = new URLSearchParams();
      if (filters.category_id) params.append('category_id', filters.category_id);
      if (filters.category_slug) params.append('category_slug', filters.category_slug);
      if (filters.machine_id) params.append('machine_id', filters.machine_id);
      if (filters.control_type) params.append('control_type', filters.control_type);
      if (filters.search) params.append('search', filters.search);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);

      const url = `${API_ENDPOINTS.WIKI}/articles${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);
      
      set({ 
        articles: response.data.data || [],
        total: response.data.total || 0,
        loading: false 
      });
      return response.data;
    } catch (error) {
      console.error('fetchArticles error:', error);
      set({ loading: false, error: error.response?.data?.error || 'Fehler beim Laden' });
      throw error;
    }
  },

  fetchArticle: async (id) => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get(`${API_ENDPOINTS.WIKI}/articles/${id}`);
      set({ currentArticle: response.data.data, loading: false });
      return response.data.data;
    } catch (error) {
      console.error('fetchArticle error:', error);
      set({ loading: false, error: error.response?.data?.error || 'Fehler beim Laden' });
      throw error;
    }
  },

  createArticle: async (data) => {
    try {
      set({ loading: true, error: null });
      const response = await axios.post(`${API_ENDPOINTS.WIKI}/articles`, data);
      set(state => ({
        articles: [response.data.data, ...state.articles],
        loading: false
      }));
      return response.data.data;
    } catch (error) {
      console.error('createArticle error:', error);
      set({ loading: false, error: error.response?.data?.error || 'Fehler beim Erstellen' });
      throw error;
    }
  },

  updateArticle: async (id, data) => {
    try {
      set({ loading: true, error: null });
      const response = await axios.put(`${API_ENDPOINTS.WIKI}/articles/${id}`, data);
      set(state => ({
        articles: state.articles.map(a => a.id === parseInt(id) ? response.data.data : a),
        currentArticle: state.currentArticle?.id === parseInt(id) ? response.data.data : state.currentArticle,
        loading: false
      }));
      return response.data.data;
    } catch (error) {
      console.error('updateArticle error:', error);
      set({ loading: false, error: error.response?.data?.error || 'Fehler beim Aktualisieren' });
      throw error;
    }
  },

  deleteArticle: async (id) => {
    try {
      await axios.delete(`${API_ENDPOINTS.WIKI}/articles/${id}`);
      set(state => ({
        articles: state.articles.filter(a => a.id !== parseInt(id))
      }));
    } catch (error) {
      console.error('deleteArticle error:', error);
      throw error;
    }
  },

  markHelpful: async (id) => {
    try {
      const response = await axios.post(`${API_ENDPOINTS.WIKI}/articles/${id}/helpful`);
      set(state => ({
        currentArticle: state.currentArticle?.id === parseInt(id) 
          ? { ...state.currentArticle, helpful_count: response.data.helpful_count }
          : state.currentArticle
      }));
      return response.data.helpful_count;
    } catch (error) {
      console.error('markHelpful error:', error);
      throw error;
    }
  },

  // ============================================================================
  // IMAGES
  // ============================================================================

  uploadImage: async (articleId, formData) => {
    try {
      const response = await axios.post(
        `${API_ENDPOINTS.WIKI}/articles/${articleId}/images`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      // Update current article images
      set(state => ({
        currentArticle: state.currentArticle?.id === parseInt(articleId)
          ? { 
              ...state.currentArticle, 
              images: [...(state.currentArticle.images || []), response.data.data]
            }
          : state.currentArticle
      }));
      return response.data.data;
    } catch (error) {
      console.error('uploadImage error:', error);
      throw error;
    }
  },

  deleteImage: async (imageId) => {
    try {
      await axios.delete(`${API_ENDPOINTS.WIKI}/images/${imageId}`);
      set(state => ({
        currentArticle: state.currentArticle
          ? { 
              ...state.currentArticle, 
              images: (state.currentArticle.images || []).filter(img => img.id !== parseInt(imageId))
            }
          : null
      }));
    } catch (error) {
      console.error('deleteImage error:', error);
      throw error;
    }
  },

  // ============================================================================
  // HELPERS
  // ============================================================================

  clearCurrentArticle: () => set({ currentArticle: null }),
  clearError: () => set({ error: null }),
}));
