maintenance_plans:
- Maschine
- Wartungstyp (Täglich, Wöchentlich, 500h, 1000h, Jährlich)
- Beschreibung ("Ölstand prüfen")
- Intervall
- Letzte Wartung
- Nächste Wartung (berechnet)
- Verantwortlich
- Status (Fällig, Überfällig, OK)

maintenance_logs:
- Wann durchgeführt?
- Von wem?
- Was gemacht?
- Fotos (optional)
- Nächster Termin
```

---

## 🔧 Wartungsmanagement - Features:

### **Benachrichtigungen:**
```
Bediener loggt sich ein:
┌────────────────────────────────────┐
│ ⚠️ Wartung fällig!                │
├────────────────────────────────────┤
│ DMG-DMU50:                         │
│ • Ölstand prüfen (überfällig 3d)  │
│ • Hydraulikfilter (fällig heute)  │
│                                    │
│ [Details] [Erledigt melden]       │
└────────────────────────────────────┘
```

### **Dashboard für Meister:**
```
Wartungs-Übersicht:
├── ✅ 12 Wartungen OK
├── ⚠️ 3 Wartungen fällig (diese Woche)
└── 🚨 1 Wartung überfällig (DMG-DMU50)

Maschinenstatus:
├── DMG-DMU50: 🟢 Betriebsbereit
├── HERMLE-C40: 🟡 Wartung fällig
└── MAZATROL: 🔴 Überfällig!
```

### **Intervall-Typen:**
```
1. Zeitbasiert:
   - Täglich (Ölstand)
   - Wöchentlich (Späne entfernen)
   - Monatlich (Filter wechseln)
   - Jährlich (Inspektion)

2. Betriebsstundenbasiert:
   - Alle 500h (Schmierung)
   - Alle 1000h (Hydraulikfilter)
   - Alle 5000h (Große Inspektion)

3. Event-basiert:
   - Nach Werkzeugbruch
   - Nach Kollision
   - Nach Störung
```

---

## 📱 Bediener-Workflow:
```
1. Bediener kommt zur Maschine
2. Scannt QR an Maschine
3. Sieht:
   ┌─────────────────────────────────┐
   │ DMG-DMU50                       │
   ├─────────────────────────────────┤
   │ Status: 🟡 Wartung fällig       │
   │                                 │
   │ Fällige Wartungen:              │
   │ • Ölstand prüfen (täglich)     │
   │   [Erledigt] [Details]         │
   │                                 │
   │ Aktuelle Programme:             │
   │ • O12345 - GEHAEUSE             │
   │ • O12346 - DECKEL               │
   └─────────────────────────────────┘

4. Klickt [Erledigt]
5. Optional: Foto hochladen
6. Optional: Kommentar ("Öl war niedrig")
7. System setzt nächsten Termin
```

---

## 🎨 Maschinenpark-Übersicht:
```
Admin/Meister sieht:

┌────────────────────────────────────────────┐
│ Maschinenpark (8 Maschinen)                │
├────────────────────────────────────────────┤
│ Fräsen (5):                                │
│ • DMG-DMU50     🟢 OK (Letzte Wartung: 2d)│
│ • HERMLE-C40    🟡 Fällig (Heute!)        │
│ • MAZAK-VCN     🟢 OK                      │
│ • DMG-DMU65     🟢 OK                      │
│ • HAAS-VF2      🔴 Überfällig! (3 Tage)   │
│                                            │
│ Drehen (2):                                │
│ • EMCO-E200     🟢 OK                      │
│ • INDEX-G200    🟡 500h erreicht          │
│                                            │
│ Sonderfälle (1):                           │
│ • MAZATROL      🟢 OK                      │
└────────────────────────────────────────────┘

[Wartung planen] [Historie] [Neue Maschine]
```

---

## 📊 Reports & Analytics:
```
Wartungsstatistik:
- Durchschnittliche Zeit zwischen Wartungen
- Häufigste Wartungstypen
- Kosten pro Maschine (optional)
- Ausfallzeiten durch Wartung
- Überfällige Wartungen (Audit-Trail)

Export als PDF/Excel für QM/Zertifizierung
```

---

## 🔔 Benachrichtigungs-System:
```
Automatische Mails/Benachrichtigungen:

