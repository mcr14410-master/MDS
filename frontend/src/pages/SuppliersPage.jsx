import { useEffect, useState } from 'react';
import { useSuppliersStore } from '../stores/suppliersStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../components/Toaster';
import SupplierCard from '../components/suppliers/SupplierCard';
import SupplierFormModal from '../components/suppliers/SupplierFormModal';

export default function SuppliersPage() {
  const { suppliers, loading, error, fetchSuppliers, deleteSupplier } = useSuppliersStore();
  const { hasPermission } = useAuthStore();
  
  const [filters, setFilters] = useState({
    search: '',
    is_active: null,
    is_preferred: null,
    sort_by: 'name',
    sort_order: 'asc',
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  useEffect(() => {
    fetchSuppliers(filters);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchSuppliers(filters);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchSuppliers(newFilters);
  };

  const handleCreateNew = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleDelete = async (supplier) => {
    if (!window.confirm(`Lieferant "${supplier.name}" wirklich deaktivieren?`)) {
      return;
    }

    try {
      await deleteSupplier(supplier.id, false); // Soft delete
      toast.success(`Lieferant "${supplier.name}" wurde deaktiviert`);
      fetchSuppliers(filters);
    } catch (err) {
      toast.error(err.message || 'Fehler beim Deaktivieren');
    }
  };

  const handleModalClose = (success) => {
    setIsModalOpen(false);
    setEditingSupplier(null);
    if (success) {
      fetchSuppliers(filters);
    }
  };

  // Active suppliers count
  const activeCount = suppliers.filter(s => s.is_active).length;
  const preferredCount = suppliers.filter(s => s.is_preferred).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Lieferanten
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Verwalten Sie Ihre Lieferanten und deren Artikel
          </p>
          <div className="mt-2 flex gap-4 text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">{activeCount}</span> aktiv
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">{preferredCount}</span> bevorzugt
            </span>
          </div>
        </div>
        {hasPermission('storage.create') && (
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Neuer Lieferant
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search */}
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Suche nach Name, Code, Stadt..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Suchen
            </button>
          </div>

          {/* Filter buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleFilterChange('is_active', filters.is_active === true ? null : true)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filters.is_active === true
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Nur Aktive
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange('is_preferred', filters.is_preferred === true ? null : true)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filters.is_preferred === true
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Nur Bevorzugte
            </button>
            
            {/* Sort */}
            <div className="ml-auto flex gap-2">
              <select
                value={filters.sort_by}
                onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Name</option>
                <option value="supplier_code">Code</option>
                <option value="rating">Bewertung</option>
                <option value="city">Stadt</option>
                <option value="created_at">Erstellt</option>
              </select>
              <button
                type="button"
                onClick={() => handleFilterChange('sort_order', filters.sort_order === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                title={filters.sort_order === 'asc' ? 'Aufsteigend' : 'Absteigend'}
              >
                {filters.sort_order === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Suppliers Grid */}
      {!loading && suppliers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Keine Lieferanten gefunden
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Legen Sie den ersten Lieferanten an.
          </p>
          {hasPermission('storage.create') && (
            <button
              onClick={handleCreateNew}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Neuer Lieferant
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((supplier) => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              onEdit={() => handleEdit(supplier)}
              onDelete={() => handleDelete(supplier)}
              canEdit={hasPermission('storage.edit')}
              canDelete={hasPermission('storage.delete')}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <SupplierFormModal
          supplier={editingSupplier}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
