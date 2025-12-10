import { useState, useEffect } from 'react';
import { useConsumablesStore } from '../../stores/consumablesStore';
import { useStorageStore } from '../../stores/storageStore';
import {
  MapPin,
  Plus,
  Trash2,
  Star,
  X
} from 'lucide-react';

export default function ConsumableLocationsTab({ consumableId }) {
  const { currentConsumable, addLocation, updateLocation, removeLocation } = useConsumablesStore();
  const { locations: storageLocations, fetchLocations, fetchCompartmentsByLocation } = useStorageStore();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCompartment, setSelectedCompartment] = useState('');
  const [compartments, setCompartments] = useState([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  // Load compartments when location changes
  useEffect(() => {
    if (selectedLocation) {
      loadCompartments(selectedLocation);
    } else {
      setCompartments([]);
    }
  }, [selectedLocation]);

  const loadCompartments = async (locationId) => {
    try {
      const data = await fetchCompartmentsByLocation(locationId);
      setCompartments(data || []);
    } catch (err) {
      console.error('Error loading compartments:', err);
      setCompartments([]);
    }
  };

  const locations = currentConsumable?.locations || [];

  const handleAddLocation = async () => {
    if (!selectedCompartment) return;
    
    setSaving(true);
    try {
      await addLocation(consumableId, {
        compartment_id: parseInt(selectedCompartment),
        is_primary: locations.length === 0, // First location is primary
        notes: notes || null
      });
      handleCloseModal();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimary = async (locationId) => {
    try {
      await updateLocation(consumableId, locationId, { is_primary: true });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemove = async (locationId) => {
    if (!confirm('Lagerort wirklich entfernen?')) return;
    
    try {
      await removeLocation(consumableId, locationId);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setSelectedLocation('');
    setSelectedCompartment('');
    setCompartments([]);
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <MapPin className="h-5 w-5 text-amber-500" />
          Lagerorte
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-1 text-sm"
        >
          <Plus className="h-4 w-4" />
          Lagerort hinzufügen
        </button>
      </div>

      {/* Locations List */}
      {locations.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Noch kein Lagerort zugewiesen</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-3 text-amber-600 hover:text-amber-700 dark:text-amber-400 text-sm font-medium"
          >
            + Lagerort hinzufügen
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {locations.map(loc => (
            <div
              key={loc.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                loc.is_primary 
                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  loc.is_primary 
                    ? 'bg-amber-100 dark:bg-amber-900/50' 
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <MapPin className={`h-5 w-5 ${
                    loc.is_primary 
                      ? 'text-amber-600 dark:text-amber-400' 
                      : 'text-gray-500'
                  }`} />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    {loc.location_name} → {loc.compartment_name}
                    {loc.is_primary && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 text-xs rounded-full">
                        <Star className="h-3 w-3" />
                        Haupt
                      </span>
                    )}
                  </div>
                  {loc.notes && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{loc.notes}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!loc.is_primary && (
                  <button
                    onClick={() => handleSetPrimary(loc.id)}
                    className="p-1.5 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 rounded"
                    title="Als Haupt-Lagerort setzen"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => handleRemove(loc.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                  title="Lagerort entfernen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Location Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Lagerort hinzufügen
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Lagerort *
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => {
                    setSelectedLocation(e.target.value);
                    setSelectedCompartment('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Bitte wählen...</option>
                  {storageLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.code && `(${loc.code})`}
                    </option>
                  ))}
                </select>
              </div>

              {selectedLocation && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fach *
                  </label>
                  <select
                    value={selectedCompartment}
                    onChange={(e) => setSelectedCompartment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Bitte wählen...</option>
                    {compartments.map(comp => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bemerkung
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="z.B. Anbruch, Reserve..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAddLocation}
                disabled={!selectedCompartment || saving}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Speichern...' : 'Hinzufügen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
