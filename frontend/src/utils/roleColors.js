// Farben der Rollen-Abzeichen – Farbe je Rolle aus der Datenbank (roles.color), feste Palette.
// Klassen stehen hier ausgeschrieben, damit Tailwind sie beim Build nicht entfernt.

export const ROLE_COLOR_OPTIONS = [
  { value: 'red', label: 'Rot', swatch: 'bg-red-500' },
  { value: 'orange', label: 'Orange', swatch: 'bg-orange-500' },
  { value: 'yellow', label: 'Gelb', swatch: 'bg-yellow-400' },
  { value: 'green', label: 'Grün', swatch: 'bg-green-500' },
  { value: 'blue', label: 'Blau', swatch: 'bg-blue-500' },
  { value: 'purple', label: 'Lila', swatch: 'bg-purple-500' },
  { value: 'pink', label: 'Pink', swatch: 'bg-pink-500' },
  { value: 'gray', label: 'Grau', swatch: 'bg-gray-400' },
];

const BADGE_CLASSES = {
  red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

// Klassen für das Abzeichen einer Rolle; unbekannte oder fehlende Farbe → grau
export const getRoleBadgeColor = (color) => BADGE_CLASSES[color] || BADGE_CLASSES.gray;
