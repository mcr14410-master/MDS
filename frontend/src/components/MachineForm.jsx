import { useState, useEffect } from 'react';
import { useMachinesStore } from '../stores/machinesStore';
import { toast } from './Toaster';

export default function MachineForm({ machine, onClose, onSuccess }) {
  const { createMachine, updateMachine, loading } = useMachinesStore();
  const isEdit = !!machine;

  const [formData, setFormData] = useState({
    name: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    machine_type: 'milling',
    control_type: 'Heidenhain',
    control_version: '',
    num_axes: 3,
    workspace_x: '',
    workspace_y: '',
    workspace_z: '',
    spindle_power: '',
    max_rpm: '',
    tool_capacity: '',
    location: '',
    network_path: '',
    postprocessor_name: '',
    notes: '',
    is_active: true,
    operating_hours: 0,
  });

  useEffect(() => {
    if (machine) {
      setFormData({
        name: machine.name || '',
        manufacturer: machine.manufacturer || '',
        model: machine.model || '',
        serial_number: machine.serial_number || '',
        machine_type: machine.machine_type || 'milling',
        control_type: machine.control_type || 'Heidenhain',
        control_version: machine.control_version || '',
        num_axes: machine.num_axes || 3,
        workspace_x: machine.workspace_x || '',
        workspace_y: machine.workspace_y || '',
        workspace_z: machine.workspace_z || '',
        spindle_power: machine.spindle_power || '',
        max_rpm: machine.max_rpm || '',
        tool_capacity: machine.tool_capacity || '',
        location: machine.location || '',
        network_path: machine.network_path || '',
        postprocessor_name: machine.postprocessor_name || '',
        notes: machine.notes || '',
        is_active: machine.is_active !== undefined ? machine.is_active : true,
        operating_hours: machine.operating_hours || 0,
      });
    }
  }, [machine]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error('Name ist erforderlich');
      return;
    }

    try {
      if (isEdit) {
        await updateMachine(machine.id, formData);
        toast.success('Maschine erfolgreich aktualisiert');
      } else {
        await createMachine(formData);
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Maschinentyp</label>
                <select
                  name="machine_type"
                  value={formData.machine_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                >
                  <option value="milling">Fräsen</option>
                  <option value="turning">Drehen</option>
                  <option value="mill-turn">Dreh-Fräsen</option>
                  <option value="grinding">Schleifen</option>
                  <option value="edm">Erodieren</option>
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
                  name="control_type"
                  value={formData.control_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                >
                  <option value="Heidenhain">Heidenhain</option>
                  <option value="Siemens">Siemens</option>
                  <option value="Fanuc">Fanuc</option>
                  <option value="Mazatrol">Mazatrol</option>
                  <option value="Fagor">Fagor</option>
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

          {/* Technische Daten */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Technische Daten</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Achsen</label>
                <input
                  type="number"
                  name="num_axes"
                  value={formData.num_axes}
                  onChange={handleChange}
                  min="1"
                  max="9"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Werkzeugplätze</label>
                <input
                  type="number"
                  name="tool_capacity"
                  value={formData.tool_capacity}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Spindelleistung (kW)</label>
                <input
                  type="number"
                  name="spindle_power"
                  value={formData.spindle_power}
                  onChange={handleChange}
                  step="0.1"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max. Drehzahl (U/min)</label>
                <input
                  type="number"
                  name="max_rpm"
                  value={formData.max_rpm}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Arbeitsraum X (mm)</label>
                <input
                  type="number"
                  name="workspace_x"
                  value={formData.workspace_x}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Arbeitsraum Y (mm)</label>
                <input
                  type="number"
                  name="workspace_y"
                  value={formData.workspace_y}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Arbeitsraum Z (mm)</label>
                <input
                  type="number"
                  name="workspace_z"
                  value={formData.workspace_z}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Betriebsstunden</label>
                <input
                  type="number"
                  name="operating_hours"
                  value={formData.operating_hours}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
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
