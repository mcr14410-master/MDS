# Settings Wishlist - Zukünftige Konfigurationsoptionen

**Status:** 📋 Geplant für Phase 5 oder nach Monat 5  
**Ziel:** Firmen-spezifische Einstellungen über UI konfigurierbar machen  
**Priorität:** Medium (funktioniert aktuell mit Hard-coded Defaults)

---

## 🎯 Wann brauchen wir Settings?

**Später hinzufügen wenn:**
- Mehrere Firmen das System nutzen (Multi-Tenancy)
- Verschiedene Abteilungen unterschiedliche Regeln brauchen
- Admins Prozesse ohne Code-Änderung anpassen wollen
- ISO-Zertifizierung strengere Regeln erfordert

**Aktuell:** Hard-coded Defaults reichen vollkommen aus! ✅

---

## 📋 Settings-Kategorien

### **1. Programme & Versionierung**

#### **Kommentar-Pflicht:**
```javascript
{
  category: 'programs',
  key: 'commentRequired',
  options: ['never', 'always', 'minorMajorOnly'],
  default: 'never',
  description: 'Wann ist ein Kommentar beim Upload Pflicht?'
}
```

**UI (später):**
```
┌─────────────────────────────────────┐
│ Programme - Einstellungen           │
├─────────────────────────────────────┤
│ Kommentar beim Upload:              │
│ ○ Nie erforderlich                  │
│ ○ Immer erforderlich                │
│ ● Nur bei Minor/Major ← AKTUELL     │
└─────────────────────────────────────┘
```

#### **Default Workflow-Status:**
```javascript
{
  category: 'programs',
  key: 'defaultWorkflowState',
  options: ['draft', 'released', 'userChoice'],
  default: 'draft',
  description: 'Status neuer Programme nach Upload'
}
```

#### **Auto-Versionierung:**
```javascript
{
  category: 'programs',
  key: 'autoVersionIncrement',
  options: ['patch', 'minor', 'userChoice'],
  default: 'patch',
  description: 'Wie werden Versionen automatisch erhöht?'
}
```

#### **Rollback-Verhalten:**
```javascript
{
  category: 'programs',
  key: 'autoBackupOnRollback',
  options: [true, false],
  default: true,
  description: 'Automatische Backup-Revision bei Rollback?'
}
```

#### **File-Upload Limits:**
```javascript
{
  category: 'programs',
  key: 'maxFileSize',
  options: [10, 50, 100, 200], // MB
  default: 100,
  description: 'Maximale Dateigröße für Programme'
}

{
  category: 'programs',
  key: 'allowedFileTypes',
  options: ['presetCNC', 'presetCAM', 'custom'],
  default: 'presetCNC',
  description: 'Erlaubte Dateitypen',
  presetCNC: ['.nc', '.mpf', '.h', '.i', '.txt', ...],
  presetCAM: ['.nc', '.mpf', '.h', '.dxf', '.step', ...]
}
```

---

### **2. Workflow & Freigabe**

#### **Workflow-States Konfiguration:**
```javascript
{
  category: 'workflow',
  key: 'workflowStates',
  options: 'customizable',
  default: [
    { name: 'draft', description: 'Entwurf', color: '#06b6d4', sequence: 1 },
    { name: 'review', description: 'In Prüfung', color: '#f59e0b', sequence: 2 },
    { name: 'approved', description: 'Geprüft', color: '#10b981', sequence: 3 },
    { name: 'released', description: 'Freigegeben', color: '#10b981', sequence: 4, is_final: true },
    { name: 'rejected', description: 'Abgelehnt', color: '#ef4444', sequence: 5, is_final: true },
    { name: 'archived', description: 'Archiviert', color: '#6b7280', sequence: 6, is_final: true }
  ],
  description: 'Workflow-Status definieren'
}
```

**UI (später):**
```
┌─────────────────────────────────────┐
│ Workflow-Status verwalten           │
├─────────────────────────────────────┤
│ ✎ draft      - Entwurf       [cyan] │
│ ✎ review     - In Prüfung  [orange] │
│ ✎ approved   - Geprüft      [green] │
│ ✎ released   - Freigegeben  [green] │
│ ✎ rejected   - Abgelehnt      [red] │
│ ✎ archived   - Archiviert    [gray] │
│                                      │
│ [+ Neuer Status]                     │
└─────────────────────────────────────┘
```

