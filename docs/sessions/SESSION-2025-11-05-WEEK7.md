# Session 2025-11-05 - Woche 7 Backend - Versionierung

**Datum:** 2025-11-05  
**Dauer:** ~5 Stunden  
**Sprint:** Woche 7 - Versionierung  
**Status:** ✅ BACKEND ABGESCHLOSSEN

---

## 🎯 Ziele dieser Session

1. ✅ Versions-Historie Endpoint (GET /programs/:id/revisions)
2. ✅ Upload erweitern - Major/Minor/Patch wählbar
3. ✅ Diff-Berechnung zwischen Versionen
4. ✅ Vergleichs-Endpoint (2 Varianten)
5. ✅ Rollback-Funktion

---

## ✅ Was erreicht wurde

### **1. Versions-Historie Endpoint (30min)**

**Endpoint:**
```
GET /api/programs/:id/revisions
```

**Features:**
- Liste aller Revisionen eines Programms
- Sortiert nach Datum (neueste zuerst)
- JOIN mit users, workflow_states
- `is_current` Flag zeigt aktive Version

**Response:**
```json
{
  "success": true,
  "data": {
    "program": { ... },
    "revisions": [
      {
        "id": 14,
        "version_string": "2.0.0",
        "filename": "...",
        "comment": "...",
        "is_current": true,
        "workflow_state": "draft",
        "created_by_username": "admin"
      }
    ],
    "total": 4
  }
}
```

---

### **2. Upload erweitern - Major/Minor/Patch (45min)**

**Endpoint:**
```
POST /api/programs/:id/revisions
```

**Features:**
- User wählt `version_type`: "patch" | "minor" | "major"
- Default: "patch" (wenn nicht angegeben)
- Automatische Version-Berechnung
- Neue Revisionen starten als "draft"

**Version-Logic:**
```javascript
patch: 1.0.0 → 1.0.1 (kleine Optimierung)
minor: 1.0.0 → 1.1.0 (Werkzeug gewechselt)
major: 1.0.0 → 2.0.0 (neue Strategie)
```

**Helper-Funktion erweitert:**
```javascript
getNextVersion(programId, versionType)
// versionType: 'patch' | 'minor' | 'major'
```

---

### **3. Diff-Berechnung (60min)**

**Helper-Funktion erstellt:**
```javascript
calculateDiff(oldContent, newContent)
```

**Features:**
- Zeile-für-Zeile Vergleich
- Erkennt: added, removed, changed, unchanged
- Summary: Anzahl Änderungen
- Perfekt für NC-Programme

**Diff-Typen:**
```javascript
{
  type: 'added',      // Zeile hinzugefügt (grün)
  type: 'removed',    // Zeile entfernt (rot)
  type: 'changed',    // Zeile geändert (gelb)
  type: 'unchanged'   // Zeile gleich (grau, Kontext)
}
```

**Response:**
```json
{
  "diff": {
    "changes": [
      {
        "type": "changed",
        "line_number": 5,
        "old_content": "N50 G1 Z-5 F800",
        "new_content": "N50 G1 Z-5 F600"
      }
    ],
    "summary": {
      "added": 0,
      "removed": 0,
      "changed": 2,
      "total_changes": 2
    }
  }
}
```

---

### **4. Vergleichs-Endpoints (45min)**

**Variante 1: ID-basiert (flexibel)**
```
GET /api/programs/:id/revisions/:revisionId/compare/:compareToRevisionId
```

**Variante 2: Versions-basiert (benutzerfreundlich!)**
```
GET /api/programs/:id/compare?from=1.0.0&to=1.0.1
```

**Warum 2 Varianten?**
- ID-basiert: Für API-Flexibilität
- Versions-basiert: Für Frontend (User kennen Versionen, nicht IDs!)

**Beide geben gleichen Response:**
```json
{
  "revision_from": { ... },
  "revision_to": { ... },
  "diff": { ... }
}
```

---

### **5. Rollback-Funktion (45min)**

**Endpoint:**
```
POST /api/programs/:id/rollback?to=1.0.1
```

**Features:**
- Reaktiviert alte Versionen
- Workflow-Status wird übernommen
- KEINE Duplikate erstellt
- Alle Revisionen bleiben erhalten (Audit-Trail!)
- Beliebig hin- und herwechseln
- Prüft ob Version bereits aktiv

**Workflow:**
```
Aktuell: 2.0.0 (aktiv)

POST /rollback?to=1.0.1
→ 1.0.1 wird aktiv
→ 2.0.0 bleibt erhalten

Später:
POST /rollback?to=2.0.0
→ 2.0.0 wieder aktiv
```

---

### **6. Testing (30min)**