3 Tage vorher:
"DMG-DMU50: Wartung fällig in 3 Tagen"

Am Tag:
"DMG-DMU50: Wartung heute fällig!"

Nach Fälligkeit:
"🚨 DMG-DMU50: Wartung überfällig!"

An: Meister, zuständiger Bediener
```

---
Schon in Phase 2 einbauen:
sqlmachines table:
+ last_maintenance DATE
+ next_maintenance DATE
+ maintenance_notes TEXT

→ Manuell gepflegt erstmal
→ Später automatisiert
```

**Bediener sieht beim Login:**
```
"DMG-DMU50: Nächste Wartung in 2 Tagen"






👥 Skill-Level-basiertes Wartungssystem:
3 Skill-Level:
Level 1 - Helfer: 🟢 Einfach
├── Ölstand prüfen
├── Späne entfernen
├── Sichtprüfung
├── Türen/Fenster reinigen
└── Kühlmittelstand prüfen

Level 2 - Bediener: 🟡 Mittel
├── Filter wechseln
├── Werkzeuge vermessen
├── Nullpunkte prüfen
├── Schmierung durchführen
└── Einfache Störungen beheben

Level 3 - Meister: 🔴 Komplex
├── Mechanische Einstellungen
├── Elektronik-Probleme
├── Große Inspektionen
├── Hersteller-Service koordinieren
└── Außergewöhnliche Probleme



🎨 Intelligente Zuweisung:
Automatische Verteilung:
sqlmaintenance_tasks:
- skill_required (1, 2, 3)
- assigned_to (user_id oder rolle)
- priority (niedrig, mittel, hoch)
- estimated_time (5min, 30min, 2h)



System-Logik:
Wartung fällig → System prüft Skill-Level
├── Level 1? → Zeigt allen Helfern an
├── Level 2? → Zeigt Bedienern + Meister
└── Level 3? → Nur Meister + Admin

Helfer sieht NUR seine Level-1-Aufgaben!
```

---

## 📱 Helfer-Ansicht (Super simpel):
```
Login als: Max (Helfer)

┌────────────────────────────────────┐
│ Meine Aufgaben (4)                 │
├────────────────────────────────────┤
│ ✅ Erledigt (2)                    │
│ 🟡 Offen (2)                       │
├────────────────────────────────────┤
│ DMG-DMU50: Ölstand prüfen         │
│ ⏰ Fällig: Heute                   │
│ ⏱️ Dauer: ~5 Minuten               │
│ [Anleitung öffnen]                 │
├────────────────────────────────────┤
│ HERMLE-C40: Späne entfernen       │
│ ⏰ Fällig: Heute                   │
│ ⏱️ Dauer: ~15 Minuten              │
│ [Anleitung öffnen]                 │
└────────────────────────────────────┘
```

---

## 📖 Schritt-für-Schritt Anleitungen:

### **Für Helfer - mit Fotos:**
```
Aufgabe: Ölstand DMG-DMU50 prüfen

┌────────────────────────────────────┐
│ Schritt 1/4                        │
├────────────────────────────────────┤
│ [📷 Foto: Maschinen-Rückseite]     │
│                                    │
│ Gehe zur Rückseite der Maschine   │
│ Finde das Ölfenster (rote Markierung)│
│                                    │
│ [✓ Erledigt] [Weiter →]           │
├────────────────────────────────────┤
│ Schritt 2/4                        │
├────────────────────────────────────┤
│ [📷 Foto: Ölfenster Close-up]      │
│                                    │
│ Ölstand muss zwischen MIN und MAX │
│ stehen (grüne Linie im Foto)      │
│                                    │
│ ❓ Steht Öl zwischen MIN-MAX?     │
│ [ ] JA → Weiter                    │
│ [ ] NEIN → Problem melden!         │
├────────────────────────────────────┤
│ Schritt 3/4                        │
│ ...                                │
└────────────────────────────────────┘
```

**Features:**
- ✅ Fotos/Videos eingebettet
- ✅ Checkboxen zum Abhaken
- ✅ Entscheidungsbäume (JA/NEIN)
- ✅ "Problem melden" Button → Eskaliert zu Bediener
- ✅ QR-Code direkt an Maschine → Anleitung öffnet sich

---

