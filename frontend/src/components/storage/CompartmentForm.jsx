import { useState, useEffect } from 'react';
import { X, Box } from 'lucide-react';
import { useStorageStore } from '../../stores/storageStore';
import { toast } from '../Toaster';

export default function CompartmentForm({ compartment, locationId, locationName, onClose, onSuccess }) {
  const { createCompartment, updateCompartment, loading } = useStorageStore();

  const [formData, setFormData] = useState({
    name: '',
    compartment_type: 'compartment',
    description: '',
    position: '',
    is_active: true,
  });

  const compartmentTypes = [
    { value: 'drawer', label: 'Schublade' },
    { value: 'compartment', label: 'Fach' },
    { value: 'bin', label: 'Behälter' },
    { value: 'section', label: 'Bereich' },
  ];

  useEffect(() => {
    if (compartment) {
      setFormData({
        name: compartment.name || '',
        compartment_type: compartment.compartment_type || 'compartment',
        description: compartment.description || '',
        position: compartment.position != null ? compartment.position.toString() : '',
        is_active: compartment.is_active !== undefined ? compartment.is_active : true,
      });
    }
  }, [compartment]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error('Bitte geben Sie einen Namen ein');
      return;
    }

    // Prepare data
    const compartmentData = {
      location_id: parseInt(locationId),
      name: formData.name.trim(),
      compartment_type: formData.compartment_type,
      description: formData.description.trim() || null,
      position: formData.position ? parseInt(formData.position) : null,
      is_active: formData.is_active,
    };

    let result;
    if (compartment) {
      result = await updateCompartment(compartment.id, compartmentData);
    } else {
      result = await createCompartment(compartmentData);
    }

    if (result.success) {
      toast.success(compartment ? 'Fach erfolgreich aktualisiert' : 'Fach erfolgreich erstellt');
      onSuccess();
    } else {
      toast.error(result.error || 'Fehler beim Speichern');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-900/75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="relative bg-gray-800 rounded-lg w-full max-w-lg shadow-xl border border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <Box className="w-6 h-6 text-blue-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {compartment ? 'Fach bearbeiten' : 'Neues Fach'}
                </h3>
                <p className="text-sm text-gray-400">{locationName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4">
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Schublade 1 Oben"
                />
              </div>

              {/* Compartment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Typ <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.compartment_type}
                  onChange={(e) => setFormData({ ...formData, compartment_type: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {compartmentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Position / Nummer (optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. 1, 2, 3..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Niedrigere Nummern werden zuerst angezeigt. Leer lassen für alphabetische Sortierung.
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Beschreibung (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Zusätzliche Informationen zum Fach..."
                />
              </div>

              {/* Active */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Aktiv</span>
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Inaktive Fächer werden in Dropdown-Listen ausgeblendet.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Speichern...' : compartment ? 'Aktualisieren' : 'Erstellen'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
