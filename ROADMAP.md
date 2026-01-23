# Roadmap - MDS Fertigungsdaten Management System

**Zeitbudget:** 30-35h/Woche  
**Start:** Januar 2025  
**Stand:** Dezember 2025 (~155h investiert, ~99.000 Zeilen Code)

> Detaillierte Dokumentation abgeschlossener Phasen: [ROADMAP_ARCHIVE.md](ROADMAP_ARCHIVE.md)

---

## 📊 Übersicht

| Phase | Wochen | Status | Inhalt |
|-------|--------|--------|--------|
| Phase 1-3 | W1-12 | ✅ 100% | Fundament, Kern, Work Instructions |
| Phase 4-6 | W13-20 | ✅ 100% | Werkzeuge, Messmittel, Spannmittel |
| Phase 7 | W21-23 | ✅ 100% | UI, User-Verwaltung, Wartungssystem |
| Phase 8 | W24-34 | 🔄 65% | Kunden ✅, Wiki ✅, PWA ✅, Verbrauchsmaterial 🔄 |
| Phase 9 | W35-48 | 🔄 12% | Urlaub 🔄, Roboter, Revisionen, Admin, Benachrichtigungen |
| Phase 10 | W49-56 | 📋 Geplant | Auftragsverwaltung |
| Phase 11 | W57-70 | 📋 Geplant | Shopfloor-Terminals + Zeiterfassung |
| Phase 12+ | W69+ | 📋 Optional | Reports, Parser, ERP-Integration |

---

## ✅ Abgeschlossene Phasen (Zusammenfassung)

### Phase 1-3: Basis-System (W1-12) ✅
Fundament mit PostgreSQL, JWT-Auth, React-Frontend. Bauteile, Operationen, NC-Programme mit Versionierung, Maschinen-Stammdaten, Workflow-System, Setup Sheets, Tool Lists, Prüfpläne.

### Phase 4-6: Asset Management (W13-20) ✅
Werkzeugverwaltung (Stammdaten, Lager, Bestellungen), Messmittelverwaltung (Kalibrierung, Checkout), Spannmittel & Vorrichtungen mit Lager-Integration.

### Phase 7: Erweiterungen (W21-23) ✅
Sidebar-Layout, User-Verwaltung mit Rollen/Berechtigungen, Wartungssystem mit Plänen, Checklisten, Foto-Upload.

---

## 🔄 Phase 8: Erweiterungen (Wochen 24-34) - IN ARBEIT

### ✅ Abgeschlossen
- **Woche 24:** Kundenverwaltung (CRUD, Ansprechpartner, Bauteil-Zuordnung)
- **Woche 25-26:** MachineDetailPage, Wiki-System (Kategorien, Volltext-Suche)
- **Woche 27-28:** Wartung-Standalone Tasks, PWA-Support

---

### 🔄 Woche 29-30: Lagersystem erweitern (Verbrauchsmaterial)
**Status:** 🔄 In Arbeit
**Ziel:** Verbrauchsmaterial verwalten

- [x] DB: `consumables` Tabelle (Typ, Kategorie, Einheit, Mindestbestand)
- [x] DB: `consumable_categories` Tabelle (Kühlschmierstoff, Öl, Reiniger, etc.)
- [x] DB: `consumable_stock` Tabelle (Bestand pro Lagerort, Chargen, MHD)
- [x] DB: `consumable_transactions` Tabelle (Ein/Ausgang, Verbrauch)
- [x] DB: `consumable_documents` Tabelle (SDB, TDB, Bilder)
- [x] DB: Views (consumables_with_stock, low_stock_alerts, expiry_alerts)
- [x] DB: Bestellsystem erweitert (purchase_order_items.item_type, consumable_id)
- [x] Backend: Consumable Categories CRUD API
- [x] Backend: Consumables CRUD API
- [x] Backend: Stock CRUD + Buchungen (receipt, issue, adjustment, maintenance)
- [x] Backend: Documents Upload/Download API
- [x] Backend: Alerts API (low-stock, expiry)
- [x] Frontend: Store (consumablesStore.js)
- [x] Frontend: ConsumablesPage (Übersicht mit Filter)
- [x] Frontend: ConsumableDetailPage (Tabs: Übersicht, Bestand, Dokumente)
- [x] Frontend: ConsumableForm (Erstellen/Bearbeiten)
- [x] Frontend: ConsumableStockTab (Bestand, Buchungen, Historie)
- [x] Frontend: ConsumableDocumentsTab (Upload, Download, Preview)
- [x] Frontend: Sidebar Integration
- [ ] Integration: Wartungssystem (Verbrauch bei Wartung buchen) - UI
- [ ] Testing lokal

**Deliverable:** Lagerverwaltung für Verbrauchsmaterial mit Warnungen

---

### ⚠️ ARCHITEKTUR-ENTSCHEIDUNG VOR WEITEREN LAGERKATEGORIEN

**Status:** 🔴 Vor Woche 31 zu klären!

