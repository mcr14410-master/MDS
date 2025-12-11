exports.up = (pgm) => {
  // Add is_primary_drawing column
  pgm.addColumn('part_documents', {
    is_primary_drawing: {
      type: 'boolean',
      default: false,
      notNull: true
    }
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('part_documents', 'is_primary_drawing');
};
