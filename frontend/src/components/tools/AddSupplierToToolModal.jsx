import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSuppliersStore } from '../../stores/suppliersStore';

export default function AddSupplierToToolModal({ storageItemId, supplierItem, isOpen, onClose, onSave }) {
  const { suppliers, fetchSuppliers } = useSuppliersStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    storage_item_id: storageItemId,
    supplier_id: '',
    supplier_article_number: '',
    price: '',
    currency: 'EUR',
    lead_time_days: '',
    min_order_quantity: '',
    is_preferred: false,
    is_active: true,
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      // Load all active suppliers
      fetchSuppliers({ is_active: true });
      
      // If editing, populate form
      if (supplierItem) {
        setFormData({
          storage_item_id: storageItemId,
          supplier_id: supplierItem.supplier_id,
          supplier_article_number: supplierItem.supplier_article_number || '',
          price: supplierItem.price || '',
          currency: supplierItem.currency || 'EUR',
          lead_time_days: supplierItem.lead_time_days || '',
          min_order_quantity: supplierItem.min_order_quantity || '',
          is_preferred: supplierItem.is_preferred || false,
          is_active: supplierItem.is_active !== false,
          notes: supplierItem.notes || '',
        });
      } else {
        // Reset form for new entry
        setFormData({
          storage_item_id: storageItemId,
          supplier_id: '',
          supplier_article_number: '',
          price: '',
          currency: 'EUR',
          lead_time_days: '',
          min_order_quantity: '',
          is_preferred: false,
          is_active: true,
          notes: '',
        });
      }
    }
  }, [isOpen, supplierItem, storageItemId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.supplier_id) {
      alert('Bitte wählen Sie einen Lieferanten aus');
      return;
    }

    setLoading(true);
    try {
      // Convert empty strings to null for numeric fields
      const submitData = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : null,
        lead_time_days: formData.lead_time_days ? parseInt(formData.lead_time_days) : null,
        min_order_quantity: formData.min_order_quantity ? parseFloat(formData.min_order_quantity) : null,
      };

      await onSave(submitData);
      onClose(true);
    } catch (error) {
      console.error('Error saving supplier:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {supplierItem ? 'Lieferant bearbeiten' : 'Lieferant hinzufügen'}
          </h2>
          <button
            onClick={() => onClose(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Supplier Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Lieferant <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.supplier_id}
              onChange={(e) => handleChange('supplier_id', e.target.value)}
              required
              disabled={!!supplierItem} // Disable when editing
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
            >
              <option value="">-- Lieferant wählen --</option>
              {suppliers
                .filter(s => s.is_active)
                .map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} {supplier.supplier_code ? `(${supplier.supplier_code})` : ''}
                  </option>
                ))}
            </select>
            {supplierItem && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Lieferant kann nicht geändert werden. Löschen Sie die Verknüpfung und erstellen Sie eine neue.
              </p>
            )}
          </div>

          {/* Article Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Artikelnummer beim Lieferanten
            </label>
            <input
              type="text"
              value={formData.supplier_article_number}
              onChange={(e) => handleChange('supplier_article_number', e.target.value)}
              placeholder="z.B. ART-12345"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Price & Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preis
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => handleChange('price', e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Währung
              </label>
              <select
                value={formData.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CHF">CHF (Fr.)</option>
              </select>
            </div>
          </div>

          {/* Lead Time & Min Order Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Lieferzeit (Tage)
              </label>
              <input
                type="number"
                min="0"
                value={formData.lead_time_days}
                onChange={(e) => handleChange('lead_time_days', e.target.value)}
                placeholder="z.B. 7"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mindestbestellmenge
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.min_order_quantity}
                onChange={(e) => handleChange('min_order_quantity', e.target.value)}
                placeholder="z.B. 10"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notizen
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              placeholder="Zusätzliche Informationen..."
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_preferred}
                onChange={(e) => handleChange('is_preferred', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Als bevorzugten Lieferanten markieren
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleChange('is_active', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Aktiv
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading || !formData.supplier_id}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Speichern...' : (supplierItem ? 'Aktualisieren' : 'Hinzufügen')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
