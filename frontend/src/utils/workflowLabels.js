// Deutsche Namen der Workflow-Status (Programme). /api/workflow/states liefert nur
// name (Code) und description – die Anzeige braucht kurze Namen.
export const WORKFLOW_STATUS_LABELS = {
  draft: 'Entwurf',
  review: 'In Prüfung',
  approved: 'Geprüft',
  released: 'Freigegeben',
  rejected: 'Abgelehnt',
  archived: 'Archiviert',
};

// Beschriftung der Knöpfe je Zielstatus (Aktion statt Zustand)
export const WORKFLOW_ACTION_LABELS = {
  draft: 'Zurück in Entwurf',
  review: 'Zur Prüfung geben',
  approved: 'Als geprüft markieren',
  released: 'Freigeben',
  rejected: 'Ablehnen',
  archived: 'Archivieren',
  active: 'Aktivieren',
};
