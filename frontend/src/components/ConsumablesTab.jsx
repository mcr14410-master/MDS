// frontend/src/components/ConsumablesTab.jsx
/**
 * Tab-Komponente für Verbrauchsmaterial einer Operation
 * Verknüpfung zu existierenden Consumables
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { toast } from './Toaster';
import API_BASE_URL from '../config/api';

// Icon-Mapping für Kategorien
const ICON_MAP = {
  'droplet': '💧',
  'spray-can': '🧴',
  'flask-conical': '🧪',
  'shield': '🛡️',
  'brush': '🖌️',
  'disc': '💿',
  'wrench': '🔧',
  'package': '📦',
  'default': '📦'
};

const getIcon = (iconName) => {
  return ICON_MAP[iconName] || ICON_MAP['default'];
};

export default function ConsumablesTab({ operationId }) {
  const { hasPermission } = useAuthStore();
  const [consumables, setConsumables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    if (operationId) {
      fetchConsumables();
    }
  }, [operationId]);

  const fetchConsumables = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/api/operation-consumables?operation_id=${operationId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (!response.ok) throw new Error('Fehler beim Laden');
      
      const data = await response.json();
      setConsumables(data.data || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (item) => {
    if (!window.confirm(`"${item.name}" von dieser Operation entfernen?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/api/operation-consumables/${item.id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Fehler beim Entfernen');

      toast.success('Verbrauchsmaterial entfernt');
      fetchConsumables();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Verbrauchsmaterial</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {consumables.length} Material(ien) zugeordnet
          </p>
        </div>
        {hasPermission('part.create') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Hinzufügen
          </button>
        )}
      </div>

      {/* Liste */}
      {consumables.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400">Kein Verbrauchsmaterial zugeordnet</p>
          {hasPermission('part.create') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-3 text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              Erstes Material hinzufügen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {consumables.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              {/* Icon */}
              <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center text-xl">
                {getIcon(item.category_icon)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">{item.name}</h4>
                  {item.is_required && (
                    <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
                      Pflicht
                    </span>
                  )}
                  {item.is_hazardous && (
                    <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded">
                      ⚠️ Gefahrstoff
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {item.article_number && <span className="font-mono">{item.article_number}</span>}
                  {item.category_name && <span>• {item.category_name}</span>}
                  {item.package_type && item.package_size && (
                    <span>• {item.package_size} {item.base_unit} / {item.package_type}</span>
                  )}
                </div>
                {item.quantity && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                    Menge: {item.quantity} {item.unit || item.base_unit}
                  </p>
                )}
                {item.purpose && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
                    → {item.purpose}
                  </p>
                )}
                {item.notes && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    📝 {item.notes}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {hasPermission('part.update') && (
                  <button
                    onClick={() => setEditingItem(item)}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    title="Bearbeiten"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
                {hasPermission('part.delete') && (
                  <button
                    onClick={() => handleRemove(item)}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    title="Entfernen"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddConsumableModal
          operationId={operationId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchConsumables();
            setShowAddModal(false);
          }}
        />
      )}

      {/* Edit Modal */}
      {editingItem && (
        <EditConsumableModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={() => {
            fetchConsumables();
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}

// Modal zum Hinzufügen
function AddConsumableModal({ operationId, onClose, onSuccess }) {
  const [available, setAvailable] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isRequired, setIsRequired] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (search.length >= 2) {
      fetchAvailable();
      setSelected(null);
    } else {
      setAvailable([]);
      setHasSearched(false);
      setSelected(null);
    }
  }, [search]);

  const fetchAvailable = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ operation_id: operationId, search });

      const response = await fetch(
        `${API_BASE_URL}/api/operation-consumables/available?${params}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (!response.ok) throw new Error('Fehler beim Laden');
      
      const data = await response.json();
      setAvailable(data.data || []);
      setHasSearched(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!selected) {
      toast.error('Bitte Material auswählen');
      return;
    }

    setAdding(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/operation-consumables`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operation_id: operationId,
          consumable_id: selected.id,
          quantity: quantity || null,
          unit: unit || selected.base_unit,
          purpose,
          is_required: isRequired
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Fehler beim Hinzufügen');
      }

      toast.success('Verbrauchsmaterial zugeordnet');
      onSuccess();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Verbrauchsmaterial hinzufügen
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen (min. 2 Zeichen)..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : !hasSearched ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <svg className="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>Mind. 2 Zeichen eingeben zum Suchen</p>
            </div>
          ) : available.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              Keine Materialien gefunden
            </p>
          ) : (
            <div className="space-y-2">
              {available.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelected(item);
                    setUnit(item.base_unit);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selected?.id === item.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getIcon(item.category_icon)}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        {item.name}
                        {item.is_hazardous && <span className="ml-2 text-orange-500">⚠️</span>}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.article_number && `${item.article_number} • `}
                        {item.category_name}
                        {item.package_size && ` • ${item.package_size} ${item.base_unit}`}
                      </p>
                    </div>
                    {selected?.id === item.id && (
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Options & Actions */}
        {selected && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Menge (optional)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="z.B. 0.5"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Einheit
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder={selected.base_unit}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Verwendungszweck (optional)
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="z.B. Kühlmittel beim Fräsen"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Pflicht-Material</span>
            </label>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            disabled={adding}
          >
            Abbrechen
          </button>
          <button
            onClick={handleAdd}
            disabled={adding || !selected}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {adding && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            Hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal zum Bearbeiten
function EditConsumableModal({ item, onClose, onSuccess }) {
  const [quantity, setQuantity] = useState(item.quantity || '');
  const [unit, setUnit] = useState(item.unit || item.base_unit || '');
  const [purpose, setPurpose] = useState(item.purpose || '');
  const [isRequired, setIsRequired] = useState(item.is_required !== false);
  const [notes, setNotes] = useState(item.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/operation-consumables/${item.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity: quantity || null,
          unit,
          purpose,
          is_required: isRequired,
          notes
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Fehler beim Speichern');
      }

      toast.success('Änderungen gespeichert');
      onSuccess();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Material bearbeiten
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Info */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getIcon(item.category_icon)}</span>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">{item.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{item.article_number}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Menge
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="z.B. 0.5"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Einheit
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Verwendungszweck
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="z.B. Kühlmittel beim Fräsen"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notizen
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Weitere Hinweise..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Pflicht-Material</span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            disabled={saving}
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
