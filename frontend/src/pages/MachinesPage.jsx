import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMachinesStore } from '../stores/machinesStore';
import { useAuthStore } from '../stores/authStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import { toast } from '../components/Toaster';
import MachineCard from '../components/MachineCard';
import MachineForm from '../components/MachineForm';
import MachineMasterDataModal from '../components/machines/MachineMasterDataModal';

const MACHINE_TYPES = {
  milling: 'Fräsen',
  turning: 'Drehen',
  'mill-turn': 'Dreh-Fräsen',
  grinding: 'Schleifen',
  edm: 'Erodieren',
  other: 'Sonstige',
};

const MACHINE_TYPE_ORDER = ['milling', 'turning', 'mill-turn', 'grinding', 'edm', 'other'];

const CONTROL_TYPE_COLORS = {
  Heidenhain: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Siemens: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  Fanuc: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  Mazatrol: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

const SORT_OPTIONS = [
  { value: 'name|ASC', label: 'Name (A-Z)' },
  { value: 'name|DESC', label: 'Name (Z-A)' },
  { value: 'manufacturer|ASC', label: 'Hersteller (A-Z)' },
  { value: 'manufacturer|DESC', label: 'Hersteller (Z-A)' },
  { value: 'model|ASC', label: 'Modell (A-Z)' },
  { value: 'model|DESC', label: 'Modell (Z-A)' },
  { value: 'control_type|ASC', label: 'Steuerung (A-Z)' },
  { value: 'control_type|DESC', label: 'Steuerung (Z-A)' },
];

export default function MachinesPage() {
  const { machines, loading, error, fetchMachines } = useMachinesStore();
  const { hasPermission } = useAuthStore();
  const { getViewMode, setViewMode } = usePreferencesStore();
  const viewMode = getViewMode('machines');

  const [showForm, setShowForm] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [showMasterDataModal, setShowMasterDataModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    machine_type: '',
    control_type: '',
    is_active: 'true',
    sort_by: 'name',
    sort_order: 'ASC',
  });

  useEffect(() => {
    const handle = setTimeout(() => {
      fetchMachines(filters);
    }, 150);
    return () => clearTimeout(handle);
  }, [fetchMachines, filters]);

  const handleCreate = () => {
    setEditingMachine(null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingMachine(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingMachine(null);
    fetchMachines(filters);
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      machine_type: '',
      control_type: '',
      is_active: 'true',
      sort_by: 'name',
      sort_order: 'ASC',
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.machine_type ||
    filters.control_type ||
    filters.is_active !== 'true' ||
    filters.sort_by !== 'name' ||
    filters.sort_order !== 'ASC';

  const getMachineTypeText = (type) => MACHINE_TYPES[type] || type || 'Sonstige';

  const getControlTypeColor = (type) =>
    CONTROL_TYPE_COLORS[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';

  const groupedMachines = machines.reduce((acc, machine) => {
    const type = machine.machine_type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(machine);
    return acc;
  }, {});

  const orderedGroups = [
    ...MACHINE_TYPE_ORDER.filter((t) => groupedMachines[t]),
    ...Object.keys(groupedMachines).filter((t) => !MACHINE_TYPE_ORDER.includes(t)),
  ];

  const sortValue = `${filters.sort_by}|${filters.sort_order}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Maschinen</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Verwalten Sie Ihren Maschinenpark
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('machines', 'grid')}
              className={`px-3 py-2 text-sm transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
              title="Grid-Ansicht"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('machines', 'table')}
              className={`px-3 py-2 text-sm transition-colors border-l border-gray-300 dark:border-gray-600 ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
              title="Tabellen-Ansicht"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {hasPermission('machine.create') && (
            <button
              onClick={() => setShowMasterDataModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              title="Maschinentypen und Steuerungen verwalten"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Stammdaten
            </button>
          )}

          {hasPermission('machine.create') && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Neue Maschine
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.15z" />
            </svg>
            <input
              type="text"
              placeholder="Suche nach Name, Hersteller, Modell, Seriennummer..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              value={filters.machine_type}
              onChange={(e) => setFilters({ ...filters, machine_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle Typen</option>
              <option value="milling">Fräsen</option>
              <option value="turning">Drehen</option>
              <option value="mill-turn">Dreh-Fräsen</option>
              <option value="grinding">Schleifen</option>
              <option value="edm">Erodieren</option>
            </select>
          </div>

          <div>
            <select
              value={filters.control_type}
              onChange={(e) => setFilters({ ...filters, control_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle Steuerungen</option>
              <option value="Heidenhain">Heidenhain</option>
              <option value="Siemens">Siemens</option>
              <option value="Fanuc">Fanuc</option>
              <option value="Mazatrol">Mazatrol</option>
            </select>
          </div>

          <div>
            <select
              value={filters.is_active}
              onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="true">Nur aktive</option>
              <option value="false">Nur inaktive</option>
              <option value="">Alle anzeigen</option>
            </select>
          </div>

          <div>
            <select
              value={sortValue}
              onChange={(e) => {
                const [sort_by, sort_order] = e.target.value.split('|');
                setFilters({ ...filters, sort_by, sort_order });
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Sortierung"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Filter zurücksetzen
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg p-4">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Lade Maschinen...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && machines.length === 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Keine Maschinen</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {hasActiveFilters
              ? 'Keine Maschinen mit diesen Filtern gefunden.'
              : 'Erstellen Sie Ihre erste Maschine.'}
          </p>
        </div>
      )}

      {/* Grouped Machines List */}
      {!loading && machines.length > 0 && (
        <div className="space-y-6">
          {orderedGroups.map((type) => {
            const machinesInType = groupedMachines[type];
            return (
              <div key={type}>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  {getMachineTypeText(type)}
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    ({machinesInType.length})
                  </span>
                </h2>

                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {machinesInType.map((machine) => (
                      <MachineCard
                        key={machine.id}
                        machine={machine}
                        getControlTypeColor={getControlTypeColor}
                      />
                    ))}
                  </div>
                ) : (
                  <MachinesTable
                    machines={machinesInType}
                    getControlTypeColor={getControlTypeColor}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <MachineForm
          machine={editingMachine}
          onClose={handleCloseForm}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Master Data Modal (Typen + Steuerungen) */}
      {showMasterDataModal && (
        <MachineMasterDataModal onClose={() => setShowMasterDataModal(false)} />
      )}
    </div>
  );
}

// ============================================================================
// TABLE VIEW (within each type group)
// ============================================================================
function MachinesTable({ machines, getControlTypeColor }) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
          <colgroup>
            <col className="w-[15%]" />
            <col className="w-[30%]" />
            <col className="w-[20%]" />
            <col className="w-[25%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Hersteller / Modell
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Steuerung
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Standort
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {machines.map((machine) => (
              <tr
                key={machine.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <td className="px-4 py-3 truncate">
                  <Link
                    to={`/machines/${machine.id}`}
                    className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    {machine.name}
                  </Link>
                </td>
                <td className="px-4 py-3 truncate text-sm text-gray-700 dark:text-gray-300">
                  {[machine.manufacturer, machine.model].filter(Boolean).join(' ') || '-'}
                </td>
                <td className="px-4 py-3 truncate text-sm">
                  {machine.control_type ? (
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${getControlTypeColor(
                        machine.control_type
                      )}`}
                    >
                      {machine.control_type}
                      {machine.control_version ? ` ${machine.control_version}` : ''}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 truncate text-sm text-gray-700 dark:text-gray-300">
                  {machine.location || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                      machine.is_active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {machine.is_active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
