// frontend/src/components/InspectionPlanTab.jsx
import { useState, useEffect } from 'react';
import { useInspectionPlansStore } from '../stores/inspectionPlansStore';
import { 
  calculateISO286, 
  calculateISO2768, 
  AVAILABLE_TOLERANCES 
} from '../utils/toleranceCalculator';

export default function InspectionPlanTab({ operationId }) {
  const { 
    inspectionPlan, 
    loading, 
    error, 
    fetchInspectionPlan,
    updateInspectionPlanNotes,
    addInspectionItem,
    updateInspectionItem,
    deleteInspectionItem,
    moveItemUp,
    moveItemDown
  } = useInspectionPlansStore();

  const [notes, setNotes] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  
  // Form state for add/edit
  const [formData, setFormData] = useState({
    measurement_description: '',
    tolerance: '',
    min_value: '',
    max_value: '',
    nominal_value: '',
    mean_value: '',
    measuring_tool: '',
    instruction: ''
  });

  // Tolerance mode state
  const [toleranceMode, setToleranceMode] = useState('manual'); // 'manual', 'iso286', 'iso2768', 'form_position'
  const [iso286Letter, setIso286Letter] = useState('H');
  const [iso286Grade, setIso286Grade] = useState(7);
  const [iso2768Grade, setIso2768Grade] = useState('m');

  // NEW: Manual deviation fields
  const [upperDeviation, setUpperDeviation] = useState('');
  const [lowerDeviation, setLowerDeviation] = useState('');

  // Load inspection plan on mount
  useEffect(() => {
    if (operationId) {
      fetchInspectionPlan(operationId);
    }
  }, [operationId, fetchInspectionPlan]);

  // Sync notes with loaded inspection plan
  useEffect(() => {
    if (inspectionPlan) {
      setNotes(inspectionPlan.notes || '');
    }
  }, [inspectionPlan]);

  // Auto-calculate tolerances for ISO modes
  useEffect(() => {
    if (!formData.nominal_value || toleranceMode === 'manual' || toleranceMode === 'form_position') return;

    const nominal = parseFloat(formData.nominal_value);
    if (isNaN(nominal) || nominal <= 0) return;

    if (toleranceMode === 'iso286') {
      const result = calculateISO286(nominal, iso286Letter, iso286Grade);
      if (result) {
        setFormData(prev => ({
          ...prev,
          tolerance: result.tolerance,
          min_value: result.min.toString(),
          mean_value: result.mean.toString(),
          max_value: result.max.toString()
        }));
      }
    } else if (toleranceMode === 'iso2768') {
      const result = calculateISO2768(nominal, iso2768Grade);
      if (result) {
        setFormData(prev => ({
          ...prev,
          tolerance: result.tolerance,
          min_value: result.min.toString(),
          mean_value: result.mean.toString(),
          max_value: result.max.toString()
        }));
      }
    }
  }, [formData.nominal_value, toleranceMode, iso286Letter, iso286Grade, iso2768Grade]);

  // NEW: Auto-calculate for manual mode
  useEffect(() => {
    if (toleranceMode === 'manual' && formData.nominal_value) {
      const nominal = parseFloat(formData.nominal_value);
      const upper = parseFloat(upperDeviation) || 0;
      const lower = parseFloat(lowerDeviation) || 0;
      
      if (!isNaN(nominal)) {
        const max = nominal + upper;
        const min = nominal + lower; // lower ist negativ!
        const mean = (min + max) / 2;
        
        // Format tolerance string
        const upperStr = upper >= 0 ? `+${upper.toFixed(3)}` : upper.toFixed(3);
        const lowerStr = lower >= 0 ? `+${lower.toFixed(3)}` : lower.toFixed(3);
        const tolerance = `${upperStr}/${lowerStr}`;
        
        setFormData(prev => ({
          ...prev,
          tolerance,
          min_value: min.toString(),
          mean_value: mean.toString(),
          max_value: max.toString()
        }));
      }
    }
  }, [toleranceMode, formData.nominal_value, upperDeviation, lowerDeviation]);

  // NEW: Form-/Lagetoleranz mode (only max value)
  useEffect(() => {
    if (toleranceMode === 'form_position') {
      // Clear nominal, min, mean - only keep max (tolerance value)
      setFormData(prev => ({
        ...prev,
        nominal_value: '',
        min_value: '',
        mean_value: ''
        // max_value and tolerance are set manually by user
      }));
    }
  }, [toleranceMode]);

  // Handle notes save
  const handleSaveNotes = async () => {
    try {
      await updateInspectionPlanNotes(operationId, notes);
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      measurement_description: '',
      tolerance: '',
      min_value: '',
      max_value: '',
      nominal_value: '',
      mean_value: '',
      measuring_tool: '',
      instruction: ''
    });
    setToleranceMode('manual');
    setIso286Letter('H');
    setIso286Grade(7);
    setIso2768Grade('m');
    setUpperDeviation('');
    setLowerDeviation('');
    setShowAddForm(false);
    setEditingItemId(null);
  };

  // Handle add item
  const handleAddItem = async (e) => {
    e.preventDefault();
    
    if (!formData.measurement_description.trim()) {
      return;
    }

    try {
      await addInspectionItem(operationId, {
        measurement_description: formData.measurement_description,
        tolerance: formData.tolerance || null,
        min_value: formData.min_value ? parseFloat(formData.min_value) : null,
        max_value: formData.max_value ? parseFloat(formData.max_value) : null,
        nominal_value: formData.nominal_value ? parseFloat(formData.nominal_value) : null,
        mean_value: formData.mean_value ? parseFloat(formData.mean_value) : null,
        measuring_tool: formData.measuring_tool || null,
        instruction: formData.instruction || null
      });
      
      resetForm();
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  // Handle edit item - load into form
  const handleEditItem = (item) => {
    setFormData({
      measurement_description: item.measurement_description,
      tolerance: item.tolerance || '',
      min_value: item.min_value || '',
      max_value: item.max_value || '',
      nominal_value: item.nominal_value || '',
      mean_value: item.mean_value || '',
      measuring_tool: item.measuring_tool || '',
      instruction: item.instruction || ''
    });
    
    // Erkenne Toleranz-Typ anhand der vorhandenen Werte
    if (!item.nominal_value && item.max_value) {
      // Form-/Lagetoleranz: Kein Sollmaß, nur Max-Wert
      setToleranceMode('form_position');
      setUpperDeviation('');
      setLowerDeviation('');
    } else if (item.nominal_value && item.max_value && item.min_value) {
      // Maßtoleranz mit Abmaßen
      setToleranceMode('manual');
      
      const nominal = parseFloat(item.nominal_value);
      const max = parseFloat(item.max_value);
      const min = parseFloat(item.min_value);
      
      const upper = max - nominal;
      const lower = min - nominal;
      
      setUpperDeviation(upper.toString());
      setLowerDeviation(lower.toString());
    } else {
      // Fallback: Manual-Modus
      setToleranceMode('manual');
      setUpperDeviation('');
      setLowerDeviation('');
    }
    
    setEditingItemId(item.id);
    setShowAddForm(false); // Close add form if open
  };

  // Handle update item
  const handleUpdateItem = async (e) => {
    e.preventDefault();
    
    if (!formData.measurement_description.trim()) {
      return;
    }

    try {
      await updateInspectionItem(editingItemId, {
        measurement_description: formData.measurement_description,
        tolerance: formData.tolerance || null,
        min_value: formData.min_value ? parseFloat(formData.min_value) : null,
        max_value: formData.max_value ? parseFloat(formData.max_value) : null,
        nominal_value: formData.nominal_value ? parseFloat(formData.nominal_value) : null,
        mean_value: formData.mean_value ? parseFloat(formData.mean_value) : null,
        measuring_tool: formData.measuring_tool || null,
        instruction: formData.instruction || null
      }, operationId);
      
      resetForm();
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  // Handle delete item
  const handleDeleteItem = async (itemId) => {
    if (!confirm('Prüfpunkt wirklich löschen?')) return;
    
    try {
      await deleteInspectionItem(itemId, operationId);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  // Loading state
  if (loading && !inspectionPlan) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Lade Prüfplan...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
      </div>
    );
  }

  const items = inspectionPlan?.items || [];

  // Render form fields (reusable for both Add and Edit)
  const renderFormFields = (formType = 'add') => (
    <>
      {/* Measurement Description */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Maß / Merkmal *
        </label>
        <input
          type="text"
          value={formData.measurement_description}
          onChange={(e) => setFormData({ ...formData, measurement_description: e.target.value })}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Was soll geprüft werden?"
        />
      </div>

      {/* Nominal Value - nur bei Maßtoleranzen */}
      {toleranceMode !== 'form_position' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Sollmaß (Nennmaß) * <span className="text-xs text-gray-500">(für Toleranzberechnung in mm)</span>
          </label>
          <input
            type="number"
            step="0.0001"
            value={formData.nominal_value}
            onChange={(e) => setFormData({ ...formData, nominal_value: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="10.00"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            💡 Bei allen Toleranzarten werden Min/Max/Mittelwert automatisch berechnet
          </p>
        </div>
      )}

      {/* Tolerance Type Selection */}
      <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
        <label className="block text-xs font-semibold text-gray-900 dark:text-white mb-2">
          Toleranzart
        </label>

        {/* Manual */}
        <div className="flex items-start gap-3">
          <input
            type="radio"
            id={`tolerance-manual-${formType}`}
            name={`tolerance-mode-${formType}`}
            checked={toleranceMode === 'manual'}
            onChange={() => setToleranceMode('manual')}
            className="mt-1"
          />
          <div className="flex-1">
            <label htmlFor={`tolerance-manual-${formType}`} className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
              Manuell
            </label>
            {toleranceMode === 'manual' && (
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Oberes Abmaß
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={upperDeviation}
                      onChange={(e) => setUpperDeviation(e.target.value)}
                      placeholder="+0.1"
                      className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                               focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Unteres Abmaß
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={lowerDeviation}
                      onChange={(e) => setLowerDeviation(e.target.value)}
                      placeholder="-0.1"
                      className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                               focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                {/* Calculated Tolerance Display */}
                {formData.tolerance && (
                  <div className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Berechnet:</span>
                    <div className="font-mono text-sm text-gray-900 dark:text-white mt-1">
                      {formData.tolerance}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ISO 286 */}
        <div className="flex items-start gap-3">
          <input
            type="radio"
            id={`tolerance-iso286-${formType}`}
            name={`tolerance-mode-${formType}`}
            checked={toleranceMode === 'iso286'}
            onChange={() => setToleranceMode('iso286')}
            className="mt-1"
          />
          <div className="flex-1">
            <label htmlFor={`tolerance-iso286-${formType}`} className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
              ISO 286 Passtoleranz
            </label>
            {toleranceMode === 'iso286' && (
              <div className="mt-2 flex gap-2">
                <select
                  value={iso286Letter}
                  onChange={(e) => setIso286Letter(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {AVAILABLE_TOLERANCES.iso286.letters.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select
                  value={iso286Grade}
                  onChange={(e) => setIso286Grade(parseInt(e.target.value))}
                  className="w-20 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {AVAILABLE_TOLERANCES.iso286.grades.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ISO 2768 */}
        <div className="flex items-start gap-3">
          <input
            type="radio"
            id={`tolerance-iso2768-${formType}`}
            name={`tolerance-mode-${formType}`}
            checked={toleranceMode === 'iso2768'}
            onChange={() => setToleranceMode('iso2768')}
            className="mt-1"
          />
          <div className="flex-1">
            <label htmlFor={`tolerance-iso2768-${formType}`} className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
              ISO 2768 Allgemeintoleranz
            </label>
            {toleranceMode === 'iso2768' && (
              <div className="mt-2">
                <select
                  value={iso2768Grade}
                  onChange={(e) => setIso2768Grade(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {AVAILABLE_TOLERANCES.iso2768.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Form-/Lagetoleranz */}
        <div className="flex items-start gap-3">
          <input
            type="radio"
            id={`tolerance-form-position-${formType}`}
            name={`tolerance-mode-${formType}`}
            checked={toleranceMode === 'form_position'}
            onChange={() => setToleranceMode('form_position')}
            className="mt-1"
          />
          <div className="flex-1">
            <label htmlFor={`tolerance-form-position-${formType}`} className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
              Form-/Lagetoleranz
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Für Ebenheit, Rundheit, Parallelität, etc.
            </p>
            {toleranceMode === 'form_position' && (
              <div className="mt-2">
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Toleranzwert (max)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.max_value}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      max_value: val,
                      tolerance: val ? val : ''
                    }));
                  }}
                  placeholder="0.2"
                  className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                           focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  z.B. Ebenheit 0,2 → nur Maximalwert
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Display calculated tolerance for ISO modes */}
        {toleranceMode !== 'manual' && toleranceMode !== 'form_position' && formData.tolerance && (
          <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
            <span className="text-xs text-gray-500 dark:text-gray-400">Berechnete Toleranz:</span>
            <div className="font-mono text-sm text-gray-900 dark:text-white mt-1">
              {formData.tolerance}
            </div>
          </div>
        )}
      </div>

      {/* Min / Soll/Mittel / Max Values - ALWAYS LOCKED */}
      {toleranceMode === 'form_position' ? (
        /* Form-/Lagetoleranz: Nur Max-Wert */
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Maximalwert <span className="text-xs text-blue-600 dark:text-blue-400">(eingegeben)</span>
          </label>
          <input
            type="number"
            step="0.0001"
            value={formData.max_value}
            disabled={true}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
            placeholder="0.2"
          />
        </div>
      ) : (
        /* Maßtoleranzen: Min/Mittel/Max Grid */
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Min <span className="text-xs text-blue-600 dark:text-blue-400">(berechnet)</span>
            </label>
            <input
              type="number"
              step="0.0001"
              value={formData.min_value}
              disabled={true}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
              placeholder="9.95"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Soll/Mittel <span className="text-xs text-blue-600 dark:text-blue-400">(berechnet)</span>
            </label>
            <input
              type="number"
              step="0.0001"
              value={formData.mean_value}
              disabled={true}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 text-sm font-semibold
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:bg-blue-100 dark:disabled:bg-blue-900/30 disabled:cursor-not-allowed"
              placeholder="10.00"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max <span className="text-xs text-blue-600 dark:text-blue-400">(berechnet)</span>
            </label>
            <input
              type="number"
              step="0.0001"
              value={formData.max_value}
              disabled={true}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
              placeholder="10.05"
            />
          </div>
        </div>
      )}

      {/* Measuring Tool */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Messmittel
        </label>
        <input
          type="text"
          value={formData.measuring_tool}
          onChange={(e) => setFormData({ ...formData, measuring_tool: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="z.B. Messschieber 0-150mm, 3D-Messmaschine"
        />
      </div>

      {/* Instruction */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Messanweisung
        </label>
        <textarea
          value={formData.instruction}
          onChange={(e) => setFormData({ ...formData, instruction: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Besondere Hinweise zur Messung..."
          rows={2}
        />
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Prüfplan
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Prüfpunkte für die Qualitätskontrolle definieren
          </p>
        </div>
      </div>

      {/* Notes Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
          Allgemeine Hinweise
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleSaveNotes}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Allgemeine Prüfanweisungen oder Hinweise..."
          rows={3}
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          💾 Wird automatisch beim Verlassen des Feldes gespeichert
        </p>
      </div>

      {/* Items Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Add Item Button */}
        {!showAddForm && !editingItemId && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg
                       transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <span>➕</span>
              <span>Prüfpunkt hinzufügen</span>
            </button>
          </div>
        )}

        {/* Add Form - shown at top */}
        {showAddForm && !editingItemId && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Neuer Prüfpunkt
            </h4>
            
            <form onSubmit={handleAddItem} className="space-y-4">
              {renderFormFields('add')}

              {/* Form Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400
                           text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  Hinzufügen
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
                           text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Items List */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {items.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">📏</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Noch keine Prüfpunkte definiert
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Klicke auf "Prüfpunkt hinzufügen" um zu starten
              </p>
            </div>
          ) : (
            items.map((item, index) => (
              <div key={item.id}>
                {/* Item Display */}
                <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex gap-3">
                    {/* Sequence Number & Reorder */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-6 text-center">
                        #{item.sequence_number}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveItemUp(operationId, item.id)}
                          disabled={index === 0 || loading || editingItemId === item.id}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Nach oben"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveItemDown(operationId, item.id)}
                          disabled={index === items.length - 1 || loading || editingItemId === item.id}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Nach unten"
                        >
                          ▼
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      {/* 1. Zeile: Measurement Description */}
                      <div className="font-medium text-gray-900 dark:text-white mb-2">
                        {item.measurement_description}
                      </div>

                      {/* 2. Zeile: Sollmaß + Toleranz (oder nur Toleranz bei Form-/Lage) */}
                      {(item.nominal_value || item.tolerance) && (
                        <div className="mb-2 flex items-center gap-2">
                          {item.nominal_value ? (
                            /* Maßtoleranz: Sollmaß + Toleranz */
                            <>
                              <span className="text-xs text-gray-500 dark:text-gray-400">Sollmaß:</span>
                              <span className="font-mono text-sm text-blue-600 dark:text-blue-400 font-semibold">
                                {item.nominal_value}
                              </span>
                              {item.tolerance && (
                                <>
                                  <span className="text-gray-400 dark:text-gray-600 mx-1">•</span>
                                  <span className="font-mono text-sm text-blue-600 dark:text-blue-400 font-semibold">
                                    {item.tolerance}
                                  </span>
                                </>
                              )}
                            </>
                          ) : (
                            /* Form-/Lagetoleranz: Nur Toleranz */
                            item.tolerance && (
                              <>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Toleranz:</span>
                                <span className="font-mono text-sm text-blue-600 dark:text-blue-400 font-semibold">
                                  {item.tolerance}
                                </span>
                              </>
                            )
                          )}
                        </div>
                      )}

                      {/* 3. Zeile: Values - unterschiedlich für Maß- vs. Form-/Lagetoleranzen */}
                      {item.nominal_value ? (
                        /* Maßtoleranz: Min/Mittel/Max Grid */
                        <div className="grid grid-cols-3 gap-3 mb-2">
                          {item.min_value && (
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">Min</div>
                              <div className="text-sm font-mono text-gray-700 dark:text-gray-300">{item.min_value}</div>
                            </div>
                          )}
                          {item.mean_value && (
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">Mittel</div>
                              <div className="text-sm font-mono text-gray-700 dark:text-gray-300">{item.mean_value}</div>
                            </div>
                          )}
                          {item.max_value && (
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">Max</div>
                              <div className="text-sm font-mono text-gray-700 dark:text-gray-300">{item.max_value}</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Form-/Lagetoleranz: Nur Max-Wert */
                        item.max_value && (
                          <div className="mb-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Maximalwert: </span>
                            <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{item.max_value}</span>
                          </div>
                        )
                      )}

                      {/* Measuring Tool */}
                      {item.measuring_tool && (
                        <div className="mb-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Messmittel: </span>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{item.measuring_tool}</span>
                        </div>
                      )}

                      {/* Instruction */}
                      {item.instruction && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 rounded p-2 border-l-2 border-blue-500">
                          {item.instruction}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleEditItem(item)}
                        disabled={editingItemId !== null}
                        className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Bearbeiten"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={editingItemId !== null}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Löschen"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>

                {/* Edit Form - directly below the item */}
                {editingItemId === item.id && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border-t border-b border-yellow-200 dark:border-yellow-800">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <span>✏️</span>
                      <span>Prüfpunkt bearbeiten</span>
                    </h4>
                    
                    <form onSubmit={handleUpdateItem} className="space-y-4">
                      {renderFormFields('edit')}

                      {/* Form Actions */}
                      <div className="flex gap-2 pt-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400
                                   text-white text-sm font-medium rounded-lg transition-colors duration-200"
                        >
                          Aktualisieren
                        </button>
                        <button
                          type="button"
                          onClick={resetForm}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
                                   text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors duration-200"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
