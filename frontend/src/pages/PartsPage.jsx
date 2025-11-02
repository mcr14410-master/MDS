import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { usePartsStore } from '../stores/partsStore';
import { useAuthStore } from '../stores/authStore';

export default function PartsPage() {
  const { parts, loading, error, fetchParts, deletePart } = usePartsStore();
  const { hasPermission } = useAuthStore();
  const [filters, setFilters] = useState({
    search: '',
    status: '',
  });

  useEffect(() => {
    fetchParts();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchParts(filters);
  };

  const handleDelete = async (id, partNumber) => {
    if (window.confirm(`Bauteil ${partNumber} wirklich löschen?`)) {
      const result = await deletePart(id);
      if (result.success) {
        alert('Bauteil erfolgreich gelöscht');
      } else {
        alert(result.error || 'Fehler beim Löschen');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Aktiv';
      case 'draft':
        return 'Entwurf';
      case 'archived':
        return 'Archiviert';
      default:
        return status;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bauteile</h1>
            <p className="mt-1 text-sm text-gray-600">
              Verwalten Sie alle Bauteile im System
            </p>
          </div>
          {hasPermission('part.create') && (
            <Link
              to="/parts/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="mr-2">➕</span>
              Neues Bauteil
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-4">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Suche nach Teilenummer, Beschreibung..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Alle Status</option>
                <option value="draft">Entwurf</option>
                <option value="active">Aktiv</option>
                <option value="archived">Archiviert</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Suchen
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Lade Bauteile...</p>
          </div>
        ) : parts.length === 0 ? (
          /* Empty State */
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <div className="text-5xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Keine Bauteile gefunden
            </h3>
            <p className="text-gray-600">
              {filters.search || filters.status
                ? 'Versuchen Sie andere Filter-Einstellungen.'
                : 'Erstellen Sie Ihr erstes Bauteil.'}
            </p>
          </div>
        ) : (
          /* Parts Table */
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teilenummer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Beschreibung
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revision
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Material
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {parts.map((part) => (
                  <tr key={part.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {part.part_number}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{part.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{part.revision}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          part.status
                        )}`}
                      >
                        {getStatusText(part.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {part.material || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/parts/${part.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Ansehen
                        </Link>
                        {hasPermission('part.update') && (
                          <Link
                            to={`/parts/${part.id}/edit`}
                            className="text-green-600 hover:text-green-900"
                          >
                            Bearbeiten
                          </Link>
                        )}
                        {hasPermission('part.delete') && (
                          <button
                            onClick={() => handleDelete(part.id, part.part_number)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Löschen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Parts Count */}
        {!loading && parts.length > 0 && (
          <div className="text-sm text-gray-600 text-center">
            {parts.length} {parts.length === 1 ? 'Bauteil' : 'Bauteile'} gefunden
          </div>
        )}
      </div>
    </Layout>
  );
}
