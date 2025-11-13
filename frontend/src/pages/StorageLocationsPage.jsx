import { useEffect, useState } from 'react';
import { useStorageStore } from '../stores/storageStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../components/Toaster';
import { Warehouse, Search, Plus, Filter } from 'lucide-react';
import LocationCard from '../components/storage/LocationCard';
import LocationForm from '../components/storage/LocationForm';

export default function StorageLocationsPage() {
  const { locations, loading, error, fetchLocations, deleteLocation } = useStorageStore();
  const { hasPermission } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    location_type: '',
    item_category: '',
    building: '',
    floor: '',
    room: '',
    is_active: 'true', // Default: nur aktive Lagerorte
  });

  useEffect(() => {
    fetchLocations(filters);
  }, [fetchLocations]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLocations(filters);
  };

  const handleCreate = () => {
    setEditingLocation(null);
    setShowForm(true);
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingLocation(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingLocation(null);
    fetchLocations(filters);
  };

  const handleDelete = async (id, name) => {
    if (
      !window.confirm(
        `Lagerort "${name}" wirklich löschen?\n\nAchtung: Alle zugehörigen Fächer werden ebenfalls gelöscht!`
      )
    ) {
      return;
    }

    const result = await deleteLocation(id);
    if (result.success) {
      toast.success(result.message || `Lagerort "${name}" erfolgreich gelöscht`);
      fetchLocations(filters);
    } else {
      toast.error(result.error || 'Fehler beim Löschen');
    }
  };

  const getLocationTypeText = (type) => {
    const types = {
      cabinet: 'Schrank',
      shelf_unit: 'Regal',
      room: 'Raum',
      area: 'Bereich',
    };
    return types[type] || type;
  };

  const getItemCategoryText = (category) => {
    const categories = {
      tools: 'Werkzeuge',
      fixtures: 'Vorrichtungen',
      clamping_devices: 'Spannmittel',
      measuring_equipment: 'Messmittel',
      consumables: 'Verbrauchsmaterial',
      mixed: 'Gemischt',
    };
    return categories[category] || category;
  };

  const getItemCategoryColor = (category) => {
    const colors = {
      tools: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      fixtures: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      clamping_devices: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      measuring_equipment: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      consumables: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      mixed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  // Group locations by building
  const groupedLocations = locations.reduce((acc, location) => {
    const building = location.building || 'Ohne Gebäude';
    if (!acc[building]) {
      acc[building] = [];
    }
    acc[building].push(location);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <Warehouse className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lagerorte</h1>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Verwalten Sie Schränke, Regale und Lagerräume
          </p>
        </div>
        {hasPermission('storage.create') && (
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Neuer Lagerort
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filter</h2>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Suche nach Name, Code, Beschreibung..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Typ
              </label>
              <select
                value={filters.location_type}
                onChange={(e) => setFilters({ ...filters, location_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Alle Typen</option>
                <option value="cabinet">Schrank</option>
                <option value="shelf_unit">Regal</option>
                <option value="room">Raum</option>
                <option value="area">Bereich</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kategorie
              </label>
              <select
                value={filters.item_category}
                onChange={(e) => setFilters({ ...filters, item_category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Alle Kategorien</option>
                <option value="tools">Werkzeuge</option>
                <option value="fixtures">Vorrichtungen</option>
                <option value="clamping_devices">Spannmittel</option>
                <option value="measuring_equipment">Messmittel</option>
                <option value="consumables">Verbrauchsmaterial</option>
                <option value="mixed">Gemischt</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Gebäude
              </label>
              <input
                type="text"
                placeholder="z.B. Halle A"
                value={filters.building}
                onChange={(e) => setFilters({ ...filters, building: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Etage
              </label>
              <input
                type="text"
                placeholder="z.B. EG"
                value={filters.floor}
                onChange={(e) => setFilters({ ...filters, floor: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Raum
              </label>
              <input
                type="text"
                placeholder="z.B. Fertigung"
                value={filters.room}
                onChange={(e) => setFilters({ ...filters, room: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Active filter and search button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
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
            </div>

            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Suchen
            </button>
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg p-4">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Locations List (Grouped by Building) */}
      {!loading && !error && (
        <div className="space-y-8">
          {Object.keys(groupedLocations).length === 0 ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
              <Warehouse className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Keine Lagerorte gefunden
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Erstellen Sie Ihren ersten Lagerort, um loszulegen.
              </p>
              {hasPermission('storage.create') && (
                <button
                  onClick={handleCreate}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Neuer Lagerort
                </button>
              )}
            </div>
          ) : (
            Object.entries(groupedLocations).map(([building, locs]) => (
              <div key={building}>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{building}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {locs.length} Lagerort{locs.length !== 1 ? 'e' : ''}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {locs.map((location) => (
                    <LocationCard
                      key={location.id}
                      location={location}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      getLocationTypeText={getLocationTypeText}
                      getItemCategoryText={getItemCategoryText}
                      getItemCategoryColor={getItemCategoryColor}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <LocationForm
          location={editingLocation}
          onClose={handleCloseForm}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
