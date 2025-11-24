import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Search } from 'lucide-react';
import { useSuppliersStore } from '../../stores/suppliersStore';
import { useStorageItemsStore } from '../../stores/storageItemsStore';
import { usePurchaseOrdersStore } from '../../stores/purchaseOrdersStore';

export default function OrderForm({ order, isOpen, onClose, onSuccess }) {
  const { suppliers, fetchSuppliers, getSupplierItems } = useSuppliersStore();
  const { storageItems, fetchStorageItems } = useStorageItemsStore();
  const { createOrder, updateOrder } = usePurchaseOrdersStore();
  
  const [loading, setLoading] = useState(false);
  const [supplierItems, setSupplierItems] = useState([]);
  const [storageItemSearch, setStorageItemSearch] = useState('');
  const [formData, setFormData] = useState({
    supplier_id: '',
    notes: '',
    items: []
  });

  // Load suppliers and storage items when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSuppliers({ is_active: true });
      fetchStorageItems();
      
      if (order) {
        // Edit mode: Populate form with existing order
        setFormData({
          supplier_id: order.supplier_id || '',
          notes: order.notes || '',
          items: order.items?.map(item => ({
            id: item.id, // Keep item ID for updates
            storage_item_id: item.storage_item_id,
            quantity: item.quantity_ordered || item.quantity || 0,
            unit_price: item.unit_price
          })) || []
        });
        
        // Load supplier items for edit mode
        if (order.supplier_id) {
          loadSupplierItems(order.supplier_id);
        }
      } else {
        // Create mode: Reset form
        resetForm();
      }
    }
  }, [isOpen, order]);

  // Load supplier items when supplier changes
  useEffect(() => {
    if (formData.supplier_id) {
      loadSupplierItems(formData.supplier_id);
    }
  }, [formData.supplier_id]);

  const calculateDeliveryInfo = () => {
    const supplier = suppliers.find(s => s.id === parseInt(formData.supplier_id));
    if (!supplier) return { days: 0, date: null, source: null };

    let leadTimeDays = supplier.delivery_time_days || 0;
    let source = 'Lieferant';

    // If items are selected, use the longest lead_time_days from supplier_items
    if (formData.items.length > 0) {
      const itemLeadTimes = formData.items
        .map(item => {
          const supplierItem = supplierItems.find(
            si => si.storage_item_id === parseInt(item.storage_item_id)
          );
          return supplierItem?.lead_time_days || 0;
        })
        .filter(time => time > 0);

      if (itemLeadTimes.length > 0) {
        const maxItemLeadTime = Math.max(...itemLeadTimes);
        // Use the longer of: item lead time or supplier default
        if (maxItemLeadTime > leadTimeDays) {
          leadTimeDays = maxItemLeadTime;
          source = 'längste Artikel-Lieferzeit';
        } else if (maxItemLeadTime === leadTimeDays && leadTimeDays > 0) {
          source = 'Artikel/Lieferant';
        }
      }
    }

    if (leadTimeDays > 0) {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + leadTimeDays);
      return {
        days: leadTimeDays,
        date: deliveryDate.toISOString().split('T')[0],
        source
      };
    }

    return { days: 0, date: null, source: null };
  };

  const loadSupplierItems = async (supplierId) => {
    try {
      const items = await getSupplierItems(supplierId);
      setSupplierItems(items || []);
    } catch (error) {
      console.error('Error loading supplier items:', error);
      setSupplierItems([]);
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      notes: '',
      items: []
    });
    setSupplierItems([]);
    setStorageItemSearch('');
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Auto-fill price when storage item is selected
      if (field === 'storage_item_id' && value) {
        const supplierItem = supplierItems.find(
          si => si.storage_item_id === parseInt(value)
        );
        if (supplierItem?.unit_price) {
          newItems[index].unit_price = supplierItem.unit_price;
        }
      }
      
      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { storage_item_id: '', quantity: 1, unit_price: 0 }]
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity || 0);
      const price = parseFloat(item.unit_price || 0);
      return sum + (quantity * price);
    }, 0);
  };

  const getStorageItemName = (storageItemId) => {
    const item = storageItems.find(si => si.id === parseInt(storageItemId));
    if (!item) return '';
    
    // Show tool name and location
    const toolName = item.tool_name || item.tool_article_number || `ID ${item.tool_master_id}`;
    const location = item.location_name ? ` (${item.location_name})` : '';
    return `${toolName}${location}`;
  };

  const getFilteredStorageItems = () => {
    // Only show items that this supplier has
    if (!formData.supplier_id) return [];
    
    // Get storage_item_ids that this supplier offers
    const supplierStorageItemIds = supplierItems.map(si => si.storage_item_id);
    
    // Filter storage items to only those the supplier offers
    let filteredItems = storageItems.filter(item => 
      supplierStorageItemIds.includes(item.id)
    );
    
    // Apply search filter if active
    if (storageItemSearch) {
      const search = storageItemSearch.toLowerCase();
      filteredItems = filteredItems.filter(item => {
        const name = getStorageItemName(item.id).toLowerCase();
        const toolNumber = (item.tool_article_number || '').toLowerCase();
        return name.includes(search) || toolNumber.includes(search);
      });
    }
    
    return filteredItems;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.supplier_id) {
      alert('Bitte wählen Sie einen Lieferanten aus');
      return;
    }
    
    if (formData.items.length === 0) {
      alert('Bitte fügen Sie mindestens einen Artikel hinzu');
      return;
    }
    
    // Check all items have storage_item_id
    const invalidItems = formData.items.filter(item => !item.storage_item_id);
    if (invalidItems.length > 0) {
      alert('Bitte wählen Sie für alle Artikel einen Lagerartikel aus');
      return;
    }

    setLoading(true);
    try {
      // Calculate expected delivery date
      const deliveryInfo = calculateDeliveryInfo();
      
      // Prepare data
      const submitData = {
        supplier_id: parseInt(formData.supplier_id),
        expected_delivery_date: deliveryInfo.date || new Date().toISOString().split('T')[0], // Use calculated or today
        notes: formData.notes || null,
        items: formData.items.map(item => ({
          storage_item_id: parseInt(item.storage_item_id),
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price)
        }))
      };

      let result;
      if (order) {
        // Update existing order
        result = await updateOrder(order.id, submitData);
      } else {
        // Create new order
        result = await createOrder(submitData);
      }

      if (onSuccess) {
        onSuccess(result);
      }
      
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error saving order:', error);
      alert(error.response?.data?.error || 'Fehler beim Speichern der Bestellung');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const supplierName = suppliers.find(s => s.id === parseInt(formData.supplier_id))?.name;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {order ? 'Bestellung bearbeiten' : 'Neue Bestellung erstellen'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Supplier & Date Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Supplier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Lieferant <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.supplier_id}
                onChange={(e) => handleChange('supplier_id', e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            </div>

            {/* Expected Delivery Date Info */}
            {formData.supplier_id && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Voraussichtliche Lieferzeit
                    </h4>
                    {(() => {
                      const deliveryInfo = calculateDeliveryInfo();
                      if (deliveryInfo.days > 0) {
                        return (
                          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <p>
                              <span className="font-medium">Lieferzeit:</span> {deliveryInfo.days} {deliveryInfo.days === 1 ? 'Tag' : 'Tage'} ({deliveryInfo.source})
                            </p>
                            <p>
                              <span className="font-medium">Erwartetes Lieferdatum:</span>{' '}
                              <span className="font-mono text-blue-600 dark:text-blue-400">
                                {new Date(deliveryInfo.date).toLocaleDateString('de-DE', { 
                                  weekday: 'short',
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit'
                                })}
                              </span>
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              ℹ️ Das Lieferdatum wird automatisch bei Versand der Bestellung gesetzt und basiert auf dem aktuellen Datum.
                            </p>
                          </div>
                        );
                      } else {
                        return (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Keine Lieferzeit konfiguriert. Das Lieferdatum wird beim Versand auf das heutige Datum gesetzt.
                          </p>
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>
            )}
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
              placeholder="Optionale Notizen zur Bestellung..."
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Items Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Bestellpositionen
              </h3>
              <button
                type="button"
                onClick={addItem}
                disabled={!formData.supplier_id}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                title={!formData.supplier_id ? "Bitte wählen Sie zuerst einen Lieferanten" : "Position hinzufügen"}
              >
                <Plus className="w-4 h-4" />
                Position hinzufügen
              </button>
            </div>

            {!formData.supplier_id && (
              <div className="text-center py-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-blue-800 dark:text-blue-200 font-medium mb-1">
                  Bitte wählen Sie zuerst einen Lieferanten
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Die verfügbaren Artikel werden nach der Lieferanten-Auswahl geladen.
                </p>
              </div>
            )}

            {formData.supplier_id && formData.items.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Keine Positionen vorhanden. Klicken Sie auf "Position hinzufügen" um zu beginnen.
              </div>
            )}

            {formData.supplier_id && formData.items.length > 0 && (
              <div className="space-y-3">
                {/* Search Field */}
                <div className="flex items-center gap-2 px-2">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={storageItemSearch}
                      onChange={(e) => setStorageItemSearch(e.target.value)}
                      placeholder="Artikel suchen..."
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {storageItemSearch && (
                    <button
                      type="button"
                      onClick={() => setStorageItemSearch('')}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      Zurücksetzen
                    </button>
                  )}
                </div>

                {/* Header Row */}
                <div className="hidden md:grid grid-cols-12 gap-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <div className="col-span-5">Artikel</div>
                  <div className="col-span-2">Menge</div>
                  <div className="col-span-2">Stückpreis (€)</div>
                  <div className="col-span-2 text-right">Gesamt (€)</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Item Rows */}
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    {/* Storage Item Selector */}
                    <div className="col-span-1 md:col-span-5">
                      <label className="block md:hidden text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Artikel
                      </label>
                      <select
                        value={item.storage_item_id}
                        onChange={(e) => handleItemChange(index, 'storage_item_id', e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">-- Artikel wählen --</option>
                        {getFilteredStorageItems().map(storageItem => (
                          <option key={storageItem.id} value={storageItem.id}>
                            {getStorageItemName(storageItem.id)}
                          </option>
                        ))}
                      </select>
                      {storageItemSearch && getFilteredStorageItems().length === 0 && (
                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                          Keine Artikel gefunden für "{storageItemSearch}"
                        </p>
                      )}
                      {!storageItemSearch && getFilteredStorageItems().length === 0 && (
                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                          Dieser Lieferant hat keine konfigurierten Artikel
                        </p>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="block md:hidden text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Menge
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="block md:hidden text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Stückpreis (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {(() => {
                        const supplierItem = supplierItems.find(
                          si => si.storage_item_id === parseInt(item.storage_item_id)
                        );
                        return supplierItem?.unit_price && parseFloat(item.unit_price) === parseFloat(supplierItem.unit_price) ? (
                          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                            Preis vom Lieferanten
                          </p>
                        ) : null;
                      })()}
                    </div>

                    {/* Line Total */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="block md:hidden text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Gesamt
                      </label>
                      <div className="flex items-center justify-start md:justify-end h-[42px] text-gray-900 dark:text-white font-medium">
                        {(parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0)).toFixed(2)}
                      </div>
                    </div>

                    {/* Remove Button */}
                    <div className="col-span-1 md:col-span-1 flex items-end md:items-center justify-end">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Position entfernen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total Section */}
          {formData.items.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex justify-end">
                <div className="w-full md:w-1/3 space-y-2">
                  <div className="flex justify-between text-gray-900 dark:text-white">
                    <span className="font-medium">Positionen:</span>
                    <span>{formData.items.length}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2">
                    <span>Gesamt:</span>
                    <span>{calculateTotal().toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Speichern...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {order ? 'Änderungen speichern' : 'Bestellung erstellen'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
