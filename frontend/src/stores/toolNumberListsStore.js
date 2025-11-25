/**
 * Tool Number Lists Store
 * 
 * Manages T-Number lists for NC programs
 * Phase 5: Tool Number Lists
 */

import { create } from 'zustand';
import axios from '../utils/axios';

const API_BASE = '/api/tool-number-lists';
const API_ITEMS = '/api/tool-number-list-items';
const API_ALTERNATIVES = '/api/tool-number-alternatives';

const useToolNumberListsStore = create((set, get) => ({
  // ============================================================================
  // STATE
  // ============================================================================
  
  // Lists
  lists: [],
  currentList: null,
  
  // List items
  listItems: [],
  
  // Loading states
  loading: false,
  itemsLoading: false,
  
  // Errors
  error: null,
  
  // ============================================================================
  // LISTS - CRUD
  // ============================================================================
  
  /**
   * Fetch all tool number lists
   */
  fetchLists: async (includeInactive = false, search = '') => {
    try {
      set({ loading: true, error: null });
      
      const params = new URLSearchParams();
      if (includeInactive) params.append('include_inactive', 'true');
      if (search) params.append('search', search);
      
      const response = await axios.get(`${API_BASE}?${params.toString()}`);
      
      set({
        lists: response.data.data || [],
        loading: false
      });
      
      return response.data.data;
    } catch (error) {
      console.error('Error fetching tool number lists:', error);
      set({
        loading: false,
        error: error.response?.data?.error || 'Fehler beim Laden der Listen'
      });
      throw error;
    }
  },
  
  /**
   * Fetch single list by ID with items and machines
   */
  fetchListById: async (id) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.get(`${API_BASE}/${id}`);
      
      set({
        currentList: response.data.data,
        listItems: response.data.data?.items || [],
        loading: false
      });
      
      return response.data.data;
    } catch (error) {
      console.error('Error fetching tool number list:', error);
      set({
        loading: false,
        error: error.response?.data?.error || 'Fehler beim Laden der Liste'
      });
      throw error;
    }
  },
  
  /**
   * Create new list
   */
  createList: async (listData) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.post(API_BASE, listData);
      
      // Add to lists array
      set(state => ({
        lists: [...state.lists, response.data.data],
        loading: false
      }));
      
      return response.data.data;
    } catch (error) {
      console.error('Error creating tool number list:', error);
      set({
        loading: false,
        error: error.response?.data?.error || 'Fehler beim Erstellen der Liste'
      });
      throw error;
    }
  },
  
  /**
   * Update list
   */
  updateList: async (id, listData) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.put(`${API_BASE}/${id}`, listData);
      
      // Update in lists array
      set(state => ({
        lists: state.lists.map(l => l.id === id ? response.data.data : l),
        currentList: state.currentList?.id === id ? response.data.data : state.currentList,
        loading: false
      }));
      
      return response.data.data;
    } catch (error) {
      console.error('Error updating tool number list:', error);
      set({
        loading: false,
        error: error.response?.data?.error || 'Fehler beim Aktualisieren der Liste'
      });
      throw error;
    }
  },
  
  /**
   * Delete list
   */
  deleteList: async (id) => {
    try {
      set({ loading: true, error: null });
      
      await axios.delete(`${API_BASE}/${id}`);
      
      // Remove from lists array
      set(state => ({
        lists: state.lists.filter(l => l.id !== id),
        currentList: state.currentList?.id === id ? null : state.currentList,
        loading: false
      }));
      
      return true;
    } catch (error) {
      console.error('Error deleting tool number list:', error);
      set({
        loading: false,
        error: error.response?.data?.error || 'Fehler beim Löschen der Liste'
      });
      throw error;
    }
  },
  
  /**
   * Duplicate list
   */
  duplicateList: async (id, newName) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.post(`${API_BASE}/${id}/duplicate`, { new_name: newName });
      
      // Add to lists array
      set(state => ({
        lists: [...state.lists, response.data.data],
        loading: false
      }));
      
      return response.data.data;
    } catch (error) {
      console.error('Error duplicating tool number list:', error);
      set({
        loading: false,
        error: error.response?.data?.error || 'Fehler beim Duplizieren der Liste'
      });
      throw error;
    }
  },
  
  // ============================================================================
  // LIST ITEMS - CRUD
  // ============================================================================
  
  /**
   * Create list item (T-Number)
   */
  createListItem: async (listId, itemData) => {
    try {
      set({ itemsLoading: true, error: null });
      
      const response = await axios.post(`${API_BASE}/${listId}/items`, itemData);
      
      // Add to listItems array
      set(state => ({
        listItems: [...state.listItems, response.data.data],
        itemsLoading: false
      }));
      
      return response.data.data;
    } catch (error) {
      console.error('Error creating list item:', error);
      set({
        itemsLoading: false,
        error: error.response?.data?.error || 'Fehler beim Erstellen des Eintrags'
      });
      throw error;
    }
  },
  
  /**
   * Update list item
   */
  updateListItem: async (itemId, itemData) => {
    try {
      set({ itemsLoading: true, error: null });
      
      const response = await axios.put(`${API_ITEMS}/${itemId}`, itemData);
      
      // Update in listItems array
      set(state => ({
        listItems: state.listItems.map(i => i.id === itemId ? response.data.data : i),
        itemsLoading: false
      }));
      
      return response.data.data;
    } catch (error) {
      console.error('Error updating list item:', error);
      set({
        itemsLoading: false,
        error: error.response?.data?.error || 'Fehler beim Aktualisieren des Eintrags'
      });
      throw error;
    }
  },
  
  /**
   * Delete list item
   */
  deleteListItem: async (itemId) => {
    try {
      set({ itemsLoading: true, error: null });
      
      await axios.delete(`${API_ITEMS}/${itemId}`);
      
      // Remove from listItems array
      set(state => ({
        listItems: state.listItems.filter(i => i.id !== itemId),
        itemsLoading: false
      }));
      
      return true;
    } catch (error) {
      console.error('Error deleting list item:', error);
      set({
        itemsLoading: false,
        error: error.response?.data?.error || 'Fehler beim Löschen des Eintrags'
      });
      throw error;
    }
  },
  
  /**
   * Reorder list items
   */
  reorderListItems: async (listId, items) => {
    try {
      set({ itemsLoading: true, error: null });
      
      await axios.put(`${API_BASE}/${listId}/items/reorder`, { items });
      
      // Update local order
      set(state => {
        const reordered = [...state.listItems];
        items.forEach(({ id, sequence }) => {
          const item = reordered.find(i => i.id === id);
          if (item) item.sequence = sequence;
        });
        reordered.sort((a, b) => a.sequence - b.sequence);
        return { listItems: reordered, itemsLoading: false };
      });
      
      return true;
    } catch (error) {
      console.error('Error reordering list items:', error);
      set({
        itemsLoading: false,
        error: error.response?.data?.error || 'Fehler beim Sortieren'
      });
      throw error;
    }
  },
  
  // ============================================================================
  // ALTERNATIVES - CRUD
  // ============================================================================
  
  /**
   * Fetch alternatives for a list item
   */
  fetchAlternatives: async (itemId) => {
    try {
      const response = await axios.get(`${API_ITEMS}/${itemId}/alternatives`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching alternatives:', error);
      throw error;
    }
  },
  
  /**
   * Add alternative tool
   */
  addAlternative: async (itemId, toolMasterId, priority = null, notes = null) => {
    try {
      const payload = { tool_master_id: toolMasterId };
      if (priority !== null) payload.priority = priority;
      if (notes !== null) payload.notes = notes;
      
      const response = await axios.post(`${API_ITEMS}/${itemId}/alternatives`, payload);
      return response.data.data;
    } catch (error) {
      console.error('Error adding alternative:', error);
      throw error;
    }
  },
  
  /**
   * Update alternative
   */
  updateAlternative: async (alternativeId, data) => {
    try {
      const response = await axios.put(`${API_ALTERNATIVES}/${alternativeId}`, data);
      return response.data.data;
    } catch (error) {
      console.error('Error updating alternative:', error);
      throw error;
    }
  },
  
  /**
   * Remove alternative
   */
  removeAlternative: async (alternativeId) => {
    try {
      await axios.delete(`${API_ALTERNATIVES}/${alternativeId}`);
      return true;
    } catch (error) {
      console.error('Error removing alternative:', error);
      throw error;
    }
  },
  
  /**
   * Reorder alternatives
   */
  reorderAlternatives: async (itemId, alternatives) => {
    try {
      await axios.put(`${API_ITEMS}/${itemId}/alternatives/reorder`, { alternatives });
      return true;
    } catch (error) {
      console.error('Error reordering alternatives:', error);
      throw error;
    }
  },
  
  // ============================================================================
  // MACHINE ASSIGNMENT
  // ============================================================================
  
  /**
   * Fetch lists for a machine
   */
  fetchListsForMachine: async (machineId) => {
    try {
      const response = await axios.get(`/api/machines/${machineId}/tool-number-lists`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching lists for machine:', error);
      throw error;
    }
  },
  
  /**
   * Assign list to machine
   */
  assignListToMachine: async (machineId, listId, isActive = true) => {
    try {
      const response = await axios.post(`/api/machines/${machineId}/tool-number-lists`, {
        list_id: listId,
        is_active: isActive
      });
      return response.data.data;
    } catch (error) {
      console.error('Error assigning list to machine:', error);
      throw error;
    }
  },
  
  /**
   * Toggle list active state for machine
   */
  toggleListForMachine: async (machineId, listId) => {
    try {
      const response = await axios.put(`/api/machines/${machineId}/tool-number-lists/${listId}/toggle`);
      return response.data.data;
    } catch (error) {
      console.error('Error toggling list for machine:', error);
      throw error;
    }
  },
  
  /**
   * Unassign list from machine
   */
  unassignListFromMachine: async (machineId, listId) => {
    try {
      await axios.delete(`/api/machines/${machineId}/tool-number-lists/${listId}`);
      return true;
    } catch (error) {
      console.error('Error unassigning list from machine:', error);
      throw error;
    }
  },
  
  // ============================================================================
  // TOOL MAPPING (for NC Parser)
  // ============================================================================
  
  /**
   * Find tool mapping for a T-Number on a machine
   */
  findToolMapping: async (machineId, toolNumber) => {
    try {
      const response = await axios.get(`/api/machines/${machineId}/tool-mapping/${toolNumber}`);
      return response.data.data;
    } catch (error) {
      console.error('Error finding tool mapping:', error);
      throw error;
    }
  },
  
  /**
   * Bulk find tool mappings
   */
  findToolMappingsBulk: async (machineId, toolNumbers) => {
    try {
      const response = await axios.post(`/api/machines/${machineId}/tool-mapping/bulk`, {
        tool_numbers: toolNumbers
      });
      return response.data.data;
    } catch (error) {
      console.error('Error finding tool mappings:', error);
      throw error;
    }
  },
  
  // ============================================================================
  // UTILITY
  // ============================================================================
  
  /**
   * Clear current list
   */
  clearCurrentList: () => {
    set({ currentList: null, listItems: [] });
  },
  
  /**
   * Clear error
   */
  clearError: () => {
    set({ error: null });
  }
}));

export default useToolNumberListsStore;
