import { useState, useEffect } from 'react';
import { useMeasuringEquipmentStore } from '../../stores/measuringEquipmentStore';
import { useSuppliersStore } from '../../stores/suppliersStore';
import { toast } from '../Toaster';

// Trailing zeros entfernen für Anzeige (0.0100 → 0.01)
const formatNumber = (value) => {
  if (value === null || value === undefined || value === '') return '';
  return parseFloat(value).toString();
};

export default function MeasuringEquipmentFormModal({ equipment, types, onClose }) {
  const { createEquipment, updateEquipment, getNextInventoryNumber } = useMeasuringEquipmentStore();
  const { suppliers, fetchSuppliers } = useSuppliersStore();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    inventory_number: '',
    name: '',
    type_id: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    measuring_range_min: '',
    measuring_range_max: '',
    resolution: '',
    accuracy: '',
    unit: 'mm',
    nominal_value: '',
    tolerance_class: '',
    // Neue Felder
    thread_standard: '',
    thread_size: '',
    thread_pitch: '',
    accuracy_class: '',
    // Ende neue Felder
    calibration_interval_months: 12,
    last_calibration_date: '',
    calibration_provider: '',
    purchase_date: '',
    purchase_price: '',
    supplier_id: '',
    notes: '',
  });

  // Gewindenormen
  const threadStandardOptions = [
    { value: '', label: '-- Auswählen --' },
    { value: 'M', label: 'M - Metrisch ISO' },
    { value: 'MF', label: 'MF - Metrisch Fein' },
    { value: 'UNC', label: 'UNC - Unified Coarse' },
    { value: 'UNF', label: 'UNF - Unified Fine' },
    { value: 'UNEF', label: 'UNEF - Unified Extra Fine' },
    { value: 'UN', label: 'UN - Unified Special' },
    { value: 'G', label: 'G - Whitworth Rohr (zyl.)' },
    { value: 'R', label: 'R - Whitworth Rohr (kon.)' },
    { value: 'Rp', label: 'Rp - Whitworth Rohr Innen' },
    { value: 'NPT', label: 'NPT - National Pipe Thread' },
    { value: 'NPTF', label: 'NPTF - NPT Dryseal' },
    { value: 'Tr', label: 'Tr - Trapezgewinde' },
    { value: 'ACME', label: 'ACME - Trapezgewinde' },
    { value: 'Pg', label: 'Pg - Panzergewinde' },
    { value: 'Rd', label: 'Rd - Rundgewinde' },
  ];

  // Genauigkeitsklassen für Endmaße
  const accuracyClassOptions = [
    { value: '', label: '-- Auswählen --' },
    { value: 'K', label: 'K - Kalibrier' },
    { value: '0', label: '0 - Höchste Genauigkeit' },
    { value: '1', label: '1 - Hohe Genauigkeit' },
    { value: '2', label: '2 - Werkstattgenauigkeit' },
  ];

  const isEditing = Boolean(equipment);

  useEffect(() => {
    fetchSuppliers({ is_active: true });
    
    if (equipment) {
      setFormData({
        inventory_number: equipment.inventory_number || '',
        name: equipment.name || '',
        type_id: equipment.type_id || '',
        manufacturer: equipment.manufacturer || '',
        model: equipment.model || '',
        serial_number: equipment.serial_number || '',
        measuring_range_min: formatNumber(equipment.measuring_range_min),
        measuring_range_max: formatNumber(equipment.measuring_range_max),
        resolution: formatNumber(equipment.resolution),
        accuracy: formatNumber(equipment.accuracy),
        unit: equipment.unit || 'mm',
        nominal_value: formatNumber(equipment.nominal_value),
        tolerance_class: equipment.tolerance_class || '',
        // Neue Felder
        thread_standard: equipment.thread_standard || '',
        thread_size: equipment.thread_size || '',
        thread_pitch: equipment.thread_pitch || '',
        accuracy_class: equipment.accuracy_class || '',
        // Ende neue Felder
        calibration_interval_months: equipment.calibration_interval_months || 12,
        last_calibration_date: equipment.last_calibration_date?.split('T')[0] || '',
        calibration_provider: equipment.calibration_provider || '',
        purchase_date: equipment.purchase_date?.split('T')[0] || '',
        purchase_price: equipment.purchase_price || '',
        supplier_id: equipment.supplier_id || '',
        notes: equipment.notes || '',
      });
    } else {
      // Generate next inventory number for new equipment
      getNextInventoryNumber().then(num => {
        setFormData(f => ({ ...f, inventory_number: num }));
      }).catch(console.error);
    }
  }, [equipment]);

  // Update calibration interval when type changes
  const handleTypeChange = (typeId) => {
    setFormData(f => ({ ...f, type_id: typeId }));
    const selectedType = types.find(t => t.id === parseInt(typeId));
    if (selectedType && !isEditing) {
      setFormData(f => ({ 
        ...f, 
        type_id: typeId,
        calibration_interval_months: selectedType.default_calibration_interval_months 
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(f => ({
      ...f,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.inventory_number || !formData.name || !formData.type_id) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    setLoading(true);
    try {
      // Clean up empty values
      const submitData = { ...formData };
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '') {
          submitData[key] = null;
        }
      });

      if (isEditing) {
        await updateEquipment(equipment.id, submitData);
        toast.success('Messmittel aktualisiert');
        onClose({ success: true });
      } else {
        const newEquipment = await createEquipment(submitData);
        toast.success('Messmittel erstellt');
        onClose({ success: true, newId: newEquipment.id });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  // Get field category from selected type
  const getFieldCategory = () => {
    const selectedType = types.find(t => t.id === parseInt(formData.type_id));
    return selectedType?.field_category || 'measuring_instrument';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
          onClick={() => onClose(false)}
        />

        {/* Modal */}
        <div className="relative inline-block w-full max-w-3xl p-6 my-8 text-left align-middle bg-white dark:bg-gray-800 rounded-xl shadow-xl transform transition-all">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isEditing ? 'Messmittel bearbeiten' : 'Neues Messmittel'}
            </h3>
            <button
              onClick={() => onClose(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Inventar-Nr. *
                </label>
                <input
                  type="text"
                  name="inventory_number"
                  value={formData.inventory_number}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="MM-1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Typ *
                </label>
                <select
                  name="type_id"
                  value={formData.type_id}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Typ wählen --</option>
                  {types.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bezeichnung *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Digitaler Messschieber 150mm"
              />
            </div>

            {/* Manufacturer */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hersteller
                </label>
                <input
                  type="text"
                  name="manufacturer"
                  value={formData.manufacturer}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Mitutoyo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Modell
                </label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Seriennummer
                </label>
                <input
                  type="text"
                  name="serial_number"
                  value={formData.serial_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Technical Data - conditional based on field category */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Technische Daten
              </h4>
              
              {/* Messinstrument: Messbereich, Auflösung, Genauigkeit */}
              {getFieldCategory() === 'measuring_instrument' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Messbereich von
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      name="measuring_range_min"
                      value={formData.measuring_range_min}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Messbereich bis
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      name="measuring_range_max"
                      value={formData.measuring_range_max}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="150"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Auflösung
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      name="resolution"
                      value={formData.resolution}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Genauigkeit
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      name="accuracy"
                      value={formData.accuracy}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="0.02"
                    />
                  </div>
                </div>
              )}

              {/* Lehre: Nennmaß, Toleranzklasse */}
              {getFieldCategory() === 'gauge' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nennmaß (mm)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      name="nominal_value"
                      value={formData.nominal_value}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. 20.000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Toleranzklasse
                    </label>
                    <input
                      type="text"
                      name="tolerance_class"
                      value={formData.tolerance_class}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. H7, 6g"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Einheit
                    </label>
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="mm">mm</option>
                      <option value="µm">µm</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Gewindelehre: Gewindenorm, Größe, Steigung, Toleranz */}
              {getFieldCategory() === 'thread_gauge' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Gewindenorm
                    </label>
                    <select
                      name="thread_standard"
                      value={formData.thread_standard}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    >
                      {threadStandardOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Gewindegröße
                    </label>
                    <input
                      type="text"
                      name="thread_size"
                      value={formData.thread_size}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. M8, 1/4, G1/2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Steigung
                    </label>
                    <input
                      type="text"
                      name="thread_pitch"
                      value={formData.thread_pitch}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. 1.0, 1.25, 20 TPI"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Toleranzklasse
                    </label>
                    <input
                      type="text"
                      name="tolerance_class"
                      value={formData.tolerance_class}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. 6H, 6g, 2B"
                    />
                  </div>
                </div>
              )}

              {/* Endmaß: Nennmaß, Genauigkeitsklasse */}
              {getFieldCategory() === 'gauge_block' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nennmaß (mm)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      name="nominal_value"
                      value={formData.nominal_value}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. 25.000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Genauigkeitsklasse
                    </label>
                    <select
                      name="accuracy_class"
                      value={formData.accuracy_class}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    >
                      {accuracyClassOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Einheit
                    </label>
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="mm">mm</option>
                      <option value="µm">µm</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Winkelmesser: Nennwinkel, Toleranz */}
              {getFieldCategory() === 'angle_gauge' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nennwinkel (°)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      name="nominal_value"
                      value={formData.nominal_value}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. 90"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Toleranz
                    </label>
                    <input
                      type="text"
                      name="tolerance_class"
                      value={formData.tolerance_class}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. ±0.01°"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Auflösung
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      name="resolution"
                      value={formData.resolution}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. 0.01"
                    />
                  </div>
                </div>
              )}

              {/* Rauheitsmesser: Messbereich, Auflösung, Parameter */}
              {getFieldCategory() === 'surface_tester' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Messbereich von (µm)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      name="measuring_range_min"
                      value={formData.measuring_range_min}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Messbereich bis (µm)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      name="measuring_range_max"
                      value={formData.measuring_range_max}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="16"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Auflösung (µm)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      name="resolution"
                      value={formData.resolution}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="0.001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Messparameter
                    </label>
                    <input
                      type="text"
                      name="tolerance_class"
                      value={formData.tolerance_class}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="Ra, Rz, Rmax"
                    />
                  </div>
                </div>
              )}

              {/* Sonstiges: Keine speziellen technischen Felder */}
              {getFieldCategory() === 'other' && (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Für diesen Typ sind keine spezifischen technischen Daten erforderlich.
                </p>
              )}
            </div>

            {/* Calibration */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Kalibrierung
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Intervall (Monate)
                  </label>
                  <input
                    type="number"
                    name="calibration_interval_months"
                    value={formData.calibration_interval_months}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Letzte Kalibrierung
                  </label>
                  <input
                    type="date"
                    name="last_calibration_date"
                    value={formData.last_calibration_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Kalibrierlabor
                  </label>
                  <input
                    type="text"
                    name="calibration_provider"
                    value={formData.calibration_provider}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. Kalibrierlabor Müller GmbH"
                  />
                </div>
              </div>
            </div>

            {/* Purchase */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Beschaffung
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Lieferant
                  </label>
                  <select
                    name="supplier_id"
                    value={formData.supplier_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Kein Lieferant --</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Kaufdatum
                  </label>
                  <input
                    type="date"
                    name="purchase_date"
                    value={formData.purchase_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Kaufpreis (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="purchase_price"
                    value={formData.purchase_price}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bemerkungen
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => onClose(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Speichern...' : (isEditing ? 'Aktualisieren' : 'Erstellen')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
