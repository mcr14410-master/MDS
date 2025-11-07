# ✨ Feature: Standard-Nachrichten für Workflow-Übergänge

**Datum:** 07.11.2025  
**Status:** ✅ IMPLEMENTIERT

---

## 🎯 Feature:

**Problem:** 
Bei automatischen Status-Übergängen (ohne Modal) wurde `null` als Grund gespeichert.
→ Historie war nicht aussagekräftig

**Lösung:**
Automatische Standard-Nachrichten für jeden Übergang!

---

## 📝 Standard-Nachrichten:

### **Übergänge MIT automatischer Nachricht:**

```javascript
draft → review:      "Zur Prüfung freigegeben"
review → approved:   "Prüfung erfolgreich abgeschlossen"
review → draft:      "Zurück in Bearbeitung"
approved → released: "Freigegeben für Produktion"
approved → draft:    "Zurück zur Überarbeitung"
rejected → draft:    "Zur erneuten Bearbeitung"
```

### **Übergänge MIT manuellem Modal:**

```javascript
draft → archived:    (Modal öffnet sich - Grund erforderlich)
review → rejected:   (Modal öffnet sich - Grund erforderlich)
rejected → archived: (Modal öffnet sich - Grund erforderlich)
released → archived: (Modal öffnet sich - Grund erforderlich)
```

---

## 🔧 Implementierung:

**WorkflowActions.jsx (Zeile 44-62):**

```javascript
// Get default reason for automatic transitions
const getDefaultReason = (fromState, toState) => {
  const key = `${fromState}_${toState}`;
  
  const defaultReasons = {
    'draft_review': 'Zur Prüfung freigegeben',
    'review_approved': 'Prüfung erfolgreich abgeschlossen',
    'review_draft': 'Zurück in Bearbeitung',
    'approved_released': 'Freigegeben für Produktion',
    'approved_draft': 'Zurück zur Überarbeitung',
    'rejected_draft': 'Zur erneuten Bearbeitung'
  };
  
  return defaultReasons[key] || `Status geändert zu: ${toState}`;
};

// Handle transition click
const handleTransitionClick = (transition) => {
  const requiresReason = ['rejected', 'archived'].includes(transition.to_state);
  
  if (requiresReason) {
    // Modal öffnen für manuellen Grund
    setSelectedTransition(transition);
    setIsModalOpen(true);
  } else {
    // Automatisch mit Standard-Nachricht
    const defaultReason = getDefaultReason(transition.from_state, transition.to_state);
    executeTransition(transition, defaultReason);
  }
};
```

---

## 📊 Vorher / Nachher:

### **Vorher (ohne Standard-Nachrichten):**

**DB workflow_history:**
```
| from_state | to_state | change_reason |
|------------|----------|---------------|
| 1 (draft)  | 2 (review) | [null]      |  ❌
| 2 (review) | 3 (approved) | [null]    |  ❌
| 3 (approved) | 4 (released) | [null]  |  ❌
```

**Historie war nicht aussagekräftig!**

---

### **Nachher (mit Standard-Nachrichten):**

**DB workflow_history:**
```
| from_state | to_state | change_reason                           |
|------------|----------|-----------------------------------------|
| 1 (draft)  | 2 (review) | Zur Prüfung freigegeben              |  ✅
| 2 (review) | 3 (approved) | Prüfung erfolgreich abgeschlossen  |  ✅
| 3 (approved) | 4 (released) | Freigegeben für Produktion        |  ✅
| 4 (released) | 6 (archived) | Programm ist veraltet            |  ✅ (manuell)
```

**Historie ist jetzt aussagekräftig!**

---

## 🎨 Anpassung der Nachrichten:

Du kannst die Standard-Nachrichten einfach anpassen:

**In WorkflowActions.jsx (Zeile ~49-55):**

