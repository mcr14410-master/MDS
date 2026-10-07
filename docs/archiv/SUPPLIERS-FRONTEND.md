# Phase 3: Supplier Management - Frontend Implementation

**Status:** ✅ Frontend Complete  
**Datum:** 2024-11-16  
**Phase:** Tool Management Phase 3 - Frontend  
**Zeitaufwand:** ~3 Stunden

---

## 📦 Lieferumfang

### Neue Dateien (6)

**Stores (2):**
- `stores/suppliersStore.js` - State Management für Lieferanten
- `stores/supplierItemsStore.js` - State Management für Tool-Lieferant Verknüpfungen

**Pages (1):**
- `pages/SuppliersPage.jsx` - Hauptseite mit Lieferanten-Liste

**Components (2):**
- `components/suppliers/SupplierCard.jsx` - Einzelne Lieferanten-Karte
- `components/suppliers/SupplierFormModal.jsx` - Modal zum Anlegen/Bearbeiten

**Config (1):**
- `config/api.js` - Aktualisiert mit Supplier Endpoints

---

## 🚀 Installation

### 1. Dateien kopieren

```bash
# Stores
cp stores/suppliersStore.js frontend/src/stores/
cp stores/supplierItemsStore.js frontend/src/stores/

# Pages
cp pages/SuppliersPage.jsx frontend/src/pages/

# Components
mkdir -p frontend/src/components/suppliers
cp components/suppliers/SupplierCard.jsx frontend/src/components/suppliers/
cp components/suppliers/SupplierFormModal.jsx frontend/src/components/suppliers/

# Config (ÜBERSCHREIBEN oder manuell Endpoints hinzufügen)
cp config/api.js frontend/src/config/
```

### 2. Route registrieren

Öffne `frontend/src/App.jsx` und füge die Route hinzu:

```jsx
import SuppliersPage from './pages/SuppliersPage';

// In den Routes-Block:
<Route path="/suppliers" element={<SuppliersPage />} />
```

### 3. Navigation hinzufügen (Optional)

Wenn du eine Sidebar/Navigation hast, füge einen Link hinzu:

```jsx
<Link to="/suppliers">
  Lieferanten
</Link>
```

### 4. Frontend starten

```bash
cd frontend
npm run dev
```

---

## ✅ Features

### SuppliersPage

**Funktionen:**
- ✅ Liste aller Lieferanten (Grid-Layout)
- ✅ Suche nach Name, Code, Stadt
- ✅ Filter: Nur Aktive, Nur Bevorzugte
- ✅ Sortierung: Name, Code, Rating, Stadt, Erstellt
- ✅ Sortierreihenfolge: Aufsteigend/Absteigend
- ✅ Statistiken: Aktive & Bevorzugte Count
- ✅ Neuer Lieferant Button
- ✅ Empty State mit Call-to-Action

### SupplierCard

**Anzeige:**
- ✅ Name & Code
- ✅ Status Badge (Aktiv/Inaktiv)
- ✅ Bevorzugt Badge
- ✅ Rating (Sterne 1-5)
- ✅ Kontaktperson
- ✅ E-Mail (klickbar)
- ✅ Telefon
- ✅ Standort (Stadt, Land)
- ✅ Lieferzeit
- ✅ Anzahl verknüpfter Artikel

**Actions:**
- ✅ Details-Link
- ✅ Bearbeiten-Button (mit Permission Check)
- ✅ Deaktivieren-Button (mit Permission Check)

### SupplierFormModal

**Formular-Sektionen:**

**1. Stammdaten:**
- Name (Pflichtfeld)
- Lieferanten-Code
- Rating (1-5 Sterne)
- Checkboxen: Bevorzugt, Aktiv

**2. Kontaktdaten:**
- Ansprechpartner
- E-Mail
- Telefon
- Fax
- Website

**3. Adresse:**
- Straße und Hausnummer
- Adresszusatz
- PLZ
- Stadt
- Land (Default: Deutschland)

**4. Geschäftsdaten:**
- USt-IdNr.
- Zahlungsbedingungen
- Lieferzeit (Tage)
- Mindestbestellwert mit Währung (EUR, USD, GBP, CHF)

