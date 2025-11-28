import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStorageStore } from '../../stores/storageStore';
import { toast } from '../Toaster';
import axios from '../../utils/axios';

export default function ClampingDeviceStorageSection({ device, onUpdate }) {
  const { 
    locations,
    fetchLocations,
    fetchCompartmentsByLocation
  } = useStorageStore();

  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form states
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedCompartmentId, setSelectedCompartmentId] = useState('');
  const [availableCompartments, setAvailableCompartments] = useState([]);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchLocations({});
  }, []);

  useEffect(() => {
    if (selectedLocationId) {
      loadCompartments(selectedLocationId);
    } else {
      setAvailableCompartments([]);
      setSelectedCompartmentId('');
    }
  }, [selectedLocationId]);

  const loadCompartments = async (locationId) => {
    try {
      const result = await fetchCompartmentsByLocation(locationId);
      setAvailableCompartments(result || []);
    } catch (error) {
      console.error('Error loading compartments:', error);
    }
  };

  // Alle aktiven Lagerorte anzeigen (Spannmittel können überall gelagert werden)
  const suitableLocations = locations.filter(loc => loc.is_active !== false);

  const handleAddToStorage = async () => {
    if (!selectedCompartmentId || quantity <= 0) {
      toast.error('Bitte Fach und Menge angeben');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/storage/items/clamping-device', {
        clamping_device_id: device.id,
        compartment_id: parseInt(selectedCompartmentId),
        quantity_new: parseInt(quantity),
        quantity_used: 0,
        quantity_reground: 0
      });
      
      toast.success('Spannmittel eingelagert');
      setShowAddModal(false);
      resetForm();
      onUpdate?.();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Fehler beim Einlagern');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromStorage = async (storageItemId) => {
    if (!window.confirm('Diesen Lagerort-Eintrag wirklich entfernen?')) return;

    try {
      await axios.delete(`/api/storage/items/clamping-device/${storageItemId}`);
      toast.success('Lagerort-Eintrag entfernt');
      onUpdate?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Entfernen');
    }
  };

  const handleUpdateQuantity = async (storageItemId, newQuantity) => {
    try {
      await axios.put(`/api/storage/items/${storageItemId}`, {
        quantity_new: newQuantity
      });
      toast.success('Menge aktualisiert');
      onUpdate?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Aktualisieren');
    }
  };

  const resetForm = () => {
    setSelectedLocationId('');
    setSelectedCompartmentId('');
    setAvailableCompartments([]);
    setQuantity(1);
  };

  const storageLocations = device.storage_locations || [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Lagerorte
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Einlagern
        </button>
      </div>

      {storageLocations.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p>Noch nicht eingelagert</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-2 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Jetzt einlagern
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {storageLocations.map((loc) => (
            <div 
              key={loc.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <Link 
                    to={`/api/storage/${loc.location_id || ''}`}
                    className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {loc.location_name} / {loc.compartment_code}
                  </Link>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {loc.compartment_name}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {Number(loc.quantity_new || 0) + Number(loc.quantity_used || 0) + Number(loc.quantity_reground || 0)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Stück</div>
                </div>
                
                <button
                  onClick={() => handleRemoveFromStorage(loc.id)}
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  title="Entfernen"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add to Storage Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div 
              className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75"
              onClick={() => { setShowAddModal(false); resetForm(); }}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Spannmittel einlagern
              </h3>
              
              <div className="space-y-4">
                {/* Location Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Lagerort
                  </label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Lagerort wählen --</option>
                    {suitableLocations.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Compartment Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fach
                  </label>
                  <select
                    value={selectedCompartmentId}
                    onChange={(e) => setSelectedCompartmentId(e.target.value)}
                    disabled={!selectedLocationId}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">-- Fach wählen --</option>
                    {availableCompartments.map(comp => (
                      <option key={comp.id} value={comp.id}>
                        {comp.code} - {comp.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Menge
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleAddToStorage}
                  disabled={loading || !selectedCompartmentId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Speichern...' : 'Einlagern'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