```javascript
const defaultReasons = {
  // Hier kannst du die Nachrichten anpassen:
  'draft_review': 'Deine eigene Nachricht hier',
  'review_approved': 'Deine eigene Nachricht hier',
  // ... etc
};
```

**Oder neue Übergänge hinzufügen:**

```javascript
const defaultReasons = {
  'draft_review': 'Zur Prüfung freigegeben',
  // ... bestehende ...
  'mein_neuer_übergang': 'Meine neue Nachricht'  // NEU
};
```

---

## 🧪 Testing:

### **1. Datei ersetzen:**
```bash
cp WorkflowActions.jsx frontend/src/components/
```

### **2. Browser neu laden** (F5)

### **3. Test Standard-Übergänge:**

**Test 1: draft → review**
1. Gehe zu Programm mit Status "Entwurf"
2. Klicke auf "→ In Prüfung"
3. **Kein Modal öffnet sich**
4. Status ändert sich sofort
5. **Prüfe DB:** `change_reason` = "Zur Prüfung freigegeben" ✅

**Test 2: review → approved**
1. Gehe zu Programm mit Status "In Prüfung"
2. Klicke auf "→ Geprüft"
3. **Kein Modal öffnet sich**
4. Status ändert sich sofort
5. **Prüfe DB:** `change_reason` = "Prüfung erfolgreich abgeschlossen" ✅

**Test 3: approved → released**
1. Gehe zu Programm mit Status "Geprüft"
2. Klicke auf "→ Freigegeben"
3. **Kein Modal öffnet sich**
4. Status ändert sich sofort
5. **Prüfe DB:** `change_reason` = "Freigegeben für Produktion" ✅

### **4. Test Manuelle Übergänge (mit Modal):**

**Test 4: draft → archived**
1. Gehe zu Programm mit Status "Entwurf"
2. Klicke auf "→ Archivieren"
3. **Modal öffnet sich** ✅
4. Gib Grund ein: "Programm nicht mehr benötigt"
5. Klicke "Status ändern"
6. **Prüfe DB:** `change_reason` = "Programm nicht mehr benötigt" ✅

---

## 📦 Geänderte Datei:

[WorkflowActions.jsx](computer:///mnt/user-data/outputs/week9-frontend/WorkflowActions.jsx)

**Änderungen:**
- Zeile 44-62: `getDefaultReason()` Funktion hinzugefügt
- Zeile 71: `defaultReason` statt `null` übergeben

---

## 🎯 Ergebnis:

```
✅ Automatische Übergänge haben Standard-Nachrichten
✅ Manuelle Übergänge (reject/archive) öffnen weiterhin Modal
✅ Historie ist jetzt vollständig & aussagekräftig
✅ Audit-Trail ist ISO-ready
✅ Nachrichten sind leicht anpassbar
```

---

## 💡 Weitere Ideen:

### **Sprach-Unterstützung:**
```javascript
const defaultReasons = {
  'draft_review': language === 'en' 
    ? 'Released for review' 
    : 'Zur Prüfung freigegeben',
  // ...
};
```

### **Zeitstempel in Nachricht:**
```javascript
'draft_review': `Zur Prüfung freigegeben am ${new Date().toLocaleDateString('de-DE')}`
```

### **User-Name in Nachricht:**
```javascript
'draft_review': `Zur Prüfung freigegeben von ${userName}`
```

---

## 🎉 Workflow-System jetzt KOMPLETT:

```
✅ Status-Änderungen funktionieren
✅ Buttons werden angezeigt
✅ Permissions funktionieren
✅ Standard-Nachrichten automatisch
✅ Manuelle Gründe bei reject/archive
✅ Historie vollständig & aussagekräftig
✅ Toast-Notifications
✅ Status-Badge aktualisiert sich
✅ Dark Mode
✅ ISO-ready Audit-Trail
```

---

**Ersetze WorkflowActions.jsx, teste die Übergänge, und prüf die DB!** 🚀

**Historie sollte jetzt viel aussagekräftiger sein!** 😊
