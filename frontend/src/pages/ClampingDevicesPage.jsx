import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useClampingDevicesStore } from '../stores/clampingDevicesStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import ClampingDeviceTypesModal from '../components/clampingDevices/ClampingDeviceTypesModal';
import ClampingDeviceFormModal from '../components/clampingDevices/ClampingDeviceFormModal';
import Pagination from '../components/Pagination';

const statusColors = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  in_repair: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  retired: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-500',
};

const statusLabels = {
  active: 'Aktiv',
  in_repair: 'In Reparatur',
  retired: 'Ausgemustert',
};

const defaultFilters = {
  search: '',
  type_id: '',
  status: '',
  sort_by: 'type_name',
  sort_order: 'asc',
};

export default function ClampingDevicesPage() {
  const {
    devices,
    types,
    stats,
    loading,
    fetchDevices,
    fetchTypes,
    fetchStats,
  } = useClampingDevicesStore();

  const { getViewMode, setViewMode, getPageSize, setPageSize } = usePreferencesStore();
  const viewMode = getViewMode('clampingDevices');
  const pageSize = getPageSize('clampingDevices');

  const [showTypesModal, setShowTypesModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState(defaultFilters);

  useEffect(() => {
    fetchTypes();
    fetchStats();
  }, []);

  useEffect(() => {
    const activeFilters = {};
    if (filters.type_id) activeFilters.type_id = filters.type_id;
    if (filters.status) activeFilters.status = filters.status;
    if (filters.search) activeFilters.search = filters.search;
    activeFilters.sort_by = filters.sort_by;
    activeFilters.sort_order = filters.sort_order;

    fetchDevices(activeFilters);
  }, [filters]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(devices.length / pageSize));
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [devices.length, pageSize, currentPage]);

  const paginatedDevices = devices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size) => {
    setPageSize('clampingDevices', size);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
    setCurrentPage(1);
  };

  const hasActiveFilters = !!(filters.search || filters.type_id || filters.status);

  const getStatusBadge = (status) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || statusColors.active}`}>
      {statusLabels[status] || status}
    </span>
  );

  // Card Component for Grid View
  const DeviceCard = ({ device }) => (
    <Link
      to={`/clamping-devices/${device.id}`}
      className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all overflow-hidden group"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
              {device.name}
            </h3>
            {device.inventory_number && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate font-mono">
                {device.inventory_number}
              </p>
            )}
          </div>
          {getStatusBadge(device.status)}
        </div>

        {/* Type */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span>{device.type_name || 'Unbekannt'}</span>
        </div>

        {/* Infos */}
        <div className="space-y-1 text-sm mb-3">
          {(device.manufacturer || device.model) && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="truncate">
                {device.manufacturer}
                {device.model && ` / ${device.model}`}
              </span>
            </div>
          )}
          {(device.clamping_range_min !== null || device.clamping_range_max !== null) && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span className="truncate">
                {device.clamping_range_min || 0} – {device.clamping_range_max || '?'} mm
              </span>
            </div>
          )}
          {device.machine_name && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="truncate">{device.machine_name}</span>
            </div>
          )}
        </div>

        {/* Footer - Bestand */}
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-gray-600 dark:text-gray-400">
                {device.storage_location_count || 0} Lagerort{device.storage_location_count !== 1 ? 'e' : ''}
              </span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {parseInt(device.total_stock) || 0}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">Stk.</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Spannmittel
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Verwaltung von Schraubstöcken, Spannzangen, Vorrichtungen
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setViewMode('clampingDevices', 'grid')}
              className={`p-2 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800'
              }`}
              title="Grid-Ansicht"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('clampingDevices', 'table')}
              className={`p-2 transition-colors ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800'
              }`}
              title="Tabellen-Ansicht"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>

          <button
            onClick={() => setShowTypesModal(true)}
            className="px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Typen verwalten"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <button
            onClick={() => {
              setEditingDevice(null);
              setShowFormModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Neues Spannmittel
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-blue-500 transition-colors"
            onClick={() => handleFilterChange('status', '')}
            title="Alle anzeigen"
          >
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Gesamt</div>
          </div>
          <div
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-green-500 transition-colors"
            onClick={() => handleFilterChange('status', 'active')}
            title="Nur aktive anzeigen"
          >
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Aktiv</div>
          </div>
          <div
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-orange-500 transition-colors"
            onClick={() => handleFilterChange('status', 'in_repair')}
            title="Nur in Reparatur anzeigen"
          >
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.in_repair || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">In Reparatur</div>
          </div>
          <div
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-gray-500 transition-colors"
            onClick={() => handleFilterChange('status', 'retired')}
            title="Nur ausgemusterte anzeigen"
          >
            <div className="text-2xl font-bold text-gray-500">{stats.retired || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Ausgemustert</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[240px]">
            <div className="relative">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Name, Inventar-Nr., Hersteller..."
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
            {types.filter(t => t.is_active).map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="in_repair">In Reparatur</option>
            <option value="retired">Ausgemustert</option>
          </select>

          {/* Sort */}
          <select
            value={`${filters.sort_by}-${filters.sort_order}`}
            onChange={(e) => {
              const [sort_by, sort_order] = e.target.value.split('-');
              setFilters(prev => ({ ...prev, sort_by, sort_order }));
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="type_name-asc">Typ A-Z</option>
            <option value="type_name-desc">Typ Z-A</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="inventory_number-asc">Inventar-Nr. ↑</option>
            <option value="inventory_number-desc">Inventar-Nr. ↓</option>
            <option value="manufacturer-asc">Hersteller A-Z</option>
            <option value="status-asc">Status ↑</option>
            <option value="total_stock-desc">Bestand (hoch zuerst)</option>
            <option value="total_stock-asc">Bestand (niedrig zuerst)</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Zurücksetzen
            </button>
          )}
        </div>
      </div>

      {/* Results Count */}
      {!loading && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {devices.length} {devices.length === 1 ? 'Spannmittel' : 'Spannmittel'} gefunden
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : devices.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Keine Spannmittel vorhanden
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Erstellen Sie Ihr erstes Spannmittel oder passen Sie die Filter an.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <>
          {/* Grid View */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedDevices.map((device) => (
              <DeviceCard key={device.id} device={device} />
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={devices.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </>
      ) : (
        <>
          {/* Table View */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Spannmittel
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Typ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Hersteller / Modell
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Spannbereich
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Bestand
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedDevices.map((device) => (
                    <tr
                      key={device.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <Link to={`/clamping-devices/${device.id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {device.name}
                          </div>
                          {device.inventory_number && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                              {device.inventory_number}
                            </div>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-gray-700 dark:text-gray-300">
                        {device.type_name}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-gray-900 dark:text-white">
                          {device.manufacturer || '-'}
                        </div>
                        {device.model && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {device.model}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-700 dark:text-gray-300">
                        {device.clamping_range_min || device.clamping_range_max
                          ? `${device.clamping_range_min || 0} – ${device.clamping_range_max || '?'} mm`
                          : '-'}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">
                          {device.total_stock || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {getStatusBadge(device.status)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          to={`/clamping-devices/${device.id}`}
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                        >
                          Details
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={devices.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </>
      )}

      {/* Types Modal */}
      {showTypesModal && (
        <ClampingDeviceTypesModal onClose={() => setShowTypesModal(false)} />
      )}

      {/* Form Modal */}
      {showFormModal && (
        <ClampingDeviceFormModal
          device={editingDevice}
          types={types}
          onClose={(saved) => {
            setShowFormModal(false);
            setEditingDevice(null);
            if (saved) {
              fetchDevices();
              fetchStats();
            }
          }}
        />
      )}
    </div>
  );
}
