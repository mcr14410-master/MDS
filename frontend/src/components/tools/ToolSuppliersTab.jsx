import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Star, Package, Loader2, ExternalLink } from 'lucide-react';
import { useSupplierItemsStore } from '../../stores/supplierItemsStore';
import { useAuthStore } from '../../stores/authStore';
import { toast } from '../Toaster';
import AddSupplierToToolModal from './AddSupplierToToolModal';

export default function ToolSuppliersTab({ storageItemId }) {
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
      <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Lieferanten</h3>
          <p className="text-sm text-gray-400 mt-1">
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
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Noch keine Lieferanten</h3>
          <p className="text-gray-400 mb-6">
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
              className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                {/* Supplier Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Link
                      to={`/suppliers/${item.supplier_id}`}
                      className="text-lg font-semibold text-white hover:text-blue-400 transition-colors"
                    >
                      {item.supplier_name}
                    </Link>
                    {item.is_preferred && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        Bevorzugt
                      </span>
                    )}
                    {!item.is_active && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-400 border border-gray-600">
                        Inaktiv
                      </span>
                    )}
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    {/* Article Number */}
                    {item.supplier_article_number && (
                      <div>
                        <p className="text-gray-400 mb-1">Artikelnummer</p>
                        <p className="text-white font-mono">{item.supplier_article_number}</p>
                      </div>
                    )}

                    {/* Price */}
                    {item.price && (
                      <div>
                        <p className="text-gray-400 mb-1">Preis</p>
                        <p className="text-white font-semibold">
                          {formatPrice(item.price, item.currency)}
                        </p>
                      </div>
                    )}

                    {/* Lead Time */}
                    {item.lead_time_days && (
                      <div>
                        <p className="text-gray-400 mb-1">Lieferzeit</p>
                        <p className="text-white">
                          {item.lead_time_days} {item.lead_time_days === 1 ? 'Tag' : 'Tage'}
                        </p>
                      </div>
                    )}

                    {/* Min Order Quantity */}
                    {item.min_order_quantity && (
                      <div>
                        <p className="text-gray-400 mb-1">Mindestmenge</p>
                        <p className="text-white">{item.min_order_quantity}</p>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {item.notes && (
                    <div className="mt-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                      <p className="text-sm text-gray-300">{item.notes}</p>
                    </div>
                  )}

                  {/* Supplier Link */}
                  {item.supplier_website && (
                    <div className="mt-3">
                      <a
                        href={item.supplier_website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Website öffnen
                      </a>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 ml-4">
                  {!item.is_preferred && hasPermission('storage.edit') && (
                    <button
                      onClick={() => handleSetPreferred(item)}
                      title="Als bevorzugt markieren"
                      className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  
                  {hasPermission('storage.edit') && (
                    <button
                      onClick={() => handleEdit(item)}
                      title="Bearbeiten"
                      className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  
                  {hasPermission('storage.delete') && (
                    <button
                      onClick={() => handleDelete(item)}
                      title="Entfernen"
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
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
    </div>
  );
}
