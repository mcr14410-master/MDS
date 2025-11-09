// frontend/src/components/ToolListReadOnly.jsx
import { useEffect } from 'react';
import { useToolListsStore } from '../stores/toolListsStore';

// Tool Type Icons (nur für Display)
const TOOL_TYPE_ICONS = {
  'Bohrer': '🔩',
  'Fräser': '⚙️',
  'Gewinde': '🔧',
  'Reibahle': '📐',
  'Drehmeißel': '🔪',
  'Sonstige': '🔨'
};

export default function ToolListReadOnly({ programId }) {
  const { toolList, loading, error, fetchToolList } = useToolListsStore();

  useEffect(() => {
    if (programId) {
      fetchToolList(programId);
    }
  }, [programId, fetchToolList]);

  if (loading && !toolList) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="inline-block w-6 h-6 border-3 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Lade Werkzeuge...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
        <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
      </div>
    );
  }

  const tools = toolList?.items || [];

  if (tools.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
        <div className="text-3xl mb-2">🔧</div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Noch keine Werkzeuge in der Liste
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Gehe zum Werkzeuge-Tab um Werkzeuge hinzuzufügen
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          Werkzeugliste
        </h4>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {tools.length} {tools.length === 1 ? 'Werkzeug' : 'Werkzeuge'}
        </span>
      </div>

      {/* Compact Tool List */}
      <div className="space-y-2">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          >
            {/* Tool Type Icon */}
            {tool.tool_type && (
              <div className="flex-shrink-0 text-lg" title={tool.tool_type}>
                {TOOL_TYPE_ICONS[tool.tool_type] || '🔨'}
              </div>
            )}

            {/* Tool Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                {/* T-Nr */}
                <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white flex-shrink-0">
                  {tool.tool_number}
                </span>

                {/* Beschreibung */}
                {tool.description && (
                  <>
                    <span className="text-gray-400 dark:text-gray-600">•</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {tool.description}
                    </span>
                  </>
                )}
              </div>

              {/* Hersteller */}
              {tool.manufacturer && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {tool.manufacturer}
                  {tool.order_number && (
                    <span className="ml-2 text-gray-400 dark:text-gray-600">
                      • {tool.order_number}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Info Footer */}
      <div className="pt-2 mt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          💡 Zum Bearbeiten: <span className="font-medium">Werkzeuge-Tab</span> nutzen
        </p>
      </div>
    </div>
  );
}
