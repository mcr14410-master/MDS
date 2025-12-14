/* eslint-disable camelcase */
/**
 * Migration: Remove op_number unique constraint
 * 
 * Der Constraint (part_id, op_number) verhindert Varianten mit gleicher OP-Nummer.
 * Da op_number nur zur visuellen Orientierung dient (echte Sortierung via sequence),
 * kann der Constraint entfernt werden.
 */

exports.up = (pgm) => {
  pgm.dropConstraint('operations', 'operations_part_op_unique');
};

exports.down = (pgm) => {
  pgm.addConstraint('operations', 'operations_part_op_unique', {
    unique: ['part_id', 'op_number']
  });
};
