import { useState, useEffect } from 'react';
import { useConsumablesStore } from '../../stores/consumablesStore';
import { useSuppliersStore } from '../../stores/suppliersStore';
import { Save, X } from 'lucide-react';

const BASE_UNITS = ['Liter', 'ml', 'kg', 'g', 'Stück', 'm', 'm²', 'Rolle', 'Paar'];
const PACKAGE_TYPES = ['Kanister', 'Dose', 'Spray', 'Fass', 'Karton', 'Packung', 'Rolle', 'Flasche', 'Tube', 'Eimer'];

export default function ConsumableForm({ consumable, onSave, onCancel }) {
  const { categories, fetchCategories, createConsumable, updateConsumable } = useConsumablesStore();
  const { suppliers, fetchSuppliers } = useSuppliersStore();
  
  const [formData, setFormData] = useState({
    article_number: '',
    name: '',
    category_id: '',
    description: '',
    base_unit: 'Liter',
    package_type: '',
    package_size: '',
    has_expiry: false,
    shelf_life_months: '',
    is_hazardous: false,
    hazard_symbols: '',
    storage_requirements: '',
    supplier_id: '',
    supplier_article_number: '',
    manufacturer: '',
    manufacturer_article_number: '',
    unit_price: '',
    package_price: '',
    stock_status: 'ok',
    is_active: true,
    notes: ''
  });
  
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (consumable) {
      setFormData({
        article_number: consumable.article_number || '',
        name: consumable.name || '',
        category_id: consumable.category_id || '',
        description: consumable.description || '',
        base_unit: consumable.base_unit || 'Liter',
        package_type: consumable.package_type || '',
        package_size: consumable.package_size || '',
        has_expiry: consumable.has_expiry || false,
        shelf_life_months: consumable.shelf_life_months || '',
        is_hazardous: consumable.is_hazardous || false,
        hazard_symbols: consumable.hazard_symbols || '',
        storage_requirements: consumable.storage_requirements || '',
        supplier_id: consumable.supplier_id || '',
        supplier_article_number: consumable.supplier_article_number || '',
        manufacturer: consumable.manufacturer || '',
        manufacturer_article_number: consumable.manufacturer_article_number || '',
        unit_price: consumable.unit_price || '',
        package_price: consumable.package_price || '',
        stock_status: consumable.stock_status || 'ok',
        is_active: consumable.is_active !== false,
        notes: consumable.notes || ''
      });
    }
  }, [consumable]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name ist erforderlich';
    }
    
    if (!formData.category_id) {
      newErrors.category_id = 'Kategorie ist erforderlich';
    }
    
    if (!formData.base_unit) {
      newErrors.base_unit = 'Basiseinheit ist erforderlich';
    }

    if (formData.package_size && isNaN(parseFloat(formData.package_size))) {
      newErrors.package_size = 'Ungültige Zahl';
    }

    if (formData.unit_price && isNaN(parseFloat(formData.unit_price))) {
      newErrors.unit_price = 'Ungültige Zahl';
    }

    if (formData.package_price && isNaN(parseFloat(formData.package_price))) {
      newErrors.package_price = 'Ungültige Zahl';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        category_id: parseInt(formData.category_id),
        supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
        package_size: formData.package_size ? parseFloat(formData.package_size) : null,
        shelf_life_months: formData.shelf_life_months ? parseInt(formData.shelf_life_months) : null,
        unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null,
        package_price: formData.package_price ? parseFloat(formData.package_price) : null,
      };

      let result;
      if (consumable) {
        result = await updateConsumable(consumable.id, dataToSave);
      } else {
        result = await createConsumable(dataToSave);
      }
      
      onSave(result);
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submit && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          {errors.submit}
        </div>
      )}

      {/* Grunddaten */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Grunddaten</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="z.B. Schneidöl Castrol Alusol"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Artikel-Nr.
            </label>
            <input
              type="text"
              name="article_number"
              value={formData.article_number}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="z.B. KSS-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kategorie *
            </label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.category_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <option value="">Kategorie wählen...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {errors.category_id && <p className="text-red-500 text-sm mt-1">{errors.category_id}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Basiseinheit *
            </label>
            <select
              name="base_unit"
              value={formData.base_unit}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {BASE_UNITS.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Beschreibung
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Optionale Beschreibung..."
            />
          </div>
        </div>
      </div>

      {/* Gebinde */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Gebinde</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Gebindeart
            </label>
            <select
              name="package_type"
              value={formData.package_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Keine Angabe</option>
              {PACKAGE_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Gebindegröße ({formData.base_unit})
            </label>
            <input
              type="number"
              name="package_size"
              value={formData.package_size}
              onChange={handleChange}
              step="0.001"
              min="0"
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.package_size ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="z.B. 20"
            />
            {errors.package_size && <p className="text-red-500 text-sm mt-1">{errors.package_size}</p>}
          </div>
        </div>
      </div>

      {/* Haltbarkeit & Lagerung */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Haltbarkeit & Lagerung</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="has_expiry"
                checked={formData.has_expiry}
                onChange={handleChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Hat Mindesthaltbarkeitsdatum</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Haltbarkeit (Monate)
            </label>
            <input
              type="number"
              name="shelf_life_months"
              value={formData.shelf_life_months}
              onChange={handleChange}
              min="1"
              disabled={!formData.has_expiry}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
              placeholder="z.B. 24"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Lagerhinweise
            </label>
            <input
              type="text"
              name="storage_requirements"
              value={formData.storage_requirements}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="z.B. Kühl und trocken lagern, frostfrei"
            />
          </div>
        </div>
      </div>

      {/* Gefahrstoff */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Gefahrstoff</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_hazardous"
                checked={formData.is_hazardous}
                onChange={handleChange}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Ist Gefahrstoff</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Gefahrensymbole (GHS)
            </label>
            <input
              type="text"
              name="hazard_symbols"
              value={formData.hazard_symbols}
              onChange={handleChange}
              disabled={!formData.is_hazardous}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
              placeholder="z.B. GHS02, GHS07"
            />
          </div>
        </div>
      </div>

      {/* Lieferant & Preis */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Lieferant & Preis</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Lieferant
            </label>
            <select
              name="supplier_id"
              value={formData.supplier_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Kein Lieferant</option>
              {suppliers.filter(s => s.is_active).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Lieferanten Art.-Nr.
            </label>
            <input
              type="text"
              name="supplier_article_number"
              value={formData.supplier_article_number}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Hersteller
            </label>
            <input
              type="text"
              name="manufacturer"
              value={formData.manufacturer}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="z.B. Castrol"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Hersteller Art.-Nr.
            </label>
            <input
              type="text"
              name="manufacturer_article_number"
              value={formData.manufacturer_article_number}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Preis pro {formData.base_unit} (€)
            </label>
            <input
              type="number"
              name="unit_price"
              value={formData.unit_price}
              onChange={handleChange}
              step="0.01"
              min="0"
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.unit_price ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Preis pro Gebinde (€)
            </label>
            <input
              type="number"
              name="package_price"
              value={formData.package_price}
              onChange={handleChange}
              step="0.01"
              min="0"
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.package_price ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Notizen & Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Weitere Angaben</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notizen
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bestandsstatus
              </label>
              <select
                name="stock_status"
                value={formData.stock_status}
                onChange={handleChange}
                className={`px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium ${
                  formData.stock_status === 'reorder' 
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    : formData.stock_status === 'low'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                }`}
              >
                <option value="ok">✓ OK</option>
                <option value="low">⚠ Wird knapp</option>
                <option value="reorder">! Nachbestellen</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer mt-6">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Artikel ist aktiv</span>
            </label>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <X className="h-4 w-4" />
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </form>
  );
}
