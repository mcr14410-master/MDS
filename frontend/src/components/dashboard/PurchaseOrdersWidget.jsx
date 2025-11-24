import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Calendar, Package, TrendingUp } from 'lucide-react';
import { usePurchaseOrdersStore } from '../../stores/purchaseOrdersStore';
import OrderStatusBadge from '../purchase/OrderStatusBadge';

export default function PurchaseOrdersWidget() {
  const { orders, loading, fetchOrders, getOrderStats } = usePurchaseOrdersStore();

  useEffect(() => {
    // Fetch recent orders for 3x2 grid
    fetchOrders({ limit: 6 });
  }, []);

  const stats = getOrderStats();
  const recentOrders = orders.slice(0, 6); // 3x2 Grid

  // Get upcoming deliveries (next 7 days)
  const upcomingDeliveries = orders.filter(order => {
    if (!order.expected_delivery_date || order.status === 'received') return false;
    
    const deliveryDate = new Date(order.expected_delivery_date);
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    
    return deliveryDate >= today && deliveryDate <= sevenDaysFromNow;
  }).length;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '0,00 €';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (loading && orders.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          🛒 Bestellwesen
        </h2>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          🛒 Bestellwesen
        </h2>
        <Link
          to="/purchase-orders"
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
        >
          Alle anzeigen →
        </Link>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {/* Draft Orders */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Entwürfe</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.draft}
          </p>
        </div>

        {/* Sent Orders */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Versendet</span>
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.sent}
          </p>
        </div>

        {/* Partially Received */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Teilweise</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats.partially_received}
          </p>
        </div>

        {/* Upcoming Deliveries */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Nächste 7 Tage</span>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {upcomingDeliveries}
          </p>
        </div>
      </div>

      {/* Recent Orders */}
      {recentOrders.length === 0 ? (
        <div className="text-center py-8">
          <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Noch keine Bestellungen vorhanden
          </p>
          <Link
            to="/purchase-orders"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Erste Bestellung erstellen
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Aktuelle Bestellungen
          </h3>
          
          {/* Orders Grid - 3x2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                to={`/purchase-orders/${order.id}`}
                className="block border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                {/* Header: Order Number + Status */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {order.order_number}
                  </span>
                  <OrderStatusBadge status={order.status} size="sm" />
                </div>

                {/* Supplier */}
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 truncate">
                  {order.supplier_name}
                </p>

                {/* Amount */}
                <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">
                  {formatCurrency(order.total_amount)}
                </p>

                {/* Details Row */}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(order.order_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {order.item_count || 0} Pos.
                  </span>
                </div>

                {/* Progress Bar for partially received */}
                {order.status === 'partially_received' && order.total_quantity_ordered > 0 && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-yellow-500 transition-all"
                        style={{
                          width: `${Math.min((order.total_quantity_received / order.total_quantity_ordered) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>

          {/* View All Link */}
          {orders.length > 6 && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <Link
                to="/purchase-orders"
                className="block text-center py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                Alle {stats.total} Bestellungen anzeigen →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
