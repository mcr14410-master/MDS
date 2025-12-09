# Phase 5: Tool Number Lists (T-Nummern-Verwaltung)

## Übersicht

Phase 5 implementiert ein System zur Verwaltung von T-Nummern (Werkzeugplätze in CNC-Maschinen). T-Nummern sind maschinenspezifische Platzhalter (T1, T5, T113), die mit konkreten Werkzeugen aus dem Lager verknüpft werden können.

**Anwendungsfall:** 
- NC-Programme referenzieren T-Nummern (z.B. `T5 M6`)
- Jede Maschine hat ihre eigene T-Nummern-Belegung
- Ein T-Nummer kann ein bevorzugtes Werkzeug + Alternativen haben

---

## Datenbankstruktur

### Neue Tabellen

```
┌─────────────────────────┐       ┌─────────────────────────┐
│   tool_number_lists     │       │        machines         │
├─────────────────────────┤       ├─────────────────────────┤
│ id (PK)                 │       │ id (PK)                 │
│ name (unique)           │       │ name                    │
│ description             │       │ ...                     │
│ is_active               │       └───────────┬─────────────┘
│ created_at              │                   │
└───────────┬─────────────┘                   │
            │                                 │
            │ 1:n                             │
            ▼                                 │
┌─────────────────────────┐                   │
│ tool_number_list_items  │                   │
├─────────────────────────┤                   │
│ id (PK)                 │                   │
│ list_id (FK)            │                   │
│ tool_number (T1, T5...) │                   │
│ description             │                   │
│ preferred_tool_master_id│──────┐            │
│ sequence                │      │            │
│ notes                   │      │            │
└───────────┬─────────────┘      │            │
            │                    │            │
            │ 1:n                │            │
            ▼                    │            │
┌─────────────────────────┐      │            │
│ tool_number_alternatives│      │            │
├─────────────────────────┤      │            │
│ id (PK)                 │      │            │
│ list_item_id (FK)       │      │            │
│ tool_master_id (FK)     │──────┤            │
│ priority (0, 1, 2...)   │      │            │
│ notes                   │      │            │
└─────────────────────────┘      │            │
                                 │            │
                                 ▼            │
                        ┌─────────────────┐   │
                        │   tool_master   │   │
                        ├─────────────────┤   │
                        │ id (PK)         │   │
                        │ article_number  │   │
                        │ tool_name       │   │
                        │ ...             │   │
                        └─────────────────┘   │
                                              │
┌─────────────────────────────────────────────┘
│
▼
┌───────────────────────────┐
│ machine_tool_number_lists │  (Many-to-Many)
├───────────────────────────┤
│ id (PK)                   │
│ machine_id (FK)           │
│ list_id (FK)              │
│ is_active                 │
│ assigned_at               │
└───────────────────────────┘
```

### Feldänderung

- `tool_master.tool_number` → `tool_master.article_number`
- Grund: "tool_number" war verwirrend, da T-Nummern jetzt separat verwaltet werden
- Artikelnummer bezeichnet die Hersteller-Bestellnummer

---

## Backend API

### Endpoints

#### Listen (tool_number_lists)

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/api/tool-number-lists` | Alle Listen (mit ?include_inactive=true) |
| GET | `/api/tool-number-lists/:id` | Liste mit Items und Maschinen |
| POST | `/api/tool-number-lists` | Neue Liste erstellen |
| PUT | `/api/tool-number-lists/:id` | Liste aktualisieren |
| DELETE | `/api/tool-number-lists/:id` | Liste löschen (CASCADE) |
| POST | `/api/tool-number-lists/:id/duplicate` | Liste duplizieren |

#### Items (tool_number_list_items)

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| POST | `/api/tool-number-lists/:id/items` | T-Nummer hinzufügen |
| PUT | `/api/tool-number-list-items/:id` | T-Nummer aktualisieren |
| DELETE | `/api/tool-number-list-items/:id` | T-Nummer löschen |
| PUT | `/api/tool-number-lists/:id/items/reorder` | Reihenfolge ändern |

#### Alternativen (tool_number_alternatives)

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/api/tool-number-list-items/:id/alternatives` | Alternativen abrufen |
| POST | `/api/tool-number-list-items/:id/alternatives` | Alternative hinzufügen |
| PUT | `/api/tool-number-alternatives/:id` | Alternative aktualisieren |
| DELETE | `/api/tool-number-alternatives/:id` | Alternative entfernen |

#### Maschinen-Zuordnung

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/api/machines/:id/tool-number-lists` | Listen einer Maschine |
| POST | `/api/machines/:id/tool-number-lists` | Liste zuordnen |
| PUT | `/api/machines/:id/tool-number-lists/:listId/toggle` | Aktiv-Status umschalten |
| DELETE | `/api/machines/:id/tool-number-lists/:listId` | Zuordnung entfernen |

#### Tool Mapping (für NC-Parser)

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/api/machines/:id/tool-mapping/:toolNumber` | Werkzeug für T-Nummer finden |
| POST | `/api/machines/:id/tool-mapping/bulk` | Mehrere T-Nummern auflösen |

