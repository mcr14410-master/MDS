import { create } from 'zustand';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const useDashboardStore = create((set, get) => ({
  // State
  stats: null,
  lowStockItems: [],
  lowStockSummary: null,
  recentMovements: [],
  calibrationAlerts: null,
  loading: false,
  error: null,

  // Fetch overall dashboard stats
  fetchStats: async () => {
    set({ loading: true, error: null });
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }

      const result = await response.json();
      
      if (result.success) {
        set({ stats: result.data, loading: false });
      } else {
        throw new Error(result.error || 'Failed to fetch stats');
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      set({ error: error.message, loading: false });
    }
  },

  // Fetch low stock items
  fetchLowStockItems: async (limit = 10) => {
    set({ loading: true, error: null });
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/dashboard/low-stock?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch low stock items');
      }

      const result = await response.json();
      
      if (result.success) {
        set({ lowStockItems: result.data, loading: false });
      } else {
        throw new Error(result.error || 'Failed to fetch low stock items');
      }
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      set({ error: error.message, loading: false });
    }
  },

  // Fetch low stock summary
  fetchLowStockSummary: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/dashboard/low-stock-summary`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch low stock summary');
      }

      const result = await response.json();
      
      if (result.success) {
        set({ lowStockSummary: result.data });
      }
    } catch (error) {
      console.error('Error fetching low stock summary:', error);
    }
  },

  // Fetch recent stock movements
  fetchRecentMovements: async (limit = 5) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/dashboard/recent-movements?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recent movements');
      }

      const result = await response.json();
      
      if (result.success) {
        set({ recentMovements: result.data });
      }
    } catch (error) {
      console.error('Error fetching recent movements:', error);
    }
  },

  // Fetch calibration alerts for measuring equipment
  fetchCalibrationAlerts: async (limit = 10) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/dashboard/calibration-alerts?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch calibration alerts');
      }

      const result = await response.json();
      
      if (result.success) {
        set({ calibrationAlerts: result.data });
      }
    } catch (error) {
      console.error('Error fetching calibration alerts:', error);
    }
  },

  // Clear error
  clearError: () => set({ error: null })
}));
