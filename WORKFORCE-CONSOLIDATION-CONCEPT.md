# Workforce Management - Konsolidierungskonzept

**Status:** 📋 Geplant (nicht aktiv)  
**Erstellt:** 2025-02-05  
**Priorität:** Niedrig (bei Bedarf)  
**Geschätzter Aufwand:** 20-30h

---

## 🎯 Motivation

Die Urlaubs- und Zeitverwaltung sind historisch gewachsen und inzwischen eng verzahnt:

1. **Ursprung:** Einfacher Urlaubskalender (`vacations`)
2. **Erweiterung:** Vollständige Urlaubsverwaltung mit Anträgen, Genehmigungen, Typen
3. **Hinzugefügt:** Zeiterfassung (`time-tracking`) mit Stempelungen, Zeitmodellen
4. **Heute:** Beide Systeme teilen Mitarbeiter, Feiertage, Abwesenheits-Gutschriften

---

## ❗ Aktuelle Probleme

### Code-Struktur
- **Getrennte Stores:** `vacationsStore.js`, `timeTrackingStore.js` mit überlappender Logik
- **Verstreute Controller:** Abwesenheits-Cron in `timeEntriesController`, Mitarbeiter in `usersController`
- **Unklare Zuständigkeiten:** Wo gehört neue Logik hin?

### Datenmodell
- Urlaub/Abwesenheit und Zeit-Gutschriften eng gekoppelt
- `vacation_types.credits_target_hours` beeinflusst Zeiterfassung
- Mitarbeiter-Einstellungen (RFID, PIN, Zeitmodell) wandern zwischen Modulen

### UI/UX
- Navigation: "Urlaub & Arbeitszeit" – aber intern zwei Systeme
- Einstellungen verteilt: Teils in Urlaub, teils in Zeiterfassung
- Mitarbeiter-Tab musste neu erstellt werden als Brücke

---

## 💡 Zielzustand: Unified Workforce Management

### Neue Struktur

```
/workforce (oder /personal, /hr)
│
├── Backend
│   ├── controllers/
│   │   ├── employeesController.js     # Mitarbeiter, Zeitmodelle, Einstellungen
│   │   ├── absencesController.js      # Urlaub, Krank, Feiertage, Anträge
│   │   ├── timeEntriesController.js   # Stempelungen, Buchungen, Korrekturen
│   │   └── workforceReportsController.js  # Auswertungen, Exporte
│   │
│   ├── routes/
│   │   └── workforceRoutes.js         # Alle Routen konsolidiert
│   │
│   └── services/
│       ├── absenceCreditService.js    # Gutschrift-Logik (Urlaub/Krank → Zeit)
│       └── balanceService.js          # Urlaubskonto, Zeitkonto Berechnungen
│
├── Frontend
│   ├── stores/
│   │   └── workforceStore.js          # Ein Store für alles
│   │
│   ├── pages/
│   │   ├── WorkforceDashboard.jsx     # Übersicht: Wer ist da, Anträge, Saldos
│   │   ├── AbsenceCalendarPage.jsx    # Kalender (wie bisher)
│   │   ├── TimeTrackingPage.jsx       # Zeiterfassung (wie bisher)
│   │   ├── EmployeesPage.jsx          # Mitarbeiter-Verwaltung
│   │   └── WorkforceSettingsPage.jsx  # Alle Einstellungen zentral
│   │
│   └── components/workforce/
│       ├── EmployeeCard.jsx
│       ├── AbsenceRequestForm.jsx
│       ├── TimeEntryRow.jsx
│       └── ...
│
└── Database
    # Keine Änderungen nötig - Schema passt bereits
```

### Vorteile

| Aspekt | Aktuell | Nach Konsolidierung |
|--------|---------|---------------------|
| Neue Feature einbauen | Unklar wo | Klare Zuordnung |
| Code-Duplikate | Viele | Eliminiert |
| Store-Größe | 2 × mittelgroß | 1 × übersichtlich |
| Navigation | Verwachsen | Logisch strukturiert |
| Onboarding neuer Entwickler | Schwierig | Einfacher |

---

## 📋 Migrationsstrategie

### Phase 1: Store-Konsolidierung (8h)
1. Neuen `workforceStore.js` erstellen
2. State aus beiden Stores zusammenführen
3. Actions vereinheitlichen (z.B. `fetchEmployees` statt `fetchUsers` für Zeit-Kontext)
4. Alte Stores als Wrapper behalten (Backwards Compatibility)
5. Schrittweise Komponenten umstellen

### Phase 2: Backend-Konsolidierung (10h)
1. Neue Route-Struktur `/api/workforce/*`
2. Controller aufteilen nach Verantwortung
3. Shared Services extrahieren
4. Alte Routen als Aliase behalten
5. API-Dokumentation aktualisieren

### Phase 3: Frontend-Reorganisation (8h)
1. Komponenten in `/components/workforce/` verschieben
2. Pages umbenennen/umstrukturieren
3. Navigation anpassen
4. Alte Pfade redirecten

### Phase 4: Cleanup (4h)
1. Alte Stores entfernen
2. Alte Routen entfernen
3. Unused Komponenten löschen
4. Dokumentation finalisieren

---

## ⚠️ Risiken & Mitigation

| Risiko | Wahrscheinlichkeit | Mitigation |
|--------|-------------------|------------|
| Regression in bestehender Funktionalität | Mittel | Schrittweise Migration, alte Wrapper behalten |
| Großer Merge-Konflikt | Niedrig | Feature-Freeze während Migration |
| Zeitaufwand unterschätzt | Mittel | Puffer einplanen, Phasen können pausiert werden |

---

## 🚦 Trigger für Start

Die Konsolidierung sollte gestartet werden wenn:

- [ ] Neue Feature-Anforderung unklar einzuordnen ist
- [ ] Signifikante Änderungen an Urlaub ODER Zeit geplant sind
- [ ] Code-Duplikate zu Bugs führen
- [ ] Wartungsaufwand zu hoch wird
- [ ] Zeit verfügbar ist (keine dringenden Features)

**Nicht starten wenn:**
- System funktioniert stabil
- Keine größeren Änderungen geplant
- Andere Prioritäten (z.B. Inventar, Terminal)

---

## 📝 Offene Punkte zur Klärung

1. **Krank + gearbeitet:** Soll Gutschrift addiert werden (Bonus) oder nur Differenz ausgleichen?
   - Klärung mit Chef/Buchhaltung nötig
   - Ggf. neues Feld `credits_bonus_on_work` pro Antragstyp

2. **Naming:** `/workforce` vs `/personal` vs `/hr` vs `/employees`?

3. **Berechtigungen:** Sollen die getrennten Permissions (`vacations.*`, `time_tracking.*`) bestehen bleiben oder zusammengeführt werden zu `workforce.*`?

---

## 📊 Zusammenfassung

| Aspekt | Details |
|--------|---------|
| **Was** | Urlaubs- und Zeitverwaltung zu "Personalverwaltung" zusammenführen |
| **Warum** | Bessere Wartbarkeit, klarere Struktur, einfachere Erweiterung |
| **Wann** | Bei Bedarf, nicht dringend |
| **Aufwand** | 20-30h (in 4 Phasen teilbar) |
| **Risiko** | Niedrig bei schrittweiser Migration |

---

*Dieses Dokument dient als Referenz für eine zukünftige Refactoring-Initiative. Es muss nicht sofort umgesetzt werden.*
