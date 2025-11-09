// frontend/src/components/SetupSheetPhotos.jsx
import { useState, useRef } from 'react';
import { useSetupSheetsStore } from '../stores/setupSheetsStore';

const PHOTO_TYPES = [
  { value: 'general', label: 'Allgemeines Foto' },
  { value: 'cam_screenshot', label: 'CAM Screenshot' },
  { value: 'real_photo', label: 'Reales Foto' },
  { value: 'fixture', label: 'Vorrichtung' },
  { value: 'clamping', label: 'Spannmittel' },
  { value: 'tool_setup', label: 'Werkzeug-Setup' },
];

export default function SetupSheetPhotos({ setupSheetId, photos = [], onPhotoChange }) {
  const { uploadPhoto, updatePhoto, deletePhoto, uploadProgress } = useSetupSheetsStore();
  const fileInputRef = useRef(null);
  
  const [uploading, setUploading] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [viewingPhoto, setViewingPhoto] = useState(null); // NEU: Für Lightbox
  const [editForm, setEditForm] = useState({
    caption: '',
    photo_type: 'general',
    sort_order: 0,
  });

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Nur JPG, PNG und WebP Bilder erlaubt');
      return;
    }

    // Validate file size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      alert('Datei ist zu groß (max. 20MB)');
      return;
    }

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('photo_type', 'general');
    formData.append('sort_order', photos.length);

    setUploading(true);
    const result = await uploadPhoto(setupSheetId, formData, (progress) => {
      // Progress callback
    });
    setUploading(false);

    if (result.success && onPhotoChange) {
      onPhotoChange();
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (photoId) => {
    if (!confirm('Foto wirklich löschen?')) return;

    const result = await deletePhoto(setupSheetId, photoId);
    if (result.success && onPhotoChange) {
      onPhotoChange();
    }
  };

  const handleEditClick = (photo) => {
    setEditingPhoto(photo.id);
    setEditForm({
      caption: photo.caption || '',
      photo_type: photo.photo_type || 'general',
      sort_order: photo.sort_order || 0,
    });
  };

  const handleEditSubmit = async (photoId) => {
    const result = await updatePhoto(setupSheetId, photoId, editForm);
    if (result.success) {
      setEditingPhoto(null);
      if (onPhotoChange) {
        onPhotoChange();
      }
    }
  };

  const handleEditCancel = () => {
    setEditingPhoto(null);
    setEditForm({ caption: '', photo_type: 'general', sort_order: 0 });
  };

  const getPhotoTypeLabel = (type) => {
    const found = PHOTO_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  };

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mt-4">
            <label htmlFor="photo-upload" className="cursor-pointer">
              <span className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                Foto hochladen
              </span>
              <input
                id="photo-upload"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                disabled={uploading}
                className="sr-only"
              />
            </label>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            JPG, PNG oder WebP bis 20MB
          </p>
          
          {uploading && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Hochladen... {uploadProgress}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Photos Grid */}
      {photos && photos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            .map((photo) => (
              <div
                key={photo.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Photo */}
                <div 
                  className="aspect-w-16 aspect-h-9 bg-gray-100 dark:bg-gray-900 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setViewingPhoto(photo)}
                >
                  <img
                    src={`http://localhost:5000/${photo.file_path}`}
                    alt={photo.caption || 'Setup photo'}
                    className="w-full h-48 object-cover"
                  />
                </div>

                {/* Photo Info */}
                <div className="p-4">
                  {editingPhoto === photo.id ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Beschriftung
                        </label>
                        <input
                          type="text"
                          value={editForm.caption}
                          onChange={(e) =>
                            setEditForm({ ...editForm, caption: e.target.value })
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Typ
                        </label>
                        <select
                          value={editForm.photo_type}
                          onChange={(e) =>
                            setEditForm({ ...editForm, photo_type: e.target.value })
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                          {PHOTO_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Reihenfolge
                        </label>
                        <input
                          type="number"
                          value={editForm.sort_order}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              sort_order: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditSubmit(photo.id)}
                          className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Speichern
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="flex-1 px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="mb-3">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                          {getPhotoTypeLabel(photo.photo_type)}
                        </span>
                        {photo.sort_order > 0 && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            #{photo.sort_order}
                          </span>
                        )}
                      </div>

                      {photo.caption && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                          {photo.caption}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                        <span>{photo.uploaded_by_name || 'Unbekannt'}</span>
                        <span>
                          {new Date(photo.uploaded_at).toLocaleDateString('de-DE')}
                        </span>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditClick(photo)}
                          className="flex-1 px-3 py-1 text-sm text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => handleDelete(photo.id)}
                          className="flex-1 px-3 py-1 text-sm text-red-600 dark:text-red-400 border border-red-600 dark:border-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          Löschen
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <svg
            className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-2">Noch keine Fotos vorhanden</p>
        </div>
      )}

      {/* Lightbox Modal */}
      {viewingPhoto && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setViewingPhoto(null)}
        >
          <button
            onClick={() => setViewingPhoto(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
            aria-label="Schließen"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div 
            className="max-w-7xl max-h-full overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`http://localhost:5000/${viewingPhoto.file_path}`}
              alt={viewingPhoto.caption || 'Setup photo'}
              className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg"
            />
            
            {/* Photo Info Overlay */}
            {viewingPhoto.caption && (
              <div className="mt-4 bg-black/70 text-white p-4 rounded-lg">
                <p className="text-lg">{viewingPhoto.caption}</p>
                <div className="flex items-center justify-between mt-2 text-sm text-gray-300">
                  <span>{getPhotoTypeLabel(viewingPhoto.photo_type)}</span>
                  <span>{viewingPhoto.uploaded_by_name} • {new Date(viewingPhoto.uploaded_at).toLocaleDateString('de-DE')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
