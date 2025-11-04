// frontend/src/pages/PartDetailPage.jsx
import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePartsStore } from '../stores/partsStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../components/Toaster';

export default function PartDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentPart, loading, error, fetchPart, deletePart } = usePartsStore();
  const { hasPermission } = useAuthStore();

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
          <p className="mt-4 text-gray-600">Lade Bauteil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Fehler</h2>
          <p className="text-red-600">{error}</p>
          <Link
            to="/parts"
            className="mt-4 inline-block text-red-600 hover:text-red-800 font-medium"
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
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Nicht gefunden</h2>
          <p className="text-yellow-600">Bauteil wurde nicht gefunden.</p>
          <Link
            to="/parts"
            className="mt-4 inline-block text-yellow-600 hover:text-yellow-800 font-medium"
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
          className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Zurück zur Übersicht
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{part.part_number}</h1>
            <p className="mt-1 text-lg text-gray-600">{part.part_name}</p>
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

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info Card */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Bauteil-Details</h2>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Bauteilnummer
                </label>
                <p className="text-gray-900 font-medium">{part.part_number}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Bezeichnung
                </label>
                <p className="text-gray-900">{part.part_name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Kunde
                </label>
                <p className="text-gray-900">{part.customer_name || '-'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Revision
                </label>
                <p className="text-gray-900 font-mono">{part.revision || 'A'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Material
                </label>
                <p className="text-gray-900">{part.material || '-'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Abmessungen
                </label>
                <p className="text-gray-900">{part.dimensions || '-'}</p>
              </div>
            </div>

            {part.description && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Beschreibung
                </label>
                <p className="text-gray-700 whitespace-pre-wrap">{part.description}</p>
              </div>
            )}

            {part.notes && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Notizen
                </label>
                <p className="text-gray-700 whitespace-pre-wrap">{part.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Meta Info Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadaten</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Erstellt am
                </label>
                <p className="text-gray-900 text-sm">
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
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Zuletzt geändert
                </label>
                <p className="text-gray-900 text-sm">
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
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Geändert von
                  </label>
                  <p className="text-gray-900 text-sm">{part.updated_by}</p>
                </div>
              )}
            </div>
          </div>

          {/* CAD File Card */}
          {part.cad_file_path && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">CAD-Datei</h3>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-600 truncate">{part.cad_file_path}</span>
              </div>
            </div>
          )}

          {/* Quick Actions Card */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Schnellaktionen</h3>
            <div className="space-y-2">
              <button
                className="w-full px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-left text-sm font-medium border border-gray-200"
                disabled
              >
                📋 Arbeitsgänge anzeigen
              </button>
              <button
                className="w-full px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-left text-sm font-medium border border-gray-200"
                disabled
              >
                💾 Programme anzeigen
              </button>
              <button
                className="w-full px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-left text-sm font-medium border border-gray-200"
                disabled
              >
                📝 Historie anzeigen
              </button>
            </div>
            <p className="mt-3 text-xs text-blue-600">
              Diese Features kommen in Woche 5+
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
