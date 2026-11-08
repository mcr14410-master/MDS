// Altbestand-Import: Bezeichnung und Farbe je Zeilenstatus (siehe utils/legacyImport/match.js rowStatus)
export const STATUS_INFO = {
  error: { label: 'Fehler', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  new: { label: 'Neu', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  choose_part: { label: 'Bauteil wählen', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  other_revision: { label: 'Andere Revision vorhanden', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  part_exists: { label: 'Bauteil vorhanden', className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' },
  partial: { label: 'Teilweise übernommen', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  imported: { label: 'Übernommen', className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
};
