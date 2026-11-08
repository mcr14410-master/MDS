// frontend/src/components/common/PrintPdfButton.jsx
// Knopf „Drucken“ für PDF-Dokumente (lädt über /view mit Token und öffnet den Druckdialog)
import { useState } from 'react';
import { printFileViaApi } from '../../utils/filePrint';
import { toast } from '../Toaster';

export default function PrintPdfButton({ apiPath, className, iconClassName = 'w-4 h-4' }) {
  const [busy, setBusy] = useState(false);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    const result = await printFileViaApi(apiPath);
    setBusy(false);
    if (!result.success) toast.error(result.error);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={className || 'p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50'}
      title="Drucken"
      aria-label="Drucken"
    >
      <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
    </button>
  );
}