**Aktuelle Situation:**
Nach Implementierung von Verbrauchsmaterial wurde deutlich, dass die aktuelle Architektur bei jeder neuen Lagerkategorie erheblichen Mehraufwand verursacht:

```
Aktuell (separate Tabellen pro Kategorie):
├── Tools:       tool_master → storage_items → compartments
├── Consumables: consumables → consumable_stock → compartments  
├── (Geplant)    raw_materials → raw_material_stock → ...
└── (Geplant)    standard_parts → standard_part_stock → ...

Bestellsystem wird komplexer:
purchase_order_items (
  item_type,          -- 'tool' | 'consumable' | 'raw_material' | ...
  storage_item_id,    -- FK für Tools
  consumable_id,      -- FK für Consumables
  raw_material_id,    -- FK für Rohmaterial (neu)
  standard_part_id    -- FK für Normteile (neu)
)
```

**Probleme:**
| Problem | Auswirkung |
|---------|------------|
| Duplizierter Code | Jede Kategorie = eigene Controller, Routes, Store, Pages |
| Bestellsystem wächst | Jede neue Kategorie = neue Spalte + if/else überall |
| Wartungsaufwand | Feature-Änderung muss an 4+ Stellen gemacht werden |
| Inkonsistenz-Risiko | Stock-Logik, Transaktionen, Alerts - alles separat |

**Alternative: Generisches Inventory-System**
```sql
-- Gemeinsame Basis für ALLE Lagerarten
inventory_items (
  id, item_type, name, article_number, 
  supplier_id, category_id, unit, is_active, ...
)

-- Typ-spezifische Erweiterungen (1:1)
inventory_tool_details (inventory_id, coating, material, diameter, ...)
inventory_consumable_details (inventory_id, is_hazardous, has_expiry, ...)
inventory_raw_material_details (inventory_id, material_grade, form, ...)
inventory_standard_part_details (inventory_id, din_number, iso_number, ...)

-- EIN gemeinsamer Stock für ALLE
inventory_stock (
  id, inventory_item_id, compartment_id,
  quantity, batch_number, expiry_date, min_quantity, ...
)

-- EINE Transaktions-Tabelle
inventory_transactions (...)

-- Bestellsystem: EINE Spalte statt 4+
purchase_order_items (
  inventory_item_id,  -- Fertig. Keine Typ-Unterscheidung nötig.
  quantity, unit_price, ...
)
```

**Vorteile generisches System:**
- Ein Controller, eine Route, ein Store für Stock-Operationen
- Ein Frontend für Bestandsverwaltung (mit typ-spezifischen Tabs)
- Bestellsystem bleibt einfach
- Neue Kategorien = neuer item_type + optionale Detail-Tabelle
- Einheitliche Alerts, Reports, Dashboard-Widgets

**Nachteile generisches System:**
- Initiales Refactoring aufwändig (~16-24h Arbeit)
- Mehr JOINs für typ-spezifische Daten
- Generische UI muss Sonderfälle handhaben

**Empfehlung:**
1. **Option A:** Aktuellen Ansatz beibehalten - OK für 3-4 Kategorien, mehr Arbeit pro Kategorie
2. **Option B:** Jetzt auf generisches System umstellen - Einmal-Aufwand, danach einfacher
3. **Option C:** Paralleles Test-Projekt - Generisches System in separatem Branch/Projekt testen

**TODO vor Woche 31:**
- [ ] Entscheidung treffen: Option A, B oder C
- [ ] Bei Option C: Test-Branch erstellen, generisches Schema entwerfen
- [ ] Bei Option B: Migrationsstrategie planen (bestehende Daten?)

---

### 📋 Woche 31-32: Lagersystem erweitern (Rohmaterial)
**Status:** 📋 Geplant | ⚠️ Abhängig von Architektur-Entscheidung
**Ziel:** Rohmaterial-Verwaltung mit Bestandsführung

- [ ] DB: `raw_materials` Tabelle (Material, Güte, Form)
- [ ] DB: `raw_material_stock` Tabelle (Abmessungen, Bestand, Lagerort, Charge)
- [ ] DB: `raw_material_transactions` Tabelle (Eingang/Ausgang/Verbrauch)
- [ ] Backend: Raw Materials CRUD API
- [ ] Backend: Bestandswarnung bei Mindestbestand
- [ ] Backend: Chargen-Verfolgung
- [ ] Frontend: Rohmaterial-Übersicht (Material, Güte, Abmessungen)
- [ ] Frontend: Bestandsbuchung (Wareneingang, Entnahme)
- [ ] Frontend: Lagerort-Verwaltung
- [ ] Frontend: Mindestbestand-Alarme im Dashboard
- [ ] Integration: Bauteil → Rohmaterial Zuordnung
- [ ] Integration: Lieferanten verknüpfen

**Deliverable:** Rohmaterial-Lagerverwaltung mit Chargen-Tracking

---

### 📋 Woche 33-34: Lagersystem erweitern (Normteile)
**Status:** 📋 Geplant | ⚠️ Abhängig von Architektur-Entscheidung
**Ziel:** Normteile und Zukaufteile verwalten

