import { create } from 'zustand';
import axios from '../utils/axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const MAINTENANCE_API = `${API_BASE_URL}/api/maintenance`;

export const useMaintenanceStore = create((set, get) => ({
  // ============================================================
  // STATE
  // ============================================================
  
  // Dashboard
  dashboard: null,
  machineStatus: [],
  dueOverview: [],
  
  // Wartungstypen
  maintenanceTypes: [],
  
  // Wartungspläne
  plans: [],
  currentPlan: null,
  
  // Tasks
  tasks: [],
  myTasks: [],
  myTasksSummary: null,
  todaysTasks: [],
  currentTask: null,
  
  // Betriebsstunden
  operatingHours: [],
  operatingHoursHistory: [],
  operatingHoursStats: null,
  
  // Eskalationen
  escalations: [],
  myEscalations: [],
  escalationStats: null,
  currentEscalation: null,
  
  // UI State
  loading: false,
  error: null,
  
  // Filters
  filters: {
    machine_id: null,
    status: null,
    skill_level: null,
    is_shift_critical: null,
    search: '',
  },

  // ============================================================
  // DASHBOARD & ÜBERSICHTEN
  // ============================================================

  fetchDashboard: async () => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get(`${MAINTENANCE_API}/dashboard`);
      set({ dashboard: response.data.data, loading: false });
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden des Dashboards';
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  fetchMachineStatus: async (filters = {}) => {
    try {
      set({ loading: true, error: null });
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      
      const url = `${MAINTENANCE_API}/machines${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);
      set({ machineStatus: response.data.data || [], loading: false });
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden des Maschinen-Status';
      set({ loading: false, error: errorMessage, machineStatus: [] });
      throw new Error(errorMessage);
    }
  },

  fetchDueOverview: async (filters = {}) => {
    try {
      set({ loading: true, error: null });
      const params = new URLSearchParams();
      if (filters.machine_id) params.append('machine_id', filters.machine_id);
      if (filters.skill_level) params.append('skill_level', filters.skill_level);
      if (filters.time_status) params.append('time_status', filters.time_status);
      
      const url = `${MAINTENANCE_API}/due${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);
      set({ dueOverview: response.data.data || [], loading: false });
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der fälligen Wartungen';
      set({ loading: false, error: errorMessage, dueOverview: [] });
      throw new Error(errorMessage);
    }
  },

  // ============================================================
  // MAINTENANCE TYPES
  // ============================================================

  fetchMaintenanceTypes: async () => {
    try {
      const response = await axios.get(`${MAINTENANCE_API}/types`);
      set({ maintenanceTypes: response.data.data || [] });
      return response.data.data;
    } catch (error) {
      console.error('fetchMaintenanceTypes error:', error);
      set({ maintenanceTypes: [] });
      return [];
    }
  },

  // ============================================================
  // MAINTENANCE PLANS
  // ============================================================

  fetchPlans: async (filters = {}) => {
    try {
      set({ loading: true, error: null });
      const params = new URLSearchParams();
      if (filters.machine_id) params.append('machine_id', filters.machine_id);
      if (filters.maintenance_type_id) params.append('maintenance_type_id', filters.maintenance_type_id);
      if (filters.is_active !== undefined && filters.is_active !== null && filters.is_active !== '') {
        params.append('is_active', filters.is_active);
      }
      if (filters.skill_level) params.append('skill_level', filters.skill_level);
      if (filters.is_shift_critical !== undefined && filters.is_shift_critical !== null) {
        params.append('is_shift_critical', filters.is_shift_critical);
      }
      if (filters.search) params.append('search', filters.search);
      
      const url = `${MAINTENANCE_API}/plans${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);
      set({ plans: response.data.data || [], loading: false });
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der Wartungspläne';
      set({ loading: false, error: errorMessage, plans: [] });
      throw new Error(errorMessage);
    }
  },

  fetchPlan: async (id) => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get(`${MAINTENANCE_API}/plans/${id}`);
      set({ currentPlan: response.data.data, loading: false });
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden des Wartungsplans';
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  createPlan: async (planData) => {
    try {
      set({ loading: true, error: null });
      const response = await axios.post(`${MAINTENANCE_API}/plans`, planData);
      set(state => ({
        plans: [...state.plans, response.data.data],
        loading: false
      }));
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Erstellen des Wartungsplans';
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  updatePlan: async (id, planData) => {
    try {
      set({ loading: true, error: null });
      const response = await axios.put(`${MAINTENANCE_API}/plans/${id}`, planData);
      set(state => ({
        plans: state.plans.map(p => p.id === parseInt(id) ? response.data.data : p),
        currentPlan: state.currentPlan?.id === parseInt(id) ? { ...state.currentPlan, ...response.data.data } : state.currentPlan,
        loading: false
      }));
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Aktualisieren des Wartungsplans';
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  deletePlan: async (id, hardDelete = false) => {
    try {
      set({ loading: true, error: null });
      const url = hardDelete ? `${MAINTENANCE_API}/plans/${id}?hard_delete=true` : `${MAINTENANCE_API}/plans/${id}`;
      await axios.delete(url);
      
      if (hardDelete) {
        set(state => ({
          plans: state.plans.filter(p => p.id !== parseInt(id)),
          loading: false
        }));
      } else {
        set(state => ({
          plans: state.plans.map(p => p.id === parseInt(id) ? { ...p, is_active: false } : p),
          loading: false
        }));
      }
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Löschen des Wartungsplans';
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // ============================================================
  // CHECKLIST ITEMS
  // ============================================================

  addChecklistItem: async (planId, itemData) => {
    try {
      const response = await axios.post(`${MAINTENANCE_API}/plans/${planId}/checklist`, itemData);
      // Update currentPlan if loaded
      set(state => {
        if (state.currentPlan?.id === parseInt(planId)) {
          return {
            currentPlan: {
              ...state.currentPlan,
              checklist_items: [...(state.currentPlan.checklist_items || []), response.data.data]
            }
          };
        }
        return {};
      });
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Hinzufügen des Checklist-Items';
      throw new Error(errorMessage);
    }
  },

  updateChecklistItem: async (itemId, itemData) => {
    try {
      const response = await axios.put(`${MAINTENANCE_API}/checklist/${itemId}`, itemData);
      // Update in currentPlan if loaded
      set(state => {
        if (state.currentPlan?.checklist_items) {
          return {
            currentPlan: {
              ...state.currentPlan,
              checklist_items: state.currentPlan.checklist_items.map(item =>
                item.id === parseInt(itemId) ? response.data.data : item
              )
            }
          };
        }
        return {};
      });
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Aktualisieren des Checklist-Items';
      throw new Error(errorMessage);
    }
  },

  deleteChecklistItem: async (itemId) => {
    try {
      await axios.delete(`${MAINTENANCE_API}/checklist/${itemId}`);
      set(state => {
        if (state.currentPlan?.checklist_items) {
          return {
            currentPlan: {
              ...state.currentPlan,
              checklist_items: state.currentPlan.checklist_items.filter(item => item.id !== parseInt(itemId))
            }
          };
        }
        return {};
      });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Löschen des Checklist-Items';
      throw new Error(errorMessage);
    }
  },

  reorderChecklistItems: async (planId, items) => {
    try {
      const response = await axios.put(`${MAINTENANCE_API}/plans/${planId}/checklist/reorder`, { items });
      set(state => {
        if (state.currentPlan?.id === parseInt(planId)) {
          return {
            currentPlan: {
              ...state.currentPlan,
              checklist_items: response.data.data
            }
          };
        }
        return {};
      });
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Sortieren der Checklist';
      throw new Error(errorMessage);
    }
  },

  // ============================================================
  // MAINTENANCE TASKS
  // ============================================================

  fetchTasks: async (filters = {}) => {
    try {
      set({ loading: true, error: null });
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);
      if (filters.machine_id) params.append('machine_id', filters.machine_id);
      if (filters.maintenance_plan_id) params.append('maintenance_plan_id', filters.maintenance_plan_id);
      if (filters.skill_level) params.append('skill_level', filters.skill_level);
      if (filters.is_shift_critical !== undefined) params.append('is_shift_critical', filters.is_shift_critical);
      if (filters.date) params.append('date', filters.date);
      
      const url = `${MAINTENANCE_API}/tasks${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);
      set({ tasks: response.data.data || [], loading: false });
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der Wartungsaufgaben';
      set({ loading: false, error: errorMessage, tasks: [] });
      throw new Error(errorMessage);
    }
  },

  // Alias für fetchTasks
  fetchAllTasks: async (filters = {}) => {
    return get().fetchTasks(filters);
  },

  fetchMyTasks: async (filters = {}) => {
    try {
      set({ loading: true, error: null });
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.date) params.append('date', filters.date);
      
      const url = `${MAINTENANCE_API}/tasks/my${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);
      set({ 
        myTasks: response.data.data || [],
        myTasksSummary: response.data.summary || null,
        loading: false 
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden meiner Aufgaben';
      set({ loading: false, error: errorMessage, myTasks: [] });
      throw new Error(errorMessage);
    }
  },

  fetchTodaysTasks: async () => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get(`${MAINTENANCE_API}/tasks/today`);
      set({ todaysTasks: response.data.data || [], loading: false });
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der Tagesübersicht';
      set({ loading: false, error: errorMessage, todaysTasks: [] });
      throw new Error(errorMessage);
    }
  },

  fetchTask: async (id) => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get(`${MAINTENANCE_API}/tasks/${id}`);
      set({ currentTask: response.data.data, loading: false });
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der Wartungsaufgabe';
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  createTask: async (taskData) => {
    try {
      set({ loading: true, error: null });
      const response = await axios.post(`${MAINTENANCE_API}/tasks`, taskData);
      set(state => ({
        tasks: [...state.tasks, response.data.data],
        loading: false
      }));
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Erstellen der Wartungsaufgabe';
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  assignTask: async (taskId, userId) => {
    try {
      const response = await axios.put(`${MAINTENANCE_API}/tasks/${taskId}/assign`, { user_id: userId });
      set(state => ({
        tasks: state.tasks.map(t => t.id === parseInt(taskId) ? response.data.data : t),
        currentTask: state.currentTask?.id === parseInt(taskId) ? response.data.data : state.currentTask
      }));
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Zuweisen der Aufgabe';
      throw new Error(errorMessage);
    }
  },

  startTask: async (taskId) => {
    try {
      const response = await axios.put(`${MAINTENANCE_API}/tasks/${taskId}/start`);
      set(state => ({
        tasks: state.tasks.map(t => t.id === parseInt(taskId) ? response.data.data : t),
        myTasks: state.myTasks.map(t => t.id === parseInt(taskId) ? response.data.data : t),
        currentTask: state.currentTask?.id === parseInt(taskId) ? { ...state.currentTask, ...response.data.data } : state.currentTask
      }));
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Starten der Aufgabe';
      throw new Error(errorMessage);
    }
  },

  completeChecklistItem: async (taskId, itemId, data) => {
    try {
      const response = await axios.put(`${MAINTENANCE_API}/tasks/${taskId}/checklist/${itemId}`, data);
      // Update currentTask checklist items
      set(state => {
        if (state.currentTask?.id === parseInt(taskId) && state.currentTask?.checklist_items) {
          return {
            currentTask: {
              ...state.currentTask,
              checklist_items: state.currentTask.checklist_items.map(item =>
                item.id === parseInt(itemId) ? { ...item, ...response.data.data, completed: data.completed } : item
              )
            }
          };
        }
        return {};
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Aktualisieren des Checklist-Items';
      // Check for special action_required
      if (error.response?.data?.action_required) {
        throw { message: errorMessage, action_required: error.response.data.action_required, details: error.response.data.details };
      }
      throw new Error(errorMessage);
    }
  },

  completeTask: async (taskId, data = {}) => {
    try {
      const response = await axios.put(`${MAINTENANCE_API}/tasks/${taskId}/complete`, data);
      set(state => ({
        tasks: state.tasks.map(t => t.id === parseInt(taskId) ? response.data.data : t),
        myTasks: state.myTasks.filter(t => t.id !== parseInt(taskId)),
        currentTask: null
      }));
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Abschließen der Aufgabe';
      if (error.response?.data?.missing_items) {
        throw { message: errorMessage, missing_items: error.response.data.missing_items };
      }
      throw new Error(errorMessage);
    }
  },

  cancelTask: async (taskId, reason) => {
    try {
      const response = await axios.put(`${MAINTENANCE_API}/tasks/${taskId}/cancel`, { reason });
      set(state => ({
        tasks: state.tasks.map(t => t.id === parseInt(taskId) ? response.data.data : t),
        myTasks: state.myTasks.filter(t => t.id !== parseInt(taskId)),
        currentTask: null
      }));
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Abbrechen der Aufgabe';
      throw new Error(errorMessage);
    }
  },

  generateTasks: async () => {
    try {
      set({ loading: true, error: null });
      const response = await axios.post(`${MAINTENANCE_API}/tasks/generate`);
      set({ loading: false });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Generieren der Aufgaben';
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // ============================================================
  // STANDALONE TASKS - Allgemeine Aufgaben
  // ============================================================

  createStandaloneTask: async (taskData) => {
    try {
      set({ loading: true, error: null });
      const response = await axios.post(`${MAINTENANCE_API}/tasks/standalone`, taskData);
      set(state => ({
        tasks: [...state.tasks, response.data.data],
        loading: false
      }));
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Erstellen der Aufgabe';
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  updateStandaloneTask: async (taskId, taskData) => {
    try {
      const response = await axios.put(`${MAINTENANCE_API}/tasks/standalone/${taskId}`, taskData);
      set(state => ({
        tasks: state.tasks.map(t => t.id === parseInt(taskId) ? response.data.data : t)
      }));
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Aktualisieren der Aufgabe';
      throw new Error(errorMessage);
    }
  },

  completeStandaloneTask: async (taskId, notes) => {
    try {
      const response = await axios.put(`${MAINTENANCE_API}/tasks/standalone/${taskId}/complete`, { notes });
      set(state => ({
        tasks: state.tasks.map(t => t.id === parseInt(taskId) ? response.data.data : t),
        myTasks: state.myTasks.map(t => t.id === parseInt(taskId) ? response.data.data : t)
      }));
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Abschließen der Aufgabe';
      throw new Error(errorMessage);
    }
  },

  deleteStandaloneTask: async (taskId) => {
    try {
      await axios.delete(`${MAINTENANCE_API}/tasks/standalone/${taskId}`);
      set(state => ({
        tasks: state.tasks.filter(t => t.id !== parseInt(taskId))
      }));
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Löschen der Aufgabe';
      throw new Error(errorMessage);
    }
  },

  // ============================================================
  // OPERATING HOURS
  // ============================================================

  fetchAllOperatingHours: async () => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get(`${MAINTENANCE_API}/operating-hours`);
      set({ operatingHours: response.data.data || [], loading: false });
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der Betriebsstunden';
      set({ loading: false, error: errorMessage, operatingHours: [] });
      throw new Error(errorMessage);
    }
  },

  fetchOperatingHoursLog: async (machineId, filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.limit) params.append('limit', filters.limit);
      
      const url = `${MAINTENANCE_API}/operating-hours/${machineId}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der Betriebsstunden';
      throw new Error(errorMessage);
    }
  },

  fetchOperatingHoursStats: async (machineId, days = 30) => {
    try {
      const response = await axios.get(`${MAINTENANCE_API}/operating-hours/${machineId}/stats?days=${days}`);
      set({ operatingHoursStats: response.data.data });
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der Betriebsstunden-Statistik';
      throw new Error(errorMessage);
    }
  },

  recordOperatingHours: async (machineId, hours, notes) => {
    try {
      const response = await axios.post(`${MAINTENANCE_API}/operating-hours/${machineId}`, {
        recorded_hours: hours,
        notes
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Erfassen der Betriebsstunden';
      throw new Error(errorMessage);
    }
  },

  fetchOperatingHoursHistory: async (filters = {}) => {
    try {
      set({ loading: true, error: null });
      const params = new URLSearchParams();
      if (filters.machine_id) params.append('machine_id', filters.machine_id);
      if (filters.limit) params.append('limit', filters.limit);
      
      const url = `${MAINTENANCE_API}/operating-hours/history${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);
      set({ operatingHoursHistory: response.data.data || [], loading: false });
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der Betriebsstunden-Historie';
      set({ loading: false, error: errorMessage, operatingHoursHistory: [] });
      throw new Error(errorMessage);
    }
  },

  // ============================================================
  // ESCALATIONS
  // ============================================================

  fetchEscalations: async (filters = {}) => {
    try {
      set({ loading: true, error: null });
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.escalated_to) params.append('escalated_to', filters.escalated_to);
      if (filters.escalation_level) params.append('escalation_level', filters.escalation_level);
      if (filters.machine_id) params.append('machine_id', filters.machine_id);
      
      const url = `${MAINTENANCE_API}/escalations${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);
      set({ escalations: response.data.data || [], loading: false });
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der Eskalationen';
      set({ loading: false, error: errorMessage, escalations: [] });
      throw new Error(errorMessage);
    }
  },

  fetchMyEscalations: async () => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get(`${MAINTENANCE_API}/escalations/my`);
      set({ myEscalations: response.data.data || [], loading: false });
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden meiner Eskalationen';
      set({ loading: false, error: errorMessage, myEscalations: [] });
      throw new Error(errorMessage);
    }
  },

  fetchEscalationStats: async (days = 30) => {
    try {
      const response = await axios.get(`${MAINTENANCE_API}/escalations/stats?days=${days}`);
      set({ escalationStats: response.data.data });
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der Eskalations-Statistik';
      throw new Error(errorMessage);
    }
  },

  fetchEscalation: async (id) => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get(`${MAINTENANCE_API}/escalations/${id}`);
      set({ currentEscalation: response.data.data, loading: false });
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der Eskalation';
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  createEscalation: async (data) => {
    try {
      const response = await axios.post(`${MAINTENANCE_API}/escalations`, data);
      set(state => ({
        escalations: [response.data.data, ...state.escalations]
      }));
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Erstellen der Eskalation';
      throw new Error(errorMessage);
    }
  },

  acknowledgeEscalation: async (id) => {
    try {
      const response = await axios.put(`${MAINTENANCE_API}/escalations/${id}/acknowledge`);
      set(state => ({
        escalations: state.escalations.map(e => e.id === parseInt(id) ? response.data.data : e),
        myEscalations: state.myEscalations.map(e => e.id === parseInt(id) ? response.data.data : e),
        currentEscalation: state.currentEscalation?.id === parseInt(id) ? response.data.data : state.currentEscalation
      }));
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Bestätigen der Eskalation';
      throw new Error(errorMessage);
    }
  },

  resolveEscalation: async (id, resolution) => {
    try {
      const response = await axios.put(`${MAINTENANCE_API}/escalations/${id}/resolve`, { resolution });
      set(state => ({
        escalations: state.escalations.map(e => e.id === parseInt(id) ? response.data.data : e),
        myEscalations: state.myEscalations.filter(e => e.id !== parseInt(id)),
        currentEscalation: null
      }));
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Lösen der Eskalation';
      throw new Error(errorMessage);
    }
  },

  closeEscalation: async (id, resolution) => {
    try {
      const response = await axios.put(`${MAINTENANCE_API}/escalations/${id}/close`, { resolution });
      set(state => ({
        escalations: state.escalations.map(e => e.id === parseInt(id) ? response.data.data : e),
        myEscalations: state.myEscalations.filter(e => e.id !== parseInt(id)),
        currentEscalation: null
      }));
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Schließen der Eskalation';
      throw new Error(errorMessage);
    }
  },

  reEscalate: async (id, reason) => {
    try {
      const response = await axios.put(`${MAINTENANCE_API}/escalations/${id}/re-escalate`, { reason });
      set(state => ({
        escalations: [response.data.data, ...state.escalations.filter(e => e.id !== parseInt(id))],
        currentEscalation: response.data.data
      }));
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Weiter-Eskalieren';
      throw new Error(errorMessage);
    }
  },

  // ============================================================
  // UTILITY
  // ============================================================

  setFilters: (filters) => {
    set({ filters });
  },

  clearError: () => set({ error: null }),
  
  clearCurrentPlan: () => set({ currentPlan: null }),
  
  clearCurrentTask: () => set({ currentTask: null }),
  
  clearCurrentEscalation: () => set({ currentEscalation: null }),

  // Reset all
  reset: () => set({
    dashboard: null,
    machineStatus: [],
    dueOverview: [],
    plans: [],
    currentPlan: null,
    tasks: [],
    myTasks: [],
    myTasksSummary: null,
    todaysTasks: [],
    currentTask: null,
    operatingHours: [],
    operatingHoursStats: null,
    escalations: [],
    myEscalations: [],
    escalationStats: null,
    currentEscalation: null,
    loading: false,
    error: null,
  }),
}));
