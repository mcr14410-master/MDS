import { useState } from 'react';
import { Eye, Edit, Trash2, ChevronDown, ChevronUp, Minus, Plus, AlertTriangle, MapPin, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useStorageItemsStore } from '../../stores/storageItemsStore';
import { useStorageStore } from '../../stores/storageStore';
import StockMovementModal from './StockMovementModal';
import StorageItemSelectionModal from './StorageItemSelectionModal';
import { toast } from '../Toaster';

/**
 * ToolsTable Component
 * Displays tools in a compact table format suitable for 100+ entries
 */
export default function ToolsTable({ tools, onEdit, onDelete }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { fetchStorageItems } = useStorageItemsStore();
  const { compartments, fetchCompartments } = useStorageStore();
  
  const [sortColumn, setSortColumn] = useState('article_number');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Modal state
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [movementOperation, setMovementOperation] = useState(null);
  const [selectedStorageItem, setSelectedStorageItem] = useState(null);
  const [currentTool, setCurrentTool] = useState(null);
  const [toolStorageItems, setToolStorageItems] = useState([]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedTools = [...tools].sort((a, b) => {
    let aVal = a[sortColumn];
    let bVal = b[sortColumn];

    // Handle null/undefined
    if (aVal == null) aVal = '';
    if (bVal == null) bVal = '';

    // String comparison
    if (typeof aVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    // Number comparison
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const SortIcon = ({ column }) => {
    if (sortColumn !== column) return <ChevronDown className="w-4 h-4 text-gray-600" />;
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-blue-400" />
      : <ChevronDown className="w-4 h-4 text-blue-400" />;
  };

  const getItemTypeBadge = (itemType) => {
    const config = {
      tool: { label: 'Werkzeug', class: 'bg-blue-500/20 text-blue-400' },
      insert: { label: 'Wendeplatte', class: 'bg-purple-500/20 text-purple-400' },
      accessory: { label: 'Zubehör', class: 'bg-green-500/20 text-green-400' },
    };
    const type = config[itemType] || config.tool;
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded ${type.class}`}>
        {type.label}
      </span>
    );
  };

  const getToolCategoryBadge = (toolCategory) => {
    const config = {
      standard: { label: 'Standard', class: 'bg-green-500/20 text-green-400' },
      special: { label: 'Spezial', class: 'bg-orange-500/20 text-orange-400' },
      modified: { label: 'Modifiziert', class: 'bg-yellow-500/20 text-yellow-400' },
    };
    const cat = config[toolCategory] || config.standard;
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded ${cat.class}`}>
        {cat.label}
      </span>
    );
  };

  // Get icon for category
  const getCategoryIcon = (iconName) => {
    // Simple mapping - in production, you could use a more sophisticated icon system
    return <Wrench className="w-3 h-3" />;
  };

  const getCategoryBadge = (categoryName, categoryIcon) => {
    if (!categoryName) return null;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded">
        {getCategoryIcon(categoryIcon)}
        {categoryName}
      </span>
    );
  };

  const getSubcategoryBadge = (subcategoryName) => {
    if (!subcategoryName) return null;
    return (
      <span className="px-2 py-0.5 text-xs font-medium bg-gray-700 text-gray-300 border border-gray-600 rounded">
        {subcategoryName}
      </span>
    );
  };

  // Get stock info from tool data (provided by tools_with_stock VIEW)
  const getStockInfo = (tool) => {
    const stockNew = parseInt(tool.stock_new) || 0;
    const stockUsed = parseInt(tool.stock_used) || 0;
    const stockReground = parseInt(tool.stock_reground) || 0;
    const effectiveStock = parseFloat(tool.effective_stock) || 0;
    const totalStock = parseInt(tool.total_stock) || 0;
    const isLowStock = tool.is_low_stock || false;

    return { stockNew, stockUsed, stockReground, effectiveStock, totalStock, isLowStock };
  };

  const handleView = (toolId) => {
    navigate(`/tools/${toolId}`);
  };

  // Quick action handlers
  const handleQuickAction = async (tool, operation) => {
    try {
      setCurrentTool(tool);
      setMovementOperation(operation);

      // Fetch storage items for this tool
      const result = await fetchStorageItems({ tool_master_id: tool.id });
      
      if (!result.success || !result.data || result.data.length === 0) {
        toast.error('Kein Lagerort für dieses Werkzeug gefunden. Bitte zuerst einen Lagerort anlegen.');
        return;
      }

      const storageItems = result.data;
      setToolStorageItems(storageItems);

      // If single storage item: open movement modal directly
      if (storageItems.length === 1) {
        // Load compartments for potential transfer
        await fetchCompartments();
        setSelectedStorageItem(storageItems[0]);
        setShowMovementModal(true);
      } else {
        // Multiple storage items: show selection modal
        setShowSelectionModal(true);
      }
    } catch (error) {
      console.error('Error fetching storage items:', error);
      toast.error('Fehler beim Laden der Lagerorte');
    }
  };

  const handleIssue = (tool) => {
    handleQuickAction(tool, 'issue');
  };

  const handleReceive = (tool) => {
    handleQuickAction(tool, 'receive');
  };

  const handleStorageItemSelect = async (storageItem) => {
    // Load compartments for potential transfer
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
    setCurrentTool(null);
    setToolStorageItems([]);
    toast.success('Bestand erfolgreich aktualisiert');
    // Note: Parent component should reload tools
  };

  const handleCloseModals = () => {
    setShowMovementModal(false);
    setShowSelectionModal(false);
    setMovementOperation(null);
    setSelectedStorageItem(null);
    setCurrentTool(null);
    setToolStorageItems([]);
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900/50 border-b border-gray-700">
            <tr>
              {/* Article Number */}
              <th 
                onClick={() => handleSort('article_number')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Art.-Nr.
                  <SortIcon column="article_number" />
                </div>
              </th>

              {/* Tool Name */}
              <th 
                onClick={() => handleSort('tool_name')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Bezeichnung
                  <SortIcon column="tool_name" />
                </div>
              </th>

              {/* Category */}
              <th 
                onClick={() => handleSort('category_name')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Kategorie
                  <SortIcon column="category_name" />
                </div>
              </th>

              {/* Type */}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Typ
              </th>

              {/* Storage Location */}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Lagerort
              </th>

              {/* Stock */}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Bestand
              </th>

              {/* Actions */}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-700">
            {sortedTools.map((tool) => {
              const stockInfo = getStockInfo(tool);
              
              return (
                <tr 
                  key={tool.id}
                  className="hover:bg-gray-700/30 transition-colors"
                >
                  {/* Article Number */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-mono font-semibold text-blue-400">
                      {tool.article_number}
                    </span>
                  </td>

                  {/* Tool Name */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-200 font-medium">{tool.tool_name}</span>
                      {tool.manufacturer && (
                        <span className="text-xs text-gray-500 mt-0.5">{tool.manufacturer}</span>
                      )}
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {getCategoryBadge(tool.category_name, tool.category_icon)}
                      {getSubcategoryBadge(tool.subcategory_name)}
                    </div>
                  </td>

                  {/* Type Badges */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {getItemTypeBadge(tool.item_type)}
                      {getToolCategoryBadge(tool.tool_category)}
                    </div>
                  </td>

                  {/* Storage Location */}
                  <td className="px-4 py-3">
                    {tool.storage_location ? (
                      <div className="flex flex-col gap-0.5">
                        {tool.storage_location.split(' - ').map((part, idx) => (
                          <div key={idx} className="flex items-center gap-1 text-xs">
                            {idx === 0 ? (
                              <>
                                <MapPin className="w-3 h-3 text-gray-500" />
                                <span className="text-gray-300 font-medium truncate max-w-[150px]" title={part}>
                                  {part}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-gray-600 ml-4">→</span>
                                <span className="text-gray-400 truncate max-w-[150px]" title={part}>
                                  {part}
                                </span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-600">-</span>
                    )}
                  </td>

                  {/* Stock Info */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {/* Stock by condition */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-400">{stockInfo.stockNew} neu</span>
                        <span className="text-gray-500">|</span>
                        <span className="text-yellow-400">{stockInfo.stockUsed} gebr.</span>
                        <span className="text-gray-500">|</span>
                        <span className="text-orange-400">{stockInfo.stockReground} nachg.</span>
                      </div>
                      {/* Effective stock */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          Effektiv: <span className="text-white font-semibold">{stockInfo.effectiveStock.toFixed(1)}</span>
                        </span>
                        {stockInfo.isLowStock && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                            <AlertTriangle className="w-3 h-3" />
                            <span className="text-xs font-medium">Low</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Quick Actions - Issue/Receive */}
                      {user?.permissions?.includes('stock.issue') && (
                        <button
                          onClick={() => handleIssue(tool)}
                          className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                          title="Entnehmen"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      )}
                      {user?.permissions?.includes('stock.receive') && (
                        <button
                          onClick={() => handleReceive(tool)}
                          className="p-1.5 text-green-400 hover:bg-green-500/20 rounded transition-colors"
                          title="Einlagern"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}

                      {/* Standard Actions */}
                      <button
                        onClick={() => handleView(tool.id)}
                        className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                        title="Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {user?.permissions?.includes('tools.edit') && (
                        <button
                          onClick={() => onEdit(tool)}
                          className="p-1.5 text-yellow-400 hover:bg-yellow-500/20 rounded transition-colors"
                          title="Bearbeiten"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}

                      {user?.permissions?.includes('tools.delete') && (
                        <button
                          onClick={() => onDelete(tool)}
                          className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                          title="Löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {tools.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-gray-500">Keine Werkzeuge gefunden</p>
        </div>
      )}

      {/* Storage Item Selection Modal */}
      {showSelectionModal && currentTool && toolStorageItems.length > 0 && (
        <StorageItemSelectionModal
          tool={currentTool}
          storageItems={toolStorageItems}
          operation={movementOperation}
          onSelect={handleStorageItemSelect}
          onClose={handleCloseModals}
        />
      )}

      {/* Stock Movement Modal */}
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
