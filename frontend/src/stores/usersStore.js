import { create } from 'zustand';
import axios from '../utils/axios';
import { API_ENDPOINTS } from '../config/api';

export const useUsersStore = create((set, get) => ({
  // State
  users: [],
  currentUser: null,
  userActivity: [],
  loading: false,
  error: null,
  total: 0,
  
  // Filters
  filters: {
    search: '',
    role: '',
    is_active: ''
  },

  // Set filters
  setFilters: (newFilters) => {
    set({ filters: { ...get().filters, ...newFilters } });
  },

  // Reset filters
  resetFilters: () => {
    set({ 
      filters: { search: '', role: '', is_active: '' }
    });
  },

  // Fetch all users
  fetchUsers: async () => {
    try {
      set({ loading: true, error: null });
      
      const { filters } = get();
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.role) params.append('role', filters.role);
      if (filters.is_active !== '') params.append('is_active', filters.is_active);
      
      const response = await axios.get(`${API_ENDPOINTS.USERS}?${params.toString()}`);
      
      set({ 
        users: response.data.users,
        total: response.data.total,
        loading: false 
      });
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der Benutzer';
      set({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  // Fetch single user
  fetchUser: async (id) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.get(`${API_ENDPOINTS.USERS}/${id}`);
      
      set({ 
        currentUser: response.data.user,
        loading: false 
      });
      
      return { success: true, user: response.data.user };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Benutzer nicht gefunden';
      set({ loading: false, error: errorMessage, currentUser: null });
      return { success: false, error: errorMessage };
    }
  },

  // Create user
  createUser: async (userData) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.post(API_ENDPOINTS.USERS, userData);
      
      // Add new user to list
      set(state => ({ 
        users: [...state.users, response.data.user],
        loading: false 
      }));
      
      return { success: true, user: response.data.user };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Erstellen des Benutzers';
      set({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  // Update user
  updateUser: async (id, userData) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.put(`${API_ENDPOINTS.USERS}/${id}`, userData);
      
      // Update user in list
      set(state => ({ 
        users: state.users.map(u => u.id === id ? response.data.user : u),
        currentUser: state.currentUser?.id === id ? response.data.user : state.currentUser,
        loading: false 
      }));
      
      return { success: true, user: response.data.user };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Aktualisieren des Benutzers';
      set({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  // Delete user
  deleteUser: async (id) => {
    try {
      set({ loading: true, error: null });
      
      await axios.delete(`${API_ENDPOINTS.USERS}/${id}`);
      
      // Remove user from list
      set(state => ({ 
        users: state.users.filter(u => u.id !== id),
        currentUser: state.currentUser?.id === id ? null : state.currentUser,
        loading: false 
      }));
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Löschen des Benutzers';
      set({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  // Reset password
  resetPassword: async (id, newPassword) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.post(`${API_ENDPOINTS.USERS}/${id}/reset-password`, {
        new_password: newPassword
      });
      
      set({ loading: false });
      
      return { success: true, message: response.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Zurücksetzen des Passworts';
      set({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  // Toggle user active status
  toggleActive: async (id) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.patch(`${API_ENDPOINTS.USERS}/${id}/toggle-active`);
      
      // Update user in list
      set(state => ({ 
        users: state.users.map(u => 
          u.id === id ? { ...u, is_active: response.data.is_active } : u
        ),
        currentUser: state.currentUser?.id === id 
          ? { ...state.currentUser, is_active: response.data.is_active } 
          : state.currentUser,
        loading: false 
      }));
      
      return { success: true, is_active: response.data.is_active };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Ändern des Status';
      set({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  // Fetch user activity
  fetchUserActivity: async (id, limit = 50) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.get(`${API_ENDPOINTS.USERS}/${id}/activity?limit=${limit}`);
      
      set({ 
        userActivity: response.data.activities,
        loading: false 
      });
      
      return { success: true, activities: response.data.activities };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der Aktivitäten';
      set({ loading: false, error: errorMessage, userActivity: [] });
      return { success: false, error: errorMessage };
    }
  },

  // Update own profile
  updateProfile: async (profileData) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.put(API_ENDPOINTS.USER_PROFILE, profileData);
      
      set({ loading: false });
      
      return { success: true, user: response.data.user };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Aktualisieren des Profils';
      set({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
  
  // Clear current user
  clearCurrentUser: () => set({ currentUser: null, userActivity: [] }),
}));
