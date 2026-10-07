# Roadmap Archiv - Abgeschlossene Phasen

> Dieses Dokument enthält die Details aller abgeschlossenen Entwicklungsphasen.
> Für aktuelle Planung siehe [ROADMAP.md](ROADMAP.md)

---

## ✅ Phase 1: Fundament (Wochen 1-4) - ABGESCHLOSSEN

### ✅ Woche 1: Projekt-Setup & Datenbank
**Abgeschlossen am:** 2025-11-01
**Zeitaufwand:** ~8 Stunden

- [x] GitHub Repo angelegt
- [x] Projekt-Struktur erstellt
- [x] Dokumentation initialisiert (README, QUICKSTART, CONTRIBUTING)
- [x] PostgreSQL DB-Schema entworfen (28 Tabellen)
- [x] node-pg-migrate eingerichtet
- [x] Erste Migrations geschrieben (5 Migrations)
- [x] Seed-Daten für Tests erstellt
- [x] Express Server Basis erstellt
- [x] Health Check API implementiert

**Deliverable:** Funktionierende Datenbank mit allen Tabellen + minimaler Server

---

### ✅ Woche 2: Backend Basis + Auth
**Abgeschlossen am:** 2025-11-02

- [x] Express Server erweitern
- [x] JWT Auth implementieren
- [x] User/Role/Permission System
- [x] CRUD Endpoints für Bauteile
- [x] Audit-Log Middleware
- [x] API testen (Postman/Jest)
- [x] Password Hashing (bcrypt)
- [x] Auth Middleware
- [x] Error Handling verbessern

**Deliverable:** Backend API mit Auth läuft auf localhost:5000

---

### ✅ Woche 3: Frontend Basis
**Abgeschlossen am:** 2025-11-02
**Zeitaufwand:** ~2 Stunden

- [x] React App Setup (Vite)
- [x] Login/Logout UI
- [x] Bauteile-Übersicht
- [x] Bauteile CRUD (Erstellen, Bearbeiten, Löschen)
- [x] Responsive Design (TailwindCSS)
- [x] Fehlerbehandlung
- [x] State Management (Zustand)

**Deliverable:** Basis-UI läuft auf localhost:5173

---

### ✅ Woche 4: Integration & Testing
**Abgeschlossen am:** 2025-11-03
**Zeitaufwand:** ~4 Stunden

- [x] CORS im Backend aktivieren
- [x] Frontend mit Backend verbinden
- [x] Alle CRUD-Operationen testen
- [x] Part Detail Page
- [x] Part Create/Edit Forms
- [x] Form Validation
- [x] Toast Notifications
- [x] Bug-Fixes (Login, Dashboard Stats, Toasts)
- [x] Code aufräumen

**Deliverable:** **MEILENSTEIN 1**: Lauffähiges Basis-System

---

## ✅ Phase 2: Kern-Features (Wochen 5-8) - ABGESCHLOSSEN

### ✅ Woche 5: Operations (Arbeitsgänge)
**Abgeschlossen:** 2025-11-04

- [x] Operations Backend CRUD
- [x] Backend Testing (test-operations.http)
- [x] Frontend: Operations pro Bauteil
- [x] OP-Nummern (OP10, OP20, ...)
- [x] Maschinen-Zuweisung
- [x] Sequence Management

**Deliverable:** Teil → Operations funktioniert

---

### ✅ Woche 6: Programme & File Upload
**Abgeschlossen am:** 2025-11-05
**Zeitaufwand:** ~7 Stunden

- [x] File Upload (Multer)
- [x] Backend: Program CRUD
- [x] File Validation (15 Dateitypen)
- [x] Program Download
- [x] Frontend: Program Upload/Liste/Card
- [x] Frontend: Operation Detail Page
- [x] Auto-Generierung program_number
- [x] Delete Button

**Deliverable:** Programme hochladen, anzeigen, bearbeiten, löschen

---

### ✅ Woche 7: Versionierung
**Abgeschlossen am:** 2025-11-05
**Zeitaufwand:** ~8 Stunden

