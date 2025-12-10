import { useState, useEffect } from 'react';
import { X, Plus, ShoppingCart, Loader2, Package } from 'lucide-react';
import { usePurchaseOrdersStore } from '../../stores/purchaseOrdersStore';
import { toast } from '../Toaster';

export default function AddConsumableToOrderModal({ consumable, onClose }) {
  const {
    orders,
    loading,
    fetchOrders,
    fetchOrderById,
    createOrder,
    updateOrder,
  } = usePurchaseOrdersStore();

  const [mode, setMode] = useState('select'); // 'select' or 'new'
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [quantityMode, setQuantityMode] = useState('package'); // 'package' or 'unit'
  const [packageCount, setPackageCount] = useState(1);
  const [unitQuantity, setUnitQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState(consumable?.package_price || consumable?.unit_price || 0);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  // Calculate effective quantity based on mode
  const hasPackageInfo = consumable?.package_type && consumable?.package_size;
  const effectiveQuantity = quantityMode === 'package' && consumable?.package_size
    ? packageCount * consumable.package_size
    : parseFloat(unitQuantity) || 0;

  // Load open orders when modal opens
  useEffect(() => {
    if (consumable?.supplier_id) {
      loadOpenOrders();
    }
    
    // Set default delivery date (14 days)
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 14);
    setExpectedDeliveryDate(deliveryDate.toISOString().split('T')[0]);
    
    // Set initial unit quantity to package size if available
    if (consumable?.package_size) {
      setUnitQuantity(consumable.package_size.toString());
    }
  }, [consumable]);

  const loadOpenOrders = async () => {
    try {
      await fetchOrders({
        supplier_id: consumable.supplier_id,
        status: 'draft'
      });
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const handleAddToExistingOrder = async () => {
    if (!selectedOrderId) {
      toast.error('Bitte wählen Sie eine Bestellung aus');
      return;
    }

    if (effectiveQuantity <= 0) {
      toast.error('Menge muss größer als 0 sein');
      return;
    }

    setProcessing(true);
    try {
      const order = await fetchOrderById(selectedOrderId);

      // Format existing items
      const formattedExistingItems = (order.items || []).map(item => ({
        item_type: item.item_type || 'tool',
        storage_item_id: item.storage_item_id || null,
        consumable_id: item.consumable_id || null,
        quantity: parseFloat(item.quantity_ordered || item.quantity || 0),
        unit_price: parseFloat(item.unit_price),
        line_number: item.line_number,
        unit: item.unit || 'pieces',
      }));

      // Check if consumable already exists in order
      const existingItemIndex = formattedExistingItems.findIndex(
        item => item.item_type === 'consumable' && item.consumable_id === consumable.id
      );

      let updatedItems;
      if (existingItemIndex >= 0) {
        updatedItems = [...formattedExistingItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + effectiveQuantity,
          // Bei Gebinde-Modus: Preis pro Basiseinheit berechnen
          unit_price: hasPackageInfo && quantityMode === 'package' 
            ? parseFloat(unitPrice) / consumable.package_size 
            : parseFloat(unitPrice)
        };
        toast.info('Artikel-Menge in Bestellung erhöht');
      } else {
        // Bei Gebinde-Modus: Preis pro Basiseinheit berechnen
        const effectiveUnitPrice = hasPackageInfo && quantityMode === 'package'
          ? parseFloat(unitPrice) / consumable.package_size
          : parseFloat(unitPrice);
          
        updatedItems = [
          ...formattedExistingItems,
          {
            item_type: 'consumable',
            consumable_id: consumable.id,
            quantity: effectiveQuantity,
            unit_price: effectiveUnitPrice,
            unit: consumable.base_unit
          }
        ];
        toast.success('Artikel zur Bestellung hinzugefügt');
      }

      await updateOrder(selectedOrderId, {
        supplier_id: order.supplier_id,
        expected_delivery_date: order.expected_delivery_date,
        notes: order.notes,
        items: updatedItems
      });

      onClose(true);
    } catch (error) {
      console.error('Error adding to order:', error);
      toast.error(error.message || 'Fehler beim Hinzufügen zur Bestellung');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateNewOrder = async () => {
    if (effectiveQuantity <= 0) {
      toast.error('Menge muss größer als 0 sein');
      return;
    }

    if (!expectedDeliveryDate) {
      toast.error('Bitte wählen Sie ein Lieferdatum');
      return;
    }

    if (!consumable.supplier_id) {
      toast.error('Kein Lieferant für diesen Artikel hinterlegt');
      return;
    }

    setProcessing(true);
    try {
      // Bei Gebinde-Modus: Preis pro Basiseinheit berechnen
      const effectiveUnitPrice = hasPackageInfo && quantityMode === 'package'
        ? parseFloat(unitPrice) / consumable.package_size
        : parseFloat(unitPrice);
        
      const orderData = {
        supplier_id: consumable.supplier_id,
        expected_delivery_date: expectedDeliveryDate,
        notes: notes || `Bestellung: ${consumable.name}`,
        items: [{
          item_type: 'consumable',
          consumable_id: consumable.id,
          quantity: effectiveQuantity,
          unit_price: effectiveUnitPrice,
          unit: consumable.base_unit
        }]
      };

      await createOrder(orderData);
      toast.success('Neue Bestellung erstellt');
      onClose(true);
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(error.message || 'Fehler beim Erstellen der Bestellung');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'new') {
      handleCreateNewOrder();
    } else {
      handleAddToExistingOrder();
    }
  };

  const openOrders = orders.filter(o => o.status === 'draft');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Zur Bestellung hinzufügen
          </h2>
          <button
            onClick={() => onClose(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Article Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-lg">
                <Package className="w-6 h-6 text-blue-600 dark:text-blue-300" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {consumable.name}
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-0.5">
                  {consumable.article_number && (
                    <p>Art.-Nr.: {consumable.article_number}</p>
                  )}
                  {consumable.category_name && (
                    <p>Kategorie: {consumable.category_name}</p>
                  )}
                  {hasPackageInfo && (
                    <p>Gebinde: {consumable.package_type} {consumable.package_size} {consumable.base_unit}</p>
                  )}
                  {consumable.supplier_name ? (
                    <p>Lieferant: {consumable.supplier_name}</p>
                  ) : (
                    <p className="text-amber-600 dark:text-amber-400">⚠ Kein Lieferant hinterlegt</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* No Supplier Warning */}
          {!consumable.supplier_id && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-amber-700 dark:text-amber-400">
              Für diesen Artikel ist kein Lieferant hinterlegt. Bitte zuerst einen Lieferanten zuweisen.
            </div>
          )}

          {/* Mode Selection */}
          {consumable.supplier_id && (
            <>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMode('select')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                    mode === 'select'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                  }`}
                >
                  <ShoppingCart className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-sm font-medium">Zu Bestellung hinzufügen</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {openOrders.length} offene {openOrders.length === 1 ? 'Bestellung' : 'Bestellungen'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('new')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                    mode === 'new'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Plus className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-sm font-medium">Neue Bestellung</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Bestellung erstellen
                  </div>
                </button>
              </div>

              {/* Select Existing Order */}
              {mode === 'select' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bestellung auswählen <span className="text-red-500">*</span>
                  </label>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    </div>
                  ) : openOrders.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        Keine offenen Bestellungen für diesen Lieferanten
                      </p>
                      <button
                        type="button"
                        onClick={() => setMode('new')}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Neue Bestellung erstellen
                      </button>
                    </div>
                  ) : (
                    <select
                      value={selectedOrderId}
                      onChange={(e) => setSelectedOrderId(e.target.value)}
                      required={mode === 'select'}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Bestellung wählen --</option>
                      {openOrders.map(order => (
                        <option key={order.id} value={order.id}>
                          #{order.order_number} - {order.supplier_name} - {order.expected_delivery_date}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* New Order Fields */}
              {mode === 'new' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Gewünschtes Lieferdatum <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                      required={mode === 'new'}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notizen
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Optionale Notizen zur Bestellung..."
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Quantity Mode Toggle (nur wenn Gebinde-Info vorhanden) */}
              {hasPackageInfo && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bestellmenge
                  </label>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setQuantityMode('package')}
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                        quantityMode === 'package'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      In Gebinden ({consumable.package_type})
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuantityMode('unit')}
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                        quantityMode === 'unit'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      In {consumable.base_unit}
                    </button>
                  </div>
                </div>
              )}

              {/* Quantity Input */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {hasPackageInfo && quantityMode === 'package' 
                      ? `Anzahl ${consumable.package_type}`
                      : `Menge (${consumable.base_unit})`
                    } <span className="text-red-500">*</span>
                  </label>
                  {hasPackageInfo && quantityMode === 'package' ? (
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={packageCount}
                      onChange={(e) => setPackageCount(parseInt(e.target.value) || 1)}
                      required
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={unitQuantity}
                      onChange={(e) => setUnitQuantity(e.target.value)}
                      required
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  {hasPackageInfo && quantityMode === 'package' && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      = {effectiveQuantity} {consumable.base_unit}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {hasPackageInfo && quantityMode === 'package' ? 'Preis/Gebinde (€)' : `Preis/${consumable.base_unit} (€)`}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Total */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Positionssumme:
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    €{(
                      hasPackageInfo && quantityMode === 'package'
                        ? packageCount * parseFloat(unitPrice || 0)
                        : (parseFloat(unitQuantity) || 0) * parseFloat(unitPrice || 0)
                    ).toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {effectiveQuantity} {consumable.base_unit} bestellen
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => onClose(false)}
                  disabled={processing}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={processing || (mode === 'select' && !selectedOrderId) || loading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Wird hinzugefügt...
                    </span>
                  ) : mode === 'new' ? (
                    'Bestellung erstellen'
                  ) : (
                    'Zur Bestellung hinzufügen'
                  )}
                </button>
              </div>
            </>
          )}

          {/* Close button when no supplier */}
          {!consumable.supplier_id && (
            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => onClose(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Schließen
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
