// frontend/src/components/ProgramStatusFilter.jsx
// Status-Filter für NC-Programme und Messprogramme am Arbeitsgang
const FILTERS = [
  { value: 'all', label: 'Alle', active: 'bg-blue-600 text-white' },
  { value: 'draft', label: 'Entwurf', active: 'bg-cyan-600 text-white' },
  { value: 'review', label: 'In Prüfung', active: 'bg-orange-600 text-white' },
  { value: 'approved', label: 'Geprüft', active: 'bg-green-600 text-white' },
  { value: 'released', label: 'Freigegeben', active: 'bg-emerald-600 text-white' },
  { value: 'archived', label: 'Archiviert', active: 'bg-gray-600 text-white' },
];

export default function ProgramStatusFilter({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            value === f.value
              ? f.active
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
