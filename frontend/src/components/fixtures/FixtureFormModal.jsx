import { useState, useEffect, useMemo } from 'react';
import { useFixturesStore } from '../../stores/fixturesStore';
import { usePartsStore } from '../../stores/partsStore';
import { useMachinesStore } from '../../stores/machinesStore';
import { toast } from '../Toaster';
import axios from '../../utils/axios';

export default function FixtureFormModal({ fixture, types, onClose }) {
  const { createFixture, updateFixture, checkFixtureNumber } = useFixturesStore();
  const { parts, fetchParts } = usePartsStore();
  const { machines, fetchMachines } = useMachinesStore();
  
  const [loading, setLoading] = useState(false);
  const [operations, setOperations] = useState([]);
  const [numberError, setNumberError] = useState('');
  const [partSearch, setPartSearch] = useState('');
  const [showPartDropdown, setShowPartDropdown] = useState(false);
  const [formData, setFormData] = useState({
    fixture_number: '',
    name: '',
    type_id: '',
    part_id: '',
    operation_id: '',
    machine_id: '',
    notes: '',
  });

  const isEditing = Boolean(fixture);

  // Filter parts based on search
  const filteredParts = useMemo(() => {
    if (!parts) return [];
    if (!partSearch.trim()) return parts;
    
    const search = partSearch.toLowerCase();
    return parts.filter(part => 
      part.part_number?.toLowerCase().includes(search) ||
      part.part_name?.toLowerCase().includes(search)
    );
  }, [parts, partSearch]);

  // Get selected part display text
  const selectedPartText = useMemo(() => {
    if (!formData.part_id) return '';
    const part = parts?.find(p => p.id === parseInt(formData.part_id));
    return part ? `${part.part_number} - ${part.part_name}` : '';
  }, [parts, formData.part_id]);

  useEffect(() => {
    fetchParts();
    fetchMachines();
    
    if (fixture) {
      setFormData({
        fixture_number: fixture.fixture_number || '',
        name: fixture.name || '',
        type_id: fixture.type_id || '',
        part_id: fixture.part_id || '',
        operation_id: fixture.operation_id || '',
        machine_id: fixture.machine_id || '',
        notes: fixture.notes || '',
      });
      
      // Load operations for selected part
      if (fixture.part_id) {
        loadOperations(fixture.part_id);
      }
    }
  }, [fixture]);

  const loadOperations = async (partId) => {
    if (!partId) {
      setOperations([]);
      return;
    }
    
    try {
      const response = await axios.get(`/api/operations?part_id=${partId}`);
      setOperations(response.data.data || []);
    } catch (error) {
      console.error('Error loading operations:', error);
      setOperations([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(f => ({
      ...f,
      [name]: value
    }));
    
    // Load operations when part changes
    if (name === 'part_id') {
      setFormData(f => ({ ...f, operation_id: '' }));
      loadOperations(value);
    }
    
    // Check fixture number uniqueness
    if (name === 'fixture_number' && value && value !== fixture?.fixture_number) {
      checkNumberAvailability(value);
    }
  };

  const checkNumberAvailability = async (number) => {
    try {
      const result = await checkFixtureNumber(number);
      if (!result.available) {
        setNumberError('Diese Vorrichtungsnummer existiert bereits');
      } else {
        setNumberError('');
      }
    } catch (error) {
      console.error('Error checking number:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.fixture_number || !formData.type_id) {
      toast.error('Bitte Vorrichtungsnummer und Typ ausfüllen');
      return;
    }
    
    if (numberError) {
      toast.error('Vorrichtungsnummer existiert bereits');
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
        await updateFixture(fixture.id, submitData);
        toast.success('Vorrichtung aktualisiert');
      } else {
        await createFixture(submitData);
        toast.success('Vorrichtung erstellt');
      }
      onClose(true);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div 
          className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75"
          onClick={() => onClose(false)}
        />
        
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isEditing ? 'Vorrichtung bearbeiten' : 'Neue Vorrichtung'}
            </h2>
            <button
              onClick={() => onClose(false)}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Grunddaten */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Grunddaten
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Vorrichtungsnummer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Vorrichtungs-Nr. *
                  </label>
                  <input
                    type="text"
                    name="fixture_number"
                    value={formData.fixture_number}
                    onChange={handleChange}
                    placeholder="z.B. V00123"
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono
                      ${numberError 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'
                      }`}
                    required
                  />
                  {numberError && (
                    <p className="mt-1 text-sm text-red-500">{numberError}</p>
                  )}
                </div>

                {/* Typ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Typ *
                  </label>
                  <select
                    name="type_id"
                    value={formData.type_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Typ wählen...</option>
                    {types?.filter(t => t.is_active).map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bezeichnung */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bezeichnung / Beschreibung
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Optionale Bezeichnung"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Zuordnungen */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Zuordnungen (optional)
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {/* Bauteil - Suchbares Dropdown */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bauteil
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={showPartDropdown ? partSearch : selectedPartText}
                      onChange={(e) => {
                        setPartSearch(e.target.value);
                        setShowPartDropdown(true);
                      }}
                      onFocus={() => setShowPartDropdown(true)}
                      placeholder="Bauteil suchen (Nr. oder Name)..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
                    />
                    {formData.part_id && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(f => ({ ...f, part_id: '', operation_id: '' }));
                          setPartSearch('');
                          setOperations([]);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  {/* Dropdown List */}
                  {showPartDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredParts.length === 0 ? (
                        <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
                          Keine Bauteile gefunden
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(f => ({ ...f, part_id: '', operation_id: '' }));
                              setPartSearch('');
                              setOperations([]);
                              setShowPartDropdown(false);
                            }}
                            className="w-full px-3 py-2 text-left text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm italic"
                          >
                            Kein Bauteil
                          </button>
                          {filteredParts.slice(0, 50).map((part) => (
                            <button
                              key={part.id}
                              type="button"
                              onClick={() => {
                                setFormData(f => ({ ...f, part_id: part.id, operation_id: '' }));
                                setPartSearch('');
                                setShowPartDropdown(false);
                                loadOperations(part.id);
                              }}
                              className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-sm ${
                                formData.part_id === part.id ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''
                              }`}
                            >
                              <span className="font-mono font-medium text-gray-900 dark:text-white">
                                {part.part_number}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 ml-2">
                                {part.part_name}
                              </span>
                            </button>
                          ))}
                          {filteredParts.length > 50 && (
                            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600">
                              +{filteredParts.length - 50} weitere - Suche verfeinern
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Click outside to close */}
                  {showPartDropdown && (
                    <div 
                      className="fixed inset-0 z-0" 
                      onClick={() => setShowPartDropdown(false)}
                    />
                  )}
                </div>

                {/* Operation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Operation
                  </label>
                  <select
                    name="operation_id"
                    value={formData.operation_id}
                    onChange={handleChange}
                    disabled={!formData.part_id}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Keine Operation</option>
                    {operations?.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.op_number}: {op.op_name}
                      </option>
                    ))}
                  </select>
                  {!formData.part_id && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Wählen Sie zuerst ein Bauteil
                    </p>
                  )}
                </div>

                {/* Maschine */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Maschine
                  </label>
                  <select
                    name="machine_id"
                    value={formData.machine_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Keine Maschine</option>
                    {machines?.filter(m => m.is_active).map((machine) => (
                      <option key={machine.id} value={machine.id}>
                        {machine.machine_id}: {machine.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Bemerkungen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bemerkungen
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
                placeholder="Optionale Bemerkungen..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => onClose(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading || !!numberError}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {isEditing ? 'Speichern' : 'Erstellen'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
