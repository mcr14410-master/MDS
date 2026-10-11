/* eslint-disable camelcase */

/**
 * Früher: umfangreiche Testdaten (Test-User, Kunden, Maschinen, Bauteile, Arbeitsgänge,
 * Programme, Rüstblätter, Werkzeuglisten, Prüfpläne, Werkzeuge, Audit-Beispiele).
 *
 * Seit 2026-10 legen Migrationen keine Testdaten mehr an – eine frisch migrierte DB
 * ist leer (nur Stammdaten). Testdaten kommen optional über `npm run seed`
 * (bzw. die Abfrage in scripts/init.sh). Bereits migrierte DBs behalten ihre Daten.
 */

exports.shorthands = undefined;

exports.up = () => {};

exports.down = () => {};
