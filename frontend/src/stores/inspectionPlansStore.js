// frontend/src/stores/inspectionPlansStore.js
import { create } from 'zustand';
import axios from '../utils/axios';
import { API_ENDPOINTS } from '../config/api';

export const useInspectionPlansStore = create((set, get) => ({
  // State – Prüfplan je Arbeitsgang ({ [operationId]: { id, operation_id, notes, items: [] } }):
  // mehrere Arbeitsgänge sind gleichzeitig eingebunden, ein gemeinsamer Plan würde überall
  // den zuletzt geladenen zeigen
  inspectionPlanByOperation: {},
  loadingByOperation: {},
  errorByOperation: {},
  loading: false,
  error: null,

  // Fetch inspection plan for an operation (auto-creates if not exists)
  fetchInspectionPlan: async (operationId) => {
    set(state => ({
      loadingByOperation: { ...state.loadingByOperation, [operationId]: true },
      errorByOperation: { ...state.errorByOperation, [operationId]: null },
    }));
    try {
      const response = await axios.get(`${API_ENDPOINTS.INSPECTION_PLANS}/${operationId}/inspection-plan`);
      
      set(state => ({
        inspectionPlanByOperation: { ...state.inspectionPlanByOperation, [operationId]: response.data },
        loadingByOperation: { ...state.loadingByOperation, [operationId]: false },
      }));
      
      return response.data;
    } catch (error) {
      console.error('fetchInspectionPlan error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden des Prüfplans';
      set(state => ({
        inspectionPlanByOperation: { ...state.inspectionPlanByOperation, [operationId]: null },
        loadingByOperation: { ...state.loadingByOperation, [operationId]: false },
        errorByOperation: { ...state.errorByOperation, [operationId]: errorMessage },
      }));
      throw error;
    }
  },

  // Update inspection plan notes
  updateInspectionPlanNotes: async (operationId, notes) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.put(
        `${API_ENDPOINTS.INSPECTION_PLANS}/${operationId}/inspection-plan`,
        { notes }
      );
      
      set(state => ({
        inspectionPlanByOperation: { ...state.inspectionPlanByOperation, [operationId]: response.data },
        loading: false
      }));
      
      return response.data;
    } catch (error) {
      console.error('updateInspectionPlanNotes error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Aktualisieren der Notizen';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw error;
    }
  },

  // Add inspection item
  addInspectionItem: async (operationId, itemData) => {
    try {
      set({ loading: true, error: null });
      
      await axios.post(
        `${API_ENDPOINTS.INSPECTION_PLANS}/${operationId}/inspection-plan/items`,
        itemData
      );
      
      // Refresh inspection plan
      await get().fetchInspectionPlan(operationId);
      
      set({ loading: false });
    } catch (error) {
      console.error('addInspectionItem error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Hinzufügen des Prüfpunkts';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw error;
    }
  },

  // Update inspection item
  updateInspectionItem: async (itemId, itemData, operationId) => {
    try {
      set({ loading: true, error: null });
      
      await axios.put(
        `${API_ENDPOINTS.INSPECTION_PLAN_ITEMS}/${itemId}`,
        itemData
      );
      
      // Refresh inspection plan if operationId provided
      if (operationId) {
        await get().fetchInspectionPlan(operationId);
      }
      
      set({ loading: false });
    } catch (error) {
      console.error('updateInspectionItem error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Aktualisieren des Prüfpunkts';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw error;
    }
  },

  // Delete inspection item
  deleteInspectionItem: async (itemId, operationId) => {
    try {
      set({ loading: true, error: null });
      
      await axios.delete(`${API_ENDPOINTS.INSPECTION_PLAN_ITEMS}/${itemId}`);
      
      // Refresh inspection plan
      if (operationId) {
        await get().fetchInspectionPlan(operationId);
      }
      
      set({ loading: false });
    } catch (error) {
      console.error('deleteInspectionItem error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Löschen des Prüfpunkts';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw error;
    }
  },

  // Reorder inspection items
  reorderInspectionItems: async (operationId, itemIds) => {
    try {
      set({ loading: true, error: null });
      
      await axios.post(
        `${API_ENDPOINTS.INSPECTION_PLANS}/${operationId}/inspection-plan/reorder`,
        { item_ids: itemIds }
      );
      
      // Refresh inspection plan
      await get().fetchInspectionPlan(operationId);
      
      set({ loading: false });
    } catch (error) {
      console.error('reorderInspectionItems error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Sortieren der Prüfpunkte';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw error;
    }
  },

  // Move item up in list
  moveItemUp: async (operationId, itemId) => {
    const currentPlan = get().inspectionPlanByOperation[operationId];
    if (!currentPlan || !currentPlan.items) return;
    
    const items = currentPlan.items;
    const index = items.findIndex(item => item.id === itemId);
    
    if (index <= 0) return; // Already at top
    
    // Swap with previous item
    const newOrder = [...items];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    
    // Extract IDs in new order
    const itemIds = newOrder.map(item => item.id);
    
    await get().reorderInspectionItems(operationId, itemIds);
  },

  // Move item down in list
  moveItemDown: async (operationId, itemId) => {
    const currentPlan = get().inspectionPlanByOperation[operationId];
    if (!currentPlan || !currentPlan.items) return;
    
    const items = currentPlan.items;
    const index = items.findIndex(item => item.id === itemId);
    
    if (index < 0 || index >= items.length - 1) return; // Already at bottom
    
    // Swap with next item
    const newOrder = [...items];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    
    // Extract IDs in new order
    const itemIds = newOrder.map(item => item.id);
    
    await get().reorderInspectionItems(operationId, itemIds);
  },

  // Clear loaded inspection plans
  clearInspectionPlan: () => {
    set({ inspectionPlanByOperation: {}, loadingByOperation: {}, errorByOperation: {}, error: null });
  },
}));
