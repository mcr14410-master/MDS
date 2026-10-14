# Session 14. Oktober 2026 – Feiertage in der Zeiterfassung, Mitarbeiter-Einstellungen, Releases 2.9.3 und 2.9.4

**PRs:** #147 – #153 (alle gemergt) · **Releases 2.9.3 und 2.9.4** auf dem Pi (Tags `v2.9.3`, `v2.9.4`) · Arbeit auf dem Dev-Server `homepi`

Schwerpunkt Zeiterfassung: Bundesland und Feiertage einheitlich, drei Rechenwege für Feiertag/Abwesenheit auf eine Regel gebracht, teilweise Abwesenheit. Dazu ein Bedienfehler-Fund aus dem Betrieb (Mitarbeiter-Einstellungen).

---

## Erledigt

| PR | Inhalt |
|---|---|
| #147 | **Bundesland für Feiertage überall aus `default_region`** (`utils/holidayRegion.js`): Urlaubsberechnung, automatisches Erzeugen und Feiertags-API rechneten fest mit „BY“, Zeiterfassung und Kalender filterten gar nicht nach Region – nach einmaligem Umstellen zählten fremde Feiertage dauerhaft für alle. Migration `1737000116000` entfernt `holiday_region`; Hinweis beim Umstellen |
| #148 | **Feiertage in allen Rechenwegen gleich** (`utils/dayAbsence.js`, `calculateDayAbsence`): Die Tagesberechnung schrieb Feiertage mit −Soll, sobald ein Tag neu berechnet wurde (Tagesinfo, Buchung, Korrektur), der Urlaubs-Sync kannte keine Feiertage. Halbe Feiertage vorerst wie bisher im Nacht-Job (`HALF_HOLIDAY_IS_WORKDAY = false`) |
| #149, #150 | **Release 2.9.3**, Checkliste |
| #151 | **Mitarbeiter-Einstellungen** (Verwaltung → Mitarbeiter): jeder Klick speicherte sofort – ein Touchpad-Klick schaltete im Betrieb die Zeiterfassung eines Mitarbeiters ab und entfernte das Zeitmodell (keine Folgen für Salden). Jetzt Übersicht ohne Eingabefelder, Bearbeiten im aufgeklappten Bereich direkt unter dem Mitarbeiter mit Speichern/Abbrechen, Rückfragen bei Zeitmodell-Wechsel und Deaktivieren; „heute“ in Europe/Berlin |
| #152 | **Release 2.9.4** |
| #153 | **Teilweise Abwesenheit** (2 h gearbeitet, dann krank): Urlaubs-Sync füllte bis zum Soll auf (±0), die Tagesberechnung schrieb bei Neuberechnung das volle Soll zusätzlich gut (+2 h). Jetzt überall Auffüllen (Lohnausfallprinzip); Urlaubs-Sync rechnet Tage mit Stempelungen über die Tagesberechnung. Noch nicht released |

Außerdem:
- **Backup-Log** nach 2.9.2 bestätigt: manueller Lauf mit „(manuell, rpi01)“, Cron-Lauf ohne doppelte Zeilen
- **Produktion geprüft (nur lesend):** Feiertage nur Bayern (2025–2031); alle 44 Feiertagstage 2026 ±0; kein Tag mit Abwesenheit und Ist > Soll – für #147, #148, #153 keine Datenkorrektur nötig
- **Abstimmungsvorlage für die Buchhaltung** (halber Feiertag, Krank nach Arbeitsbeginn): PDF lokal in `_lokal/buchhaltung/`, HTML in Drive „Claude-Ausgaben“

## Entscheidungen

- **Eine Rechenregel für Feiertag und Abwesenheit** (`calculateDayAbsence`), von allen Stellen genutzt, die Tageswerte schreiben – mit Tests (`backend/tests/test-day-absence.js`, 16 Fälle)
- **„Feiertage gutschreiben = aus“** reduziert das Soll um den Feiertagsanteil statt −Soll zu ergeben (Saldo gleich, Ist ohne Feiertagsstunden). Produktion steht auf „an“
- **Halber Feiertag** bleibt vorerst „halber Tag frei“, bis die Buchhaltung entschieden hat – Umstellung eine Zeile bzw. Feiertagsliste
- **Teilweise Abwesenheit: bis zum Soll auffüllen** – § 4 EFZG (Lohnausfallprinzip), BAG 5 AZR 470/00; gearbeitete Zeit bleibt erhalten, Gutschrift ist der ausgefallene Rest
- **Mitarbeiter-Einstellungen:** Deaktivieren der Zeiterfassung entfernt weiter das Zeitmodell (ohne Modell rechnet die Urlaubsberechnung Mo–Fr) – jetzt mit Rückfrage

## Hinweise / Lehren

- **Drei Rechenwege für Tageswerte:** `updateDailySummary` (jede Buchung, Korrektur, Tagesinfo, Auto-Abschluss), `generateAbsenceEntries` (Nacht-Job, Tage ohne Eintrag) und `syncDailySummaryForVacation` (Urlaub genehmigen/speichern). Änderungen an Soll/Gutschrift immer in `calculateDayAbsence`
- **Tagesinfo rechnet den Tag neu** – jede Notiz oder jeder Soll-Override löst `updateDailySummary` aus. Fehler in der Tagesberechnung zeigen sich deshalb erst nach einer Bearbeitung
- **Feiertage werden beim ersten Abruf automatisch erzeugt** – auch für ein Bundesland, das nur einmal in den Einstellungen gespeichert wurde; sie bleiben dann in der Tabelle (jetzt unschädlich, weil überall nach `default_region` gefiltert)
- **GitHub drosselt gelegentlich** (HTTP 429 bei `gh pr merge` über GraphQL) – Status per `gh api repos/…/pulls/N` prüfen, Merge per `gh api -X PUT …/pulls/N/merge` wiederholen
- **Testskripte mit Wiederherstellung:** Zeilen nicht löschen und per alter ID zurückschreiben (Eindeutigkeit auf `(user_id, date)`), sondern vorher den Zustand sichern und gezielt zurücksetzen
- **Drive-Upload** über die Schnittstelle nur für kleine Dateien sinnvoll (Binärdateien als base64) – Vorlagen als HTML ablegen (öffnet im Browser, „Als PDF drucken“)
- **npm-Warnung „tar zlib: incorrect data check“** beim Frontend-Build von 2.9.4 – Cache-Eintrag beschädigt, npm hat ihn neu geladen. Bei Wiederholung Speicher prüfen (Release-Checkliste)

## Offen

- Buchhaltung: halber Feiertag (A/B/C) und Krank nach Arbeitsbeginn bestätigen – danach mit #153 als nächstes Release
- „ab“-Datum oder Zeitmodell-Historie (Entscheidung)
- Time-Terminal auf dem Terminal-Pi deployen (Chip-Wechsel-Fix)
- Siehe ROADMAP „Offene Fixes“ und „Nächste Session“
