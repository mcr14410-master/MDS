import { create } from 'zustand';
import axios from '../utils/axios';


export const usePurchaseOrdersStore = create((set, get) => ({
  // State
  orders: [],
  currentOrder: null,
  loading: false,
  error: null,
  
  // Pagination
  pagination: {
    total: 0,
    limit: 50,
    offset: 0,
  },

  // Filters
  filters: {
    status: null,
    supplier_id: null,
    date_from: null,
    date_to: null,
    search: '',
  },

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Fetch all purchase orders with filters
   */
  fetchOrders: async (filters = {}) => {
    try {
      set({ loading: true, error: null });
      
      const params = new URLSearchParams();
      
      // Apply filters
      if (filters.status) params.append('status', filters.status);
      if (filters.supplier_id) params.append('supplier_id', filters.supplier_id);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      
      // Pagination
      const currentState = get();
      params.append('limit', currentState.pagination.limit);
      params.append('offset', currentState.pagination.offset);
      
      const url = `/api/purchase-orders${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);
      
      set({ 
        orders: response.data.data || [],
        pagination: response.data.pagination || currentState.pagination,
        loading: false 
      });
      
      return response.data;
    } catch (error) {
      console.error('fetchOrders error:', error);
      const errorMessage = error.response?.data?.error || 'Fehler beim Laden der Bestellungen';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw error;
    }
  },

  /**
   * Fetch single order by ID
   */
  fetchOrderById: async (id) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.get(`/api/purchase-orders/${id}`);
      
      set({ 
        currentOrder: response.data.data,
        loading: false 
      });
      
      return response.data.data;
    } catch (error) {
      console.error('fetchOrderById error:', error);
      const errorMessage = error.response?.data?.error || 'Fehler beim Laden der Bestellung';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw error;
    }
  },

  /**
   * Create new purchase order
   */
  createOrder: async (orderData) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.post(`/api/purchase-orders`, orderData);
      
      // Add to list
      const currentOrders = get().orders;
      set({ 
        orders: [response.data.data, ...currentOrders],
        currentOrder: response.data.data,
        loading: false 
      });
      
      return response.data.data;
    } catch (error) {
      console.error('createOrder error:', error);
      const errorMessage = error.response?.data?.error || 'Fehler beim Erstellen der Bestellung';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw error;
    }
  },

  /**
   * Update purchase order (draft only)
   */
  updateOrder: async (id, orderData) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.put(`/api/purchase-orders/${id}`, orderData);
      
      // Update in list
      const currentOrders = get().orders;
      const updatedOrders = currentOrders.map(order => 
        order.id === id ? response.data.data : order
      );
      
      set({ 
        orders: updatedOrders,
        currentOrder: response.data.data,
        loading: false 
      });
      
      return response.data.data;
    } catch (error) {
      console.error('updateOrder error:', error);
      const errorMessage = error.response?.data?.error || 'Fehler beim Aktualisieren der Bestellung';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw error;
    }
  },

  /**
   * Delete purchase order (draft only)
   */
  deleteOrder: async (id) => {
    try {
      set({ loading: true, error: null });
      
      await axios.delete(`/api/purchase-orders/${id}`);
      
      // Remove from list
      const currentOrders = get().orders;
      const filteredOrders = currentOrders.filter(order => order.id !== id);
      
      set({ 
        orders: filteredOrders,
        currentOrder: null,
        loading: false 
      });
      
      return true;
    } catch (error) {
      console.error('deleteOrder error:', error);
      const errorMessage = error.response?.data?.error || 'Fehler beim Löschen der Bestellung';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw error;
    }
  },

  // ============================================================================
  // Status Transitions
  // ============================================================================

  /**
   * Send order to supplier (draft → sent)
   */
  sendOrder: async (id) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.post(`/api/purchase-orders/${id}/send`);
      
      // Update in list
      const currentOrders = get().orders;
      const updatedOrders = currentOrders.map(order => 
        order.id === id ? { ...order, status: 'sent', sent_date: new Date().toISOString().split('T')[0] } : order
      );
      
      set({ 
        orders: updatedOrders,
        currentOrder: response.data.data,
        loading: false 
      });
      
      return response.data.data;
    } catch (error) {
      console.error('sendOrder error:', error);
      const errorMessage = error.response?.data?.error || 'Fehler beim Versenden der Bestellung';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw error;
    }
  },

  /**
   * Receive full order (sent/confirmed → received)
   */
  receiveOrder: async (id, receiveData) => {
    try {
      set({ loading: true, error: null });
      
      const response = await axios.post(
        `/api/purchase-orders/${id}/receive`,
        receiveData
      );
      
      // Update in list
      const currentOrders = get().orders;
      const updatedOrders = currentOrders.map(order => 
        order.id === id ? { ...order, status: 'received' } : order
      );
      
      set({ 
        orders: updatedOrders,
        currentOrder: response.data.data,
        loading: false 
      });
      
      return response.data.data;
    } catch (error) {
      console.error('receiveOrder error:', error);
      const errorMessage = error.response?.data?.error || 'Fehler beim Wareneingang';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw error;
    }
  },

  /**
   * Receive partial order item
   */
  receiveOrderItem: async (orderId, itemId, receiveData) => {
    try {
      set({ loading: true, error: null });
      
      await axios.post(
        `/api/purchase-orders/${orderId}/items/${itemId}/receive`,
        receiveData
      );
      
      // Refresh current order to get updated quantities
      await get().fetchOrderById(orderId);
      
      set({ loading: false });
      
      return true;
    } catch (error) {
      console.error('receiveOrderItem error:', error);
      const errorMessage = error.response?.data?.error || 'Fehler beim Buchen der Teillieferung';
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw error;
    }
  },

  // ============================================================================
  // Utility Functions
  // ============================================================================

  /**
   * Set filters
   */
  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } });
  },

  /**
   * Clear filters
   */
  clearFilters: () => {
    set({ 
      filters: {
        status: null,
        supplier_id: null,
        date_from: null,
        date_to: null,
        search: '',
      }
    });
  },

  /**
   * Set pagination
   */
  setPagination: (pagination) => {
    set({ pagination: { ...get().pagination, ...pagination } });
  },

  /**
   * Clear current order
   */
  clearCurrentOrder: () => {
    set({ currentOrder: null });
  },

  /**
   * Clear error
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Get order statistics
   */
  getOrderStats: () => {
    const orders = get().orders;
    
    return {
      total: orders.length,
      draft: orders.filter(o => o.status === 'draft').length,
      sent: orders.filter(o => o.status === 'sent').length,
      partially_received: orders.filter(o => o.status === 'partially_received').length,
      received: orders.filter(o => o.status === 'received').length,
      totalValue: orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0),
    };
  },

  /**
   * Check if order can be edited
   */
  canEdit: (order) => {
    return order && order.status === 'draft';
  },

  /**
   * Check if order can be deleted
   */
  canDelete: (order) => {
    return order && order.status === 'draft';
  },

  /**
   * Check if order can be sent
   */
  canSend: (order) => {
    return order && order.status === 'draft';
  },

  /**
   * Check if order can be received
   */
  canReceive: (order) => {
    return order && ['sent', 'confirmed', 'partially_received'].includes(order.status);
  },
}));

export default usePurchaseOrdersStore;
