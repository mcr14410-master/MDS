// frontend/src/components/RawMaterialTab.jsx
/**
 * Tab-Komponente für Rohmaterial einer Operation
 * Einfache Freitext-Felder für Materialart, Werkstoff, Abmessungen, etc.
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { toast } from './Toaster';
import API_BASE_URL from '../config/api';

const MATERIAL_TYPES = [
  { value: '', label: '-- Bitte wählen --' },
  { value: 'Rundmaterial', label: 'Rundmaterial (Vollmaterial)' },
  { value: 'Rohr', label: 'Rohr' },
  { value: 'Sechskant', label: 'Sechskant' },
  { value: 'Vierkant', label: 'Vierkant' },
  { value: 'Flachmaterial', label: 'Flachmaterial / Flachstahl' },
  { value: 'Platte', label: 'Platte / Blech' },
  { value: 'Profil', label: 'Profil (L, U, T, I)' },
  { value: 'Guss', label: 'Gussrohling' },
  { value: 'Schmiede', label: 'Schmiederohling' },
  { value: 'Sägeschnitt', label: 'Sägeschnitt / Zuschnitt' },
  { value: 'Sonstiges', label: 'Sonstiges' }
];

export default function RawMaterialTab({ operationId }) {
  const { hasPermission } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState({
    raw_material_type: '',
    raw_material_designation: '',
    raw_material_dimensions: '',
    raw_material_weight: '',
    raw_material_notes: ''
  });
  const [originalData, setOriginalData] = useState(null);

  useEffect(() => {
    if (operationId) {
      fetchData();
    }
  }, [operationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/api/operation-raw-materials/${operationId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (!response.ok) throw new Error('Fehler beim Laden');
      
      const result = await response.json();
      const fetchedData = {
        raw_material_type: result.data.raw_material_type || '',
        raw_material_designation: result.data.raw_material_designation || '',
        raw_material_dimensions: result.data.raw_material_dimensions || '',
        raw_material_weight: result.data.raw_material_weight || '',
        raw_material_notes: result.data.raw_material_notes || ''
      };
      setData(fetchedData);
      setOriginalData(fetchedData);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/api/operation-raw-materials/${operationId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        }
      );

      if (!response.ok) throw new Error('Fehler beim Speichern');

      await response.json();
      setOriginalData({ ...data });
      setIsEditing(false);
      toast.success('Rohmaterial-Daten gespeichert');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setData(originalData);
    setIsEditing(false);
  };

  const hasData = data.raw_material_type || data.raw_material_designation || 
                  data.raw_material_dimensions || data.raw_material_weight;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Anzeige-Modus
  if (!isEditing) {
    return (
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rohmaterial</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Halbzeug / Zuschnitt</p>
          </div>
          {hasPermission('part.update') && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Bearbeiten
            </button>
          )}
        </div>

        {/* Content */}
        {!hasData ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">Keine Rohmaterial-Daten hinterlegt</p>
            {hasPermission('part.update') && (
              <button
                onClick={() => setIsEditing(true)}
                className="mt-3 text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                Rohmaterial definieren
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Materialart */}
              {data.raw_material_type && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Materialart</p>
                  <p className="font-medium text-gray-900 dark:text-white">{data.raw_material_type}</p>
                </div>
              )}

              {/* Werkstoff */}
              {data.raw_material_designation && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Werkstoff</p>
                  <p className="font-medium text-gray-900 dark:text-white font-mono">{data.raw_material_designation}</p>
                </div>
              )}

              {/* Abmessungen */}
              {data.raw_material_dimensions && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Abmessungen</p>
                  <p className="font-medium text-gray-900 dark:text-white">{data.raw_material_dimensions}</p>
                </div>
              )}

              {/* Gewicht */}
              {data.raw_material_weight && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gewicht</p>
                  <p className="font-medium text-gray-900 dark:text-white">{data.raw_material_weight} kg</p>
                </div>
              )}
            </div>

            {/* Notizen */}
            {data.raw_material_notes && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Hinweise</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{data.raw_material_notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Bearbeitungs-Modus
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rohmaterial bearbeiten</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Halbzeug / Zuschnitt</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Materialart */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Materialart
            </label>
            <select
              value={data.raw_material_type}
              onChange={(e) => setData({ ...data, raw_material_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              {MATERIAL_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Werkstoff */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Werkstoff / Bezeichnung
            </label>
            <input
              type="text"
              value={data.raw_material_designation}
              onChange={(e) => setData({ ...data, raw_material_designation: e.target.value })}
              placeholder="z.B. AlMg4.5Mn, 1.4301, 42CrMo4"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
            />
          </div>

          {/* Abmessungen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Abmessungen
            </label>
            <input
              type="text"
              value={data.raw_material_dimensions}
              onChange={(e) => setData({ ...data, raw_material_dimensions: e.target.value })}
              placeholder="z.B. Ø80x250, 100x50x300"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>

          {/* Gewicht */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Gewicht (kg)
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={data.raw_material_weight}
              onChange={(e) => setData({ ...data, raw_material_weight: e.target.value })}
              placeholder="z.B. 12.5"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
        </div>

        {/* Notizen */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Hinweise
          </label>
          <textarea
            value={data.raw_material_notes}
            onChange={(e) => setData({ ...data, raw_material_notes: e.target.value })}
            rows={3}
            placeholder="Besonderheiten, Lieferant, Chargenpflicht, etc."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleCancel}
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
