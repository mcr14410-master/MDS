import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useClampingDevicesStore } from '../stores/clampingDevicesStore';
import ClampingDeviceTypesModal from '../components/clampingDevices/ClampingDeviceTypesModal';
import ClampingDeviceFormModal from '../components/clampingDevices/ClampingDeviceFormModal';

export default function ClampingDevicesPage() {
  const { 
    devices, 
    types, 
    stats, 
    loading, 
    fetchDevices, 
    fetchTypes, 
    fetchStats 
  } = useClampingDevicesStore();
  
  const [showTypesModal, setShowTypesModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [filters, setFilters] = useState({
    type_id: '',
    status: '',
    search: '',
  });

  useEffect(() => {
    fetchTypes();
    fetchStats();
    fetchDevices();
  }, []);

  useEffect(() => {
    const activeFilters = {};
    if (filters.type_id) activeFilters.type_id = filters.type_id;
    if (filters.status) activeFilters.status = filters.status;
    if (filters.search) activeFilters.search = filters.search;
    
    fetchDevices(activeFilters);
  }, [filters]);

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      in_repair: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      retired: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-500',
    };
    const labels = {
      active: 'Aktiv',
      in_repair: 'In Reparatur',
      retired: 'Ausgemustert',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badges[status] || badges.active}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Spannmittel
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Verwaltung von Schraubstöcken, Spannzangen, Vorrichtungen
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTypesModal(true)}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Typen verwalten
          </button>
          <button
            onClick={() => {
              setEditingDevice(null);
              setShowFormModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Neues Spannmittel
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Gesamt</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-green-600">{stats.active || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Aktiv</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-orange-600">{stats.in_repair || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">In Reparatur</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-gray-500">{stats.retired || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Ausgemustert</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Suche
            </label>
            <input
              type="text"
              placeholder="Name, Inventar-Nr., Hersteller..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Typ
            </label>
            <select
              value={filters.type_id}
              onChange={(e) => setFilters({ ...filters, type_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle Typen</option>
              {types.filter(t => t.is_active).map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="in_repair">In Reparatur</option>
              <option value="retired">Ausgemustert</option>
            </select>
          </div>
        </div>
      </div>

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
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
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
              {devices.map((device) => (
                <tr 
                  key={device.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {device.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {device.inventory_number}
                    </div>
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
                    {device.clamping_range_min || device.clamping_range_max ? (
                      `${device.clamping_range_min || 0} - ${device.clamping_range_max || '?'} mm`
                    ) : '-'}
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
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
