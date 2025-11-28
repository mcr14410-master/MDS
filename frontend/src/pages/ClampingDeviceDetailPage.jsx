import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useClampingDevicesStore } from '../stores/clampingDevicesStore';
import { toast } from '../components/Toaster';
import ClampingDeviceFormModal from '../components/clampingDevices/ClampingDeviceFormModal';
import ClampingDeviceStorageSection from '../components/clampingDevices/ClampingDeviceStorageSection';
import ClampingDeviceDocumentsSection from '../components/clampingDevices/ClampingDeviceDocumentsSection';

const statusColors = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  in_repair: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  retired: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

const statusLabels = {
  active: 'Aktiv',
  in_repair: 'In Reparatur',
  retired: 'Ausgemustert',
};

export default function ClampingDeviceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    currentDevice, 
    types,
    loading, 
    fetchDevice, 
    fetchTypes,
    updateDeviceStatus,
    deleteDevice,
    clearCurrentDevice 
  } = useClampingDevicesStore();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    fetchDevice(id);
    fetchTypes();
    return () => clearCurrentDevice();
  }, [id]);

  const handleStatusChange = async () => {
    try {
      await updateDeviceStatus(id, newStatus);
      toast.success('Status aktualisiert');
      setShowStatusModal(false);
      fetchDevice(id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Ändern des Status');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Spannmittel wirklich löschen?')) return;
    
    try {
      await deleteDevice(id);
      toast.success('Spannmittel gelöscht');
      navigate('/clamping-devices');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Löschen');
    }
  };

  if (loading || !currentDevice) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <Link to="/clamping-devices" className="hover:text-blue-600">
              Spannmittel
            </Link>
            <span>/</span>
            <span>{currentDevice.inventory_number}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentDevice.name}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[currentDevice.status]}`}>
              {statusLabels[currentDevice.status]}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {currentDevice.type_name}
            </span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Bearbeiten
          </button>
          <button
            onClick={() => {
              setNewStatus(currentDevice.status);
              setShowStatusModal(true);
            }}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Status ändern
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Löschen
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stammdaten */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Stammdaten
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Inventar-Nr.</span>
                <p className="font-medium text-gray-900 dark:text-white">{currentDevice.inventory_number}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Typ</span>
                <p className="font-medium text-gray-900 dark:text-white">{currentDevice.type_name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Hersteller</span>
                <p className="font-medium text-gray-900 dark:text-white">{currentDevice.manufacturer || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Modell</span>
                <p className="font-medium text-gray-900 dark:text-white">{currentDevice.model || '-'}</p>
              </div>
              {currentDevice.machine_name && (
                <div className="col-span-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Zugeordnete Maschine</span>
                  <p className="font-medium text-gray-900 dark:text-white">{currentDevice.machine_name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Technische Daten */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Technische Daten
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {(currentDevice.clamping_range_min !== null || currentDevice.clamping_range_max !== null) && (
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Spannbereich</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {currentDevice.clamping_range_min || 0} - {currentDevice.clamping_range_max || '?'} mm
                  </p>
                </div>
              )}
              {currentDevice.clamping_force && (
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Spannkraft</span>
                  <p className="font-medium text-gray-900 dark:text-white">{currentDevice.clamping_force} kN</p>
                </div>
              )}
              {currentDevice.dimensions && (
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Abmessungen</span>
                  <p className="font-medium text-gray-900 dark:text-white">{currentDevice.dimensions} mm</p>
                </div>
              )}
              {currentDevice.weight && (
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Gewicht</span>
                  <p className="font-medium text-gray-900 dark:text-white">{currentDevice.weight} kg</p>
                </div>
              )}
            </div>
          </div>

          {/* Lagerort-Sektion */}
          <ClampingDeviceStorageSection device={currentDevice} onUpdate={() => fetchDevice(id)} />

          {/* Dokumente-Sektion */}
          <ClampingDeviceDocumentsSection device={currentDevice} onUpdate={() => fetchDevice(id)} />

          {/* Bemerkungen */}
          {currentDevice.notes && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Bemerkungen
              </h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{currentDevice.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Bestand */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Bestand
            </h2>
            
            <div className="text-center py-4">
              <div className="text-4xl font-bold text-gray-900 dark:text-white">
                {currentDevice.total_stock || 0}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                an {currentDevice.storage_location_count || 0} Lagerort(en)
              </div>
            </div>
          </div>

          {/* Beschaffung */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Beschaffung
            </h2>
            
            <div className="space-y-3">
              {currentDevice.purchase_date && (
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Kaufdatum</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(currentDevice.purchase_date).toLocaleDateString('de-DE')}
                  </p>
                </div>
              )}
              {currentDevice.purchase_price && (
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Preis</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {Number(currentDevice.purchase_price).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>
              )}
              {currentDevice.supplier_name && (
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Lieferant</span>
                  <p className="font-medium text-gray-900 dark:text-white">{currentDevice.supplier_name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <ClampingDeviceFormModal
          device={currentDevice}
          types={types}
          onClose={(saved) => {
            setShowEditModal(false);
            if (saved) fetchDevice(id);
          }}
        />
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div 
              className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75"
              onClick={() => setShowStatusModal(false)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Status ändern
              </h3>
              
              <div className="space-y-3">
                {Object.entries(statusLabels).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="radio"
                      name="status"
                      value={value}
                      checked={newStatus === value}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="text-blue-600"
                    />
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[value]}`}>
                      {label}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleStatusChange}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
