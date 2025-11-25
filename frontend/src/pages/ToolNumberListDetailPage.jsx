/**
 * Tool Number List Detail Page
 * 
 * Detail view of a T-Number list with items and alternatives
 * Phase 5: Tool Number Lists
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  List,
  Plus,
  Save,
  Trash2,
  Edit,
  ChevronDown,
  ChevronRight,
  Wrench,
  Settings,
  Link2,
  AlertCircle,
  Loader2,
  Search,
  X,
  Filter
} from 'lucide-react';
import useToolNumberListsStore from '../stores/toolNumberListsStore';
import { useToolMasterStore } from '../stores/toolMasterStore';
import { useToolCategoriesStore } from '../stores/toolCategoriesStore';
import { useMachinesStore } from '../stores/machinesStore';

const ToolNumberListDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Stores
  const {
    currentList,
    listItems,
    loading,
    itemsLoading,
    error,
    fetchListById,
    updateList,
    createListItem,
    updateListItem,
    deleteListItem,
    fetchAlternatives,
    addAlternative,
    removeAlternative,
    assignListToMachine,
    unassignListFromMachine,
    clearCurrentList,
    clearError
  } = useToolNumberListsStore();
  
  const { tools, fetchTools } = useToolMasterStore();
  const { categories, fetchCategories } = useToolCategoriesStore();
  const { machines, fetchMachines } = useMachinesStore();
  
  // Local state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ tool_number: '', description: '', notes: '' });
  const [expandedItems, setExpandedItems] = useState({});
  const [alternatives, setAlternatives] = useState({});
  const [showToolPicker, setShowToolPicker] = useState(null); // itemId or 'preferred-{itemId}'
  const [toolSearch, setToolSearch] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [showMachineModal, setShowMachineModal] = useState(false);
  
  // Tool picker filters
  const [toolPickerFilters, setToolPickerFilters] = useState({
    category_id: '',
    item_type: '',
    manufacturer: ''
  });
  
  // Load list on mount
  useEffect(() => {
    fetchListById(id);
    // Load ALL tools for picker (including inactive) with higher limit
    fetchTools({ is_active: '' }, 500, 0); // is_active: '' = no filter
    // Load categories for filter
    fetchCategories();
    // Load machines for assignment
    fetchMachines();
    
    return () => clearCurrentList();
  }, [id]);
  
  // Update edit form when list loads
  useEffect(() => {
    if (currentList) {
      setEditForm({
        name: currentList.name || '',
        description: currentList.description || ''
      });
    }
  }, [currentList]);
  
  // Load alternatives when item is expanded
  const toggleItemExpand = async (itemId) => {
    const isExpanded = expandedItems[itemId];
    
    if (!isExpanded && !alternatives[itemId]) {
      try {
        const alts = await fetchAlternatives(itemId);
        setAlternatives(prev => ({ ...prev, [itemId]: alts }));
      } catch (err) {
        console.error('Error loading alternatives:', err);
      }
    }
    
    setExpandedItems(prev => ({ ...prev, [itemId]: !isExpanded }));
  };
  
  // Handlers
  const handleSaveList = async () => {
    try {
      await updateList(id, editForm);
      setIsEditing(false);
    } catch (err) {
      // Error handled in store
    }
  };
  
  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      await createListItem(id, newItem);
      setShowAddItem(false);
      setNewItem({ tool_number: '', description: '', notes: '' });
    } catch (err) {
      // Error handled in store
    }
  };
  
  const handleUpdateItem = async (itemId, data) => {
    try {
      await updateListItem(itemId, data);
      setEditingItem(null);
    } catch (err) {
      // Error handled in store
    }
  };
  
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('T-Nummer wirklich löschen?')) return;
    try {
      await deleteListItem(itemId);
      setExpandedItems(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    } catch (err) {
      // Error handled in store
    }
  };
  
  const handleSelectPreferredTool = async (itemId, toolMasterId) => {
    try {
      await updateListItem(itemId, { preferred_tool_master_id: toolMasterId });
      // Reload list to get updated tool info (JOINed data)
      await fetchListById(id);
      closeToolPicker();
    } catch (err) {
      // Error handled in store
    }
  };
  
  const handleAddAlternativeTool = async (itemId, toolMasterId) => {
    try {
      await addAlternative(itemId, toolMasterId);
      // Reload alternatives to get full tool data (JOINed)
      const alts = await fetchAlternatives(itemId);
      setAlternatives(prev => ({ ...prev, [itemId]: alts }));
      closeToolPicker();
    } catch (err) {
      // Error handled in store
    }
  };
  
  const handleRemoveAlternative = async (itemId, alternativeId) => {
    try {
      await removeAlternative(alternativeId);
      setAlternatives(prev => ({
        ...prev,
        [itemId]: prev[itemId].filter(a => a.id !== alternativeId)
      }));
    } catch (err) {
      // Error handled in store
    }
  };
  
  // Filter tools for picker
  const filteredTools = tools.filter(t => {
    // Text search
    const searchMatch = !toolSearch || 
      t.article_number?.toLowerCase().includes(toolSearch.toLowerCase()) ||
      t.tool_name?.toLowerCase().includes(toolSearch.toLowerCase()) ||
      t.manufacturer?.toLowerCase().includes(toolSearch.toLowerCase());
    
    // Category filter
    const categoryMatch = !toolPickerFilters.category_id || 
      t.category_id === parseInt(toolPickerFilters.category_id);
    
    // Item type filter
    const typeMatch = !toolPickerFilters.item_type || 
      t.item_type === toolPickerFilters.item_type;
    
    // Manufacturer filter
    const manufacturerMatch = !toolPickerFilters.manufacturer ||
      t.manufacturer?.toLowerCase().includes(toolPickerFilters.manufacturer.toLowerCase());
    
    return searchMatch && categoryMatch && typeMatch && manufacturerMatch;
  });
  
  // Reset picker filters when modal closes
  const closeToolPicker = () => {
    setShowToolPicker(null);
    setToolSearch('');
    setToolPickerFilters({ category_id: '', item_type: '', manufacturer: '' });
  };
  
  // Machine assignment handlers
  const handleAssignMachine = async (machineId) => {
    try {
      await assignListToMachine(machineId, parseInt(id));
      await fetchListById(id); // Reload to get updated machine list
    } catch (err) {
      console.error('Error assigning machine:', err);
    }
  };
  
  const handleUnassignMachine = async (machineId) => {
    try {
      await unassignListFromMachine(machineId, parseInt(id));
      await fetchListById(id); // Reload to get updated machine list
    } catch (err) {
      console.error('Error unassigning machine:', err);
    }
  };
  
  // Get machines not yet assigned to this list
  const availableMachines = machines.filter(m => 
    m.is_active && !currentList?.machines?.some(assigned => assigned.machine_id === m.id)
  );
  
  if (loading && !currentList) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }
  
  if (!currentList) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-400">Liste nicht gefunden</p>
          <button
            onClick={() => navigate('/tool-number-lists')}
            className="mt-4 text-blue-400 hover:text-blue-300"
          >
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/tool-number-lists')}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        {isEditing ? (
          <div className="flex-1 flex items-center gap-4">
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="text-2xl font-bold bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSaveList}
              className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg"
            >
              <Save className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="p-2 text-gray-400 hover:bg-gray-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{currentList.name}</h1>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <Edit className="w-4 h-4" />
              </button>
              {!currentList.is_active && (
                <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded">
                  Inaktiv
                </span>
              )}
            </div>
            {currentList.description && (
              <p className="text-gray-400 text-sm mt-1">{currentList.description}</p>
            )}
          </div>
        )}
        
        <button
          onClick={() => setShowAddItem(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          T-Nummer hinzufügen
        </button>
      </div>
      
      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={clearError} className="ml-auto text-sm underline">Schließen</button>
        </div>
      )}
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{listItems.length}</div>
          <div className="text-gray-400 text-sm">T-Nummern</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">
            {listItems.filter(i => i.preferred_tool_master_id).length}
          </div>
          <div className="text-gray-400 text-sm">Mit Werkzeug verknüpft</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{currentList.machines?.length || 0}</div>
          <div className="text-gray-400 text-sm">Maschinen zugeordnet</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">
            {currentList.is_active ? 'Aktiv' : 'Inaktiv'}
          </div>
          <div className="text-gray-400 text-sm">Status</div>
        </div>
      </div>
      
      {/* Items List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <List className="w-5 h-5 text-blue-400" />
            T-Nummern
          </h2>
        </div>
        
        {itemsLoading && (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin mx-auto" />
          </div>
        )}
        
        {!itemsLoading && listItems.length === 0 && (
          <div className="p-8 text-center">
            <List className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Noch keine T-Nummern in dieser Liste</p>
            <button
              onClick={() => setShowAddItem(true)}
              className="mt-3 text-blue-400 hover:text-blue-300"
            >
              Erste T-Nummer hinzufügen
            </button>
          </div>
        )}
        
        {!itemsLoading && listItems.length > 0 && (
          <div className="divide-y divide-gray-700">
            {[...listItems]
              .sort((a, b) => {
                // Natürliche Sortierung: T1, T2, T10, T100 statt T1, T10, T100, T2
                const aNum = parseInt(a.tool_number.replace(/\D/g, '')) || 0;
                const bNum = parseInt(b.tool_number.replace(/\D/g, '')) || 0;
                return aNum - bNum;
              })
              .map((item) => (
              <div key={item.id} className="group">
                {/* Item Row */}
                <div className="px-4 py-3 flex items-center gap-4">
                  <button
                    onClick={() => toggleItemExpand(item.id)}
                    className="text-gray-400 hover:text-white"
                  >
                    {expandedItems[item.id] ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>
                  
                  <div className="w-20 font-mono text-lg text-blue-400 font-bold">
                    {item.tool_number}
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-white">{item.description || '-'}</div>
                    {item.preferred_article_number && (
                      <div className="text-sm text-gray-400 flex items-center gap-1">
                        <Wrench className="w-3 h-3" />
                        {item.preferred_article_number} - {item.preferred_tool_name}
                        {item.preferred_manufacturer && ` (${item.preferred_manufacturer})`}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setShowToolPicker(`preferred-${item.id}`)}
                      className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/20 rounded-lg"
                      title="Werkzeug verknüpfen"
                    >
                      <Link2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/20 rounded-lg"
                      title="Bearbeiten"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg"
                      title="Löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Expanded: Alternatives */}
                {expandedItems[item.id] && (
                  <div className="px-4 py-3 bg-gray-900/50 border-t border-gray-700/50">
                    <div className="ml-14">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Alternative Werkzeuge:</span>
                        <button
                          onClick={() => setShowToolPicker(`alt-${item.id}`)}
                          className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" />
                          Alternative hinzufügen
                        </button>
                      </div>
                      
                      {alternatives[item.id]?.length > 0 ? (
                        <div className="space-y-2">
                          {alternatives[item.id].map((alt, idx) => (
                            <div
                              key={alt.id}
                              className="flex items-center gap-3 p-2 bg-gray-800 rounded-lg"
                            >
                              <span className="text-gray-500 text-sm w-6">{idx + 1}.</span>
                              <Wrench className="w-4 h-4 text-gray-400" />
                              <span className="text-white">
                                {alt.article_number} - {alt.tool_name}
                              </span>
                              {alt.manufacturer && (
                                <span className="text-gray-400 text-sm">({alt.manufacturer})</span>
                              )}
                              <button
                                onClick={() => handleRemoveAlternative(item.id, alt.id)}
                                className="ml-auto p-1 text-gray-400 hover:text-red-400"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">Keine Alternativen definiert</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Machines Section */}
      <div className="mt-6 bg-gray-800 rounded-lg border border-gray-700">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" />
            Zugeordnete Maschinen
            <span className="text-sm font-normal text-gray-400">
              ({currentList.machines?.length || 0})
            </span>
          </h2>
          <button
            onClick={() => setShowMachineModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Maschine zuordnen
          </button>
        </div>
        <div className="p-4">
          {currentList.machines?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {currentList.machines.map((m) => (
                <div
                  key={m.machine_id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                    m.is_active
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  <span>{m.machine_name}</span>
                  <button
                    onClick={() => handleUnassignMachine(m.machine_id)}
                    className="p-0.5 hover:bg-red-500/30 rounded-full transition-colors"
                    title="Zuordnung entfernen"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Keine Maschinen zugeordnet</p>
          )}
        </div>
      </div>
      
      {/* Machine Assignment Modal */}
      {showMachineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Maschine zuordnen</h2>
              <button
                onClick={() => setShowMachineModal(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {availableMachines.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                Alle Maschinen sind bereits zugeordnet
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {availableMachines.map((machine) => (
                  <button
                    key={machine.id}
                    onClick={() => {
                      handleAssignMachine(machine.id);
                      setShowMachineModal(false);
                    }}
                    className="w-full p-3 bg-gray-900 hover:bg-gray-700 rounded-lg text-left flex items-center gap-3 transition-colors"
                  >
                    <Settings className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-white font-medium">{machine.name}</div>
                      {machine.manufacturer && (
                        <div className="text-sm text-gray-400">
                          {machine.manufacturer} {machine.model && `- ${machine.model}`}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowMachineModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">T-Nummer hinzufügen</h2>
            <form onSubmit={handleAddItem}>
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-1">T-Nummer *</label>
                <input
                  type="text"
                  value={newItem.tool_number}
                  onChange={(e) => setNewItem({ ...newItem, tool_number: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                  placeholder="z.B. T113, T5"
                  required
                  autoFocus
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-1">Beschreibung</label>
                <input
                  type="text"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="z.B. Fräser D10 Z2"
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-400 text-sm mb-1">Notizen</label>
                <textarea
                  value={newItem.notes}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Optionale Notizen"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddItem(false);
                    setNewItem({ tool_number: '', description: '', notes: '' });
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Hinzufügen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">T-Nummer bearbeiten</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdateItem(editingItem.id, {
                tool_number: editingItem.tool_number,
                description: editingItem.description,
                notes: editingItem.notes
              });
            }}>
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-1">T-Nummer *</label>
                <input
                  type="text"
                  value={editingItem.tool_number}
                  onChange={(e) => setEditingItem({ ...editingItem, tool_number: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-1">Beschreibung</label>
                <input
                  type="text"
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-400 text-sm mb-1">Notizen</label>
                <textarea
                  value={editingItem.notes || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Tool Picker Modal */}
      {showToolPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                {showToolPicker.startsWith('preferred-') ? 'Bevorzugtes Werkzeug wählen' : 'Alternative hinzufügen'}
              </h2>
              <button
                onClick={closeToolPicker}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Filter Section */}
            <div className="bg-gray-900 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3 text-gray-400">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filter</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={toolSearch}
                    onChange={(e) => setToolSearch(e.target.value)}
                    placeholder="Suchen..."
                    className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>
                
                {/* Category */}
                <select
                  value={toolPickerFilters.category_id}
                  onChange={(e) => setToolPickerFilters(prev => ({ ...prev, category_id: e.target.value }))}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Alle Kategorien</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                
                {/* Item Type */}
                <select
                  value={toolPickerFilters.item_type}
                  onChange={(e) => setToolPickerFilters(prev => ({ ...prev, item_type: e.target.value }))}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Alle Typen</option>
                  <option value="tool">Werkzeug</option>
                  <option value="insert">Wendeplatte</option>
                  <option value="accessory">Zubehör</option>
                </select>
                
                {/* Manufacturer */}
                <input
                  type="text"
                  value={toolPickerFilters.manufacturer}
                  onChange={(e) => setToolPickerFilters(prev => ({ ...prev, manufacturer: e.target.value }))}
                  placeholder="Hersteller..."
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              
              {/* Results count */}
              <div className="mt-3 text-xs text-gray-500">
                {filteredTools.length} von {tools.length} Werkzeugen
              </div>
            </div>
            
            {/* Tools List */}
            <div className="flex-1 overflow-y-auto">
              {filteredTools.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Keine Werkzeuge gefunden</p>
              ) : (
                <div className="space-y-2">
                  {filteredTools.slice(0, 100).map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => {
                        const itemId = showToolPicker.replace('preferred-', '').replace('alt-', '');
                        if (showToolPicker.startsWith('preferred-')) {
                          handleSelectPreferredTool(parseInt(itemId), tool.id);
                        } else {
                          handleAddAlternativeTool(parseInt(itemId), tool.id);
                        }
                      }}
                      className="w-full p-3 bg-gray-900 hover:bg-gray-700 rounded-lg text-left flex items-center gap-3 transition-colors group"
                    >
                      <Wrench className="w-5 h-5 text-gray-400 group-hover:text-blue-400" />
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate">
                          {tool.article_number} - {tool.tool_name}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          {tool.manufacturer && <span>{tool.manufacturer}</span>}
                          {tool.category_name && (
                            <>
                              {tool.manufacturer && <span>•</span>}
                              <span>{tool.category_name}</span>
                            </>
                          )}
                          {tool.item_type && (
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              tool.item_type === 'tool' ? 'bg-blue-500/20 text-blue-400' :
                              tool.item_type === 'insert' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {tool.item_type === 'tool' ? 'Werkzeug' :
                               tool.item_type === 'insert' ? 'Wendeplatte' : 'Zubehör'}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                  {filteredTools.length > 100 && (
                    <p className="text-center text-gray-500 text-sm py-2">
                      +{filteredTools.length - 100} weitere - Filter verwenden
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolNumberListDetailPage;
