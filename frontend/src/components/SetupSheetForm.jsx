// frontend/src/components/SetupSheetForm.jsx
import { useState, useEffect } from 'react';
import { useMachinesStore } from '../stores/machinesStore';
import { useProgramsStore } from '../stores/programsStore';

export default function SetupSheetForm({ 
  onSubmit, 
  onCancel, 
  initialData = null,
  operationId,
  operationInfo = {} // { op_number, op_name, part_number, part_name }
}) {
  const { machines, fetchMachines } = useMachinesStore();
  const { programs, fetchPrograms } = useProgramsStore();

  const [formData, setFormData] = useState({
    operation_id: operationId || '',
    machine_id: initialData?.machine_id || '',
    program_id: initialData?.program_id || '',
    
    // Asset Relations (temporär Freitext)
    fixture_description: initialData?.fixture_description || '',
    clamping_description: initialData?.clamping_description || '',
    
    // Nullpunkt (steuerungsspezifisch)
    control_type: initialData?.control_type || '',
    preset_number: initialData?.preset_number || '',
    wcs_number: initialData?.wcs_number || '',
    wcs_x: initialData?.wcs_x || '',
    wcs_y: initialData?.wcs_y || '',
    wcs_z: initialData?.wcs_z || '',
    reference_point: initialData?.reference_point || '',
    
    // Material
    raw_material_dimensions: initialData?.raw_material_dimensions || '',
    material_specification: initialData?.material_specification || '',
    
    // Anweisungen
    setup_instructions: initialData?.setup_instructions || '',
    special_notes: initialData?.special_notes || '',
    
    // Status
    status: initialData?.status || 'draft',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchMachines();
    if (operationId) {
      fetchPrograms(operationId);
    }
  }, [operationId, fetchMachines, fetchPrograms]);

  // Update control_type when machine changes
  useEffect(() => {
    if (formData.machine_id) {
      const selectedMachine = machines.find(m => m.id === parseInt(formData.machine_id));
      if (selectedMachine && selectedMachine.control_type) {
        setFormData(prev => ({
          ...prev,
          control_type: selectedMachine.control_type
        }));
      }
    }
  }, [formData.machine_id, machines]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.machine_id) {
      newErrors.machine_id = 'Maschine ist erforderlich';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    // Convert string values to numbers where needed
    const dataToSubmit = {
      ...formData,
      operation_id: operationId || formData.operation_id,
      machine_id: parseInt(formData.machine_id),
      program_id: formData.program_id ? parseInt(formData.program_id) : null,
      preset_number: formData.preset_number ? parseInt(formData.preset_number) : null,
      wcs_x: formData.wcs_x ? parseFloat(formData.wcs_x) : null,
      wcs_y: formData.wcs_y ? parseFloat(formData.wcs_y) : null,
      wcs_z: formData.wcs_z ? parseFloat(formData.wcs_z) : null,
    };
    
    onSubmit(dataToSubmit);
  };

  // Control type helpers (case-insensitive)
  const controlTypeLower = (formData.control_type || '').toLowerCase();
  const isHeidenhain = controlTypeLower === 'heidenhain';
  const isSiemensOrFanuc = ['siemens', 'fanuc', 'haas'].includes(controlTypeLower);
  const isMazatrol = controlTypeLower === 'mazatrol';
  const hasKnownControlType = isHeidenhain || isSiemensOrFanuc || isMazatrol;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Operation Info (Read-only) */}
      {operationInfo && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
            Arbeitsgang
          </h3>
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p><strong>OP-Nummer:</strong> {operationInfo.op_number}</p>
            <p><strong>OP-Name:</strong> {operationInfo.op_name}</p>
            <p><strong>Bauteil:</strong> {operationInfo.part_number} - {operationInfo.part_name}</p>
          </div>
        </div>
      )}

      {/* Basis-Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
          Basis-Informationen
        </h3>
        
        {/* Maschine */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Maschine <span className="text-red-500">*</span>
          </label>
          <select
            name="machine_id"
            value={formData.machine_id}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.machine_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            <option value="">-- Maschine auswählen --</option>
            {machines.map(machine => (
              <option key={machine.id} value={machine.id}>
                {machine.name} ({machine.serial_number})
              </option>
            ))}
          </select>
          {errors.machine_id && (
            <p className="mt-1 text-sm text-red-500">{errors.machine_id}</p>
          )}
        </div>

        {/* Programm */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            NC-Programm (optional)
          </label>
          <select
            name="program_id"
            value={formData.program_id}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">-- Kein Programm --</option>
            {programs.map(program => (
              <option key={program.id} value={program.id}>
                {program.program_number} - {program.program_name}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="draft">Entwurf</option>
            <option value="review">In Prüfung</option>
            <option value="approved">Geprüft</option>
            <option value="active">Aktiv</option>
            <option value="archived">Archiviert</option>
          </select>
        </div>
      </div>

      {/* Spannmittel & Vorrichtungen (Temporär) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
          Spannmittel & Vorrichtungen
        </h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Vorrichtung
          </label>
          <input
            type="text"
            name="fixture_description"
            value={formData.fixture_description}
            onChange={handleChange}
            placeholder="z.B. VORR-2024-015: Flansch-Aufnahme"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Spannmittel
          </label>
          <input
            type="text"
            name="clamping_description"
            value={formData.clamping_description}
            onChange={handleChange}
            placeholder="z.B. 3-Backen-Futter 250mm"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Nullpunkt */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
          Nullpunkt-System
        </h3>

        {/* Steuerungstyp (Read-only, wird von Maschine übernommen) */}
        {formData.control_type && (
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Steuerungstyp:</strong> <span className="uppercase font-medium text-gray-900 dark:text-white">{formData.control_type}</span>
            </p>
          </div>
        )}

        {/* Heidenhain: Preset Number */}
        {isHeidenhain && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Preset-Nummer (1-99)
            </label>
            <input
              type="number"
              name="preset_number"
              value={formData.preset_number}
              onChange={handleChange}
              min="1"
              max="99"
              placeholder="z.B. 1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        )}

        {/* Siemens/Fanuc/Haas: WCS Number */}
        {isSiemensOrFanuc && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              WCS-Nummer
            </label>
            <select
              name="wcs_number"
              value={formData.wcs_number}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">-- Auswählen --</option>
              <option value="G54">G54</option>
              <option value="G55">G55</option>
              <option value="G56">G56</option>
              <option value="G57">G57</option>
              <option value="G58">G58</option>
              <option value="G59">G59</option>
            </select>
          </div>
        )}

        {/* X/Y/Z Koordinaten (Optional für Heidenhain/Siemens/Fanuc, Pflicht für Mazatrol) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Koordinaten {isMazatrol ? '' : '(optional)'}
          </label>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                X-Koordinate
              </label>
              <input
                type="number"
                name="wcs_x"
                value={formData.wcs_x}
                onChange={handleChange}
                step="0.001"
                placeholder="0.000"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Y-Koordinate
              </label>
              <input
                type="number"
                name="wcs_y"
                value={formData.wcs_y}
                onChange={handleChange}
                step="0.001"
                placeholder="0.000"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Z-Koordinate
              </label>
              <input
                type="number"
                name="wcs_z"
                value={formData.wcs_z}
                onChange={handleChange}
                step="0.001"
                placeholder="0.000"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          {isMazatrol && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Mazatrol: Nur X/Y/Z Koordinaten erforderlich
            </p>
          )}
          {isHeidenhain && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Heidenhain: Koordinaten optional (Preset enthält meist Nullpunkt)
            </p>
          )}
        </div>

        {/* Referenzpunkt (für ALLE Steuerungen) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Referenzpunkt
          </label>
          <input
            type="text"
            name="reference_point"
            value={formData.reference_point}
            onChange={handleChange}
            placeholder="z.B. Oberkante Rohteil, Mitte Bohrung"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Beschreibung des physischen Referenzpunkts
          </p>
        </div>

        {/* Hinweis bei unbekannter Steuerung */}
        {formData.control_type && !hasKnownControlType && (
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              <strong>Unbekannter Steuerungstyp:</strong> Alle Felder sind optional. Gib die relevanten Informationen für "{formData.control_type}" ein.
            </p>
          </div>
        )}
      </div>

      {/* Material */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
          Material
        </h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Rohmaß
          </label>
          <input
            type="text"
            name="raw_material_dimensions"
            value={formData.raw_material_dimensions}
            onChange={handleChange}
            placeholder="z.B. 100x50x20"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Material-Spezifikation
          </label>
          <input
            type="text"
            name="material_specification"
            value={formData.material_specification}
            onChange={handleChange}
            placeholder="z.B. AlMgSi1 F22"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Anweisungen */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
          Anweisungen
        </h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Einrichtanleitung (Schritt-für-Schritt)
          </label>
          <textarea
            name="setup_instructions"
            value={formData.setup_instructions}
            onChange={handleChange}
            rows="6"
            placeholder="1. ..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Besonderheiten / Warnungen
          </label>
          <textarea
            name="special_notes"
            value={formData.special_notes}
            onChange={handleChange}
            rows="3"
            placeholder="Kritische Hinweise..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {initialData ? 'Aktualisieren' : 'Erstellen'}
        </button>
      </div>
    </form>
  );
}
