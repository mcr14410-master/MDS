import { useState, useEffect } from 'react';
import { X, Package, MapPin, Box } from 'lucide-react';
import { useStorageStore } from '../../stores/storageStore';
import { useStorageItemsStore } from '../../stores/storageItemsStore';
import { toast } from '../Toaster';

export default function CreateStorageItemModal({ toolMasterId, toolName, onClose, onSuccess }) {
  const { locations, compartments, fetchLocations, fetchCompartments } = useStorageStore();
  const { createStorageItem, loading } = useStorageItemsStore();

  const [formData, setFormData] = useState({
    location_id: '',
    compartment_id: '',
    quantity_new: 0,
    quantity_used: 0,
    quantity_reground: 0,
    min_quantity: '',
    max_quantity: '',
    reorder_point: '',
    weight_new: 1.0,
    weight_used: 0.5,
    weight_reground: 0.8,
    enable_low_stock_alert: true,
    notes: '',
  });

  const [filteredCompartments, setFilteredCompartments] = useState([]);

  useEffect(() => {
    fetchLocations();
    fetchCompartments();
  }, []);

  useEffect(() => {
    // Filter compartments by selected location
    if (formData.location_id) {
      const filtered = compartments.filter(
        (comp) => comp.location_id === parseInt(formData.location_id)
      );
      setFilteredCompartments(filtered);
    } else {
      setFilteredCompartments([]);
    }
  }, [formData.location_id, compartments]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.location_id || !formData.compartment_id) {
      toast.error('Bitte wählen Sie Lagerort und Fach aus');
      return;
    }

    // Prepare data
    const storageItemData = {
      item_type: 'tool', // Default to tool type
      tool_master_id: toolMasterId,
      compartment_id: parseInt(formData.compartment_id),
      quantity_new: parseInt(formData.quantity_new) || 0,
      quantity_used: parseInt(formData.quantity_used) || 0,
      quantity_reground: parseInt(formData.quantity_reground) || 0,
      min_quantity: formData.min_quantity ? parseInt(formData.min_quantity) : null,
      max_quantity: formData.max_quantity ? parseInt(formData.max_quantity) : null,
      reorder_point: formData.reorder_point ? parseInt(formData.reorder_point) : null,
      weight_new: parseFloat(formData.weight_new) || 1.0,
      weight_used: parseFloat(formData.weight_used) || 0.5,
      weight_reground: parseFloat(formData.weight_reground) || 0.8,
      enable_low_stock_alert: formData.enable_low_stock_alert,
      notes: formData.notes || null,
    };

    const result = await createStorageItem(storageItemData);

    if (result.success) {
      toast.success('Lagerartikel erfolgreich angelegt');
      onSuccess();
    } else {
      toast.error(result.error || 'Fehler beim Anlegen');
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
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lagerartikel anlegen</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{toolName}</p>
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
              {/* Location Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Lagerort <span className="text-red-600 dark:text-red-400">*</span>
                  </label>
                  <select
                    required
                    value={formData.location_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location_id: e.target.value,
                        compartment_id: '', // Reset compartment when location changes
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Lagerort wählen...</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name} {location.building && `(${location.building})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                    <Box className="w-4 h-4 inline mr-1" />
                    Fach <span className="text-red-600 dark:text-red-400">*</span>
                  </label>
                  <select
                    required
                    value={formData.compartment_id}
                    onChange={(e) => setFormData({ ...formData, compartment_id: e.target.value })}
                    disabled={!formData.location_id}
                    className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Fach wählen...</option>
                    {filteredCompartments.map((compartment) => (
                      <option key={compartment.id} value={compartment.id}>
                        {compartment.name}
                      </option>
                    ))}
                  </select>
                  {!formData.location_id && (
                    <p className="text-xs text-gray-500 mt-1">Wählen Sie zuerst einen Lagerort</p>
                  )}
                </div>
              </div>

              {/* Initial Stock (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">
                  Initial-Bestand (optional)
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Neu</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.quantity_new}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity_new: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Gebraucht</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.quantity_used}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity_used: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Nachgeschliffen</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.quantity_reground}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity_reground: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Stock Limits (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">
                  Bestandsgrenzen (optional)
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
                  Notizen (optional)
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
                {loading ? 'Erstelle...' : 'Lagerartikel anlegen'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
