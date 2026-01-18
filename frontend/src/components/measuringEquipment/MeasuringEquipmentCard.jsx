import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

// Trailing zeros entfernen (0.0100 → 0.01, 150.0000 → 150)
const formatNumber = (value) => {
  if (value === null || value === undefined) return null;
  return parseFloat(value).toString();
};

// Gewindenorm-Labels für Anzeige
const threadStandardLabels = {
  'M': 'M (Metrisch ISO)',
  'MF': 'MF (Metrisch Fein)',
  'UNC': 'UNC (Unified Coarse)',
  'UNF': 'UNF (Unified Fine)',
  'UNEF': 'UNEF (Unified Extra Fine)',
  'UN': 'UN (Unified Special)',
  'G': 'G (Whitworth Rohr zyl.)',
  'R': 'R (Whitworth Rohr kon.)',
  'Rp': 'Rp (Whitworth Rohr Innen)',
  'NPT': 'NPT (National Pipe Thread)',
  'NPTF': 'NPTF (NPT Dryseal)',
  'Tr': 'Tr (Trapezgewinde)',
  'ACME': 'ACME (Trapezgewinde)',
  'Pg': 'Pg (Panzergewinde)',
  'Rd': 'Rd (Rundgewinde)',
};

export default function MeasuringEquipmentCard({ 
  equipment, 
  onEdit, 
  onDelete,
  onCheckout,
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

  // Kategorie-basierte Spezifikation: { label, value }
  const getSpecification = () => {
    const category = equipment.type_field_category;
    
    switch (category) {
      case 'measuring_instrument':
        if (equipment.measuring_range_min !== null && equipment.measuring_range_max !== null) {
          return {
            label: 'Messbereich',
            value: `${formatNumber(equipment.measuring_range_min)}-${formatNumber(equipment.measuring_range_max)} ${equipment.unit || 'mm'}`
          };
        }
        return { label: 'Messbereich', value: '-' };
        
      case 'gauge':
        if (equipment.nominal_value) {
          return {
            label: 'Nennmaß',
            value: `Ø${formatNumber(equipment.nominal_value)} ${equipment.tolerance_class || ''}`.trim()
          };
        }
        return { label: 'Nennmaß', value: '-' };
        
      case 'thread_gauge':
        if (equipment.thread_size) {
          const prefix = equipment.thread_standard || '';
          const size = equipment.thread_size || '';
          const pitch = equipment.thread_pitch ? `x${equipment.thread_pitch}` : '';
          const tolerance = equipment.tolerance_class ? ` ${equipment.tolerance_class}` : '';
          return {
            label: 'Gewinde',
            value: `${prefix}${size}${pitch}${tolerance}`.trim() || '-'
          };
        }
        return { label: 'Gewinde', value: '-' };
        
      case 'gauge_block':
        if (equipment.nominal_value) {
          const klass = equipment.accuracy_class ? ` Kl.${equipment.accuracy_class}` : '';
          return {
            label: 'Nennmaß',
            value: `${formatNumber(equipment.nominal_value)} ${equipment.unit || 'mm'}${klass}`
          };
        }
        return { label: 'Nennmaß', value: '-' };
        
      case 'angle_gauge':
        if (equipment.nominal_value) {
          const tol = equipment.tolerance_class ? ` ${equipment.tolerance_class}` : '';
          return {
            label: 'Winkel',
            value: `${formatNumber(equipment.nominal_value)}°${tol}`
          };
        }
        return { label: 'Winkel', value: '-' };
        
      case 'surface_tester':
        if (equipment.measuring_range_min !== null && equipment.measuring_range_max !== null) {
          return {
            label: 'Messbereich',
            value: `${formatNumber(equipment.measuring_range_min)}-${formatNumber(equipment.measuring_range_max)} µm`
          };
        }
        return { label: 'Messbereich', value: '-' };
        
      default:
        // Fallback für alte Daten ohne type_field_category
        if (equipment.measuring_range_min !== null && equipment.measuring_range_max !== null) {
          return {
            label: 'Messbereich',
            value: `${formatNumber(equipment.measuring_range_min)}-${formatNumber(equipment.measuring_range_max)} ${equipment.unit || 'mm'}`
          };
        }
        if (equipment.nominal_value) {
          return {
            label: 'Nennmaß',
            value: `Ø${formatNumber(equipment.nominal_value)} ${equipment.tolerance_class || ''}`.trim()
          };
        }
        return { label: 'Spezifikation', value: '-' };
    }
  };

  const spec = getSpecification();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow flex flex-col h-full">
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
      <div className="p-4 space-y-3 flex-grow">
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

        {/* Gewindelehren: Separate Zeilen für Gewinde, Norm, Steigung */}
        {equipment.type_field_category === 'thread_gauge' ? (
          <>
            {equipment.thread_size && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Gewinde</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {equipment.thread_standard || ''}{equipment.thread_size}{equipment.tolerance_class ? ` ${equipment.tolerance_class}` : ''}
                </span>
              </div>
            )}
            {equipment.thread_standard && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Gewindenorm</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {threadStandardLabels[equipment.thread_standard] || equipment.thread_standard}
                </span>
              </div>
            )}
            {equipment.thread_pitch && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Steigung</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {equipment.thread_pitch}
                </span>
              </div>
            )}
          </>
        ) : (
          /* Andere Kategorien: Normale Spezifikation */
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{spec.label}</span>
            <span className="text-gray-900 dark:text-gray-100">
              {spec.value}
            </span>
          </div>
        )}

        {/* Resolution - nur für Messinstrumente und Rauheitsmesser */}
        {equipment.resolution && ['measuring_instrument', 'surface_tester', 'angle_gauge'].includes(equipment.type_field_category) && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Auflösung</span>
            <span className="text-gray-900 dark:text-gray-100">
              {formatNumber(equipment.resolution)} {equipment.type_field_category === 'surface_tester' ? 'µm' : (equipment.type_field_category === 'angle_gauge' ? '°' : equipment.unit || 'mm')}
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
        {(equipment.storage_location_name || equipment.compartment_name) && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Lagerort</span>
            <span className="text-gray-900 dark:text-gray-100">
              {equipment.storage_location_name || equipment.location_name}
              {equipment.compartment_name && (
                <span className="text-gray-500 dark:text-gray-400"> → {equipment.compartment_name}</span>
              )}
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
          {/* Checkout/Return Button */}
          {hasPermission('measuring.checkout') && (
            equipment.checkout_id ? (
              // Zurückgeben
              <button
                onClick={() => onCheckout(equipment, 'return')}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                title="Zurückgeben"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
            ) : equipment.status === 'active' && equipment.calibration_status !== 'overdue' ? (
              // Entnehmen
              <button
                onClick={() => onCheckout(equipment, 'checkout')}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                title="Entnehmen"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </button>
            ) : null
          )}
          {hasPermission('measuring.edit') && (
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
          {hasPermission('measuring.delete') && (
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
