# Session 7./8. November 2026 – Release 2.20.0 abgeschlossen, Erstimport-Weg, Einrichteblatt-Freigabe, Release 2.21.0

**PRs:** #317, #318, #319, #320, #321, #322 · Arbeit auf dem Dev-Server `homepi`, Deploy auf rpi01 durch den Nutzer

---

## Erledigt

- **Release 2.20.0:** Prüfpunkte im Produktiv-MDS grün (Programmnummer vorbelegt, `.p2x`, Uhrzeiten im Ablauf), Checkliste „Erledigt“ (#317)
- **Erstimport Messprogramme (Schritt 7):** Weg „nach Bedarf“ entschieden, erst Probelauf von Hand über den vorhandenen Upload (siehe Entscheidungen)
- **Einrichteblatt-Karte und Formular (#318):** Knopf „Öffnen“, Icons, Fotoanzahl, nach dem Anlegen direkt ins Blatt, Maschine aus dem Arbeitsgang, Feld „Programm“, keine Meldung „Unbekannter Steuerungstyp“
- **Einrichteblatt-Freigabe und Stände:** Spec (#319), Umsetzung (#320). Freigabe wie bei Programmen, Stand je Freigabe, Rückfall auf Entwurf bei Änderung, Zurückgehen mit Sicherung, Recht `setup_sheet.update`, Rechteprüfung auf dem Server
- **Release 2.21.0 (#321):** deployt am 08.11., Recht an die Rollen vergeben, Prüfpunkte grün (#322)

| PR | Inhalt |
|---|---|
| #317 | Release 2.20.0 als erledigt |
| #318 | Einrichteblatt: Karte, Formular, Maschine aus dem Arbeitsgang |
| #319 | Spec Einrichteblatt-Freigabe und Stände |
| #320 | Einrichteblatt: Freigabe, Stände, Recht, Migration `1737000128000` |
| #321 | Release 2.21.0 |
| #322 | Release 2.21.0 als erledigt |

## Entscheidungen des Nutzers

- **Erstimport nach Bedarf:** 50–100 Programme, unterschiedlich gepflegt. Ein Programm kommt ins MDS, wenn das Bauteil wieder dran ist. Übernommene Altdaten verschiebt der Nutzer in einen eigenen Ordner, das ist die Übersicht. Eine Liste im MDS oder ein Agent-Scan erst, wenn der Probelauf zeigt, dass es fehlt
- **Ausgabepfade:** stellt der Nutzer beim Aufarbeiten alter Programme selbst auf einen zentralen Ort um. Ein Protokoll im alten Pfad ist unkritisch, eine Warnung beim Upload vorerst nicht nötig
- **Einrichteblatt:** Freigabe wie bei Programmen, Zurückgehen auf alte Stände. Bediener, Fräser und Dreher dürfen Blätter erweitern, über ein eigenes Recht statt `part.update`. Jede Änderung setzt ein freigegebenes Blatt auf Entwurf
- **Später am Maschinenterminal:** Blatt direkt optimieren (mit Anmeldung), optimiertes Programm über den Eingang einreichen (Spec Abschnitt 9)

## Befunde

- **Variante anlegen mit „Einrichteblätter kopieren“** bricht ab, wie schon „NC-Programme kopieren“ (fehlende Spalten, ROADMAP)
- **Workflow-Schritte bei Programmen:** Der Server prüft nur das Recht, nicht den Schritt (ROADMAP). Beim Einrichteblatt prüft er jetzt
- **Ablauf-Uhrzeit im Dev-MDS 1 h zu früh:** `workflow_history` speichert UTC in `timestamp`, das Dev-Backend läuft in Berlin. In Produktion korrekt, mit Test-Backend in UTC geprüft (ROADMAP)
- **Abschluss-Prüfung durch einen unabhängigen Reviewer:** fünf wichtige Punkte vor dem Merge behoben, darunter Altbestand mit leeren Texten (wäre beim ersten Speichern auf Entwurf gefallen) und eine Freigabe parallel zu einer Änderung. Kleinere Punkte in der ROADMAP (Preset 0, `updated_at` in zwei Zeitbasen, Notizen nicht leerbar)

## Lehren

- **Prod-Abfrage vor der Migration** hat die echten Rollen gezeigt: Ohne sie wären Fräser und Dreher nach dem Release ausgesperrt gewesen
- **Altbestand anders als neue Daten:** Tests mit frisch angelegten Blättern übersehen, was alte Formulare gespeichert haben (`''` statt `null`). Der Reviewer fand es mit echten Altdaten
- **UI-Tests gegen Wegwerf-Backend:** Worktree mit verlinkten `node_modules`, eigenes Backend (Port 5099, `TZ=UTC` wie in Produktion) und Vite (127.0.0.1:5175). Selektoren mit `button:text-is(...)`, weil Icon-Knöpfe über ihr `title` denselben Namen tragen

## Nächste Sitzung

1. Heute früh: Backup und Netzlaufwerk unter „Automatische Aufgaben“ grün, `/srv/taskapp/backups/backup.log` mit dem ersten Cron-Lauf (erster Nachtlauf auf der neuen SD-Karte)
2. Probelauf Erstimport: Befunde des Nutzers auswerten, danach Konzept 5.5 und ROADMAP Schritt 7 anpassen
3. Nach ein paar Tagen: `tune2fs`, `/root/sd-alt` und `/srv/sd-rettung` aufräumen, dann monatliches SD-Image (Backup-Konzept Ebene 3)
4. Kleinere Befunde aus „Offene Fixes“ nach Bedarf (Preset 0, Variante kopieren, Workflow-Schritte bei Programmen)
