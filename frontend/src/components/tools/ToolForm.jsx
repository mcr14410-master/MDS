import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useToolCategoriesStore } from '../../stores/toolCategoriesStore';
import CustomFieldsRenderer from './CustomFieldsRenderer';

/**
 * ToolForm Component
 * Multi-tab form for creating/editing tools
 * Tabs: 1) Basis, 2) Geometrie & Material, 3) Hersteller & Kosten
 */
export default function ToolForm({ tool, onSave, onCancel, loading }) {
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({
    tool_number: '',
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

  // Load categories on mount
  useEffect(() => {
    fetchCategories(false); // Only active categories
  }, [fetchCategories]);

  // Load subcategories when category changes
  useEffect(() => {
    if (formData.category_id) {
      fetchSubcategories(formData.category_id);
    }
  }, [formData.category_id, fetchSubcategories]);

  // Populate form if editing
  useEffect(() => {
    if (tool) {
      setFormData({
        tool_number: tool.tool_number || '',
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

    // Prepare data (convert empty strings to null for optional fields)
    const dataToSave = { ...formData };

    // Convert numeric fields
    if (dataToSave.category_id) dataToSave.category_id = parseInt(dataToSave.category_id);
    if (dataToSave.subcategory_id) dataToSave.subcategory_id = parseInt(dataToSave.subcategory_id);
    if (dataToSave.diameter) dataToSave.diameter = parseFloat(dataToSave.diameter);
    if (dataToSave.length) dataToSave.length = parseFloat(dataToSave.length);
    if (dataToSave.flutes) dataToSave.flutes = parseInt(dataToSave.flutes);

    // Convert empty strings to null for optional text fields (but not custom_fields)
    Object.keys(dataToSave).forEach(key => {
      if (key !== 'custom_fields' && dataToSave[key] === '') {
        dataToSave[key] = null;
      }
    });

    // Ensure custom_fields is sent (empty object if no custom fields)
    if (!dataToSave.custom_fields || Object.keys(dataToSave.custom_fields).length === 0) {
      dataToSave.custom_fields = null; // Send null instead of empty object
    }

    onSave(dataToSave);
  };

  const tabs = [
    { id: 0, label: 'Basis' },
    { id: 1, label: 'Geometrie & Material' },
    { id: 2, label: 'Hersteller & Kosten' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            {tool ? 'Werkzeug bearbeiten' : 'Neues Werkzeug'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 px-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
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
                  {/* Tool Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Werkzeugnummer <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="tool_number"
                      value={formData.tool_number}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="z.B. T001, I050"
                    />
                  </div>

                  {/* Tool Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Werkzeugname <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="tool_name"
                      value={formData.tool_name}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="z.B. Schaftfräser D10 Z2 HSS-E"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Kategorie
                    </label>
                    <select
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- Kategorie wählen --</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Subcategory */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Unterkategorie
                    </label>
                    <select
                      name="subcategory_id"
                      value={formData.subcategory_id}
                      onChange={handleChange}
                      disabled={!formData.category_id}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Unterkategorie wählen --</option>
                      {subcategories.map(subcat => (
                        <option key={subcat.id} value={subcat.id}>{subcat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Item Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Typ <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="item_type"
                        value="tool"
                        checked={formData.item_type === 'tool'}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-500"
                      />
                      <span className="text-gray-300">Werkzeug</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="item_type"
                        value="insert"
                        checked={formData.item_type === 'insert'}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-500"
                      />
                      <span className="text-gray-300">Wendeplatte</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="item_type"
                        value="accessory"
                        checked={formData.item_type === 'accessory'}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-500"
                      />
                      <span className="text-gray-300">Zubehör</span>
                    </label>
                  </div>
                </div>

                {/* Tool Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Klassifizierung <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tool_category"
                        value="standard"
                        checked={formData.tool_category === 'standard'}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-500"
                      />
                      <span className="text-gray-300">Standard</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tool_category"
                        value="special"
                        checked={formData.tool_category === 'special'}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-500"
                      />
                      <span className="text-gray-300">Spezial</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tool_category"
                        value="modified"
                        checked={formData.tool_category === 'modified'}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-500"
                      />
                      <span className="text-gray-300">Modifiziert</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Geometrie & Material */}
            {activeTab === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Diameter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Durchmesser (mm)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      name="diameter"
                      value={formData.diameter}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="z.B. 10.0"
                    />
                  </div>

                  {/* Length */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Länge (mm)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="length"
                      value={formData.length}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="z.B. 100.0"
                    />
                  </div>

                  {/* Flutes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Schneiden (Z)
                    </label>
                    <input
                      type="number"
                      name="flutes"
                      value={formData.flutes}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="z.B. 2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Material */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Material
                    </label>
                    <input
                      type="text"
                      name="material"
                      value={formData.material}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="z.B. HSS-E, Carbide"
                    />
                  </div>

                  {/* Coating */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Beschichtung
                    </label>
                    <input
                      type="text"
                      name="coating"
                      value={formData.coating}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="z.B. TiN, TiAlN, AlTiN"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Substrate Grade */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Substrat-Sorte (ISO)
                    </label>
                    <input
                      type="text"
                      name="substrate_grade"
                      value={formData.substrate_grade}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="z.B. K20, P25"
                    />
                  </div>

                  {/* Hardness */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Härte
                    </label>
                    <input
                      type="text"
                      name="hardness"
                      value={formData.hardness}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="z.B. 65 HRC"
                    />
                  </div>
                </div>

                {/* Custom Fields Renderer */}
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
                  {/* Manufacturer */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Hersteller
                    </label>
                    <input
                      type="text"
                      name="manufacturer"
                      value={formData.manufacturer}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="z.B. Garant, Sandvik"
                    />
                  </div>

                  {/* Manufacturer Part Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Herstellerteilenummer
                    </label>
                    <input
                      type="text"
                      name="manufacturer_part_number"
                      value={formData.manufacturer_part_number}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="z.B. GAR-10-HSS-TiAlN"
                    />
                  </div>
                </div>

                {/* Shop URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Shop-URL
                  </label>
                  <input
                    type="url"
                    name="shop_url"
                    value={formData.shop_url}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://..."
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Notizen
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Zusätzliche Informationen..."
                  />
                </div>

                {/* Checkboxes */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="uses_inserts"
                      checked={formData.uses_inserts}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-500 rounded"
                    />
                    <span className="text-gray-300">Verwendet Wendeschneidplatten</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-500 rounded"
                    />
                    <span className="text-gray-300">Aktiv</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-900/50">
            <div className="flex gap-2">
              {activeTab > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab - 1)}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Zurück
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
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
