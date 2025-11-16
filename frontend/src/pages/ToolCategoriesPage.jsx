import { useEffect, useState } from 'react';
import { useToolCategoriesStore } from '../stores/toolCategoriesStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../components/Toaster';
import { FolderTree, Plus } from 'lucide-react';
import CategoryCard from '../components/tools/CategoryCard';
import CategoryForm from '../components/tools/CategoryForm';
import SubcategoryCard from '../components/tools/SubcategoryCard';
import SubcategoryForm from '../components/tools/SubcategoryForm';
import CustomFieldDefinitionsEditor from '../components/tools/CustomFieldDefinitionsEditor';
import SortableCategoriesList from '../components/tools/SortableCategoriesList';
import SortableSubcategoriesList from '../components/tools/SortableSubcategoriesList';

export default function ToolCategoriesPage() {
  const { categories, subcategories, loading, error, fetchCategories, fetchSubcategories, deleteCategory, deleteSubcategory, updateCategory, updateSubcategory } = useToolCategoriesStore();
  const { hasPermission } = useAuthStore();

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [showCustomFieldsEditor, setShowCustomFieldsEditor] = useState(false);
  const [editingCustomFieldsCategory, setEditingCustomFieldsCategory] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (selectedCategory) {
      fetchSubcategories(selectedCategory.id);
    }
  }, [selectedCategory, fetchSubcategories]);

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setShowCategoryForm(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`Kategorie "${name}" wirklich löschen?\n\nAchtung: Alle zugehörigen Unterkategorien werden ebenfalls gelöscht!`)) {
      return;
    }

    const result = await deleteCategory(id);
    if (result.success) {
      toast.success(result.message || `Kategorie "${name}" erfolgreich gelöscht`);
      fetchCategories();
      if (selectedCategory?.id === id) {
        setSelectedCategory(null);
      }
    } else {
      toast.error(result.error || 'Fehler beim Löschen');
    }
  };

  const handleCreateSubcategory = () => {
    setEditingSubcategory(null);
    setShowSubcategoryForm(true);
  };

  const handleEditSubcategory = (subcategory) => {
    setEditingSubcategory(subcategory);
    setShowSubcategoryForm(true);
  };

  const handleDeleteSubcategory = async (id, name) => {
    if (!window.confirm(`Unterkategorie "${name}" wirklich löschen?`)) {
      return;
    }

    const result = await deleteSubcategory(id);
    if (result.success) {
      toast.success(result.message || `Unterkategorie "${name}" erfolgreich gelöscht`);
      if (selectedCategory) {
        fetchSubcategories(selectedCategory.id);
      }
    } else {
      toast.error(result.error || 'Fehler beim Löschen');
    }
  };

  const handleCategoryFormClose = () => {
    setShowCategoryForm(false);
    setEditingCategory(null);
  };

  const handleCategoryFormSuccess = () => {
    setShowCategoryForm(false);
    setEditingCategory(null);
    fetchCategories();
  };

  const handleSubcategoryFormClose = () => {
    setShowSubcategoryForm(false);
    setEditingSubcategory(null);
  };

  const handleSubcategoryFormSuccess = () => {
    setShowSubcategoryForm(false);
    setEditingSubcategory(null);
    if (selectedCategory) {
      fetchSubcategories(selectedCategory.id);
    }
  };

  const handleEditCustomFields = (category) => {
    setEditingCustomFieldsCategory(category);
    setShowCustomFieldsEditor(true);
  };

  const handleSaveCustomFields = async (categoryId, definitions) => {
    const result = await updateCategory(categoryId, { custom_field_definitions: definitions });
    if (result.success) {
      toast.success('Custom Fields erfolgreich aktualisiert');
      fetchCategories(); // Reload to get updated definitions
      setShowCustomFieldsEditor(false);
      setEditingCustomFieldsCategory(null);
    } else {
      toast.error(result.error || 'Fehler beim Speichern');
    }
  };

  const handleCustomFieldsEditorClose = () => {
    setShowCustomFieldsEditor(false);
    setEditingCustomFieldsCategory(null);
  };

  const handleReorderCategories = async (newCategories) => {
    // Update sequence for each category
    const updates = newCategories.map(async (category, index) => {
      if (category.sequence !== index) {
        return updateCategory(category.id, { sequence: index });
      }
      return Promise.resolve({ success: true });
    });

    try {
      await Promise.all(updates);
      fetchCategories(); // Reload to get updated order
    } catch (error) {
      toast.error('Fehler beim Aktualisieren der Reihenfolge');
    }
  };

  const handleReorderSubcategories = async (newSubcategories) => {
    // Update sequence for each subcategory
    const updates = newSubcategories.map(async (subcategory, index) => {
      if (subcategory.sequence !== index) {
        return updateSubcategory(subcategory.id, { sequence: index });
      }
      return Promise.resolve({ success: true });
    });

    try {
      await Promise.all(updates);
      if (selectedCategory) {
        fetchSubcategories(selectedCategory.id); // Reload to get updated order
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren der Reihenfolge');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <FolderTree className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Werkzeug-Kategorien</h1>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Verwalten Sie Kategorien und Unterkategorien für Ihre Werkzeuge
          </p>
        </div>
        {hasPermission('tools.categories.manage') && (
          <button
            onClick={handleCreateCategory}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Neue Kategorie
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg p-4">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Two-Column Layout */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Categories */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Kategorien ({categories.length})
            </h2>

            {categories.length === 0 ? (
              <div className="text-center py-8">
                <FolderTree className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">Keine Kategorien vorhanden</p>
                {hasPermission('tools.categories.manage') && (
                  <button
                    onClick={handleCreateCategory}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Erste Kategorie erstellen
                  </button>
                )}
              </div>
            ) : (
              <SortableCategoriesList
                categories={categories}
                selectedCategoryId={selectedCategory?.id}
                onCategoryClick={handleCategoryClick}
                onEdit={handleEditCategory}
                onDelete={handleDeleteCategory}
                onEditCustomFields={handleEditCustomFields}
                onReorder={handleReorderCategories}
              />
            )}
          </div>

          {/* Right: Subcategories */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedCategory ? `${selectedCategory.name} - Unterkategorien` : 'Unterkategorien'}
              </h2>
              {selectedCategory && hasPermission('tools.categories.manage') && (
                <button
                  onClick={handleCreateSubcategory}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Neu
                </button>
              )}
            </div>

            {!selectedCategory ? (
              <div className="text-center py-12">
                <FolderTree className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                  Wählen Sie eine Kategorie aus, um die Unterkategorien zu sehen
                </p>
              </div>
            ) : subcategories.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400 mb-4">Keine Unterkategorien vorhanden</p>
                {hasPermission('tools.categories.manage') && (
                  <button
                    onClick={handleCreateSubcategory}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Erste Unterkategorie erstellen
                  </button>
                )}
              </div>
            ) : (
              <SortableSubcategoriesList
                subcategories={subcategories}
                onEdit={handleEditSubcategory}
                onDelete={handleDeleteSubcategory}
                onReorder={handleReorderSubcategories}
              />
            )}
          </div>
        </div>
      )}

      {/* Forms */}
      {showCategoryForm && (
        <CategoryForm
          category={editingCategory}
          onClose={handleCategoryFormClose}
          onSuccess={handleCategoryFormSuccess}
        />
      )}

      {showSubcategoryForm && (
        <SubcategoryForm
          subcategory={editingSubcategory}
          defaultCategoryId={selectedCategory?.id}
          onClose={handleSubcategoryFormClose}
          onSuccess={handleSubcategoryFormSuccess}
        />
      )}

      {/* Custom Fields Editor */}
      {showCustomFieldsEditor && editingCustomFieldsCategory && (
        <CustomFieldDefinitionsEditor
          category={editingCustomFieldsCategory}
          onClose={handleCustomFieldsEditorClose}
          onSave={handleSaveCustomFields}
        />
      )}
    </div>
  );
}