#### **Workflow-Transitions Konfiguration:**
```javascript
{
  category: 'workflow',
  key: 'workflowTransitions',
  options: 'customizable',
  default: [
    { from: 'draft', to: 'review', requiresReason: false },
    { from: 'draft', to: 'archived', requiresReason: true },
    { from: 'review', to: 'approved', requiresReason: false },
    { from: 'review', to: 'rejected', requiresReason: true },
    { from: 'review', to: 'draft', requiresReason: false },
    { from: 'approved', to: 'released', requiresReason: false },
    { from: 'approved', to: 'draft', requiresReason: false },
    { from: 'rejected', to: 'draft', requiresReason: false },
    { from: 'rejected', to: 'archived', requiresReason: true },
    { from: 'released', to: 'archived', requiresReason: true }
  ],
  description: 'Erlaubte Status-Übergänge definieren'
}
```

**UI (später):**
```
┌─────────────────────────────────────┐
│ Workflow-Übergänge verwalten        │
├─────────────────────────────────────┤
│ draft → review        ☐ Grund nötig │
│ draft → archived      ☑ Grund nötig │
│ review → approved     ☐ Grund nötig │
│ review → rejected     ☑ Grund nötig │
│ review → draft        ☐ Grund nötig │
│ approved → released   ☐ Grund nötig │
│ ...                                  │
│                                      │
│ [+ Neue Transition]                  │
└─────────────────────────────────────┘
```

#### **Standard-Nachrichten für Übergänge:**
```javascript
{
  category: 'workflow',
  key: 'defaultTransitionReasons',
  options: 'customizable',
  default: {
    'draft_review': 'Zur Prüfung freigegeben',
    'review_approved': 'Prüfung erfolgreich abgeschlossen',
    'review_draft': 'Zurück in Bearbeitung',
    'approved_released': 'Freigegeben für Produktion',
    'approved_draft': 'Zurück zur Überarbeitung',
    'rejected_draft': 'Zur erneuten Bearbeitung'
  },
  description: 'Standard-Begründungen für automatische Übergänge'
}
```

#### **Freigabe-Prozess:**
```javascript
{
  category: 'workflow',
  key: 'approvalRequired',
  options: ['never', 'always', 'minorMajorOnly'],
  default: 'always',
  description: 'Wann ist eine Freigabe erforderlich?'
}

{
  category: 'workflow',
  key: 'approvalLevels',
  options: [1, 2, 3],
  default: 1,
  description: 'Anzahl Freigabe-Stufen (1 = Meister, 2 = Meister + Qualität, etc.)'
}
```

#### **Automatische Archivierung:**
```javascript
{
  category: 'workflow',
  key: 'autoArchiveAfterDays',
  options: [30, 90, 180, 365, 'never'],
  default: 'never',
  description: 'Programme auto-archivieren nach X Tagen Inaktivität'
}
```

---

### **3. Werkzeugverwaltung** (Woche 11-12)

#### **Nachbestell-Automatik:**
```javascript
{
  category: 'tools',
  key: 'autoReorderEnabled',
  options: [true, false],
  default: false,
  description: 'Automatische Nachbestellung bei Mindestbestand?'
}

{
  category: 'tools',
  key: 'reorderThreshold',
  options: ['minStock', 'minStock + buffer'],
  default: 'minStock',
  description: 'Wann nachbestellen?'
}
```

#### **Standzeit-Warnung:**
```javascript
{
  category: 'tools',
  key: 'wearWarningThreshold',
  options: [70, 80, 90], // % der Standzeit
  default: 80,
  description: 'Warnung bei X% Verschleiß'
}
```

#### **Werkzeugtypen Verwaltung:**
```javascript
{
  category: 'tools',
  key: 'toolTypes',
  options: 'customizable',
  default: [
    { name: 'Bohrer', icon: '🔩', color: 'blue' },
    { name: 'Fräser', icon: '⚙️', color: 'green' },
    { name: 'Gewinde', icon: '🔧', color: 'purple' },
    { name: 'Reibahle', icon: '📐', color: 'orange' },
    { name: 'Drehmeißel', icon: '🔪', color: 'red' },
    { name: 'Sonstige', icon: '🔨', color: 'gray' }
  ],
  description: 'Werkzeugtypen definieren (Name, Icon, Farbe)'
}
```

