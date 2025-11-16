import { Star, Trash2, Package, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToolCompatibleInsertsStore } from '../../stores/toolCompatibleInsertsStore';
import { useAuthStore } from '../../stores/authStore';

/**
 * CompatibleInsertsList Component
 * Displays list of compatible inserts with preferred badge and stock info
 */
export default function CompatibleInsertsList({ inserts, onDelete }) {
  const { user } = useAuthStore();
  const {
    loading,
    deleteCompatibleInsert,
    togglePreferred,
    getTotalStock,
    getStockStatus,
    getStockStatusColor,
    getStockStatusText,
  } = useToolCompatibleInsertsStore();

  const handleDelete = async (insert) => {
    if (window.confirm(`Verknüpfung mit "${insert.insert_tool_name}" wirklich löschen?`)) {
      const result = await deleteCompatibleInsert(insert.id);
      if (result.success && onDelete) {
        onDelete(result);
      }
    }
  };

  const handleTogglePreferred = async (insert) => {
    const result = await togglePreferred(insert.id, insert.is_preferred);
    if (!result.success) {
      alert(result.error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!inserts || inserts.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
        <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">Keine kompatiblen Wendeschneidplatten vorhanden</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Kompatible Wendeschneidplatten</h3>
        <p className="text-sm text-gray-400 mt-1">{inserts.length} kompatible Wendeschneidplatte(n)</p>
      </div>

      {/* Inserts List */}
      <div className="divide-y divide-gray-700">
        {inserts.map((insert) => {
          const totalStock = getTotalStock(insert);
          const stockStatus = getStockStatus(insert);
          const statusColor = getStockStatusColor(stockStatus);
          const statusText = getStockStatusText(stockStatus);

          return (
            <div key={insert.id} className="px-6 py-4 hover:bg-gray-700/50 transition-colors">
              <div className="flex items-start gap-4">
                {/* Icon with Stock Status */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-lg bg-${statusColor}-500/20 flex items-center justify-center`}>
                  <Package className={`w-6 h-6 text-${statusColor}-400`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {/* Tool Number & Name */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-400">{insert.insert_tool_number}</span>
                    {insert.is_preferred && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        <Star className="w-3 h-3 fill-current" />
                        Bevorzugt
                      </span>
                    )}
                    {!insert.insert_is_active && (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-gray-500/20 text-gray-400 border border-gray-500/30">
                        Inaktiv
                      </span>
                    )}
                  </div>
                  <h4 className="font-medium text-white mt-1">{insert.insert_tool_name}</h4>

                  {/* Manufacturer & Part Number */}
                  {(insert.insert_manufacturer || insert.insert_part_number) && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                      {insert.insert_manufacturer && <span>{insert.insert_manufacturer}</span>}
                      {insert.insert_manufacturer && insert.insert_part_number && <span>•</span>}
                      {insert.insert_part_number && <span>{insert.insert_part_number}</span>}
                    </div>
                  )}

                  {/* Quantity & Stock Info */}
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    {/* Quantity per Tool */}
                    <div className="bg-gray-700/50 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Menge pro Werkzeug</div>
                      <div className="text-lg font-bold text-white">{insert.quantity_per_tool || 1} Stk</div>
                    </div>

                    {/* Stock Status */}
                    <div className={`bg-${statusColor}-500/10 rounded-lg p-3 border border-${statusColor}-500/30`}>
                      <div className="text-xs text-gray-400 mb-1">Bestand</div>
                      <div className="flex items-center gap-2">
                        {stockStatus === 'ok' ? (
                          <CheckCircle className={`w-4 h-4 text-${statusColor}-400`} />
                        ) : (
                          <AlertCircle className={`w-4 h-4 text-${statusColor}-400`} />
                        )}
                        <span className={`text-sm font-medium text-${statusColor}-400`}>
                          {statusText}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {insert.insert_stock_new > 0 && `${insert.insert_stock_new} neu`}
                        {insert.insert_stock_used > 0 && ` ${insert.insert_stock_used} gebr.`}
                        {insert.insert_stock_reground > 0 && ` ${insert.insert_stock_reground} nachgeschl.`}
                        {totalStock === 0 && 'Kein Bestand'}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {insert.notes && (
                    <div className="mt-3 p-3 bg-gray-700/30 rounded-lg">
                      <p className="text-sm text-gray-300">{insert.notes}</p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>Hinzugefügt von {insert.created_by_username || 'Unbekannt'}</span>
                    <span>•</span>
                    <span>
                      {new Date(insert.created_at).toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Toggle Preferred */}
                  {user?.permissions?.includes('tools.edit') && (
                    <button
                      onClick={() => handleTogglePreferred(insert)}
                      className={`p-2 rounded-lg transition-colors ${
                        insert.is_preferred
                          ? 'text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20'
                          : 'text-gray-400 hover:bg-gray-700 hover:text-yellow-400'
                      }`}
                      title={insert.is_preferred ? 'Als bevorzugt entfernen' : 'Als bevorzugt markieren'}
                    >
                      <Star className={`w-5 h-5 ${insert.is_preferred ? 'fill-current' : ''}`} />
                    </button>
                  )}

                  {/* Delete */}
                  {user?.permissions?.includes('tools.delete') && (
                    <button
                      onClick={() => handleDelete(insert)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Verknüpfung löschen"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
