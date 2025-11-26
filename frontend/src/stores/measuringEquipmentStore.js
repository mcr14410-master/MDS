import { create } from 'zustand';
import axios from '../utils/axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const useMeasuringEquipmentStore = create((set, get) => ({
  // State
  equipment: [],
  types: [],
  stats: null,
  currentEquipment: null,
  loading: false,
  error: null,

  // ============================================================================
  // TYPES
  // ============================================================================
  
  fetchTypes: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters.is_active !== undefined) params.append('is_active', filters.is_active);
      
      const url = `${API_BASE_URL}/api/measuring-equipment/types${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);
      set({ types: response.data.data, loading: false });
      return response.data.data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  createType: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_BASE_URL}/api/measuring-equipment/types`, data);
      const newType = response.data.data;
      set(state => ({
        types: [...state.types, newType],
        loading: false
      }));
      return newType;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateType: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.put(`${API_BASE_URL}/api/measuring-equipment/types/${id}`, data);
      const updatedType = response.data.data;
      set(state => ({
        types: state.types.map(t => t.id === id ? updatedType : t),
        loading: false
      }));
      return updatedType;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteType: async (id) => {
    set({ loading: true, error: null });
    try {
      await axios.delete(`${API_BASE_URL}/api/measuring-equipment/types/${id}`);
      set(state => ({
        types: state.types.filter(t => t.id !== id),
        loading: false
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // ============================================================================
  // EQUIPMENT
  // ============================================================================

  fetchEquipment: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters.type_id) params.append('type_id', filters.type_id);
      if (filters.status) params.append('status', filters.status);
      if (filters.calibration_status) params.append('calibration_status', filters.calibration_status);
      if (filters.search) params.append('search', filters.search);
      if (filters.sort_by) params.append('sort_by', filters.sort_by);
      if (filters.sort_order) params.append('sort_order', filters.sort_order);
      
      const url = `${API_BASE_URL}/api/measuring-equipment${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);
      set({ equipment: response.data.data, loading: false });
      return response.data.data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  fetchEquipmentById: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`${API_BASE_URL}/api/measuring-equipment/${id}`);
      set({ currentEquipment: response.data.data, loading: false });
      return response.data.data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  fetchStats: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/measuring-equipment/stats`);
      set({ stats: response.data.data });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  },

  getNextInventoryNumber: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/measuring-equipment/next-number`);
      return response.data.data.next_inventory_number;
    } catch (error) {
      throw error;
    }
  },

  createEquipment: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_BASE_URL}/api/measuring-equipment`, data);
      const newEquipment = response.data.data;
      set(state => ({
        equipment: [...state.equipment, newEquipment],
        loading: false
      }));
      return newEquipment;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateEquipment: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.put(`${API_BASE_URL}/api/measuring-equipment/${id}`, data);
      const updated = response.data.data;
      set(state => ({
        equipment: state.equipment.map(e => e.id === id ? updated : e),
        currentEquipment: state.currentEquipment?.id === id ? updated : state.currentEquipment,
        loading: false
      }));
      return updated;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateEquipmentStatus: async (id, status, lock_reason = null) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.patch(`${API_BASE_URL}/api/measuring-equipment/${id}/status`, { status, lock_reason });
      const updated = response.data.data;
      set(state => ({
        equipment: state.equipment.map(e => e.id === id ? updated : e),
        currentEquipment: state.currentEquipment?.id === id ? updated : state.currentEquipment,
        loading: false
      }));
      return updated;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteEquipment: async (id) => {
    set({ loading: true, error: null });
    try {
      await axios.delete(`${API_BASE_URL}/api/measuring-equipment/${id}`);
      set(state => ({
        equipment: state.equipment.filter(e => e.id !== id),
        loading: false
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // ============================================================================
  // CALIBRATIONS
  // ============================================================================

  createCalibration: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_BASE_URL}/api/calibrations`, data);
      // Refresh current equipment to get updated calibration data
      if (get().currentEquipment?.id === data.equipment_id) {
        await get().fetchEquipmentById(data.equipment_id);
      }
      set({ loading: false });
      return response.data.data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateCalibration: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.put(`${API_BASE_URL}/api/calibrations/${id}`, data);
      set({ loading: false });
      return response.data.data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteCalibration: async (id, equipmentId) => {
    set({ loading: true, error: null });
    try {
      await axios.delete(`${API_BASE_URL}/api/calibrations/${id}`);
      // Refresh current equipment
      if (equipmentId) {
        await get().fetchEquipmentById(equipmentId);
      }
      set({ loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // ============================================================================
  // CERTIFICATES
  // ============================================================================

  uploadCertificate: async (calibrationId, file) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API_BASE_URL}/api/calibrations/${calibrationId}/certificates`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      set({ loading: false });
      return response.data.data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteCertificate: async (certId) => {
    set({ loading: true, error: null });
    try {
      await axios.delete(`${API_BASE_URL}/api/calibrations/certificates/${certId}`);
      set({ loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Clear current equipment
  clearCurrentEquipment: () => set({ currentEquipment: null }),
}));
