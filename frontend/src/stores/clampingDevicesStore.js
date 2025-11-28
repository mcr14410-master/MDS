import { create } from 'zustand';
import axios from '../utils/axios';

export const useClampingDevicesStore = create((set, get) => ({
  // State
  devices: [],
  types: [],
  stats: null,
  currentDevice: null,
  loading: false,
  error: null,

  // ============================================================================
  // TYPES
  // ============================================================================

  fetchTypes: async (activeOnly = false) => {
    try {
      const params = activeOnly ? { is_active: 'true' } : {};
      const response = await axios.get('/api/clamping-devices/types', { params });
      set({ types: response.data.data });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching clamping device types:', error);
      throw error;
    }
  },

  createType: async (data) => {
    try {
      const response = await axios.post('/api/clamping-devices/types', data);
      return response.data.data;
    } catch (error) {
      console.error('Error creating clamping device type:', error);
      throw error;
    }
  },

  updateType: async (id, data) => {
    try {
      const response = await axios.put(`/api/clamping-devices/types/${id}`, data);
      return response.data.data;
    } catch (error) {
      console.error('Error updating clamping device type:', error);
      throw error;
    }
  },

  deleteType: async (id) => {
    try {
      await axios.delete(`/api/clamping-devices/types/${id}`);
    } catch (error) {
      console.error('Error deleting clamping device type:', error);
      throw error;
    }
  },

  // ============================================================================
  // DEVICES
  // ============================================================================

  fetchDevices: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get('/api/clamping-devices', { params: filters });
      set({ devices: response.data.data, loading: false });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching clamping devices:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  fetchStats: async () => {
    try {
      const response = await axios.get('/api/clamping-devices/stats');
      set({ stats: response.data.data });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching clamping device stats:', error);
      throw error;
    }
  },

  fetchDevice: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`/api/clamping-devices/${id}`);
      set({ currentDevice: response.data.data, loading: false });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching clamping device:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  fetchNextInventoryNumber: async () => {
    try {
      const response = await axios.get('/api/clamping-devices/next-number');
      return response.data.data.inventory_number;
    } catch (error) {
      console.error('Error fetching next inventory number:', error);
      throw error;
    }
  },

  createDevice: async (data) => {
    try {
      const response = await axios.post('/api/clamping-devices', data);
      // Refresh list
      get().fetchDevices();
      return response.data.data;
    } catch (error) {
      console.error('Error creating clamping device:', error);
      throw error;
    }
  },

  updateDevice: async (id, data) => {
    try {
      const response = await axios.put(`/api/clamping-devices/${id}`, data);
      // Update in list
      set((state) => ({
        devices: state.devices.map((d) => 
          d.id === id ? response.data.data : d
        ),
        currentDevice: state.currentDevice?.id === id 
          ? response.data.data 
          : state.currentDevice
      }));
      return response.data.data;
    } catch (error) {
      console.error('Error updating clamping device:', error);
      throw error;
    }
  },

  deleteDevice: async (id) => {
    try {
      await axios.delete(`/api/clamping-devices/${id}`);
      // Remove from list
      set((state) => ({
        devices: state.devices.filter((d) => d.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting clamping device:', error);
      throw error;
    }
  },

  updateDeviceStatus: async (id, status) => {
    try {
      const response = await axios.patch(`/api/clamping-devices/${id}/status`, { status });
      // Update in list
      set((state) => ({
        devices: state.devices.map((d) => 
          d.id === id ? response.data.data : d
        ),
        currentDevice: state.currentDevice?.id === id 
          ? response.data.data 
          : state.currentDevice
      }));
      return response.data.data;
    } catch (error) {
      console.error('Error updating clamping device status:', error);
      throw error;
    }
  },

  // Clear current device
  clearCurrentDevice: () => {
    set({ currentDevice: null });
  },
}));
