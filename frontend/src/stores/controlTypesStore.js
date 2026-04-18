import { create } from 'zustand';
import axios from '../utils/axios';

export const useControlTypesStore = create((set, get) => ({
  types: [],
  loading: false,
  error: null,

  fetchTypes: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get('/api/control-types', { params: filters });
      set({ types: response.data.data, loading: false });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching control types:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  createType: async (data) => {
    const response = await axios.post('/api/control-types', data);
    set((state) => ({ types: [...state.types, response.data.data] }));
    return response.data.data;
  },

  updateType: async (id, data) => {
    const response = await axios.put(`/api/control-types/${id}`, data);
    set((state) => ({
      types: state.types.map((t) => (t.id === id ? response.data.data : t))
    }));
    return response.data.data;
  },

  deleteType: async (id) => {
    await axios.delete(`/api/control-types/${id}`);
    set((state) => ({ types: state.types.filter((t) => t.id !== id) }));
  },
}));
