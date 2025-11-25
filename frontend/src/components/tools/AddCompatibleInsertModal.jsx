import { useState, useEffect } from 'react';
import { X, Search, Package, Star, Loader2 } from 'lucide-react';
import { useToolCompatibleInsertsStore } from '../../stores/toolCompatibleInsertsStore';

/**
 * AddCompatibleInsertModal Component
 * Modal for adding compatible inserts to a tool
 */
export default function AddCompatibleInsertModal({ toolId, onClose, onSuccess }) {
  const [selectedInsert, setSelectedInsert] = useState(null);
  const [isPreferred, setIsPreferred] = useState(false);
  const [quantityPerTool, setQuantityPerTool] = useState(1);
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  const {
    availableInserts,
    loading,
    fetchAvailableInserts,
    addCompatibleInsert,
    getTotalStock,
  } = useToolCompatibleInsertsStore();

  useEffect(() => {
    loadAvailableInserts();
  }, [toolId, showActiveOnly]);

  const loadAvailableInserts = async () => {
    await fetchAvailableInserts(toolId, {
      is_active: showActiveOnly ? true : '',
    });
  };

  const handleSearch = async () => {
    await fetchAvailableInserts(toolId, {
      search: searchTerm,
      is_active: showActiveOnly ? true : '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedInsert) {
      alert('Bitte wählen Sie eine Wendeschneidplatte aus');
      return;
    }

    const result = await addCompatibleInsert(toolId, {
      insert_tool_master_id: selectedInsert.id,
      is_preferred: isPreferred,
      quantity_per_tool: parseInt(quantityPerTool),
      notes: notes || null,
    });

    if (result.success) {
      onSuccess(result);
    } else {
      alert(result.error);
    }
  };

  const filteredInserts = availableInserts.filter((insert) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      insert.article_number?.toLowerCase().includes(search) ||
      insert.tool_name?.toLowerCase().includes(search) ||
      insert.manufacturer?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-900/75 transition-opacity" onClick={onClose}></div>

        {/* Modal */}
        <div className="relative bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl border border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Wendeschneidplatte hinzufügen</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            {/* Search & Filters */}
            <div className="space-y-3 mb-4">
              {/* Search Bar */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                    placeholder="Suchen nach Nummer, Name oder Hersteller..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Suchen
                </button>
              </div>

              {/* Active Filter */}
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showActiveOnly}
                  onChange={(e) => setShowActiveOnly(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                Nur aktive Wendeschneidplatten anzeigen
              </label>
            </div>

            {/* Available Inserts List */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Verfügbare Wendeschneidplatten ({filteredInserts.length})
              </label>

              {loading ? (
                <div className="flex items-center justify-center py-8 bg-gray-700/50 rounded-lg border border-gray-600">
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                </div>
              ) : filteredInserts.length === 0 ? (
                <div className="text-center py-8 bg-gray-700/50 rounded-lg border border-gray-600">
                  <Package className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400">Keine Wendeschneidplatten verfügbar</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto bg-gray-700/50 rounded-lg border border-gray-600">
                  {filteredInserts.map((insert) => {
                    const totalStock = getTotalStock(insert);
                    const isSelected = selectedInsert?.id === insert.id;

                    return (
                      <button
                        key={insert.id}
                        type="button"
                        onClick={() => setSelectedInsert(insert)}
                        className={`w-full px-4 py-3 text-left border-b border-gray-600 last:border-b-0 transition-colors ${
                          isSelected
                            ? 'bg-blue-500/20 border-l-4 border-l-blue-500'
                            : 'hover:bg-gray-600/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-blue-400">{insert.article_number}</div>
                            <div className="text-sm text-white">{insert.tool_name}</div>
                            {insert.manufacturer && (
                              <div className="text-xs text-gray-400 mt-1">{insert.manufacturer}</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-medium ${
                              totalStock > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {totalStock > 0 ? `${totalStock.toFixed(1)} Stk` : 'Kein Bestand'}
                            </div>
                            {!insert.is_active && (
                              <div className="text-xs text-gray-500 mt-1">Inaktiv</div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Configuration */}
            {selectedInsert && (
              <div className="space-y-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                <h4 className="font-medium text-white">Konfiguration</h4>

                {/* Preferred */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPreferred}
                    onChange={(e) => setIsPreferred(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-yellow-600 focus:ring-yellow-500"
                  />
                  <div className="flex items-center gap-2">
                    <Star className={`w-4 h-4 ${isPreferred ? 'text-yellow-400 fill-current' : 'text-gray-400'}`} />
                    <span className="text-sm text-gray-300">Als bevorzugte Wendeschneidplatte markieren</span>
                  </div>
                </label>

                {/* Quantity per Tool */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Menge pro Werkzeug
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={quantityPerTool}
                    onChange={(e) => setQuantityPerTool(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Notizen (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="z.B. Position im Werkzeug, spezielle Anforderungen..."
                  />
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading || !selectedInsert}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Wird hinzugefügt...' : 'Hinzufügen'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
