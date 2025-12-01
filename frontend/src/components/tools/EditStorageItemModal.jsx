import { useState, useEffect } from 'react';
import { X, Edit3, MapPin, Box } from 'lucide-react';
import { useStorageItemsStore } from '../../stores/storageItemsStore';
import { toast } from '../Toaster';

export default function EditStorageItemModal({ storageItem, onClose, onSuccess }) {
  const { updateStorageItem, loading } = useStorageItemsStore();

  const [formData, setFormData] = useState({
    min_quantity: '',
    max_quantity: '',
    reorder_point: '',
    weight_new: '',
    weight_used: '',
    weight_reground: '',
    enable_low_stock_alert: true,
    notes: '',
  });

  // Initialize form with storage item data
  useEffect(() => {
    if (storageItem) {
      setFormData({
        min_quantity: storageItem.min_quantity || '',
        max_quantity: storageItem.max_quantity || '',
        reorder_point: storageItem.reorder_point || '',
        weight_new: storageItem.weight_new || 1.0,
        weight_used: storageItem.weight_used || 0.5,
        weight_reground: storageItem.weight_reground || 0.8,
        enable_low_stock_alert: storageItem.enable_low_stock_alert ?? true,
        notes: storageItem.notes || '',
      });
    }
  }, [storageItem]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prepare data - only send fields that can be updated
    const updateData = {
      min_quantity: formData.min_quantity ? parseInt(formData.min_quantity) : null,
      max_quantity: formData.max_quantity ? parseInt(formData.max_quantity) : null,
      reorder_point: formData.reorder_point ? parseInt(formData.reorder_point) : null,
      weight_new: parseFloat(formData.weight_new) || 1.0,
      weight_used: parseFloat(formData.weight_used) || 0.5,
      weight_reground: parseFloat(formData.weight_reground) || 0.8,
      enable_low_stock_alert: formData.enable_low_stock_alert,
      notes: formData.notes || null,
    };

    const result = await updateStorageItem(storageItem.id, updateData);

    if (result.success) {
      toast.success('Lagerartikel erfolgreich aktualisiert');
      onSuccess();
    } else {
      toast.error(result.error || 'Fehler beim Aktualisieren');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-50 dark:bg-gray-900/75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl shadow-xl border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Edit3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lagerartikel bearbeiten</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {storageItem.location_name} / {storageItem.compartment_name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4">
            <div className="space-y-6">
              {/* Current Location (Read-only Info) */}
              <div className="bg-gray-750 rounded-lg p-4 border border-gray-300 dark:border-gray-600">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span>Aktueller Lagerort</span>
                </div>
                <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <Box className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium">
                    {storageItem.location_name} / {storageItem.compartment_name}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Um den Lagerort zu ändern, verwenden Sie die "Umlagern" Funktion
                </p>
              </div>

              {/* Current Stock (Read-only Info) */}
              <div className="bg-gray-750 rounded-lg p-4 border border-gray-300 dark:border-gray-600">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Aktueller Bestand</div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Neu</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">{storageItem.quantity_new || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Gebraucht</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">{storageItem.quantity_used || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Nachgeschliffen</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">{storageItem.quantity_reground || 0}</div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Um Bestände zu ändern, verwenden Sie die Bestandsbewegungen (Einlagern/Entnehmen)
                </p>
              </div>

              {/* Stock Limits */}
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">
                  Bestandsgrenzen
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Min. Bestand</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.min_quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, min_quantity: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. 10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Bestellpunkt</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.reorder_point}
                      onChange={(e) =>
                        setFormData({ ...formData, reorder_point: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. 20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Max. Bestand</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.max_quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, max_quantity: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. 100"
                    />
                  </div>
                </div>
              </div>

              {/* Condition Weights */}
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                  Gewichtungsfaktoren für effektiven Bestand
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Faktor für die Berechnung des effektiven Bestands (0.0 - 1.0)
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Neu</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={formData.weight_new}
                      onChange={(e) =>
                        setFormData({ ...formData, weight_new: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Gebraucht</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={formData.weight_used}
                      onChange={(e) =>
                        setFormData({ ...formData, weight_used: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Nachgeschliffen</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={formData.weight_reground}
                      onChange={(e) =>
                        setFormData({ ...formData, weight_reground: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Low Stock Alert */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enable_low_stock_alert}
                    onChange={(e) =>
                      setFormData({ ...formData, enable_low_stock_alert: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Niedrigbestand-Warnung aktivieren
                  </span>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                  Notizen
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Zusätzliche Informationen..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Speichere...' : 'Änderungen speichern'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
