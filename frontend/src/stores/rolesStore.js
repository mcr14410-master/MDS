import { create } from 'zustand';
import axios from '../utils/axios';
import { API_ENDPOINTS } from '../config/api';

export const useRolesStore = create((set, get) => ({
  // State
  roles: [],
  currentRole: null,
  permissions: [],
  permissionsGrouped: {},
  permissionMatrix: null,
  loading: false,
  error: null,

  // Fetch all roles
  fetchRoles: async () => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.get(API_ENDPOINTS.ROLES);
      
      set({ 
        roles: response.data.roles,
        loading: false 
      });
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der Rollen';
      set({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  // Fetch single role
  fetchRole: async (id) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.get(`${API_ENDPOINTS.ROLES}/${id}`);
      
      set({ 
        currentRole: response.data.role,
        loading: false 
      });
      
      return { success: true, role: response.data.role };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Rolle nicht gefunden';
      set({ loading: false, error: errorMessage, currentRole: null });
      return { success: false, error: errorMessage };
    }
  },

  // Create role
  createRole: async (roleData) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.post(API_ENDPOINTS.ROLES, roleData);
      
      // Add new role to list
      set(state => ({ 
        roles: [...state.roles, response.data.role],
        loading: false 
      }));
      
      return { success: true, role: response.data.role };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Erstellen der Rolle';
      set({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  // Update role
  updateRole: async (id, roleData) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.put(`${API_ENDPOINTS.ROLES}/${id}`, roleData);
      
      // Update role in list
      set(state => ({ 
        roles: state.roles.map(r => r.id === id ? response.data.role : r),
        currentRole: state.currentRole?.id === id ? response.data.role : state.currentRole,
        loading: false 
      }));
      
      return { success: true, role: response.data.role };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Aktualisieren der Rolle';
      set({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  // Delete role
  deleteRole: async (id) => {
    try {
      set({ loading: true, error: null });
      
      await axios.delete(`${API_ENDPOINTS.ROLES}/${id}`);
      
      // Remove role from list
      set(state => ({ 
        roles: state.roles.filter(r => r.id !== id),
        currentRole: state.currentRole?.id === id ? null : state.currentRole,
        loading: false 
      }));
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Löschen der Rolle';
      set({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  // Fetch all permissions
  fetchPermissions: async () => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.get(API_ENDPOINTS.PERMISSIONS);
      
      set({ 
        permissions: response.data.permissions,
        permissionsGrouped: response.data.grouped,
        loading: false 
      });
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der Berechtigungen';
      set({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  // Fetch permission matrix
  fetchPermissionMatrix: async () => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.get(API_ENDPOINTS.ROLES_MATRIX);
      
      set({ 
        permissionMatrix: response.data,
        loading: false 
      });
      
      return { success: true, matrix: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der Berechtigungs-Matrix';
      set({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
  
  // Clear current role
  clearCurrentRole: () => set({ currentRole: null }),
}));
