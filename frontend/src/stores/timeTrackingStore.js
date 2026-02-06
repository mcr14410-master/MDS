import { create } from 'zustand';
import axios from '../utils/axios';

// Lokales Datum als YYYY-MM-DD (Browser-Zeitzone, nicht UTC)
function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export const useTimeTrackingStore = create((set, get) => ({
  // State
  currentStatus: null,
  todayStats: null,
  weekStats: null,
  monthStats: null,
  balance: null,
  entries: [],
  dailySummaries: [],
  
  // Admin State
  presence: [],
  missingEntries: [],
  allBalances: [],
  
  // Settings
  timeModels: [],
  settings: {},
  
  // UI State
  loading: false,
  error: null,
  
  // ============================================
  // Eigene Daten laden
  // ============================================
  
  fetchMyStatus: async (userId) => {
    try {
      const response = await axios.get(`/api/time-tracking/entries/user/${userId}`, {
        params: { date: todayLocal() }
      });
      
      const entries = response.data;
      const lastEntry = entries[0];
      
      let status = 'absent';
      if (lastEntry) {
        if (lastEntry.entry_type === 'clock_in' || lastEntry.entry_type === 'break_end') status = 'present';
        else if (lastEntry.entry_type === 'break_start') status = 'break';
      }
      
      set({ 
        currentStatus: { status, lastEntry },
        entries 
      });
    } catch (error) {
      console.error('Fehler beim Laden des Status:', error);
    }
  },
  
  fetchMyWeek: async (userId, date) => {
    try {
      const response = await axios.get(`/api/time-tracking/balances/user/${userId}/week`, {
        params: { date: date || todayLocal() }
      });
      set({ weekStats: response.data });
    } catch (error) {
      console.error('Fehler beim Laden der Wochenübersicht:', error);
    }
  },
  
  fetchMyMonth: async (userId, year, month) => {
    try {
      const now = new Date();
      const response = await axios.get(`/api/time-tracking/balances/user/${userId}/daily`, {
        params: { 
          year: year || now.getFullYear(), 
          month: month || now.getMonth() + 1 
        }
      });
      set({ dailySummaries: response.data });
    } catch (error) {
      console.error('Fehler beim Laden der Monatsübersicht:', error);
    }
  },
  
  fetchMyBalance: async (userId) => {
    try {
      const response = await axios.get(`/api/time-tracking/balances/user/${userId}`);
      set({ balance: response.data });
    } catch (error) {
      console.error('Fehler beim Laden des Zeitkontos:', error);
    }
  },
  
  fetchMyEntries: async (userId, from, to) => {
    try {
      const response = await axios.get(`/api/time-tracking/entries/user/${userId}`, {
        params: { from, to }
      });
      set({ entries: response.data });
    } catch (error) {
      console.error('Fehler beim Laden der Buchungen:', error);
    }
  },
  
  // ============================================
  // Stempeln
  // ============================================
  
  stamp: async (entryType) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post('/api/time-tracking/entries/stamp', {
        entry_type: entryType
      });
      
      // Status aktualisieren
      let status = 'absent';
      if (entryType === 'clock_in') status = 'present';
      else if (entryType === 'break_start') status = 'break';
      else if (entryType === 'break_end') status = 'present';
      
      set({ 
        currentStatus: { status, lastEntry: response.data },
        loading: false 
      });
      
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Fehler beim Stempeln',
        loading: false 
      });
      throw error;
    }
  },
  
  // ============================================
  // Admin: Anwesenheit & Fehlbuchungen
  // ============================================
  
  fetchPresence: async () => {
    try {
      const response = await axios.get('/api/time-tracking/entries/presence');
      set({ presence: response.data });
    } catch (error) {
      console.error('Fehler beim Laden der Anwesenheit:', error);
    }
  },
  
  fetchMissingEntries: async (from, to) => {
    try {
      const response = await axios.get('/api/time-tracking/entries/missing', {
        params: { from, to }
      });
      set({ missingEntries: response.data });
    } catch (error) {
      console.error('Fehler beim Laden der Fehlbuchungen:', error);
    }
  },
  
  fetchAllBalances: async (year, month) => {
    try {
      const now = new Date();
      const response = await axios.get('/api/time-tracking/balances', {
        params: { 
          year: year || now.getFullYear(), 
          month: month || now.getMonth() + 1 
        }
      });
      set({ allBalances: response.data });
    } catch (error) {
      console.error('Fehler beim Laden der Zeitkonten:', error);
    }
  },
  
  // ============================================
  // Korrekturen
  // ============================================
  
  createCorrection: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post('/api/time-tracking/entries/correction', data);
      set({ loading: false });
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Fehler beim Erstellen der Korrektur',
        loading: false 
      });
      throw error;
    }
  },
  
  deleteEntry: async (entryId) => {
    set({ loading: true, error: null });
    try {
      await axios.delete(`/api/time-tracking/entries/${entryId}`);
      set({ loading: false });
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Fehler beim Löschen',
        loading: false 
      });
      throw error;
    }
  },
  
  // ============================================
  // Zeitmodelle & Einstellungen
  // ============================================
  
  fetchTimeModels: async () => {
    try {
      const response = await axios.get('/api/time-tracking/models');
      set({ timeModels: response.data });
    } catch (error) {
      console.error('Fehler beim Laden der Zeitmodelle:', error);
    }
  },
  
  createTimeModel: async (data) => {
    const response = await axios.post('/api/time-tracking/models', data);
    await get().fetchTimeModels();
    return response.data;
  },
  
  updateTimeModel: async (id, data) => {
    const response = await axios.put(`/api/time-tracking/models/${id}`, data);
    await get().fetchTimeModels();
    return response.data;
  },
  
  deleteTimeModel: async (id) => {
    await axios.delete(`/api/time-tracking/models/${id}`);
    await get().fetchTimeModels();
  },
  
  fetchSettings: async () => {
    try {
      const response = await axios.get('/api/time-tracking/settings');
      set({ settings: response.data });
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error);
    }
  },
  
  updateSettings: async (settings) => {
    const response = await axios.put('/api/time-tracking/settings', { settings });
    await get().fetchSettings();
    return response.data;
  },
  
  // ============================================
  // Hilfsfunktionen
  // ============================================
  
  formatMinutes: (minutes) => {
    if (minutes === null || minutes === undefined) return '-';
    const sign = minutes < 0 ? '-' : '';
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    return `${sign}${hours}:${mins.toString().padStart(2, '0')}`;
  },
  
  formatHoursDecimal: (minutes) => {
    if (minutes === null || minutes === undefined) return '-';
    return (minutes / 60).toFixed(2) + 'h';
  },
  
  clearError: () => set({ error: null })
}));
