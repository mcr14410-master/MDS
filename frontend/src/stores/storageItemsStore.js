import { create } from 'zustand';
import axios from '../utils/axios';

const API_BASE = '/api/storage/items';
const MOVEMENTS_API = '/api/stock-movements';

export const useStorageItemsStore = create((set, get) => ({
  // ============================================================================
  // STATE
  // ============================================================================
  storageItems: [],
  currentItem: null,
  movements: [],
  loading: false,
  error: null,

  // ============================================================================
  // CRUD ACTIONS
  // ============================================================================

  /**
   * Fetch all storage items
   */
  fetchStorageItems: async (filters = {}) => {
    try {
      set({ loading: true, error: null });

      const params = new URLSearchParams();
      if (filters.tool_master_id) params.append('tool_master_id', filters.tool_master_id);
      if (filters.measuring_equipment_id) params.append('measuring_equipment_id', filters.measuring_equipment_id);
      if (filters.location_id) params.append('location_id', filters.location_id);
      if (filters.compartment_id) params.append('compartment_id', filters.compartment_id);
      if (filters.is_low_stock) params.append('is_low_stock', filters.is_low_stock);
      if (filters.item_type) params.append('item_type', filters.item_type);

      const url = `${API_BASE}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);

      set({
        storageItems: response.data.data || [],
        loading: false,
      });

      return { success: true, data: response.data.data || [] };
    } catch (error) {
      console.error('fetchStorageItems error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden der Lagerartikel';
      set({
        loading: false,
        error: errorMessage,
        storageItems: [],
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Fetch single storage item by ID
   */
  fetchStorageItemById: async (id) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.get(`${API_BASE}/${id}`);

      set({
        currentItem: response.data.data,
        loading: false,
      });

      return response.data.data;
    } catch (error) {
      console.error('fetchStorageItemById error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden des Lagerartikels';
      set({
        loading: false,
        error: errorMessage,
        currentItem: null,
      });
      throw new Error(errorMessage);
    }
  },

  /**
   * Create new storage item
   */
  createStorageItem: async (data) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.post(API_BASE, data);

      set((state) => ({
        storageItems: [response.data.data, ...state.storageItems],
        loading: false,
      }));

      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('createStorageItem error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Erstellen des Lagerartikels';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Update storage item
   */
  updateStorageItem: async (id, data) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.put(`${API_BASE}/${id}`, data);

      set((state) => ({
        storageItems: state.storageItems.map(item =>
          item.id === id ? response.data.data : item
        ),
        currentItem: state.currentItem?.id === id ? response.data.data : state.currentItem,
        loading: false,
      }));

      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('updateStorageItem error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Aktualisieren des Lagerartikels';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Delete storage item
   */
  deleteStorageItem: async (id) => {
    try {
      set({ loading: true, error: null });

      await axios.delete(`${API_BASE}/${id}`);

      set((state) => ({
        storageItems: state.storageItems.filter(item => item.id !== id),
        loading: false,
      }));

      return { success: true };
    } catch (error) {
      console.error('deleteStorageItem error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Löschen des Lagerartikels';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  // ============================================================================
  // STOCK OPERATIONS
  // ============================================================================

  /**
   * Issue stock (Entnahme)
   */
  issueStock: async (id, condition, quantity, reason, reference_type, reference_id) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.post(`${API_BASE}/${id}/issue`, {
        condition,
        quantity,
        reason,
        reference_type,
        reference_id
      });

      // Update current item if it's the one we just modified
      set((state) => ({
        currentItem: state.currentItem?.id === id ? response.data.data : state.currentItem,
        storageItems: state.storageItems.map(item =>
          item.id === id ? response.data.data : item
        ),
        loading: false,
      }));

      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      console.error('issueStock error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Entnehmen';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Receive stock (Einlagerung)
   */
  receiveStock: async (id, condition, quantity, reason, reference_type, reference_id) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.post(`${API_BASE}/${id}/receive`, {
        condition,
        quantity,
        reason,
        reference_type,
        reference_id
      });

      set((state) => ({
        currentItem: state.currentItem?.id === id ? response.data.data : state.currentItem,
        storageItems: state.storageItems.map(item =>
          item.id === id ? response.data.data : item
        ),
        loading: false,
      }));

      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      console.error('receiveStock error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Einlagern';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Transfer stock (Umlagerung)
   */
  transferStock: async (id, condition, quantity, to_compartment_id, reason) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.post(`${API_BASE}/${id}/transfer`, {
        condition,
        quantity,
        to_compartment_id,
        reason
      });

      // Refresh the items list as transfer affects multiple items
      await get().fetchStorageItems();

      set({ loading: false });

      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('transferStock error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Umlagern';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Adjust stock (Korrektur/Inventur)
   */
  adjustStock: async (id, condition, new_quantity, reason) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.post(`${API_BASE}/${id}/adjust`, {
        condition,
        new_quantity,
        reason
      });

      set((state) => ({
        currentItem: state.currentItem?.id === id ? response.data.data : state.currentItem,
        storageItems: state.storageItems.map(item =>
          item.id === id ? response.data.data : item
        ),
        loading: false,
      }));

      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      console.error('adjustStock error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Korrigieren';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Scrap stock (Verschrottung)
   */
  scrapStock: async (id, condition, quantity, reason) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.post(`${API_BASE}/${id}/scrap`, {
        condition,
        quantity,
        reason
      });

      set((state) => ({
        currentItem: state.currentItem?.id === id ? response.data.data : state.currentItem,
        storageItems: state.storageItems.map(item =>
          item.id === id ? response.data.data : item
        ),
        loading: false,
      }));

      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      console.error('scrapStock error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Verschrotten';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  // ============================================================================
  // MOVEMENTS
  // ============================================================================

  /**
   * Fetch movements for a storage item
   */
  fetchMovements: async (storageItemId, limit = 50, offset = 0) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.get(`${MOVEMENTS_API}/item/${storageItemId}?limit=${limit}&offset=${offset}`);

      set({
        movements: response.data.data || [],
        loading: false,
      });
    } catch (error) {
      console.error('fetchMovements error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Fehler beim Laden der Bewegungen';
      set({
        loading: false,
        error: errorMessage,
        movements: [],
      });
    }
  },

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Calculate effective stock for an item
   * Uses weighted calculation: new * 1.0 + used * 0.5 + reground * 0.8
   */
  calculateEffectiveStock: (item) => {
    if (!item) return 0;

    const qtyNew = parseFloat(item.quantity_new || 0);
    const qtyUsed = parseFloat(item.quantity_used || 0);
    const qtyReground = parseFloat(item.quantity_reground || 0);

    const weightNew = parseFloat(item.weight_new || 1.0);
    const weightUsed = parseFloat(item.weight_used || 0.5);
    const weightReground = parseFloat(item.weight_reground || 0.8);

    return qtyNew * weightNew + qtyUsed * weightUsed + qtyReground * weightReground;
  },

  /**
   * Calculate total stock (simple sum)
   */
  calculateTotalStock: (item) => {
    if (!item) return 0;

    return (
      parseFloat(item.quantity_new || 0) +
      parseFloat(item.quantity_used || 0) +
      parseFloat(item.quantity_reground || 0)
    );
  },

  /**
   * Check if item is low stock
   */
  isLowStock: (item) => {
    if (!item || !item.enable_low_stock_alert || !item.reorder_point) {
      return false;
    }

    const effective = get().calculateEffectiveStock(item);
    return effective < parseFloat(item.reorder_point);
  },

  /**
   * Get stock status (ok, warning, critical)
   */
  getStockStatus: (item) => {
    if (!item) return 'unknown';

    const total = get().calculateTotalStock(item);
    const effective = get().calculateEffectiveStock(item);

    // Critical if total stock is very low
    if (total < 3) return 'critical';

    // Warning if effective stock is below reorder point
    if (item.enable_low_stock_alert && item.reorder_point && effective < item.reorder_point) {
      return 'warning';
    }

    return 'ok';
  },

  // ============================================================================
  // QR CODE ACTIONS
  // ============================================================================

  /**
   * QR Code state
   */
  qrCode: null,
  qrCodeLoading: false,
  qrCodeError: null,

  /**
   * Generate or get QR code for storage item
   */
  generateQRCode: async (storageItemId, forceRegenerate = false) => {
    try {
      set({ qrCodeLoading: true, qrCodeError: null });

      const response = await axios.post(`${API_BASE}/${storageItemId}/qr-code`);

      set({
        qrCode: response.data.data,
        qrCodeLoading: false,
      });

      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('generateQRCode error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Generieren des QR-Codes';
      set({
        qrCodeLoading: false,
        qrCodeError: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Get QR code statistics
   */
  getQRCodeStats: async (storageItemId) => {
    try {
      const response = await axios.get(`${API_BASE}/${storageItemId}/qr-code/stats`);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('getQRCodeStats error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Laden der QR-Code Statistiken';
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Scan QR code and get storage item
   */
  scanQRCode: async (qrCode) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.get(`/api/qr-codes/${qrCode}/scan`);

      if (response.data.data.entityType === 'storage_item') {
        set({
          currentItem: response.data.data.storageItem,
          loading: false,
        });
      }

      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('scanQRCode error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Scannen des QR-Codes';
      set({
        loading: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Clear QR code data
   */
  clearQRCode: () => set({ qrCode: null, qrCodeError: null }),

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),

  // ============================================================================
  // MEASURING EQUIPMENT STORAGE
  // ============================================================================

  /**
   * Assign measuring equipment to storage compartment
   */
  assignMeasuringEquipmentToStorage: async (measuring_equipment_id, compartment_id, notes = null) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.post(`${API_BASE}/measuring-equipment`, {
        measuring_equipment_id,
        compartment_id,
        notes
      });

      set((state) => ({
        storageItems: [response.data.data, ...state.storageItems],
        loading: false,
      }));

      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      console.error('assignMeasuringEquipmentToStorage error:', error);
      const errorMessage = error.response?.data?.error || 'Fehler beim Einlagern des Messmittels';
      set({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Get storage location for a measuring equipment
   */
  getMeasuringEquipmentStorageLocation: async (equipmentId) => {
    try {
      const response = await axios.get(`${API_BASE}/measuring-equipment/${equipmentId}/location`);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('getMeasuringEquipmentStorageLocation error:', error);
      const errorMessage = error.response?.data?.error || 'Fehler beim Laden des Lagerorts';
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Move measuring equipment to different compartment
   */
  moveMeasuringEquipment: async (equipmentId, compartment_id) => {
    try {
      set({ loading: true, error: null });

      const response = await axios.put(`${API_BASE}/measuring-equipment/${equipmentId}/move`, {
        compartment_id
      });

      set((state) => ({
        storageItems: state.storageItems.map(item =>
          item.measuring_equipment_id === parseInt(equipmentId) ? response.data.data : item
        ),
        loading: false,
      }));

      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      console.error('moveMeasuringEquipment error:', error);
      const errorMessage = error.response?.data?.error || 'Fehler beim Umlagern';
      set({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Remove measuring equipment from storage
   */
  removeMeasuringEquipmentFromStorage: async (equipmentId) => {
    try {
      set({ loading: true, error: null });

      await axios.delete(`${API_BASE}/measuring-equipment/${equipmentId}`);

      set((state) => ({
        storageItems: state.storageItems.filter(item => 
          item.measuring_equipment_id !== parseInt(equipmentId)
        ),
        loading: false,
      }));

      return { success: true, message: 'Messmittel aus Lager entfernt' };
    } catch (error) {
      console.error('removeMeasuringEquipmentFromStorage error:', error);
      const errorMessage = error.response?.data?.error || 'Fehler beim Entfernen aus dem Lager';
      set({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Reset store
   */
  reset: () => set({
    storageItems: [],
    currentItem: null,
    movements: [],
    loading: false,
    error: null,
  }),
}));