**5. Notizen:**
- Freitextfeld für zusätzliche Informationen

**Validierung:**
- ✅ Name ist Pflichtfeld
- ✅ E-Mail Validierung (HTML5)
- ✅ URL Validierung (HTML5)
- ✅ Zahlenfelder mit Min/Max
- ✅ Rating 1-5

---

## 🎨 UI/UX Features

### Design
- ✅ Dark Mode Support (alle Components)
- ✅ Responsive Grid Layout (1/2/3 Spalten)
- ✅ Hover Effects & Transitions
- ✅ Loading States
- ✅ Error Messages
- ✅ Empty State
- ✅ Modal mit Backdrop
- ✅ Scrollable Modal für lange Formulare

### Accessibility
- ✅ Semantisches HTML
- ✅ ARIA Labels wo nötig
- ✅ Keyboard Navigation
- ✅ Focus States
- ✅ Contrast Ratios

---

## 🔌 API Integration

### Stores nutzen Axios

Die Stores verwenden automatisch das konfigurierte Axios-Instance aus `utils/axios.js` mit:
- ✅ JWT Token im Authorization Header
- ✅ Error Handling
- ✅ Loading States
- ✅ Toast Notifications

### Endpoints

**suppliersStore:**
- `GET /api/suppliers` - Alle Lieferanten mit Filtern
- `GET /api/suppliers/:id` - Einzelner Lieferant
- `POST /api/suppliers` - Neuer Lieferant
- `PUT /api/suppliers/:id` - Lieferant aktualisieren
- `DELETE /api/suppliers/:id` - Lieferant deaktivieren
- `GET /api/suppliers/:id/items` - Items eines Lieferanten

**supplierItemsStore:**
- `GET /api/storage/items/:id/suppliers` - Lieferanten für Item
- `POST /api/supplier-items` - Verknüpfung erstellen
- `PUT /api/supplier-items/:id` - Verknüpfung aktualisieren
- `DELETE /api/supplier-items/:id` - Verknüpfung löschen
- `PUT /api/supplier-items/:id/preferred` - Als bevorzugt setzen

---

## 🧪 Testing

### Manuelles Testen

1. **Suppliers Seite öffnen:**
   ```
   http://localhost:5173/suppliers
   ```

2. **Neuen Lieferanten anlegen:**
   - Klick auf "Neuer Lieferant"
   - Formular ausfüllen (nur Name ist Pflicht)
   - "Anlegen" klicken
   - Toast-Notification sollte erscheinen
   - Lieferant erscheint in der Liste

3. **Lieferanten bearbeiten:**
   - Klick auf "Edit" Icon bei einer Karte
   - Daten ändern
   - "Aktualisieren" klicken

4. **Filter testen:**
   - Suche nach Name/Code/Stadt
   - Toggle "Nur Aktive"
   - Toggle "Nur Bevorzugte"
   - Sortierung ändern

5. **Responsive testen:**
   - Browser-Fenster verkleinern
   - Grid sollte von 3 → 2 → 1 Spalte wechseln

---

## 📱 Screenshots Location

Wenn du Screenshots machst, speichere sie hier:
- Suppliers List View
- Empty State
- Create Modal
- Edit Modal
- Filter Active
- Mobile View

---

## 🔄 State Management

### suppliersStore

**State:**
```javascript
{
  suppliers: [],           // Array aller Lieferanten
  currentSupplier: null,   // Aktuell ausgewählter Lieferant
  loading: false,          // Loading State
  error: null,             // Error Message
  filters: { ... }         // Aktuelle Filter
}
```

**Actions:**
- `fetchSuppliers(filters)` - Laden mit Filtern
- `fetchSupplier(id)` - Einzelnen laden
- `createSupplier(data)` - Neuen anlegen
- `updateSupplier(id, data)` - Aktualisieren
- `deleteSupplier(id, hardDelete)` - Löschen/Deaktivieren
- `getSupplierItems(id)` - Items laden
- `setFilters(filters)` - Filter setzen
- `clearError()` - Error löschen
- `clearCurrentSupplier()` - Current leeren

