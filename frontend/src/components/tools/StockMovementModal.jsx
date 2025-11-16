import { useState } from 'react';
import { X } from 'lucide-react';
import { useStorageItemsStore } from '../../stores/storageItemsStore';

/**
 * StockMovementModal Component
 * Modal for all stock operations: issue, receive, transfer, adjust, scrap
 */
export default function StockMovementModal({
  storageItem,
  operation, // 'issue' | 'receive' | 'transfer' | 'adjust' | 'scrap'
  compartments = [], // For transfer operation
  onClose,
  onSuccess
}) {
  const [selectedCondition, setSelectedCondition] = useState('new');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [toCompartmentId, setToCompartmentId] = useState('');

  const {
    issueStock,
    receiveStock,
    transferStock,
    adjustStock,
    scrapStock,
    loading
  } = useStorageItemsStore();

  if (!storageItem) return null;

  const getOperationConfig = () => {
    const configs = {
      issue: {
        title: 'Werkzeuge entnehmen',
        submitText: 'Entnehmen',
        color: 'red',
        requiresQuantityCheck: true
      },
      receive: {
        title: 'Werkzeuge einlagern',
        submitText: 'Einlagern',
        color: 'green',
        requiresQuantityCheck: false
      },
      transfer: {
        title: 'Werkzeuge umlagern',
        submitText: 'Umlagern',
        color: 'blue',
        requiresQuantityCheck: true
      },
      adjust: {
        title: 'Bestand korrigieren',
        submitText: 'Korrigieren',
        color: 'yellow',
        requiresQuantityCheck: false,
        isAbsoluteValue: true
      },
      scrap: {
        title: 'Werkzeuge verschrotten',
        submitText: 'Verschrotten',
        color: 'red',
        requiresQuantityCheck: true
      }
    };
    return configs[operation] || configs.issue;
  };

  const config = getOperationConfig();

  const getMaxQuantity = () => {
    if (operation === 'receive' || operation === 'adjust') return 999;
    return parseFloat(storageItem[`quantity_${selectedCondition}`] || 0);
  };

  const isConditionDisabled = (condition) => {
    if (operation === 'receive' || operation === 'adjust') return false;
    return parseFloat(storageItem[`quantity_${condition}`] || 0) === 0;
  };

  const calculatePreview = () => {
    if (!quantity) return null;

    const currentQty = parseFloat(storageItem[`quantity_${selectedCondition}`] || 0);
    const qtyValue = parseFloat(quantity);

    switch (operation) {
      case 'issue':
      case 'scrap':
        return {
          before: currentQty,
          after: currentQty - qtyValue,
          change: -qtyValue
        };
      case 'receive':
        return {
          before: currentQty,
          after: currentQty + qtyValue,
          change: qtyValue
        };
      case 'adjust':
        return {
          before: currentQty,
          after: qtyValue,
          change: qtyValue - currentQty
        };
      case 'transfer':
        return {
          before: currentQty,
          after: currentQty - qtyValue,
          change: -qtyValue
        };
      default:
        return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const qtyValue = parseFloat(quantity);

    let result;
    switch (operation) {
      case 'issue':
        result = await issueStock(storageItem.id, selectedCondition, qtyValue, reason);
        break;
      case 'receive':
        result = await receiveStock(storageItem.id, selectedCondition, qtyValue, reason);
        break;
      case 'transfer':
        if (!toCompartmentId) {
          alert('Bitte Ziel-Lagerort auswählen');
          return;
        }
        result = await transferStock(storageItem.id, selectedCondition, qtyValue, toCompartmentId, reason);
        break;
      case 'adjust':
        result = await adjustStock(storageItem.id, selectedCondition, qtyValue, reason);
        break;
      case 'scrap':
        result = await scrapStock(storageItem.id, selectedCondition, qtyValue, reason);
        break;
      default:
        return;
    }

    if (result.success) {
      onSuccess(result);
    }
  };

  const preview = calculatePreview();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-900/75 transition-opacity" onClick={onClose}></div>

        {/* Modal */}
        <div className="relative bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">
              {config.title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Condition Pills */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Zustand wählen
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCondition('new')}
                  disabled={isConditionDisabled('new')}
                  className={`py-3 px-2 rounded-lg border transition-all ${
                    selectedCondition === 'new'
                      ? 'bg-green-500/20 border-green-500 text-green-400'
                      : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500'
                  } ${isConditionDisabled('new') ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="font-semibold text-sm">Neu</div>
                  <div className="text-xs mt-1">{storageItem.quantity_new || 0} Stk</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCondition('used')}
                  disabled={isConditionDisabled('used')}
                  className={`py-3 px-2 rounded-lg border transition-all ${
                    selectedCondition === 'used'
                      ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                      : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500'
                  } ${isConditionDisabled('used') ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="font-semibold text-sm">Gebraucht</div>
                  <div className="text-xs mt-1">{storageItem.quantity_used || 0} Stk</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCondition('reground')}
                  disabled={isConditionDisabled('reground')}
                  className={`py-3 px-2 rounded-lg border transition-all ${
                    selectedCondition === 'reground'
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                      : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500'
                  } ${isConditionDisabled('reground') ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="font-semibold text-sm">Nachgeschl.</div>
                  <div className="text-xs mt-1">{storageItem.quantity_reground || 0} Stk</div>
                </button>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {operation === 'adjust' ? 'Neuer Bestand' : 'Menge'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={getMaxQuantity()}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
              {config.requiresQuantityCheck && operation !== 'adjust' && (
                <p className="text-xs text-gray-400 mt-1">
                  Verfügbar: {storageItem[`quantity_${selectedCondition}`]} Stk
                </p>
              )}
            </div>

            {/* Transfer: Target Compartment */}
            {operation === 'transfer' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Ziel-Lagerort
                </label>
                <select
                  value={toCompartmentId}
                  onChange={(e) => setToCompartmentId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Bitte wählen...</option>
                  {compartments.map(comp => (
                    <option key={comp.id} value={comp.id}>
                      {comp.location_name} / {comp.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Grund / Notizen
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder={
                  operation === 'issue' ? 'z.B. Entnahme für Auftrag #12345' :
                  operation === 'receive' ? 'z.B. Wareneingang von Lieferant' :
                  operation === 'adjust' ? 'z.B. Inventur-Korrektur' :
                  'Optional'
                }
              />
            </div>

            {/* Preview */}
            {preview && quantity && (
              <div className="p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="text-sm text-gray-400 mb-2">Vorschau:</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Aktuell:</span>
                    <span className="text-white font-medium">{preview.before.toFixed(2)} Stk</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Änderung:</span>
                    <span className={`font-medium ${preview.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {preview.change >= 0 ? '+' : ''}{preview.change.toFixed(2)} Stk
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-600">
                    <span className="text-gray-400">Neu:</span>
                    <span className="text-white font-bold">{preview.after.toFixed(2)} Stk</span>
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading || !quantity}
                className={`flex-1 px-4 py-2 bg-${config.color}-600 text-white rounded-lg hover:bg-${config.color}-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? 'Wird gespeichert...' : config.submitText}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
