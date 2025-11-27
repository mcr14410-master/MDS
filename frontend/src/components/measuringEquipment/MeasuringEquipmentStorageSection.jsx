import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Warehouse, MapPin, MoveRight, Plus, X, ChevronDown } from 'lucide-react';
import { useStorageItemsStore } from '../../stores/storageItemsStore';
import { useStorageStore } from '../../stores/storageStore';
import { toast } from '../Toaster';

export default function MeasuringEquipmentStorageSection({ equipmentId, hasPermission }) {
  const { 
    getMeasuringEquipmentStorageLocation, 
    assignMeasuringEquipmentToStorage,
    moveMeasuringEquipment,
    removeMeasuringEquipmentFromStorage
  } = useStorageItemsStore();
  
  const { 
    locations,
    compartments,
    fetchLocations,
    fetchCompartmentsByLocation
  } = useStorageStore();

  const [storageInfo, setStorageInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  
  // Form states
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedCompartmentId, setSelectedCompartmentId] = useState('');
  const [availableCompartments, setAvailableCompartments] = useState([]);

  useEffect(() => {
    loadStorageInfo();
    fetchLocations({}); // Load all, filter in component
  }, [equipmentId]);

  useEffect(() => {
    if (selectedLocationId) {
      loadCompartments(selectedLocationId);
    } else {
      setAvailableCompartments([]);
      setSelectedCompartmentId('');
    }
  }, [selectedLocationId]);

  const loadStorageInfo = async () => {
    setLoading(true);
    try {
      const result = await getMeasuringEquipmentStorageLocation(equipmentId);
      if (result.success) {
        setStorageInfo(result.data);
      }
    } catch (error) {
      console.error('Error loading storage info:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompartments = async (locationId) => {
    try {
      await fetchCompartmentsByLocation(locationId);
      setAvailableCompartments(compartments);
    } catch (error) {
      console.error('Error loading compartments:', error);
    }
  };

  // Filter locations for measuring equipment
  const measuringEquipmentLocations = locations.filter(
    loc => loc.item_category === 'measuring_equipment' || loc.item_category === 'mixed'
  );

  const handleAssign = async () => {
    if (!selectedCompartmentId) {
      toast.error('Bitte ein Fach auswählen');
      return;
    }

    const result = await assignMeasuringEquipmentToStorage(
      equipmentId,
      parseInt(selectedCompartmentId)
    );

    if (result.success) {
      toast.success('Messmittel erfolgreich eingelagert');
      setShowAssignModal(false);
      loadStorageInfo();
    } else {
      toast.error(result.error || 'Fehler beim Einlagern');
    }
  };

  const handleMove = async () => {
    if (!selectedCompartmentId) {
      toast.error('Bitte ein Fach auswählen');
      return;
    }

    const result = await moveMeasuringEquipment(
      equipmentId,
      parseInt(selectedCompartmentId)
    );

    if (result.success) {
      toast.success('Messmittel umgelagert');
      setShowMoveModal(false);
      loadStorageInfo();
    } else {
      toast.error(result.error || 'Fehler beim Umlagern');
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Messmittel wirklich aus dem Lager entfernen?')) {
      return;
    }

    const result = await removeMeasuringEquipmentFromStorage(equipmentId);

    if (result.success) {
      toast.success('Messmittel aus Lager entfernt');
      setStorageInfo(null);
    } else {
      toast.error(result.error || 'Fehler beim Entfernen');
    }
  };

  const resetForm = () => {
    setSelectedLocationId('');
    setSelectedCompartmentId('');
    setAvailableCompartments([]);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          Lagerort wird geladen...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Warehouse className="w-5 h-5 text-blue-500" />
          Lagerort
        </h2>
        
        {hasPermission('storage.edit') && (
          <div className="flex items-center gap-2">
            {storageInfo ? (
              <>
                <button
                  onClick={() => {
                    resetForm();
                    setShowMoveModal(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  <MoveRight className="w-4 h-4" />
                  Umlagern
                </button>
                <button
                  onClick={handleRemove}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                  Entfernen
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  resetForm();
                  setShowAssignModal(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
                Einlagern
              </button>
            )}
          </div>
        )}
      </div>

      {storageInfo ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {storageInfo.location_name}
                {storageInfo.location_code && (
                  <span className="ml-2 text-sm text-gray-500">({storageInfo.location_code})</span>
                )}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                <span className="font-medium">Fach:</span> {storageInfo.compartment_name}
                {storageInfo.compartment_code && ` (${storageInfo.compartment_code})`}
              </div>
              {(storageInfo.building || storageInfo.room) && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {[storageInfo.building, storageInfo.room].filter(Boolean).join(' • ')}
                </div>
              )}
            </div>
          </div>
          
          <Link
            to={`/storage/${storageInfo.compartment_id ? `?highlight=${storageInfo.compartment_id}` : ''}`}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Zur Lagerverwaltung →
          </Link>
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <Warehouse className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Nicht eingelagert</p>
          {hasPermission('storage.edit') && (
            <p className="text-sm mt-1">
              Klicken Sie auf "Einlagern" um das Messmittel einem Lagerort zuzuweisen
            </p>
          )}
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Messmittel einlagern
              </h3>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Lagerort
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Lagerort wählen --</option>
                  {measuringEquipmentLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.code && `(${loc.code})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fach / Bereich
                </label>
                <select
                  value={selectedCompartmentId}
                  onChange={(e) => setSelectedCompartmentId(e.target.value)}
                  disabled={!selectedLocationId}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">-- Fach wählen --</option>
                  {compartments.map(comp => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name} {comp.code && `(${comp.code})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedCompartmentId}
                className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
              >
                Einlagern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Messmittel umlagern
              </h3>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded text-sm">
                <span className="text-gray-500 dark:text-gray-400">Aktueller Lagerort:</span>
                <div className="font-medium text-gray-900 dark:text-white mt-1">
                  {storageInfo?.location_name} → {storageInfo?.compartment_name}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Neuer Lagerort
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Lagerort wählen --</option>
                  {measuringEquipmentLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.code && `(${loc.code})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Neues Fach
                </label>
                <select
                  value={selectedCompartmentId}
                  onChange={(e) => setSelectedCompartmentId(e.target.value)}
                  disabled={!selectedLocationId}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">-- Fach wählen --</option>
                  {compartments.map(comp => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name} {comp.code && `(${comp.code})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setShowMoveModal(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleMove}
                disabled={!selectedCompartmentId}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
              >
                Umlagern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
