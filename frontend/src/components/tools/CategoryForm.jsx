import { useState, useEffect } from 'react';
import { useToolCategoriesStore } from '../../stores/toolCategoriesStore';
import { toast } from '../Toaster';
import { X } from 'lucide-react';

const TOOL_ICONS = [
  { value: 'mill', label: 'Milling ⚙️' },
  { value: 'drill', label: 'Drilling 🔧' },
  { value: 'turn', label: 'Turning 🔄' },
  { value: 'tap', label: 'Threading 🔩' },
  { value: 'ream', label: 'Reaming 📐' },
  { value: 'bore', label: 'Boring ⚫' },
  { value: 'insert', label: 'Inserts 📎' },
  { value: 'grind', label: 'Grinding 💎' },
  { value: 'spark', label: 'EDM ⚡' },
  { value: 'saw', label: 'Sawing 🪚' },
  { value: 'tool', label: 'Generic Tool 🔨' },
];

export default function CategoryForm({ category, onClose, onSuccess }) {
  const { createCategory, updateCategory, loading } = useToolCategoriesStore();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'tool',
    sequence: 0,
    is_active: true,
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        icon: category.icon || 'tool',
        sequence: category.sequence || 0,
        is_active: category.is_active !== undefined ? category.is_active : true,
      });
    }
  }, [category]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name) {
      toast.error('Bitte geben Sie einen Namen ein');
      return;
    }

    let result;
    if (category) {
      result = await updateCategory(category.id, formData);
    } else {
      result = await createCategory(formData);
    }

    if (result.success) {
      toast.success(category ? 'Kategorie erfolgreich aktualisiert' : 'Kategorie erfolgreich erstellt');
      onSuccess();
    } else {
      toast.error(result.error || 'Fehler beim Speichern');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {category ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4">
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Milling"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Beschreibung
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Beschreibung der Kategorie"
                />
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Icon</label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TOOL_ICONS.map((icon) => (
                    <option key={icon.value} value={icon.value}>
                      {icon.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sequence */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sortierung
                </label>
                <input
                  type="number"
                  value={formData.sequence}
                  onChange={(e) => setFormData({ ...formData, sequence: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Niedrigere Zahlen erscheinen zuerst
                </p>
              </div>

              {/* Active */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Aktiv</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Speichern...' : category ? 'Aktualisieren' : 'Erstellen'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
