// frontend/src/stores/zerobotStore.js
/**
 * Zustand Store für Zerobot Positionsrechner
 */

import { create } from 'zustand';
import API_BASE_URL from '../config/api';

export const useZerobotStore = create((set, get) => ({
  config: null,
  machines: [],
  loading: false,
  error: null,
  calculationResult: null,

  // Gesamte Konfiguration laden
  fetchConfig: async () => {
    const token = localStorage.getItem('token');
    set({ loading: true, error: null });

    try {
      const response = await fetch(`${API_BASE_URL}/api/zerobot/config`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Konfiguration');
      }

      const data = await response.json();
      set({ config: data, loading: false });
      
      // Extract machine names
      const machineNames = Object.keys(data.machines || {});
      set({ machines: machineNames });
      
      return data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Maschinenliste laden
  fetchMachines: async () => {
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_BASE_URL}/api/zerobot/machines`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Maschinenliste');
      }

      const data = await response.json();
      set({ machines: data });
      return data;
    } catch (error) {
      console.error('fetchMachines error:', error);
      throw error;
    }
  },

  // Parameter aktualisieren
  updateConfig: async (id, configData) => {
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_BASE_URL}/api/zerobot/config/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(configData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Fehler beim Aktualisieren');
    }

    const updated = await response.json();
    
    // Refresh config
    await get().fetchConfig();
    
    return updated;
  },

  // Neue Maschine hinzufügen
  addMachine: async (machineData) => {
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_BASE_URL}/api/zerobot/machines`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(machineData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Fehler beim Hinzufügen der Maschine');
    }

    const result = await response.json();
    
    // Refresh config
    await get().fetchConfig();
    
    return result;
  },

  // Maschine löschen
  deleteMachine: async (machineName) => {
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_BASE_URL}/api/zerobot/machines/${encodeURIComponent(machineName)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Fehler beim Löschen der Maschine');
    }

    // Refresh config
    await get().fetchConfig();
  },

  // Neuen Backentyp hinzufügen
  addJaw: async (jawData) => {
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_BASE_URL}/api/zerobot/jaws`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(jawData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Fehler beim Hinzufügen des Backentyps');
    }

    const result = await response.json();
    
    // Refresh config
    await get().fetchConfig();
    
    return result;
  },

  // Backentyp löschen
  deleteJaw: async (id) => {
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_BASE_URL}/api/zerobot/jaws/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Fehler beim Löschen des Backentyps');
    }

    // Refresh config
    await get().fetchConfig();
  },

  // Positionen berechnen
  calculate: async (inputData) => {
    const token = localStorage.getItem('token');
    set({ error: null });

    try {
      const response = await fetch(`${API_BASE_URL}/api/zerobot/calculate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(inputData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Fehler bei der Berechnung');
      }

      const result = await response.json();
      set({ calculationResult: result });
      return result;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Berechnung zurücksetzen
  clearCalculation: () => {
    set({ calculationResult: null, error: null });
  },

  // Helper: Config-Wert nach Key holen
  getConfigValue: (type, key, machineName = null) => {
    const config = get().config;
    if (!config) return null;

    if (type === 'global') {
      const param = config.global?.find(p => p.config_key === key);
      return param ? parseFloat(param.config_value) : null;
    }
    
    if (type === 'jaw') {
      const param = config.jaw?.find(p => p.config_key === key);
      return param ? parseFloat(param.config_value) : null;
    }
    
    if (type === 'machine' && machineName) {
      const machineParams = config.machines?.[machineName];
      if (!machineParams) return null;
      const param = machineParams.find(p => p.config_key === key);
      return param ? parseFloat(param.config_value) : null;
    }

    return null;
  }
}));
