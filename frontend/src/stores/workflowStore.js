// frontend/src/stores/workflowStore.js
import { create } from 'zustand';
import axios from '../utils/axios';

const useWorkflowStore = create((set, get) => ({
  // State
  states: [],
  loading: false,
  error: null,
  history: {},
  transitions: {},

  // Fetch all workflow states
  fetchStates: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get('/api/workflow/states');
      set({ states: response.data.data, loading: false });
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Fehler beim Laden der Workflow-Status',
        loading: false 
      });
      throw error;
    }
  },

  // Change workflow state
  changeState: async (entityType, entityId, toStateId, reason = null) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post('/api/workflow/change', {
        entityType: entityType,      // ✅ camelCase statt snake_case!
        entityId: entityId,          // ✅ camelCase statt snake_case!
        toStateId: toStateId,        // ✅ camelCase statt snake_case!
        changeReason: reason         // ✅ changeReason statt reason!
      });
      set({ loading: false });
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Fehler beim Ändern des Status';
      set({ 
        error: errorMessage,
        loading: false 
      });
      throw new Error(errorMessage);
    }
  },

  // Fetch workflow history for an entity
  fetchHistory: async (entityType, entityId) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`/api/workflow/${entityType}/${entityId}/history`);
      const history = response.data.data;
      
      // Store in state using composite key
      const key = `${entityType}_${entityId}`;
      set((state) => ({
        history: {
          ...state.history,
          [key]: history
        },
        loading: false
      }));
      
      return history;
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Fehler beim Laden der Historie',
        loading: false 
      });
      throw error;
    }
  },

  // Fetch available transitions for an entity
  fetchTransitions: async (entityType, entityId) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`/api/workflow/${entityType}/${entityId}/transitions`);
      
      // Backend liefert: { data: { currentState: {...}, availableTransitions: [...] } }
      const availableTransitions = response.data.data?.availableTransitions || [];
      
      // Transitions in erwartetes Format mappen
      const transitions = availableTransitions.map(t => ({
        from_state: response.data.data?.currentState?.name || '',
        to_state: t.name,
        to_state_name: t.description,
        ...t // alle anderen Felder auch übernehmen
      }));
      
      // Store in state using composite key
      const key = `${entityType}_${entityId}`;
      set((state) => ({
        transitions: {
          ...state.transitions,
          [key]: transitions
        },
        loading: false
      }));
      
      return transitions;
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Fehler beim Laden der Übergänge',
        loading: false 
      });
      throw error;
    }
  },

  // Get history for specific entity from state
  getHistory: (entityType, entityId) => {
    const key = `${entityType}_${entityId}`;
    return get().history[key] || [];
  },

  // Get transitions for specific entity from state
  getTransitions: (entityType, entityId) => {
    const key = `${entityType}_${entityId}`;
    return get().transitions[key] || [];
  },

  // Get state info by state code
  getStateInfo: (stateCode) => {
    const states = get().states;
    return states.find(s => s.code === stateCode) || null;
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Reset store
  reset: () => set({
    states: [],
    loading: false,
    error: null,
    history: {},
    transitions: {}
  })
}));

export { useWorkflowStore };
