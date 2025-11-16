import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Package } from 'lucide-react';
import { useDashboardStore } from '../../stores/dashboardStore';

export default function LowStockWidget() {
  const { lowStockItems, lowStockSummary, fetchLowStockItems, fetchLowStockSummary, loading } = useDashboardStore();

  useEffect(() => {
    fetchLowStockItems(10);
    fetchLowStockSummary();
  }, []);

  // Get icon for item type
  const getItemTypeIcon = (itemType) => {
    switch (itemType) {
      case 'tool':
        return <Wrench className="w-3 h-3" />;
      case 'insert':
        return <Package className="w-3 h-3" />;
      default:
        return <Wrench className="w-3 h-3" />;
    }
  };

  // Get badge color for item type
  const getItemTypeBadgeColor = (itemType) => {
    switch (itemType) {
      case 'tool':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'insert':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'accessory':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Get badge color for tool category
  const getToolCategoryBadgeColor = (toolCategory) => {
    switch (toolCategory) {
      case 'standard':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'special':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'modified':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Get item type label
  const getItemTypeLabel = (itemType) => {
    switch (itemType) {
      case 'tool':
        return 'Werkzeug';
      case 'insert':
        return 'Wendeplatte';
      case 'accessory':
        return 'Zubehör';
      default:
        return itemType;
    }
  };

  // Get tool category label
  const getToolCategoryLabel = (toolCategory) => {
    switch (toolCategory) {
      case 'standard':
        return 'Standard';
      case 'special':
        return 'Spezial';
      case 'modified':
        return 'Modifiziert';
      default:
        return toolCategory;
    }
  };

  // Get stock status badge
  const getStatusBadge = (stockStatus) => {
    switch (stockStatus) {
      case 'critical':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
            Kritisch
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
            Niedrig
          </span>
        );
      default:
        return null;
    }
  };

  // Get stock level color
  const getStockLevelColor = (stockStatus) => {
    switch (stockStatus) {
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      case 'low':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  // Get progress bar color
  const getProgressBarColor = (stockStatus) => {
    switch (stockStatus) {
      case 'critical':
        return 'bg-red-500';
      case 'low':
        return 'bg-yellow-500';
      default:
        return 'bg-green-500';
    }
  };

  if (loading && !lowStockItems.length) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          🔔 Niedriger Bestand
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          🔔 Niedriger Bestand
        </h2>
        {lowStockSummary && (
          <div className="flex gap-2">
            {lowStockSummary.critical_count > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                {lowStockSummary.critical_count} Kritisch
              </span>
            )}
            {lowStockSummary.low_count > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                {lowStockSummary.low_count} Niedrig
              </span>
            )}
          </div>
        )}
      </div>

      {/* No low stock items */}
      {lowStockItems.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-gray-600 dark:text-gray-400">
            Alle Werkzeuge sind ausreichend auf Lager
          </p>
        </div>
      )}

      {/* Low stock items list */}
      {lowStockItems.length > 0 && (
        <div className="space-y-4">
          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                {/* Header: Tool Number + Status */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {item.tool_number}
                    </span>
                    {getStatusBadge(item.stock_status)}
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${getStockLevelColor(item.stock_status)}`}>
                      {parseFloat(item.effective_stock || 0).toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      / {parseFloat(item.reorder_point || 0).toFixed(1)}
                    </p>
                  </div>
                </div>

                {/* Tool Name */}
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                  {item.tool_name}
                </p>

                {/* Badges Row 1: Category & Subcategory */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {item.category_name && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-indigo-500/20 text-indigo-400 dark:text-indigo-300 border border-indigo-500/30 rounded">
                      {item.category_icon && <span className="text-xs">{item.category_icon}</span>}
                      <span className="truncate">{item.category_name}</span>
                    </span>
                  )}
                  {item.subcategory_name && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-700 dark:bg-gray-600 text-gray-300 dark:text-gray-200 border border-gray-600 dark:border-gray-500 rounded truncate">
                      {item.subcategory_name}
                    </span>
                  )}
                </div>

                {/* Badges Row 2: Item Type & Tool Category */}
                <div className="flex flex-wrap gap-1 mb-2">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium border rounded ${getItemTypeBadgeColor(item.item_type)}`}>
                    {getItemTypeIcon(item.item_type)}
                    {getItemTypeLabel(item.item_type)}
                  </span>
                  {item.tool_category && (
                    <span className={`px-1.5 py-0.5 text-xs font-medium border rounded ${getToolCategoryBadgeColor(item.tool_category)}`}>
                      {getToolCategoryLabel(item.tool_category)}
                    </span>
                  )}
                </div>

                {/* Technical Details */}
                {(item.diameter || item.material || item.coating) && (
                  <div className="flex flex-wrap gap-1 mb-2 text-xs text-gray-500 dark:text-gray-500">
                    {item.diameter && <span>Ø {item.diameter}mm</span>}
                    {item.material && <span>• {item.material}</span>}
                    {item.coating && <span>• {item.coating}</span>}
                  </div>
                )}

                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${getProgressBarColor(item.stock_status)}`}
                      style={{
                        width: `${Math.min(Math.max(parseFloat(item.effective_stock_percent || 0), 0), 100)}%`
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      {parseFloat(item.effective_stock_percent || 0).toFixed(0)}%
                    </span>
                    {item.estimated_days_remaining > 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        ~{item.estimated_days_remaining}d
                      </span>
                    )}
                  </div>
                </div>

                {/* Location (compact) */}
                {item.location_name && (
                  <div className="text-xs text-gray-500 dark:text-gray-500 mb-2 truncate">
                    📍 {item.location_name}
                    {item.compartment_name && ` • ${item.compartment_name}`}
                  </div>
                )}

                {/* Details Button */}
                <Link
                  to={`/tools/${item.tool_master_id}`}
                  className="block w-full text-center px-2 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                >
                  Details anzeigen
                </Link>
              </div>
            ))}
          </div>

          {/* View All Link */}
          <Link
            to="/tools/storage"
            className="block text-center py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            Alle Lagerbestände anzeigen →
          </Link>
        </div>
      )}
    </div>
  );
}