**UI (später):**
```
┌─────────────────────────────────────┐
│ Werkzeugtypen verwalten             │
├─────────────────────────────────────┤
│ 🔩 Bohrer        [Blau]      [✏️] │
│ ⚙️ Fräser        [Grün]      [✏️] │
│ 🔧 Gewinde       [Lila]      [✏️] │
│ 📐 Reibahle      [Orange]    [✏️] │
│ 🔪 Drehmeißel    [Rot]       [✏️] │
│ 🔨 Sonstige      [Grau]      [✏️] │
│                                      │
│ [+ Neuer Werkzeugtyp]               │
└─────────────────────────────────────┘

Werkzeugtyp bearbeiten:
┌─────────────────────────────────────┐
│ Name:  [Senker____________]         │
│ Icon:  [💎] (Emoji-Picker)          │
│ Farbe: [🎨] Teal                    │
│                                      │
│ [Speichern] [Abbrechen]             │
└─────────────────────────────────────┘
```

**Aktueller Stand (Woche 11):**
- ✅ 6 Standard-Werkzeugtypen in ToolListForm hard-coded
- ✅ Tool Type Icons in ToolListReadOnly und ToolListTable
- ✅ Farbige Badges im UI (blue, green, purple, orange, red, gray)

**Später konfigurierbar:**
- 📋 Werkzeugtypen hinzufügen/bearbeiten/löschen
- 📋 Custom Icons per Emoji
- 📋 Custom Farben per Color Picker
- 📋 Reihenfolge in Dropdown anpassen
- 📋 Inaktive Typen ausblenden (statt löschen)

**Verwendung:**
```javascript
// Aktuell (hard-coded):
const TOOL_TYPES = ['Bohrer', 'Fräser', 'Gewinde', 'Reibahle', 'Drehmeißel', 'Sonstige'];

// Später (aus DB):
const toolTypes = await getSettings('tools', 'toolTypes');
// => [{ name: 'Bohrer', icon: '🔩', color: 'blue', active: true }, ...]
```

---

### **4. Messmittelverwaltung** (Woche 14)

#### **Kalibrierungs-Alarme:**
```javascript
{
  category: 'measurement',
  key: 'calibrationWarningDays',
  options: [7, 14, 30],
  default: 14,
  description: 'Warnung X Tage vor Kalibrierungs-Ablauf'
}

{
  category: 'measurement',
  key: 'strictCalibrationCheck',
  options: [true, false],
  default: true,
  description: 'Entnahme verweigern bei überfälliger Kalibrierung? (ISO-kritisch!)'
}
```

#### **Entnahme-Workflow:**
```javascript
{
  category: 'measurement',
  key: 'requireCheckoutComment',
  options: [true, false],
  default: false,
  description: 'Kommentar bei Messmittel-Entnahme Pflicht?'
}
```

---

### **5. QR-Codes** (Woche 8)

#### **QR-Code Format:**
```javascript
{
  category: 'qrcode',
  key: 'urlFormat',
  options: ['full', 'short'],
  default: 'short',
  description: 'Volle URL oder Short-Link in QR-Code?',
  full: 'https://mds.firma.de/operation/12345',
  short: 'mds.local/op/12345'
}

{
  category: 'qrcode',
  key: 'includePartInfo',
  options: [true, false],
  default: true,
  description: 'Teilenummer im QR-Code mit encodieren?'
}
```

---

### **6. Wartungssystem** (Woche 17-18)

#### **Wartungs-Erinnerungen:**
```javascript
{
  category: 'maintenance',
  key: 'reminderDaysBefore',
  options: [1, 3, 7],
  default: 3,
  description: 'Wartungs-Erinnerung X Tage vorher'
}

{
  category: 'maintenance',
  key: 'autoCreateTasks',
  options: [true, false],
  default: true,
  description: 'Automatisch Wartungs-Tasks erstellen?'
}
```

---

### **7. Berechtigungen & Security**

#### **Session-Timeout:**
```javascript
{
  category: 'security',
  key: 'sessionTimeout',
  options: [30, 60, 120, 480], // Minuten
  default: 120,
  description: 'Auto-Logout nach X Minuten Inaktivität'
}
```

