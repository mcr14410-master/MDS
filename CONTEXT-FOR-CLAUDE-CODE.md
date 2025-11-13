# MDS Tool Management - Context für Claude Code

## Projekt-Übersicht

Manufacturing Data Management System (MDS) - Tool Management Modul
- **Tech Stack:** PostgreSQL, Node.js/Express, React 19, TailwindCSS
- **Deployment:** Raspberry Pi (Docker)
- **Entwickler:** Fertigungsleiter mit 30-35h/Woche (abends/WE)

## Aktueller Stand

- ✅ Phasen 1-3 des Hauptprojekts abgeschlossen
  - Bauteile, Operationen, Programme, Maschinen
  - Workflow-System, Setup Sheets, Tool Lists, Inspection Plans
- 🔨 Jetzt: Tool Management System (Phase 4 des Hauptprojekts)
  - Siehe: TOOL-MANAGEMENT-ROADMAP-v3.md

## Wichtige Projekt-Konventionen

### Code-Style:
- **Backend:** CommonJS (require/module.exports)
- **Frontend:** ES6 Modules (import/export)
- **Naming:** snake_case (DB), camelCase (JS), PascalCase (Components)
- **Kommentare:** Deutsch oder Englisch, wichtige Business-Logik dokumentieren

### Datenbank:
- **Migrations:** node-pg-migrate (sequentiell nummeriert)
- **Format:** `1737000XXXXX_description.js`
- **Timestamps:** IMMER created_at + updated_at
- **Audit:** created_by, updated_by wo sinnvoll
- **Soft Delete:** is_active statt DELETE (wo sinnvoll)

### API:
- **Auth:** JWT via authenticateToken Middleware
- **Permissions:** checkPermission Middleware
- **Error Handling:** try/catch mit aussagekräftigen Meldungen
- **Response Format:** Konsistent { success, data/error, message }
- **Audit Log:** Automatisch via auditLog Middleware

### Frontend:
- **State:** Zustand Stores
- **Styling:** TailwindCSS (Dark Theme Support!)
- **Icons:** Lucide React
- **Forms:** Controlled Components
- **Toasts:** Eigenes Toast-System (useToast)
- **Permissions:** useAuthStore für Permission Checks

### Testing:
- **Backend:** .http Files mit VS Code REST Client
- **Format:** Szenarien gruppiert mit Kommentaren
- **Realistic Data:** Echte Beispiel-Daten verwenden

## Kritische Regeln

### DO:
✅ Immer authenticateToken bei geschützten Routes
✅ Permissions checken (z.B. tools.create, tools.edit)
✅ Audit Logging bei Änderungen
✅ Comprehensive Error Handling
✅ SQL Injection Prevention (parameterized queries)
✅ Index auf Foreign Keys
✅ Dark Theme Support (bg-gray-800, text-white, etc.)
✅ Responsive Design (mobile-first)
✅ Loading States in UI
✅ Empty States in Listen
✅ Validation auf Backend UND Frontend

### DON'T:
❌ KEINE localStorage/sessionStorage in React (nicht supported!)
❌ Keine ungeschützten Routes (außer /health, /login)
❌ Keine direkten SQL Queries ohne Parameter
❌ Keine fehlenden Indexes auf häufig gejointe Felder
❌ Keine harten DELETE bei referenzierten Daten
❌ Keine Magic Numbers (Konstanten verwenden)

## Verfügbare Ressourcen

**Backend:**
- `backend/src/middleware/auth.js` - authenticateToken, checkPermission
- `backend/src/middleware/auditLog.js` - Audit Logging
- `backend/src/db/index.js` - Database Pool

**Frontend:**
- `frontend/src/stores/authStore.js` - User, Permissions
- `frontend/src/hooks/useToast.js` - Toast Notifications
- `frontend/src/components/common/` - Reusable Components

## Nächste Aufgabe

**Phase 1: Lagerorte-System**
- Siehe: TOOL-MANAGEMENT-ROADMAP-v3.md ab Zeile ~450
- Backend + Tests + Frontend
- Zeit: ~10-12h

## Wichtige Hinweise

- **Bestehende Tabellen NICHT ändern** (tools bleibt deprecated, wird zu tool_master)
- **Dark Theme** ist Standard, IMMER beachten
- **Permissions** immer checken und dokumentieren
- **Migration Rollback** immer implementieren (exports.down)
- **Deutsch/English Mix** ist OK in Kommentaren
