import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Filter, Search, Package, Euro, Calendar } from 'lucide-react';
import { usePurchaseOrdersStore } from '../stores/purchaseOrdersStore';
import { useSuppliersStore } from '../stores/suppliersStore';
import OrderStatusBadge from '../components/purchase/OrderStatusBadge';
import OrderForm from '../components/purchaseOrders/OrderForm';

export default function PurchaseOrdersPage() {
  const {
    orders,
    loading,
    error,
    filters,
    fetchOrders,
    setFilters,
    clearFilters,
    getOrderStats,
  } = usePurchaseOrdersStore();

  const { suppliers, fetchSuppliers } = useSuppliersStore();

  const [showFilters, setShowFilters] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  useEffect(() => {
    fetchOrders(filters);
    fetchSuppliers();
  }, []);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchOrders(newFilters);
  };

  const handleClearFilters = () => {
    clearFilters();
    fetchOrders({});
  };

  const handleOrderSuccess = (order) => {
    // Reload orders to show the new/updated order
    fetchOrders(filters);
  };

  const stats = getOrderStats();

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  const formatCurrency = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Bestellungen
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Werkzeug-Bestellungen verwalten
              </p>
            </div>
            <button
              onClick={() => {
                setEditingOrder(null);
                setShowOrderForm(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Neue Bestellung
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Gesamt</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <Package className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Entwürfe</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.draft}</p>
              </div>
              <Package className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Offen</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.sent + stats.partially_received}
                </p>
              </div>
              <Package className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Gesamtwert</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(stats.totalValue)}
                </p>
              </div>
              <Euro className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <Filter className="w-5 h-5" />
              <span className="font-medium">Filter</span>
              {Object.values(filters).some(v => v !== null && v !== '') && (
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                  Aktiv
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value || null)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Alle Status</option>
                    <option value="draft">Entwurf</option>
                    <option value="sent">Versendet</option>
                    <option value="confirmed">Bestätigt</option>
                    <option value="partially_received">Teilweise erhalten</option>
                    <option value="received">Erhalten</option>
                  </select>
                </div>

                {/* Supplier Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Lieferant
                  </label>
                  <select
                    value={filters.supplier_id || ''}
                    onChange={(e) => handleFilterChange('supplier_id', e.target.value || null)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Alle Lieferanten</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date From */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Von Datum
                  </label>
                  <input
                    type="date"
                    value={filters.date_from || ''}
                    onChange={(e) => handleFilterChange('date_from', e.target.value || null)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Date To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bis Datum
                  </label>
                  <input
                    type="date"
                    value={filters.date_to || ''}
                    onChange={(e) => handleFilterChange('date_to', e.target.value || null)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Filter zurücksetzen
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Bestellnummer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Lieferant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Datum
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Positionen
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Betrag
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      Lädt...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center">
                      <Package className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500 dark:text-gray-400">
                        Keine Bestellungen gefunden
                      </p>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer"
                      onClick={() => window.location.href = `/purchase-orders/${order.id}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {order.order_number}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {order.supplier_name}
                        </div>
                        {order.supplier_code && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {order.supplier_code}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <OrderStatusBadge status={order.status} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4" />
                          {formatDate(order.order_date)}
                        </div>
                        {order.status === 'draft' ? (
                          <div className="text-xs text-blue-600 dark:text-blue-400 italic">
                            Lieferzeit wird beim Versand berechnet
                          </div>
                        ) : order.expected_delivery_date ? (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Erwartet: {formatDate(order.expected_delivery_date)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {order.item_count || 0} Position{order.item_count !== 1 ? 'en' : ''}
                        </div>
                        {order.total_quantity_received > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {order.total_quantity_received} / {order.total_quantity_ordered} erhalten
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(order.total_amount, order.currency)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Form Modal */}
        <OrderForm
          order={editingOrder}
          isOpen={showOrderForm}
          onClose={() => {
            setShowOrderForm(false);
            setEditingOrder(null);
          }}
          onSuccess={handleOrderSuccess}
        />
      </div>
    </div>
  );
}