#### **Passwort-Regeln:**
```javascript
{
  category: 'security',
  key: 'passwordMinLength',
  options: [6, 8, 10, 12],
  default: 8,
  description: 'Minimale Passwort-Länge'
}

{
  category: 'security',
  key: 'passwordRequireSpecialChars',
  options: [true, false],
  default: false,
  description: 'Sonderzeichen im Passwort Pflicht?'
}
```

---

### **8. UI/UX Einstellungen**

#### **Sprache:**
```javascript
{
  category: 'ui',
  key: 'language',
  options: ['de', 'en'],
  default: 'de',
  description: 'Sprache der Oberfläche'
}
```

#### **Theme:**
```javascript
{
  category: 'ui',
  key: 'theme',
  options: ['light', 'dark', 'auto'],
  default: 'light',
  description: 'Farbschema der Oberfläche'
}
```

#### **Datum/Zeit Format:**
```javascript
{
  category: 'ui',
  key: 'dateFormat',
  options: ['DD.MM.YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
  default: 'DD.MM.YYYY',
  description: 'Datumsformat'
}
```

---

### **9. Maschinensteuerung & Nullpunkte** (Woche 10)

#### **Steuerungsspezifische Nullpunkt-Konfiguration:**
```javascript
{
  category: 'machine_controls',
  key: 'zeroPointFormat',
  options: 'per_control_type',
  default: {
    heidenhain: {
      type: 'preset',
      range: { min: 1, max: 99 },
      label: 'Preset-Nummer',
      example: '1-99'
    },
    siemens: {
      type: 'wcs',
      options: ['G54', 'G55', 'G56', 'G57', 'G58', 'G59'],
      label: 'WCS',
      example: 'G54-G59'
    },
    fanuc: {
      type: 'wcs',
      options: ['G54', 'G55', 'G56', 'G57', 'G58', 'G59'],
      label: 'WCS',
      example: 'G54-G59'
    },
    haas: {
      type: 'wcs',
      options: ['G54', 'G55', 'G56', 'G57', 'G58', 'G59'],
      label: 'WCS',
      example: 'G54-G59'
    },
    mazatrol: {
      type: 'custom',
      label: 'Work Offset',
      example: 'Mazatrol-spezifisch'
    }
  },
  description: 'Nullpunkt-Formate pro Steuerungstyp definieren'
}
```

**UI (später):**
```
┌─────────────────────────────────────┐
│ Maschinensteuerung - Einstellungen  │
├─────────────────────────────────────┤
│ Heidenhain:                         │
│   Format: ● Preset-Nummer           │
│   Bereich: [1] bis [99]             │
│                                      │
│ Siemens:                            │
│   Format: ● WCS (G54-G59)           │
│   Verfügbare WCS:                   │
│   ☑ G54  ☑ G55  ☑ G56              │
│   ☑ G57  ☑ G58  ☑ G59              │
│                                      │
│ Fanuc:                              │
│   Format: ● WCS (G54-G59)           │
│   ...                                │
│                                      │
│ [Speichern] [Zurücksetzen]          │
└─────────────────────────────────────┘
```

#### **Nullpunkt-Validierung:**
```javascript
{
  category: 'machine_controls',
  key: 'enforceZeroPointValidation',
  options: [true, false],
  default: true,
  description: 'Nullpunkt-Eingabe validieren (z.B. Preset 1-99 für Heidenhain)?'
}

{
  category: 'machine_controls',
  key: 'requireZeroPointCoordinates',
  options: ['never', 'optional', 'always'],
  default: 'optional',
  description: 'Sind X/Y/Z Koordinaten Pflicht?'
}
```

#### **Standard-Nullpunkte pro Maschine:**
```javascript
{
  category: 'machine_controls',
  key: 'machineDefaultZeroPoints',
  options: 'per_machine',
  default: {
    machine_id: 1,
    default_preset: 1,        // für Heidenhain
    default_wcs: 'G54',       // für Siemens/Fanuc
    default_coordinates: {
      x: 0,
      y: 0,
      z: 0
    }
  },
  description: 'Standard-Nullpunkte pro Maschine vorkonfigurieren'
}
```

