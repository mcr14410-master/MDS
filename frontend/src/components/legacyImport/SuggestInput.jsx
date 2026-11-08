// Altbestand-Import: Freitextfeld mit Vorschlägen aus dem Ordnernamen (▾ klappt die Liste auf)
import { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function SuggestInput({ value, onChange, suggestions = [], inputClass, label }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef(null);

  const close = (e) => {
    if (!wrapper.current?.contains(e.relatedTarget)) setOpen(false);
  };

  return (
    <div ref={wrapper} className="relative" onBlur={close}
      onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}>
      <input value={value} className={`${inputClass} pr-7`} aria-label={label}
        onChange={(e) => onChange(e.target.value)} />
      {suggestions.length > 0 && (
        <button type="button" onClick={() => setOpen(!open)} title="Vorschläge aus dem Ordnernamen"
          aria-label={`Vorschläge für ${label}`} data-testid="legacy-suggest-toggle"
          className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100">
          <ChevronDown className="h-4 w-4" />
        </button>
      )}
      {open && (
        <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-lg"
          data-testid="legacy-suggest-list">
          {suggestions.map((s) => (
            <li key={s.value}>
              <button type="button"
                onClick={() => { onChange(s.value); setOpen(false); }}
                className="w-full text-left px-2 py-1 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600">
                <span className="break-all">{s.value}</span>
                {s.hint && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{s.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
