import { useState, useEffect } from 'react';
import { X, Plus, ShoppingCart, Loader2, Package } from 'lucide-react';
import { usePurchaseOrdersStore } from '../../stores/purchaseOrdersStore';
import { toast } from '../Toaster';

export default function AddToOrderModal({ 
  storageItemId, 
  supplierItem,
  toolName,
  isOpen, 
  onClose 
}) {
  const {
    orders,
    currentOrder,
    loading,
    fetchOrders,
    fetchOrderById,
    createOrder,
    updateOrder,
  } = usePurchaseOrdersStore();

  const [mode, setMode] = useState('select'); // 'select' or 'new'
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(supplierItem?.unit_price || 0);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  // Load open orders for this supplier when modal opens
  useEffect(() => {
    if (isOpen && supplierItem?.supplier_id) {
      loadOpenOrders();
      
      // Auto-fill unit price from supplier item
      if (supplierItem.unit_price) {
        setUnitPrice(supplierItem.unit_price);
      }

      // Calculate default delivery date based on lead time
      if (supplierItem.lead_time_days) {
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + supplierItem.lead_time_days);
        setExpectedDeliveryDate(deliveryDate.toISOString().split('T')[0]);
      }
    }
  }, [isOpen, supplierItem]);

  const loadOpenOrders = async () => {
    try {
      await fetchOrders({
        supplier_id: supplierItem.supplier_id,
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

    if (quantity <= 0) {
      toast.error('Menge muss größer als 0 sein');
      return;
    }

    setProcessing(true);
    try {
      // Load full order data
      const order = await fetchOrderById(selectedOrderId);

      // ALWAYS format all existing items correctly (quantity_ordered -> quantity)
      const formattedExistingItems = (order.items || []).map(item => ({
        storage_item_id: item.storage_item_id,
        quantity: parseFloat(item.quantity_ordered || item.quantity || 0),
        unit_price: parseFloat(item.unit_price),
        line_number: item.line_number,
        unit: item.unit || 'pieces',
        condition_received: item.condition_received || 'new'
      }));

      // Check if item already exists in order
      const existingItemIndex = formattedExistingItems.findIndex(
        item => item.storage_item_id === storageItemId
      );

      let updatedItems;
      if (existingItemIndex >= 0) {
        // Item exists - update quantity
        updatedItems = [...formattedExistingItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + parseFloat(quantity),
          unit_price: parseFloat(unitPrice)
        };
        toast.info('Artikel-Menge in Bestellung erhöht');
      } else {
        // Item doesn't exist - add it
        updatedItems = [
          ...formattedExistingItems,
          {
            storage_item_id: storageItemId,
            quantity: parseFloat(quantity),
            unit_price: parseFloat(unitPrice)
          }
        ];
        toast.success('Artikel zur Bestellung hinzugefügt');
      }

      // Update order with new items
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
    if (quantity <= 0) {
      toast.error('Menge muss größer als 0 sein');
      return;
    }

    if (!expectedDeliveryDate) {
      toast.error('Bitte wählen Sie ein Lieferdatum');
      return;
    }

    setProcessing(true);
    try {
      const orderData = {
        supplier_id: supplierItem.supplier_id,
        expected_delivery_date: expectedDeliveryDate,
        notes: notes || `Bestellung für ${toolName}`,
        items: [{
          storage_item_id: storageItemId,
          quantity: parseFloat(quantity),
          unit_price: parseFloat(unitPrice)
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

  if (!isOpen) return null;

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
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {toolName}
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p>
                    <span className="font-medium">Lieferant:</span> {supplierItem.supplier_name}
                  </p>
                  {supplierItem.supplier_part_number && (
                    <p>
                      <span className="font-medium">Artikelnummer:</span>{' '}
                      <span className="font-mono">{supplierItem.supplier_part_number}</span>
                    </p>
                  )}
                  {supplierItem.unit_price && (
                    <p>
                      <span className="font-medium">Listenpreis:</span>{' '}
                      €{parseFloat(supplierItem.unit_price).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Mode Selection */}
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
                  <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
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
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Bestellung wählen --</option>
                  {openOrders.map(order => (
                    <option key={order.id} value={order.id}>
                      #{order.order_number} - {order.supplier_name} - {order.expected_delivery_date} 
                      {order.items?.length > 0 && ` (${order.items.length} ${order.items.length === 1 ? 'Position' : 'Positionen'})`}
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
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {supplierItem.lead_time_days && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Lieferzeit: {supplierItem.lead_time_days} Tage
                  </p>
                )}
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
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Quantity & Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Menge <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stückpreis (€) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                €{(parseFloat(quantity || 0) * parseFloat(unitPrice || 0)).toFixed(2)}
              </span>
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
        </form>
      </div>
    </div>
  );
}
