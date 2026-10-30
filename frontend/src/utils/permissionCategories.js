// frontend/src/utils/permissionCategories.js
// Deutsche Namen der Rechte-Kategorien (permissions.category ist ein Schlüssel). Unbekannte Schlüssel
// erscheinen unverändert, damit neue Rechte nie verschwinden – Name dann hier ergänzen.
export const PERMISSION_CATEGORY_LABELS = {
  agent: 'Agenten',
  audit: 'Audit-Log',
  machine: 'Maschinen',
  maintenance: 'Wartung',
  measuring: 'Messmittel',
  part: 'Bauteile',
  program: 'Programme',
  report: 'Berichte',
  stock: 'Lagerbewegungen',
  storage: 'Lager',
  time_tracking: 'Zeiterfassung',
  tools: 'Werkzeuge',
  user: 'Benutzer',
  vacations: 'Urlaub',
  wiki: 'Wiki',
  zerobot: 'Zerobot',
  other: 'Sonstige',
};

export const permissionCategoryLabel = (key) => PERMISSION_CATEGORY_LABELS[key] || key;

/** { kategorie: [rechte] } → [[kategorie, rechte], …] alphabetisch nach deutschem Namen */
export const sortedPermissionCategories = (grouped) => Object.entries(grouped || {})
  .sort(([a], [b]) => permissionCategoryLabel(a).localeCompare(permissionCategoryLabel(b), 'de'));
