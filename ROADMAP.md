# Roadmap - Fertigungsdaten Management System

**Zeitbudget:** 30-35h/Woche
**Geschätzte Dauer:** 3-4 Monate
**Start:** Januar 2025

---

## 📅 Monat 1: Fundament + Kern (Wochen 1-4)

### ✅ Woche 1: Projekt-Setup & Datenbank
**Status:** 🔄 IN ARBEIT
**Ziel:** Datenbank-Schema steht, Migrations funktionieren

- [x] GitHub Repo angelegt
- [x] Projekt-Struktur erstellt
- [x] Dokumentation initialisiert
- [ ] PostgreSQL DB-Schema entwerfen
- [ ] node-pg-migrate einrichten
- [ ] Erste Migrations schreiben
- [ ] Seed-Daten für Tests

**Deliverable:** Funktionierende Datenbank mit allen Tabellen

---

### 📋 Woche 2: Backend Basis + Auth
**Status:** 📋 GEPLANT
**Ziel:** API läuft, Login funktioniert

- [ ] Express Server aufsetzen
- [ ] JWT Auth implementieren
- [ ] User/Role/Permission System
- [ ] CRUD Endpoints für Bauteile
- [ ] Audit-Log Middleware
- [ ] API testen

**Deliverable:** Backend API mit Auth läuft auf localhost:5000

---

### 📋 Woche 3: Frontend Basis
**Status:** 📋 GEPLANT  
**Ziel:** UI läuft, Login funktioniert

- [ ] React App Setup
- [ ] Login/Logout UI
- [ ] Bauteile-Übersicht
- [ ] Bauteile CRUD (Erstellen, Bearbeiten, Löschen)
- [ ] Responsive Design
- [ ] Fehlerbehandlung

**Deliverable:** Basis-UI läuft auf localhost:3000

---

### 📋 Woche 4: Integration & Testing
**Status:** 📋 GEPLANT
**Ziel:** Frontend ↔ Backend komplett integriert

- [ ] Frontend mit Backend verbinden
- [ ] Alle CRUD-Operationen testen
- [ ] Benutzer-Rollen testen
- [ ] Bug-Fixes
- [ ] Code aufräumen

**Deliverable:** ✅ **MEILENSTEIN 1**: Lauffähiges Basis-System

---

## 📅 Monat 2: Kern-Features (Wochen 5-8)

### 📋 Woche 5: Operations (Arbeitsgänge)
**Status:** 📋 GEPLANT
**Ziel:** Bauteile haben Arbeitsgänge

- [ ] Operations Tabelle
- [ ] Backend: Operations CRUD
- [ ] Frontend: Operations pro Bauteil
- [ ] OP-Nummern (OP10, OP20, ...)
- [ ] Maschinen-Zuweisung

**Deliverable:** Teil → Operations funktioniert

---

### 📋 Woche 6: Programme & File Upload
**Status:** 📋 GEPLANT
**Ziel:** NC-Programme hochladen

- [ ] Programs Tabelle
- [ ] File Upload (Multer)
- [ ] Program Revisions Tabelle
- [ ] Backend: Program CRUD
- [ ] Frontend: Program Upload
- [ ] Programm-Download

**Deliverable:** Programme können hochgeladen werden

---

### 📋 Woche 7: Versionierung
**Status:** 📋 GEPLANT
**Ziel:** Automatische Versionierung

- [ ] Revision-Logic (Major.Minor.Patch)
- [ ] Diff-Berechnung (Text)
- [ ] Versions-Historie anzeigen
- [ ] Rollback-Funktion
- [ ] Vergleich zwischen Versionen

**Deliverable:** Versionierung funktioniert

---

### 📋 Woche 8: Maschinen-Stammdaten
**Status:** 📋 GEPLANT
**Ziel:** Maschinenpark verwalten

- [ ] Machines Tabelle
- [ ] Maschinen CRUD
- [ ] Steuerungstypen
- [ ] Netzwerk-Pfade
- [ ] Programme zu Maschinen zuordnen

**Deliverable:** ✅ **MEILENSTEIN 2**: Kern-Features komplett

---

## 📅 Monat 3: Workflows & Wartung (Wochen 9-12)

### 📋 Woche 9: Workflow-System
**Status:** 📋 GEPLANT
**Ziel:** Status-Workflows

- [ ] Workflow States Tabelle
- [ ] Status-Übergänge (Entwurf → Freigabe)
- [ ] Berechtigungs-Checks
- [ ] Freigabe-Workflow
- [ ] Benachrichtigungen
- [ ] History-Tracking

