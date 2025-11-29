import { create } from 'zustand';
import axios from '../utils/axios';

export const useFixturesStore = create((set, get) => ({
  // State
  fixtures: [],
  types: [],
  stats: null,
  currentFixture: null,
  loading: false,
  error: null,

  // ============================================================================
  // TYPES
  // ============================================================================

  fetchTypes: async (activeOnly = false) => {
    try {
      const params = activeOnly ? { is_active: 'true' } : {};
      const response = await axios.get('/api/fixtures/types', { params });
      set({ types: response.data.data });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching fixture types:', error);
      throw error;
    }
  },

  createType: async (data) => {
    try {
      const response = await axios.post('/api/fixtures/types', data);
      return response.data.data;
    } catch (error) {
      console.error('Error creating fixture type:', error);
      throw error;
    }
  },

  updateType: async (id, data) => {
    try {
      const response = await axios.put(`/api/fixtures/types/${id}`, data);
      return response.data.data;
    } catch (error) {
      console.error('Error updating fixture type:', error);
      throw error;
    }
  },

  deleteType: async (id) => {
    try {
      await axios.delete(`/api/fixtures/types/${id}`);
    } catch (error) {
      console.error('Error deleting fixture type:', error);
      throw error;
    }
  },

  // ============================================================================
  // FIXTURES
  // ============================================================================

  fetchFixtures: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get('/api/fixtures', { params: filters });
      set({ fixtures: response.data.data, loading: false });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching fixtures:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  fetchStats: async () => {
    try {
      const response = await axios.get('/api/fixtures/stats');
      set({ stats: response.data.data });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching fixture stats:', error);
      throw error;
    }
  },

  fetchFixture: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`/api/fixtures/${id}`);
      set({ currentFixture: response.data.data, loading: false });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching fixture:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  checkFixtureNumber: async (number) => {
    try {
      const response = await axios.get(`/api/fixtures/check-number/${encodeURIComponent(number)}`);
      return response.data;
    } catch (error) {
      console.error('Error checking fixture number:', error);
      throw error;
    }
  },

  createFixture: async (data) => {
    try {
      const response = await axios.post('/api/fixtures', data);
      // Refresh list
      get().fetchFixtures();
      return response.data.data;
    } catch (error) {
      console.error('Error creating fixture:', error);
      throw error;
    }
  },

  updateFixture: async (id, data) => {
    try {
      const response = await axios.put(`/api/fixtures/${id}`, data);
      // Update in list
      set((state) => ({
        fixtures: state.fixtures.map((f) => 
          f.id === id ? response.data.data : f
        ),
        currentFixture: state.currentFixture?.id === id 
          ? response.data.data 
          : state.currentFixture
      }));
      return response.data.data;
    } catch (error) {
      console.error('Error updating fixture:', error);
      throw error;
    }
  },

  deleteFixture: async (id) => {
    try {
      await axios.delete(`/api/fixtures/${id}`);
      // Remove from list
      set((state) => ({
        fixtures: state.fixtures.filter((f) => f.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting fixture:', error);
      throw error;
    }
  },

  updateFixtureStatus: async (id, status) => {
    try {
      const response = await axios.patch(`/api/fixtures/${id}/status`, { status });
      // Update in list
      set((state) => ({
        fixtures: state.fixtures.map((f) => 
          f.id === id ? response.data.data : f
        ),
        currentFixture: state.currentFixture?.id === id 
          ? response.data.data 
          : state.currentFixture
      }));
      return response.data.data;
    } catch (error) {
      console.error('Error updating fixture status:', error);
      throw error;
    }
  },

  // Clear current fixture
  clearCurrentFixture: () => {
    set({ currentFixture: null });
  },
}));