- [ ] DB: `standard_parts` Tabelle (DIN/ISO-Norm, Beschreibung, Abmessungen)
- [ ] DB: `standard_part_categories` Tabelle (Schrauben, Muttern, Stifte, O-Ringe, etc.)
- [ ] DB: `standard_part_stock` Tabelle (Bestand, Lagerort, Mindestbestand)
- [ ] DB: `standard_part_transactions` Tabelle (Ein/Ausgang)
- [ ] Backend: Standard Parts CRUD API
- [ ] Backend: Bestandswarnung bei Mindestbestand
- [ ] Frontend: Normteile-Übersicht mit Kategorien
- [ ] Frontend: Artikel-Formular (DIN/ISO-Suche)
- [ ] Frontend: Bestandsbuchung (Eingang/Ausgang)
- [ ] Frontend: Mindestbestand-Alarme im Dashboard
- [ ] Integration: Lieferanten verknüpfen
- [ ] Optional: Stücklisten-Verknüpfung

**Deliverable:** Normteile-Lagerverwaltung mit DIN/ISO-Katalog

---

## 📋 Phase 9: Erweiterungen (Wochen 35-48)

### 📋 Woche 35-36: Beladeroboter Setup System
**Status:** 📋 Geplant
**Ziel:** Robot-Setups pro Operation dokumentieren

- [ ] DB: `robot_setups` Tabelle (operation_id, greifer, rack, programm)
- [ ] DB: `robot_setup_images` Tabelle (Setup-Fotos)
- [ ] DB: `gripper_types` Tabelle (Greifer-Stammdaten)
- [ ] DB: `rack_configurations` Tabelle (Rack-Konfigurationen)
- [ ] Backend: Robot Setup CRUD API
- [ ] Backend: Bild-Upload für Setup-Dokumentation
- [ ] Frontend: Robot Setup in Operation-Detail
- [ ] Frontend: Setup-Formular (Greifer, Rack, Programm)
- [ ] Frontend: Setup-Galerie (Bilder)
- [ ] Frontend: Greifer/Rack Stammdaten-Verwaltung
- [ ] Integration: Setup Sheet Verknüpfung

**Deliverable:** Beladeroboter-Dokumentation pro Operation

---

### 🔄 Woche 37-38: Urlaubsplanung
**Status:** 🔄 85% abgeschlossen
**Ziel:** Urlaub/Abwesenheiten im Kalender verwalten

**Erledigt:**
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

**Offen:**
- [ ] Antrags-Workflow (beantragen → genehmigen/ablehnen)
- [ ] Integration Wartungssystem: User mit aktivem Urlaub/Krank automatisch ausblenden

**Deliverable:** Urlaubskalender mit Überschneidungs-Check, Feiertage für alle Bundesländer

---

### 📋 Woche 39-40: Bauteil-Revisionsverwaltung
**Status:** 📋 Geplant
**Ziel:** Revisionen/Änderungsstände von Bauteilen verwalten

- [ ] DB: `part_revisions` Tabelle (part_id, revision, change_description, effective_date)
- [ ] DB: Verknüpfung zu NC-Programmen pro Revision
- [ ] Backend: Revisions CRUD API
- [ ] Backend: Aktive Revision setzen
- [ ] Backend: Revisions-Historie
- [ ] Frontend: Revisions-Tab in PartDetailPage
- [ ] Frontend: Revision erstellen (mit Änderungsbeschreibung)
- [ ] Frontend: Programme pro Revision anzeigen
- [ ] Frontend: Revision freigeben/sperren
- [ ] Integration: Setup Sheets pro Revision
- [ ] Integration: Tool Lists pro Revision

**Deliverable:** Bauteil-Änderungsverwaltung mit Programm-Zuordnung

---

### 📋 Woche 41-42: Admin-Konfigurationsbereich
**Status:** 📋 Geplant
**Ziel:** Zentrale Einstellungen für Administratoren

- [ ] DB: `system_settings` Tabelle (key, value, type, category)
- [ ] Backend: Settings CRUD API (nur Admin)
- [ ] Backend: Settings-Cache für Performance
- [ ] Frontend: Admin → Einstellungen Seite
- [ ] Kategorien: Allgemein, Wartung, Lager, Benachrichtigungen
- [ ] Einstellungen: Firmenname, Logo, Sprache
- [ ] Einstellungen: Standard-Werte (Skill-Level, Prioritäten)
- [ ] Einstellungen: Intervalle (Kalibrierung, Wartung)
- [ ] Einstellungen: Schwellwerte (Mindestbestände, Warnungen)
- [ ] Frontend: Einstellungs-Formulare nach Kategorie

**Deliverable:** Zentraler Admin-Bereich für System-Einstellungen

---

### 📋 Woche 43-44: Benachrichtigungs-System
**Status:** 📋 Geplant
**Ziel:** In-App Benachrichtigungen und Alerts

