import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useConsumablesStore } from '../stores/consumablesStore';
import { useSuppliersStore } from '../stores/suppliersStore';
import ConsumableCategoriesModal from '../components/consumables/ConsumableCategoriesModal';
import AddConsumableToOrderModal from '../components/consumables/AddConsumableToOrderModal';
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Droplet,
  ChevronRight,
  X,
  Settings,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  XCircle,
  MapPin
} from 'lucide-react';

// Helper: Intelligente Zahlenformatierung ohne unnötige Nullen
const formatNumber = (num) => {
  if (!num && num !== 0) return '';
  const n = parseFloat(num);
  if (isNaN(n)) return '';
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(/\.?0+$/, '');
};

export default function ConsumablesPage() {
  const navigate = useNavigate();
  const {
    consumables,
    categories,
    reorderList,
    loading,
    error,
    filters,
    fetchConsumables,
    fetchCategories,
    fetchReorderList,
    setFilters,
    updateStatus,
    getStatusInfo
  } = useConsumablesStore();

  const { suppliers, fetchSuppliers } = useSuppliersStore();

  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showAddToOrderModal, setShowAddToOrderModal] = useState(false);
  const [selectedForOrder, setSelectedForOrder] = useState(null);

  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
    fetchConsumables(filters);
    fetchReorderList();
  }, []);

  useEffect(() => {
    fetchConsumables(localFilters);
  }, [localFilters]);

  const handleSearch = (e) => {
    const search = e.target.value;
    setLocalFilters(prev => ({ ...prev, search }));
  };

  const handleFilterChange = (key, value) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    const defaultFilters = {
      category_id: null,
      supplier_id: null,
      stock_status: null,
      is_active: true,
      is_hazardous: null,
      search: '',
      sort_by: 'name',
      sort_order: 'asc',
    };
    setLocalFilters(defaultFilters);
    setFilters(defaultFilters);
  };

  const getCategoryColor = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
      green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    };
    return colors[color] || colors.gray;
  };

  const getStockStatusBadge = (status) => {
    const styles = {
      ok: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      low: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      reorder: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };
    const labels = {
      ok: 'OK',
      low: 'Wird knapp',
      reorder: 'Nachbestellen'
    };
    const icons = {
      ok: <CheckCircle className="h-4 w-4" />,
      low: <AlertCircle className="h-4 w-4" />,
      reorder: <XCircle className="h-4 w-4" />
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.ok}`}>
        {icons[status]}
        {labels[status] || 'OK'}
      </span>
    );
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateStatus(id, newStatus);
      fetchConsumables(localFilters);
      fetchReorderList();
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  const handleAddToOrder = (consumable) => {
    setSelectedForOrder(consumable);
    setShowAddToOrderModal(true);
  };

  // Stats
  const stats = {
    total: consumables.length,
    reorder: consumables.filter(c => c.stock_status === 'reorder').length,
    low: consumables.filter(c => c.stock_status === 'low').length,
    hazardous: consumables.filter(c => c.is_hazardous).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Droplet className="h-7 w-7 text-amber-500" />
            Verbrauchsmaterial
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {stats.total} Artikel • {stats.reorder} nachzubestellen
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoriesModal(true)}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Kategorien
          </button>
          <button
            onClick={() => navigate('/consumables/new')}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Neuer Artikel
          </button>
        </div>
      </div>

      {/* Reorder Alert */}
      {reorderList.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-red-800 dark:text-red-300">
                {reorderList.length} Artikel nachbestellen
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {reorderList.slice(0, 5).map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleAddToOrder(item)}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded border border-red-200 dark:border-red-700 text-sm text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    <ShoppingCart className="h-3 w-3" />
                    {item.name}
                    {item.delivery_time_days && (
                      <span className="text-xs text-gray-500">({item.delivery_time_days}T)</span>
                    )}
                  </button>
                ))}
                {reorderList.length > 5 && (
                  <span className="text-sm text-red-600 dark:text-red-400">
                    +{reorderList.length - 5} weitere
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Suchen nach Name, Artikelnummer, Hersteller..."
            value={localFilters.search}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
            showFilters
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <Filter className="h-4 w-4" />
          Filter
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kategorie
              </label>
              <select
                value={localFilters.category_id || ''}
                onChange={(e) => handleFilterChange('category_id', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Alle Kategorien</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Lieferant
              </label>
              <select
                value={localFilters.supplier_id || ''}
                onChange={(e) => handleFilterChange('supplier_id', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Alle Lieferanten</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bestandsstatus
              </label>
              <select
                value={localFilters.stock_status || ''}
                onChange={(e) => handleFilterChange('stock_status', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Alle</option>
                <option value="ok">✓ OK</option>
                <option value="low">⚠ Wird knapp</option>
                <option value="reorder">! Nachbestellen</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Gefahrstoff
              </label>
              <select
                value={localFilters.is_hazardous === null ? '' : localFilters.is_hazardous.toString()}
                onChange={(e) => handleFilterChange('is_hazardous', e.target.value === '' ? null : e.target.value === 'true')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Alle</option>
                <option value="true">⚠ Nur Gefahrstoffe</option>
                <option value="false">Keine Gefahrstoffe</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Zurücksetzen
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
        </div>
      )}

      {/* Consumables List */}
      {!loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Artikel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Kategorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Gebinde
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Lagerort
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {consumables.map(item => (
                <tr 
                  key={item.id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => navigate(`/consumables/${item.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          {item.name}
                          {item.is_hazardous && (
                            <span className="text-amber-500" title="Gefahrstoff">⚠</span>
                          )}
                        </div>
                        {item.article_number && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {item.article_number}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.category_name && (
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getCategoryColor(item.category_color)}`}>
                        {item.category_name}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {item.package_type ? (
                      <span>{item.package_type} {item.package_size && `(${formatNumber(item.package_size)} ${item.base_unit})`}</span>
                    ) : (
                      <span>{item.base_unit}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={item.stock_status || 'ok'}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      className={`text-xs font-medium rounded-full px-2 py-1 border-0 cursor-pointer ${
                        item.stock_status === 'reorder' 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          : item.stock_status === 'low'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      }`}
                    >
                      <option value="ok">✓ OK</option>
                      <option value="low">⚠ Wird knapp</option>
                      <option value="reorder">! Nachbestellen</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {item.location_count > 0 ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {item.location_count} {item.location_count === 1 ? 'Ort' : 'Orte'}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      {item.supplier_id && (
                        <button
                          onClick={() => handleAddToOrder(item)}
                          className="text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300"
                          title="Zur Bestellung hinzufügen"
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </button>
                      )}
                      <Link
                        to={`/consumables/${item.id}`}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {consumables.length === 0 && !loading && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Keine Artikel gefunden
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {localFilters.search ? 'Versuchen Sie eine andere Suche.' : 'Erstellen Sie den ersten Artikel.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Categories Modal */}
      {showCategoriesModal && (
        <ConsumableCategoriesModal
          isOpen={showCategoriesModal}
          onClose={() => setShowCategoriesModal(false)}
        />
      )}

      {/* Add to Order Modal */}
      {showAddToOrderModal && selectedForOrder && (
        <AddConsumableToOrderModal
          isOpen={showAddToOrderModal}
          onClose={() => {
            setShowAddToOrderModal(false);
            setSelectedForOrder(null);
          }}
          consumable={selectedForOrder}
        />
      )}
    </div>
  );
}
