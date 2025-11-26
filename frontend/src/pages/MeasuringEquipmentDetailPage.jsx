import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMeasuringEquipmentStore } from '../stores/measuringEquipmentStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../components/Toaster';
import CalibrationFormModal from '../components/measuringEquipment/CalibrationFormModal';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const statusColors = {
  ok: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  due_soon: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  locked: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  in_calibration: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  repair: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

const statusLabels = {
  ok: 'Kalibrierung OK',
  due_soon: 'Kalibrierung fällig',
  overdue: 'Kalibrierung überfällig',
  locked: 'Gesperrt',
  in_calibration: 'In Kalibrierung',
  repair: 'In Reparatur',
  retired: 'Ausgemustert',
  active: 'Aktiv',
};

const calibrationResultColors = {
  passed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  adjusted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  limited: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

const calibrationResultLabels = {
  passed: 'Bestanden',
  failed: 'Nicht bestanden',
  adjusted: 'Justiert',
  limited: 'Eingeschränkt',
};

export default function MeasuringEquipmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const { 
    currentEquipment, 
    loading, 
    fetchEquipmentById, 
    updateEquipmentStatus,
    deleteCalibration,
    clearCurrentEquipment 
  } = useMeasuringEquipmentStore();

  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [editingCalibration, setEditingCalibration] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [lockReason, setLockReason] = useState('');

  useEffect(() => {
    fetchEquipmentById(id);
    return () => clearCurrentEquipment();
  }, [id]);

  const handleStatusChange = async () => {
    try {
      await updateEquipmentStatus(id, newStatus, newStatus === 'locked' ? lockReason : null);
      toast.success(`Status auf "${statusLabels[newStatus]}" geändert`);
      setShowStatusModal(false);
      fetchEquipmentById(id);
    } catch (error) {
      toast.error(error.message || 'Fehler beim Ändern des Status');
    }
  };

  const handleDeleteCalibration = async (calibrationId) => {
    if (!window.confirm('Kalibrierung wirklich löschen? Dies kann nicht rückgängig gemacht werden.')) {
      return;
    }
    try {
      await deleteCalibration(calibrationId, id);
      toast.success('Kalibrierung gelöscht');
    } catch (error) {
      toast.error(error.message || 'Fehler beim Löschen');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('de-DE');
  };

  const handleEditCalibration = (cal) => {
    setEditingCalibration(cal);
    setShowCalibrationModal(true);
  };

  const handleDownloadCertificate = (certId, fileName) => {
    const token = localStorage.getItem('token');
    const url = `${API_BASE_URL}/api/calibrations/certificates/${certId}/download`;
    
    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        a.remove();
      })
      .catch(() => toast.error('Fehler beim Herunterladen'));
  };

  if (loading || !currentEquipment) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const eq = currentEquipment;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/measuring-equipment')}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {eq.inventory_number}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">{eq.name}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusColors[eq.calibration_status] || 'bg-gray-100 text-gray-800'}`}>
            {statusLabels[eq.calibration_status] || eq.calibration_status}
          </span>
          {hasPermission('storage.edit') && (
            <button
              onClick={() => setShowStatusModal(true)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Status ändern
            </button>
          )}
        </div>
      </div>

      {/* Lock Warning */}
      {eq.status === 'locked' && eq.lock_reason && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h3 className="font-medium text-red-800 dark:text-red-200">Messmittel gesperrt</h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">{eq.lock_reason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Stammdaten
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Typ</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">{eq.type_name}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Hersteller</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">
                  {eq.manufacturer || '-'} {eq.model && `/ ${eq.model}`}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Seriennummer</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">{eq.serial_number || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Lagerort</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">
                  {eq.storage_location_code || eq.storage_location_name || '-'}
                </dd>
              </div>
            </div>
          </div>

          {/* Technical Data */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Technische Daten
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {eq.measuring_range_min !== null && eq.measuring_range_max !== null ? (
                <>
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Messbereich</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {eq.measuring_range_min} - {eq.measuring_range_max} {eq.unit}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Auflösung</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {eq.resolution ? `${eq.resolution} ${eq.unit}` : '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Genauigkeit</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {eq.accuracy ? `±${eq.accuracy} ${eq.unit}` : '-'}
                    </dd>
                  </div>
                </>
              ) : eq.nominal_value ? (
                <>
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Nennmaß</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      Ø{eq.nominal_value} {eq.unit}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Toleranzklasse</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {eq.tolerance_class || '-'}
                    </dd>
                  </div>
                </>
              ) : (
                <div className="col-span-4 text-sm text-gray-500 dark:text-gray-400">
                  Keine technischen Daten hinterlegt
                </div>
              )}
            </div>
          </div>

          {/* Calibration History */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Kalibrierungshistorie ({eq.calibration_count || 0})
              </h2>
              {hasPermission('storage.edit') && (
                <button
                  onClick={() => {
                    setEditingCalibration(null);
                    setShowCalibrationModal(true);
                  }}
                  className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Kalibrierung erfassen
                </button>
              )}
            </div>

            {eq.calibrations && eq.calibrations.length > 0 ? (
              <div className="space-y-4">
                {eq.calibrations.map((cal, index) => (
                  <div 
                    key={cal.id}
                    className={`border rounded-lg p-4 ${index === 0 ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${calibrationResultColors[cal.result]}`}>
                          {calibrationResultLabels[cal.result]}
                        </span>
                        <span className="text-sm text-gray-900 dark:text-white font-medium">
                          {formatDate(cal.calibration_date)}
                        </span>
                        {index === 0 && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            Aktuell
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {hasPermission('storage.edit') && (
                          <button
                            onClick={() => handleEditCalibration(cal)}
                            className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            title="Bearbeiten"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        {hasPermission('storage.delete') && (
                          <button
                            onClick={() => handleDeleteCalibration(cal.id)}
                            className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                            title="Löschen"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Gültig bis</span>
                        <p className="text-gray-900 dark:text-white">{formatDate(cal.valid_until)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Dienstleister</span>
                        <p className="text-gray-900 dark:text-white">{cal.provider || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Zertifikat-Nr.</span>
                        <p className="text-gray-900 dark:text-white">{cal.certificate_number || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Kosten</span>
                        <p className="text-gray-900 dark:text-white">
                          {cal.cost ? `${parseFloat(cal.cost).toFixed(2)} €` : '-'}
                        </p>
                      </div>
                    </div>
                    {cal.deviation && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Abweichung: </span>
                        <span className="text-gray-900 dark:text-white">{cal.deviation} {eq.unit}</span>
                      </div>
                    )}
                    {cal.notes && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                        {cal.notes}
                      </p>
                    )}
                    {/* Zertifikate */}
                    {cal.certificates && cal.certificates.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Zertifikate:</span>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {cal.certificates.map(cert => (
                            <button
                              key={cert.id}
                              onClick={() => handleDownloadCertificate(cert.id, cert.file_name)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                              title={`${cert.file_name} herunterladen`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              <span className="truncate max-w-[120px]">{cert.file_name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Erfasst von */}
                    {cal.created_by_name && (
                      <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                        Erfasst von {cal.created_by_name} am {formatDateTime(cal.created_at)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Noch keine Kalibrierungen erfasst
              </p>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Calibration Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Kalibrierung
            </h3>
            <div className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Intervall</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">
                  {eq.calibration_interval_months} Monate
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Letzte Kalibrierung</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(eq.last_calibration_date)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Nächste Kalibrierung</dt>
                <dd className={`text-sm font-medium ${
                  eq.days_until_calibration < 0 
                    ? 'text-red-600 dark:text-red-400' 
                    : eq.days_until_calibration <= 30 
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-gray-900 dark:text-white'
                }`}>
                  {formatDate(eq.next_calibration_date)}
                  {eq.days_until_calibration !== null && (
                    <span className="block text-xs mt-1">
                      {eq.days_until_calibration < 0 
                        ? `${Math.abs(eq.days_until_calibration)} Tage überfällig` 
                        : `in ${eq.days_until_calibration} Tagen`}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Kalibrierlabor</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">
                  {eq.calibration_provider || '-'}
                </dd>
              </div>
            </div>
          </div>

          {/* Purchase Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Beschaffung
            </h3>
            <div className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Lieferant</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">
                  {eq.supplier_name || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Kaufdatum</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(eq.purchase_date)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Kaufpreis</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">
                  {eq.purchase_price ? `${parseFloat(eq.purchase_price).toFixed(2)} €` : '-'}
                </dd>
              </div>
            </div>
          </div>

          {/* Notes */}
          {eq.notes && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Bemerkungen
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {eq.notes}
              </p>
            </div>
          )}

          {/* Meta Info */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-xs text-gray-500 dark:text-gray-400">
            <p>Erstellt: {formatDateTime(eq.created_at)}{eq.created_by_name && ` von ${eq.created_by_name}`}</p>
            <p>Aktualisiert: {formatDateTime(eq.updated_at)}{eq.updated_by_name && ` von ${eq.updated_by_name}`}</p>
          </div>
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75" onClick={() => setShowStatusModal(false)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Status ändern
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Neuer Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">-- Status wählen --</option>
                    <option value="active">✓ Aktiv</option>
                    <option value="in_calibration">🔧 In Kalibrierung</option>
                    <option value="repair">🔨 In Reparatur</option>
                    <option value="locked">🔒 Gesperrt</option>
                    <option value="retired">📦 Ausgemustert</option>
                  </select>
                </div>
                {newStatus === 'locked' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Sperrgrund
                    </label>
                    <textarea
                      value={lockReason}
                      onChange={(e) => setLockReason(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Grund für die Sperrung..."
                    />
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowStatusModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleStatusChange}
                    disabled={!newStatus}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Speichern
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calibration Modal */}
      {showCalibrationModal && (
        <CalibrationFormModal
          equipmentId={eq.id}
          calibration={editingCalibration}
          onClose={(success) => {
            setShowCalibrationModal(false);
            setEditingCalibration(null);
            if (success) fetchEquipmentById(id);
          }}
        />
      )}
    </div>
  );
}
