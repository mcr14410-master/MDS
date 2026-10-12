/**
 * Standardrechte der Standardrollen für Entwicklungs- und Test-DBs.
 *
 * Vorlage: Zuordnung der Produktion (Stand 2026-10). Wird nur vom Seed verwendet
 * (`npm run seed`, nie bei NODE_ENV=production) – in Produktion werden Rollen und
 * ihre Rechte über die Benutzerverwaltung gepflegt, nicht per Code oder Migration.
 * Die Rolle admin erhält ihre Rechte über die Migrationen.
 *
 * Nicht vorhandene Berechtigungen werden beim Seed übersprungen.
 */
module.exports = {
  helper: [
    'machine.read',
    'maintenance.complete', 'maintenance.escalate', 'maintenance.read', 'maintenance.record_hours',
    'maintenance.view_all', 'maintenance.view_dashboard',
    'measuring.checkout', 'measuring.view',
    'part.read',
    'program.read',
    'storage.view',
    'time_tracking.view_own',
    'tools.view',
    'user.read',
    'vacations.read',
    'wiki.read',
  ],

  operator: [
    'machine.read',
    'maintenance.complete', 'maintenance.escalate', 'maintenance.read', 'maintenance.record_hours',
    'maintenance.resolve_escalation', 'maintenance.view_all', 'maintenance.view_dashboard',
    'measuring.checkout', 'measuring.view',
    'part.read',
    'program.download', 'program.read', 'program.update', 'program.upload',
    'report.export', 'report.read',
    'stock.adjust', 'stock.issue', 'stock.receive', 'stock.scrap', 'stock.transfer',
    'storage.view',
    'time_tracking.view_own',
    'tools.documents.upload', 'tools.view',
    'user.read',
    'vacations.read',
    'wiki.create', 'wiki.read', 'wiki.update',
  ],

  programmer: [
    'audit.read',
    'machine.read',
    'maintenance.complete', 'maintenance.create', 'maintenance.escalate', 'maintenance.manage_plans',
    'maintenance.read', 'maintenance.record_hours', 'maintenance.update', 'maintenance.view_all',
    'maintenance.view_dashboard',
    'measuring.calibrate', 'measuring.checkout', 'measuring.create', 'measuring.edit', 'measuring.view',
    'part.create', 'part.read', 'part.update',
    'program.create', 'program.delete', 'program.download', 'program.read', 'program.release',
    'program.update', 'program.upload',
    'report.export', 'report.read',
    'time_tracking.view_own',
    'tools.categories.manage', 'tools.create', 'tools.delete', 'tools.documents.delete',
    'tools.documents.upload', 'tools.edit', 'tools.view',
    'user.read',
    'vacations.read',
    'wiki.create', 'wiki.read', 'wiki.update',
  ],

  reviewer: [
    'audit.read',
    'machine.read',
    'maintenance.read',
    'measuring.view',
    'part.create', 'part.read', 'part.update',
    'program.create', 'program.delete', 'program.download', 'program.read', 'program.release',
    'program.update', 'program.upload',
    'report.export', 'report.read',
    'storage.view',
    'time_tracking.view_own',
    'tools.view',
    'user.read',
    'vacations.read',
    'wiki.read',
  ],

  supervisor: [
    'audit.read',
    'machine.read',
    'maintenance.assign', 'maintenance.complete', 'maintenance.create', 'maintenance.escalate',
    'maintenance.manage_plans', 'maintenance.read', 'maintenance.record_hours',
    'maintenance.resolve_escalation', 'maintenance.update', 'maintenance.view_all',
    'maintenance.view_dashboard',
    'measuring.checkout', 'measuring.view',
    'part.read', 'part.update',
    'program.create', 'program.delete', 'program.download', 'program.read', 'program.release',
    'program.update', 'program.upload',
    'report.export', 'report.read',
    'stock.adjust', 'stock.issue', 'stock.receive', 'stock.scrap', 'stock.transfer',
    'storage.create', 'storage.edit', 'storage.view',
    'time_tracking.manage', 'time_tracking.settings', 'time_tracking.view_own',
    'tools.categories.manage', 'tools.create', 'tools.delete', 'tools.documents.delete',
    'tools.documents.upload', 'tools.edit', 'tools.view',
    'user.create', 'user.read', 'user.update',
    'vacations.approve', 'vacations.manage', 'vacations.read', 'vacations.settings',
    'wiki.create', 'wiki.read', 'wiki.update',
  ],
};
