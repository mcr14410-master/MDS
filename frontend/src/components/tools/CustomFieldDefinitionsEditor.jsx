import { useState } from 'react';
import { X, Plus, Info } from 'lucide-react';
import SortableFieldsList from './SortableFieldsList';

/**
 * CustomFieldDefinitionsEditor Component
 * Modal for managing custom_field_definitions for a category (Admin only)
 * 
 * @param {object} category - Category to edit
 * @param {function} onClose - Close modal callback
 * @param {function} onSave - Save callback(categoryId, definitions)
 */
export default function CustomFieldDefinitionsEditor({ category, onClose, onSave }) {
  const [definitions, setDefinitions] = useState(category?.custom_field_definitions || []);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [fieldForm, setFieldForm] = useState({
    key: '',
    label: '',
    type: 'text',
    required: false,
    default: null,
    unit: '',
    placeholder: '',
    help: '',
    min: '',
    max: '',
    step: '',
    maxLength: '',
    options: []
  });

  const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Zahl' },
    { value: 'select', label: 'Dropdown' },
    { value: 'checkbox', label: 'Checkbox' }
  ];

  const handleAddField = () => {
    setEditingIndex(null);
    setFieldForm({
      key: '',
      label: '',
      type: 'text',
      required: false,
      default: null,
      unit: '',
      placeholder: '',
      help: '',
      min: '',
      max: '',
      step: '',
      maxLength: '',
      options: []
    });
    setShowFieldForm(true);
  };

  const handleEditField = (index) => {
    const field = definitions[index];
    setEditingIndex(index);
    setFieldForm({
      key: field.key || '',
      label: field.label || '',
      type: field.type || 'text',
      required: field.required || false,
      default: field.default || null,
      unit: field.unit || '',
      placeholder: field.placeholder || '',
      help: field.help || '',
      min: field.min !== undefined ? field.min : '',
      max: field.max !== undefined ? field.max : '',
      step: field.step !== undefined ? field.step : '',
      maxLength: field.maxLength || '',
      options: field.options || []
    });
    setShowFieldForm(true);
  };

  const handleDeleteField = (index) => {
    const field = definitions[index];
    if (window.confirm(`Feld "${field.label}" wirklich löschen?`)) {
      const newDefinitions = definitions.filter((_, i) => i !== index);
      setDefinitions(newDefinitions);
    }
  };

  const handleReorder = (newFields) => {
    setDefinitions(newFields);
  };

  const handleFieldFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFieldForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveField = () => {
    // Validate
    if (!fieldForm.key || !fieldForm.label) {
      alert('Key und Label sind Pflichtfelder!');
      return;
    }

    // Check for duplicate key (except when editing same field)
    const isDuplicate = definitions.some((def, idx) => 
      def.key === fieldForm.key && idx !== editingIndex
    );
    if (isDuplicate) {
      alert(`Ein Feld mit dem Key "${fieldForm.key}" existiert bereits!`);
      return;
    }

    // Build field definition object
    const newField = {
      key: fieldForm.key,
      label: fieldForm.label,
      type: fieldForm.type,
      required: fieldForm.required
    };

    // Add type-specific properties
    if (fieldForm.default !== null && fieldForm.default !== '') {
      newField.default = fieldForm.type === 'number' ? parseFloat(fieldForm.default) : fieldForm.default;
    }

    if (fieldForm.placeholder) newField.placeholder = fieldForm.placeholder;
    if (fieldForm.help) newField.help = fieldForm.help;

    if (fieldForm.type === 'number') {
      if (fieldForm.unit) newField.unit = fieldForm.unit;
      if (fieldForm.min !== '') newField.min = parseFloat(fieldForm.min);
      if (fieldForm.max !== '') newField.max = parseFloat(fieldForm.max);
      if (fieldForm.step !== '') newField.step = parseFloat(fieldForm.step);
    }

    if (fieldForm.type === 'text') {
      if (fieldForm.maxLength) newField.maxLength = parseInt(fieldForm.maxLength);
    }

    if (fieldForm.type === 'select') {
      newField.options = fieldForm.options;
    }

    // Add or update field
    if (editingIndex !== null) {
      const newDefinitions = [...definitions];
      newDefinitions[editingIndex] = newField;
      setDefinitions(newDefinitions);
    } else {
      setDefinitions([...definitions, newField]);
    }

    setShowFieldForm(false);
  };

  const handleSaveAll = () => {
    // Add sequence to each field based on array position
    const definitionsWithSequence = definitions.map((field, index) => ({
      ...field,
      sequence: index
    }));
    
    onSave(category.id, definitionsWithSequence);
    onClose();
  };

  // Handle options for select type
  const handleAddOption = () => {
    setFieldForm(prev => ({
      ...prev,
      options: [...prev.options, { value: '', label: '' }]
    }));
  };

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...fieldForm.options];
    newOptions[index][field] = value;
    setFieldForm(prev => ({ ...prev, options: newOptions }));
  };

  const handleRemoveOption = (index) => {
    const newOptions = fieldForm.options.filter((_, i) => i !== index);
    setFieldForm(prev => ({ ...prev, options: newOptions }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Custom Fields Editor</h2>
            <p className="text-sm text-gray-400 mt-1">
              Kategorie: {category?.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!showFieldForm ? (
            <>
              {/* Field List */}
              {definitions.length === 0 ? (
                <div className="text-center py-12 bg-gray-900/50 rounded-lg border border-gray-700">
                  <Info className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">Keine Custom Fields definiert</p>
                  <p className="text-sm text-gray-500 mt-1">Klicke auf "Feld hinzufügen" um zu starten</p>
                </div>
              ) : (
                <SortableFieldsList
                  fields={definitions}
                  onReorder={handleReorder}
                  onEdit={handleEditField}
                  onDelete={handleDeleteField}
                />
              )}

              {/* Add Field Button */}
              <button
                onClick={handleAddField}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Feld hinzufügen
              </button>
            </>
          ) : (
            /* Field Form */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Key (Technischer Name) *
                  </label>
                  <input
                    type="text"
                    name="key"
                    value={fieldForm.key}
                    onChange={handleFieldFormChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white font-mono focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. corner_radius"
                  />
                  <p className="text-xs text-gray-500 mt-1">Nur Kleinbuchstaben und Unterstriche</p>
                </div>

                {/* Label */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Label (Anzeigename) *
                  </label>
                  <input
                    type="text"
                    name="label"
                    value={fieldForm.label}
                    onChange={handleFieldFormChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. Eckradius"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Feldtyp *
                  </label>
                  <select
                    name="type"
                    value={fieldForm.type}
                    onChange={handleFieldFormChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {fieldTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                {/* Required */}
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="required"
                      checked={fieldForm.required}
                      onChange={handleFieldFormChange}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">Pflichtfeld</span>
                  </label>
                </div>
              </div>

              {/* Type-specific fields */}
              {fieldForm.type === 'number' && (
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Min</label>
                    <input
                      type="number"
                      name="min"
                      value={fieldForm.min}
                      onChange={handleFieldFormChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Max</label>
                    <input
                      type="number"
                      name="max"
                      value={fieldForm.max}
                      onChange={handleFieldFormChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Step</label>
                    <input
                      type="number"
                      name="step"
                      step="0.01"
                      value={fieldForm.step}
                      onChange={handleFieldFormChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Einheit</label>
                    <input
                      type="text"
                      name="unit"
                      value={fieldForm.unit}
                      onChange={handleFieldFormChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="mm, °"
                    />
                  </div>
                </div>
              )}

              {fieldForm.type === 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Max. Länge</label>
                  <input
                    type="number"
                    name="maxLength"
                    value={fieldForm.maxLength}
                    onChange={handleFieldFormChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. 50"
                  />
                </div>
              )}

              {fieldForm.type === 'select' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Optionen</label>
                  <div className="space-y-2">
                    {fieldForm.options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={option.value}
                          onChange={(e) => handleOptionChange(index, 'value', e.target.value)}
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500"
                          placeholder="Value"
                        />
                        <input
                          type="text"
                          value={option.label}
                          onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500"
                          placeholder="Label"
                        />
                        <button
                          onClick={() => handleRemoveOption(index)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleAddOption}
                      className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors text-sm"
                    >
                      + Option hinzufügen
                    </button>
                  </div>
                </div>
              )}

              {/* Common fields */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Placeholder</label>
                <input
                  type="text"
                  name="placeholder"
                  value={fieldForm.placeholder}
                  onChange={handleFieldFormChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. z.B. 0.2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Hilfetext</label>
                <textarea
                  name="help"
                  value={fieldForm.help}
                  onChange={handleFieldFormChange}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Optionaler Hilfetext für den Benutzer"
                />
              </div>

              {/* Field Form Actions */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleSaveField}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  {editingIndex !== null ? 'Aktualisieren' : 'Hinzufügen'}
                </button>
                <button
                  onClick={() => setShowFieldForm(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!showFieldForm && (
          <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-900/50">
            <div className="text-sm text-gray-400">
              {definitions.length} Feld{definitions.length !== 1 ? 'er' : ''} definiert
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveAll}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                Speichern
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
