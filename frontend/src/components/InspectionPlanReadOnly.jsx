// frontend/src/components/InspectionPlanReadOnly.jsx
import { useEffect } from 'react';
import { useInspectionPlansStore } from '../stores/inspectionPlansStore';

export default function InspectionPlanReadOnly({ operationId }) {
  const { inspectionPlan, loading, error, fetchInspectionPlan } = useInspectionPlansStore();

  useEffect(() => {
    if (operationId) {
      fetchInspectionPlan(operationId);
    }
  }, [operationId, fetchInspectionPlan]);

  if (loading && !inspectionPlan) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="inline-block w-6 h-6 border-3 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Lade Prüfplan...</p>
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

  const items = inspectionPlan?.items || [];

  if (items.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
        <div className="text-3xl mb-2">📏</div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Noch keine Prüfpunkte definiert
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Gehe zum Prüfplan-Tab um Prüfpunkte hinzuzufügen
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          Prüfplan
        </h4>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {items.length} {items.length === 1 ? 'Prüfpunkt' : 'Prüfpunkte'}
        </span>
      </div>

      {/* General Notes (if any) */}
      {inspectionPlan?.notes && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">
            Allgemeine Hinweise:
          </div>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {inspectionPlan.notes}
          </p>
        </div>
      )}

      {/* Inspection Items */}
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
          >
            {/* Header: Sequence + Description */}
            <div className="flex items-start gap-2 mb-2">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-xs font-semibold text-white bg-blue-600 rounded-full">
                {item.sequence_number}
              </span>
              <div className="flex-1 font-medium text-gray-900 dark:text-white text-sm">
                {item.measurement_description}
              </div>
            </div>

            {/* Values Grid - Compact */}
            {(item.tolerance || item.min_value || item.mean_value || item.max_value) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2 ml-8">
                {item.tolerance && (
                  <div className="bg-white dark:bg-gray-900/50 rounded px-2 py-1 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Toleranz</div>
                    <div className="text-sm font-mono text-gray-900 dark:text-white">{item.tolerance}</div>
                  </div>
                )}
                {item.min_value && (
                  <div className="bg-white dark:bg-gray-900/50 rounded px-2 py-1 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Min</div>
                    <div className="text-sm font-mono text-gray-900 dark:text-white">{item.min_value}</div>
                  </div>
                )}
                {item.mean_value && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded px-2 py-1 border border-blue-200 dark:border-blue-800">
                    <div className="text-xs text-blue-600 dark:text-blue-400">Soll</div>
                    <div className="text-sm font-mono font-semibold text-blue-700 dark:text-blue-300">{item.mean_value}</div>
                  </div>
                )}
                {item.max_value && (
                  <div className="bg-white dark:bg-gray-900/50 rounded px-2 py-1 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Max</div>
                    <div className="text-sm font-mono text-gray-900 dark:text-white">{item.max_value}</div>
                  </div>
                )}
              </div>
            )}

            {/* Measuring Tool */}
            {item.measuring_tool && (
              <div className="ml-8 mb-2 flex items-start gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">🔧</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">{item.measuring_tool}</span>
              </div>
            )}

            {/* Instruction */}
            {item.instruction && (
              <div className="ml-8 text-sm text-gray-600 dark:text-gray-400 italic bg-white dark:bg-gray-900/50 rounded p-2 border-l-2 border-blue-500">
                💡 {item.instruction}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info Footer */}
      <div className="pt-2 mt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          💡 Zum Bearbeiten: <span className="font-medium">Prüfplan-Tab</span> nutzen
        </p>
      </div>
    </div>
  );
}