## 🚨 Eskalations-System:
```
Helfer bei Schritt 3:
"❌ Öl ist unter MIN-Linie!"

System:
├── Markiert Aufgabe als "Problem"
├── Benachrichtigt zuständigen Bediener
└── Optional: Foto von Helfer → "So sieht's aus"

Bediener-Benachrichtigung:
┌────────────────────────────────────┐
│ 🚨 Eskalation: DMG-DMU50           │
├────────────────────────────────────┤
│ Helfer Max meldet:                 │
│ "Ölstand unter MIN"                │
│                                    │
│ [📷 Foto ansehen]                  │
│ [Übernehmen] [Anleitung senden]    │
└────────────────────────────────────┘
```

---

## 📊 Wartungsplan mit Skill-Levels:
```
DMG-DMU50 Wartungsplan:

Täglich (Level 1 - Helfer):
├── ✅ Ölstand prüfen (5min)
├── ✅ Späne entfernen (15min)
└── ✅ Sichtprüfung (5min)

Wöchentlich (Level 2 - Bediener):
├── 🟡 Filter prüfen (30min)
└── 🟡 Schmierung (20min)

Monatlich (Level 2 - Bediener):
└── 🟡 Hydraulikfilter wechseln (1h)

Alle 1000h (Level 3 - Meister):
└── 🔴 Große Inspektion (4h)

Jährlich (Level 3 - Externe):
└── 🔴 Hersteller-Service
```

---

## 🎯 Workflow-Beispiel:

### **Morgens um 7:00 Uhr:**

**Helfer Max öffnet App:**
```
Guten Morgen Max! 👋

Deine Aufgaben heute:
├── DMG-DMU50: Ölstand (5min)
├── HERMLE-C40: Ölstand (5min)
├── DMG-DMU50: Späne (15min)
├── HERMLE-C40: Späne (15min)
└── MAZAK: Sichtprüfung (5min)

Gesamt: ~45 Minuten
[Starten]
```

**Max arbeitet Liste ab:**
```
1. Scannt QR an DMG-DMU50
2. Öffnet "Ölstand prüfen"
3. Folgt Schritten mit Fotos
4. Problem: "Öl niedrig!"
5. Macht Foto, klickt "Problem melden"
6. System benachrichtigt Bediener
7. Weiter zu nächster Maschine
```

**Bediener Stefan bekommt:**
```
🚨 DMG-DMU50: Öl nachfüllen nötig
Von: Max (Helfer)
Zeit: 07:23 Uhr
[📷 Foto] [Übernehmen]
```

**Stefan füllt nach:**
```
- Öffnet Aufgabe
- Sieht Maxs Foto
- Füllt Öl nach
- Markiert als "Erledigt"
- Kommentar: "2L nachgefüllt"
- System setzt nächsten Termin
```

---

## 📈 Gamification (Optional aber cool):
```
Helfer-Dashboard:

Max (Helfer)
├── Diese Woche: 23 Aufgaben erledigt ✅
├── Streak: 12 Tage in Folge 🔥
├── Probleme erkannt: 3 🎯
└── Durchschnitt: 4.2 Min/Aufgabe ⚡

Rangliste:
1. 🥇 Max - 23 Aufgaben
2. 🥈 Lisa - 19 Aufgaben
3. 🥉 Tom - 15 Aufgaben
```

**Motiviert Helfer & zeigt Meister wer gut arbeitet!**

---

## 🔧 Betriebsstunden-Tracking:

### **2 Ansätze:**

**Ansatz A: Manuell (Start)** 
```
Bediener beim Schichtwechsel:
"DMG-DMU50 steht jetzt bei 12.453h"
→ Eingetragen in MDS
→ System berechnet: +8h seit gestern
```

**Ansatz B: Semi-automatisch (später)**
```
Helfer bei Sichtprüfung:
"Betriebsstundenzähler ablesen"
[📷 Foto machen] → OCR erkennt Zahl
→ Automatisch eingetragen
```

**Ansatz C: Automatisch (Phase 6+)**
```
MTConnect/OPC UA:
→ Maschine sendet Betriebsstunden
→ Komplett automatisch
```

**Start: Ansatz A → Später B → Irgendwann C**

---

## 🎯 Zusammenfassung - Wartungssystem:

