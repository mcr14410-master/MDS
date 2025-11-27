import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export default function MeasuringEquipmentCard({ 
  equipment, 
  onEdit, 
  onDelete,
  statusColors,
  statusLabels 
}) {
  const { hasPermission } = useAuthStore();

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ok':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'due_soon':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'overdue':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'locked':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 'in_calibration':
      case 'repair':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  const formatMeasuringRange = () => {
    if (equipment.measuring_range_min !== null && equipment.measuring_range_max !== null) {
      return `${equipment.measuring_range_min} - ${equipment.measuring_range_max} ${equipment.unit || 'mm'}`;
    }
    if (equipment.nominal_value) {
      return `Ø${equipment.nominal_value} ${equipment.tolerance_class || ''}`;
    }
    return '-';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start">
          <div>
            <Link 
              to={`/measuring-equipment/${equipment.id}`}
              className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
            >
              {equipment.inventory_number}
            </Link>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {equipment.name}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[equipment.calibration_status] || statusColors.unknown}`}>
            {getStatusIcon(equipment.calibration_status)}
            {statusLabels[equipment.calibration_status] || 'Unbekannt'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Checkout Badge */}
        {equipment.checkout_id && (
          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs">
              <span className="text-yellow-800 dark:text-yellow-200 font-medium">
                Entnommen: {equipment.checked_out_by_name}
              </span>
              {equipment.checkout_work_order && (
                <span className="text-yellow-600 dark:text-yellow-400 ml-1">
                  • {equipment.checkout_work_order}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Type */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Typ</span>
          <span className="text-gray-900 dark:text-gray-100 font-medium">
            {equipment.type_name}
          </span>
        </div>

        {/* Manufacturer */}
        {equipment.manufacturer && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Hersteller</span>
            <span className="text-gray-900 dark:text-gray-100">
              {equipment.manufacturer}
              {equipment.model && ` ${equipment.model}`}
            </span>
          </div>
        )}

        {/* Measuring Range */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Messbereich</span>
          <span className="text-gray-900 dark:text-gray-100">
            {formatMeasuringRange()}
          </span>
        </div>

        {/* Resolution */}
        {equipment.resolution && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Auflösung</span>
            <span className="text-gray-900 dark:text-gray-100">
              {equipment.resolution} {equipment.unit || 'mm'}
            </span>
          </div>
        )}

        {/* Calibration */}
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Letzte Kalibrierung</span>
            <span className="text-gray-900 dark:text-gray-100">
              {formatDate(equipment.last_calibration_date)}
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-500 dark:text-gray-400">Nächste Kalibrierung</span>
            <span className={`font-medium ${
              equipment.days_until_calibration < 0 
                ? 'text-red-600 dark:text-red-400' 
                : equipment.days_until_calibration <= 30 
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-gray-900 dark:text-gray-100'
            }`}>
              {formatDate(equipment.next_calibration_date)}
              {equipment.days_until_calibration !== null && (
                <span className="ml-1 text-xs">
                  ({equipment.days_until_calibration < 0 
                    ? `${Math.abs(equipment.days_until_calibration)}d überfällig` 
                    : `in ${equipment.days_until_calibration}d`})
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Storage Location */}
        {equipment.storage_location_name && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Lagerort</span>
            <span className="text-gray-900 dark:text-gray-100">
              {equipment.storage_location_code || equipment.storage_location_name}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center rounded-b-lg">
        <Link
          to={`/measuring-equipment/${equipment.id}`}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Details →
        </Link>
        <div className="flex gap-2">
          {hasPermission('storage.edit') && (
            <button
              onClick={() => onEdit(equipment)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Bearbeiten"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {hasPermission('storage.delete') && (
            <button
              onClick={() => onDelete(equipment)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Löschen"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
