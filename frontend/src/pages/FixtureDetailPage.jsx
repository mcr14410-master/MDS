import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from '../utils/axios';
import { useFixturesStore } from '../stores/fixturesStore';
import { toast } from '../components/Toaster';
import AuthImage from '../components/common/AuthImage';
import ImageLightbox from '../components/common/ImageLightbox';
import FixtureFormModal from '../components/fixtures/FixtureFormModal';
import FixtureStorageSection from '../components/fixtures/FixtureStorageSection';
import FixtureDocumentsSection from '../components/fixtures/FixtureDocumentsSection';

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

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('de-DE');
};

export default function FixtureDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    currentFixture,
    types,
    loading,
    fetchFixture,
    fetchTypes,
    updateFixtureStatus,
    deleteFixture,
    clearCurrentFixture,
  } = useFixturesStore();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Dokumente für Foto-Preview (Sidebar)
  const [documents, setDocuments] = useState([]);
  const [lightboxDoc, setLightboxDoc] = useState(null);

  useEffect(() => {
    fetchFixture(id);
    fetchTypes();
    return () => clearCurrentFixture();
  }, [id]);

  const loadDocuments = async () => {
    try {
      const res = await axios.get(`/api/fixtures/${id}/documents`);
      setDocuments(res.data.data || []);
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  useEffect(() => {
    if (id) loadDocuments();
  }, [id]);

  // Hauptbild ermitteln: is_primary=true + image mime, sonst erstes Bild
  const primaryImage = useMemo(() => {
    const images = documents.filter(d => d.mime_type?.startsWith('image/'));
    return images.find(d => d.is_primary) || images[0] || null;
  }, [documents]);

  const handleStatusChange = async () => {
    try {
      await updateFixtureStatus(id, newStatus);
      toast.success('Status aktualisiert');
      setShowStatusModal(false);
      fetchFixture(id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Ändern des Status');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteFixture(id);
      toast.success('Vorrichtung gelöscht');
      navigate('/fixtures');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Löschen');
      setDeleting(false);
    }
  };

  if (loading || !currentFixture) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/fixtures')}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex-shrink-0"
            title="Zurück zur Übersicht"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-mono truncate">
              {currentFixture.fixture_number}
            </h1>
            {currentFixture.name && (
              <p className="text-gray-600 dark:text-gray-400 truncate">{currentFixture.name}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusColors[currentFixture.status]}`}>
            {statusLabels[currentFixture.status]}
          </span>
          <button
            onClick={() => setShowEditModal(true)}
            className="px-3 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Bearbeiten
          </button>
          <button
            onClick={() => {
              setNewStatus(currentFixture.status);
              setShowStatusModal(true);
            }}
            className="px-3 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Status ändern
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-gray-300 dark:border-gray-600"
            title="Vorrichtung löschen"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
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
                <span className="text-sm text-gray-500 dark:text-gray-400">Vorrichtungs-Nr.</span>
                <p className="font-medium text-gray-900 dark:text-white font-mono">{currentFixture.fixture_number}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Typ</span>
                <p className="font-medium text-gray-900 dark:text-white">{currentFixture.type_name}</p>
              </div>
              {currentFixture.name && (
                <div className="col-span-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Bezeichnung</span>
                  <p className="font-medium text-gray-900 dark:text-white">{currentFixture.name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Zuordnungen */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Zuordnungen
            </h2>

            <div className="space-y-4">
              {/* Bauteil */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Bauteil</span>
                  {currentFixture.part_number ? (
                    <Link
                      to={`/parts/${currentFixture.part_id}`}
                      className="block font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      {currentFixture.part_number}
                      {currentFixture.part_name && (
                        <span className="text-gray-500 dark:text-gray-400 ml-2">{currentFixture.part_name}</span>
                      )}
                    </Link>
                  ) : (
                    <p className="text-gray-400 dark:text-gray-500">Nicht zugeordnet</p>
                  )}
                </div>
              </div>

              {/* Operation */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Operation</span>
                  {currentFixture.operation_name ? (
                    <p className="font-medium text-gray-900 dark:text-white">
                      {currentFixture.op_number}: {currentFixture.operation_name}
                    </p>
                  ) : (
                    <p className="text-gray-400 dark:text-gray-500">Nicht zugeordnet</p>
                  )}
                </div>
              </div>

              {/* Maschine */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Maschine</span>
                  {currentFixture.machine_name ? (
                    <Link
                      to={`/machines/${currentFixture.machine_id}`}
                      className="block font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      {currentFixture.machine_code && <span className="font-mono">{currentFixture.machine_code}: </span>}
                      {currentFixture.machine_name}
                    </Link>
                  ) : (
                    <p className="text-gray-400 dark:text-gray-500">Nicht zugeordnet</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Lagerort-Sektion */}
          <FixtureStorageSection fixture={currentFixture} onUpdate={() => fetchFixture(id)} />

          {/* Dokumente-Sektion */}
          <FixtureDocumentsSection
            fixture={currentFixture}
            onUpdate={() => {
              fetchFixture(id);
              loadDocuments();
            }}
          />

          {/* Bemerkungen */}
          {currentFixture.notes && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Bemerkungen
              </h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{currentFixture.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Foto-Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Foto
            </h2>
            {primaryImage ? (
              <button
                type="button"
                onClick={() => setLightboxDoc(primaryImage)}
                className="block w-full aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 hover:ring-2 hover:ring-indigo-500 transition-all group relative"
                title="Vergrößern"
              >
                <AuthImage
                  apiPath={`/api/fixtures/documents/${primaryImage.id}/view`}
                  alt={primaryImage.file_name}
                  className="w-full h-full object-cover"
                  placeholderClassName="w-full h-full"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center pointer-events-none">
                  <svg className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </button>
            ) : (
              <div className="aspect-square rounded-lg bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">Kein Foto gesetzt</span>
                <span className="text-xs mt-1">In Dokumenten als Hauptbild markieren</span>
              </div>
            )}
          </div>

          {/* Bestand */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Bestand
            </h2>

            <div className="text-center py-4">
              <div className="text-4xl font-bold text-gray-900 dark:text-white">
                {parseInt(currentFixture.total_stock) || 0}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                an {currentFixture.storage_location_count || 0} Lagerort(en)
              </div>
            </div>
          </div>

          {/* Meta Info */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            {currentFixture.created_at && (
              <p>
                Erstellt: {formatDateTime(currentFixture.created_at)}
                {currentFixture.created_by_name && ` von ${currentFixture.created_by_name}`}
              </p>
            )}
            {currentFixture.updated_at && (
              <p>
                Aktualisiert: {formatDateTime(currentFixture.updated_at)}
                {currentFixture.updated_by_name && ` von ${currentFixture.updated_by_name}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <FixtureFormModal
          fixture={currentFixture}
          types={types}
          onClose={(saved) => {
            setShowEditModal(false);
            if (saved) fetchFixture(id);
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
                      className="text-indigo-600"
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
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75"
              onClick={() => !deleting && setShowDeleteModal(false)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Vorrichtung löschen?
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Möchtest du die Vorrichtung <span className="font-mono font-medium">{currentFixture.fixture_number}</span>
                    {currentFixture.name && <> – <span className="font-medium">{currentFixture.name}</span></>} wirklich löschen?
                    Diese Aktion kann nicht rückgängig gemacht werden.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Lösche...' : 'Löschen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxDoc && (
        <ImageLightbox
          isOpen={!!lightboxDoc}
          onClose={() => setLightboxDoc(null)}
          apiPath={`/api/fixtures/documents/${lightboxDoc.id}/view`}
          alt={lightboxDoc.file_name}
          caption={lightboxDoc.file_name}
          metadata={lightboxDoc.description ? <span>{lightboxDoc.description}</span> : null}
        />
      )}
    </div>
  );
}