### supplierItemsStore

**State:**
```javascript
{
  supplierItems: [],       // Array aller Verknüpfungen
  loading: false,          // Loading State
  error: null              // Error Message
}
```

**Actions:**
- `getItemSuppliers(storageItemId)` - Lieferanten für Item
- `createSupplierItem(data)` - Verknüpfung erstellen
- `updateSupplierItem(id, data)` - Verknüpfung aktualisieren
- `deleteSupplierItem(id)` - Verknüpfung löschen
- `setPreferredSupplier(id)` - Als bevorzugt setzen
- `clearError()` - Error löschen
- `clearSupplierItems()` - Items leeren

---

## 🎯 Nächste Schritte

### Noch nicht implementiert:

**1. Supplier Detail Page** (Optional):
```jsx
// pages/SupplierDetailPage.jsx
- Vollständige Supplier-Informationen
- Liste aller verknüpften Items
- Bestellhistorie (später)
- Statistiken
```

**2. Tool Suppliers Tab** (wichtig für Tool Detail):
```jsx
// components/tools/ToolSuppliersTab.jsx
- In ToolDetailPage einbinden
- Lieferanten für dieses Tool anzeigen
- Neuen Lieferanten hinzufügen
- Preise & Artikelnummern bearbeiten
- Bevorzugten Lieferanten markieren
```

**3. Supplier Items List:**
```jsx
// components/suppliers/SupplierItemsList.jsx
- Anzeige in Supplier Detail Page
- Liste aller Tools von diesem Lieferanten
- Quick Edit für Preise
```

---

## 📝 Wichtige Hinweise

### Permissions

Die Page nutzt folgende Permissions:
- `storage.create` - Für "Neuer Lieferant" Button
- `storage.edit` - Für Edit-Button in Cards
- `storage.delete` - Für Delete-Button in Cards

**Falls du andere Permissions nutzt**, passe sie in `SuppliersPage.jsx` und `SupplierCard.jsx` an.

### Toast Notifications

Die Components nutzen `toast` aus `components/Toaster`. Stelle sicher, dass der Toaster in deiner App eingebunden ist:

```jsx
// In App.jsx oder Layout
import { Toaster } from './components/Toaster';

<Toaster />
```

### Dark Mode

Alle Components sind für Dark Mode optimiert mit:
- `dark:bg-gray-800` - Dunkle Hintergründe
- `dark:text-white` - Helle Texte
- `dark:border-gray-700` - Dunkle Borders

---

## 🐛 Troubleshooting

### Problem: "Lieferanten werden nicht geladen"

**Lösung:**
1. Browser Console öffnen (F12)
2. Network Tab prüfen
3. Ist `/api/suppliers` Request erfolgreich?
4. Backend läuft auf Port 5000?
5. CORS korrekt konfiguriert?

### Problem: "Modal öffnet nicht"

**Lösung:**
- Prüfe ob Lucide Icons installiert sind: `npm install lucide-react`
- Prüfe Browser Console auf Errors

### Problem: "Styles fehlen"

**Lösung:**
- Tailwind CSS muss konfiguriert sein
- `dark:` Klassen in Tailwind Config aktiviert?

---

## ✅ Checkliste vor Go-Live

- [ ] Alle Dateien kopiert
- [ ] Route in App.jsx registriert
- [ ] Navigation Link hinzugefügt
- [ ] Backend läuft auf Port 5000
- [ ] Migration `1737000036000_create-suppliers.js` ausgeführt
- [ ] Suppliers API Endpoints funktionieren
- [ ] Permissions konfiguriert
- [ ] Toast Notifications eingebunden
- [ ] Manuell getestet: Create, Edit, Delete
- [ ] Manuell getestet: Filter & Suche
- [ ] Responsive Design geprüft
- [ ] Dark Mode geprüft

---

## 📞 Support

Bei Problemen:
1. Browser Console prüfen
2. Network Tab prüfen
3. Backend Logs anschauen
4. Database Records prüfen

---

**Ende der Phase 3 Frontend Dokumentation**  
**Bereit für Production! 🚀**