- [ ] DB: `notifications` Tabelle (user_id, type, title, message, read, link)
- [ ] DB: `notification_settings` Tabelle (user_id, type, enabled)
- [ ] Backend: Notifications CRUD API
- [ ] Backend: Auto-Generierung bei Events (Wartung fällig, Kalibrierung, etc.)
- [ ] Backend: WebSocket für Echtzeit-Updates (optional)
- [ ] Frontend: Notification Bell im Header
- [ ] Frontend: Notification Dropdown (ungelesene Nachrichten)
- [ ] Frontend: Notification Center (alle Nachrichten)
- [ ] Frontend: Mark as read / Mark all as read
- [ ] Frontend: Notification Settings pro User
- [ ] Trigger: Wartung überfällig, Kalibrierung fällig, Bestand niedrig

**Deliverable:** In-App Benachrichtigungssystem mit User-Einstellungen

---

### 📋 Woche 45-46: Maschinen-Erweiterungen
**Status:** 📋 Geplant
**Ziel:** Maschinentypen und Detail-Eingabefelder erweitern

- [ ] DB: `machine_types` Tabelle erweitern (spezifische Felder pro Typ)
- [ ] DB: `machine_custom_fields` Tabelle (dynamische Felder)
- [ ] Backend: Machine Types CRUD mit Feld-Definition
- [ ] Backend: Custom Fields API
- [ ] Frontend: Maschinentyp-Verwaltung (Admin)
- [ ] Frontend: Dynamische Formularfelder je nach Typ
- [ ] Felder für Fräsmaschinen: Achsen, Spindel, Werkzeugmagazin
- [ ] Felder für Drehmaschinen: Spindeln, Revolver, Gegenspindel
- [ ] Felder für Messmaschinen: Messbereich, Genauigkeit
- [ ] Frontend: Typ-spezifische Detail-Ansicht

**Deliverable:** Flexible Maschinentypen mit dynamischen Feldern

---

### 📋 Woche 47: Werkzeug-Icons
**Status:** 📋 Geplant
**Ziel:** Eigene Icons für Werkzeugkategorien

- [ ] Icon-Set für Werkzeugtypen (Fräser, Bohrer, Wendeschneidplatten, etc.)
- [ ] SVG-Icons erstellen oder lizenzfreie finden
- [ ] Frontend: Icon-Komponente für Werkzeuge
- [ ] Frontend: Icons in Tool Master Liste
- [ ] Frontend: Icons in Tool Lists
- [ ] Frontend: Icon-Auswahl bei Werkzeug-Erstellung
- [ ] Optional: Icon-Upload für eigene Icons

**Deliverable:** Visuelle Werkzeug-Unterscheidung durch Icons

---

### 📋 Woche 48: HTTPS/SSL Setup
**Status:** 📋 Geplant
**Ziel:** Sichere Verbindung für internes Netzwerk

- [ ] Option A: Selbst-signiertes Zertifikat
- [ ] Option B: mkcert (lokale CA)
- [ ] Nginx Reverse Proxy Konfiguration
- [ ] Docker-Compose für SSL anpassen
- [ ] Automatische HTTP → HTTPS Weiterleitung
- [ ] Dokumentation für Zertifikat-Installation auf Clients
- [ ] PWA Update (HTTPS erforderlich für Service Worker)

**Deliverable:** HTTPS-Verbindung ohne Browser-Warnung

---

## 🏭 Phase 10: Auftragsverwaltung (Wochen 49-56)

### 📋 Woche 49-50: Auftrags-Grundsystem
**Status:** 📋 Geplant
**Ziel:** Fertigungsaufträge anlegen und verwalten

- [ ] DB: `production_orders` Tabelle (Auftragsnummer, Kunde, Bauteil, Menge, Termin)
- [ ] DB: `production_order_status` Tabelle (geplant, freigegeben, in Arbeit, fertig)
- [ ] DB: `production_order_operations` Tabelle (Arbeitsgang-Fortschritt)
- [ ] Backend: Production Orders CRUD API
- [ ] Backend: Status-Workflow (Statusübergänge)
- [ ] Backend: Termin-Berechnung
- [ ] Frontend: Auftrags-Übersicht (Liste, Filter, Suche)
- [ ] Frontend: Auftrags-Formular (Kunde, Bauteil, Menge, Termin)
- [ ] Frontend: Auftrags-Detail-Seite
- [ ] Frontend: Status-Badge und Fortschrittsanzeige

**Deliverable:** Basis-Auftragsverwaltung mit Status-Workflow

---

### 📋 Woche 51-52: Auftrags-Verfolgung
**Status:** 📋 Geplant
**Ziel:** Fertigungsfortschritt verfolgen

