// frontend/src/components/ProgramUploadForm.jsx
import { useState, useEffect } from 'react';
import { useProgramsStore } from '../stores/programsStore';
import { toast } from './Toaster';

export default function ProgramUploadForm({ operationId, program, isNewRevision, onClose, onSuccess }) {
  const { uploadProgram, uploadRevision, updateProgram, loading } = useProgramsStore();
  
  const [formData, setFormData] = useState({
    program_name: '',
    description: '',
    version_type: 'patch', // NEU: Woche 7
    change_log: '',        // NEU: Woche 7
  });
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState({});

  // Determine mode
  const isEditMode = program && !isNewRevision;
  const isNewRevisionMode = program && isNewRevision;
  const isNewProgramMode = !program && !isNewRevision;

  // Load existing program data for edit/revision mode
  useEffect(() => {
    if (program) {
      setFormData({
        program_name: program.program_name || '',
        description: program.description || '',
        version_type: 'patch',
        change_log: '',
      });
    }
  }, [program]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill program name from filename if empty
      if (!formData.program_name) {
        setFormData(prev => ({
          ...prev,
          program_name: file.name
        }));
      }
      // Clear file error
      if (errors.file) {
        setErrors(prev => ({ ...prev, file: null }));
      }
    }
  };

  const validate = () => {
    const newErrors = {};

    // Program name nur bei neuem Programm erforderlich (nicht bei Revision oder Edit)
    if (isNewProgramMode && !formData.program_name?.trim()) {
      newErrors.program_name = 'Programm-Name ist erforderlich';
    }

    // File erforderlich bei neuem Programm oder neuer Revision
    if ((isNewProgramMode || isNewRevisionMode) && !selectedFile) {
      newErrors.file = 'Bitte wählen Sie eine Datei aus';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    try {
      if (isEditMode) {
        // Edit mode - only update metadata
        await updateProgram(program.id, formData);
        toast.success('Programm erfolgreich aktualisiert');
      } else if (isNewRevisionMode) {
        // New Revision mode - upload new version
        const data = new FormData();
        data.append('file', selectedFile);
        if (formData.version_type) {
          data.append('version_type', formData.version_type);
        }
        if (formData.change_log?.trim()) {
          data.append('comment', formData.change_log.trim());
        }

        await uploadRevision(program.id, data, setUploadProgress);
        toast.success(`Neue Version erfolgreich hochgeladen`);
      } else {
        // New Program mode - upload file with metadata
        const data = new FormData();
        data.append('file', selectedFile);
        data.append('operation_id', operationId);
        data.append('program_name', formData.program_name.trim());
        if (formData.description?.trim()) {
          data.append('description', formData.description.trim());
        }

        await uploadProgram(data, setUploadProgress);
        toast.success('Programm erfolgreich hochgeladen');
      }
      
      onSuccess();
    } catch (error) {
      toast.error(error.message || 'Fehler beim Speichern');
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Programm bearbeiten' : 
             isNewRevisionMode ? 'Neue Version hochladen' : 
             'Programm hochladen'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* File Upload (only in create mode) */}
          {!isEditMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Datei <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                      <span>Datei auswählen</span>
                      <input
                        id="file-upload"
                        name="file"
                        type="file"
                        className="sr-only"
                        onChange={handleFileChange}
                        accept=".nc,.mpf,.cnc,.gcode,.gc,.iso,.h,.i,.din,.spf,.sub,.txt,.text,.tap"
                      />
                    </label>
                    <p className="pl-1">oder per Drag & Drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    NC, MPF, ISO, G-Code (max. 100MB)
                  </p>
                </div>
              </div>
              
              {/* Selected File Info */}
              {selectedFile && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-600">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              
              {errors.file && (
                <p className="mt-2 text-sm text-red-600">{errors.file}</p>
              )}
            </div>
          )}

          {/* Program Name */}
          <div>
            <label htmlFor="program_name" className="block text-sm font-medium text-gray-700 mb-2">
              Programm-Name {isNewProgramMode && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              id="program_name"
              name="program_name"
              value={formData.program_name}
              onChange={handleChange}
              readOnly={isNewRevisionMode}
              disabled={isNewRevisionMode}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.program_name ? 'border-red-500' : 
                isNewRevisionMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 
                'border-gray-300'
              }`}
              placeholder="z.B. KONTUR_V1"
            />
            {errors.program_name && (
              <p className="mt-1 text-sm text-red-600">{errors.program_name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Beschreibung
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              readOnly={isNewRevisionMode}
              disabled={isNewRevisionMode}
              rows={3}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isNewRevisionMode ? 'bg-gray-100 text-gray-600 cursor-not-allowed border-gray-300' : 'border-gray-300'
              }`}
              placeholder="Optionale Beschreibung des Programms..."
            />
          </div>

          {/* Version Type (nur bei neuer Revision) */}
          {isNewRevisionMode && (
            <div>
              <label htmlFor="version_type" className="block text-sm font-medium text-gray-700 mb-2">
                Versions-Typ
              </label>
              <select
                id="version_type"
                name="version_type"
                value={formData.version_type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="patch">Patch (1.0.0 → 1.0.1) - Kleine Optimierung</option>
                <option value="minor">Minor (1.0.0 → 1.1.0) - Werkzeugwechsel</option>
                <option value="major">Major (1.0.0 → 2.0.0) - Neue Strategie</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Wähle den Typ der Änderung für die Versionsnummer
              </p>
            </div>
          )}

          {/* Change Log (nur bei neuer Revision) */}
          {isNewRevisionMode && (
            <div>
              <label htmlFor="change_log" className="block text-sm font-medium text-gray-700 mb-2">
                Änderungsprotokoll
              </label>
              <textarea
                id="change_log"
                name="change_log"
                value={formData.change_log}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Was wurde in dieser Version geändert? (z.B. Werkzeug T03 durch T05 ersetzt)"
              />
            </div>
          )}

          {/* Upload Progress Bar */}
          {loading && uploadProgress > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Uploading...</span>
                <span className="text-sm font-medium text-blue-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {isEditMode ? 'Speichern...' : 'Hochladen...'}
                </>
              ) : (
                <>
                  {isEditMode ? 'Speichern' : 'Hochladen'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
