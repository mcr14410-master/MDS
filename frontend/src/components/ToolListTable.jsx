// frontend/src/components/ToolListTable.jsx
import { useEffect, useState } from 'react';
import { useToolListsStore } from '../stores/toolListsStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from './Toaster';
import ToolListForm from './ToolListForm';

// Tool Type Icons/Colors
const TOOL_TYPE_CONFIG = {
  'Bohrer': { icon: '🔩', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  'Fräser': { icon: '⚙️', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  'Gewinde': { icon: '🔧', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  'Reibahle': { icon: '📐', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  'Drehmeißel': { icon: '🔪', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  'Sonstige': { icon: '🔨', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' }
};

export default function ToolListTable({ programId }) {
  const { toolList, loading, error, fetchToolList, deleteToolItem, moveItemUp, moveItemDown } = useToolListsStore();
  const { hasPermission } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [editingTool, setEditingTool] = useState(null);

  useEffect(() => {
    if (programId) {
      fetchToolList(programId);
    }
  }, [programId, fetchToolList]);

  const handleAdd = () => {
    setEditingTool(null);
    setShowForm(true);
  };

  const handleEdit = (tool) => {
    setEditingTool(tool);
    setShowForm(true);
  };

  const handleDelete = async (tool) => {
    if (!window.confirm(`Werkzeug "${tool.tool_number}" wirklich löschen?`)) {
      return;
    }

    try {
      await deleteToolItem(tool.id);
      toast.success('Werkzeug erfolgreich gelöscht');
    } catch (error) {
      toast.error(error.message || 'Fehler beim Löschen');
    }
  };

  const handleMoveUp = async (tool) => {
    try {
      await moveItemUp(programId, tool.id);
      toast.success('Werkzeug nach oben verschoben');
    } catch (error) {
      toast.error(error.message || 'Fehler beim Verschieben');
    }
  };

  const handleMoveDown = async (tool) => {
    try {
      await moveItemDown(programId, tool.id);
      toast.success('Werkzeug nach unten verschoben');
    } catch (error) {
      toast.error(error.message || 'Fehler beim Verschieben');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingTool(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
  };

  const getToolTypeConfig = (toolType) => {
    return TOOL_TYPE_CONFIG[toolType] || TOOL_TYPE_CONFIG['Sonstige'];
  };

  if (loading && !toolList) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Lade Werkzeugliste...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-300">{error}</p>
      </div>
    );
  }

  const tools = toolList?.items || [];
  const canEdit = hasPermission('part.update');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Werkzeugliste
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {tools.length} {tools.length === 1 ? 'Werkzeug' : 'Werkzeuge'}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                     transition-colors flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            Werkzeug hinzufügen
          </button>
        )}
      </div>

      {/* Table or Empty State */}
      {tools.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div className="text-4xl mb-3">🔧</div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Noch keine Werkzeuge in der Liste
          </p>
          {canEdit && (
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Erstes Werkzeug hinzufügen
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  T-Nr
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Typ
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Beschreibung
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Hersteller
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Halter
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Standzeit
                </th>
                {canEdit && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Aktionen
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {tools.map((tool, index) => {
                const typeConfig = getToolTypeConfig(tool.tool_type);
                return (
                  <tr key={tool.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    {/* Tool Number */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                        {tool.tool_number}
                      </span>
                    </td>

                    {/* Tool Type */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {tool.tool_type && (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${typeConfig.color}`}>
                          <span>{typeConfig.icon}</span>
                          <span>{tool.tool_type}</span>
                        </span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {tool.description || '-'}
                      </div>
                      {tool.notes && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {tool.notes}
                        </div>
                      )}
                    </td>

                    {/* Manufacturer */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {tool.manufacturer || '-'}
                      </div>
                      {tool.order_number && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {tool.order_number}
                        </div>
                      )}
                    </td>

                    {/* Tool Holder */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {tool.tool_holder || '-'}
                    </td>

                    {/* Tool Life */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {tool.tool_life_info || '-'}
                    </td>

                    {/* Actions */}
                    {canEdit && (
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Move Up */}
                          <button
                            onClick={() => handleMoveUp(tool)}
                            disabled={index === 0}
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400
                                     disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Nach oben"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>

                          {/* Move Down */}
                          <button
                            onClick={() => handleMoveDown(tool)}
                            disabled={index === tools.length - 1}
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400
                                     disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Nach unten"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleEdit(tool)}
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="Bearbeiten"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(tool)}
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Löschen"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <ToolListForm
          programId={programId}
          editingTool={editingTool}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
