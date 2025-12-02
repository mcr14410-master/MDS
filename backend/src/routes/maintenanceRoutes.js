const express = require('express');
const router = express.Router();
const maintenancePlansController = require('../controllers/maintenancePlansController');
const maintenanceTasksController = require('../controllers/maintenanceTasksController');
const operatingHoursController = require('../controllers/operatingHoursController');
const escalationsController = require('../controllers/escalationsController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { maintenanceUpload, handleMaintenanceUploadError } = require('../middleware/maintenanceUploadMiddleware');

// Alle Routes benötigen Authentifizierung
router.use(authenticateToken);

// ============================================================
// DASHBOARD & ÜBERSICHTEN
// ============================================================

// Dashboard mit Statistiken
router.get('/dashboard', maintenancePlansController.getDashboard);

// Dashboard Stats für Widget (Task-basiert)
router.get('/dashboard/stats', maintenanceTasksController.getDashboardStats);

// Maschinen-Wartungsstatus Übersicht
router.get('/machines', maintenancePlansController.getMachineStatus);

// Maschinen-Wartungsstatistik (Detail)
router.get('/machines/:id/stats', maintenanceTasksController.getMachineMaintenanceStats);

// Fällige Wartungen Übersicht
router.get('/due', maintenancePlansController.getDueOverview);

// ============================================================
// MAINTENANCE TYPES
// ============================================================

// Alle Wartungstypen abrufen
router.get('/types', maintenancePlansController.getMaintenanceTypes);

// ============================================================
// MAINTENANCE PLANS - CRUD
// ============================================================

// Alle Wartungspläne abrufen (mit Filtern)
router.get('/plans', maintenancePlansController.getAllPlans);

// Einzelnen Wartungsplan abrufen (mit Checklist)
router.get('/plans/:id', maintenancePlansController.getPlanById);

// Neuen Wartungsplan erstellen
router.post('/plans', maintenancePlansController.createPlan);

// Wartungsplan aktualisieren
router.put('/plans/:id', maintenancePlansController.updatePlan);

// Wartungsplan löschen (soft/hard)
router.delete('/plans/:id', maintenancePlansController.deletePlan);

// ============================================================
// CHECKLIST ITEMS
// ============================================================

// Checklist-Items für einen Plan abrufen
router.get('/plans/:id/checklist', maintenancePlansController.getChecklistItems);

// Checklist-Item hinzufügen
router.post('/plans/:id/checklist', maintenancePlansController.addChecklistItem);

// Referenzbild für Wartungsplan hochladen
router.post(
  '/plans/:id/reference-image',
  maintenanceUpload.single('image'),
  handleMaintenanceUploadError,
  maintenancePlansController.uploadPlanReferenceImage
);

// Referenzbild für Wartungsplan löschen
router.delete('/plans/:id/reference-image', maintenancePlansController.deletePlanReferenceImage);

// Checklist-Items neu sortieren
router.put('/plans/:id/checklist/reorder', maintenancePlansController.reorderChecklistItems);

// Einzelnes Checklist-Item aktualisieren
router.put('/checklist/:itemId', maintenancePlansController.updateChecklistItem);

// Referenzbild für Checklist-Item hochladen
router.post(
  '/checklist/:itemId/reference-image',
  maintenanceUpload.single('image'),
  handleMaintenanceUploadError,
  maintenancePlansController.uploadChecklistItemReferenceImage
);

// Checklist-Item löschen
router.delete('/checklist/:itemId', maintenancePlansController.deleteChecklistItem);

// ============================================================
// MAINTENANCE TASKS
// ============================================================

// Tagesübersicht für alle Benutzer (Meister)
router.get('/tasks/today', maintenanceTasksController.getTodaysTasks);

// Meine Aufgaben (Helfer/Bediener)
router.get('/tasks/my', maintenanceTasksController.getMyTasks);

// Tasks aus fälligen Plänen generieren
router.post('/tasks/generate', maintenanceTasksController.generateTasksFromDuePlans);

// ============================================================
// STANDALONE TASKS - Allgemeine Aufgaben
// ============================================================

// Standalone Task erstellen
router.post('/tasks/standalone', maintenanceTasksController.createStandaloneTask);

// Standalone Task aktualisieren
router.put('/tasks/standalone/:id', maintenanceTasksController.updateStandaloneTask);

// Standalone Task abschließen
router.put('/tasks/standalone/:id/complete', maintenanceTasksController.completeStandaloneTask);

// Standalone Task löschen
router.delete('/tasks/standalone/:id', maintenanceTasksController.deleteStandaloneTask);

// ============================================================
// MAINTENANCE TASKS - CRUD (nach standalone routes!)
// ============================================================

// Alle Tasks mit Filter
router.get('/tasks', maintenanceTasksController.getAllTasks);

// Task-Details mit Checklist-Ergebnissen (MUSS vor /:id kommen!)
router.get('/tasks/:id/details', maintenanceTasksController.getTaskDetails);

// Einzelne Task abrufen
router.get('/tasks/:id', maintenanceTasksController.getTaskById);

// Neue Task erstellen
router.post('/tasks', maintenanceTasksController.createTask);

// Task zuweisen
router.put('/tasks/:id/assign', maintenanceTasksController.assignTask);

// Task starten
router.put('/tasks/:id/start', maintenanceTasksController.startTask);

// Checklist-Item abhaken
router.put('/tasks/:id/checklist/:itemId', maintenanceTasksController.completeChecklistItem);

// Foto für Checklist-Item hochladen
router.post(
  '/tasks/:taskId/checklist/:itemId/photo',
  maintenanceUpload.single('photo'),
  handleMaintenanceUploadError,
  maintenanceTasksController.uploadChecklistPhoto
);

// Task abschließen
router.put('/tasks/:id/complete', maintenanceTasksController.completeTask);

// Task abbrechen
router.put('/tasks/:id/cancel', maintenanceTasksController.cancelTask);

// Task zurücklegen (für andere freigeben)
router.put('/tasks/:id/release', maintenanceTasksController.releaseTask);

// ============================================================
// OPERATING HOURS
// ============================================================

// Betriebsstunden-Übersicht aller Maschinen
router.get('/operating-hours', operatingHoursController.getAllMachinesOperatingHours);

// Betriebsstunden-Historie (alle Maschinen) - MUSS VOR :machineId Route sein!
router.get('/operating-hours/history', operatingHoursController.getOperatingHoursHistory);

// Betriebsstunden-Log einer Maschine
router.get('/operating-hours/:machineId', operatingHoursController.getOperatingHoursLog);

// Betriebsstunden-Statistik einer Maschine
router.get('/operating-hours/:machineId/stats', operatingHoursController.getOperatingHoursStats);

// Betriebsstunden erfassen
router.post('/operating-hours/:machineId', operatingHoursController.recordOperatingHours);

// ============================================================
// ESCALATIONS
// ============================================================

// Eskalations-Statistik
router.get('/escalations/stats', escalationsController.getEscalationStats);

// Meine Eskalationen (als Empfänger)
router.get('/escalations/my', escalationsController.getMyEscalations);

// Alle Eskalationen
router.get('/escalations', escalationsController.getAllEscalations);

// Einzelne Eskalation
router.get('/escalations/:id', escalationsController.getEscalationById);

// Eskalation erstellen (Problem melden)
router.post('/escalations', escalationsController.createEscalation);

// Eskalation bestätigen
router.put('/escalations/:id/acknowledge', escalationsController.acknowledgeEscalation);

// Eskalation lösen
router.put('/escalations/:id/resolve', escalationsController.resolveEscalation);

// Eskalation schließen
router.put('/escalations/:id/close', escalationsController.closeEscalation);

// Weiter eskalieren
router.put('/escalations/:id/re-escalate', escalationsController.reEscalate);

module.exports = router;
