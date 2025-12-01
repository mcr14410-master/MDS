import { useEffect } from 'react';
import { Loader2, ArrowDownRight, ArrowUpRight, ArrowRightLeft, Edit3, Trash2 } from 'lucide-react';
import { useStorageItemsStore } from '../../stores/storageItemsStore';

/**
 * StockMovementsHistory Component
 * Displays a table of all stock movements for a storage item
 */
export default function StockMovementsHistory({ storageItemId }) {
  const { movements, loading, fetchMovements } = useStorageItemsStore();

  useEffect(() => {
    if (storageItemId) {
      fetchMovements(storageItemId);
    }
  }, [storageItemId, fetchMovements]);

  const getMovementTypeConfig = (type) => {
    const configs = {
      issue: {
        text: 'Entnahme',
        icon: ArrowDownRight,
        color: 'red'
      },
      receipt: {
        text: 'Einlagerung',
        icon: ArrowUpRight,
        color: 'green'
      },
      transfer: {
        text: 'Umlagerung',
        icon: ArrowRightLeft,
        color: 'blue'
      },
      adjustment: {
        text: 'Korrektur',
        icon: Edit3,
        color: 'yellow'
      },
      scrap: {
        text: 'Verschrottung',
        icon: Trash2,
        color: 'gray'
      }
    };
    return configs[type] || { text: type, icon: ArrowRightLeft, color: 'gray' };
  };

  const getConditionConfig = (condition) => {
    const configs = {
      new: {
        text: 'Neu',
        color: 'green'
      },
      used: {
        text: 'Gebraucht',
        color: 'orange'
      },
      reground: {
        text: 'Nachgeschliffen',
        color: 'blue'
      }
    };
    return configs[condition] || { text: condition, color: 'gray' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!movements || movements.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">Keine Lagerbewegungen vorhanden</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bewegungshistorie</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{movements.length} Bewegungen</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Datum
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Art
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Zustand
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Menge
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Vorher
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Nachher
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Grund
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Benutzer
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {movements.map((movement) => {
              const typeConfig = getMovementTypeConfig(movement.movement_type);
              const conditionConfig = getConditionConfig(movement.condition);
              const TypeIcon = typeConfig.icon;

              return (
                <tr key={movement.id} className="hover:bg-white dark:bg-gray-800/50 transition-colors">
                  {/* Date */}
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {new Date(movement.performed_at).toLocaleString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-${typeConfig.color}-500/20 text-${typeConfig.color}-400 border border-${typeConfig.color}-500/30`}>
                      <TypeIcon className="w-3 h-3" />
                      {typeConfig.text}
                    </span>
                  </td>

                  {/* Condition */}
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded bg-${conditionConfig.color}-500/20 text-${conditionConfig.color}-400 border border-${conditionConfig.color}-500/30`}>
                      {conditionConfig.text}
                    </span>
                  </td>

                  {/* Quantity */}
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    <span className={movement.quantity >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {movement.quantity > 0 ? '+' : ''}{parseFloat(movement.quantity).toFixed(2)}
                    </span>
                  </td>

                  {/* Before */}
                  <td className="px-4 py-3 text-sm text-right font-mono text-gray-500 dark:text-gray-400">
                    {movement.quantity_before !== null ? parseFloat(movement.quantity_before).toFixed(2) : '-'}
                  </td>

                  {/* After */}
                  <td className="px-4 py-3 text-sm text-right font-mono text-gray-900 dark:text-white">
                    {movement.quantity_after !== null ? parseFloat(movement.quantity_after).toFixed(2) : '-'}
                  </td>

                  {/* Reason */}
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {movement.reason || '-'}
                  </td>

                  {/* User */}
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {movement.performed_by_username || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
