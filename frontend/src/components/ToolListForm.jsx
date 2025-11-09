// frontend/src/components/ToolListForm.jsx
import { useState, useEffect } from 'react';
import { useToolListsStore } from '../stores/toolListsStore';
import { toast } from './Toaster';

const TOOL_TYPES = [
  'Bohrer',
  'Fräser',
  'Gewinde',
  'Reibahle',
  'Drehmeißel',
  'Sonstige'
];

export default function ToolListForm({ programId, editingTool, onClose, onSuccess }) {
  const { addToolItem, updateToolItem, loading } = useToolListsStore();
  
  const [formData, setFormData] = useState({
    tool_number: '',
    description: '',
    tool_type: '',
    manufacturer: '',
    order_number: '',
    tool_holder: '',
    tool_life_info: '',
    notes: ''
  });

  // Populate form when editing
  useEffect(() => {
    if (editingTool) {
      setFormData({
        tool_number: editingTool.tool_number || '',
        description: editingTool.description || '',
        tool_type: editingTool.tool_type || '',
        manufacturer: editingTool.manufacturer || '',
        order_number: editingTool.order_number || '',
        tool_holder: editingTool.tool_holder || '',
        tool_life_info: editingTool.tool_life_info || '',
        notes: editingTool.notes || ''
      });
    }
  }, [editingTool]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.tool_number.trim()) {
      toast.error('Werkzeugnummer ist erforderlich');
      return;
    }

    try {
      if (editingTool) {
        await updateToolItem(editingTool.id, formData);
        toast.success('Werkzeug erfolgreich aktualisiert');
      } else {
        await addToolItem(programId, formData);
        toast.success('Werkzeug erfolgreich hinzugefügt');
      }
      onSuccess();
    } catch (error) {
      toast.error(error.message || 'Fehler beim Speichern');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editingTool ? 'Werkzeug bearbeiten' : 'Werkzeug hinzufügen'}
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tool Number - REQUIRED */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Werkzeugnummer <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="tool_number"
              value={formData.tool_number}
              onChange={handleChange}
              placeholder="z.B. T01, T5, T12345"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Beschreibung
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="z.B. Schaftfräser D10 Z4"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Tool Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Werkzeugtyp
            </label>
            <select
              name="tool_type"
              value={formData.tool_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Bitte wählen...</option>
              {TOOL_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Manufacturer & Order Number - Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hersteller
              </label>
              <input
                type="text"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
                placeholder="z.B. Sandvik, Walter, Gühring"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bestellnummer
              </label>
              <input
                type="text"
                name="order_number"
                value={formData.order_number}
                onChange={handleChange}
                placeholder="Artikel-/Bestellnummer"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Tool Holder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Werkzeughalter
            </label>
            <input
              type="text"
              name="tool_holder"
              value={formData.tool_holder}
              onChange={handleChange}
              placeholder="z.B. HSK63A, ER32, SK40"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Tool Life Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Standzeit / Standmenge
            </label>
            <input
              type="text"
              name="tool_life_info"
              value={formData.tool_life_info}
              onChange={handleChange}
              placeholder="z.B. 500 Bohrungen, 2 Stunden"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notizen
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Zusätzliche Informationen..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                       flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {editingTool ? 'Aktualisieren' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