- [x] Revision-Logic (Major.Minor.Patch)
- [x] Upload erweitern (User wählt Version-Type)
- [x] Versions-Historie Endpoint
- [x] Diff-Berechnung (Zeile-für-Zeile)
- [x] Vergleich zwischen Versionen
- [x] Rollback-Funktion
- [x] RevisionsList.jsx, DiffViewer.jsx
- [x] ProgramUploadForm (3 Modi: Neu/Revision/Edit)

**Deliverable:** Vollständige Versionierung

---

### ✅ Woche 8: Maschinen-Stammdaten
**Abgeschlossen am:** 2025-11-06
**Zeitaufwand:** ~4 Stunden

- [x] Maschinen CRUD (Backend + Frontend)
- [x] Steuerungstypen
- [x] Netzwerk-Pfade
- [x] Programme zu Maschinen zuordnen
- [x] Filter & Search
- [x] Gruppierung nach Maschinentyp

**Deliverable:** **MEILENSTEIN 2**: Maschinen-Verwaltung fertig

---

## ✅ Phase 3: Work Instructions (Wochen 9-12) - ABGESCHLOSSEN

### ✅ Woche 9: Workflow-System
**Abgeschlossen am:** 2025-11-07

- [x] Status-Management (Entwurf → Review → Freigabe)
- [x] Workflow-Transitions
- [x] Berechtigungsprüfung
- [x] Workflow-Historie
- [x] Status-Badges im UI

**Deliverable:** Workflow-System mit Historie

---

### ✅ Woche 10: Setup Sheets (Einrichteblätter)
**Abgeschlossen am:** 2025-11-08

- [x] Setup Sheets Backend CRUD
- [x] Foto-Upload für Einrichtung
- [x] Werkzeug-Positionen
- [x] Nullpunkt-Dokumentation
- [x] Frontend: SetupSheetsList, SetupSheetForm
- [x] PDF-Export

**Deliverable:** Setup Sheets komplett

---

### ✅ Woche 11: Tool Lists (Werkzeuglisten)
**Abgeschlossen am:** 2025-11-09
**~1.600 Zeilen Code**

- [x] Tool Lists Backend CRUD
- [x] Werkzeug-Positionen mit T-Nummern
- [x] Schnittdaten (Drehzahl, Vorschub, Zustellung)
- [x] Frontend: ToolListForm, ToolListDetail
- [x] Import/Export

**Deliverable:** Tool Lists fertig

---

### ✅ Woche 12: Inspection Plans (Prüfpläne)
**Abgeschlossen am:** 2025-11-09
**~922 Zeilen Code**

- [x] Inspection Plans Backend CRUD
- [x] 4 Toleranzarten (Maß, Form, Lage, Oberfläche)
- [x] Prüfmittel-Zuordnung
- [x] Prüffrequenz
- [x] Frontend: InspectionPlanForm, InspectionPlanDetail

**Deliverable:** **MEILENSTEIN 3**: Prüfpläne fertig

---

## ✅ Phase 4: Werkzeugverwaltung (Wochen 13-16) - ABGESCHLOSSEN

**Abgeschlossen am:** 2025-11-25
**Zeitaufwand:** ~20 Stunden

- [x] Tool Master (Werkzeug-Stammdaten)
- [x] Tool Categories (Kategorien)
- [x] Storage System (Lagerverwaltung)
- [x] Suppliers (Lieferanten)
- [x] Purchase Orders (Bestellungen)
- [x] T-Nummern Verwaltung
- [x] Bestandsführung
- [x] Mindestbestand-Warnungen

**Deliverable:** **MEILENSTEIN 4**: Werkzeugverwaltung komplett

---

## ✅ Phase 5: Messmittelverwaltung (Wochen 17-18) - ABGESCHLOSSEN

**Abgeschlossen am:** 2025-11-27
**Zeitaufwand:** ~7 Stunden

- [x] Messmittel-Stammdaten
- [x] Kalibrierung (Termine, Historie)
- [x] Checkout-System
- [x] Dashboard-Alarme
- [x] Lager-Integration
- [x] ISO/Luftfahrt-ready

**Deliverable:** **MEILENSTEIN 5**: Messmittelverwaltung komplett

---

