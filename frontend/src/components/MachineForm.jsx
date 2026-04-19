import { useState, useEffect, useMemo } from 'react';
import { useMachinesStore } from '../stores/machinesStore';
import { useMachineTypesStore } from '../stores/machineTypesStore';
import { useControlTypesStore } from '../stores/controlTypesStore';
import { toast } from './Toaster';
import CustomFieldsRenderer from './common/CustomFieldsRenderer';

export default function MachineForm({ machine, onClose, onSuccess }) {
  const { createMachine, updateMachine, loading } = useMachinesStore();
  const { types: machineTypes, fetchTypes: fetchMachineTypes } = useMachineTypesStore();
  const { types: controlTypes, fetchTypes: fetchControlTypes } = useControlTypesStore();
  const isEdit = !!machine;

  const [formData, setFormData] = useState({
    name: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    machine_type_id: '',
    control_type_id: '',
    control_version: '',
    year_built: '',
    custom_fields: {},
    location: '',
    network_path: '',
    postprocessor_name: '',
    notes: '',
    is_active: true,
    operating_hours: 0,
  });

  useEffect(() => {
    fetchMachineTypes({ is_active: 'true' }).catch(() => {});
    fetchControlTypes({ is_active: 'true' }).catch(() => {});
  }, [fetchMachineTypes, fetchControlTypes]);

  useEffect(() => {
    if (machine) {
      setFormData({
        name: machine.name || '',
        manufacturer: machine.manufacturer || '',
        model: machine.model || '',
        serial_number: machine.serial_number || '',
        machine_type_id: machine.machine_type_id || '',
        control_type_id: machine.control_type_id || '',
        control_version: machine.control_version || '',
        year_built: machine.year_built || '',
        custom_fields: machine.custom_fields || {},
        location: machine.location || '',
        network_path: machine.network_path || '',
        postprocessor_name: machine.postprocessor_name || '',
        notes: machine.notes || '',
        is_active: machine.is_active !== undefined ? machine.is_active : true,
        operating_hours: machine.operating_hours || 0,
      });
    }
  }, [machine]);

  // Aktuell ausgewählter Maschinentyp (für Custom-Fields)
  const selectedMachineType = useMemo(
    () => machineTypes.find((t) => t.id === parseInt(formData.machine_type_id, 10)),
    [machineTypes, formData.machine_type_id]
  );
  const customFieldDefinitions = selectedMachineType?.custom_field_definitions || [];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Name ist erforderlich');
      return;
    }

    const payload = {
      ...formData,
      machine_type_id: formData.machine_type_id ? parseInt(formData.machine_type_id, 10) : null,
      control_type_id: formData.control_type_id ? parseInt(formData.control_type_id, 10) : null,
      year_built: formData.year_built ? parseInt(formData.year_built, 10) : null,
    };

    try {
      if (isEdit) {
        await updateMachine(machine.id, payload);
        toast.success('Maschine erfolgreich aktualisiert');
      } else {
        await createMachine(payload);
        toast.success('Maschine erfolgreich erstellt');
      }
      onSuccess();
    } catch (error) {
      toast.error(error.message || 'Fehler beim Speichern');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleCustomFieldsChange = (newCustomFields) => {
    setFormData({ ...formData, custom_fields: newCustomFields });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {isEdit ? 'Maschine bearbeiten' : 'Neue Maschine'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basis-Daten */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basis-Daten</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name * <span className="text-xs text-gray-500 dark:text-gray-400">(z.B. DMG-DMU50)</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hersteller</label>
                <input
                  type="text"
                  name="manufacturer"
                  value={formData.manufacturer}
                  onChange={handleChange}
                  placeholder="z.B. DMG Mori, Hermle, Mazak"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modell</label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  placeholder="z.B. DMU 50, C30 U"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seriennummer</label>
                <input
                  type="text"
                  name="serial_number"
                  value={formData.serial_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Baujahr</label>
                <input
                  type="number"
                  name="year_built"
                  value={formData.year_built}
                  onChange={handleChange}
                  min="1900"
                  max="2100"
                  placeholder="z.B. 2018"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Maschinentyp
                </label>
                <select
                  name="machine_type_id"
                  value={formData.machine_type_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                >
                  <option value="">-- Bitte wählen --</option>
                  {machineTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Steuerung */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Steuerung</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Steuerungstyp</label>
                <select
                  name="control_type_id"
                  value={formData.control_type_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                >
                  <option value="">-- Bitte wählen --</option>
                  {controlTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Steuerungsversion</label>
                <input
                  type="text"
                  name="control_version"
                  value={formData.control_version}
                  onChange={handleChange}
                  placeholder="z.B. TNC640, 840D sl"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Technische Daten (Custom Fields) */}
          {formData.machine_type_id && customFieldDefinitions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Technische Daten</h3>
              <CustomFieldsRenderer
                definitions={customFieldDefinitions}
                customFields={formData.custom_fields}
                onChange={handleCustomFieldsChange}
                heading={`Felder für ${selectedMachineType?.name || 'Maschinentyp'}`}
              />
            </div>
          )}

          {formData.machine_type_id && customFieldDefinitions.length === 0 && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-sm p-3">
              Für diesen Maschinentyp sind keine technischen Felder definiert. Im Dialog "Stammdaten" können typ-spezifische Felder angelegt werden.
            </div>
          )}

          {/* Betriebsstunden */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Betrieb</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Betriebsstunden</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    name="operating_hours"
                    value={formData.operating_hours}
                    readOnly
                    disabled
                    className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                  {machine?.id && (
                    <a
                      href={`/maintenance/operating-hours?machine=${machine.id}`}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-1 whitespace-nowrap"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Erfassen
                    </a>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Betriebsstunden werden über die Wartung erfasst
                </p>
              </div>
            </div>
          </div>

          {/* Standort & Integration */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Standort & Integration</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Standort</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="z.B. Halle 1, Platz 3"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Netzwerkpfad (SMB)</label>
                <input
                  type="text"
                  name="network_path"
                  value={formData.network_path}
                  onChange={handleChange}
                  placeholder="\\server\cnc\dmu50"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Postprozessor-Name (für CAM)</label>
                <input
                  type="text"
                  name="postprocessor_name"
                  value={formData.postprocessor_name}
                  onChange={handleChange}
                  placeholder="z.B. Heidenhain_5Axis_DMU50"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notizen</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Maschine ist aktiv</label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Speichert...' : isEdit ? 'Aktualisieren' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
