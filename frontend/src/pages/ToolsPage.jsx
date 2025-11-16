import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, X, ChevronLeft, ChevronRight, Wrench, Loader2, Settings, Grid3x3, List } from 'lucide-react';
import { useToolMasterStore } from '../stores/toolMasterStore';
import { useToolCategoriesStore } from '../stores/toolCategoriesStore';
import { useAuthStore } from '../stores/authStore';
import ToolCard from '../components/tools/ToolCard';
import ToolsTable from '../components/tools/ToolsTable';
import ToolForm from '../components/tools/ToolForm';

export default function ToolsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    tools,
    loading,
    error,
    filters,
    pagination,
    fetchTools,
    setFilters,
    clearFilters,
    createTool,
    updateTool,
    deleteTool,
  } = useToolMasterStore();

  const {
    categories,
    subcategories,
    fetchCategories,
    fetchSubcategories,
  } = useToolCategoriesStore();

  const [showForm, setShowForm] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [showFilters, setShowFilters] = useState(true);
  const [localFilters, setLocalFilters] = useState(filters);
  const [viewMode, setViewMode] = useState('table'); // 'grid' or 'table'

  // Load data on mount
  useEffect(() => {
    fetchTools();
    fetchCategories(false);
  }, []);

  // Load subcategories when category filter changes
  useEffect(() => {
    if (localFilters.category_id) {
      fetchSubcategories(localFilters.category_id);
    }
  }, [localFilters.category_id]);

  const handleFilterChange = (name, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear subcategory if category changes
    if (name === 'category_id') {
      setLocalFilters(prev => ({
        ...prev,
        subcategory_id: null
      }));
    }
  };

  const handleSearch = () => {
    setFilters(localFilters);
    fetchTools(localFilters, pagination.limit, 0); // Reset to first page
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      category_id: null,
      subcategory_id: null,
      item_type: null,
      tool_category: null,
      is_active: 'true',
      is_low_stock: null,
      manufacturer: '',
      search: '',
    };
    setLocalFilters(clearedFilters);
    setFilters(clearedFilters);
    fetchTools(clearedFilters, pagination.limit, 0);
  };

  const handleCreateTool = () => {
    setEditingTool(null);
    setShowForm(true);
  };

  const handleEditTool = (tool) => {
    setEditingTool(tool);
    setShowForm(true);
  };

  const handleDeleteTool = async (tool) => {
    if (window.confirm(`Werkzeug "${tool.tool_name}" wirklich löschen?`)) {
      const result = await deleteTool(tool.id);
      if (result.success) {
        fetchTools(); // Reload list
      }
    }
  };

  const handleSaveTool = async (toolData) => {
    let result;
    if (editingTool) {
      result = await updateTool(editingTool.id, toolData);
    } else {
      result = await createTool(toolData);
    }

    if (result.success) {
      setShowForm(false);
      setEditingTool(null);
      fetchTools(); // Reload list
    }
  };

  const handlePageChange = (newOffset) => {
    fetchTools(filters, pagination.limit, newOffset);
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Wrench className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Werkzeuge</h1>
          </div>

          <div className="flex items-center gap-2">
            {user?.permissions?.includes('tools.create') && (
              <button
                onClick={handleCreateTool}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                <Plus className="w-5 h-5" />
                Neues Werkzeug
              </button>
            )}

            {user?.permissions?.includes('tools.categories.manage') && (
              <button
                onClick={() => navigate('/tools/categories')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                <Settings className="w-5 h-5" />
                Kategorien
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center gap-0 bg-gray-700 rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-600'
                }`}
                title="Grid-Ansicht"
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-600'
                }`}
                title="Tabellen-Ansicht"
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                showFilters
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filter
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6 space-y-4 border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Suche (Nummer/Name)
                </label>
                <input
                  type="text"
                  value={localFilters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Werkzeug suchen..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Kategorie
                </label>
                <select
                  value={localFilters.category_id || ''}
                  onChange={(e) => handleFilterChange('category_id', e.target.value || null)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Alle Kategorien</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Subcategory */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Unterkategorie
                </label>
                <select
                  value={localFilters.subcategory_id || ''}
                  onChange={(e) => handleFilterChange('subcategory_id', e.target.value || null)}
                  disabled={!localFilters.category_id}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Alle Unterkategorien</option>
                  {subcategories.map(subcat => (
                    <option key={subcat.id} value={subcat.id}>{subcat.name}</option>
                  ))}
                </select>
              </div>

              {/* Manufacturer */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Hersteller
                </label>
                <input
                  type="text"
                  value={localFilters.manufacturer}
                  onChange={(e) => handleFilterChange('manufacturer', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Hersteller suchen..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Item Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Typ
                </label>
                <select
                  value={localFilters.item_type || ''}
                  onChange={(e) => handleFilterChange('item_type', e.target.value || null)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Alle Typen</option>
                  <option value="tool">Werkzeug</option>
                  <option value="insert">Wendeplatte</option>
                  <option value="accessory">Zubehör</option>
                </select>
              </div>

              {/* Tool Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Klassifizierung
                </label>
                <select
                  value={localFilters.tool_category || ''}
                  onChange={(e) => handleFilterChange('tool_category', e.target.value || null)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Alle</option>
                  <option value="standard">Standard</option>
                  <option value="special">Spezial</option>
                  <option value="modified">Modifiziert</option>
                </select>
              </div>
            </div>

            {/* Active Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="is_active"
                    value="true"
                    checked={localFilters.is_active === 'true'}
                    onChange={(e) => handleFilterChange('is_active', e.target.value)}
                    className="w-4 h-4 text-blue-500"
                  />
                  <span className="text-gray-300">Nur Aktive</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="is_active"
                    value=""
                    checked={localFilters.is_active === ''}
                    onChange={(e) => handleFilterChange('is_active', e.target.value)}
                    className="w-4 h-4 text-blue-500"
                  />
                  <span className="text-gray-300">Alle</span>
                </label>
              </div>
            </div>

            {/* Low Stock Filter */}
            <div className="col-span-full">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFilters.is_low_stock === 'true'}
                  onChange={(e) => handleFilterChange('is_low_stock', e.target.checked ? 'true' : null)}
                  className="w-4 h-4 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-300">
                  Nur Werkzeuge mit niedrigem Bestand anzeigen
                </span>
                {localFilters.is_low_stock === 'true' && (
                  <span className="text-xs text-yellow-400 ml-2">
                    (gewichtete Berechnung)
                  </span>
                )}
              </label>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSearch}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                <Search className="w-4 h-4" />
                Suchen
              </button>
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
                Filter zurücksetzen
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        )}

        {/* Tools Display - Grid or Table */}
        {!loading && tools.length > 0 && (
          <>
            {viewMode === 'grid' ? (
              /* Grid View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {tools.map(tool => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    onEdit={handleEditTool}
                    onDelete={handleDeleteTool}
                  />
                ))}
              </div>
            ) : (
              /* Table View */
              <div className="mb-6">
                <ToolsTable
                  tools={tools}
                  onEdit={handleEditTool}
                  onDelete={handleDeleteTool}
                />
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-gray-800 px-6 py-4 rounded-lg border border-gray-700">
                <div className="text-sm text-gray-400">
                  Zeige {pagination.offset + 1} bis {Math.min(pagination.offset + pagination.limit, pagination.total)} von {pagination.total} Werkzeugen
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.offset - pagination.limit)}
                    disabled={currentPage === 1}
                    className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <span className="text-gray-300 px-4">
                    Seite {currentPage} von {totalPages}
                  </span>

                  <button
                    onClick={() => handlePageChange(pagination.offset + pagination.limit)}
                    disabled={currentPage === totalPages}
                    className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && tools.length === 0 && (
          <div className="text-center py-12">
            <Wrench className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              Keine Werkzeuge gefunden
            </h3>
            <p className="text-gray-500 mb-4">
              {Object.values(filters).some(v => v !== null && v !== '' && v !== 'true')
                ? 'Versuche andere Filter oder erstelle ein neues Werkzeug.'
                : 'Erstelle dein erstes Werkzeug.'}
            </p>
            {user?.permissions?.includes('tools.create') && (
              <button
                onClick={handleCreateTool}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                <Plus className="w-5 h-5" />
                Neues Werkzeug
              </button>
            )}
          </div>
        )}

        {/* Tool Form Modal */}
        {showForm && (
          <ToolForm
            tool={editingTool}
            onSave={handleSaveTool}
            onCancel={() => {
              setShowForm(false);
              setEditingTool(null);
            }}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
