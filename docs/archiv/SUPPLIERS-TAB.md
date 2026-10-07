# Tool Suppliers Tab - Implementation

## Neue Components

### 1. components/tools/ToolSuppliersTab.jsx
**Haupt-Component:**
- Zeigt alle verknüpften Lieferanten für ein Tool
- CRUD-Funktionen (Create, Read, Update, Delete)
- Bevorzugten Lieferanten markieren (Stern-Icon)
- Empty State wenn keine Lieferanten
- Permission Checks
- Loading States

**Features:**
- Supplier Name mit Link zur Detail-Page
- Artikelnummer, Preis, Lieferzeit, Mindestmenge
- Notizen, Website-Link
- Status-Badges (Bevorzugt, Inaktiv)
- Action-Buttons: Star, Edit, Delete

### 2. components/tools/AddSupplierToToolModal.jsx
**Modal-Component:**
- Hinzufügen neuer Lieferanten-Verknüpfungen
- Bearbeiten bestehender Verknüpfungen
- Vollständiges Formular

**Felder:**
- Lieferant (Dropdown, nur aktive)
- Artikelnummer beim Lieferanten
- Preis & Währung (EUR, USD, GBP, CHF)
- Lieferzeit in Tagen
- Mindestbestellmenge
- Notizen (Textarea)
- Checkboxen: Bevorzugt, Aktiv

**Validierung:**
- Lieferant ist Pflichtfeld
- Numeric Fields mit Min/Max
- Currency Selection

## Geänderte Datei

### pages/ToolDetailPage.jsx

**Änderungen:**
1. Import hinzugefügt:
   ```javascript
   import ToolSuppliersTab from '../components/tools/ToolSuppliersTab';
   ```

2. Suppliers Tab Content ersetzt (Zeile 619-628):
   - Platzhalter entfernt
   - Echtes Component eingebunden
   - Smart Handling für Storage Items:
     * Kein Storage Item → Hinweis
     * 1 Storage Item → Direkt anzeigen
     * Mehrere Storage Items → Info + erstes Item

## Installation

### 1. Neue Components kopieren:
```bash
cp ToolSuppliersTab.jsx frontend/src/components/tools/
cp AddSupplierToToolModal.jsx frontend/src/components/tools/
```

### 2. ToolDetailPage.jsx aktualisieren:

**Option A:** Datei ersetzen (empfohlen)
```bash
cp ToolDetailPage.jsx frontend/src/pages/
```

**Option B:** Manuell ändern
```javascript
// Nach Zeile 21 (nach anderen imports):
import ToolSuppliersTab from '../components/tools/ToolSuppliersTab';

// Zeile 619-628 ersetzen (activeTab === 'suppliers' Block):
// Siehe Datei für kompletten Code
```

### 3. Frontend neu starten:
```bash
cd frontend
npm run dev
```

## Testing

1. **Tool Detail öffnen:**
   - Gehe zu `/tools` und wähle ein Werkzeug
   
2. **Suppliers Tab:**
   - Klicke auf "Lieferanten" Tab
   
3. **Ohne Storage Item:**
   - Sollte Hinweis anzeigen: "Kein Lagerort zugewiesen"
   - Button "Zu Lagerorte wechseln"
   
4. **Mit Storage Item:**
   - Sollte "Lieferant hinzufügen" Button zeigen
   
5. **Lieferant hinzufügen:**
   - Klicke "Lieferant hinzufügen"
   - Modal öffnet sich
   - Lieferant auswählen (nur aktive in Dropdown)
   - Preis, Artikelnummer, etc. eingeben
   - "Hinzufügen" klicken
   - Toast-Notification erscheint
   - Lieferant erscheint in Liste
   
6. **Bearbeiten:**
   - Klicke Edit-Icon (Stift)
   - Ändere Daten
   - "Aktualisieren" klicken
   
7. **Als bevorzugt markieren:**
   - Klicke Stern-Icon
   - Gelber Badge erscheint
   
8. **Löschen:**
   - Klicke Trash-Icon
   - Bestätigung
   - Lieferant verschwindet

## Features Übersicht

### ToolSuppliersTab
- ✅ Liste aller verknüpften Lieferanten
- ✅ Empty State
- ✅ Add Button (Permission: storage.create)
- ✅ Edit Button (Permission: storage.edit)
- ✅ Delete Button (Permission: storage.delete)
- ✅ Set Preferred (Permission: storage.edit)
- ✅ Loading State
- ✅ Toast Notifications
- ✅ Links zu Supplier Detail Page
- ✅ Website Links (external)
- ✅ Currency Formatting
- ✅ Dark Mode Support

### AddSupplierToToolModal
- ✅ Create & Edit Mode
- ✅ Supplier Dropdown (nur aktive)
- ✅ Supplier nicht änderbar beim Edit
- ✅ Alle Formularfelder
- ✅ Validierung
- ✅ Loading State
- ✅ Cancel & Submit Buttons
- ✅ Dark Mode Support

### Smart Storage Item Handling
- ✅ Kein Item → Warnung + Link zu Storage Tab
- ✅ 1 Item → Direkt Lieferanten anzeigen
- ✅ Mehrere Items → Info-Box + erstes Item

## API Endpoints (bereits implementiert)

Die folgenden Endpoints werden vom Backend bereitgestellt:

- `GET /api/storage/items/:id/suppliers` - Lieferanten für Item
- `POST /api/supplier-items` - Verknüpfung erstellen
- `PUT /api/supplier-items/:id` - Verknüpfung aktualisieren
- `DELETE /api/supplier-items/:id` - Verknüpfung löschen
- `PUT /api/supplier-items/:id/preferred` - Als bevorzugt setzen

## Permissions

- `storage.view` - Tab sehen
- `storage.create` - Lieferant hinzufügen
- `storage.edit` - Bearbeiten, als bevorzugt markieren
- `storage.delete` - Lieferant entfernen

## Troubleshooting

### Problem: "Lieferanten-Dropdown ist leer"
**Lösung:**
- Backend muss laufen
- Mindestens 1 aktiver Lieferant muss existieren
- Gehe zu `/suppliers` und erstelle Lieferanten

### Problem: "Modal öffnet nicht"
**Lösung:**
- Browser Console öffnen (F12)
- Prüfe auf JavaScript Errors
- Stelle sicher Lucide Icons installiert sind

### Problem: "Kein Storage Item"
**Lösung:**
- Gehe zum "Lagerorte" Tab
- Erstelle einen Storage Item für das Tool
- Dann zum "Lieferanten" Tab wechseln

## Nächste Schritte

Das Suppliers Feature ist jetzt vollständig:
- ✅ Supplier Management Page (Phase 3)
- ✅ Supplier Detail Page (Option B)
- ✅ Tool Suppliers Tab (Option A)

Optional noch möglich:
- Supplier Items List Component (für erweiterte Features)
- Bulk-Import von Lieferanten
- Preis-Historie
- Automatische Bestellvorschläge