**Aktueller Stand (Woche 10):**
- ✅ Steuerungsspezifische Nullpunkte in Setup Sheets implementiert
- ✅ Heidenhain: Preset 1-99
- ✅ Siemens/Fanuc/Haas: WCS G54-G59
- ✅ Mazatrol: Custom Format
- ✅ Automatische Übernahme des control_type von Maschine
- ✅ WCS Koordinaten (X, Y, Z)
- ✅ Referenzpunkt-Beschreibung

**Später konfigurierbar:**
- 📋 Preset-Bereich anpassen (z.B. 1-299)
- 📋 Zusätzliche WCS definieren (G59.1, G59.2, ...)
- 📋 Custom Formate für weitere Steuerungen
- 📋 Validierungsregeln pro Steuerung
- 📋 Standard-Nullpunkte pro Maschine

---

### **10. Audit & Compliance** (ISO/Luftfahrt)

#### **Audit-Log Level:**
```javascript
{
  category: 'audit',
  key: 'logLevel',
  options: ['minimal', 'standard', 'detailed'],
  default: 'standard',
  description: 'Wie detailliert soll der Audit-Log sein?',
  minimal: 'Nur Änderungen',
  standard: 'Änderungen + Zugriffe',
  detailed: 'Alles (auch Lesezugriffe)'
}
```

#### **Retention Policy:**
```javascript
{
  category: 'audit',
  key: 'auditLogRetentionDays',
  options: [365, 730, 1825, 'forever'], // 1, 2, 5 Jahre
  default: 1825,
  description: 'Audit-Logs aufbewahren (ISO-Anforderung: min. 5 Jahre)'
}
```

---

## 🗂️ Datenbank-Schema (später)

### **company_settings Tabelle:**
```sql
CREATE TABLE company_settings (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL,        -- 'programs', 'tools', 'quality', etc.
  key VARCHAR(100) NOT NULL,            -- 'commentRequired', 'maxFileSize', etc.
  value JSONB NOT NULL,                 -- true/false/"draft"/100/[...]
  value_type VARCHAR(20) NOT NULL,      -- 'boolean', 'string', 'number', 'array'
  description TEXT,
  updated_by INT REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(category, key)
);

-- Default Settings eintragen
INSERT INTO company_settings (category, key, value, value_type, description) VALUES
('programs', 'commentRequired', '"never"', 'string', 'Wann ist Kommentar Pflicht?'),
('programs', 'defaultWorkflowState', '"draft"', 'string', 'Default Status nach Upload'),
('programs', 'autoBackupOnRollback', 'true', 'boolean', 'Auto-Backup bei Rollback?'),
('programs', 'maxFileSize', '104857600', 'number', 'Max. Dateigröße (Bytes)');
```

### **user_settings Tabelle (User-spezifisch):**
```sql
CREATE TABLE user_settings (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  category VARCHAR(50) NOT NULL,
  key VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, category, key)
);

-- Beispiel: Theme pro User
INSERT INTO user_settings (user_id, category, key, value) VALUES
(1, 'ui', 'theme', '"dark"'),
(2, 'ui', 'theme', '"light"');
```

---

## 🎨 Settings-UI (später)

### **Admin-Bereich:**
```
┌────────────────────────────────────────────┐
│ ⚙️ System-Einstellungen                    │
├────────────────────────────────────────────┤
│ [Programme] [Werkzeuge] [Qualität] [UI]   │
├────────────────────────────────────────────┤
│                                            │
│ 📄 Programme & Versionierung              │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                            │
│ Kommentar beim Upload:                    │
│ ● Optional  ○ Pflicht  ○ Nur Minor/Major  │
│                                            │
│ Neue Programme starten als:               │
│ ● Entwurf   ○ Freigegeben                 │
│                                            │
│ Auto-Versionierung:                       │
│ ● Patch++   ○ Minor++  ○ Frage User       │
│                                            │
│ Maximale Dateigröße:                      │
│ [100] MB                                  │
│                                            │
│ Erlaubte Dateitypen:                      │
│ ☑ .nc   ☑ .mpf  ☑ .h   ☑ .txt           │
│ ☑ .tap  ☑ .cnc  ☑ .din                   │
│                                            │
│ [Speichern] [Zurücksetzen]                │
└────────────────────────────────────────────┘
```

