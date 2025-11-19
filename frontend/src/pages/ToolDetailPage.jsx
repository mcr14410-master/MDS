import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, CheckCircle2, Circle, Wrench, Package, Loader2, Plus, Minus, MoveHorizontal, Edit3, XCircle, Upload, FileText, QrCode } from 'lucide-react';
import { useToolMasterStore } from '../stores/toolMasterStore';
import { useStorageItemsStore } from '../stores/storageItemsStore';
import { useStorageStore } from '../stores/storageStore';
import { useToolDocumentsStore } from '../stores/toolDocumentsStore';
import { useToolCompatibleInsertsStore } from '../stores/toolCompatibleInsertsStore';
import { useAuthStore } from '../stores/authStore';
import ToolForm from '../components/tools/ToolForm';
import StockByConditionDisplay from '../components/tools/StockByConditionDisplay';
import StockMovementModal from '../components/tools/StockMovementModal';
import StockMovementsHistory from '../components/tools/StockMovementsHistory';
import DocumentUploadModal from '../components/tools/DocumentUploadModal';
import ToolDocumentsManager from '../components/tools/ToolDocumentsManager';
import CompatibleInsertsList from '../components/tools/CompatibleInsertsList';
import AddCompatibleInsertModal from '../components/tools/AddCompatibleInsertModal';
import CreateStorageItemModal from '../components/tools/CreateStorageItemModal';
import EditStorageItemModal from '../components/tools/EditStorageItemModal';
import CustomFieldsDisplay from '../components/tools/CustomFieldsDisplay';
import QRCodeDisplay from '../components/tools/QRCodeDisplay';
import ToolSuppliersTab from '../components/tools/ToolSuppliersTab';

