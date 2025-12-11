// frontend/src/stores/operationTypesStore.js
/**
 * Zustand Store für Operation Types
 */

import { create } from 'zustand';
import API_BASE_URL from '../config/api';

export const useOperationTypesStore = create((set, get) => ({
  types: [],
  features: [],
  loading: false,
  error: null,

  // Alle Operation Types laden
  fetchTypes: async () => {
    const token = localStorage.getItem('token');
    set({ loading: true, error: null });

    try {
      const response = await fetch(`${API_BASE_URL}/api/operation-types`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Operationstypen');
      }

      const data = await response.json();
      set({ types: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Feature-Definitionen laden
  fetchFeatures: async () => {
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_BASE_URL}/api/operation-types/features`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Feature-Definitionen');
      }

      const data = await response.json();
      set({ features: data });
    } catch (error) {
      console.error('fetchFeatures error:', error);
    }
  },

  // Type by ID holen (aus lokalem Cache)
  getTypeById: (id) => {
    return get().types.find(t => t.id === id);
  },

  // Default features für einen Typ holen
  getDefaultFeatures: (typeId) => {
    const type = get().types.find(t => t.id === typeId);
    return type?.default_features || [];
  }
}));
