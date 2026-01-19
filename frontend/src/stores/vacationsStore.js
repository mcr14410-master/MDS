import { create } from 'zustand';
import axios from '../utils/axios';

export const useVacationsStore = create((set, get) => ({
  // ============================================
  // STATE
  // ============================================
  
  // Vacations (Absences)
  vacations: [],
  currentVacation: null,
  
  // Calendar data
  calendarData: {
    vacations: [],
    holidays: [],
    period: null
  },
  
  // Vacation Types
  vacationTypes: [],
  
  // Holidays
  holidays: [],
  
  // Entitlements & Balances
  entitlements: [],
  balances: [],
  
  // Settings
  settings: {},
  
  // Role Limits
  roleLimits: [],
  availableRoles: [],
  
  // German States (for holidays)
  germanStates: [],
  
  // UI State
  loading: false,
  error: null,
  
  // Filters
  filters: {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    user_id: null,
    status: null,
    view: 'month' // 'month' | 'year'
  },

  // ============================================
  // VACATION TYPES
  // ============================================
  
  fetchVacationTypes: async () => {
    try {
      const response = await axios.get('/api/vacation-types');
      set({ vacationTypes: response.data });
      return response.data;
    } catch (error) {
      console.error('fetchVacationTypes error:', error);
      throw error;
    }
  },

  createVacationType: async (data) => {
    try {
      const response = await axios.post('/api/vacation-types', data);
      set(state => ({
        vacationTypes: [...state.vacationTypes, response.data]
      }));
      return response.data;
    } catch (error) {
      console.error('createVacationType error:', error);
      throw error;
    }
  },

  updateVacationType: async (id, data) => {
    try {
      const response = await axios.put(`/api/vacation-types/${id}`, data);
      set(state => ({
        vacationTypes: state.vacationTypes.map(t => 
          t.id === id ? response.data : t
        )
      }));
      return response.data;
    } catch (error) {
      console.error('updateVacationType error:', error);
      throw error;
    }
  },

  deleteVacationType: async (id) => {
    try {
      await axios.delete(`/api/vacation-types/${id}`);
      set(state => ({
        vacationTypes: state.vacationTypes.filter(t => t.id !== id)
      }));
    } catch (error) {
      console.error('deleteVacationType error:', error);
      throw error;
    }
  },

  // ============================================
  // HOLIDAYS
  // ============================================
  
  fetchHolidays: async (year, region) => {
    try {
      // If no region provided, use settings
      const state = get();
      const effectiveRegion = region || state.settings?.default_region?.value || 'BY';
      const response = await axios.get(`/api/holidays?year=${year}&region=${effectiveRegion}`);
      set({ holidays: response.data });
      return response.data;
    } catch (error) {
      console.error('fetchHolidays error:', error);
      throw error;
    }
  },

  fetchGermanStates: async () => {
    try {
      const response = await axios.get('/api/holidays/states');
      set({ germanStates: response.data });
      return response.data;
    } catch (error) {
      console.error('fetchGermanStates error:', error);
      throw error;
    }
  },

  generateHolidays: async (year, region) => {
    try {
      // If no region provided, use settings
      const state = get();
      const effectiveRegion = region || state.settings?.default_region?.value || 'BY';
      const response = await axios.post('/api/holidays/generate', { 
        year, 
        region: effectiveRegion,
        includeHalfDays: true
      });
      set({ holidays: response.data.holidays });
      return response.data;
    } catch (error) {
      console.error('generateHolidays error:', error);
      throw error;
    }
  },

  createHoliday: async (data) => {
    try {
      const response = await axios.post('/api/holidays', data);
      set(state => ({
        holidays: [...state.holidays, response.data].sort((a, b) => 
          a.date.localeCompare(b.date)
        )
      }));
      return response.data;
    } catch (error) {
      console.error('createHoliday error:', error);
      throw error;
    }
  },

  deleteHoliday: async (id) => {
    try {
      await axios.delete(`/api/holidays/${id}`);
      set(state => ({
        holidays: state.holidays.filter(h => h.id !== id)
      }));
    } catch (error) {
      console.error('deleteHoliday error:', error);
      throw error;
    }
  },

  // ============================================
  // ENTITLEMENTS & BALANCES
  // ============================================
  
  fetchBalances: async (year) => {
    try {
      const response = await axios.get(`/api/vacation-entitlements/balances?year=${year}`);
      set({ balances: response.data });
      return response.data;
    } catch (error) {
      console.error('fetchBalances error:', error);
      throw error;
    }
  },

  fetchEntitlements: async (year) => {
    try {
      const response = await axios.get(`/api/vacation-entitlements?year=${year}`);
      set({ entitlements: response.data });
      return response.data;
    } catch (error) {
      console.error('fetchEntitlements error:', error);
      throw error;
    }
  },

  createEntitlement: async (data) => {
    try {
      const response = await axios.post('/api/vacation-entitlements', data);
      // Refresh balances
      await get().fetchBalances(data.year);
      return response.data;
    } catch (error) {
      console.error('createEntitlement error:', error);
      throw error;
    }
  },

  updateEntitlement: async (id, data) => {
    try {
      const response = await axios.put(`/api/vacation-entitlements/${id}`, data);
      // Refresh balances
      const year = get().filters.year;
      await get().fetchBalances(year);
      return response.data;
    } catch (error) {
      console.error('updateEntitlement error:', error);
      throw error;
    }
  },

  initializeYear: async (year) => {
    try {
      const response = await axios.post('/api/vacation-entitlements/initialize', { year });
      await get().fetchBalances(year);
      return response.data;
    } catch (error) {
      console.error('initializeYear error:', error);
      throw error;
    }
  },

  // ============================================
  // VACATIONS (Absences)
  // ============================================
  
  fetchVacations: async (filters = {}) => {
    try {
      set({ loading: true, error: null });
      
      const params = new URLSearchParams();
      if (filters.year) params.append('year', filters.year);
      if (filters.user_id) params.append('user_id', filters.user_id);
      if (filters.status) params.append('status', filters.status);
      
      const url = `/api/vacations${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);
      
      set({ vacations: response.data, loading: false });
      return response.data;
    } catch (error) {
      console.error('fetchVacations error:', error);
      set({ loading: false, error: 'Fehler beim Laden der Abwesenheiten' });
      throw error;
    }
  },

  fetchCalendar: async (year, month = null) => {
    try {
      set({ loading: true, error: null });
      
      let url = `/api/vacations/calendar?year=${year}`;
      if (month) url += `&month=${month}`;
      
      const response = await axios.get(url);
      
      set({ 
        calendarData: response.data,
        loading: false 
      });
      return response.data;
    } catch (error) {
      console.error('fetchCalendar error:', error);
      set({ loading: false, error: 'Fehler beim Laden des Kalenders' });
      throw error;
    }
  },

  fetchVacation: async (id) => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get(`/api/vacations/${id}`);
      set({ currentVacation: response.data, loading: false });
      return response.data;
    } catch (error) {
      console.error('fetchVacation error:', error);
      set({ loading: false, error: 'Fehler beim Laden der Abwesenheit' });
      throw error;
    }
  },

  checkOverlap: async (data) => {
    try {
      const response = await axios.post('/api/vacations/check-overlap', data);
      return response.data;
    } catch (error) {
      console.error('checkOverlap error:', error);
      throw error;
    }
  },

  createVacation: async (data) => {
    try {
      set({ loading: true, error: null });
      const response = await axios.post('/api/vacations', data);
      
      // Refresh calendar
      const { year, month, view } = get().filters;
      await get().fetchCalendar(year, view === 'month' ? month : null);
      
      // Refresh balances
      await get().fetchBalances(year);
      
      set({ loading: false });
      return response.data;
    } catch (error) {
      console.error('createVacation error:', error);
      const message = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Erstellen';
      set({ loading: false, error: message });
      throw error;
    }
  },

  updateVacation: async (id, data) => {
    try {
      set({ loading: true, error: null });
      const response = await axios.put(`/api/vacations/${id}`, data);
      
      // Refresh calendar
      const { year, month, view } = get().filters;
      await get().fetchCalendar(year, view === 'month' ? month : null);
      
      // Refresh balances
      await get().fetchBalances(year);
      
      set({ loading: false });
      return response.data;
    } catch (error) {
      console.error('updateVacation error:', error);
      const message = error.response?.data?.message || 'Fehler beim Aktualisieren';
      set({ loading: false, error: message });
      throw error;
    }
  },

  deleteVacation: async (id) => {
    try {
      set({ loading: true, error: null });
      await axios.delete(`/api/vacations/${id}`);
      
      // Refresh calendar
      const { year, month, view } = get().filters;
      await get().fetchCalendar(year, view === 'month' ? month : null);
      
      // Refresh balances
      await get().fetchBalances(year);
      
      set({ loading: false });
    } catch (error) {
      console.error('deleteVacation error:', error);
      set({ loading: false, error: 'Fehler beim Löschen' });
      throw error;
    }
  },

  // ============================================
  // SETTINGS
  // ============================================
  
  fetchSettings: async () => {
    try {
      const response = await axios.get('/api/vacation-settings');
      set({ settings: response.data });
      return response.data;
    } catch (error) {
      console.error('fetchSettings error:', error);
      throw error;
    }
  },

  updateSettings: async (settings) => {
    try {
      const response = await axios.put('/api/vacation-settings', settings);
      // Refetch to get updated format
      await get().fetchSettings();
      return response.data;
    } catch (error) {
      console.error('updateSettings error:', error);
      throw error;
    }
  },

  // ============================================
  // ROLE LIMITS
  // ============================================
  
  fetchRoleLimits: async () => {
    try {
      const response = await axios.get('/api/vacation-role-limits');
      set({ roleLimits: response.data });
      return response.data;
    } catch (error) {
      console.error('fetchRoleLimits error:', error);
      throw error;
    }
  },

  fetchAvailableRoles: async () => {
    try {
      const response = await axios.get('/api/vacation-role-limits/roles');
      set({ availableRoles: response.data });
      return response.data;
    } catch (error) {
      console.error('fetchAvailableRoles error:', error);
      throw error;
    }
  },

  upsertRoleLimit: async (data) => {
    try {
      const response = await axios.post('/api/vacation-role-limits', data);
      // Refresh both lists
      await get().fetchRoleLimits();
      await get().fetchAvailableRoles();
      return response.data;
    } catch (error) {
      console.error('upsertRoleLimit error:', error);
      throw error;
    }
  },

  deleteRoleLimit: async (id) => {
    try {
      await axios.delete(`/api/vacation-role-limits/${id}`);
      // Refresh both lists
      await get().fetchRoleLimits();
      await get().fetchAvailableRoles();
    } catch (error) {
      console.error('deleteRoleLimit error:', error);
      throw error;
    }
  },

  // ============================================
  // FILTERS & UI
  // ============================================
  
  setFilters: (newFilters) => {
    const filters = { ...get().filters, ...newFilters };
    set({ filters });
    
    // Refresh calendar when filters change
    const { year, month, view } = filters;
    get().fetchCalendar(year, view === 'month' ? month : null);
  },

  setView: (view) => {
    set(state => ({ 
      filters: { ...state.filters, view } 
    }));
    
    const { year, month } = get().filters;
    get().fetchCalendar(year, view === 'month' ? month : null);
  },

  navigateMonth: (direction) => {
    const { year, month } = get().filters;
    let newMonth = month + direction;
    let newYear = year;
    
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    
    get().setFilters({ year: newYear, month: newMonth });
  },

  navigateYear: (direction) => {
    const { year } = get().filters;
    get().setFilters({ year: year + direction });
  },

  clearError: () => set({ error: null }),
  
  clearCurrentVacation: () => set({ currentVacation: null }),

  // ============================================
  // INITIALIZATION
  // ============================================
  
  initialize: async () => {
    try {
      set({ loading: true });
      
      const { year, month, view } = get().filters;
      
      await Promise.all([
        get().fetchVacationTypes(),
        get().fetchCalendar(year, view === 'month' ? month : null),
        get().fetchBalances(year),
        get().fetchSettings(),
        get().fetchHolidays(year),
        get().fetchRoleLimits()
      ]);
      
      set({ loading: false });
    } catch (error) {
      console.error('initialize error:', error);
      set({ loading: false, error: 'Fehler beim Initialisieren' });
    }
  }
}));
