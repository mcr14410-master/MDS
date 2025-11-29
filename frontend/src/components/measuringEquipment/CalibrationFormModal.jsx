import { useState, useRef } from 'react';
import { useMeasuringEquipmentStore } from '../../stores/measuringEquipmentStore';
import { toast } from '../Toaster';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function CalibrationFormModal({ equipmentId, calibration, onClose }) {
  const { createCalibration, updateCalibration, uploadCertificate, deleteCertificate } = useMeasuringEquipmentStore();
  const [loading, setLoading] = useState(false);
  const [certificateFile, setCertificateFile] = useState(null);
  const [existingCertificates, setExistingCertificates] = useState(calibration?.certificates || []);
  const fileInputRef = useRef(null);
  
  const isEditMode = !!calibration;
  
  const today = new Date().toISOString().split('T')[0];
  const nextYear = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

  // Format date for input field
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    equipment_id: equipmentId,
    calibration_date: isEditMode ? formatDateForInput(calibration.calibration_date) : today,
    valid_until: isEditMode ? formatDateForInput(calibration.valid_until) : nextYear,
    result: isEditMode ? calibration.result : 'passed',
    provider: isEditMode ? (calibration.provider || '') : '',
    certificate_number: isEditMode ? (calibration.certificate_number || '') : '',
    cost: isEditMode ? (calibration.cost || '') : '',
    deviation: isEditMode ? (calibration.deviation || '') : '',
    notes: isEditMode ? (calibration.notes || '') : '',
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Datei zu groß (max. 10MB)');
        return;
      }
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
        toast.error('Nur PDF, JPEG und PNG erlaubt');
        return;
      }
      setCertificateFile(file);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(f => ({
      ...f,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value
    }));
  };

  const handleDeleteCertificate = async (certId) => {
    if (!window.confirm('Zertifikat wirklich löschen?')) return;
    
    try {
		await deleteCertificate(certId);
		toast.success('Zertifikat gelöscht');
		onClose(true);
    } catch (error) {
      toast.error('Fehler beim Löschen des Zertifikats');
    }
  };

  const handleDownloadCertificate = (certId, fileName) => {
    const token = localStorage.getItem('token');
    const url = `${API_BASE_URL}/api/calibrations/certificates/${certId}/download`;
    
    // Create a temporary link with auth header via fetch
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.calibration_date || !formData.valid_until || !formData.result) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    setLoading(true);
    try {
      const submitData = { ...formData };
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '') {
          submitData[key] = null;
        }
      });

      let calibrationId;

      if (isEditMode) {
        // Update existing calibration
        await updateCalibration(calibration.id, submitData);
        calibrationId = calibration.id;
        
        // Upload new certificate if selected
        if (certificateFile) {
          try {
            await uploadCertificate(calibrationId, certificateFile);
            toast.success('Kalibrierung aktualisiert & Zertifikat hochgeladen');
          } catch (certError) {
            toast.warning('Kalibrierung aktualisiert, aber Zertifikat-Upload fehlgeschlagen');
          }
        } else {
          toast.success('Kalibrierung aktualisiert');
        }
      } else {
        // Create new calibration
        const newCalibration = await createCalibration(submitData);
        calibrationId = newCalibration?.id;
        
        // Upload certificate if selected
        if (certificateFile && calibrationId) {
          try {
            await uploadCertificate(calibrationId, certificateFile);
            toast.success('Kalibrierung mit Zertifikat erfasst');
          } catch (certError) {
            toast.warning('Kalibrierung erfasst, aber Zertifikat-Upload fehlgeschlagen');
            console.error('Certificate upload error:', certError);
          }
        } else {
          toast.success('Kalibrierung erfasst');
        }
      }
      
      onClose(true);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div 
          className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
          onClick={() => onClose(false)}
        />

        <div className="relative inline-block w-full max-w-lg p-6 my-8 text-left align-middle bg-white dark:bg-gray-800 rounded-xl shadow-xl transform transition-all">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isEditMode ? 'Kalibrierung bearbeiten' : 'Kalibrierung erfassen'}
            </h3>
            <button
              onClick={() => onClose(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date & Result */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kalibrierungsdatum *
                </label>
                <input
                  type="date"
                  name="calibration_date"
                  value={formData.calibration_date}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Gültig bis *
                </label>
                <input
                  type="date"
                  name="valid_until"
                  value={formData.valid_until}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Result */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ergebnis *
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'passed', label: 'Bestanden', color: 'green' },
                  { value: 'adjusted', label: 'Justiert', color: 'yellow' },
                  { value: 'limited', label: 'Eingeschränkt', color: 'orange' },
                  { value: 'failed', label: 'Nicht bestanden', color: 'red' },
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData(f => ({ ...f, result: option.value }))}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                      formData.result === option.value
                        ? option.color === 'green' 
                          ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : option.color === 'yellow'
                            ? 'border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : option.color === 'orange'
                              ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Provider & Certificate */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kalibrierlabor
                </label>
                <input
                  type="text"
                  name="provider"
                  value={formData.provider}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Kalibrierlabor Müller"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Zertifikat-Nr.
                </label>
                <input
                  type="text"
                  name="certificate_number"
                  value={formData.certificate_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. KAL-2024-12345"
                />
              </div>
            </div>

            {/* Cost & Deviation */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kosten (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="cost"
                  value={formData.cost}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Abweichung (mm)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  name="deviation"
                  value={formData.deviation}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bemerkungen
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Alle Werte innerhalb Toleranz"
              />
            </div>

            {/* Existing Certificates (Edit Mode) */}
            {isEditMode && existingCertificates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vorhandene Zertifikate
                </label>
                <div className="space-y-2">
                  {existingCertificates.map(cert => (
                    <div 
                      key={cert.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[180px]">
                            {cert.file_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(cert.file_size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadCertificate(cert.id, cert.file_name)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                          title="Herunterladen"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCertificate(cert.id)}
                          className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                          title="Löschen"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certificate Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isEditMode ? 'Neues Zertifikat hinzufügen' : 'Kalibrierzertifikat (PDF/Bild)'}
              </label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  certificateFile 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {certificateFile ? (
                  <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">{certificateFile.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCertificateFile(null);
                      }}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400">
                    <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>Klicken zum Hochladen (max. 10MB)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Warning for failed */}
            {formData.result === 'failed' && !isEditMode && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                <strong>Hinweis:</strong> Bei "Nicht bestanden" wird das Messmittel automatisch gesperrt.
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => onClose(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Speichern...' : (isEditMode ? 'Speichern' : 'Kalibrierung erfassen')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
