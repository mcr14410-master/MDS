import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useStorageItemsStore } from '../../stores/storageItemsStore';

/**
 * StockByConditionDisplay Component
 * Visual display of stock quantities by condition (new/used/reground)
 * with effective stock calculation and low-stock warning
 */
export default function StockByConditionDisplay({ storageItem }) {
  const { calculateEffectiveStock, calculateTotalStock, getStockStatus } = useStorageItemsStore();

  if (!storageItem) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <p className="text-gray-400 text-sm">Keine Lagerdaten vorhanden</p>
      </div>
    );
  }

  const effective = calculateEffectiveStock(storageItem);
  const total = calculateTotalStock(storageItem);
  const status = getStockStatus(storageItem);

  const getStatusColor = () => {
    switch (status) {
      case 'ok':
        return 'green';
      case 'warning':
        return 'yellow';
      case 'critical':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'ok':
        return 'OK';
      case 'warning':
        return 'Niedrig';
      case 'critical':
        return 'Kritisch';
      default:
        return 'Unbekannt';
    }
  };

  const qtyNew = parseFloat(storageItem.quantity_new || 0);
  const qtyUsed = parseFloat(storageItem.quantity_used || 0);
  const qtyReground = parseFloat(storageItem.quantity_reground || 0);

  // Calculate percentages for bars
  const getPercentage = (qty) => {
    if (total === 0) return 0;
    return (qty / total) * 100;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Bestand nach Zustand</h3>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={`text-sm font-medium text-${getStatusColor()}-400`}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Condition Bars */}
      <div className="space-y-4 mb-6">
        {/* New */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-300">Neu</span>
            <span className="text-sm font-bold text-green-400">
              {qtyNew} Stk
            </span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${getPercentage(qtyNew)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Gewichtung: {parseFloat(storageItem.weight_new || 1.0).toFixed(1)}x = {(qtyNew * parseFloat(storageItem.weight_new || 1.0)).toFixed(1)} effektiv
          </div>
        </div>

        {/* Used */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-300">Gebraucht</span>
            <span className="text-sm font-bold text-orange-400">
              {qtyUsed} Stk
            </span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-300"
              style={{ width: `${getPercentage(qtyUsed)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Gewichtung: {parseFloat(storageItem.weight_used || 0.5).toFixed(1)}x = {(qtyUsed * parseFloat(storageItem.weight_used || 0.5)).toFixed(1)} effektiv
          </div>
        </div>

        {/* Reground */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-300">Nachgeschliffen</span>
            <span className="text-sm font-bold text-blue-400">
              {qtyReground} Stk
            </span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${getPercentage(qtyReground)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Gewichtung: {parseFloat(storageItem.weight_reground || 0.8).toFixed(1)}x = {(qtyReground * parseFloat(storageItem.weight_reground || 0.8)).toFixed(1)} effektiv
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="pt-4 border-t border-gray-700">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-gray-400 mb-1">Gesamt</div>
            <div className="text-2xl font-bold text-white">{total.toFixed(1)}</div>
            <div className="text-xs text-gray-500">Stück</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Effektiv</div>
            <div className="text-2xl font-bold text-blue-400">{effective.toFixed(1)}</div>
            <div className="text-xs text-gray-500">Gewichtet</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Status</div>
            <div className={`text-2xl font-bold text-${getStatusColor()}-400`}>
              {status === 'ok' ? '✓' : status === 'warning' ? '⚠' : '✗'}
            </div>
            <div className="text-xs text-gray-500">{getStatusText()}</div>
          </div>
        </div>

        {/* Reorder Point Info */}
        {storageItem.enable_low_stock_alert && storageItem.reorder_point && (
          <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Bestellpunkt:</span>
              <span className="text-white font-medium">{parseFloat(storageItem.reorder_point).toFixed(1)} (effektiv)</span>
            </div>
            {status === 'warning' && (
              <div className="mt-2 flex items-center gap-2 text-yellow-400 text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>Bestand unter Bestellpunkt - Nachbestellung empfohlen</span>
              </div>
            )}
            {status === 'critical' && (
              <div className="mt-2 flex items-center gap-2 text-red-400 text-xs">
                <XCircle className="w-4 h-4" />
                <span>Kritischer Bestand - Dringende Nachbestellung erforderlich</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
