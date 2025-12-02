import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMeasuringEquipmentStore } from '../stores/measuringEquipmentStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../components/Toaster';
import MeasuringEquipmentCard from '../components/measuringEquipment/MeasuringEquipmentCard';
import MeasuringEquipmentTable from '../components/measuringEquipment/MeasuringEquipmentTable';
import MeasuringEquipmentFormModal from '../components/measuringEquipment/MeasuringEquipmentFormModal';
import MeasuringEquipmentTypesModal from '../components/measuringEquipment/MeasuringEquipmentTypesModal';
import API_BASE_URL from '../config/api';

// Kalibrierungsstatus-Farben
const calibrationStatusColors = {
  ok: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  due_soon: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  locked: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  in_calibration: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  repair: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  unknown: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const calibrationStatusLabels = {
  ok: 'OK',
  due_soon: 'Fällig',
  overdue: 'Überfällig',
  locked: 'Gesperrt',
  in_calibration: 'In Kalibrierung',
  repair: 'In Reparatur',
  unknown: 'Unbekannt',
};

export default function MeasuringEquipmentPage() {
  const { 
    equipment, 
    types,
    stats,
    loading, 
    fetchEquipment, 
    fetchTypes,
    fetchStats,
    deleteEquipment 
  } = useMeasuringEquipmentStore();
  const { hasPermission } = useAuthStore();
  
  const [filters, setFilters] = useState({
    search: '',
    type_id: '',
    calibration_status: '',
    checkout_status: '', // NEU: 'checked_out' oder 'available'
    sort_by: 'inventory_number',
    sort_order: 'asc',
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [showTypesModal, setShowTypesModal] = useState(false);

  useEffect(() => {
    fetchTypes({ is_active: true });
    fetchStats();
    fetchEquipment(filters);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchEquipment(filters);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchEquipment(newFilters);
  };

  const handleCreateNew = () => {
    setEditingEquipment(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingEquipment(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Messmittel "${item.name}" wirklich löschen?`)) {
      return;
    }

    try {
      await deleteEquipment(item.id);
      toast.success(`Messmittel "${item.name}" wurde gelöscht`);
      fetchEquipment(filters);
      fetchStats();
    } catch (err) {
      toast.error(err.message || 'Fehler beim Löschen');
    }
  };

  const handleModalClose = (success) => {
    setIsModalOpen(false);
    setEditingEquipment(null);
    if (success) {
      fetchEquipment(filters);
      fetchStats();
    }
  };

  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExport = async (type) => {
    setShowExportMenu(false);
    const token = localStorage.getItem('token');
    
    let url;
    switch (type) {
      case 'overview':
        url = `${API_BASE_URL}/api/reports/calibration-overview`;
        break;
      case 'due':
        url = `${API_BASE_URL}/api/reports/calibration-due`;
        break;
      default:
        return;
    }

    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const data = await response.json();
        if (data.message) {
          toast.info(data.message);
          return;
        }
        throw new Error('Export fehlgeschlagen');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'report.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('PDF-Export erstellt');
    } catch (err) {
      toast.error(err.message || 'Export fehlgeschlagen');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Messmittelverwaltung
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Verwalten Sie Messmittel und Kalibrierungen (ISO/Luftfahrt-konform)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title="Grid-Ansicht"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 transition-colors ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title="Tabellen-Ansicht"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Export Menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                  <div className="py-1">
                    <button
                      onClick={() => handleExport('overview')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <div className="font-medium">Kalibrierungs-Übersicht</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Alle Messmittel als PDF</div>
                    </button>
                    <button
                      onClick={() => handleExport('due')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <div className="font-medium">Fälligkeitsbericht</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Nur fällige/überfällige</div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Types Management */}
          {hasPermission('storage.edit') && (
            <button
              onClick={() => setShowTypesModal(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Typen
            </button>
          )}

          {/* Create New */}
          {hasPermission('storage.create') && (
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Neues Messmittel
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.counts.total_count}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Gesamt</div>
          </div>
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-green-500 transition-colors"
            onClick={() => handleFilterChange('calibration_status', 'ok')}
          >
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.counts.ok_count}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">OK</div>
          </div>
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-yellow-500 transition-colors"
            onClick={() => handleFilterChange('calibration_status', 'due_soon')}
          >
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.counts.due_soon_count}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Fällig (≤30d)</div>
          </div>
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-red-500 transition-colors"
            onClick={() => handleFilterChange('calibration_status', 'overdue')}
          >
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.counts.overdue_count}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Überfällig</div>
          </div>
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-gray-500 transition-colors"
            onClick={() => handleFilterChange('calibration_status', 'locked')}
          >
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {stats.counts.locked_count}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Gesperrt</div>
          </div>
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-blue-500 transition-colors"
            onClick={() => handleFilterChange('calibration_status', 'in_calibration')}
          >
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.counts.in_service_count}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">In Service</div>
          </div>
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-yellow-500 transition-colors"
            onClick={() => handleFilterChange('checkout_status', 'checked_out')}
          >
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.counts.checked_out_count || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Entnommen</div>
          </div>
        </div>
      )}

      {/* Upcoming Calibrations Warning */}
      {stats?.upcoming_calibrations?.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
                Kalibrierung fällig
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                {stats.upcoming_calibrations.slice(0, 5).map(eq => (
                  <div key={eq.id} className="flex justify-between">
                    <Link 
                      to={`/measuring-equipment/${eq.id}`}
                      className="hover:underline"
                    >
                      {eq.inventory_number} - {eq.name}
                    </Link>
                    <span className={eq.days_until_calibration < 0 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                      {eq.days_until_calibration < 0 
                        ? `${Math.abs(eq.days_until_calibration)} Tage überfällig`
                        : `in ${eq.days_until_calibration} Tagen`
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Suche nach Inventar-Nr., Name, Hersteller..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Type Filter */}
          <select
            value={filters.type_id}
            onChange={(e) => handleFilterChange('type_id', e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Typen</option>
            {types.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>

          {/* Calibration Status Filter */}
          <select
            value={filters.calibration_status}
            onChange={(e) => handleFilterChange('calibration_status', e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Status</option>
            <option value="ok">✓ OK</option>
            <option value="due_soon">⏰ Fällig</option>
            <option value="overdue">❌ Überfällig</option>
            <option value="locked">🔒 Gesperrt</option>
            <option value="in_calibration">🔧 In Kalibrierung</option>
          </select>

          {/* Checkout Status Filter */}
          <select
            value={filters.checkout_status}
            onChange={(e) => handleFilterChange('checkout_status', e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Verfügbarkeit</option>
            <option value="available">✅ Verfügbar</option>
            <option value="checked_out">📤 Entnommen</option>
          </select>

          {/* Sort */}
          <select
            value={`${filters.sort_by}-${filters.sort_order}`}
            onChange={(e) => {
              const [sort_by, sort_order] = e.target.value.split('-');
              handleFilterChange('sort_by', sort_by);
              setFilters(f => ({ ...f, sort_order }));
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="inventory_number-asc">Inventar-Nr. ↑</option>
            <option value="inventory_number-desc">Inventar-Nr. ↓</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="next_calibration_date-asc">Kalibrierung (nächste zuerst)</option>
            <option value="next_calibration_date-desc">Kalibrierung (späteste zuerst)</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Suchen
          </button>

          {(filters.search || filters.type_id || filters.calibration_status || filters.checkout_status) && (
            <button
              type="button"
              onClick={() => {
                const resetFilters = { search: '', type_id: '', calibration_status: '', checkout_status: '', sort_by: 'inventory_number', sort_order: 'asc' };
                setFilters(resetFilters);
                fetchEquipment(resetFilters);
              }}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Zurücksetzen
            </button>
          )}
        </form>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {equipment.length} Messmittel gefunden
      </div>

      {/* Equipment Grid or Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : equipment.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            Keine Messmittel gefunden
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Erstellen Sie ein neues Messmittel oder passen Sie die Filter an.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <MeasuringEquipmentTable
          equipment={equipment}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map(item => (
            <MeasuringEquipmentCard
              key={item.id}
              equipment={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
              statusColors={calibrationStatusColors}
              statusLabels={calibrationStatusLabels}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <MeasuringEquipmentFormModal
          equipment={editingEquipment}
          types={types}
          onClose={handleModalClose}
        />
      )}

      {/* Types Modal */}
      {showTypesModal && (
        <MeasuringEquipmentTypesModal
          onClose={() => {
            setShowTypesModal(false);
            fetchTypes({ is_active: true });
          }}
        />
      )}
    </div>
  );
}