- [ ] DB: `production_order_logs` Tabelle (Zeitstempel, Aktion, User)
- [ ] DB: `production_order_times` Tabelle (Ist-Zeiten pro Arbeitsgang)
- [ ] Backend: Fortschritts-Tracking API
- [ ] Backend: Ist-Zeit Erfassung
- [ ] Backend: Soll/Ist Vergleich
- [ ] Frontend: Fortschritts-Timeline
- [ ] Frontend: Arbeitsgang-Abhaken (Start/Stop/Fertig)
- [ ] Frontend: Zeit-Erfassung pro Arbeitsgang
- [ ] Frontend: Soll/Ist Vergleich Anzeige
- [ ] Frontend: Auftrags-Historie

**Deliverable:** Echtzeit-Fortschrittsverfolgung mit Zeiterfassung

---

### 📋 Woche 53-54: Auftrags-Planung
**Status:** 📋 Geplant
**Ziel:** Kapazitätsplanung und Terminierung

- [ ] DB: `machine_capacity` Tabelle (Verfügbarkeit pro Maschine)
- [ ] Backend: Kapazitäts-Berechnung
- [ ] Backend: Terminierungs-Algorithmus
- [ ] Backend: Engpass-Erkennung
- [ ] Frontend: Planungs-Übersicht (Gantt-artig)
- [ ] Frontend: Maschinen-Auslastung
- [ ] Frontend: Termin-Konflikte anzeigen
- [ ] Frontend: Drag & Drop Umplanung (optional)
- [ ] Integration: Urlaub/Abwesenheiten berücksichtigen

**Deliverable:** Kapazitätsplanung mit Terminübersicht

---

### 📋 Woche 55-56: Auftrags-Dashboard & Reporting
**Status:** 📋 Geplant
**Ziel:** Übersichten und Auswertungen

- [ ] Backend: Dashboard-Statistiken API
- [ ] Backend: Report-Generierung (PDF/Excel)
- [ ] Frontend: Auftrags-Dashboard
- [ ] Frontend: KPIs (Durchlaufzeit, Termintreue, Auslastung)
- [ ] Frontend: Auftrags-Kalender
- [ ] Frontend: Überfällige Aufträge Warnung
- [ ] Frontend: Export-Funktionen
- [ ] Integration: Dashboard-Widget auf Startseite

**Deliverable:** Management-Dashboard mit KPIs und Reports

---

## 📱 Phase 11: Shopfloor-Terminals + Zeiterfassung (Wochen 57-70)

> **Fokus: Usability** - Die Terminals sollen den Bedienern helfen, nicht zusätzlich belasten.
> Große Touch-Buttons, wenig Text, schnelle Workflows, minimale Eingaben.

### 📋 Woche 57-58: Shopfloor Basis-System
**Status:** 📋 Geplant
**Ziel:** Grundlagen für alle Terminals

**Login-System:**
- [ ] DB: `users.pin` Feld (4-6 Ziffern, gehashed)
- [ ] Backend: `/api/auth/pin-login` Endpoint
- [ ] Frontend: User-Grid mit Fotos + PIN-Pad
- [ ] Auto-Logout Timer (konfigurierbar pro Terminal)
- [ ] Session-Handling für Terminals

**Terminal-Framework:**
- [ ] Basis-Layout für Touch-Bedienung (große Buttons 64px+)
- [ ] Kiosk-Modus Konfiguration
- [ ] QR-Code Scanner Komponente (Kamera)
- [ ] Shopfloor-spezifische Komponenten (NumPad, ActionButtons)
- [ ] Responsive für verschiedene Displaygrößen

**QR-Code System:**
- [ ] QR-Format Definition (MDS:TOOL:xxx, MDS:ORDER:xxx:xx, etc.)
- [ ] QR-Code Generator für Werkzeugfächer
- [ ] QR-Code Generator für Aufträge/OPs
- [ ] Scanner-Integration (Kamera + externe Scanner)

**Deliverable:** Login + QR-Scan funktioniert, Basis-UI steht

---

### 📋 Woche 59-61: Werkzeug-Terminal 🔧
**Status:** 📋 Geplant
**Ziel:** Komplettes Werkzeug-Terminal an Werkzeugschränken

**Hauptfunktionen:**
- [ ] "Meine Werkzeuge" - Liste entnommener WZ mit Dauer
- [ ] QR-Code Scan → Werkzeug direkt anzeigen
- [ ] Auftrag scannen → Tool List der OP anzeigen
- [ ] Werkzeug suchen (Fallback ohne QR)
- [ ] Entnehmen (einzeln oder mehrere aus Tool List)
- [ ] Zurückgeben (einzeln oder "Alle zurückgeben")
- [ ] Verschrotten mit Grund (Gebrochen/Verschleiß/Sonstig)

**Lagerverwaltung:**
- [ ] Zur Bestellung hinzufügen (mit Mengenauswahl)
- [ ] Lieferungen einbuchen (Bestellung auswählen, Positionen abhaken)
- [ ] Teillieferungen unterstützen

**Problem melden:**
- [ ] Defekt melden
- [ ] Bestand stimmt nicht
- [ ] Nachschleifen erforderlich

**DB-Erweiterung:**
- [ ] `tool_checkouts.production_order_id` (Verknüpfung WZ ↔ Auftrag)
- [ ] `tool_checkouts.operation_id`
- [ ] `tool_scrap_log` Tabelle (Verschrottungen mit Grund)

