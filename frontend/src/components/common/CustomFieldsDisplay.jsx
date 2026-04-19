import { Info, CheckCircle2, XCircle } from 'lucide-react';

/**
 * CustomFieldsDisplay Component
 * Read-only display of custom field values based on definitions.
 *
 * @param {Array}  definitions    Array von Feld-Definitionen (key, label, type, ...)
 * @param {object} customFields   Werte {key: value}
 * @param {string} [heading]      Ueberschrift (default: "Zusätzliche Felder")
 */
export default function CustomFieldsDisplay({ definitions = [], customFields, heading = 'Zusätzliche Felder' }) {
  const fieldDefinitions = Array.isArray(definitions) ? definitions : [];

  if (fieldDefinitions.length === 0 || !customFields || Object.keys(customFields).length === 0) {
    return null;
  }

  // Format value based on field type
  const formatValue = (fieldDef, value) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-500 dark:text-gray-400 text-sm italic">Nicht angegeben</span>;
    }

    switch (fieldDef.type) {
      case 'number':
        return (
          <span className="text-gray-900 dark:text-white font-medium">
            {parseFloat(value).toLocaleString('de-DE')}
            {fieldDef.unit && <span className="text-gray-500 dark:text-gray-400 ml-1">{fieldDef.unit}</span>}
          </span>
        );

      case 'text':
        return <span className="text-gray-900 dark:text-white font-medium">{value}</span>;

      case 'select': {
        const option = fieldDef.options?.find(opt => opt.value === value);
        return <span className="text-gray-900 dark:text-white font-medium">{option?.label || value}</span>;
      }

      case 'checkbox':
        return value === true ? (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Ja
          </span>
        ) : (
          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 font-medium">
            <XCircle className="w-4 h-4" />
            Nein
          </span>
        );

      default:
        return <span className="text-gray-900 dark:text-white font-medium">{String(value)}</span>;
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
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Info className="w-5 h-5 text-blue-500 dark:text-blue-400" />
        {heading}
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
        {fieldsWithValues.map(fieldDef => {
          const value = customFields[fieldDef.key];
          return (
            <div key={fieldDef.key}>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-0.5">{fieldDef.label}</div>
              <div>{formatValue(fieldDef, value)}</div>
              {fieldDef.help && (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">{fieldDef.help}</p>
              )}
            </div>
          );
        })}
      </div>

      {fieldsWithValues.length < fieldDefinitions.length && (
        <details className="mt-4">
          <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
            Alle möglichen Felder anzeigen ({fieldDefinitions.length - fieldsWithValues.length} weitere)
          </summary>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            {fieldDefinitions
              .filter(fieldDef => !fieldsWithValues.includes(fieldDef))
              .map(fieldDef => (
                <div key={fieldDef.key}>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-0.5">{fieldDef.label}</div>
                  <div className="text-sm italic text-gray-500 dark:text-gray-500">Nicht angegeben</div>
                </div>
              ))}
          </div>
        </details>
      )}
    </div>
  );
}
