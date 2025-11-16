import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Plus, Warehouse, Loader2, ArrowUpDown } from 'lucide-react';
import { useStorageStore } from '../stores/storageStore';
import { useStorageItemsStore } from '../stores/storageItemsStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../components/Toaster';
import CompartmentCard from '../components/storage/CompartmentCard';
import CompartmentForm from '../components/storage/CompartmentForm';
import LocationForm from '../components/storage/LocationForm';

export default function StorageLocationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const {
    currentLocation,
    compartments,
    loading,
    error,
    fetchLocation,
    fetchCompartmentsByLocation,
    deleteLocation,
  } = useStorageStore();
  
  const { storageItems, fetchStorageItems } = useStorageItemsStore();

  const [showEditForm, setShowEditForm] = useState(false);
  const [showCompartmentForm, setShowCompartmentForm] = useState(false);
  const [editingCompartment, setEditingCompartment] = useState(null);
  const [sortBy, setSortBy] = useState('position'); // 'position' or 'name'

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      await fetchLocation(id);
      await fetchCompartmentsByLocation(id);
      // Load all storage items for this location to show contents
      await fetchStorageItems({ location_id: id });
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const handleEdit = () => {
    setShowEditForm(true);
  };

  const handleDelete = async () => {
    if (!currentLocation) return;

    if (
      !window.confirm(
        `Lagerort "${currentLocation.name}" wirklich löschen?\n\nAchtung: Alle zugehörigen Fächer und Lagerartikel werden ebenfalls gelöscht!`
      )
    ) {
      return;
    }

    const result = await deleteLocation(currentLocation.id);
    if (result.success) {
      toast.success('Lagerort erfolgreich gelöscht');
      navigate('/storage');
    } else {
      toast.error(result.error || 'Fehler beim Löschen');
    }
  };

  const handleCreateCompartment = () => {
    setEditingCompartment(null);
    setShowCompartmentForm(true);
  };

  const handleEditCompartment = (compartment) => {
    setEditingCompartment(compartment);
    setShowCompartmentForm(true);
  };

  const handleCompartmentFormClose = () => {
    setShowCompartmentForm(false);
    setEditingCompartment(null);
  };

  const handleCompartmentFormSuccess = async () => {
    setShowCompartmentForm(false);
    setEditingCompartment(null);
    await fetchCompartmentsByLocation(id);
    await fetchStorageItems({ location_id: id });
  };

  const handleLocationFormSuccess = async () => {
    setShowEditForm(false);
    await fetchLocation(id);
  };

  // Get storage items count per compartment
  const getCompartmentItemsCount = (compartmentId) => {
    return storageItems.filter((item) => item.compartment_id === compartmentId).length;
  };

  // Get storage items for a compartment
  const getCompartmentItems = (compartmentId) => {
    return storageItems.filter((item) => item.compartment_id === compartmentId);
  };

  // Sort compartments
  const sortedCompartments = [...compartments].sort((a, b) => {
    if (sortBy === 'position') {
      // Sort by position (nulls last), then by name
      if (a.position === null && b.position === null) return a.name.localeCompare(b.name);
      if (a.position === null) return 1;
      if (b.position === null) return -1;
      return a.position - b.position;
    } else {
      // Sort by name
      return a.name.localeCompare(b.name);
    }
  });

  if (loading && !currentLocation) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (error || !currentLocation) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-md">
            {error || 'Lagerort nicht gefunden'}
          </div>
          <button
            onClick={() => navigate('/storage')}
            className="mt-4 flex items-center gap-2 text-blue-400 hover:text-blue-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  const getLocationTypeText = (type) => {
    const types = {
      cabinet: 'Schrank',
      shelf_unit: 'Regal',
      room: 'Raum',
      area: 'Bereich',
    };
    return types[type] || type;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/storage')}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Übersicht
          </button>

          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Warehouse className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{currentLocation.name}</h1>
                {currentLocation.code && (
                  <p className="text-gray-400 mt-1">{currentLocation.code}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                  <span>{getLocationTypeText(currentLocation.location_type)}</span>
                  {currentLocation.building && <span>• {currentLocation.building}</span>}
                  {currentLocation.floor && <span>• {currentLocation.floor}</span>}
                  {currentLocation.room && <span>• {currentLocation.room}</span>}
                </div>
              </div>
            </div>

            {user?.permissions?.includes('storage.edit') && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Bearbeiten
                </button>
                {user?.permissions?.includes('storage.delete') && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Löschen
                  </button>
                )}
              </div>
            )}
          </div>

          {currentLocation.description && (
            <p className="mt-4 text-gray-300">{currentLocation.description}</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-sm text-gray-400">Fächer/Schubladen</div>
            <div className="text-2xl font-bold text-white mt-1">{compartments.length}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-sm text-gray-400">Lagerartikel</div>
            <div className="text-2xl font-bold text-white mt-1">{storageItems.length}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-sm text-gray-400">Belegung</div>
            <div className="text-2xl font-bold text-white mt-1">
              {compartments.length > 0
                ? `${Math.round((storageItems.length / compartments.length) * 10) / 10} Ø/Fach`
                : '0'}
            </div>
          </div>
        </div>

        {/* Compartments Section */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          {/* Section Header */}
          <div className="px-6 py-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Fächer & Schubladen ({compartments.length})
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Verwalten Sie die einzelnen Fächer dieses Lagerorts
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Sort Toggle */}
                <button
                  onClick={() => setSortBy(sortBy === 'position' ? 'name' : 'position')}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors text-sm"
                  title="Sortierung umschalten"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  {sortBy === 'position' ? 'Nach Position' : 'Nach Name'}
                </button>

                {user?.permissions?.includes('storage.create') && (
                  <button
                    onClick={handleCreateCompartment}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Neues Fach
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Compartments List */}
          <div className="p-6">
            {sortedCompartments.length === 0 ? (
              <div className="text-center py-12">
                <Warehouse className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">Keine Fächer vorhanden</p>
                {user?.permissions?.includes('storage.create') && (
                  <button
                    onClick={handleCreateCompartment}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Erstes Fach erstellen
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedCompartments.map((compartment) => (
                  <CompartmentCard
                    key={compartment.id}
                    compartment={compartment}
                    items={getCompartmentItems(compartment.id)}
                    itemsCount={getCompartmentItemsCount(compartment.id)}
                    onEdit={handleEditCompartment}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Forms */}
        {showEditForm && (
          <LocationForm
            location={currentLocation}
            onClose={() => setShowEditForm(false)}
            onSuccess={handleLocationFormSuccess}
          />
        )}

        {showCompartmentForm && (
          <CompartmentForm
            compartment={editingCompartment}
            locationId={id}
            locationName={currentLocation.name}
            onClose={handleCompartmentFormClose}
            onSuccess={handleCompartmentFormSuccess}
          />
        )}
      </div>
    </div>
  );
}