---

## Frontend

### Neue Dateien

```
frontend/src/
├── stores/
│   └── toolNumberListsStore.js    # Zustand Store (30+ Funktionen)
└── pages/
    ├── ToolNumberListsPage.jsx    # Listenübersicht
    └── ToolNumberListDetailPage.jsx  # Detail mit Items
```

### Navigation

- Neuer Menüpunkt: **T-Nummern** (nach "Werkzeuge")
- Permission: `tools.view`
- Routes:
  - `/tool-number-lists` → Übersicht
  - `/tool-number-lists/:id` → Detail

### Features

#### Listenübersicht (ToolNumberListsPage)
- Grid mit Cards für jede Liste
- Statistiken: Anzahl T-Nummern, verknüpfte Werkzeuge, Maschinen
- Suche mit Debounce
- Filter: Aktive/Inaktive anzeigen
- Aktionen: Aktivieren/Deaktivieren, Bearbeiten, Duplizieren, Löschen

#### Detailansicht (ToolNumberListDetailPage)
- Header mit Edit-Modus für Name/Beschreibung
- Statistik-Dashboard
- T-Nummern-Liste:
  - Natürliche Sortierung (T1, T2, T10, T100)
  - Expand/Collapse für Alternativen
  - Bevorzugtes Werkzeug anzeigen
- Werkzeug-Picker Modal:
  - Suche (Artikelnummer, Name, Hersteller)
  - Filter: Kategorie, Typ, Hersteller
  - Ergebniszähler
- Alternativen-Verwaltung:
  - Hinzufügen mit automatischer Priorität
  - Entfernen per X-Button
- Maschinen-Zuordnung:
  - Liste zugeordneter Maschinen
  - "Maschine zuordnen" Button
  - Zuordnung entfernen per X-Button

---

## Geänderte Dateien

### Backend (13 Dateien)

**Neue Dateien:**
- `migrations/1737000039000_create-tool-number-lists.js`
- `controllers/toolNumberListsController.js`
- `routes/toolNumberListsRoutes.js`
- `routes/toolNumberListItemsRoutes.js`
- `routes/toolNumberAlternativesRoutes.js`

**Geänderte Dateien (article_number):**
- `controllers/toolMasterController.js`
- `controllers/toolCompatibleInsertsController.js`
- `controllers/toolDocumentsController.js`
- `controllers/storageItemsController.js`
- `controllers/stockMovementsController.js`
- `controllers/suppliersController.js`
- `controllers/dashboardController.js`
- `controllers/purchaseOrdersController.js`
- `controllers/qrCodesController.js`
- `server.js` (Route-Registrierung)

### Frontend (5 Dateien)

**Neue Dateien:**
- `stores/toolNumberListsStore.js`
- `pages/ToolNumberListsPage.jsx`
- `pages/ToolNumberListDetailPage.jsx`

**Geänderte Dateien:**
- `App.jsx` (neue Routes)
- `components/Layout.jsx` (Navigation)

---

## Technische Details

### Natürliche Sortierung

```javascript
[...listItems].sort((a, b) => {
  const aNum = parseInt(a.tool_number.replace(/\D/g, '')) || 0;
  const bNum = parseInt(b.tool_number.replace(/\D/g, '')) || 0;
  return aNum - bNum;
});
// Ergebnis: T1, T2, T10, T22, T100 (nicht: T1, T10, T100, T2, T22)
```

### Automatische Priorität

```javascript
// Backend: Nächste freie Priorität ermitteln
if (altPriority == null) {
  const maxPri = await pool.query(
    'SELECT COALESCE(MAX(priority), -1) + 1 as next_pri 
     FROM tool_number_alternatives WHERE list_item_id = $1',
    [id]
  );
  altPriority = maxPri.rows[0].next_pri;
}
```

### Tool Mapping Query

```sql
-- Findet bevorzugtes Werkzeug oder erste Alternative
SELECT 
  tni.tool_number,
  COALESCE(tm_pref.id, tm_alt.id) as tool_master_id,
  COALESCE(tm_pref.article_number, tm_alt.article_number) as article_number,
  ...
FROM tool_number_list_items tni
LEFT JOIN tool_master tm_pref ON tni.preferred_tool_master_id = tm_pref.id
LEFT JOIN tool_number_alternatives tna ON tni.id = tna.list_item_id AND tna.priority = 0
LEFT JOIN tool_master tm_alt ON tna.tool_master_id = tm_alt.id
WHERE ...
```

---

## Zukünftige Erweiterungen

- [ ] Drag & Drop für Item-Reihenfolge
- [ ] NC-Programm Parser Integration
- [ ] Bulk-Import von T-Nummern
- [ ] Export/Import von Listen (JSON/CSV)
- [ ] Werkzeug-Verfügbarkeitsprüfung
- [ ] Automatische Alternativ-Vorschläge basierend auf Kompatibilität

---

## Status

✅ **Phase 5 abgeschlossen**

Datum: November 2025
