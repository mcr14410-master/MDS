import { useState, useEffect } from 'react';
import { useConsumablesStore } from '../../stores/consumablesStore';
import { X, Plus, Edit2, Trash2, Save, Tag } from 'lucide-react';

const CATEGORY_COLORS = [
  { value: 'blue', label: 'Blau', class: 'bg-blue-500' },
  { value: 'amber', label: 'Gelb', class: 'bg-amber-500' },
  { value: 'green', label: 'Grün', class: 'bg-green-500' },
  { value: 'red', label: 'Rot', class: 'bg-red-500' },
  { value: 'purple', label: 'Lila', class: 'bg-purple-500' },
  { value: 'gray', label: 'Grau', class: 'bg-gray-500' },
  { value: 'slate', label: 'Schiefer', class: 'bg-slate-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
];

export default function ConsumableCategoriesModal({ isOpen, onClose }) {
  const { categories, fetchCategories, createCategory, updateCategory, deleteCategory } = useConsumablesStore();
  
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', color: 'blue' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({ name: '', description: '', color: 'blue' });
    setEditingId(null);
    setShowAddForm(false);
    setError(null);
  };

  const handleEdit = (category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || 'blue'
    });
    setShowAddForm(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Name ist erforderlich');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (editingId) {
        await updateCategory(editingId, formData);
      } else {
        await createCategory(formData);
      }
      resetForm();
      fetchCategories();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Kategorie wirklich löschen?')) return;
    
    setLoading(true);
    try {
      await deleteCategory(id);
      fetchCategories();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Kategorien verwalten
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Add/Edit Form */}
        {(showAddForm || editingId) && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="z.B. Kühlschmierstoffe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Beschreibung
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Farbe
              </label>
              <div className="flex gap-2 flex-wrap">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`w-8 h-8 rounded-full ${color.class} ${
                      formData.color === color.value ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                    }`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                <Save className="h-4 w-4" />
                {editingId ? 'Aktualisieren' : 'Erstellen'}
              </button>
              <button
                onClick={resetForm}
                className="px-3 py-1.5 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {/* Add Button */}
        {!showAddForm && !editingId && (
          <button
            onClick={() => setShowAddForm(true)}
            className="mb-4 flex items-center gap-2 px-3 py-2 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 w-full justify-center"
          >
            <Plus className="h-4 w-4" />
            Neue Kategorie
          </button>
        )}

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {categories.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              Keine Kategorien vorhanden
            </p>
          ) : (
            categories.map((cat) => (
              <div
                key={cat.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  editingId === cat.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full bg-${cat.color || 'gray'}-500`} />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{cat.name}</div>
                    {cat.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">{cat.description}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400 mr-2">
                    {cat.consumable_count || 0} Artikel
                  </span>
                  <button
                    onClick={() => handleEdit(cat)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    disabled={cat.consumable_count > 0}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title={cat.consumable_count > 0 ? 'Kategorie hat noch Artikel' : 'Löschen'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
