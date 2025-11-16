import { useEffect, useState } from 'react';
import { Info, CheckCircle2, XCircle } from 'lucide-react';
import { useToolCategoriesStore } from '../../stores/toolCategoriesStore';

/**
 * CustomFieldsDisplay Component
 * Read-only display of custom field values based on category's definitions
 * 
 * @param {number} categoryId - Tool's category ID
 * @param {object} customFields - Custom field values {key: value}
 */
export default function CustomFieldsDisplay({ categoryId, customFields }) {
  const { categories } = useToolCategoriesStore();
  const [fieldDefinitions, setFieldDefinitions] = useState([]);

  // Load custom field definitions when category changes
  useEffect(() => {
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
  }, [categoryId, categories]);

  // If no custom fields defined or no values
  if (!categoryId || fieldDefinitions.length === 0 || !customFields || Object.keys(customFields).length === 0) {
    return null;
  }

  // Format value based on field type
  const formatValue = (fieldDef, value) => {
    // If no value, show placeholder
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-500 text-sm italic">Nicht angegeben</span>;
    }

    switch (fieldDef.type) {
      case 'number':
        return (
          <span className="text-white font-medium">
            {parseFloat(value).toLocaleString('de-DE')}
            {fieldDef.unit && <span className="text-gray-400 ml-1">{fieldDef.unit}</span>}
          </span>
        );

      case 'text':
        return <span className="text-white font-medium">{value}</span>;

      case 'select':
        // Find the label for the selected value
        const option = fieldDef.options?.find(opt => opt.value === value);
        return <span className="text-white font-medium">{option?.label || value}</span>;

      case 'checkbox':
        return value === true ? (
          <span className="flex items-center gap-1 text-green-400 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Ja
          </span>
        ) : (
          <span className="flex items-center gap-1 text-gray-500 font-medium">
            <XCircle className="w-4 h-4" />
            Nein
          </span>
        );

      default:
        return <span className="text-white font-medium">{String(value)}</span>;
    }
  };

  // Filter definitions to only show fields that have values
  const fieldsWithValues = fieldDefinitions.filter(fieldDef => {
    const value = customFields[fieldDef.key];
    return value !== null && value !== undefined && value !== '';
  });

  // If no fields have values, don't render the card
  if (fieldsWithValues.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 mt-6 border border-gray-700">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Info className="w-5 h-5 text-blue-400" />
        Zusätzliche Felder
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fieldsWithValues.map(fieldDef => {
          const value = customFields[fieldDef.key];
          
          return (
            <div key={fieldDef.key} className="space-y-1">
              <div className="flex justify-between items-start">
                <span className="text-gray-400 text-sm">{fieldDef.label}:</span>
                <div className="text-right">
                  {formatValue(fieldDef, value)}
                </div>
              </div>
              {fieldDef.help && (
                <p className="text-xs text-gray-600 italic">{fieldDef.help}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Optional: Show all defined fields with empty state */}
      {fieldsWithValues.length < fieldDefinitions.length && (
        <details className="mt-4">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
            Alle möglichen Felder anzeigen ({fieldDefinitions.length - fieldsWithValues.length} weitere)
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-700">
            {fieldDefinitions
              .filter(fieldDef => !fieldsWithValues.includes(fieldDef))
              .map(fieldDef => (
                <div key={fieldDef.key} className="space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="text-gray-500 text-sm">{fieldDef.label}:</span>
                    <span className="text-gray-600 text-sm italic">Nicht angegeben</span>
                  </div>
                </div>
              ))}
          </div>
        </details>
      )}
    </div>
  );
}
