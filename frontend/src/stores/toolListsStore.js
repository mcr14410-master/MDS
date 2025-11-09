// frontend/src/stores/toolListsStore.js
import { create } from 'zustand';
import axios from '../utils/axios';
import { API_ENDPOINTS } from '../config/api';

export const useToolListsStore = create((set, get) => ({
  // State
  toolList: null,      // { id, program_id, items: [] }
  loading: false,
  error: null,

  // Fetch tool list for a program (auto-creates if not exists)
  fetchToolList: async (programId) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.get(`${API_ENDPOINTS.TOOL_LISTS}/${programId}/tools`);
      
      set({ 
        toolList: response.data.data,
        loading: false 
      });
      
      return response.data.data;
    } catch (error) {
      console.error('fetchToolList error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der Werkzeugliste';
      set({ 
        loading: false, 
        error: errorMessage,
        toolList: null
      });
      throw error;
    }
  },

  // Add tool item to list
  addToolItem: async (programId, toolData) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.post(
        `${API_ENDPOINTS.TOOL_LISTS}/${programId}/tools`,
        toolData
      );
      
      // Refresh tool list
      await get().fetchToolList(programId);
      
      set({ loading: false });
      return response.data.data;
    } catch (error) {
      console.error('addToolItem error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Hinzufügen des Werkzeugs';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw error;
    }
  },

  // Update tool item
  updateToolItem: async (itemId, toolData) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.put(
        `${API_ENDPOINTS.TOOLS}/${itemId}`,
        toolData
      );
      
      // Update item in current list
      const currentList = get().toolList;
      if (currentList) {
        const updatedItems = currentList.items.map(item =>
          item.id === itemId ? response.data.data : item
        );
        set({
          toolList: { ...currentList, items: updatedItems },
          loading: false
        });
      } else {
        set({ loading: false });
      }
      
      return response.data.data;
    } catch (error) {
      console.error('updateToolItem error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Aktualisieren des Werkzeugs';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw error;
    }
  },

  // Delete tool item
  deleteToolItem: async (itemId) => {
    try {
      set({ loading: true, error: null });
      
      await axios.delete(`${API_ENDPOINTS.TOOLS}/${itemId}`);
      
      // Remove item from current list
      const currentList = get().toolList;
      if (currentList) {
        const updatedItems = currentList.items.filter(item => item.id !== itemId);
        set({
          toolList: { ...currentList, items: updatedItems },
          loading: false
        });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      console.error('deleteToolItem error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Löschen des Werkzeugs';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw error;
    }
  },

  // Reorder tool items (for drag & drop or move up/down)
  reorderToolItems: async (programId, itemIds) => {
    try {
      set({ loading: true, error: null });
      
      await axios.post(
        `${API_ENDPOINTS.TOOL_LISTS}/${programId}/tools/reorder`,
        { item_ids: itemIds }
      );
      
      // Refresh tool list to get new sequence
      await get().fetchToolList(programId);
      
      set({ loading: false });
    } catch (error) {
      console.error('reorderToolItems error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Sortieren der Werkzeuge';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw error;
    }
  },

  // Move item up in list
  moveItemUp: async (programId, itemId) => {
    const currentList = get().toolList;
    if (!currentList || !currentList.items) return;
    
    const items = currentList.items;
    const index = items.findIndex(item => item.id === itemId);
    
    if (index <= 0) return; // Already at top
    
    // Swap with previous item
    const newOrder = [...items];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    
    // Extract IDs in new order
    const itemIds = newOrder.map(item => item.id);
    
    await get().reorderToolItems(programId, itemIds);
  },

  // Move item down in list
  moveItemDown: async (programId, itemId) => {
    const currentList = get().toolList;
    if (!currentList || !currentList.items) return;
    
    const items = currentList.items;
    const index = items.findIndex(item => item.id === itemId);
    
    if (index < 0 || index >= items.length - 1) return; // Already at bottom
    
    // Swap with next item
    const newOrder = [...items];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    
    // Extract IDs in new order
    const itemIds = newOrder.map(item => item.id);
    
    await get().reorderToolItems(programId, itemIds);
  },

  // Clear current tool list
  clearToolList: () => {
    set({ toolList: null, error: null });
  },
}));