## ✅ Phase 6: Spannmittel & Vorrichtungen (Wochen 19-20) - ABGESCHLOSSEN

**Abgeschlossen am:** 2025-11-28
**Zeitaufwand:** ~15 Stunden

- [x] Spannmittel-Verwaltung mit Lager-Integration
- [x] Vorrichtungs-Verwaltung
- [x] Bauteil/Operation/Maschinen-Zuordnung
- [x] Dokumenten-Upload
- [x] Setup Sheet Integration

**Deliverable:** **MEILENSTEIN 6**: Spannmittel & Vorrichtungen komplett

---

## ✅ Phase 7: Erweiterungen (Wochen 21-23) - ABGESCHLOSSEN

### ✅ Woche 21: UI-Optimierung
**Abgeschlossen am:** 2025-11-29

- [x] Sidebar-Layout (collapsible)
- [x] Breadcrumbs
- [x] User in Sidebar
- [x] LocalStorage für Einstellungen
- [x] Dark Mode Verbesserungen

---

### ✅ Woche 22: User-Verwaltung
**Abgeschlossen am:** 2025-11-29

- [x] User CRUD (Admin)
- [x] Rollen & Berechtigungen
- [x] Profil-Seite
- [x] Passwort ändern
- [x] Audit-Log Ansicht

---

### ✅ Woche 23: Wartungssystem
**Abgeschlossen am:** 2025-11-30

- [x] Wartungspläne (Intervalle, Checklisten)
- [x] Wartungs-Tasks
- [x] Checklisten mit Foto-Upload
- [x] Dashboard-Statistiken
- [x] Skill-Level basierte Zuweisung

**Deliverable:** **MEILENSTEIN 7**: Phase 7 komplett

---

## ✅ Phase 8 (teilweise): Wochen 24-28 + Stammdaten-Optimierung

### ✅ Woche 24: Kundenverwaltung
**Abgeschlossen am:** 2025-12-01

- [x] Customers CRUD
- [x] Ansprechpartner (Contacts)
- [x] Live-Suche
- [x] Bauteil-Zuordnung

---

### ✅ Woche 25-26: MachineDetailPage & Wiki
**Abgeschlossen am:** 2025-12-01

- [x] MachineDetailPage mit Tabs
- [x] Wiki-System (Kategorien, Artikel, Bilder)
- [x] Volltext-Suche
- [x] Wartungsplan-Verlinkung

---

### ✅ Woche 27-28: Wartung-Standalone & PWA
**Abgeschlossen am:** 2025-12-03

- [x] Standalone Tasks (ohne Wartungsplan)
- [x] Skill-Level Zuweisung für Tasks
- [x] 3 Optionen beim Beenden (Pausieren/Freigeben/Abbrechen)
- [x] Progressive Web App (manifest.json, Icons)
- [x] MaintenanceWidget Fixes
- [x] Browser-Tab Titel & Favicon

---

### ✅ April 2026: Stammdaten-Optimierung & Fixes (PRs #55–#81)
- Einheitliches Listen-/Detail-Pattern (Stats-Cards, Live-Filter, Grid/Table, Pagination) für Messmittel, Vorrichtungen, Spannmittel, Maschinen, Kunden, Bauteile
- Messmittel: Bulk-Aktionen, Paginierung, Etiketten
- Maschinen: Stammdaten-Verwaltung, Custom-Fields, Legacy-Spalten entfernt (3-PR-Migration)
- Kunden + Bauteile: Dokumentenverwaltung / Dokumenttypen
- Vorrichtungen: automatische Vorrichtungsnummer
- Wartung: deutsche Wartungstyp-Bezeichnungen, dynamische Icons, Filter default offen
- File-Upload-Standard: Bilder/Downloads nur noch via `/view` + `/download`
- Cron: `fs_garbage_collection`, `generate_maintenance_tasks`
- Refactor: wiederverwendbare Komponenten nach `components/common/`

---

## ✅ Urlaub & Zeiterfassung (Phase 9 + 10, Teil)

### ✅ Urlaubsplanung (2026, im Einsatz)
_Weitere PRs: Antrags-Workflow #35/#36; Detail-Modal, PDF-Exports, Saldo-Kaskadierung #49–#52_

