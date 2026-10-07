# OrderForm Modal - Dokumentation

## Übersicht

Das OrderForm Modal ermöglicht das Erstellen und Bearbeiten von Purchase Orders direkt im Frontend.

## Dateien

### Neue Dateien
- `frontend/src/components/purchaseOrders/OrderForm.jsx` - Hauptformular Component

### Geänderte Dateien
- `frontend/src/pages/PurchaseOrdersPage.jsx` - Integration Create Modal
- `frontend/src/pages/PurchaseOrderDetailPage.jsx` - Integration Edit Modal
- `frontend/src/App.jsx` - /purchase-orders/new Route entfernt

## Features

### 1. Create Mode
- **Trigger:** "Neue Bestellung" Button in PurchaseOrdersPage
- **Funktion:** Leeres Formular zum Erstellen einer neuen Bestellung

### 2. Edit Mode
- **Trigger:** "Bearbeiten" Button in PurchaseOrderDetailPage
- **Funktion:** Vorausgefülltes Formular mit bestehenden Daten
- **Einschränkung:** Nur für Status "draft" verfügbar

### 3. Formular-Komponenten

#### Basis-Felder
- **Lieferant** (Dropdown, Required)
  - Zeigt nur aktive Lieferanten
  - Mit Lieferanten-Code in Klammern
- **Erwartetes Lieferdatum** (Date Input, Required)
- **Notizen** (Textarea, Optional)

#### Bestellpositionen (Items)
- **Dynamisch hinzufügen/entfernen**
- Pro Position:
  - Storage Item Selector (Dropdown mit Tool-Namen + Location)
  - Menge (Number Input, min 0.01)
  - Stückpreis in € (Number Input, min 0)
  - Zeilensumme (Auto-berechnet)
  - Entfernen Button (Trash Icon)

#### Zusammenfassung
- Anzahl Positionen
- Gesamtbetrag (Live-Berechnung)

### 4. Validierung

**Client-Side:**
- Lieferant muss ausgewählt sein
- Lieferdatum muss angegeben sein
- Mindestens eine Position erforderlich
- Alle Positionen müssen einen Storage Item haben
- Mengen und Preise müssen gültige Zahlen sein

**Server-Side:**
- Backend validiert zusätzlich (siehe Backend Controller)

### 5. Responsive Design
- **Desktop:** Grid-Layout mit 12 Spalten
- **Mobile:** Vertical Layout mit Labels
- **Dark Mode:** Vollständig unterstützt

## Verwendung

### Neue Bestellung erstellen

1. Navigiere zu `/purchase-orders`
2. Klicke auf "Neue Bestellung"
3. Wähle Lieferant
4. Wähle Lieferdatum
5. Klicke "Position hinzufügen"
6. Wähle Storage Item
7. Gib Menge und Preis ein
8. Wiederhole 5-7 für weitere Positionen
9. Klicke "Bestellung erstellen"

### Bestellung bearbeiten

1. Navigiere zu `/purchase-orders/:id`
2. Klicke auf "Bearbeiten" (nur bei Status "draft")
3. Ändere gewünschte Felder
4. Klicke "Änderungen speichern"

## API Integration

### Create Order
```javascript
POST /api/purchase-orders
{
  supplier_id: 1,
  expected_delivery_date: "2025-12-01",
  notes: "Optional notes",
  items: [
    {
      storage_item_id: 5,
      quantity: 10,
      unit_price: 15.50
    }
  ]
}
```

### Update Order
```javascript
PUT /api/purchase-orders/:id
{
  // Same structure as create
}
```

## State Management

### Zustand Stores

**usePurchaseOrdersStore:**
- `createOrder(orderData)` - Erstellt neue Bestellung
- `updateOrder(id, orderData)` - Aktualisiert bestehende Bestellung
- `fetchOrders()` - Reload Liste nach Create/Update

**useSuppliersStore:**
- `fetchSuppliers({ is_active: true })` - Lädt aktive Lieferanten

**useStorageItemsStore:**
- `fetchStorageItems()` - Lädt alle Storage Items

## Komponenten-Props

### OrderForm Component

```javascript
<OrderForm
  order={order}           // Order object for edit mode, null for create
  isOpen={boolean}        // Modal visibility
  onClose={function}      // Called when modal closes
  onSuccess={function}    // Called after successful save
/>
```

## Styling

- **TailwindCSS** für alle Styles
- **Dark Mode** via `dark:` Klassen
- **Responsive** via `md:` Breakpoints
- **Icons** von `lucide-react`

## Testing

### Manuelle Tests

1. **Create Happy Path:**
   - Neues Formular öffnen
   - Alle Felder ausfüllen
   - Speichern
   - Bestellung erscheint in Liste

2. **Create Validation:**
   - Formular ohne Lieferant → Alert
   - Formular ohne Datum → Alert
   - Formular ohne Items → Alert
   - Position ohne Storage Item → Alert

3. **Edit Happy Path:**
   - Bestellung öffnen (draft)
   - Bearbeiten klicken
   - Felder ändern
   - Speichern
   - Änderungen sichtbar

4. **Edit Restrictions:**
   - Bestellung mit Status "sent" → Kein Edit Button
   - Bestellung mit Status "received" → Kein Edit Button

5. **Dynamic Items:**
   - Position hinzufügen → Neue Zeile
   - Position entfernen → Zeile verschwindet
   - Live-Berechnung → Total aktualisiert sich

6. **Responsive:**
   - Desktop → Grid Layout
   - Mobile → Vertical Stack
   - Labels nur auf Mobile sichtbar

## Troubleshooting

### Problem: Storage Items Dropdown leer
**Lösung:** Prüfe ob Storage Items in DB existieren und fetchStorageItems() erfolgreich

### Problem: Supplier Dropdown leer
**Lösung:** Prüfe ob aktive Suppliers in DB existieren

### Problem: "Ungültige Menge" bei Zahlen
**Lösung:** Backend erwartet DECIMAL, Frontend sendet parseFloat()

### Problem: Modal öffnet nicht
**Lösung:** Prüfe State Management (showOrderForm, setShowOrderForm)

### Problem: Nach Save keine Updates
**Lösung:** Prüfe onSuccess Handler ruft fetchOrders() / fetchOrderById() auf

## Best Practices

1. **Immer Validierung vor Submit**
2. **Loading State während API Call**
3. **Fehlerbehandlung mit Alert (später Toast)**
4. **State Reset nach erfolgreicher Speicherung**
5. **Reload Listen nach Änderungen**

## Zukünftige Erweiterungen

### Phase 4.2 (Optional)
- [ ] Drag & Drop Sortierung der Items
- [ ] Copy Items from other Orders
- [ ] Templates für häufige Bestellungen
- [ ] Auto-Fill Preise aus Supplier Items
- [ ] Supplier Artikel-Nummer Autocomplete
- [ ] Excel Import für Bulk-Items
- [ ] PDF Export der Bestellung

### Phase 4.3 (Optional)
- [ ] Toast Notifications statt Alerts
- [ ] Unsaved Changes Warning
- [ ] Auto-Save Draft
- [ ] Keyboard Shortcuts (Ctrl+S Save, Esc Close)
- [ ] Item Search/Filter in Dropdown

## Status

✅ **KOMPLETT & PRODUKTIONSREIF**

- Create Mode funktioniert
- Edit Mode funktioniert  
- Validation funktioniert
- Responsive Design funktioniert
- Dark Mode funktioniert
- Live Total Berechnung funktioniert

---

**Erstellt:** 2025-11-19  
**Version:** 1.0  
**Status:** Production Ready