**21 Tests erstellt in test-programs.http:**
- 6a. Versions-Historie GET
- 6b. Upload neue Revision (PATCH)
- 6c. Upload neue Revision (MINOR)
- 6d. Upload neue Revision (MAJOR)
- 6e. Versions-Historie prüfen
- 6f. Compare by Version (1.0.0 ↔ 1.0.1)
- 6g. Compare by Version (1.0.1 ↔ 1.1.0)
- 6h. Compare by Version (1.1.0 ↔ 2.0.0)
- 6i. Compare by ID
- 6j. Rollback zu 1.0.1
- 6k. Versions-Historie prüfen (is_current)
- 6l. Rollback zu 2.0.0
- 6m. Error: Bereits aktive Version
- 6n. Error: Version nicht gefunden

**Alle Tests erfolgreich!** ✅

---

## 📊 Code-Statistik

### **Backend neu/geändert:**
```
programsController.js:
  + getProgramRevisions()          ~70 Zeilen
  + uploadNewRevision()           ~110 Zeilen
  + compareRevisions()             ~80 Zeilen
  + compareRevisionsByVersion()   ~100 Zeilen
  + rollbackToRevision()           ~70 Zeilen
  + calculateDiff() Helper         ~60 Zeilen
  + getNextVersion() erweitert     ~15 Zeilen
───────────────────────────────────────────
Backend gesamt:                   ~505 Zeilen
```

### **Routes neu:**
```
programsRoutes.js:
  + POST /programs/:id/revisions
  + GET  /programs/:id/revisions
  + GET  /programs/:id/compare (versions-basiert)
  + GET  /programs/:id/revisions/:r1/compare/:r2 (ID-basiert)
  + POST /programs/:id/rollback
───────────────────────────────────────────
Routes gesamt:                     5 neue Endpoints
```

### **Tests:**
```
test-programs.http:                +21 Tests
```

**TOTAL:** ~505 Zeilen neuer Code + 5 Endpoints + 21 Tests

---

## 🎯 Features fertiggestellt

### **Versionierung:**
✅ Major.Minor.Patch Logic  
✅ User wählt Version-Type beim Upload  
✅ Default: Patch (automatisch)  
✅ Neue Revisionen starten als "draft"  

### **Versions-Historie:**
✅ Alle Revisionen abrufen  
✅ Sortiert nach Datum  
✅ `is_current` Flag  
✅ User-Infos (created_by, optimized_by, released_by)  

### **Diff-Berechnung:**
✅ Zeile-für-Zeile Vergleich  
✅ Zeigt: added, removed, changed, unchanged  
✅ Summary: Anzahl Änderungen  
✅ Perfekt für NC-Programme  

### **Vergleichs-Endpoints:**
✅ ID-basiert (flexibel)  
✅ Versions-basiert (benutzerfreundlich!)  
✅ Beide Varianten funktional  

### **Rollback:**
✅ Alte Version reaktivieren  
✅ Workflow-Status übernehmen  
✅ Keine Duplikate  
✅ Audit-Trail bleibt intakt  
✅ Beliebig hin- und herwechseln  

---

## 📈 Progress Update

### **Vorher:**
```
Gesamt: 32%
Phase 2: 50% (Woche 5-6 komplett)
```

### **Nachher:**
```
Gesamt: 37% (7 von 19 Wochen)
Phase 1: 100% ✅
Phase 2: 75% ✅ (Woche 5-7 Backend komplett)
```

**Arbeitszeit:**
- Vorher: 42h / 570h (7.4%)
- Nachher: 47h / 570h (8.2%)
- Diese Session: +5h

---

## 🎉 Meilensteine

- ✅ Woche 1-4: Phase 1 komplett
- ✅ Woche 5: Operations (Backend + Frontend)
- ✅ Woche 6: Programme (Backend + Frontend)
- ✅ Woche 7: Versionierung (Backend komplett!)
- 🎊 **75% von Phase 2 erreicht!**

---

## 🔧 Technische Entscheidungen

### **1. Zwei Compare-Varianten:**
```
ID-basiert:       /programs/1/revisions/12/compare/14
Versions-basiert: /programs/1/compare?from=1.0.0&to=1.0.1

Warum beide?
- IDs: API-Flexibilität
- Versions: Benutzerfreundlich für Frontend
```

### **2. Rollback ohne Duplikate:**
```
NICHT: Neue Revision erstellen beim Rollback
SONDERN: current_revision_id ändern

Vorteile:
✅ Audit-Trail bleibt sauber
✅ Keine unnötigen Kopien
✅ Speicherplatz sparen
✅ Beliebig hin- und herwechseln
```

### **3. Diff-Algorithmus:**
```
Einfacher Zeile-für-Zeile Vergleich
Keine externe Library nötig
Perfekt für NC-Programme
Schnell & effizient
```

