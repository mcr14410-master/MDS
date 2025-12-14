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
  fetchTypes: async (includeInactive = false) => {
    const token = localStorage.getItem('token');
    set({ loading: true, error: null });

    try {
      const url = includeInactive 
        ? `${API_BASE_URL}/api/operation-types?includeInactive=true`
        : `${API_BASE_URL}/api/operation-types`;
        
      const response = await fetch(url, {
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

  // Neuen Typ erstellen
  createType: async (typeData) => {
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_BASE_URL}/api/operation-types`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(typeData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Fehler beim Erstellen');
    }

    const newType = await response.json();
    set(state => ({ types: [...state.types, newType] }));
    return newType;
  },

  // Typ aktualisieren
  updateType: async (id, typeData) => {
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_BASE_URL}/api/operation-types/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(typeData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Fehler beim Aktualisieren');
    }

    const updatedType = await response.json();
    set(state => ({
      types: state.types.map(t => t.id === id ? updatedType : t)
    }));
    return updatedType;
  },

  // Typ löschen
  deleteType: async (id) => {
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_BASE_URL}/api/operation-types/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Fehler beim Löschen');
    }

    set(state => ({
      types: state.types.filter(t => t.id !== id)
    }));
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
