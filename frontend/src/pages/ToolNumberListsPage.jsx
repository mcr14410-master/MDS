/**
 * Tool Number Lists Page
 * 
 * Overview of all T-Number lists for NC programs
 * Phase 5: Tool Number Lists
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  List,
  Plus,
  Search,
  Copy,
  Trash2,
  Edit,
  ChevronRight,
  Settings,
  AlertCircle,
  Loader2,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import useToolNumberListsStore from '../stores/toolNumberListsStore';

const ToolNumberListsPage = () => {
  const navigate = useNavigate();
  
  // Store
  const {
    lists,
    loading,
    error,
    fetchLists,
    createList,
    updateList,
    deleteList,
    duplicateList,
    clearError
  } = useToolNumberListsStore();
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [duplicateName, setDuplicateName] = useState('');
  
  // Load lists on mount
  useEffect(() => {
    fetchLists(showInactive, searchTerm);
  }, [showInactive]);
  
  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLists(showInactive, searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Handlers
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const newList = await createList(formData);
      setShowCreateModal(false);
      setFormData({ name: '', description: '' });
      navigate(`/tool-number-lists/${newList.id}`);
    } catch (err) {
      // Error handled in store
    }
  };
  
  const handleDuplicate = async (e) => {
    e.preventDefault();
    if (!selectedList) return;
    try {
      const newList = await duplicateList(selectedList.id, duplicateName);
      setShowDuplicateModal(false);
      setDuplicateName('');
      setSelectedList(null);
      navigate(`/tool-number-lists/${newList.id}`);
    } catch (err) {
      // Error handled in store
    }
  };
  
  const handleDelete = async () => {
    if (!selectedList) return;
    try {
      await deleteList(selectedList.id);
      setShowDeleteModal(false);
      setSelectedList(null);
    } catch (err) {
      // Error handled in store
    }
  };
  
  const handleToggleActive = async (list) => {
    try {
      await updateList(list.id, { is_active: !list.is_active });
    } catch (err) {
      // Error handled in store
    }
  };
  
  const openDuplicateModal = (list) => {
    setSelectedList(list);
    setDuplicateName(`${list.name} (Kopie)`);
    setShowDuplicateModal(true);
  };
  
  const openDeleteModal = (list) => {
    setSelectedList(list);
    setShowDeleteModal(true);
  };
  
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <List className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Werkzeugnummern-Listen</h1>
            <p className="text-gray-400 text-sm">T-Nummern aus NC-Programmen verwalten</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Neue Liste
        </button>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={clearError} className="ml-auto text-sm underline">Schließen</button>
        </div>
      )}
      
      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Listen suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>
        
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            showInactive ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >
          {showInactive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          Inaktive anzeigen
        </button>
      </div>
      
      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      )}
      
      {/* Lists Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list) => (
            <div
              key={list.id}
              className={`bg-gray-800 rounded-lg border ${
                list.is_active ? 'border-gray-700' : 'border-gray-700/50 opacity-60'
              } hover:border-gray-600 transition-colors`}
            >
              {/* Card Header */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => navigate(`/tool-number-lists/${list.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      {list.name}
                      {!list.is_active && (
                        <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded">
                          Inaktiv
                        </span>
                      )}
                    </h3>
                    {list.description && (
                      <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                        {list.description}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
                
                {/* Stats */}
                <div className="flex items-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-1 text-gray-400">
                    <List className="w-4 h-4" />
                    <span>{list.item_count || 0} T-Nummern</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <Settings className="w-4 h-4" />
                    <span>{list.machine_count || 0} Maschinen</span>
                  </div>
                </div>
              </div>
              
              {/* Card Actions */}
              <div className="px-4 py-3 border-t border-gray-700 flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleActive(list);
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    list.is_active
                      ? 'text-green-400 hover:bg-green-500/20'
                      : 'text-gray-400 hover:bg-gray-700'
                  }`}
                  title={list.is_active ? 'Deaktivieren' : 'Aktivieren'}
                >
                  {list.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/tool-number-lists/${list.id}`);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                  title="Bearbeiten"
                >
                  <Edit className="w-5 h-5" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openDuplicateModal(list);
                  }}
                  className="p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-500/20 rounded-lg transition-colors"
                  title="Duplizieren"
                >
                  <Copy className="w-5 h-5" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openDeleteModal(list);
                  }}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors ml-auto"
                  title="Löschen"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
          
          {/* Empty State */}
          {lists.length === 0 && (
            <div className="col-span-full text-center py-12">
              <List className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                {searchTerm
                  ? 'Keine Listen gefunden'
                  : 'Noch keine Listen vorhanden'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 text-blue-400 hover:text-blue-300"
                >
                  Erste Liste erstellen
                </button>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Neue Liste erstellen</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="z.B. Standard-Fräsen"
                  required
                  autoFocus
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-400 text-sm mb-1">Beschreibung</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Optionale Beschreibung"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ name: '', description: '' });
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Duplicate Modal */}
      {showDuplicateModal && selectedList && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Liste duplizieren</h2>
            <p className="text-gray-400 mb-4">
              Erstelle eine Kopie von "{selectedList.name}" mit allen T-Nummern und Alternativen.
            </p>
            <form onSubmit={handleDuplicate}>
              <div className="mb-6">
                <label className="block text-gray-400 text-sm mb-1">Name der Kopie *</label>
                <input
                  type="text"
                  value={duplicateName}
                  onChange={(e) => setDuplicateName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDuplicateModal(false);
                    setSelectedList(null);
                    setDuplicateName('');
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Duplizieren
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedList && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Liste löschen?</h2>
            <p className="text-gray-400 mb-2">
              Möchtest du die Liste "{selectedList.name}" wirklich löschen?
            </p>
            <p className="text-red-400 text-sm mb-6">
              Alle T-Nummern und Alternativen werden ebenfalls gelöscht.
              Maschinen-Zuordnungen werden entfernt.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedList(null);
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolNumberListsPage;