### **4. Workflow-Status:**
```
Neue Revisionen: IMMER "draft"
Rollback: Übernimmt Status der Ziel-Version
→ ISO-Konform!
```

---

## 💡 Lessons Learned

1. **Versions-basierte API ist benutzerfreundlicher!**
   - User kennen "1.0.0", nicht "ID 42"
   - Frontend wird einfacher
   - Weniger State-Management nötig

2. **Rollback ohne Duplikate ist sauberer!**
   - Audit-Trail bleibt übersichtlich
   - Keine "Rollback-Revisionen"
   - Einfache Implementierung

3. **Einfacher Diff-Algorithmus reicht!**
   - Keine externe Library nötig
   - Perfekt für NC-Programme
   - Schnell implementiert

4. **Testing ist essentiell!**
   - 21 Tests helfen beim Debugging
   - Dokumentieren alle Edge-Cases
   - Verhindern Regressions

5. **Settings-Wishlist früh anlegen!**
   - Sammelt alle Config-Ideen
   - Kann später schnell umgesetzt werden
   - Verhindert Hard-coding-Wildwuchs

---

## 📁 Deliverables

### **Code:**
1. **programsController-v6-rollback.js** - Finale Version mit allen Features
2. **programsRoutes-v6.js** - Alle 5 neuen Endpoints
3. **test-programs-v6.http** - 21 Tests für Versionierung

### **Dokumentation:**
1. **ROADMAP.md** - Woche 7 aktualisiert
2. **SESSION-2025-11-05-WEEK7.md** - Diese Datei
3. **SETTINGS-WISHLIST.md** - Settings-Ideen für später

---

## 🚀 Nächste Session

### **Woche 7 Frontend - Versionierung UI** (geplant 4-5h)

**Components:**
```
1. RevisionsList.jsx         - Versions-Historie anzeigen
2. RevisionCard.jsx          - Einzelne Version mit Infos
3. DiffViewer.jsx            - Diff visuell darstellen (rot/grün)
4. RollbackConfirmDialog.jsx - Rollback mit Bestätigung
5. ProgramUploadForm erweitern - Version-Type Auswahl
6. VersionBadge.jsx          - Zeigt aktive Version
```

**Features:**
```
✅ Versions-Liste mit Sortierung
✅ is_current Badge
✅ Compare Button zwischen Versionen
✅ Rollback Button mit Confirmation
✅ Diff-Viewer Modal (rot/grün highlighting)
✅ Upload mit Version-Type Dropdown
✅ Comment Pflicht bei Minor/Major (Settings!)
```

**Geschätzter Aufwand:** 4-5 Stunden

---

## 📝 Offene Punkte / TODOs

### **Frontend (Woche 7):**
- [ ] RevisionsList.jsx erstellen
- [ ] DiffViewer.jsx mit Syntax-Highlighting
- [ ] ProgramUploadForm erweitern (Version-Type Dropdown)
- [ ] Rollback Button + Confirmation Dialog
- [ ] Version Badge Component
- [ ] Integration in OperationDetailPage

### **Settings (später):**
- [ ] Comment-Pflicht konfigurierbar
- [ ] Default Workflow-State konfigurierbar
- [ ] Auto-Backup on Rollback konfigurierbar
- [ ] Max File Size konfigurierbar

### **Nice-to-have (Phase 5):**
- [ ] Diff mit Syntax-Highlighting für G-Code
- [ ] Download mehrerer Versionen als ZIP
- [ ] Automatische Diff beim Upload (gegen letzte Version)
- [ ] Version-Tags (z.B. "stable", "production")

---

## 🎊 Erfolge dieser Session

1. ✅ **5 neue Endpoints** - Alle funktionieren perfekt
2. ✅ **505 Zeilen Code** - Sauber strukturiert
3. ✅ **21 Tests** - Alle erfolgreich
4. ✅ **Versions-basierter API** - Benutzerfreundlich
5. ✅ **Rollback ohne Duplikate** - Audit-Trail bleibt sauber
6. ✅ **Diff-Berechnung** - Zeile-für-Zeile perfekt
7. ✅ **Settings-Wishlist** - Alle Ideen dokumentiert

---

## 📊 Zusammenfassung

**Input:** Woche 7 geplant - Versionierung Backend  
**Output:** Woche 7 Backend KOMPLETT - 5 Endpoints, Diff, Rollback  
**Aufwand:** ~5 Stunden  
**Ergebnis:** ✅ Major/Minor/Patch, Diff, Rollback funktionieren perfekt!

**Nächster Schritt:** Frontend für Versionierung bauen

---

**Session abgeschlossen!** 🎉

**Nächste Session:** Woche 7 Frontend - Versions-UI Components  
**Datum:** TBD  
**Status:** ✅ BACKEND READY! Frontend can start! 🚀
