import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCustomersStore } from '../stores/customersStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../components/Toaster';
import CustomerFormModal from '../components/customers/CustomerFormModal';

export default function CustomersPage() {
  const { customers, loading, error, fetchCustomers, deleteCustomer } = useCustomersStore();
  const { hasPermission } = useAuthStore();
  
  const [filters, setFilters] = useState({
    search: '',
    is_active: null,
    sort_by: 'name',
    sort_order: 'asc',
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    fetchCustomers(filters);
  }, []);

  // Live-Filterung mit Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        const newFilters = { ...filters, search: searchInput };
        setFilters(newFilters);
        fetchCustomers(newFilters);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchCustomers(newFilters);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    const newFilters = { ...filters, search: '' };
    setFilters(newFilters);
    fetchCustomers(newFilters);
  };

  const handleCreateNew = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleDelete = async (customer) => {
    if (!window.confirm(`Kunde "${customer.name}" wirklich deaktivieren?`)) {
      return;
    }

    try {
      await deleteCustomer(customer.id, false); // Soft delete
      toast.success(`Kunde "${customer.name}" wurde deaktiviert`);
      fetchCustomers(filters);
    } catch (err) {
      toast.error(err.message || 'Fehler beim Deaktivieren');
    }
  };

  const handleModalClose = (success) => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    if (success) {
      fetchCustomers(filters);
    }
  };

  // Active customers count
  const activeCount = customers.filter(c => c.is_active).length;
  const totalParts = customers.reduce((sum, c) => sum + (parseInt(c.part_count) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Kunden
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Verwalten Sie Ihre Kunden und deren Bauteile
          </p>
          <div className="mt-2 flex gap-4 text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">{activeCount}</span> aktiv
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">{totalParts}</span> Bauteile
            </span>
          </div>
        </div>
        {hasPermission('part.create') && (
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Neuer Kunde
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Suche nach Name, Kundennummer, Ansprechpartner..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter buttons */}
          <div className="flex flex-wrap gap-2">
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
            
            {/* Sort */}
            <div className="ml-auto flex gap-2">
              <select
                value={filters.sort_by}
                onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Name</option>
                <option value="customer_number">Kundennummer</option>
                <option value="contact_person">Ansprechpartner</option>
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
        </div>
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

      {/* Customers Grid */}
      {!loading && customers.length === 0 ? (
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
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Keine Kunden gefunden
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Legen Sie den ersten Kunden an.
          </p>
          {hasPermission('part.create') && (
            <button
              onClick={handleCreateNew}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Neuer Kunde
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onEdit={() => handleEdit(customer)}
              onDelete={() => handleDelete(customer)}
              canEdit={hasPermission('part.update')}
              canDelete={hasPermission('part.delete')}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <CustomerFormModal
          customer={editingCustomer}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}

// Customer Card Component
function CustomerCard({ customer, onEdit, onDelete, canEdit, canDelete }) {
  return (
    <div className={`bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden ${!customer.is_active ? 'opacity-60' : ''}`}>
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <Link 
              to={`/customers/${customer.id}`}
              className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate block"
            >
              {customer.name}
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {customer.customer_number}
            </p>
          </div>
          {!customer.is_active && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
              Inaktiv
            </span>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {customer.contact_person && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="truncate">{customer.contact_person}</span>
            </div>
          )}
          {customer.email && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <a href={`mailto:${customer.email}`} className="truncate hover:text-blue-600 dark:hover:text-blue-400">
                {customer.email}
              </a>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <a href={`tel:${customer.phone}`} className="truncate hover:text-blue-600 dark:hover:text-blue-400">
                {customer.phone}
              </a>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="text-sm">
              <span className="font-semibold text-gray-900 dark:text-white">{customer.part_count || 0}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">Bauteile</span>
            </div>
            <div className="flex gap-2">
              {canEdit && (
                <button
                  onClick={(e) => { e.preventDefault(); onEdit(); }}
                  className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                  title="Bearbeiten"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {canDelete && customer.is_active && (
                <button
                  onClick={(e) => { e.preventDefault(); onDelete(); }}
                  className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                  title="Deaktivieren"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
