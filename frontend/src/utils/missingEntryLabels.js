// Gründe für „Fehlbuchung“ (time_daily_summary.missing_entry_types) in Klartext
export const MISSING_ENTRY_LABELS = {
  clock_out: 'Gehen fehlt',
  break_end: 'Pausenende fehlt',
  break_short: 'Pause zu kurz',
  block_too_long: 'Zu lange ohne Pause',
  no_entries: 'Keine Buchungen',
};

export const missingEntryText = (types) =>
  (types || []).map(type => MISSING_ENTRY_LABELS[type] || type).join(', ');
