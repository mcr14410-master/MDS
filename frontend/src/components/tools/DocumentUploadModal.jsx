import { useState, useRef } from 'react';
import { X, Upload, FileText, Image, Box, File, Archive, AlertCircle } from 'lucide-react';
import { useToolDocumentsStore } from '../../stores/toolDocumentsStore';

/**
 * DocumentUploadModal Component
 * Modal for uploading documents with drag & drop support
 */
export default function DocumentUploadModal({ toolId, onClose, onSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('datasheet');
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [imagePreview, setImagePreview] = useState(null); // NEW: Image preview URL
  const fileInputRef = useRef(null);

  const { uploading, uploadDocument, formatFileSize, getFileIcon } = useToolDocumentsStore();

  const documentTypes = [
    { value: 'datasheet', label: 'Datenblatt' },
    { value: 'drawing', label: 'Zeichnung' },
    { value: 'certificate', label: 'Zertifikat' },
    { value: 'manual', label: 'Handbuch' },
    { value: 'photo', label: 'Foto' },
    { value: 'other', label: 'Sonstiges' },
  ];

  const maxFileSize = 50 * 1024 * 1024; // 50MB

  const allowedExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp',
    '.dxf', '.dwg', '.step', '.stp', '.iges', '.igs',
    '.zip', '.rar', '.7z',
    '.txt', '.csv'
  ];

  const validateFile = (file) => {
    // Check file size
    if (file.size > maxFileSize) {
      return 'Datei ist zu groß (max. 50MB)';
    }

    // Check file type
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      return `Dateityp nicht erlaubt. Erlaubte Typen: ${allowedExtensions.join(', ')}`;
    }

    return null;
  };

  const handleFileSelect = (file) => {
    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      setSelectedFile(null);
      setImagePreview(null);
      return;
    }

    setValidationError('');
    setSelectedFile(file);

    // Generate image preview if file is an image
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      setValidationError('Bitte wählen Sie eine Datei aus');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('document_type', documentType);
    formData.append('description', description);

    const result = await uploadDocument(toolId, formData);

    if (result.success) {
      onSuccess(result);
    } else {
      setValidationError(result.error);
    }
  };

  const getFileIconComponent = () => {
    if (!selectedFile) return Upload;

    const iconName = getFileIcon(selectedFile.type, selectedFile.name);
    const icons = {
      FileText,
      Image,
      Box,
      Archive,
      File,
    };
    return icons[iconName] || File;
  };

  const FileIcon = getFileIconComponent();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900/75 transition-opacity" onClick={onClose}></div>

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dokument hochladen</h3>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Document Type */}
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                Dokumenttyp
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {documentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* File Upload Area */}
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                Datei
              </label>

              {/* Drag & Drop Zone */}
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-500/10'
                    : selectedFile
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700/50 hover:border-gray-500'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInputChange}
                  className="hidden"
                  accept={allowedExtensions.join(',')}
                />

                {/* Image Preview */}
                {imagePreview ? (
                  <div>
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="max-w-full max-h-64 mx-auto rounded-lg mb-3"
                    />
                    <p className="text-gray-900 dark:text-white font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {formatFileSize(selectedFile.size)}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setImagePreview(null);
                        setValidationError('');
                      }}
                      className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-300"
                    >
                      Andere Datei wählen
                    </button>
                  </div>
                ) : selectedFile ? (
                  <div>
                    <FileIcon className="w-12 h-12 mx-auto mb-3 text-green-600 dark:text-green-400" />
                    <p className="text-gray-900 dark:text-white font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {formatFileSize(selectedFile.size)}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setValidationError('');
                      }}
                      className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-300"
                    >
                      Andere Datei wählen
                    </button>
                  </div>
                ) : (
                  <div>
                    <FileIcon className="w-12 h-12 mx-auto mb-3 text-gray-500 dark:text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-300 mb-1">
                      Datei hierher ziehen oder klicken zum Auswählen
                    </p>
                    <p className="text-xs text-gray-500">
                      Max. 50MB • PDF, Bilder, CAD-Dateien, Archive
                    </p>
                  </div>
                )}
              </div>

              {/* Validation Error */}
              {validationError && (
                <div className="mt-2 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{validationError}</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Beschreibung (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="z.B. Technisches Datenblatt vom Hersteller"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Wird hochgeladen...' : 'Hochladen'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
