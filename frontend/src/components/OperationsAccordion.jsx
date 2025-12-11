// frontend/src/components/OperationsAccordion.jsx
/**
 * Accordion-basierte Darstellung aller Arbeitsgänge eines Bauteils
 * Ersetzt die Card-Grid + separate Detail-Seite Lösung
 * 
 * Features:
 * - Drag & Drop Sortierung
 * - Alle auf-/zuklappen
 * - Animierte Übergänge
 */

import { useEffect, useState } from 'react';
import { useOperationsStore } from '../stores/operationsStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from './Toaster';
import OperationForm from './OperationForm';
import ProgramsList from './ProgramsList';
import ToolListsOverview from './ToolListsOverview';
import SetupSheetsList from './SetupSheetsList';
import InspectionPlanTab from './InspectionPlanTab';

export default function OperationsAccordion({ partId }) {
  const { operations, loading, error, fetchOperations, deleteOperation, updateOperation } = useOperationsStore();
  const { hasPermission } = useAuthStore();
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingOperation, setEditingOperation] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  useEffect(() => {
    if (partId) {
      fetchOperations(partId);
    }
  }, [partId, fetchOperations]);

  // Sortierte Operationen
  const sortedOperations = [...operations].sort((a, b) => a.sequence - b.sequence);

  // Hilfsfunktion: Ersten verfügbaren Tab für eine Operation ermitteln
  const getFirstAvailableTab = (operation) => {
    const enabledFeatures = operation.enabled_features || ['programs', 'tools', 'setup_sheet', 'inspection'];
    const tabOrder = ['programs', 'tools', 'setup_sheet', 'inspection', 'work_instruction', 'checklist', 'documents', 'measuring_equipment'];
    // Feature-ID zu Tab-ID Mapping (setup_sheet -> setup)
    const featureToTab = {
      'programs': 'programs',
      'tools': 'tools', 
      'setup_sheet': 'setup',
      'inspection': 'inspection',
      'work_instruction': 'work_instruction',
      'checklist': 'checklist',
      'documents': 'documents',
      'measuring_equipment': 'measuring_equipment'
    };
    
    for (const feature of tabOrder) {
      if (enabledFeatures.includes(feature)) {
        return featureToTab[feature];
      }
    }
    return 'programs'; // Fallback
  };

  // Accordion toggle (einzeln)
  const handleToggle = (operationId) => {
    const operation = sortedOperations.find(op => op.id === operationId);
    
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(operationId)) {
        next.delete(operationId);
      } else {
        next.add(operationId);
        // Default Tab setzen wenn noch nicht gesetzt - basierend auf enabled_features
        if (!activeTab[operationId] && operation) {
          const firstTab = getFirstAvailableTab(operation);
          setActiveTab(prevTabs => ({ ...prevTabs, [operationId]: firstTab }));
        }
      }
      return next;
    });
  };

  // Alle aufklappen
  const handleExpandAll = () => {
    const allIds = new Set(sortedOperations.map(op => op.id));
    setExpandedIds(allIds);
    // Default Tabs setzen - basierend auf enabled_features jeder Operation
    const newTabs = {};
    sortedOperations.forEach(op => {
      if (!activeTab[op.id]) {
        newTabs[op.id] = getFirstAvailableTab(op);
      }
    });
    if (Object.keys(newTabs).length > 0) {
      setActiveTab(prev => ({ ...prev, ...newTabs }));
    }
  };

  // Alle zuklappen
  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  // Tab wechseln
  const handleTabChange = (operationId, tab) => {
    setActiveTab(prev => ({ ...prev, [operationId]: tab }));
  };

  // Drag & Drop Handlers
  const handleDragStart = (e, operationId) => {
    setDraggedId(operationId);
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragOver = (e, operationId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (operationId !== draggedId) {
      setDragOverId(operationId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (e, targetId) => {
    e.preventDefault();
    setDragOverId(null);

    if (!draggedId || draggedId === targetId) return;

    // Neue Reihenfolge berechnen
    const draggedOp = sortedOperations.find(op => op.id === draggedId);
    const targetOp = sortedOperations.find(op => op.id === targetId);

    if (!draggedOp || !targetOp) return;

    const draggedIndex = sortedOperations.findIndex(op => op.id === draggedId);
    const targetIndex = sortedOperations.findIndex(op => op.id === targetId);

    // Neue Sequence-Werte berechnen
    const newOperations = [...sortedOperations];
    newOperations.splice(draggedIndex, 1);
    newOperations.splice(targetIndex, 0, draggedOp);

    // Sequences aktualisieren
    try {
      for (let i = 0; i < newOperations.length; i++) {
        const op = newOperations[i];
        const newSequence = (i + 1) * 10; // 10, 20, 30, ...
        if (op.sequence !== newSequence) {
          await updateOperation(op.id, { sequence: newSequence });
        }
      }
      toast.success('Reihenfolge aktualisiert');
      fetchOperations(partId);
    } catch (err) {
      toast.error('Fehler beim Aktualisieren der Reihenfolge');
    }
  };

  // Edit
  const handleEdit = (e, operation) => {
    e.stopPropagation();
    setEditingOperation(operation);
    setShowForm(true);
  };

  // Delete
  const handleDelete = async (e, operation) => {
    e.stopPropagation();
    if (!window.confirm(`Arbeitsgang ${operation.op_number} wirklich löschen?`)) {
      return;
    }
    try {
      await deleteOperation(operation.id);
      toast.success('Arbeitsgang erfolgreich gelöscht');
      setExpandedIds(prev => {
        const next = new Set(prev);
        next.delete(operation.id);
        return next;
      });
    } catch (err) {
      toast.error(err.message || 'Fehler beim Löschen');
    }
  };

  // Form handlers
  const handleFormClose = () => {
    setShowForm(false);
    setEditingOperation(null);
  };

  const handleFormSuccess = () => {
    fetchOperations(partId);
    handleFormClose();
  };

  // Zeit-Formatierung
  const formatSetupTime = (minutes) => {
    if (!minutes) return '–';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatCycleTime = (seconds) => {
    if (!seconds) return '–';
    const minutes = seconds / 60;
    if (minutes < 1) return `${seconds}s`;
    if (minutes < 60) return `${minutes.toFixed(1)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Loading
  if (loading && operations.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Lade Arbeitsgänge...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Arbeitsgänge</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {sortedOperations.length} {sortedOperations.length === 1 ? 'Arbeitsgang' : 'Arbeitsgänge'}
            {sortedOperations.length > 0 && (
              <span className="text-gray-400 dark:text-gray-500"> · {expandedIds.size} geöffnet</span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Expand/Collapse All Buttons */}
          {sortedOperations.length > 1 && (
            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={handleExpandAll}
                disabled={expandedIds.size === sortedOperations.length}
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                title="Alle aufklappen"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <span className="hidden sm:inline">Alle öffnen</span>
              </button>
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-700"></div>
              <button
                onClick={handleCollapseAll}
                disabled={expandedIds.size === 0}
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                title="Alle zuklappen"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
                <span className="hidden sm:inline">Alle schließen</span>
              </button>
            </div>
          )}

          {/* Add Button */}
          {hasPermission('part.update') && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Arbeitsgang hinzufügen</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {sortedOperations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Noch keine Arbeitsgänge
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Füge den ersten Arbeitsgang für dieses Bauteil hinzu.
          </p>
          {hasPermission('part.update') && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ersten Arbeitsgang hinzufügen
            </button>
          )}
        </div>
      ) : (
        /* Accordion List */
        <div className="space-y-3">
          {sortedOperations.map((operation) => {
            const isExpanded = expandedIds.has(operation.id);
            const currentTab = activeTab[operation.id] || 'programs';
            const isDragging = draggedId === operation.id;
            const isDragOver = dragOverId === operation.id;

            return (
              <div
                key={operation.id}
                draggable={hasPermission('part.update')}
                onDragStart={(e) => handleDragStart(e, operation.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, operation.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, operation.id)}
                className={`bg-white dark:bg-gray-800 border rounded-lg overflow-hidden transition-all duration-200 ${
                  isDragOver 
                    ? 'border-blue-500 border-2 shadow-lg scale-[1.01]' 
                    : isDragging
                    ? 'border-gray-300 dark:border-gray-600 opacity-50'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Accordion Header */}
                <div
                  onClick={() => handleToggle(operation.id)}
                  className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                    isExpanded 
                      ? 'bg-blue-50 dark:bg-blue-900/20' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  {/* Left: Drag Handle + OP Number + Name + Machine */}
                  <div className="flex items-center gap-3">
                    {/* Drag Handle */}
                    {hasPermission('part.update') && (
                      <div 
                        className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Ziehen zum Sortieren"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                      </div>
                    )}

                    {/* Chevron */}
                    <svg 
                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>

                    {/* OP Number Badge */}
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400 min-w-[60px]">
                      {operation.op_number}
                    </span>

                    {/* Name + Machine + Type Badge */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                          {operation.op_name}
                        </h3>
                        {operation.operation_type_name && (
                          <span className={`hidden sm:inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            operation.operation_type_color === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                            operation.operation_type_color === 'indigo' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' :
                            operation.operation_type_color === 'purple' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                            operation.operation_type_color === 'amber' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                            operation.operation_type_color === 'orange' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                            operation.operation_type_color === 'cyan' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' :
                            operation.operation_type_color === 'green' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                            operation.operation_type_color === 'pink' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' :
                            operation.operation_type_color === 'teal' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {operation.operation_type_name}
                          </span>
                        )}
                      </div>
                      {operation.machine_name && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                          </svg>
                          {operation.machine_name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Times + Actions */}
                  <div className="flex items-center gap-6">
                    {/* Times */}
                    <div className="hidden sm:flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Rüstzeit</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatSetupTime(operation.setup_time_minutes)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Zykluszeit</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCycleTime(operation.cycle_time_seconds)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    {hasPermission('part.update') && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleEdit(e, operation)}
                          className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="Bearbeiten"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        {hasPermission('part.delete') && (
                          <button
                            onClick={(e) => handleDelete(e, operation)}
                            className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Löschen"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Accordion Content - mit Animation */}
                <div 
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    {/* Description */}
                    {operation.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                        {operation.description}
                      </p>
                    )}

                    {/* Mobile Times */}
                    <div className="sm:hidden grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Rüstzeit</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatSetupTime(operation.setup_time_minutes)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Zykluszeit</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCycleTime(operation.cycle_time_seconds)}
                        </p>
                      </div>
                    </div>

                    {/* Inner Tabs - dynamisch basierend auf enabled_features */}
                    <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                      <nav className="flex gap-4 -mb-px overflow-x-auto">
                        {(() => {
                          // Alle verfügbaren Tabs definieren
                          const allTabs = [
                            { id: 'programs', featureId: 'programs', label: 'Programme', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
                            { id: 'tools', featureId: 'tools', label: 'Werkzeuge', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
                            { id: 'setup', featureId: 'setup_sheet', label: 'Einrichteblatt', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                            { id: 'inspection', featureId: 'inspection', label: 'Prüfplan', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
                            { id: 'work_instruction', featureId: 'work_instruction', label: 'Anweisung', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                            { id: 'checklist', featureId: 'checklist', label: 'Checkliste', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                            { id: 'documents', featureId: 'documents', label: 'Dokumente', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
                            { id: 'measuring_equipment', featureId: 'measuring_equipment', label: 'Messmittel', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' },
                          ];
                          
                          // Filtern nach enabled_features
                          const enabledFeatures = operation.enabled_features || ['programs', 'tools', 'setup_sheet', 'inspection'];
                          const visibleTabs = allTabs.filter(tab => enabledFeatures.includes(tab.featureId));
                          
                          return visibleTabs.map((tab) => (
                            <button
                              key={tab.id}
                              onClick={() => handleTabChange(operation.id, tab.id)}
                              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                currentTab === tab.id
                                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                              </svg>
                              {tab.label}
                            </button>
                          ));
                        })()}
                      </nav>
                    </div>

                    {/* Tab Content - dynamisch */}
                    <div className="min-h-[200px]">
                      {currentTab === 'programs' && (
                        <ProgramsList operationId={operation.id} />
                      )}
                      {currentTab === 'tools' && (
                        <ToolListsOverview operationId={operation.id} />
                      )}
                      {currentTab === 'setup' && (
                        <SetupSheetsList operationId={operation.id} />
                      )}
                      {currentTab === 'inspection' && (
                        <InspectionPlanTab operationId={operation.id} />
                      )}
                      {currentTab === 'work_instruction' && (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-gray-500 dark:text-gray-400">Arbeitsanweisungen - kommt bald</p>
                        </div>
                      )}
                      {currentTab === 'checklist' && (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <p className="text-gray-500 dark:text-gray-400">Checklisten - kommt bald</p>
                        </div>
                      )}
                      {currentTab === 'documents' && (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                          <p className="text-gray-500 dark:text-gray-400">Dokumente - kommt bald</p>
                        </div>
                      )}
                      {currentTab === 'measuring_equipment' && (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                          </svg>
                          <p className="text-gray-500 dark:text-gray-400">Messmittel - kommt bald</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Operation Form Modal */}
      {showForm && (
        <OperationForm
          partId={partId}
          operation={editingOperation}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