**Deliverable:** Vollständiges Werkzeug-Terminal

---

### 📋 Woche 62-63: Messraum-Terminal 📏
**Status:** 📋 Geplant
**Ziel:** Messmittel-Ausgabe im Messraum

**Hauptfunktionen:**
- [ ] "Meine Messmittel" - Liste entnommener MM mit Dauer
- [ ] QR-Code Scan → Messmittel direkt anzeigen
- [ ] Auftrag scannen → Prüfplan + benötigte Messmittel anzeigen
- [ ] Messmittel suchen (Fallback ohne QR)
- [ ] Entnehmen (einzeln oder mehrere aus Prüfplan)
- [ ] Zurückgeben (einzeln oder "Alle zurückgeben")

**Kalibrierung:**
- [ ] Übersicht "Bald fällig" (nächste 7 Tage)
- [ ] Kalibrierung anfordern (Planmäßig / Verdacht auf Fehler)
- [ ] Problem melden (Beschädigt, Messabweichung)

**Deliverable:** Vollständiges Messraum-Terminal

---

### 📋 Woche 64-68: Maschinen-Terminal 🏭
**Status:** 📋 Geplant
**Ziel:** Produktions-Terminal an jeder Maschine

**NC-Programm Transfer (Kernfunktion):**
- [ ] Programm laden: DB → Maschine (einzeln oder alle zur OP)
- [ ] Programm senden: Maschine → DB als neue Version
- [ ] Änderungserkennung (welche Programme wurden modifiziert)
- [ ] Versionsauswahl bei Rücksendung (Patch/Minor/Major)
- [ ] Änderungsnotiz erfassen (was wurde optimiert)
- [ ] Transfer-Log (wer, wann, was, wohin)
- [ ] Netzwerk-Protokolle: SMB, FTP, SFTP
- [ ] Fallback: USB-Download für Offline-Maschinen
- [ ] DB: `program_transfers` Tabelle
- [ ] DB: `machines.network_protocol`, `network_user`, `network_password`

**Auftragsverwaltung:**
- [ ] Auftrag scannen / aus Liste wählen
- [ ] Aktueller Auftrag prominent anzeigen
- [ ] Rüsten starten (Timer läuft)
- [ ] Rüsten beenden → Produktion starten
- [ ] Produktion direkt starten (bereits gerüstet)

**Unterbrechungen:**
- [ ] Pause mit Grund (Pause, WZ-Wechsel, Messen, Material, Störung, Warten, Sonstig)
- [ ] Unterbrechungs-Timer
- [ ] Fortsetzen
- [ ] Auftrag vorzeitig beenden

**Stück-Tracking:**
- [ ] "Stück fertig" Button
- [ ] Automatische Laufzeit pro Stück
- [ ] Soll/Ist Vergleich anzeigen
- [ ] Statistik (Ø, Schnellstes, Langsamstes)
- [ ] Optional: Mit Messung kombinieren

**In-Prozess Messung:**
- [ ] Prüfplan der aktuellen OP laden
- [ ] NumPad für Messwert-Eingabe
- [ ] Sofortige i.O./n.i.O. Anzeige
- [ ] Messwerte mit Stück verknüpfen

**Dokumentation:**
- [ ] Setup Sheet anzeigen
- [ ] Werkzeugliste anzeigen
- [ ] Wiki durchsuchen (Fehlerbehebung)

**Wartung:**
- [ ] Fällige Wartungen für diese Maschine
- [ ] Wartung starten / durchführen / abschließen
- [ ] Neue Aufgabe erstellen (Ad-hoc)
- [ ] Störung melden

**Auto-Logout:**
- [ ] Konfigurierbar (Aus / 3 Min / 5 Min / 10 Min)
- [ ] Bei laufender Produktion automatisch deaktiviert
- [ ] Warnung vor Logout (30 Sek)

**DB-Erweiterungen:**
- [ ] `production_order_times` (Rüst-/Produktionszeiten pro Session)
- [ ] `production_interruptions` (Unterbrechungen mit Grund)
- [ ] `production_piece_times` (Laufzeit pro Stück, optional SPC)

**Deliverable:** Vollständiges Maschinen-Terminal mit Zeiterfassung

---

### 📋 Woche 69-70: Zeiterfassungs-Terminal ⏱️
**Status:** 📋 Geplant
**Ziel:** Stempelterminal für Mitarbeiter-Zeiterfassung (Testbetrieb)

**Schnell-Workflow (Primär):**
```
[KOMMEN] → Badge/NFC → ✓ "Guten Morgen Max, 07:32"
[GEHEN]  → Badge/NFC → ✓ "Schönen Feierabend, 8:15h heute"
[PAUSE]  → Badge/NFC → ✓ "Pause gestartet" / "Pause beendet (32 Min)"
[INFO]   → Badge/NFC → Zeitkonto-Übersicht anzeigen
```
> 2 Sekunden pro Buchung - kein PIN, keine Auswahl