---

## 📦 Implementation Plan (später)

### **Phase 1: Backend (2-3h)**
1. Migrations für `company_settings` + `user_settings`
2. Settings Service (`getSettings()`, `updateSetting()`)
3. Helper: `getSetting(category, key, default)`
4. Existing Code anpassen (Defaults durch DB-Settings ersetzen)

### **Phase 2: Frontend (3-4h)**
1. Settings Page Component (`/admin/settings`)
2. Settings Form Components (Toggle, Select, Input)
3. API Integration (`settingsStore.js`)
4. Permission Check (nur Admins)

### **Phase 3: Testing (1-2h)**
1. Unit Tests für Settings Service
2. Integration Tests
3. UI Tests

**Gesamt:** ~6-9 Stunden

---

## 🔧 Aktueller Stand (Woche 10)

### **Hard-coded Defaults:**
```javascript
// backend/src/config/defaults.js (erstellen später)
module.exports = {
  PROGRAMS: {
    COMMENT_REQUIRED: false,
    DEFAULT_WORKFLOW_STATE: 'draft',
    AUTO_BACKUP_ON_ROLLBACK: true,
    AUTO_VERSION_INCREMENT: 'patch',
    MAX_FILE_SIZE: 104857600, // 100MB
    ALLOWED_FILE_TYPES: [
      '.nc', '.mpf', '.h', '.i', '.txt',
      '.tap', '.cnc', '.din', '.hnc', '.iso',
      '.eia', '.maz', '.pgm', '.sub', '.spf'
    ]
  },
  WORKFLOW: {
    APPROVAL_REQUIRED: 'always',
    APPROVAL_LEVELS: 1,
    AUTO_ARCHIVE_AFTER_DAYS: null
  },
  MACHINE_CONTROLS: {
    ZERO_POINT_VALIDATION: true,
    REQUIRE_COORDINATES: 'optional',
    CONTROL_TYPES: {
      heidenhain: { type: 'preset', min: 1, max: 99 },
      siemens: { type: 'wcs', options: ['G54', 'G55', 'G56', 'G57', 'G58', 'G59'] },
      fanuc: { type: 'wcs', options: ['G54', 'G55', 'G56', 'G57', 'G58', 'G59'] },
      haas: { type: 'wcs', options: ['G54', 'G55', 'G56', 'G57', 'G58', 'G59'] },
      mazatrol: { type: 'custom' }
    }
  }
  // ... später erweitern
};
```

**Verwendung aktuell:**
```javascript
const { PROGRAMS } = require('../config/defaults');

if (PROGRAMS.COMMENT_REQUIRED && !comment) {
  return res.status(400).json({ error: 'Kommentar erforderlich' });
}
```

**Später mit DB-Settings:**
```javascript
const settings = await getSettings('programs');

if (settings.commentRequired && !comment) {
  return res.status(400).json({ error: 'Kommentar erforderlich' });
}
```

---

## ✅ Zusammenfassung

**Jetzt (Woche 10):**
- ✅ Hard-coded Defaults verwenden
- ✅ Sinnvolle Werte einbauen
- ✅ Kommentare im Code: `// TODO: Settings - later configurable`
- ✅ Steuerungsspezifische Nullpunkte in Setup Sheets implementiert

**Später (Phase 5):**
- 📋 DB-Tabellen erstellen
- 📋 Settings Service bauen
- 📋 Admin-UI bauen
- 📋 Existing Code anpassen
- 📋 Steuerungsspezifische Nullpunkte konfigurierbar machen

**Priorität:** Low (funktioniert super ohne Settings-UI!)

---

## 📝 Nächste Schritte

**Diese Datei pflegen wenn:**
- Neue Features gebaut werden, die konfigurierbar sein sollten
- User sagt "Das sollte man später einstellen können"
- ISO/Zertifizierung neue Anforderungen bringt

**Format:**
```markdown
### Neue Setting-Idee
- **Wann hinzugefügt:** Woche X
- **Warum:** Grund
- **Config:**
  ```javascript
  { category: '...', key: '...', ... }
  ```
```

---

**Status:** 📋 Geplant für später  
**Letzte Aktualisierung:** 2025-11-09 (Woche 11 - Werkzeugtypen hinzugefügt)
