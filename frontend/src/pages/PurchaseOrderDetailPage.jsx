import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Send, 
  PackageCheck, 
  Edit,
  Trash2,
  Package,
  Calendar,
  Building2,
  FileText
} from 'lucide-react';
import { usePurchaseOrdersStore } from '../stores/purchaseOrdersStore';
import { useSuppliersStore } from '../stores/suppliersStore';
import OrderStatusBadge from '../components/purchase/OrderStatusBadge';
import OrderForm from '../components/purchaseOrders/OrderForm';

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const {
    currentOrder,
    loading,
    error,
    fetchOrderById,
    sendOrder,
    receiveOrder,
    receiveOrderItem,
    deleteOrder,
    canEdit,
    canDelete,
    canSend,
    canReceive,
  } = usePurchaseOrdersStore();

  const { suppliers, fetchSuppliers, getSupplierItems } = useSuppliersStore();

  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receivingItem, setReceivingItem] = useState(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [supplierItems, setSupplierItems] = useState([]);

  useEffect(() => {
    if (id) {
      fetchOrderById(id);
    }
  }, [id]);

  // Load suppliers and supplier items when order is loaded
  useEffect(() => {
    if (currentOrder?.supplier_id) {
      fetchSuppliers({ is_active: true });
      loadSupplierItems(currentOrder.supplier_id);
    }
  }, [currentOrder?.supplier_id]);

  const loadSupplierItems = async (supplierId) => {
    try {
      const items = await getSupplierItems(supplierId);
      setSupplierItems(items || []);
    } catch (error) {
      console.error('Error loading supplier items:', error);
      setSupplierItems([]);
    }
  };

  const calculateDeliveryInfo = () => {
    if (!currentOrder || !currentOrder.supplier_id) return { days: 0, date: null, source: null };

    const supplier = suppliers.find(s => s.id === currentOrder.supplier_id);
    if (!supplier) return { days: 0, date: null, source: null };

    let leadTimeDays = supplier.delivery_time_days || 0;
    let source = 'Lieferant';

    // If items are selected, use the longest lead_time_days from supplier_items
    if (currentOrder.items && currentOrder.items.length > 0) {
      const itemLeadTimes = currentOrder.items
        .map(item => {
          const supplierItem = supplierItems.find(
            si => si.storage_item_id === item.storage_item_id
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

  const handleSend = async () => {
    if (!window.confirm('Bestellung an Lieferanten senden?')) return;
    
    try {
      await sendOrder(id);
      alert('Bestellung wurde versendet');
    } catch (error) {
      alert(error.response?.data?.error || 'Fehler beim Versenden');
    }
  };

  const handleReceiveFull = async () => {
    if (!window.confirm('Kompletten Wareneingang buchen?')) return;
    
    try {
      const items = currentOrder.items.map(item => ({
        item_id: item.id,
        quantity_received: item.quantity_ordered - item.quantity_received,
      }));
      
      await receiveOrder(id, {
        actual_delivery_date: new Date().toISOString().split('T')[0],
        items,
      });
      
      alert('Wareneingang wurde gebucht');
      fetchOrderById(id);
    } catch (error) {
      alert(error.response?.data?.error || 'Fehler beim Wareneingang');
    }
  };

  const handleReceivePartial = async (item) => {
    const remaining = parseFloat(item.quantity_ordered) - parseFloat(item.quantity_received);
    const quantityStr = prompt(
      `Wie viele ${item.unit} wurden geliefert?\n(Max: ${remaining})`,
      remaining.toString()
    );
    
    if (!quantityStr) return;
    
    const quantity = parseFloat(quantityStr);
    if (isNaN(quantity) || quantity <= 0 || quantity > remaining) {
      alert('Ungültige Menge');
      return;
    }
    
    try {
      await receiveOrderItem(id, item.id, {
        quantity_received: quantity,
        notes: 'Teillieferung',
      });
      
      alert('Teillieferung wurde gebucht');
      fetchOrderById(id);
    } catch (error) {
      alert(error.response?.data?.error || 'Fehler beim Buchen');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Bestellung wirklich löschen?')) return;
    
    try {
      await deleteOrder(id);
      alert('Bestellung wurde gelöscht');
      navigate('/purchase-orders');
    } catch (error) {
      alert(error.response?.data?.error || 'Fehler beim Löschen');
    }
  };

  const handleOrderSuccess = (order) => {
    // Reload order to show updates
    fetchOrderById(id);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  const formatCurrency = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Lädt...</p>
      </div>
    );
  }

  if (error || !currentOrder) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error || 'Bestellung nicht gefunden'}</p>
          </div>
          <Link
            to="/purchase-orders"
            className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/purchase-orders"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Übersicht
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {currentOrder.order_number}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Bestellung vom {formatDate(currentOrder.order_date)}
              </p>
            </div>
            <OrderStatusBadge status={currentOrder.status} size="lg" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mb-6">
          {canSend(currentOrder) && (
            <button
              onClick={handleSend}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
              Versenden
            </button>
          )}
          
          {canReceive(currentOrder) && (
            <button
              onClick={handleReceiveFull}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <PackageCheck className="w-4 h-4" />
              Komplett buchen
            </button>
          )}
          
          {canEdit(currentOrder) && (
            <button
              onClick={() => setShowOrderForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
              Bearbeiten
            </button>
          )}
          
          {canDelete(currentOrder) && (
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Löschen
            </button>
          )}
        </div>

        {/* Order Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Supplier Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Lieferant
              </h2>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                <p className="text-gray-900 dark:text-white font-medium">
                  {currentOrder.supplier_name}
                </p>
              </div>
              {currentOrder.supplier_code && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Code</p>
                  <p className="text-gray-900 dark:text-white">{currentOrder.supplier_code}</p>
                </div>
              )}
              {currentOrder.supplier_email && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">E-Mail</p>
                  <p className="text-gray-900 dark:text-white">{currentOrder.supplier_email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Dates / Delivery Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Termine
              </h2>
            </div>

            {/* Draft: Show delivery calculation info */}
            {currentOrder.status === 'draft' ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Bestelldatum</p>
                  <p className="text-gray-900 dark:text-white">{formatDate(currentOrder.order_date)}</p>
                </div>

                {/* Delivery Info Box */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                ℹ️ Das Lieferdatum wird automatisch beim Versand der Bestellung neu berechnet und basiert auf dem aktuellen Datum.
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
              </div>
            ) : (
              /* Sent/Received: Show fixed dates */
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Bestelldatum</p>
                  <p className="text-gray-900 dark:text-white">{formatDate(currentOrder.order_date)}</p>
                </div>
                {currentOrder.expected_delivery_date && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Erwartete Lieferung</p>
                    <p className="text-gray-900 dark:text-white">
                      {formatDate(currentOrder.expected_delivery_date)}
                    </p>
                  </div>
                )}
                {currentOrder.sent_date && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Versendet am</p>
                    <p className="text-gray-900 dark:text-white">{formatDate(currentOrder.sent_date)}</p>
                  </div>
                )}
                {currentOrder.actual_delivery_date && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Geliefert am</p>
                    <p className="text-gray-900 dark:text-white">
                      {formatDate(currentOrder.actual_delivery_date)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Positionen
              </h2>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Pos.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Werkzeug
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Bestellt
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Erhalten
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Preis
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Summe
                  </th>
                  {canReceive(currentOrder) && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Aktion
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {currentOrder.items?.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {item.line_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.tool_name || 'Unbekannt'}
                      </div>
                      {item.tool_number && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.tool_number}
                        </div>
                      )}
                      {item.location_name && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.location_name} / {item.compartment_name}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                      {item.quantity_ordered} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm ${
                        item.quantity_received >= item.quantity_ordered
                          ? 'text-green-600 dark:text-green-400'
                          : item.quantity_received > 0
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {item.quantity_received} {item.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                      {formatCurrency(item.unit_price, currentOrder.currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(item.line_total, currentOrder.currency)}
                    </td>
                    {canReceive(currentOrder) && (
                      <td className="px-4 py-3 text-center">
                        {item.quantity_received < item.quantity_ordered && (
                          <button
                            onClick={() => handleReceivePartial(item)}
                            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Buchen
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                <tr>
                  <td colSpan={canReceive(currentOrder) ? 5 : 4} className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                    Gesamtsumme:
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-lg text-gray-900 dark:text-white">
                    {formatCurrency(currentOrder.total_amount, currentOrder.currency)}
                  </td>
                  {canReceive(currentOrder) && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notes */}
        {(currentOrder.notes || currentOrder.internal_notes) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notizen
              </h2>
            </div>
            {currentOrder.notes && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Bestellnotiz</p>
                <p className="text-gray-900 dark:text-white">{currentOrder.notes}</p>
              </div>
            )}
            {currentOrder.internal_notes && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Interne Notiz</p>
                <p className="text-gray-900 dark:text-white">{currentOrder.internal_notes}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Order Form Modal */}
        <OrderForm
          order={currentOrder}
          isOpen={showOrderForm}
          onClose={() => setShowOrderForm(false)}
          onSuccess={handleOrderSuccess}
        />
      </div>
    </div>
  );
}