- [x] DB: `vacations` Tabelle (user_id, start_date, end_date, type, status)
- [x] DB: `vacation_types` Tabelle (Urlaub, Krank, Schulung, etc.)
- [x] DB: `vacation_entitlements` Tabelle (Jahres-Urlaubsansprüche)
- [x] DB: `vacation_settings` Tabelle (Standard-Urlaubstage, Bundesland)
- [x] DB: `vacation_role_limits` Tabelle (dynamische Limits pro Rolle)
- [x] DB: `holidays` Tabelle (Feiertage alle Bundesländer, halbe Tage)
- [x] DB: `users.vacation_tracking_enabled` (User aus Urlaubsverwaltung ausschließen)
- [x] Backend: Vacations CRUD API mit Status-Workflow
- [x] Backend: Vacation Types CRUD API
- [x] Backend: Entitlements CRUD API + Jahr initialisieren
- [x] Backend: Role Limits CRUD API (dynamische Überschneidungs-Prüfung)
- [x] Backend: Holidays API (alle 16 Bundesländer, bewegliche Feiertage)
- [x] Backend: Überschneidungs-Check (Warnung statt Blockade)
- [x] Backend: Jahresübersicht/Kalender API
- [x] Frontend: VacationsPage mit Kalender-Ansicht (Monat/Jahr)
- [x] Frontend: VacationCalendar Komponente (visuelle Darstellung)
- [x] Frontend: VacationFormModal (Urlaub erstellen/bearbeiten)
- [x] Frontend: VacationSettingsModal (4 Tabs)
- [x] Frontend: Überschneidungs-Warnung mit überlappenden Tagen
- [x] Frontend: Kalender-Markierung bei Überschreitung (orange Ecke)
- [x] Frontend: Mitarbeiter-Filter
- [x] Frontend: Bundesland-Auswahl für Feiertage
- [x] Frontend: Dynamisches Jahr-Dropdown (-1 bis +5 Jahre)
- [x] Frontend: Halbe Feiertage (Heiligabend, Silvester)
- [x] Frontend: "Mein Urlaub" Bereich mit eigenen Daten
- [x] Frontend: Resturlaub nur mit vacations.manage sichtbar
- [x] Frontend: User-Einstellung "Urlaubsverwaltung aktiviert"

---

### ✅ Zeiterfassungs-Terminal ⏱️ (2026, im Einsatz)
**Status:** ✅ 90% abgeschlossen (Hardware + Software produktionsbereit)
**Ziel:** Stempelterminal für Mitarbeiter-Zeiterfassung (Testbetrieb)

