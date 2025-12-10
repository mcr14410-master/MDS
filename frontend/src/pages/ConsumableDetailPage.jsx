import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useConsumablesStore } from '../stores/consumablesStore';
import ConsumableForm from '../components/consumables/ConsumableForm';
import ConsumableLocationsTab from '../components/consumables/ConsumableLocationsTab';
import ConsumableDocumentsTab from '../components/consumables/ConsumableDocumentsTab';
import AddConsumableToOrderModal from '../components/consumables/AddConsumableToOrderModal';
import DocumentImage from '../components/DocumentImage';
import {
  Package,
  ArrowLeft,
  Edit,
  Trash2,
  AlertOctagon,
  Droplet,
  Building2,
  Info,
  MapPin,
  FileText,
  ShoppingCart
} from 'lucide-react';

// Helper: Intelligente Zahlenformatierung ohne unnötige Nullen
const formatNumber = (num) => {
  if (!num && num !== 0) return '';
  const n = parseFloat(num);
  if (isNaN(n)) return '';
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(/\.?0+$/, '');
};

export default function ConsumableDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const {
    currentConsumable,
    loading,
    error,
    fetchConsumable,
    fetchDocuments,
    deleteConsumable,
    clearCurrentConsumable,
    updateStatus
  } = useConsumablesStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(isNew);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddToOrderModal, setShowAddToOrderModal] = useState(false);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    if (!isNew) {
      fetchConsumable(id);
      loadDocuments();
    }
    return () => clearCurrentConsumable();
  }, [id, isNew]);

  const loadDocuments = async () => {
    try {
      const docs = await fetchDocuments(id);
      setDocuments(docs || []);
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteConsumable(id);
      navigate('/consumables');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveSuccess = (savedItem) => {
    if (isNew) {
      navigate(`/consumables/${savedItem.id}`);
    } else {
      setIsEditing(false);
      fetchConsumable(id);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateStatus(id, newStatus);
      fetchConsumable(id);
    } catch (err) {
      alert(err.message);
    }
  };

  const getCategoryColor = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
      green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    };
    return colors[color] || colors.gray;
  };

  if (loading && !isNew) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (!isNew && !currentConsumable) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Artikel nicht gefunden</p>
      </div>
    );
  }

  const item = currentConsumable;

  // Primary photo from documents
  const primaryPhoto = documents?.find(doc => doc.is_primary && doc.mime_type?.startsWith('image/'));

  // Tabs
  const tabs = [
    { id: 'overview', label: 'Übersicht', icon: Info },
    { id: 'locations', label: 'Lagerorte', icon: MapPin, disabled: isNew, count: item?.locations?.length },
    { id: 'documents', label: 'Dokumente', icon: FileText, disabled: isNew, count: documents?.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/consumables')}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="h-7 w-7" />
              {isNew ? 'Neuer Artikel' : item?.name}
            </h1>
            {!isNew && item && (
              <div className="flex items-center gap-3 mt-1">
                {item.article_number && (
                  <span className="text-gray-600 dark:text-gray-400">
                    Art.-Nr.: {item.article_number}
                  </span>
                )}
                {item.category_name && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(item.category_color)}`}>
                    <Droplet className="h-3 w-3" />
                    {item.category_name}
                  </span>
                )}
                {item.is_hazardous && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                    <AlertOctagon className="h-3 w-3" />
                    Gefahrstoff
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {!isNew && !isEditing && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Edit className="h-4 w-4" />
              Bearbeiten
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Löschen
            </button>
          </div>
        )}
      </div>

      {/* Quick Stats (nur bei Ansicht) */}
      {!isNew && !isEditing && item && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`rounded-lg p-4 border ${
            item.stock_status === 'reorder' 
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : item.stock_status === 'low'
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          }`}>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Bestandsstatus</div>
            <select
              value={item.stock_status || 'ok'}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`w-full text-sm font-bold rounded-lg px-3 py-2 border-0 cursor-pointer ${
                item.stock_status === 'reorder' 
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                  : item.stock_status === 'low'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                  : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
              }`}
            >
              <option value="ok">✓ OK</option>
              <option value="low">⚠ Wird knapp</option>
              <option value="reorder">! Nachbestellen</option>
            </select>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">Lagerorte</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {item.locations?.length || 0}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">Gebinde</div>
            <div className="text-lg font-medium text-gray-900 dark:text-white">
              {item.package_type ? `${item.package_type} ${formatNumber(item.package_size)} ${item.base_unit}` : item.base_unit}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">Lieferant</div>
            <div className="text-lg font-medium text-gray-900 dark:text-white">
              {item.supplier_name || '-'}
            </div>
            {item.delivery_time_days && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Lieferzeit: {item.delivery_time_days} Tage
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      {!isNew && !isEditing && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => !tab.disabled && setActiveTab(tab.id)}
                  disabled={tab.disabled}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                      : tab.disabled
                      ? 'border-transparent text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-1 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Content */}
      {(isNew || isEditing) ? (
        <ConsumableForm
          consumable={isNew ? null : item}
          onSave={handleSaveSuccess}
          onCancel={() => isNew ? navigate('/consumables') : setIsEditing(false)}
        />
      ) : (
        <>
          {activeTab === 'overview' && item && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Stammdaten */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Stammdaten</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Name</dt>
                      <dd className="text-gray-900 dark:text-white">{item.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Artikel-Nr.</dt>
                      <dd className="text-gray-900 dark:text-white">{item.article_number || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Kategorie</dt>
                      <dd className="text-gray-900 dark:text-white">{item.category_name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Basiseinheit</dt>
                      <dd className="text-gray-900 dark:text-white">{item.base_unit}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Gebindeart</dt>
                      <dd className="text-gray-900 dark:text-white">{item.package_type || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Gebindegröße</dt>
                      <dd className="text-gray-900 dark:text-white">
                        {item.package_size ? `${formatNumber(item.package_size)} ${item.base_unit}` : '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Hersteller</dt>
                      <dd className="text-gray-900 dark:text-white">{item.manufacturer || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Hersteller Art.-Nr.</dt>
                      <dd className="text-gray-900 dark:text-white">{item.manufacturer_article_number || '-'}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Beschreibung</dt>
                      <dd className="text-gray-900 dark:text-white">{item.description || '-'}</dd>
                    </div>
                  </dl>
                </div>

                {/* Lieferant & Preise */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Lieferant & Preise
                    </h3>
                    {item.supplier_id && (
                      <button
                        onClick={() => setShowAddToOrderModal(true)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Bestellen
                      </button>
                    )}
                  </div>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Lieferant</dt>
                      <dd className="text-gray-900 dark:text-white">
                        {item.supplier_id ? (
                          <Link to={`/suppliers/${item.supplier_id}`} className="text-blue-600 hover:underline">
                            {item.supplier_name}
                          </Link>
                        ) : '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Lieferanten Art.-Nr.</dt>
                      <dd className="text-gray-900 dark:text-white">{item.supplier_article_number || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Lieferzeit</dt>
                      <dd className="text-gray-900 dark:text-white">
                        {item.delivery_time_days ? `${item.delivery_time_days} Tage` : '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Preis/Einheit</dt>
                      <dd className="text-gray-900 dark:text-white">
                        {item.unit_price ? `${parseFloat(item.unit_price).toFixed(2)} €/${item.base_unit}` : '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Preis/Gebinde</dt>
                      <dd className="text-gray-900 dark:text-white">
                        {item.package_price ? `${parseFloat(item.package_price).toFixed(2)} €` : '-'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Haltbarkeit & Lagerung */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Haltbarkeit & Lagerung</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Hat MHD</dt>
                      <dd className="text-gray-900 dark:text-white">{item.has_expiry ? 'Ja' : 'Nein'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Haltbarkeit</dt>
                      <dd className="text-gray-900 dark:text-white">
                        {item.shelf_life_months ? `${item.shelf_life_months} Monate` : '-'}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Lagerhinweise</dt>
                      <dd className="text-gray-900 dark:text-white">{item.storage_requirements || '-'}</dd>
                    </div>
                  </dl>
                </div>

                {/* Gefahrstoff */}
                {item.is_hazardous && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 p-6">
                    <h3 className="text-lg font-medium text-orange-800 dark:text-orange-300 mb-4 flex items-center gap-2">
                      <AlertOctagon className="h-5 w-5" />
                      Gefahrstoff
                    </h3>
                    <dl className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <dt className="text-sm text-orange-600 dark:text-orange-400">Gefahrensymbole</dt>
                        <dd className="text-orange-800 dark:text-orange-300 font-medium">
                          {item.hazard_symbols || '-'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}

                {/* Notizen */}
                {item.notes && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Notizen</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{item.notes}</p>
                  </div>
                )}
              </div>

              {/* Right Column - Sidebar with Image */}
              <div className="space-y-6">
                {/* Product Image */}
                {primaryPhoto && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <DocumentImage 
                      endpoint="/api/consumable-documents" 
                      documentId={primaryPhoto.id} 
                      alt={item.name} 
                    />
                  </div>
                )}

                {/* Meta */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Metadaten</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Status</span>
                      <span className={`font-medium ${item.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                        {item.is_active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Erstellt</span>
                      <span className="text-gray-900 dark:text-white">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('de-DE') : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Geändert</span>
                      <span className="text-gray-900 dark:text-white">
                        {item.updated_at ? new Date(item.updated_at).toLocaleDateString('de-DE') : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'locations' && (
            <ConsumableLocationsTab consumableId={id} />
          )}

          {activeTab === 'documents' && (
            <ConsumableDocumentsTab consumableId={id} onDocumentsChange={loadDocuments} />
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Artikel löschen?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Möchtest du "{item?.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Order Modal */}
      {showAddToOrderModal && item && (
        <AddConsumableToOrderModal
          isOpen={showAddToOrderModal}
          onClose={() => setShowAddToOrderModal(false)}
          consumable={item}
        />
      )}
    </div>
  );
}
