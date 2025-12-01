import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Star, Package, Loader2, ExternalLink, ShoppingCart } from 'lucide-react';
import { useSupplierItemsStore } from '../../stores/supplierItemsStore';
import { useAuthStore } from '../../stores/authStore';
import { toast } from '../Toaster';
import AddSupplierToToolModal from './AddSupplierToToolModal';
import AddToOrderModal from './AddToOrderModal';

export default function ToolSuppliersTab({ storageItemId, toolName }) {
  const { hasPermission } = useAuthStore();
  const {
    supplierItems,
    loading,
    getItemSuppliers,
    createSupplierItem,
    updateSupplierItem,
    deleteSupplierItem,
    setPreferredSupplier,
  } = useSupplierItemsStore();

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showAddToOrderModal, setShowAddToOrderModal] = useState(false);
  const [selectedSupplierItem, setSelectedSupplierItem] = useState(null);

  useEffect(() => {
    if (storageItemId) {
      loadSuppliers();
    }
  }, [storageItemId]);

  const loadSuppliers = async () => {
    try {
      await getItemSuppliers(storageItemId);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleSave = async (data) => {
    try {
      if (editingItem) {
        // Update existing
        await updateSupplierItem(editingItem.id, data);
        toast.success('Lieferant erfolgreich aktualisiert');
      } else {
        // Create new
        await createSupplierItem(data);
        toast.success('Lieferant erfolgreich hinzugefügt');
      }
      await loadSuppliers();
    } catch (error) {
      toast.error(error.message || 'Fehler beim Speichern');
      throw error;
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Verknüpfung zu "${item.supplier_name}" wirklich löschen?`)) {
      return;
    }

    try {
      await deleteSupplierItem(item.id);
      toast.success('Lieferant erfolgreich entfernt');
      await loadSuppliers();
    } catch (error) {
      toast.error(error.message || 'Fehler beim Löschen');
    }
  };

  const handleSetPreferred = async (item) => {
    if (item.is_preferred) {
      toast.info('Dieser Lieferant ist bereits bevorzugt');
      return;
    }

    try {
      await setPreferredSupplier(item.id);
      toast.success(`"${item.supplier_name}" als bevorzugten Lieferanten markiert`);
      await loadSuppliers();
    } catch (error) {
      toast.error(error.message || 'Fehler beim Setzen des bevorzugten Lieferanten');
    }
  };

  const handleAddToOrder = (item) => {
    setSelectedSupplierItem(item);
    setShowAddToOrderModal(true);
  };

  const handleAddToOrderClose = (success) => {
    setShowAddToOrderModal(false);
    setSelectedSupplierItem(null);
    if (success) {
      // Could reload suppliers or show success message
      toast.success('Bestellung erfolgreich aktualisiert');
    }
  };

  const getCurrencySymbol = (currency) => {
    switch (currency) {
      case 'EUR': return '€';
      case 'USD': return '$';
      case 'GBP': return '£';
      case 'CHF': return 'Fr.';
      default: return currency;
    }
  };

  const formatPrice = (price, currency) => {
    if (!price) return '-';
    const symbol = getCurrencySymbol(currency || 'EUR');
    return `${parseFloat(price).toFixed(2)} ${symbol}`;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lieferanten</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {supplierItems.length} {supplierItems.length === 1 ? 'Lieferant' : 'Lieferanten'} verknüpft
          </p>
        </div>
        {hasPermission('storage.create') && (
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Lieferant hinzufügen
          </button>
        )}
      </div>

      {/* Supplier List */}
      {supplierItems.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 border border-gray-200 dark:border-gray-700 text-center">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Noch keine Lieferanten</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Fügen Sie Lieferanten hinzu, um Preise und Lieferzeiten zu verwalten.
          </p>
          {hasPermission('storage.create') && (
            <button
              onClick={handleAdd}
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Ersten Lieferanten hinzufügen
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {supplierItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white dark:bg-gray-800 rounded-lg border transition-all ${
                item.is_preferred 
                  ? 'border-yellow-500/40 shadow-lg shadow-yellow-500/10' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600'
              }`}
            >
              {/* Header with Supplier Name and Status */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link
                    to={`/suppliers/${item.supplier_id}`}
                    className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:text-blue-400 transition-colors flex items-center gap-2"
                  >
                    {item.supplier_name}
                    <ExternalLink className="w-4 h-4 text-gray-500" />
                  </Link>
                  {item.is_preferred && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Bevorzugt
                    </span>
                  )}
                  {!item.is_active && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600">
                      Inaktiv
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!item.is_preferred && hasPermission('storage.edit') && (
                    <button
                      onClick={() => handleSetPreferred(item)}
                      title="Als bevorzugt markieren"
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}

                  {hasPermission('storage.create') && (
                    <button
                      onClick={() => handleAddToOrder(item)}
                      title="Zur Bestellung hinzufügen"
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </button>
                  )}
                  
                  {hasPermission('storage.edit') && (
                    <button
                      onClick={() => handleEdit(item)}
                      title="Bearbeiten"
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  
                  {hasPermission('storage.delete') && (
                    <button
                      onClick={() => handleDelete(item)}
                      title="Entfernen"
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Details Section */}
              <div className="px-6 py-5">
                {/* Primary Info Grid - Always visible fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-5">
                  {/* Article Number */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Artikelnummer</p>
                    <p className="text-gray-900 dark:text-white font-mono text-sm">
                      {item.supplier_part_number || <span className="text-gray-500 italic">nicht angegeben</span>}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Preis</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {item.unit_price ? formatPrice(item.unit_price, item.currency) : (
                        <span className="text-sm text-gray-500 font-normal italic">nicht angegeben</span>
                      )}
                    </p>
                  </div>

                  {/* Lead Time */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Lieferzeit</p>
                    <p className="text-gray-900 dark:text-white text-sm">
                      {item.lead_time_days ? (
                        <>
                          <span className="font-semibold">{item.lead_time_days}</span>{' '}
                          {item.lead_time_days === 1 ? 'Tag' : 'Tage'}
                        </>
                      ) : (
                        <span className="text-gray-500 italic">nicht angegeben</span>
                      )}
                    </p>
                  </div>

                  {/* Min Order Quantity */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Mindestmenge</p>
                    <p className="text-gray-900 dark:text-white text-sm">
                      {item.min_order_quantity ? (
                        <span className="font-semibold">{item.min_order_quantity}</span>
                      ) : (
                        <span className="text-gray-500 italic">keine</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Additional Info */}
                {(item.supplier_code || item.contact_person || item.email || item.phone) && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      {item.supplier_code && (
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Lieferanten-Code</p>
                          <p className="text-gray-600 dark:text-gray-300 font-mono">{item.supplier_code}</p>
                        </div>
                      )}
                      {item.contact_person && (
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Ansprechpartner</p>
                          <p className="text-gray-600 dark:text-gray-300">{item.contact_person}</p>
                        </div>
                      )}
                      {item.email && (
                        <div>
                          <p className="text-gray-500 text-xs mb-1">E-Mail</p>
                          <a href={`mailto:${item.email}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-300 transition-colors">
                            {item.email}
                          </a>
                        </div>
                      )}
                      {item.phone && (
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Telefon</p>
                          <a href={`tel:${item.phone}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-300 transition-colors">
                            {item.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {item.notes && (
                  <div className="mt-5 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700/50">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Notizen</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{item.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <AddSupplierToToolModal
          storageItemId={storageItemId}
          supplierItem={editingItem}
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
          onSave={handleSave}
        />
      )}

      {/* Add to Order Modal */}
      {showAddToOrderModal && selectedSupplierItem && (
        <AddToOrderModal
          storageItemId={storageItemId}
          supplierItem={selectedSupplierItem}
          toolName={toolName}
          isOpen={showAddToOrderModal}
          onClose={handleAddToOrderClose}
        />
      )}
    </div>
  );
}