### **Vorteile:**
```
✅ Helfer haben klare, einfache Aufgaben
✅ Niemand fühlt sich überfordert
✅ Eskalation funktioniert automatisch
✅ Bediener werden entlastet (nur komplexe Sachen)
✅ Meister hat Überblick
✅ Keine Wartung wird vergessen
✅ Audit-Trail für Zertifizierung
✅ Fotos dokumentieren alles
```

### **Skill-Matrix:**
```
Helfer → 30% aller Wartungen (einfach, täglich)
Bediener → 60% (mittel, wöchentlich/monatlich)  
Meister → 10% (komplex, selten)

→ Helfer sind produktiv ausgelastet!
→ Bediener können sich auf Fertigung konzentrieren!
```

---




🤖 Beladeroboter
Eigene Wartungskategorie:

machines:
├── CNC-Maschinen (DMG, Hermle, ...)
└── Automation (Beladeroboter, Palettenwechsler)
    ├── ROBOT-1 (Fanuc)
    ├── ROBOT-2 (Kuka)
    └── PALETTENSYSTEM
```

**Spezielle Wartungen:**
```
Täglich VOR Nachtschicht (17:00 Uhr):
├── Greifer-Sichtprüfung
├── Druckluft prüfen
├── Notaus-Test
├── Kollisionssensoren testen
└── Testlauf mit Dummy-Teil

Wöchentlich:
├── Schmierstellen
├── Kabel/Schläuche prüfen
└── Software-Log checken

Monatlich:
├── Greiferwechsel
└── Kalibrierung
```

**Kritisch:**
```
🚨 Roboter MUSS vor Nachtschicht OK sein!
→ Checklist MUSS vollständig sein
→ Sonst: Keine Freigabe für Nachtbetrieb
→ Eskalation zu Meister
```

---

## 🎯 Workflow Beladeroboter:

**16:30 Uhr - Bediener/Helfer:**
```
┌────────────────────────────────────┐
│ ⚠️ Nachtbetrieb vorbereiten!       │
├────────────────────────────────────┤
│ ROBOT-1 Checklist (MUSS):         │
│ □ Greifer geprüft                  │
│ □ Druckluft OK                     │
│ □ Notaus getestet                  │
│ □ Sensoren OK                      │
│ □ Testlauf durchgeführt            │
│                                    │
│ Status: 3/5 erledigt               │
│ ⏰ Noch 30 Minuten bis Schichtende│
│                                    │
│ [Checklist öffnen]                 │
└────────────────────────────────────┘

17:00 Uhr - System prüft:
javascriptif (robotChecklist.complete) {
  ✅ "ROBOT-1 für Nachtbetrieb freigegeben"
  → Maschine kann starten
} else {
  🚨 "ROBOT-1 Checklist unvollständig!"
  → Benachrichtigung an Meister
  → Maschine startet NICHT automatisch
}
```

---

## 🔔 Benachrichtigungen:

**16:00 Uhr:**
```
📱 Push an zuständigen Bediener:
"ROBOT-1: Nachtbetrieb-Checklist in 1h fällig!"
```

**16:45 Uhr (wenn nicht erledigt):**
```
🚨 Push an Meister:
"ROBOT-1: Checklist noch nicht komplett!
 Noch 15 Minuten bis Schichtende"
```

**17:00 Uhr (wenn immer noch nicht):**
```
🚨🚨 Alarm:
"ROBOT-1: NICHT bereit für Nachtbetrieb!"
→ Meister muss entscheiden
→ Nachtbetrieb JA/NEIN
```

---

## 📋 Helfer-Verteilung (3 Personen):

**Beispiel-Tagesplan:**
```
Helfer 1 (Max):
├── 07:00: Ölstände alle Maschinen (30min)
├── 09:00: Späne DMG + Hermle (45min)
├── 14:00: Sichtprüfung Roboter (30min)
└── 16:30: Robot-Checklist (30min)

Helfer 2 (Lisa):
├── 07:30: Kühlmittel prüfen (30min)
├── 10:00: Späne Mazak + Emco (45min)
└── 15:00: Allgemeine Ordnung (laufend)

Helfer 3 (Tom):
├── 08:00: Reserve/Springer
├── Bei Eskalationen einspringen
└── Unterstützung wo nötig
System schlägt vor, Meister kann anpassen!
