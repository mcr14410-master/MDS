import { useEffect, useState } from 'react';
import { useMachinesStore } from '../stores/machinesStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../components/Toaster';
import MachineCard from '../components/MachineCard';
import MachineForm from '../components/MachineForm';

export default function MachinesPage() {
  const { machines, loading, error, fetchMachines, deleteMachine } = useMachinesStore();
  const { hasPermission } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    machine_type: '',
    control_type: '',
    is_active: 'true', // Default: nur aktive Maschinen
  });

  useEffect(() => {
    fetchMachines(filters);
  }, [fetchMachines]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchMachines(filters);
  };

  const handleCreate = () => {
    setEditingMachine(null);
    setShowForm(true);
  };

  const handleEdit = (machine) => {
    setEditingMachine(machine);
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

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Maschine "${name}" wirklich deaktivieren?`)) {
      return;
    }

    try {
      await deleteMachine(id, false); // Soft delete
      toast.success(`Maschine "${name}" erfolgreich deaktiviert`);
      fetchMachines(filters);
    } catch (err) {
      toast.error(err.message || 'Fehler beim Deaktivieren');
    }
  };

  const getMachineTypeText = (type) => {
    const types = {
      'milling': 'Fräsen',
      'turning': 'Drehen',
      'mill-turn': 'Dreh-Fräsen',
      'grinding': 'Schleifen',
      'edm': 'Erodieren',
    };
    return types[type] || type;
  };

  const getControlTypeColor = (type) => {
    const colors = {
      'Heidenhain': 'bg-blue-100 text-blue-800',
      'Siemens': 'bg-green-100 text-green-800',
      'Fanuc': 'bg-yellow-100 text-yellow-800',
      'Mazatrol': 'bg-purple-100 text-purple-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  // Group machines by type
  const groupedMachines = machines.reduce((acc, machine) => {
    const type = machine.machine_type || 'other';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(machine);
    return acc;
  }, {});

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

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Suche nach Name, Hersteller, Modell..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        </form>

        <div className="mt-4 flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="is_active"
              value="true"
              checked={filters.is_active === 'true'}
              onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Nur aktive</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="is_active"
              value=""
              checked={filters.is_active === ''}
              onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Alle anzeigen</span>
          </label>

          <button
            onClick={handleSearch}
            className="ml-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Suchen
          </button>
        </div>
      </div>

      {/* Error Message */}
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

      {/* Machines List */}
      {!loading && machines.length === 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Keine Maschinen</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {filters.search || filters.machine_type || filters.control_type
              ? 'Keine Maschinen mit diesen Filtern gefunden.'
              : 'Erstellen Sie Ihre erste Maschine.'}
          </p>
        </div>
      )}

      {!loading && machines.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedMachines).map(([type, machinesInType]) => (
            <div key={type}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                {getMachineTypeText(type)}
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({machinesInType.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {machinesInType.map((machine) => (
                  <MachineCard
                    key={machine.id}
                    machine={machine}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    getControlTypeColor={getControlTypeColor}
                  />
                ))}
              </div>
            </div>
          ))}
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
    </div>
  );
}