**Hardware:**
- [x] Raspberry Pi 4 (2GB) mit Pi Touch Display 2 (7", 1280×720)
- [x] PN532 NFC-Reader (I2C, Firmware 1.6)
- [x] KY-006 Passiv-Piezo Buzzer (PWM GPIO 18)
- [x] Gehäuse (in Arbeit)
- [x] Kiosk-Modus: X11/xinit + Chromium + unclutter (Cursor versteckt)
- [x] Landscape-Rotation (Display + Touch kalibriert)
- [x] Systemd Services (mds-terminal + kiosk, Auto-Start)
- [x] PI-SETUP.md Dokumentation

**Terminal-Software (Python/FastAPI, eigenes Repo `mds-time-terminal`):**
- [x] Offline-first Architektur (SQLite Queue + Background Sync)
- [x] WebSocket für NFC-Events und Echtzeit-UI-Updates
- [x] NFC-Polling (0.3s Intervall, 2s Debounce)
- [x] Buzzer-Feedback (Success/Error/Scan, optimierte Frequenzen 2400-3200Hz)
- [x] User-Cache (alle 5 Min vom Server aktualisiert)
- [x] Stempel-Sync (alle 30s, 409-Duplikat-Handling)
- [x] REST API (Stamp, PIN-Login, User-Status, User-Info)

**Terminal-UI (Vanilla HTML/JS/CSS):**
- [x] Idle-Screen: Uhr, Datum, NFC-Aufforderung, PIN-Button
- [x] PIN-Screen: 4-stellige Eingabe mit Auto-Submit
- [x] Action-Screen: KOMMEN/GEHEN/PAUSE/WEITER Buttons (nur gültige sichtbar)
- [x] Success-Screen: Bestätigung mit Arbeitszeit + Saldo (bei Gehen)
- [x] Info-Screen: Zeitkonto (Heute/Woche/Monat/Saldo/Resturlaub/letzte Buchungen)
- [x] Error-Screen: Fehlermeldung mit Auto-Reset
- [x] Alle Icons als inline SVG (kein Unicode-Rendering-Problem)
- [x] Status-Indikatoren (NFC, Server, Sync)
- [x] Auto-Reset Timer mit Countdown-Bar
- [x] Quick-Stamp (Karte erneut auflegen = häufigste Aktion)

**MDS Backend-Erweiterungen:**
- [x] Terminal-API mit API-Key Authentifizierung (X-Terminal-Key Header)
- [x] Middleware: `authenticateTerminal` in authMiddleware.js
- [x] Endpoints: `/api/terminal/users`, `/api/terminal/stamp`, `/api/terminal/stamp/batch`
- [x] Endpoints: `/api/terminal/register`, `/api/terminal/list`, `/api/terminal/info`
- [x] Endpoint: `/api/terminal/user-info/:id` (Zeitkonto, Saldo, Urlaub, letzte Buchungen)
- [x] Migration: `time_terminals` um `api_key` + `terminal_type` erweitert
- [x] `timeEntriesController._helpers` exportiert für Terminal-Endpoint
- [x] Bugfix: `getCurrentBalance()` parseInt für numerische Berechnung
- [x] Bugfix: `time_current_status` View - `break_end` → `present` statt `absent`
- [x] Route-Reihenfolge: `terminalRoutes` vor generischen `/api`-Catch-All Routes

**Offen:**
- [x] Mehrere NFC-Karten/Tags pro User (Tabelle `user_rfid_chips`)
- [x] Backend-Änderungen committen (terminalController, Routes, authMiddleware, server.js)
- [ ] PI-SETUP.md ins Terminal-Repo committen
- [ ] Produktivbetrieb: Alle Mitarbeiter-NFC-Karten registrieren
- [ ] Gehäuse fertigstellen + Terminal montieren
- [ ] Langzeit-Test im Betrieb

**Schnell-Workflow (Primär):**
```
[KOMMEN] → Badge/NFC → ✓ "Guten Morgen Max, 07:32"
[GEHEN]  → Badge/NFC → ✓ "Arbeitszeit: 8:15 · Saldo heute: +0:15 · Zeitkonto: +12:30"
[PAUSE]  → Badge/NFC → ✓ "Pause gestartet" / "Pause beendet (32 Min)"
[INFO]   → Badge/NFC → Zeitkonto-Übersicht anzeigen
```
> 2 Sekunden pro Buchung - kein PIN, keine Auswahl

**Deliverable:** ✅ Funktionsfähiges Stempel-Terminal für Pilotphase

---

## 📊 Meilensteine

| Datum | Meilenstein |
|-------|-------------|
| 2025-11-03 | **Phase 1** - Basis-System lauffähig |
| 2025-11-06 | **Phase 2** - Kern-Features komplett |
| 2025-11-09 | **Phase 3** - Work Instructions komplett |
| 2025-11-25 | **Phase 4** - Werkzeugverwaltung komplett |
| 2025-11-27 | **Phase 5** - Messmittelverwaltung komplett |
| 2025-11-28 | **Phase 6** - Spannmittel & Vorrichtungen komplett |
| 2025-11-30 | **Phase 7** - UI, User, Wartung komplett |
| 2025-12-03 | **Phase 8** - 45% (Kunden, Wiki, PWA, Standalone Tasks) |

---

## 📈 Investierte Zeit

| Phase | Stunden |
|-------|---------|
| Phase 1-3 | ~78h |
| Phase 4 | ~20h |
| Phase 5 | ~7h |
| Phase 6 | ~15h |
| Phase 7 | ~20h |
| Phase 8 | ~15h |
| **Gesamt** | **~155h** |

---

**Letzte Aktualisierung:** 2026-10-07
