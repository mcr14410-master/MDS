/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Test-Kunden für Entwicklung einfügen
  pgm.sql(`
    INSERT INTO customers (name, customer_number, contact_person, email, phone, address, notes) VALUES
    ('Test GmbH', 'CUST-001', 'Max Mustermann', 'max.mustermann@test-gmbh.de', '+49 123 456789', 'Musterstraße 1, 12345 Musterstadt', 'Hauptkunde für Tests'),
    ('Beispiel AG', 'CUST-002', 'Anna Schmidt', 'a.schmidt@beispiel.de', '+49 234 567890', 'Beispielweg 10, 54321 Beispielstadt', 'Zweiter Testkunde'),
    ('Demo Industries', 'CUST-003', 'John Doe', 'john.doe@demo-industries.com', '+1 555 123456', '123 Demo Street, Demo City, USA', 'International customer for testing');
  `);
};

exports.down = (pgm) => {
  // Test-Kunden wieder entfernen
  pgm.sql(`
    DELETE FROM customers WHERE customer_number IN ('CUST-001', 'CUST-002', 'CUST-003');
  `);
};
