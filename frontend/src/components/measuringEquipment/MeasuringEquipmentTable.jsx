import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const statusColors = {
  ok: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  due_soon: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  locked: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  in_calibration: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  repair: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

const statusLabels = {
  ok: 'OK',
  due_soon: 'Fällig',
  overdue: 'Überfällig',
  locked: 'Gesperrt',
  in_calibration: 'In Kal.',
  repair: 'Reparatur',
};

// Trailing zeros entfernen (0.0100 → 0.01, 150.0000 → 150)
const formatNumber = (value) => {
  if (value === null || value === undefined) return null;
  return parseFloat(value).toString();
};

export default function MeasuringEquipmentTable({
  equipment,
  onEdit,
  onDelete,
  onCheckout,
  selectedIds,
  onToggleSelect,
  onToggleSelectAllVisible,
}) {
  const { hasPermission } = useAuthStore();
  const [sortColumn, setSortColumn] = useState('inventory_number');
  const [sortDirection, setSortDirection] = useState('asc');

  const selectionEnabled = !!selectedIds && !!onToggleSelect;
  const visibleIds = equipment.map(e => e.id);
  const visibleSelectedCount = selectionEnabled
    ? visibleIds.filter(id => selectedIds.has(id)).length
    : 0;
  const allVisibleSelected = selectionEnabled && visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
  const someVisibleSelected = selectionEnabled && visibleSelectedCount > 0 && !allVisibleSelected;

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedEquipment = [...equipment].sort((a, b) => {
    let aVal = a[sortColumn];
    let bVal = b[sortColumn];

    if (aVal == null) aVal = '';
    if (bVal == null) bVal = '';

    if (typeof aVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const SortIcon = ({ column }) => {
    if (sortColumn !== column) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  // Spezifikation basierend auf Typ-Kategorie (kompakt für Tabelle)
  const getSpecification = (eq) => {
    const category = eq.type_field_category;
    
    switch (category) {
      case 'measuring_instrument':
        if (eq.measuring_range_min !== null && eq.measuring_range_max !== null) {
          return `${formatNumber(eq.measuring_range_min)}-${formatNumber(eq.measuring_range_max)} ${eq.unit || 'mm'}`;
        }
        break;
      
      case 'gauge':
        if (eq.nominal_value) {
          return `Ø${formatNumber(eq.nominal_value)} ${eq.tolerance_class || ''}`.trim();
        }
        break;
      
      case 'thread_gauge':
        if (eq.thread_size) {
          const parts = [
            eq.thread_standard || '',
            eq.thread_size || ''
          ].filter(Boolean).join('');
          const pitch = eq.thread_pitch ? `x${eq.thread_pitch}` : '';
          const tolerance = eq.tolerance_class ? ` ${eq.tolerance_class}` : '';
          return `${parts}${pitch}${tolerance}`.trim() || '-';
        }
        break;
      
      case 'gauge_block':
        if (eq.nominal_value) {
          const klass = eq.accuracy_class ? ` Kl.${eq.accuracy_class}` : '';
          return `${formatNumber(eq.nominal_value)} ${eq.unit || 'mm'}${klass}`;
        }
        break;
      
      case 'angle_gauge':
        if (eq.nominal_value) {
          const tol = eq.tolerance_class ? ` ${eq.tolerance_class}` : '';
          return `${formatNumber(eq.nominal_value)}°${tol}`;
        }
        break;
      
      case 'surface_tester':
        if (eq.measuring_range_min !== null && eq.measuring_range_max !== null) {
          return `${formatNumber(eq.measuring_range_min)}-${formatNumber(eq.measuring_range_max)} µm`;
        }
        break;
    }
    
    // Fallback für alte Daten ohne Kategorie
    if (eq.measuring_range_min !== null && eq.measuring_range_max !== null) {
      return `${formatNumber(eq.measuring_range_min)}-${formatNumber(eq.measuring_range_max)} ${eq.unit || 'mm'}`;
    }
    if (eq.nominal_value) {
      return `Ø${formatNumber(eq.nominal_value)} ${eq.tolerance_class || ''}`.trim();
    }
    
    return '-';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
          <colgroup>
            {selectionEnabled && <col className="w-10" />}
            <col className="w-32" />
            <col />
            <col />
            <col className="w-40" />
            <col className="w-32" />
            <col className="w-28" />
          </colgroup>
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              {selectionEnabled && (
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={allVisibleSelected}
                    ref={el => { if (el) el.indeterminate = someVisibleSelected; }}
                    onChange={() => onToggleSelectAllVisible && onToggleSelectAllVisible(visibleIds, !allVisibleSelected)}
                    title={allVisibleSelected ? 'Auswahl auf dieser Seite aufheben' : 'Alle auf dieser Seite auswählen'}
                  />
                </th>
              )}
              {/* Spalte 1: Inventar-Nr. */}
              <th
                onClick={() => handleSort('inventory_number')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                <div className="flex items-center gap-1">
                  Inventar-Nr.
                  <SortIcon column="inventory_number" />
                </div>
              </th>

              {/* Spalte 2: Bezeichnung / Typ */}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <div className="flex flex-col gap-0.5">
                  <div
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    Bezeichnung
                    <SortIcon column="name" />
                  </div>
                  <div
                    onClick={() => handleSort('type_name')}
                    className="flex items-center gap-1 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 text-[10px] normal-case tracking-normal"
                  >
                    Typ
                    <SortIcon column="type_name" />
                  </div>
                </div>
              </th>

              {/* Spalte 3: Spezifikation / Hersteller */}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1">
                    Spezifikation
                  </div>
                  <div
                    onClick={() => handleSort('manufacturer')}
                    className="flex items-center gap-1 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 text-[10px] normal-case tracking-normal"
                  >
                    Hersteller
                    <SortIcon column="manufacturer" />
                  </div>
                </div>
              </th>

              {/* Spalte 4: Status / Nächste Kal. */}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <div className="flex flex-col gap-0.5">
                  <div
                    onClick={() => handleSort('calibration_status')}
                    className="flex items-center gap-1 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    Status
                    <SortIcon column="calibration_status" />
                  </div>
                  <div
                    onClick={() => handleSort('next_calibration_date')}
                    className="flex items-center gap-1 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 text-[10px] normal-case tracking-normal"
                  >
                    Nächste Kal.
                    <SortIcon column="next_calibration_date" />
                  </div>
                </div>
              </th>

              {/* Spalte 5: Lagerort */}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Lagerort
              </th>

              {/* Spalte 6: Aktionen */}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedEquipment.map((eq) => {
              const isSelected = selectionEnabled && selectedIds.has(eq.id);
              return (
              <tr
                key={eq.id}
                className={`transition-colors ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                {selectionEnabled && (
                  <td className="px-3 py-3 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={isSelected}
                      onChange={() => onToggleSelect(eq)}
                    />
                  </td>
                )}
                {/* Spalte 1: Inventar-Nr. */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/measuring-equipment/${eq.id}`}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {eq.inventory_number}
                    </Link>
                    {eq.checkout_id && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" title={`Entnommen: ${eq.checked_out_by_name}`}>
                        📤
                      </span>
                    )}
                  </div>
                </td>

                {/* Spalte 2: Bezeichnung / Typ */}
                <td className="px-4 py-3">
                  <div
                    className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate"
                    title={eq.name || ''}
                  >
                    {eq.name || '-'}
                  </div>
                  <div
                    className="text-xs text-gray-500 dark:text-gray-400 truncate"
                    title={eq.type_name || ''}
                  >
                    {eq.type_name || '-'}
                  </div>
                </td>

                {/* Spalte 3: Spezifikation / Hersteller */}
                <td className="px-4 py-3">
                  <div
                    className="text-sm text-gray-900 dark:text-gray-100 truncate"
                    title={getSpecification(eq)}
                  >
                    {getSpecification(eq)}
                  </div>
                  <div
                    className="text-xs text-gray-500 dark:text-gray-400 truncate"
                    title={eq.manufacturer || ''}
                  >
                    {eq.manufacturer || '-'}
                  </div>
                </td>

                {/* Spalte 4: Status / Nächste Kal. */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[eq.calibration_status] || 'bg-gray-100 text-gray-600'}`}>
                    {statusLabels[eq.calibration_status] || eq.calibration_status}
                  </span>
                  <div className={`text-xs mt-1 ${
                    eq.days_until_calibration < 0
                      ? 'text-red-600 dark:text-red-400 font-medium'
                      : eq.days_until_calibration <= 30
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {formatDate(eq.next_calibration_date)}
                  </div>
                </td>

                {/* Spalte 5: Lagerort */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {eq.location_code || eq.storage_location_name || eq.location_name ? (
                    <span
                      className="text-sm text-gray-600 dark:text-gray-400 cursor-help"
                      title={`${eq.storage_location_name || eq.location_name || ''}${eq.compartment_name ? ` → ${eq.compartment_name}` : ''}`}
                    >
                      {eq.location_code || eq.storage_location_name || eq.location_name}
                      {(eq.compartment_code || eq.compartment_name) && (
                        <span className="text-gray-400 dark:text-gray-500"> → {eq.compartment_code || eq.compartment_name}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                  )}
                </td>

                {/* Spalte 6: Aktionen */}
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      to={`/measuring-equipment/${eq.id}`}
                      className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      title="Details"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                    {/* Checkout/Return Button */}
                    {hasPermission('measuring.checkout') && (
                      eq.checkout_id ? (
                        // Zurückgeben
                        <button
                          onClick={() => onCheckout(eq, 'return')}
                          className="p-1.5 text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                          title="Zurückgeben"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </button>
                      ) : eq.status === 'active' && eq.calibration_status !== 'overdue' ? (
                        // Entnehmen
                        <button
                          onClick={() => onCheckout(eq, 'checkout')}
                          className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
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
                        onClick={() => onEdit(eq)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="Bearbeiten"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    {hasPermission('measuring.delete') && (
                      <button
                        onClick={() => onDelete(eq)}
                        className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Löschen"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
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

      {equipment.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Keine Messmittel gefunden
        </div>
      )}
    </div>
  );
}
