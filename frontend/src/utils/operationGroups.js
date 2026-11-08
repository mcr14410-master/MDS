// Arbeitsgänge zählen wie das Akkordeon sie zeigt: Varianten (gleicher Arbeitsgang auf anderer
// Maschine) bilden eine Gruppe und zählen einmal.
export const isGroupHead = (op) =>
  !op.variant_group_id || op.is_variant_primary || op.is_variant_primary === null;

export const countOperationGroups = (operations = []) => operations.filter(isGroupHead).length;
