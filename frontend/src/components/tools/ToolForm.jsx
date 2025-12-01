import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useToolCategoriesStore } from '../../stores/toolCategoriesStore';
import CustomFieldsRenderer from './CustomFieldsRenderer';

/**
 * ToolForm Component
 * Multi-tab form for creating/editing tools
 */
export default function ToolForm({ tool, onSave, onCancel, loading }) {
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({
    article_number: '',
    tool_name: '',
    category_id: '',
    subcategory_id: '',
    item_type: 'tool',
    tool_category: 'standard',
    diameter: '',
    length: '',
    flutes: '',
    material: '',
    coating: '',
    substrate_grade: '',
    hardness: '',
    manufacturer: '',
    manufacturer_part_number: '',
    shop_url: '',
    uses_inserts: false,
    is_active: true,
    notes: '',
    custom_fields: {},
  });

  const { categories, subcategories, fetchCategories, fetchSubcategories } = useToolCategoriesStore();

  useEffect(() => {
    fetchCategories(false);
  }, [fetchCategories]);

  useEffect(() => {
    if (formData.category_id) {
      fetchSubcategories(formData.category_id);
    }
  }, [formData.category_id, fetchSubcategories]);

  useEffect(() => {
    if (tool) {
      setFormData({
        article_number: tool.article_number || '',
        tool_name: tool.tool_name || '',
        category_id: tool.category_id || '',
        subcategory_id: tool.subcategory_id || '',
        item_type: tool.item_type || 'tool',
        tool_category: tool.tool_category || 'standard',
        diameter: tool.diameter || '',
        length: tool.length || '',
        flutes: tool.flutes || '',
        material: tool.material || '',
        coating: tool.coating || '',
        substrate_grade: tool.substrate_grade || '',
        hardness: tool.hardness || '',
        manufacturer: tool.manufacturer || '',
        manufacturer_part_number: tool.manufacturer_part_number || '',
        shop_url: tool.shop_url || '',
        uses_inserts: tool.uses_inserts || false,
        is_active: tool.is_active !== undefined ? tool.is_active : true,
        notes: tool.notes || '',
        custom_fields: tool.custom_fields || {},
      });
    }
  }, [tool]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = { ...formData };

    if (dataToSave.category_id) dataToSave.category_id = parseInt(dataToSave.category_id);
    if (dataToSave.subcategory_id) dataToSave.subcategory_id = parseInt(dataToSave.subcategory_id);
    if (dataToSave.diameter) dataToSave.diameter = parseFloat(dataToSave.diameter);
    if (dataToSave.length) dataToSave.length = parseFloat(dataToSave.length);
    if (dataToSave.flutes) dataToSave.flutes = parseInt(dataToSave.flutes);

    Object.keys(dataToSave).forEach(key => {
      if (key !== 'custom_fields' && dataToSave[key] === '') {
        dataToSave[key] = null;
      }
    });

    if (!dataToSave.custom_fields || Object.keys(dataToSave.custom_fields).length === 0) {
      dataToSave.custom_fields = null;
    }

    onSave(dataToSave);
  };

  const tabs = [
    { id: 0, label: 'Basis' },
    { id: 1, label: 'Geometrie & Material' },
    { id: 2, label: 'Hersteller & Kosten' },
  ];

  const inputClass = "w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {tool ? 'Werkzeug bearbeiten' : 'Neues Werkzeug'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="p-6 space-y-4">
            {/* Tab 1: Basis */}
            {activeTab === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>
                      Artikelnummer <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="article_number"
                      value={formData.article_number}
                      onChange={handleChange}
                      required
                      className={inputClass}
                      placeholder="z.B. GAR-123, WZ-2024-001"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Werkzeugname <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="tool_name"
                      value={formData.tool_name}
                      onChange={handleChange}
                      required
                      className={inputClass}
                      placeholder="z.B. Schaftfräser D10 Z2 HSS-E"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Kategorie</label>
                    <select
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="">Keine Kategorie</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Unterkategorie</label>
                    <select
                      name="subcategory_id"
                      value={formData.subcategory_id}
                      onChange={handleChange}
                      disabled={!formData.category_id}
                      className={inputClass}
                    >
                      <option value="">Keine Unterkategorie</option>
                      {subcategories.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Artikeltyp</label>
                    <select
                      name="item_type"
                      value={formData.item_type}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="tool">Werkzeug</option>
                      <option value="insert">Wendeplatte</option>
                      <option value="accessory">Zubehör</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Klassifizierung</label>
                    <select
                      name="tool_category"
                      value={formData.tool_category}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="standard">Standard</option>
                      <option value="special">Spezial</option>
                      <option value="modified">Modifiziert</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Geometrie & Material */}
            {activeTab === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Durchmesser (mm)</label>
                    <input
                      type="number"
                      name="diameter"
                      value={formData.diameter}
                      onChange={handleChange}
                      step="0.01"
                      className={inputClass}
                      placeholder="z.B. 10.0"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Länge (mm)</label>
                    <input
                      type="number"
                      name="length"
                      value={formData.length}
                      onChange={handleChange}
                      step="0.01"
                      className={inputClass}
                      placeholder="z.B. 80.0"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Schneiden (Z)</label>
                    <input
                      type="number"
                      name="flutes"
                      value={formData.flutes}
                      onChange={handleChange}
                      min="1"
                      className={inputClass}
                      placeholder="z.B. 4"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Material</label>
                    <input
                      type="text"
                      name="material"
                      value={formData.material}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="z.B. HSS, VHM, PKD"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Beschichtung</label>
                    <input
                      type="text"
                      name="coating"
                      value={formData.coating}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="z.B. TiN, TiAlN, AlTiN"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Substrat-Sorte (ISO)</label>
                    <input
                      type="text"
                      name="substrate_grade"
                      value={formData.substrate_grade}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="z.B. K20, P25"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Härte</label>
                    <input
                      type="text"
                      name="hardness"
                      value={formData.hardness}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="z.B. 65 HRC"
                    />
                  </div>
                </div>

                {formData.category_id && (
                  <CustomFieldsRenderer
                    categoryId={formData.category_id}
                    customFields={formData.custom_fields}
                    onChange={(newFields) => setFormData(prev => ({ ...prev, custom_fields: newFields }))}
                  />
                )}
              </div>
            )}

            {/* Tab 3: Hersteller & Kosten */}
            {activeTab === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Hersteller</label>
                    <input
                      type="text"
                      name="manufacturer"
                      value={formData.manufacturer}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="z.B. Garant, Sandvik"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Herstellerteilenummer</label>
                    <input
                      type="text"
                      name="manufacturer_part_number"
                      value={formData.manufacturer_part_number}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="z.B. GAR-10-HSS-TiAlN"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Shop-URL</label>
                  <input
                    type="url"
                    name="shop_url"
                    value={formData.shop_url}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className={labelClass}>Notizen</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={4}
                    className={inputClass}
                    placeholder="Zusätzliche Informationen..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="uses_inserts"
                      checked={formData.uses_inserts}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Verwendet Wendeschneidplatten</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Aktiv</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex gap-2">
              {activeTab > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab - 1)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Zurück
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Abbrechen
              </button>

              {activeTab < tabs.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab + 1)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Weiter
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Speichern...' : 'Speichern'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