**Badge/NFC Login:**
- [ ] NFC-Reader Integration (USB HID)
- [ ] DB: `users.badge_id` Feld (eindeutige Badge-Nummer)
- [ ] Badge-Zuweisung in User-Verwaltung
- [ ] Fallback: PIN-Eingabe wenn kein Badge

**Hauptfunktionen:**
- [ ] Kommen-Stempeln (Arbeitsbeginn)
- [ ] Gehen-Stempeln (Arbeitsende)
- [ ] Pause-Stempeln (Toggle: Start/Ende)
- [ ] Info-Button → Zeitkonto ohne Buchung anzeigen
- [ ] Aktueller Status nach Buchung (Anwesend seit X:XX)
- [ ] Visuelles + akustisches Feedback (Erfolg/Fehler)

**Zeitkonto-Anzeige (Info-Screen):**
- [ ] Aktuelles Saldo (Über-/Unterstunden)
- [ ] Soll-Stunden heute/Woche/Monat
- [ ] Ist-Stunden heute/Woche/Monat
- [ ] Urlaubstage-Rest (Verknüpfung mit Urlaubsplanung)
- [ ] Letzte Buchungen (Historie)

**Korrekturen (nur mit Berechtigung):**
- [ ] Vergessenes Stempeln nachtragen
- [ ] Fehlerhafte Buchung korrigieren
- [ ] Korrektur-Grund erforderlich

**DB-Erweiterungen:**
- [ ] `users.badge_id` (NFC Badge-Nummer)
- [ ] `time_entries` Tabelle (user_id, type [kommen/gehen/pause_start/pause_ende], timestamp, manual, correction_reason)
- [ ] `time_settings` (Soll-Stunden pro Tag, Pausenregelung, Kernzeit)
- [ ] `time_balances` View (berechnetes Saldo pro User)

**Verknüpfungen:**
- [ ] Urlaubsplanung: Abwesenheiten berücksichtigen
- [ ] Maschinen-Terminal: Arbeitszeit vs. Produktionszeit
- [ ] Feiertage: Automatisch berücksichtigt

**Testbetrieb:**
- [ ] Aktivierbar pro User (Einstellung in User-Verwaltung)
- [ ] Erstmal nur ausgewählte User (Admin, Chef)
- [ ] Langzeit-Testdaten sammeln (3-6 Monate)
- [ ] Auswertungen für Validierung

**Deliverable:** Funktionsfähiges Stempel-Terminal für Pilotphase

---

## 📋 Phase 12+: Optionale Features

### Shopfloor-UI Erweiterungen
- [ ] Weitere Terminal-Typen (Lager, Versand, QS)
- [ ] Offline-Modus (Service Worker)
- [ ] Externe Barcode-Scanner Integration
- [ ] Schichtübergabe-Funktion

### Reports & Analytics
- [ ] Dashboard für Meister
- [ ] Statistiken (Teile, Programme, Werkzeuge, Messmittel)
- [ ] Kalibrierungs-Report (ISO/Luftfahrt)
- [ ] Werkzeug-Bestandsreport
- [ ] Audit-Trail Export (PDF/Excel)

### NC-Programm Parser
- [ ] Heidenhain DIN/ISO Format Parser
- [ ] Siemens Format Parser
- [ ] Werkzeug-Extraktion (T-Nummern, Beschreibung)
- [ ] Nullpunkt-Extraktion (G54, Preset)
- [ ] Tool List Auto-Fill
- [ ] Setup Sheet Auto-Fill

### QR-Codes & CAM-Integration
- [ ] QR-Code Generierung pro Operation
- [ ] File Watcher (chokidar)
- [ ] CAM-Ordner überwachen
- [ ] Auto-Import Dialog

### Deployment & Optimierung
- [ ] Docker-Setup optimieren
- [ ] Raspberry Pi Deployment
- [ ] Backup-Strategie
- [ ] Performance-Optimierung
- [ ] Dokumentation vervollständigen
- [ ] Schulungs-Material
- [ ] ISO-Checkliste finalisieren

### Erweiterte Features
- [ ] Machine Monitoring (MTConnect/OPC UA)
- [ ] DNC-Integration
- [ ] 3D G-Code Viewer
- [ ] Mobile App (React Native)
- [ ] ERP-Integration

---

## 🔧 Technical Debt / Refactoring-Kandidaten

### 🔴 Lager-Architektur (Hohe Priorität - vor Woche 31 klären!)

**Falls aktueller Ansatz beibehalten wird (separate Tabellen):**

