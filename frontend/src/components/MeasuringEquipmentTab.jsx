// frontend/src/components/MeasuringEquipmentTab.jsx
/**
 * Tab-Komponente für Messmittel einer Operation
 * Zeigt zugeordnete Messmittel und erlaubt Zuordnung/Entfernung
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { toast } from './Toaster';
import API_BASE_URL from '../config/api';

// Icon-Mapping von Lucide-Namen zu Emojis
const ICON_MAP = {
  'ruler': '📏',
  'circle-dot': '🔘',
  'circle': '⭕',
  'cylinder': '🔧',
  'gauge': '🎯',
  'layers': '📑',
  'move-horizontal': '↔️',
  'arrow-down': '⬇️',
  'arrow-up': '⬆️',
  'square': '⬜',
  'minus': '➖',
  'triangle': '📐',
  'activity': '📈',
  'box': '📦',
  'tool': '🔧',
  'thermometer': '🌡️',
  'scale': '⚖️',
  'target': '🎯',
  'compass': '🧭',
  'scan-line': '📐',
  'default': '📏'
};

const getIcon = (iconName) => {
  return ICON_MAP[iconName] || ICON_MAP['default'];
};

export default function MeasuringEquipmentTab({ operationId }) {
  const { hasPermission } = useAuthStore();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    if (operationId) {
      fetchEquipment();
    }
  }, [operationId]);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/api/operation-measuring-equipment?operation_id=${operationId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (!response.ok) throw new Error('Fehler beim Laden');
      
      const data = await response.json();
      setEquipment(data.data || []);
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
        `${API_BASE_URL}/api/operation-measuring-equipment/${item.id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Fehler beim Entfernen');

      toast.success('Messmittel entfernt');
      fetchEquipment();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const formatRange = (min, max, unit) => {
    if (!min && !max) return '-';
    const u = unit || 'mm';
    if (min && max) return `${min} - ${max} ${u}`;
    if (min) return `ab ${min} ${u}`;
    return `bis ${max} ${u}`;
  };

  const getCalibrationStatus = (nextDate) => {
    if (!nextDate) return { label: 'Unbekannt', color: 'gray' };
    const next = new Date(nextDate);
    const now = new Date();
    const daysUntil = Math.ceil((next - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return { label: 'Überfällig', color: 'red' };
    if (daysUntil <= 30) return { label: `${daysUntil} Tage`, color: 'yellow' };
    return { label: 'OK', color: 'green' };
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Messmittel</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {equipment.length} Messmittel zugeordnet
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
      {equipment.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400">Keine Messmittel zugeordnet</p>
          {hasPermission('part.create') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-3 text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              Erstes Messmittel hinzufügen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {equipment.map((item) => {
            const calStatus = getCalibrationStatus(item.next_calibration_date);
            return (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                {/* Icon */}
                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-xl">
                  {getIcon(item.type_icon)}
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
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span className="font-mono">{item.inventory_number}</span>
                    {item.type_name && <span>• {item.type_name}</span>}
                    {item.manufacturer && <span>• {item.manufacturer}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>Messbereich: {formatRange(item.measuring_range_min, item.measuring_range_max, item.unit)}</span>
                    {item.resolution && <span>• Auflösung: {item.resolution} {item.unit}</span>}
                  </div>
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

                {/* Calibration Status */}
                <div className="flex-shrink-0 text-right">
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    calStatus.color === 'green' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    calStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    calStatus.color === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    Kal: {calStatus.label}
                  </span>
                  {item.next_calibration_date && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(item.next_calibration_date).toLocaleDateString('de-DE')}
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
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddEquipmentModal
          operationId={operationId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchEquipment();
            setShowAddModal(false);
          }}
        />
      )}

      {/* Edit Modal */}
      {editingItem && (
        <EditEquipmentModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={() => {
            fetchEquipment();
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}

// Modal zum Hinzufügen
function AddEquipmentModal({ operationId, onClose, onSuccess }) {
  const [available, setAvailable] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [selected, setSelected] = useState(null);
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
      const params = new URLSearchParams({ operation_id: operationId });
      params.append('search', search);

      const response = await fetch(
        `${API_BASE_URL}/api/operation-measuring-equipment/available?${params}`,
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
      toast.error('Bitte Messmittel auswählen');
      return;
    }

    setAdding(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/operation-measuring-equipment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operation_id: operationId,
          measuring_equipment_id: selected.id,
          purpose,
          is_required: isRequired
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Fehler beim Hinzufügen');
      }

      toast.success('Messmittel zugeordnet');
      onSuccess();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  const formatRange = (min, max, unit) => {
    if (!min && !max) return '';
    const u = unit || 'mm';
    if (min && max) return `${min}-${max} ${u}`;
    return '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Messmittel hinzufügen
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
              Keine Messmittel gefunden
            </p>
          ) : (
            <div className="space-y-2">
              {available.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selected?.id === item.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getIcon(item.type_icon)}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">{item.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.inventory_number}
                        {item.type_name && ` • ${item.type_name}`}
                        {formatRange(item.measuring_range_min, item.measuring_range_max, item.unit) && 
                          ` • ${formatRange(item.measuring_range_min, item.measuring_range_max, item.unit)}`}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Verwendungszweck (optional)
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="z.B. Durchmesser Ø80h6 prüfen"
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
              <span className="text-sm text-gray-700 dark:text-gray-300">Pflicht-Messmittel</span>
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
function EditEquipmentModal({ item, onClose, onSuccess }) {
  const [purpose, setPurpose] = useState(item.purpose || '');
  const [isRequired, setIsRequired] = useState(item.is_required !== false);
  const [notes, setNotes] = useState(item.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/operation-measuring-equipment/${item.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
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
            Messmittel bearbeiten
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
            <span className="text-2xl">{getIcon(item.type_icon)}</span>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">{item.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{item.inventory_number}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Verwendungszweck
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="z.B. Durchmesser Ø80h6 prüfen"
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
            <span className="text-sm text-gray-700 dark:text-gray-300">Pflicht-Messmittel</span>
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
