/* eslint-disable camelcase */

/**
 * Früher: Test-Kunden CUST-001 bis CUST-003.
 *
 * Seit 2026-10 legen Migrationen keine Testdaten mehr an – eine frisch migrierte DB
 * ist leer (nur Stammdaten). Testdaten kommen optional über `npm run seed`
 * (bzw. die Abfrage in scripts/init.sh). Bereits migrierte DBs behalten ihre Daten.
 */

exports.shorthands = undefined;

exports.up = () => {};

exports.down = () => {};
