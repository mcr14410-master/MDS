import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { useToolCategoriesStore } from '../../stores/toolCategoriesStore';

/**
 * CustomFieldsRenderer Component
 * Dynamically renders custom field inputs based on custom_field_definitions
 *
 * @param {Array}    [definitions]   Direct definitions array (preferred, generic)
 * @param {number}   [categoryId]    Legacy: tool category id (resolved via tool categories store)
 * @param {object}   customFields    Current custom field values {key: value}
 * @param {function} onChange        Callback when custom fields change
 * @param {string}   [heading]       Heading label (default: "Zusätzliche Felder (Kategorie-spezifisch)")
 */
export default function CustomFieldsRenderer({ definitions, categoryId, customFields, onChange, heading = 'Zusätzliche Felder (Kategorie-spezifisch)' }) {
  const { categories } = useToolCategoriesStore();
  const [fieldDefinitions, setFieldDefinitions] = useState([]);

  useEffect(() => {
    // Direct definitions prop has priority
    if (Array.isArray(definitions)) {
      setFieldDefinitions(definitions);
      return;
    }
    if (!categoryId || !categories || categories.length === 0) {
      setFieldDefinitions([]);
      return;
    }
    const category = categories.find(cat => cat.id === parseInt(categoryId));
    if (category && category.custom_field_definitions) {
      setFieldDefinitions(category.custom_field_definitions);
    } else {
      setFieldDefinitions([]);
    }
  }, [definitions, categoryId, categories]);

  // Handle field value change
  const handleFieldChange = (fieldKey, value) => {
    const newCustomFields = {
      ...customFields,
      [fieldKey]: value
    };
    onChange(newCustomFields);
  };

  // No fields to render
  if (fieldDefinitions.length === 0) {
    return null;
  }

  // Render different input types based on field definition
  const renderField = (fieldDef) => {
    const value = customFields?.[fieldDef.key] ?? fieldDef.default ?? '';

    switch (fieldDef.type) {
      case 'number':
        return (
          <div key={fieldDef.key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {fieldDef.label}
              {fieldDef.unit && <span className="text-gray-500 ml-1">({fieldDef.unit})</span>}
              {fieldDef.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(fieldDef.key, e.target.value ? parseFloat(e.target.value) : null)}
              min={fieldDef.min}
              max={fieldDef.max}
              step={fieldDef.step || 0.01}
              placeholder={fieldDef.placeholder}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {fieldDef.help && (
              <div className="flex items-start gap-1 mt-1">
                <Info className="w-3 h-3 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-500 dark:text-gray-400">{fieldDef.help}</p>
              </div>
            )}
          </div>
        );

      case 'text':
        return (
          <div key={fieldDef.key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {fieldDef.label}
              {fieldDef.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleFieldChange(fieldDef.key, e.target.value || null)}
              maxLength={fieldDef.maxLength}
              placeholder={fieldDef.placeholder}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {fieldDef.help && (
              <div className="flex items-start gap-1 mt-1">
                <Info className="w-3 h-3 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-500 dark:text-gray-400">{fieldDef.help}</p>
              </div>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={fieldDef.key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {fieldDef.label}
              {fieldDef.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
            </label>
            <select
              value={value}
              onChange={(e) => handleFieldChange(fieldDef.key, e.target.value || null)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Bitte wählen --</option>
              {fieldDef.options && fieldDef.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldDef.help && (
              <div className="flex items-start gap-1 mt-1">
                <Info className="w-3 h-3 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-500 dark:text-gray-400">{fieldDef.help}</p>
              </div>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={fieldDef.key}>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={value === true}
                onChange={(e) => handleFieldChange(fieldDef.key, e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {fieldDef.label}
                  {fieldDef.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
                </span>
                {fieldDef.help && (
                  <div className="flex items-start gap-1 mt-1">
                    <Info className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-500">{fieldDef.help}</p>
                  </div>
                )}
              </div>
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
        <Info className="w-4 h-4 text-blue-500 dark:text-blue-400" />
        {heading}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fieldDefinitions.map(renderField)}
      </div>
    </div>
  );
}
