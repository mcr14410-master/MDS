# Tool Management Roadmap - Update v3

**Datum:** 2025-11-12  
**Von:** v2.0 → v3.0

---

## 🎯 Hauptänderungen

### 1. Tool Number Lists System (NEU in Phase 5)

**Problem gelöst:**
- NC-Programme verwenden T-Nummern (z.B. T113)
- Eine T-Nummer kann mehrere Werkzeuge passen
- Maschinen können unterschiedliche T-Nummern-Systeme verwenden

**Lösung:**
- **Listen-basiertes System** mit Maschinen-Zuordnung
- Jede Liste definiert T-Nummern → Bevorzugtes Werkzeug + Alternativen
- Listen sind in Maschinen-Einstellungen aktivierbar
- Parser verwendet Listen für automatisches Tool-Mapping

**Neue Tabellen (4):**
```
tool_number_lists            (Listen-Container)
tool_number_list_items       (T-Nummern mit bevorzugtem Werkzeug)
tool_number_alternatives     (Alternative Werkzeuge)
machine_tool_number_lists    (Maschinen → Listen Zuordnung)
```

---

### 2. Umbenennung: tool_number → article_number

**Grund:**
- Verwechslungsgefahr mit T-Nummern aus NC-Programmen
- T-Nummern = programm-/maschinenbezogen (z.B. T113)
- article_number = eindeutige Werkzeug-Identifikation (z.B. GAR-123)

**Änderungen:**
```sql
ALTER TABLE tool_master 
  RENAME COLUMN tool_number TO article_number;
```

---

### 3. Maschinen-Einstellungen erweitert

**Neu:** Tab "Werkzeugnummern" in Machine Detail Page
- Liste zugeordneter Tool Number Lists
- **Toggle Switches zum Aktivieren/Deaktivieren**
- Preview der T-Nummern
- "Liste hinzufügen" Button

**UI-Mockup:**
```
┌─ Maschine: DMU 80 ──────────────┐
│ [Details] [Werkzeugnummern]     │
│                                  │
│ Werkzeugnummern-Listen:          │
│                                  │
│ [ON]  Standard-Fräsen           │
│       47 T-Nummern               │
│                                  │
│ [OFF] Aluminium-Spezial         │
│       23 T-Nummern               │
│                                  │
│ [+ Liste hinzufügen]             │
└──────────────────────────────────┘
```

---

### 4. Parser Integration (Phase 5)

**Workflow:**
```
1. NC-Programm hochladen
2. Parser extrahiert T-Nummern: T113, T5, T22
3. System sucht in aktiven Listen der Maschine
4. Gefunden: Tool Master zuordnen
5. Nicht gefunden: Warnung + Manuell zuordnen
6. Auto-Fill Tool List
```

---

## 📊 Zeitaufwand aktualisiert

| Phase | Alt | Neu | Änderung |
|-------|-----|-----|----------|
| Phase 1 | 10-12h | 10-12h | - |
| Phase 2 | 12-14h | 12-14h | - |
| Phase 3 | 4-5h | 4-5h | - |
| Phase 4 | 6-8h | 6-8h | - |
| **Phase 5** | **4-5h** | **12-15h** | **+8-10h** |
| **GESAMT** | **36-44h** | **44-54h** | **+8-10h** |

**Grund:** Tool Number Lists System ist umfangreicher

---

## ✅ Zusammenfassung

**Was hat sich geändert:**
- ✅ Tool Number Lists System hinzugefügt (4 neue Tabellen)
- ✅ tool_number → article_number umbenannt
- ✅ Maschinen-Einstellungen mit Toggle für Listen
- ✅ Parser Integration komplett spezifiziert
- ✅ Phase 5 Zeitaufwand angepasst (+8-10h)

**Was bleibt gleich:**
- ✅ Phase 1-4 unverändert
- ✅ Bestandsverwaltung nach Zustand (new/used/reground)
- ✅ Gewichtete Low-Stock Berechnung
- ✅ Alle anderen Features wie geplant

**Bereit für Implementierung!** 🚀
