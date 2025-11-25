import { X, MapPin } from 'lucide-react';

/**
 * StorageItemSelectionModal
 * Shows selection when tool has multiple storage locations
 * User selects which location to issue/receive from
 */
export default function StorageItemSelectionModal({ 
  tool, 
  storageItems, 
  operation, 
  onSelect, 
  onClose 
}) {
  const operationConfig = {
    issue: {
      title: 'Lagerort für Entnahme wählen',
      subtitle: 'Wählen Sie den Lagerort von dem Sie entnehmen möchten',
      color: 'red'
    },
    receive: {
      title: 'Lagerort für Einlagerung wählen',
      subtitle: 'Wählen Sie den Lagerort in den Sie einlagern möchten',
      color: 'green'
    }
  };

  const config = operationConfig[operation] || operationConfig.issue;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">{config.title}</h2>
            <p className="text-sm text-gray-400 mt-1">{config.subtitle}</p>
            <p className="text-sm text-gray-500 mt-2">
              Werkzeug: <span className="text-white font-medium">{tool.article_number} - {tool.tool_name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Storage Items List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {storageItems.map((item) => {
              const totalStock = 
                parseFloat(item.quantity_new || 0) + 
                parseFloat(item.quantity_used || 0) + 
                parseFloat(item.quantity_reground || 0);

              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className={`
                    w-full p-4 rounded-lg border-2 text-left transition-all
                    ${operation === 'issue' && totalStock === 0
                      ? 'border-gray-700 bg-gray-900/50 opacity-50 cursor-not-allowed'
                      : 'border-gray-700 hover:border-' + config.color + '-500 bg-gray-900/50 hover:bg-gray-900 cursor-pointer'
                    }
                  `}
                  disabled={operation === 'issue' && totalStock === 0}
                >
                  <div className="flex items-start justify-between">
                    {/* Location Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-blue-400" />
                        <h3 className="font-semibold text-white">
                          {item.location_name} / {item.compartment_name}
                        </h3>
                      </div>

                      {/* Stock Info */}
                      <div className="flex gap-4 text-sm">
                        {item.quantity_new > 0 && (
                          <div className="text-green-400">
                            Neu: {item.quantity_new}
                          </div>
                        )}
                        {item.quantity_reground > 0 && (
                          <div className="text-blue-400">
                            Nachgeschliffen: {item.quantity_reground}
                          </div>
                        )}
                        {item.quantity_used > 0 && (
                          <div className="text-yellow-400">
                            Gebraucht: {item.quantity_used}
                          </div>
                        )}
                      </div>

                      {/* Total */}
                      <div className="text-sm text-gray-400 mt-1">
                        Gesamt: {totalStock} {item.unit || 'Stück'}
                      </div>
                    </div>

                    {/* Warning if no stock for issue */}
                    {operation === 'issue' && totalStock === 0 && (
                      <div className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
                        Kein Bestand
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-700 bg-gray-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
