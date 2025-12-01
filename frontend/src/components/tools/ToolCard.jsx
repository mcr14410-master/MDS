import { useState } from 'react';
import { Eye, Edit, Trash2, Circle, CheckCircle2, Wrench, Package, MapPin, AlertTriangle, Minus, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useStorageItemsStore } from '../../stores/storageItemsStore';
import { useStorageStore } from '../../stores/storageStore';
import StockMovementModal from './StockMovementModal';
import StorageItemSelectionModal from './StorageItemSelectionModal';
import { toast } from '../Toaster';

/**
 * ToolCard Component
 * Displays a single tool with all badges and information
 */
export default function ToolCard({ tool, onEdit, onDelete }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { fetchStorageItems } = useStorageItemsStore();
  const { compartments, fetchCompartments } = useStorageStore();

  // Modal state
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [movementOperation, setMovementOperation] = useState(null);
  const [selectedStorageItem, setSelectedStorageItem] = useState(null);
  const [toolStorageItems, setToolStorageItems] = useState([]);

  // Get icon for category
  const getCategoryIcon = (iconName) => {
    return <Wrench className="w-4 h-4" />;
  };

  // Get badge color for item type
  const getItemTypeBadgeColor = (itemType) => {
    switch (itemType) {
      case 'tool':
        return 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30';
      case 'insert':
        return 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30';
      case 'accessory':
        return 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30';
      default:
        return 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-500/30';
    }
  };

  // Get badge color for tool category
  const getToolCategoryBadgeColor = (toolCategory) => {
    switch (toolCategory) {
      case 'standard':
        return 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30';
      case 'special':
        return 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30';
      case 'modified':
        return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30';
      default:
        return 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-500/30';
    }
  };

  // Get icon for item type
  const getItemTypeIcon = (itemType) => {
    switch (itemType) {
      case 'tool':
        return <Wrench className="w-3 h-3" />;
      case 'insert':
        return <Package className="w-3 h-3" />;
      case 'accessory':
        return <Wrench className="w-3 h-3" />;
      default:
        return <Circle className="w-3 h-3" />;
    }
  };

  // Get stock info from tool data
  const getStockInfo = (tool) => {
    const stockNew = parseInt(tool.stock_new) || 0;
    const stockUsed = parseInt(tool.stock_used) || 0;
    const stockReground = parseInt(tool.stock_reground) || 0;
    const effectiveStock = parseFloat(tool.effective_stock) || 0;
    const totalStock = parseInt(tool.total_stock) || 0;
    const isLowStock = tool.is_low_stock || false;

    return { stockNew, stockUsed, stockReground, effectiveStock, totalStock, isLowStock };
  };

  // Quick action handlers
  const handleQuickAction = async (operation) => {
    try {
      setMovementOperation(operation);
      const result = await fetchStorageItems({ tool_master_id: tool.id });
      
      if (!result.success || !result.data || result.data.length === 0) {
        toast.error('Kein Lagerort für dieses Werkzeug gefunden. Bitte zuerst einen Lagerort anlegen.');
        return;
      }

      const storageItems = result.data;
      setToolStorageItems(storageItems);

      if (storageItems.length === 1) {
        await fetchCompartments();
        setSelectedStorageItem(storageItems[0]);
        setShowMovementModal(true);
      } else {
        setShowSelectionModal(true);
      }
    } catch (error) {
      console.error('Error fetching storage items:', error);
      toast.error('Fehler beim Laden der Lagerorte');
    }
  };

  const handleIssue = () => handleQuickAction('issue');
  const handleReceive = () => handleQuickAction('receive');

  const handleStorageItemSelect = async (storageItem) => {
    await fetchCompartments();
    setSelectedStorageItem(storageItem);
    setShowSelectionModal(false);
    setShowMovementModal(true);
  };

  const handleMovementSuccess = () => {
    setShowMovementModal(false);
    setShowSelectionModal(false);
    setMovementOperation(null);
    setSelectedStorageItem(null);
    setToolStorageItems([]);
    toast.success('Bestand erfolgreich aktualisiert');
  };

  const handleCloseModals = () => {
    setShowMovementModal(false);
    setShowSelectionModal(false);
    setMovementOperation(null);
    setSelectedStorageItem(null);
    setToolStorageItems([]);
  };

  const stockInfo = getStockInfo(tool);

  const handleView = () => {
    navigate(`/tools/${tool.id}`);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 overflow-hidden group">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{tool.article_number}</span>
              {tool.is_active ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400" />
              ) : (
                <Circle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              )}
            </div>
            <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">{tool.tool_name}</h3>
          </div>
        </div>

        {/* Badges Row 1 */}
        <div className="flex flex-wrap gap-2 mb-2">
          {tool.category_name && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 rounded">
              {getCategoryIcon(tool.category_icon)}
              {tool.category_name}
            </span>
          )}
          {tool.subcategory_name && (
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded">
              {tool.subcategory_name}
            </span>
          )}
        </div>

        {/* Badges Row 2 */}
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border rounded ${getItemTypeBadgeColor(tool.item_type)}`}>
            {getItemTypeIcon(tool.item_type)}
            {tool.item_type === 'tool' ? 'Werkzeug' : tool.item_type === 'insert' ? 'Wendeplatte' : 'Zubehör'}
          </span>
          <span className={`px-2 py-1 text-xs font-medium border rounded ${getToolCategoryBadgeColor(tool.tool_category)}`}>
            {tool.tool_category === 'standard' ? 'Standard' : tool.tool_category === 'special' ? 'Spezial' : 'Modifiziert'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-2">
        {(tool.diameter || tool.length) && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Geometrie:</span>
            <span className="text-gray-800 dark:text-gray-200">
              {tool.diameter && `⌀${tool.diameter}mm`}
              {tool.diameter && tool.length && ' × '}
              {tool.length && `L${tool.length}mm`}
            </span>
          </div>
        )}

        {tool.flutes && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Schneiden:</span>
            <span className="text-gray-800 dark:text-gray-200">Z{tool.flutes}</span>
          </div>
        )}

        {(tool.material || tool.coating) && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Material:</span>
            <span className="text-gray-800 dark:text-gray-200">
              {tool.material}
              {tool.material && tool.coating && ' / '}
              {tool.coating}
            </span>
          </div>
        )}

        {tool.manufacturer && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Hersteller:</span>
            <span className="text-gray-800 dark:text-gray-200 truncate">{tool.manufacturer}</span>
          </div>
        )}
      </div>

      {/* Storage & Stock Section */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 space-y-3">
        {/* Storage Location */}
        <div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Lagerort</div>
          {tool.storage_location ? (
            <div className="flex flex-col gap-0.5">
              {tool.storage_location.split(' - ').map((part, idx) => (
                <div key={idx} className="flex items-center gap-1 text-sm">
                  {idx === 0 ? (
                    <>
                      <MapPin className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{part}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-gray-400 dark:text-gray-600 ml-4">→</span>
                      <span className="text-gray-600 dark:text-gray-400">{part}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-600">Kein Lagerort zugewiesen</span>
          )}
        </div>

        {/* Stock Info */}
        <div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Bestand</div>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-green-600 dark:text-green-400 font-medium">{stockInfo.stockNew} neu</span>
              <span className="text-gray-400 dark:text-gray-600">|</span>
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">{stockInfo.stockUsed} gebr.</span>
              <span className="text-gray-400 dark:text-gray-600">|</span>
              <span className="text-orange-600 dark:text-orange-400 font-medium">{stockInfo.stockReground} nachg.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Effektiv: <span className="text-gray-900 dark:text-white font-semibold">{stockInfo.effectiveStock.toFixed(1)}</span>
              </span>
              {stockInfo.isLowStock && (
                <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded border border-red-200 dark:border-red-500/30">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-xs font-medium">Low Stock</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Actions */}
      <div className="px-4 py-3 bg-gray-100 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {user?.permissions?.includes('stock.issue') && (
            <button
              onClick={handleIssue}
              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded transition-colors"
              title="Entnehmen"
            >
              <Minus className="w-4 h-4" />
            </button>
          )}
          {user?.permissions?.includes('stock.receive') && (
            <button
              onClick={handleReceive}
              className="p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20 rounded transition-colors"
              title="Einlagern"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleView}
            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded transition-colors"
            title="Details anzeigen"
          >
            <Eye className="w-4 h-4" />
          </button>

          {user?.permissions?.includes('tools.edit') && (
            <button
              onClick={() => onEdit(tool)}
              className="p-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-500/20 rounded transition-colors"
              title="Bearbeiten"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}

          {user?.permissions?.includes('tools.delete') && (
            <button
              onClick={() => onDelete(tool)}
              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded transition-colors"
              title="Löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showSelectionModal && toolStorageItems.length > 0 && (
        <StorageItemSelectionModal
          tool={tool}
          storageItems={toolStorageItems}
          operation={movementOperation}
          onSelect={handleStorageItemSelect}
          onClose={handleCloseModals}
        />
      )}

      {showMovementModal && selectedStorageItem && (
        <StockMovementModal
          storageItem={selectedStorageItem}
          operation={movementOperation}
          compartments={compartments || []}
          onClose={handleCloseModals}
          onSuccess={handleMovementSuccess}
        />
      )}
    </div>
  );
}
