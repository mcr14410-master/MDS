// frontend/src/utils/agentLabels.js
// Texte und Farben für MDS-Agent und Bereitstellungen (Spec docs/konzepte/MESSPROGRAMME_AGENT_SPEC.md)
// Klassen stehen ausgeschrieben, damit Tailwind sie beim Build findet.

import API_BASE_URL from '../config/api';

export const DEPLOYMENT_STATUS = {
  requested: { label: 'Wird übertragen', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  active: { label: 'Auf dem Gerät', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  closing: { label: 'Wird abgeschlossen', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  closed: { label: 'Abgeschlossen', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
};

// Dateizustand am Gerät; Reihenfolge = Schwere (für die Zusammenfassung je Programm)
export const FILE_STATE = {
  conflict: { label: 'Konflikt – fremde Datei gleichen Namens', short: 'Konflikt', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  corrupt: { label: 'Von PC-DMIS wiederhergestellt (war beschädigt)', short: 'beschädigt', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  missing: { label: 'Fehlt auf dem Gerät', short: 'fehlt', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  modified: { label: 'Vor Ort bearbeitet', short: 'bearbeitet', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  locked: { label: 'Gesperrt – in PC-DMIS geöffnet', short: 'gesperrt', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  pending: { label: 'Wird übertragen', short: 'wird übertragen', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  none: { label: 'Vom Gerät noch nicht gemeldet', short: 'noch nicht gemeldet', className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  run_saved: { label: 'Nach Messlauf gespeichert', short: 'nach Lauf gespeichert', className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300' },
  current: { label: 'Bereit', short: 'bereit', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  unknown: { label: 'Fremde Datei im Ordner', short: 'fremd', className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
};
const SEVERITY = Object.keys(FILE_STATE);

export const fileState = (state) => FILE_STATE[state || 'none'] || FILE_STATE.none;

/** Schwerster Zustand einer Dateigruppe (ein Programm) */
export function worstState(files) {
  const states = files.map((f) => f.state || 'none');
  return SEVERITY.find((s) => states.includes(s)) || 'none';
}

// Zustände, die beim Abschließen liegen bleiben, bis jemand verwirft
export const KEPT_STATES = ['modified', 'run_saved', 'corrupt'];

export const ROLE_SHORT = {
  main: 'Messprogramm',
  cad: 'CAD',
  drawing: 'Prüfzeichnung',
  report_xlsx: 'Excel-Vorlage',
  report_layout: 'Vorlagen-Layout',
  other: 'Mini-Routinen',
  calibration: 'Kalibrierprogramm',
};

export function timeAgo(dateStr) {
  if (!dateStr) return 'nie';
  const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
}

export const formatDateTime = (dateStr) => (dateStr
  ? new Date(dateStr).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '–');

/** Agent gilt als erreichbar, wenn er in den letzten drei Abfrage-Intervallen gemeldet hat */
export const agentOnline = (agent) => Boolean(agent.last_seen_at)
  && Date.now() - new Date(agent.last_seen_at).getTime() < 3 * (agent.poll_interval_sec || 30) * 1000;

/**
 * Adresse, unter der der Agent das MDS erreicht: dieselbe wie für die API-Aufrufe der Oberfläche.
 * Produktion: Seitenadresse (Caddy liefert Oberfläche und API). Dev: Backend (VITE_API_URL bzw. :5000),
 * nicht der Vite-Server – der beantwortet /api/... mit der HTML-Startseite.
 */
export const agentServerUrl = () => (API_BASE_URL || window.location.origin).replace(/\/+$/, '');

/** localhost/127.0.0.1 gilt nur auf dem PC, an dem der Browser läuft */
export const isLocalUrl = (url) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(url);

/** ini-Ausschnitt zum Kopieren auf den Mess-PC (Pfade sind Beispiele, gelten für PC-DMIS 2024.1) */
export function iniSnippet(agent, apiKey) {
  const lines = [
    '[MDS]',
    `Url=${agentServerUrl()}`,
    `ApiKey=${apiKey}`,
  ];
  if ((agent.modules || []).includes('cmm_sync')) {
    lines.push(
      '[CmmSync]',
      'Programmordner=D:\\Messprogramme',
      '; versionsabhängig – nach PC-DMIS-Update anpassen',
      'Vorlagenordner=C:\\Users\\Public\\Documents\\Hexagon\\PC-DMIS\\2024.1\\ExcelFormReport\\Templates',
      'Nebendateien=*.PRG~;*.PRG^;*.MiniRoutines.xml',
    );
  }
  return lines.join('\n');
}
