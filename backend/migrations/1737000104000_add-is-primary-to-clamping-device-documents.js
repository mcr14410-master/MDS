/**
 * Migration: Add is_primary to clamping_device_documents
 *
 * Ermoeglicht die Auswahl eines Hauptbildes fuer jedes Spannmittel
 * (analog zu fixture_documents).
 */

exports.up = (pgm) => {
  pgm.addColumns('clamping_device_documents', {
    is_primary: {
      type: 'boolean',
      default: false,
      notNull: true,
      comment: 'Ist Hauptbild/Hauptdokument'
    }
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('clamping_device_documents', ['is_primary']);
};
