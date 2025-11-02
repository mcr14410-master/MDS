import { create } from 'zustand';
import axios from '../utils/axios';
import { API_ENDPOINTS } from '../config/api';

export const useAuthStore = create((set, get) => ({
  // State
  user: null,
  token: null,
  loading: true,
  error: null,

  // Initialize - Load from localStorage
  initialize: () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      set({ 
        token, 
        user: JSON.parse(user), 
        loading: false 
      });
      
      // Verify token is still valid
      get().verifyToken();
    } else {
      set({ loading: false });
    }
  },

  // Login
  login: async (credentials) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.post(API_ENDPOINTS.LOGIN, credentials);
      const { token, user } = response.data;
      
      // Save to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      set({ 
        token, 
        user, 
        loading: false,
        error: null 
      });
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login fehlgeschlagen';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ 
      user: null, 
      token: null, 
      error: null 
    });
  },

  // Verify Token
  verifyToken: async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.ME);
      const user = response.data.user;
      
      // Update user data
      localStorage.setItem('user', JSON.stringify(user));
      set({ user });
      
      return true;
    } catch (error) {
      // Token invalid - logout
      get().logout();
      return false;
    }
  },

  // Clear Error
  clearError: () => set({ error: null }),

  // Check if user has permission
  hasPermission: (permission) => {
    const { user } = get();
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  },

  // Check if user has role
  hasRole: (role) => {
    const { user } = get();
    if (!user || !user.role) return false;
    return user.role === role;
  },
}));
