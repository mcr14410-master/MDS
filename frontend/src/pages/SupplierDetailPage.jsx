import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Loader2, Package, MapPin, Phone, Mail, Globe, Calendar, TrendingUp, Droplet } from 'lucide-react';
import { useSuppliersStore } from '../stores/suppliersStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../components/Toaster';
import SupplierFormModal from '../components/suppliers/SupplierFormModal';
import axios from '../utils/axios';

export default function SupplierDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  
  const {
    currentSupplier,
    loading,
    error,
    fetchSupplier,
    deleteSupplier,
    getSupplierItems,
  } = useSuppliersStore();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'items', 'statistics'
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [supplierItems, setSupplierItems] = useState([]);
  const [consumables, setConsumables] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      await fetchSupplier(id);
      await loadSupplierItems();
      await loadConsumables();
    } catch (err) {
      console.error('Error loading supplier:', err);
    }
  };

  const loadSupplierItems = async () => {
    try {
      setItemsLoading(true);
      const items = await getSupplierItems(id);
      setSupplierItems(items || []);
    } catch (err) {
      console.error('Error loading supplier items:', err);
      setSupplierItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  const loadConsumables = async () => {
    try {
      const response = await axios.get(`/api/consumables?supplier_id=${id}`);
      setConsumables(response.data.data || []);
    } catch (err) {
      console.error('Error loading consumables:', err);
      setConsumables([]);
    }
  };

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleDelete = async () => {
    if (!currentSupplier) return;

    if (
      !window.confirm(
        `Lieferant "${currentSupplier.name}" wirklich deaktivieren?\n\nDie Verknüpfungen zu Artikeln bleiben erhalten.`
      )
    ) {
      return;
    }

    try {
      await deleteSupplier(currentSupplier.id, false); // Soft delete
      toast.success(`Lieferant "${currentSupplier.name}" wurde deaktiviert`);
      navigate('/suppliers');
    } catch (err) {
      toast.error(err.message || 'Fehler beim Deaktivieren');
    }
  };

  const handleModalClose = (success) => {
    setIsEditModalOpen(false);
    if (success) {
      loadData();
    }
  };

  const getRatingStars = (rating) => {
    if (!rating) return null;
    
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-5 h-5 ${
              i < rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="ml-2 text-sm font-medium text-gray-600 dark:text-gray-400">
          {rating}/5
        </span>
      </div>
    );
  };

  if (loading && !currentSupplier) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  if (error || !currentSupplier) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg">
            {error || 'Lieferant nicht gefunden'}
          </div>
          <button
            onClick={() => navigate('/suppliers')}
            className="mt-4 flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          {/* Back Button */}
          <button
            onClick={() => navigate('/suppliers')}
            className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Übersicht
          </button>

          {/* Title & Actions */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {currentSupplier.name}
                </h1>
                {currentSupplier.is_preferred && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Bevorzugt
                  </span>
                )}
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    currentSupplier.is_active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {currentSupplier.is_active ? 'Aktiv' : 'Inaktiv'}
                </span>
              </div>
              
              {currentSupplier.supplier_code && (
                <p className="mt-2 text-sm font-mono text-gray-600 dark:text-gray-400">
                  Code: {currentSupplier.supplier_code}
                </p>
              )}

              {currentSupplier.rating && (
                <div className="mt-3">
                  {getRatingStars(currentSupplier.rating)}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {hasPermission('storage.edit') && (
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Bearbeiten
                </button>
              )}
              {hasPermission('storage.delete') && currentSupplier.is_active && (
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-600 rounded-lg text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Deaktivieren
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Übersicht
            </button>
            <button
              onClick={() => setActiveTab('items')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'items'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Artikel ({supplierItems.length})
            </button>
            <button
              onClick={() => setActiveTab('statistics')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'statistics'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Statistiken
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Kontaktdaten
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentSupplier.contact_person && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Ansprechpartner</p>
                        <p className="font-medium text-gray-900 dark:text-white">{currentSupplier.contact_person}</p>
                      </div>
                    </div>
                  )}

                  {currentSupplier.email && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">E-Mail</p>
                        <a
                          href={`mailto:${currentSupplier.email}`}
                          className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {currentSupplier.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {currentSupplier.phone && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Telefon</p>
                        <p className="font-medium text-gray-900 dark:text-white">{currentSupplier.phone}</p>
                      </div>
                    </div>
                  )}

                  {currentSupplier.fax && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Fax</p>
                        <p className="font-medium text-gray-900 dark:text-white">{currentSupplier.fax}</p>
                      </div>
                    </div>
                  )}

                  {currentSupplier.website && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Website</p>
                        <a
                          href={currentSupplier.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {currentSupplier.website}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Address */}
              {(currentSupplier.street || currentSupplier.city || currentSupplier.country) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Adresse
                  </h3>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-gray-900 dark:text-white">
                      {currentSupplier.street && <p>{currentSupplier.street}</p>}
                      {currentSupplier.address_line2 && <p>{currentSupplier.address_line2}</p>}
                      {(currentSupplier.postal_code || currentSupplier.city) && (
                        <p>
                          {currentSupplier.postal_code} {currentSupplier.city}
                        </p>
                      )}
                      {currentSupplier.country && <p>{currentSupplier.country}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Business Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Geschäftsdaten
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentSupplier.vat_id && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">USt-IdNr.</p>
                      <p className="font-medium text-gray-900 dark:text-white">{currentSupplier.vat_id}</p>
                    </div>
                  )}

                  {currentSupplier.payment_terms && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Zahlungsbedingungen</p>
                      <p className="font-medium text-gray-900 dark:text-white">{currentSupplier.payment_terms}</p>
                    </div>
                  )}

                  {currentSupplier.delivery_time_days && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Lieferzeit</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {currentSupplier.delivery_time_days} Tage
                      </p>
                    </div>
                  )}

                  {currentSupplier.min_order_value && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Mindestbestellwert</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {currentSupplier.min_order_value} {currentSupplier.currency || 'EUR'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {currentSupplier.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Notizen
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {currentSupplier.notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    <span className="font-medium">Erstellt:</span>{' '}
                    {new Date(currentSupplier.created_at).toLocaleDateString('de-DE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div>
                    <span className="font-medium">Aktualisiert:</span>{' '}
                    {new Date(currentSupplier.updated_at).toLocaleDateString('de-DE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Items Tab */}
          {activeTab === 'items' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Verknüpfte Artikel
                </h3>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {supplierItems.length} {supplierItems.length === 1 ? 'Artikel' : 'Artikel'}
                </span>
              </div>

              {itemsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
                </div>
              ) : supplierItems.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Noch keine Artikel verknüpft
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Artikel
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Artikelnummer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Preis
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Lieferzeit
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {supplierItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4">
                            <Link
                              to={`/tools/${item.tool_master_id}`}
                              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                            >
                              {item.tool_name || `Item #${item.storage_item_id}`}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-mono">
                            {item.supplier_part_number || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                            {item.unit_price ? (
                              <>
                                {parseFloat(item.unit_price).toFixed(2)} {item.currency || 'EUR'}
                              </>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                            {item.lead_time_days ? `${item.lead_time_days} Tage` : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {item.is_preferred && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                  Bevorzugt
                                </span>
                              )}
                              {!item.is_active && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400">
                                  Inaktiv
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Consumables Section */}
              {consumables.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Droplet className="w-5 h-5 text-amber-500" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Verbrauchsmaterial ({consumables.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Artikel
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Lieferanten Art.-Nr.
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Kategorie
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Preis
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {consumables.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-6 py-4">
                              <Link
                                to={`/consumables/${item.id}`}
                                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                              >
                                {item.name}
                              </Link>
                              {item.article_number && (
                                <div className="text-xs text-gray-500">{item.article_number}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-mono">
                              {item.supplier_article_number || '-'}
                            </td>
                            <td className="px-6 py-4">
                              {item.category_name && (
                                <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                                  {item.category_name}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                              {item.unit_price ? (
                                <>{parseFloat(item.unit_price).toFixed(2)} €/{item.base_unit}</>
                              ) : item.package_price ? (
                                <>{parseFloat(item.package_price).toFixed(2)} €/Geb.</>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
                                item.stock_status === 'reorder' 
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : item.stock_status === 'low'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              }`}>
                                {item.stock_status === 'reorder' ? '! Nachbestellen' : 
                                 item.stock_status === 'low' ? '⚠ Wird knapp' : '✓ OK'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'statistics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Statistiken
              </h3>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        Verknüpfte Artikel
                      </p>
                      <p className="text-3xl font-bold text-blue-900 dark:text-blue-300 mt-2">
                        {supplierItems.length}
                      </p>
                    </div>
                    <Package className="w-12 h-12 text-blue-600 dark:text-blue-400 opacity-50" />
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                        Bevorzugte Artikel
                      </p>
                      <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-300 mt-2">
                        {supplierItems.filter(item => item.is_preferred).length}
                      </p>
                    </div>
                    <TrendingUp className="w-12 h-12 text-yellow-600 dark:text-yellow-400 opacity-50" />
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        Aktive Artikel
                      </p>
                      <p className="text-3xl font-bold text-green-900 dark:text-green-300 mt-2">
                        {supplierItems.filter(item => item.is_active).length}
                      </p>
                    </div>
                    <svg className="w-12 h-12 text-green-600 dark:text-green-400 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  Weitere Informationen
                </h4>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <p>
                    • Durchschnittliche Lieferzeit:{' '}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {currentSupplier.delivery_time_days || 'Nicht angegeben'} Tage
                    </span>
                  </p>
                  <p>
                    • Rating:{' '}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {currentSupplier.rating ? `${currentSupplier.rating}/5 Sternen` : 'Nicht bewertet'}
                    </span>
                  </p>
                  <p>
                    • Status:{' '}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {currentSupplier.is_active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <SupplierFormModal
          supplier={currentSupplier}
          isOpen={isEditModalOpen}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
