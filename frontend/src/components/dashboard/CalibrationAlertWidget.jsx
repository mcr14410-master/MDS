import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDashboardStore } from '../../stores/dashboardStore';

const statusColors = {
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  due_soon: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const statusLabels = {
  overdue: 'Überfällig',
  due_soon: 'Fällig',
};

export default function CalibrationAlertWidget() {
  const { calibrationAlerts, fetchCalibrationAlerts } = useDashboardStore();

  useEffect(() => {
    fetchCalibrationAlerts(10);
  }, []);

  if (!calibrationAlerts) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const { alerts, summary } = calibrationAlerts;
  const totalAlerts = parseInt(summary?.overdue_count || 0) + parseInt(summary?.due_soon_count || 0);

  if (totalAlerts === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="text-3xl">✅</div>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Kalibrierungen aktuell
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Alle Messmittel sind kalibriert
            </p>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">📏</span>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Kalibrierung fällig
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {parseInt(summary?.overdue_count || 0) > 0 && (
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    {summary.overdue_count} überfällig
                  </span>
                )}
                {parseInt(summary?.overdue_count || 0) > 0 && parseInt(summary?.due_soon_count || 0) > 0 && ' • '}
                {parseInt(summary?.due_soon_count || 0) > 0 && (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    {summary.due_soon_count} bald fällig
                  </span>
                )}
              </p>
            </div>
          </div>
          <Link
            to="/measuring-equipment?calibration_status=overdue"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Alle anzeigen →
          </Link>
        </div>
      </div>

      {/* Alerts List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {alerts.map((item) => (
          <div 
            key={item.id} 
            className={`px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
              item.calibration_status === 'overdue' ? 'bg-red-50/50 dark:bg-red-900/10' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/measuring-equipment/${item.id}`}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {item.inventory_number}
                  </Link>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[item.calibration_status]}`}>
                    {statusLabels[item.calibration_status]}
                  </span>
                  {item.checkout_id && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" title={`Entnommen: ${item.checked_out_by_name}`}>
                      📤
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                  {item.name}
                  {item.type_name && <span className="text-gray-400 dark:text-gray-500"> • {item.type_name}</span>}
                </p>
              </div>
              <div className="flex-shrink-0 text-right ml-4">
                <div className={`text-sm font-medium ${
                  item.days_until_calibration < 0 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-yellow-600 dark:text-yellow-400'
                }`}>
                  {item.days_until_calibration < 0 
                    ? `${Math.abs(item.days_until_calibration)} Tage überfällig`
                    : `in ${item.days_until_calibration} Tagen`
                  }
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(item.next_calibration_date)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {totalAlerts > alerts.length && (
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 text-center">
          <Link
            to="/measuring-equipment?calibration_status=due_soon"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            +{totalAlerts - alerts.length} weitere Messmittel anzeigen
          </Link>
        </div>
      )}
    </div>
  );
}