**Deliverable:** Workflow funktioniert

---

### 📋 Woche 10: QR-Codes & File Watcher
**Status:** 📋 GEPLANT
**Ziel:** CAM-Integration

- [ ] QR-Code Generierung
- [ ] QR pro Operation
- [ ] File Watcher (chokidar)
- [ ] CAM-Ordner überwachen
- [ ] G-Code Parser
- [ ] Auto-Import Dialog

**Deliverable:** CAM → MDS funktioniert

---

### 📋 Woche 11: Wartungssystem Basis
**Status:** 📋 GEPLANT
**Ziel:** Wartungspläne

- [ ] Maintenance Plans Tabelle
- [ ] Wartungstypen (täglich, wöchentlich, ...)
- [ ] Fälligkeitsberechnung
- [ ] Wartungs-Historie
- [ ] Benachrichtigungen

**Deliverable:** Wartungspläne funktionieren

---

### 📋 Woche 12: Wartung Erweitert
**Status:** 📋 GEPLANT
**Ziel:** Skill-Level-System

- [ ] Skill-Level (Helfer, Bediener, Meister)
- [ ] Aufgaben-Zuweisung
- [ ] Foto-Anleitungen
- [ ] Eskalations-System
- [ ] Checklisten
- [ ] Roboter-Wartung

**Deliverable:** ✅ **MEILENSTEIN 3**: Produktiv einsetzbar!

---

## 📅 Monat 4: Feinschliff (Wochen 13-16)

### 📋 Woche 13: Shopfloor-UI
**Status:** 📋 GEPLANT
**Ziel:** Tablet-Ansicht für Werker

- [ ] Tablet-optimiertes UI
- [ ] QR-Scanner Integration
- [ ] Touch-freundliche Bedienung
- [ ] Offline-Modus (Service Worker)
- [ ] Große Buttons/Icons

**Deliverable:** Werker-Ansicht läuft

---

### 📋 Woche 14: Einrichteblätter & Fotos
**Status:** 📋 GEPLANT
**Ziel:** Komplette Dokumentation

- [ ] Setup Sheets Tabelle
- [ ] Setup Photos
- [ ] PDF-Generierung
- [ ] Foto-Upload
- [ ] Download-Funktion

**Deliverable:** Dokumentation komplett

---

### 📋 Woche 15: Reports & Analytics
**Status:** 📋 GEPLANT
**Ziel:** Dashboards

- [ ] Dashboard für Meister
- [ ] Statistiken
- [ ] Wartungs-Reports
- [ ] Programm-Statistiken
- [ ] Export (PDF/Excel)

**Deliverable:** Reporting funktioniert

---

### 📋 Woche 16: Deployment & Optimierung
**Status:** 📋 GEPLANT
**Ziel:** Production-Ready

- [ ] Docker-Setup optimieren
- [ ] Raspberry Pi Deployment
- [ ] Backup-Strategie
- [ ] Performance-Optimierung
- [ ] Dokumentation vervollständigen
- [ ] Schulungs-Material

**Deliverable:** ✅ **MEILENSTEIN 4**: System ist FERTIG!

---

## 🎯 Zukünftige Erweiterungen (Nach Monat 4)

### Phase 5: Advanced Features
- [ ] Machine Monitoring (MTConnect/OPC UA)
- [ ] DNC-Integration
- [ ] 3D G-Code Viewer
- [ ] Mobile App (React Native)
- [ ] ERP-Integration
- [ ] Erweiterte Analytics mit KI

---

## 📊 Fortschritt

```
Gesamt: ████░░░░░░░░░░░░░░░░ 5%

Monat 1: ░░░░░░░░░░░░░░░░░░░░ 0%
Monat 2: ░░░░░░░░░░░░░░░░░░░░ 0%
Monat 3: ░░░░░░░░░░░░░░░░░░░░ 0%
Monat 4: ░░░░░░░░░░░░░░░░░░░░ 0%
```

**Arbeitszeit:** 0h / ~480h geschätzt
**Geschätzte Fertigstellung:** April 2025

---

## 💡 Hinweise

- Zeitbudget: 30-35h/Woche
- Jede Woche wird aktualisiert
- Bei Problemen/Verzögerungen: Timeline anpassen
- Reihenfolge kann sich ändern basierend auf Prioritäten

**Letzte Aktualisierung:** 2025-01-15
