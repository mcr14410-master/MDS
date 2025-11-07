// frontend/src/pages/PartDetailPage.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePartsStore } from '../stores/partsStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../components/Toaster';
import OperationsList from '../components/OperationsList';

export default function PartDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentPart, loading, error, fetchPart, deletePart } = usePartsStore();
  const { hasPermission } = useAuthStore();
  const [activeTab, setActiveTab] = useState('details'); // 'details' or 'operations'

  useEffect(() => {
    if (id) {
      fetchPart(id);
    }
  }, [id, fetchPart]);

  const handleDelete = async () => {
    if (!window.confirm('Bist du sicher, dass du dieses Bauteil löschen möchtest?')) {
      return;
    }

    try {
      await deletePart(id);
      toast.success('Bauteil erfolgreich gelöscht');
      navigate('/parts');
    } catch (err) {
      toast.error(err.message || 'Fehler beim Löschen');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Lade Bauteil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Fehler</h2>
          <p className="text-red-600 dark:text-red-300">{error}</p>
          <Link
            to="/parts"
            className="mt-4 inline-block text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
          >
            ← Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  if (!currentPart) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Nicht gefunden</h2>
          <p className="text-yellow-600 dark:text-yellow-300">Bauteil wurde nicht gefunden.</p>
          <Link
            to="/parts"
            className="mt-4 inline-block text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300 font-medium"
          >
            ← Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const part = currentPart;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/parts"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center gap-2 mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Zurück zur Übersicht
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{part.part_number}</h1>
            <p className="mt-1 text-lg text-gray-600 dark:text-gray-400">{part.part_name}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                part.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : part.status === 'draft'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {part.status === 'active' ? 'Aktiv' : part.status === 'draft' ? 'Entwurf' : part.status}
            </span>
            
            {hasPermission('part.update') && (
              <Link
                to={`/parts/${id}/edit`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Bearbeiten
              </Link>
            )}
            
            {hasPermission('part.delete') && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Löschen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex gap-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('operations')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'operations'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Arbeitsgänge
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Card */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Bauteil-Details</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Bauteilnummer
                  </label>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{part.part_number}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Bezeichnung
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{part.part_name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Kunde
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{part.customer_name || '-'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Revision
                  </label>
                  <p className="text-gray-900 dark:text-gray-100 font-mono">{part.revision || 'A'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Material
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{part.material || '-'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Abmessungen
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{part.dimensions || '-'}</p>
                </div>
              </div>

              {part.description && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Beschreibung
                  </label>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{part.description}</p>
                </div>
              )}

              {part.notes && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Notizen
                  </label>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{part.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Meta Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Metadaten</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Erstellt am
                  </label>
                  <p className="text-gray-900 dark:text-gray-100 text-sm">
                    {new Date(part.created_at).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Zuletzt geändert
                  </label>
                  <p className="text-gray-900 dark:text-gray-100 text-sm">
                    {new Date(part.updated_at).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                
                {part.updated_by && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Geändert von
                    </label>
                    <p className="text-gray-900 dark:text-gray-100 text-sm">{part.updated_by}</p>
                  </div>
                )}
              </div>
            </div>

            {/* CAD File Card */}
            {part.cad_file_path && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">CAD-Datei</h3>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{part.cad_file_path}</span>
                </div>
              </div>
            )}

            {/* Quick Actions Card */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-4">Schnellaktionen</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setActiveTab('operations')}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-left text-sm font-medium border border-gray-200 dark:border-gray-600"
                >
                  📋 Arbeitsgänge anzeigen
                </button>
                <button
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-left text-sm font-medium border border-gray-200 dark:border-gray-600"
                  disabled
                >
                  💾 Programme anzeigen
                </button>
                <button
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-left text-sm font-medium border border-gray-200 dark:border-gray-600"
                  disabled
                >
                  📝 Historie anzeigen
                </button>
              </div>
              <p className="mt-3 text-xs text-blue-600 dark:text-blue-400">
                Programme & Historie kommen in Woche 6+
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Operations Tab */
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <OperationsList partId={id} />
        </div>
      )}
    </div>
  );
}