export default function ToolDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentTool, loading, error, fetchToolById, updateTool, deleteTool } = useToolMasterStore();
  const { storageItems, fetchStorageItems } = useStorageItemsStore();
  const { compartments, fetchCompartments } = useStorageStore();
  const { documents, fetchDocuments } = useToolDocumentsStore();
  const { compatibleInserts, fetchCompatibleInserts } = useToolCompatibleInsertsStore();
  const [showEditForm, setShowEditForm] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementOperation, setMovementOperation] = useState(null);
  const [selectedStorageItem, setSelectedStorageItem] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddInsertModal, setShowAddInsertModal] = useState(false);
  const [showCreateStorageItemModal, setShowCreateStorageItemModal] = useState(false);
  const [showEditStorageItemModal, setShowEditStorageItemModal] = useState(false);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);

  useEffect(() => {
    fetchToolById(id);
    fetchStorageItems({ tool_master_id: id });
    fetchCompartments(); // Load all compartments for transfer operation
    fetchDocuments(id);
    fetchCompatibleInserts(id);
  }, [id]);

  const handleEdit = () => {
    setShowEditForm(true);
  };

  const handleDelete = async () => {
    if (window.confirm(`Werkzeug "${currentTool.tool_name}" wirklich löschen?`)) {
      const result = await deleteTool(currentTool.id);
      if (result.success) {
        navigate('/tools');
      }
    }
  };

  const handleSave = async (toolData) => {
    const result = await updateTool(currentTool.id, toolData);
    if (result.success) {
      setShowEditForm(false);
      fetchToolById(id); // Reload data
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (error || !currentTool) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-md">
            {error || 'Werkzeug nicht gefunden'}
          </div>
          <button
            onClick={() => navigate('/tools')}
            className="mt-4 flex items-center gap-2 text-blue-400 hover:text-blue-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  const getItemTypeIcon = (itemType) => {
    switch (itemType) {
      case 'tool':
        return <Wrench className="w-5 h-5" />;
      case 'insert':
        return <Package className="w-5 h-5" />;
      case 'accessory':
        return <Wrench className="w-5 h-5" />;
      default:
        return <Circle className="w-5 h-5" />;
    }
  };

  const getItemTypeBadgeColor = (itemType) => {
    switch (itemType) {
      case 'tool':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'insert':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'accessory':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getToolCategoryBadgeColor = (toolCategory) => {
    switch (toolCategory) {
      case 'standard':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'special':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'modified':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const handleStockOperation = (operation, storageItem) => {
    setMovementOperation(operation);
    setSelectedStorageItem(storageItem);
    setShowMovementModal(true);
  };

  const handleMovementSuccess = (result) => {
    setShowMovementModal(false);
    setMovementOperation(null);
    setSelectedStorageItem(null);
    // Reload storage items
    fetchStorageItems({ tool_master_id: id });
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/tools')}
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Übersicht
        </button>

        {/* Header */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl font-bold text-blue-400">{currentTool.tool_number}</span>
                {currentTool.is_active ? (
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-500" />
                )}
              </div>
              <h1 className="text-2xl font-bold text-white mb-4">{currentTool.tool_name}</h1>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {currentTool.category_name && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded">
                    <Wrench className="w-4 h-4" />
                    {currentTool.category_name}
                  </span>
                )}
                {currentTool.subcategory_name && (
                  <span className="px-3 py-1 text-sm font-medium bg-gray-700 text-gray-300 border border-gray-600 rounded">
                    {currentTool.subcategory_name}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium border rounded ${getItemTypeBadgeColor(currentTool.item_type)}`}>
                  {getItemTypeIcon(currentTool.item_type)}
                  {currentTool.item_type === 'tool' ? 'Werkzeug' : currentTool.item_type === 'insert' ? 'Wendeplatte' : 'Zubehör'}
                </span>
                <span className={`px-3 py-1 text-sm font-medium border rounded ${getToolCategoryBadgeColor(currentTool.tool_category)}`}>
                  {currentTool.tool_category === 'standard' ? 'Standard' : currentTool.tool_category === 'special' ? 'Spezial' : 'Modifiziert'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {user?.permissions?.includes('tools.edit') && (
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Bearbeiten
                </button>
              )}
              {user?.permissions?.includes('tools.delete') && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Löschen
                </button>
              )}
              {storageItems.length > 0 && (
                <button
                  onClick={() => setShowQRCodeModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
                  title="QR-Code anzeigen"
                >
                  <QrCode className="w-4 h-4" />
                  QR-Code
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-6">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('storage')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'storage'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Lagerbestand
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'documents'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Dokumente
            </button>
            {currentTool?.uses_inserts && (
              <button
                onClick={() => setActiveTab('inserts')}
                className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === 'inserts'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Wendeschneidplatten
              </button>
            )}
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'suppliers'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Lieferanten
            </button>
          </nav>
        </div>

        {/* Tab Content: Details */}
        {activeTab === 'details' && (
          <>
        {/* Details Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Geometrie */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">Geometrie</h2>
            <div className="space-y-3">
              {currentTool.diameter && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Durchmesser:</span>
                  <span className="text-white font-medium">⌀{currentTool.diameter} mm</span>
                </div>
              )}
              {currentTool.length && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Länge:</span>
                  <span className="text-white font-medium">{currentTool.length} mm</span>
                </div>
              )}
              {currentTool.flutes && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Schneiden:</span>
                  <span className="text-white font-medium">Z{currentTool.flutes}</span>
                </div>
              )}
              {!currentTool.diameter && !currentTool.length && !currentTool.flutes && (
                <p className="text-gray-500 text-sm">Keine Geometriedaten vorhanden</p>
              )}
            </div>
          </div>

          {/* Material & Beschichtung */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">Material & Beschichtung</h2>
            <div className="space-y-3">
              {currentTool.material && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Material:</span>
                  <span className="text-white font-medium">{currentTool.material}</span>
                </div>
              )}
              {currentTool.coating && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Beschichtung:</span>
                  <span className="text-white font-medium">{currentTool.coating}</span>
                </div>
              )}
              {currentTool.substrate_grade && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Substrat-Sorte:</span>
                  <span className="text-white font-medium">{currentTool.substrate_grade}</span>
                </div>
              )}
              {currentTool.hardness && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Härte:</span>
                  <span className="text-white font-medium">{currentTool.hardness}</span>
                </div>
              )}
              {!currentTool.material && !currentTool.coating && !currentTool.substrate_grade && !currentTool.hardness && (
                <p className="text-gray-500 text-sm">Keine Materialdaten vorhanden</p>
              )}
            </div>
          </div>

          {/* Hersteller */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">Hersteller</h2>
            <div className="space-y-3">
              {currentTool.manufacturer && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Hersteller:</span>
                  <span className="text-white font-medium">{currentTool.manufacturer}</span>
                </div>
              )}
              {currentTool.manufacturer_part_number && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Artikelnummer:</span>
                  <span className="text-white font-medium">{currentTool.manufacturer_part_number}</span>
                </div>
              )}
              {currentTool.shop_url && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Shop-URL:</span>
                  <a
                    href={currentTool.shop_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 font-medium truncate max-w-xs"
                  >
                    Link öffnen
                  </a>
                </div>
              )}
              {!currentTool.manufacturer && !currentTool.manufacturer_part_number && !currentTool.shop_url && (
                <p className="text-gray-500 text-sm">Keine Herstellerdaten vorhanden</p>
              )}
            </div>
          </div>

          {/* Kosten & Sonstiges */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">Kosten & Sonstiges</h2>
            <div className="space-y-3">
              {currentTool.cost && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Preis:</span>
                  <span className="text-green-400 font-semibold">€{Number(currentTool.cost).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Verwendet Wendeplatten:</span>
                <span className="text-white font-medium">{currentTool.uses_inserts ? 'Ja' : 'Nein'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className={`font-medium ${currentTool.is_active ? 'text-green-400' : 'text-gray-500'}`}>
                  {currentTool.is_active ? 'Aktiv' : 'Inaktiv'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Fields Display */}
        <CustomFieldsDisplay
          categoryId={currentTool.category_id}
          customFields={currentTool.custom_fields}
        />

        {/* Notes */}
        {currentTool.notes && (
          <div className="bg-gray-800 rounded-lg p-6 mt-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-3">Notizen</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{currentTool.notes}</p>
          </div>
        )}

        {/* Metadata */}
        <div className="bg-gray-800 rounded-lg p-6 mt-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-3">Metadaten</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {currentTool.created_by_username && (
              <div className="flex justify-between">
                <span className="text-gray-400">Erstellt von:</span>
                <span className="text-gray-300">{currentTool.created_by_username}</span>
              </div>
            )}
            {currentTool.created_at && (
              <div className="flex justify-between">
                <span className="text-gray-400">Erstellt am:</span>
                <span className="text-gray-300">
                  {new Date(currentTool.created_at).toLocaleString('de-DE')}
                </span>
              </div>
            )}
            {currentTool.updated_at && (
              <div className="flex justify-between">
                <span className="text-gray-400">Aktualisiert am:</span>
                <span className="text-gray-300">
                  {new Date(currentTool.updated_at).toLocaleString('de-DE')}
                </span>
              </div>
            )}
          </div>
        </div>

          </>
        )}

        {/* Tab Content: Storage */}
        {activeTab === 'storage' && (
          <div className="space-y-6">
            {storageItems && storageItems.length > 0 ? (
              storageItems.map(item => (
                <div key={item.id} className="space-y-4">
                  {/* Location Info */}
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-white text-lg">
                          {item.location_name} / {item.compartment_name}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">Storage Item ID: {item.id}</p>
                      </div>
                    </div>
                  </div>

                  {/* Stock Display */}
                  <StockByConditionDisplay storageItem={item} />

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {user?.permissions?.includes('storage.edit') && (
                      <button
                        onClick={() => {
                          setSelectedStorageItem(item);
                          setShowEditStorageItemModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors border border-gray-600"
                      >
                        <Edit className="w-4 h-4" />
                        Bearbeiten
                      </button>
                    )}
                    {user?.permissions?.includes('stock.issue') && (
                      <button
                        onClick={() => handleStockOperation('issue', item)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                        Entnehmen
                      </button>
                    )}
                    {user?.permissions?.includes('stock.receive') && (
                      <button
                        onClick={() => handleStockOperation('receive', item)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Einlagern
                      </button>
                    )}
                    {user?.permissions?.includes('stock.transfer') && (
                      <button
                        onClick={() => handleStockOperation('transfer', item)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                      >
                        <MoveHorizontal className="w-4 h-4" />
                        Umlagern
                      </button>
                    )}
                    {user?.permissions?.includes('stock.adjust') && (
                      <button
                        onClick={() => handleStockOperation('adjust', item)}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                        Korrigieren
                      </button>
                    )}
                    {user?.permissions?.includes('stock.scrap') && (
                      <button
                        onClick={() => handleStockOperation('scrap', item)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Verschrotten
                      </button>
                    )}
                  </div>

                  {/* Movements History */}
                  <StockMovementsHistory storageItemId={item.id} />
                </div>
              ))
            ) : (
              <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
                <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">Keine Lagerartikel für dieses Werkzeug vorhanden</p>
                {user?.permissions?.includes('storage.create') && (
                  <button
                    onClick={() => setShowCreateStorageItemModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Lagerartikel anlegen
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Documents */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            {/* Upload Button */}
            {user?.permissions?.includes('tools.documents.upload') && (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Dokument hochladen
                </button>
              </div>
            )}

            {/* Documents Manager with Sub-Tabs */}
            <ToolDocumentsManager
              documents={documents}
              onDelete={() => fetchDocuments(id)}
              onSetPrimary={() => fetchDocuments(id)}
            />
          </div>
        )}

        {/* Tab Content: Compatible Inserts */}
        {activeTab === 'inserts' && currentTool?.uses_inserts && (
          <div className="space-y-6">
            {/* Add Insert Button */}
            {user?.permissions?.includes('tools.edit') && (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowAddInsertModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Wendeschneidplatte hinzufügen
                </button>
              </div>
            )}

            {/* Compatible Inserts List */}
            <CompatibleInsertsList
              inserts={compatibleInserts}
              onDelete={() => fetchCompatibleInserts(id)}
            />
          </div>
        )}

        {/* Tab Content: Suppliers (Placeholder - Phase 3) */}
        {activeTab === 'suppliers' && (
          <>
            {storageItems && storageItems.length > 0 ? (
              <>
                {storageItems.length === 1 ? (
                  // Single storage item - show directly
                  <ToolSuppliersTab storageItemId={storageItems[0].id} />
                ) : (
                  // Multiple storage items - show selection or tabs
                  <div className="space-y-6">
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <p className="text-sm text-gray-400 mb-3">
                        Dieses Werkzeug ist an mehreren Lagerorten vorhanden. Lieferanten werden pro Lagerort verwaltet.
                      </p>
                      <div className="text-xs text-gray-500">
                        Zeige Lieferanten für: {storageItems[0].location_name} / {storageItems[0].compartment_name}
                      </div>
                    </div>
                    <ToolSuppliersTab storageItemId={storageItems[0].id} />
                  </div>
                )}
              </>
            ) : (
              // No storage items yet
              <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
                <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Kein Lagerort zugewiesen</h3>
                <p className="text-gray-400 mb-6">
                  Bitte erstellen Sie zuerst einen Lagereintrag für dieses Werkzeug im Tab "Lagerorte".
                </p>
                <button
                  onClick={() => setActiveTab('storage')}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Zu Lagerorte wechseln
                </button>
              </div>
            )}
          </>
        )}

        {/* Edit Form Modal */}
        {showEditForm && (
          <ToolForm
            tool={currentTool}
            onSave={handleSave}
            onCancel={() => setShowEditForm(false)}
            loading={loading}
          />
        )}

        {/* Stock Movement Modal */}
        {showMovementModal && selectedStorageItem && (
          <StockMovementModal
            storageItem={selectedStorageItem}
            operation={movementOperation}
            compartments={compartments || []}
            onClose={() => {
              setShowMovementModal(false);
              setMovementOperation(null);
              setSelectedStorageItem(null);
            }}
            onSuccess={handleMovementSuccess}
          />
        )}

        {/* Document Upload Modal */}
        {showUploadModal && (
          <DocumentUploadModal
            toolId={id}
            onClose={() => setShowUploadModal(false)}
            onSuccess={() => {
              setShowUploadModal(false);
              fetchDocuments(id);
            }}
          />
        )}

        {/* Add Compatible Insert Modal */}
        {showAddInsertModal && (
          <AddCompatibleInsertModal
            toolId={id}
            onClose={() => setShowAddInsertModal(false)}
            onSuccess={() => {
              setShowAddInsertModal(false);
              fetchCompatibleInserts(id);
            }}
          />
        )}

        {/* Create Storage Item Modal */}
        {showCreateStorageItemModal && (
          <CreateStorageItemModal
            toolMasterId={id}
            toolName={currentTool.tool_name}
            onClose={() => setShowCreateStorageItemModal(false)}
            onSuccess={() => {
              setShowCreateStorageItemModal(false);
              fetchStorageItems({ tool_master_id: id });
            }}
          />
        )}

        {/* Edit Storage Item Modal */}
        {showEditStorageItemModal && selectedStorageItem && (
          <EditStorageItemModal
            storageItem={selectedStorageItem}
            onClose={() => {
              setShowEditStorageItemModal(false);
              setSelectedStorageItem(null);
            }}
            onSuccess={() => {
              setShowEditStorageItemModal(false);
              setSelectedStorageItem(null);
              fetchStorageItems({ tool_master_id: id });
            }}
          />
        )}

        {/* QR-Code Modal */}
        {showQRCodeModal && (
          <QRCodeDisplay
            storageItem={storageItems[0]} // First storage item for this tool
            onClose={() => setShowQRCodeModal(false)}
          />
        )}
      </div>
    </div>
  );
}