Für JEDE neue Lagerkategorie nötig:
- [ ] DB: `{category}_categories` Tabelle
- [ ] DB: `{category}` Stammdaten-Tabelle  
- [ ] DB: `{category}_stock` Tabelle
- [ ] DB: `{category}_transactions` Tabelle
- [ ] DB: `{category}_documents` Tabelle (optional)
- [ ] DB: Views für Alerts
- [ ] DB: `purchase_order_items.{category}_id` Spalte + Check-Constraint anpassen
- [ ] Backend: 4-5 Controller
- [ ] Backend: 4-5 Routes
- [ ] Backend: server.js erweitern
- [ ] Backend: purchaseOrdersController anpassen (createOrder, updateOrder, getOrderById)
- [ ] Frontend: Store
- [ ] Frontend: Pages (Übersicht, Detail)
- [ ] Frontend: Components (Form, Stock, Documents)
- [ ] Frontend: App.jsx Routes
- [ ] Frontend: Sidebar.jsx
- [ ] Frontend: OrderForm.jsx (Typ hinzufügen)
- [ ] Frontend: PurchaseOrderDetailPage.jsx (Sektion hinzufügen)
- [ ] Frontend: AddToOrderModal für neue Kategorie

**Geschätzter Aufwand pro Kategorie:** ~20-30h

**Falls generisches System implementiert wird:**
- [ ] Einmalig: Schema-Migration (~4h)
- [ ] Einmalig: Backend Refactoring (~8h)
- [ ] Einmalig: Frontend Refactoring (~8h)
- [ ] Pro neue Kategorie: Detail-Tabelle + UI-Tab (~2-4h)

**Geschätzter Einmal-Aufwand:** ~20-24h
**Aufwand pro weitere Kategorie:** ~2-4h

---

### Weitere Technical Debt

- [ ] **Operations Zeit-Einheiten vereinheitlichen:** 
  - Aktuell: setup_time_minutes (Minuten) + cycle_time_seconds (Sekunden in DB, aber Minuten im Frontend)
  - Ziel: Beide in Minuten in DB speichern (cycle_time_seconds → cycle_time_minutes)
  - Aufwand: ~2h (Migration + Backend + Frontend + Tests)
  - Priorität: Low (funktioniert aktuell mit Frontend-Konvertierung)

- [ ] **Program Number Format überdenken:**
  - Aktuell: Auto-generiert als "OP10-001", "OP10-002", etc.
  - Überlegungen: Anderes Format? Manuell editierbar? Prefix/Suffix?
  - Aufwand: ~1h (Backend Logik anpassen)
  - Priorität: Low (funktioniert aktuell gut)

- [ ] **Werkzeug-Extraktion aus G-Code:**
  - Parser für Heidenhain DIN/ISO entwickeln
  - Automatische Werkzeugliste aus NC-Programm
  - TODO später: CAM-Postprozessor Dokumentation
  - Aufwand: ~8h (Parser + Tests)
  - Priorität: Medium

---

## 📊 Fortschritt

```
Phase 1-7:                ████████████████████ 100% ✅

Phase 8 (Erweiterungen):  █████████████░░░░░░░ 65%
  └─ Kunden, Wiki, PWA:   ████████████████████ 100% ✅
  └─ Verbrauchsmaterial:  ████████████████░░░░ 80% 🔄
  └─ Rohmaterial:         ░░░░░░░░░░░░░░░░░░░░ 0%
  └─ Normteile:           ░░░░░░░░░░░░░░░░░░░░ 0%

Phase 9 (Erweiterungen):  ██░░░░░░░░░░░░░░░░░░ 12%
  └─ Urlaubsplanung:      █████████████████░░░ 85% 🔄
  └─ Beladeroboter:       ░░░░░░░░░░░░░░░░░░░░ 0%
  └─ Revisionen:          ░░░░░░░░░░░░░░░░░░░░ 0%
  └─ Admin-Konfig:        ░░░░░░░░░░░░░░░░░░░░ 0%
  └─ Benachrichtigungen:  ░░░░░░░░░░░░░░░░░░░░ 0%

Phase 10 (Aufträge):      ░░░░░░░░░░░░░░░░░░░░ 0%
Phase 11 (Shopfloor):     ░░░░░░░░░░░░░░░░░░░░ 0%
```

---

## 🔧 Nächste Session

**Phase 8 - Woche 29-30: Verbrauchsmaterial abschließen**

1. Lokal testen (Migration, API, Frontend)
2. Wartungssystem-Integration (Verbrauch bei Wartung buchen)
3. Dashboard-Alarme einbinden

**⚠️ WICHTIG: Architektur-Entscheidung vor Woche 31**

Bevor Rohmaterial/Normteile gestartet werden:
1. Aktuellen Ansatz vs. generisches Inventory-System abwägen
2. Option C erwägen: Paralleler Test-Branch für generisches System
3. Entscheidung dokumentieren

**Bei Entscheidung für generisches System:**
- Separaten Branch/Test-Projekt erstellen
- Generisches Schema entwerfen und testen
- Migrationsstrategie für bestehende Daten planen
- Bei Erfolg: In Hauptprojekt integrieren

**Bei Entscheidung für aktuellen Ansatz:**
- Weiter mit Woche 31-32 (Rohmaterial)
- Akzeptieren: ~25h Aufwand pro Kategorie
- Shared Components wo möglich extrahieren

---

**Letzte Aktualisierung:** 2026-01-20
