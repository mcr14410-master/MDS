# Session 17. November 2026 – Pausenprüfung, Grund der Fehlbuchung, Releases 2.27.4 bis 2.28.0

**PRs:** #372 bis #381 · Arbeit auf dem Dev-Server `homepi`, Deploy auf rpi01 durch den Nutzer

---

## Erledigt

| PR | Inhalt |
|---|---|
| #372 | Lücke zwischen Gehen und Kommen ab 15 min zählt als Pause (ArbZG § 4: Abschnitte ab 15 min) |
| #373 | Release 2.27.4 |
| #374 | Neue Meldung „Zu lange ohne Pause“: Arbeitsblock länger als „Pause ab“ + Toleranz ohne Unterbrechung ab 15 min (ArbZG § 4 Satz 3), nur wenn Pausenpflicht besteht |
| #375 | Release 2.27.5 (deployt, Fr 13.11. neu berechnet → Fehlbuchung, keine weiteren Tage betroffen) |
| #376 | Monatsübersicht des Mitarbeiters zeigt den Grund statt nur „Fehlbuchung“ (`utils/missingEntryLabels.js`) |
| #377 | Release 2.28.0 (deployt, grün) |
| #378 | Release-Checkliste 2.27.5: keine weiteren Tage betroffen |
| #379 | Fehlbuchungsliste und Verwaltungs-Übersicht nutzen die zentralen Texte – wartet unter `[Unreleased]` |
| #380 | ROADMAP: Auswahllisten in Arbeitsgang-Karten abgeschnitten (Lösung per Portal zusammen mit den Modals, nicht dringend) |
| #381 | ROADMAP: Ballooning zusätzlich als Standalone-Version (Idee nach Demo beim Chef) |

## Entscheidungen des Nutzers

- **Lücken als Pause:** Ausgestempelte Unterbrechungen ab 15 min zählen zur Pause, kürzere nicht.
- **6 h am Stück:** Prüfung nur unter derselben Bedingung wie die Pausenpflicht (Tag über „Pause ab“ und über Soll + Puffer). Ein kurzer Tag mit 6:02 am Stück bleibt ohne Meldung.
- **Abgeschnittene Auswahllisten:** Variante B (Portal), gemeinsam mit dem ROADMAP-Punkt zu Modals in Karten.
- **Ballooning Standalone:** vorerst nur Idee; Folge für Stufe 1 ist, Parser, Datenformat und PDF-Ausgabe vom MDS getrennt zu halten.

## Lehren

- **Dev-DB im Auto-Modus:** Testbuchungen in `mds-dev-db` schreiben wurde vom Klassifizierer blockiert. Ausweg ohne Umgehung: Integrationstests im Wegwerf-Container (`npm run test:integration`) und Playwright mit abgefangenen API-Antworten für die Oberfläche.
- **Erst Release-PR, dann Tag:** „merged, tag und push“ nach einem Fix-PR heißt: Version ist noch nicht gesetzt → zuerst Release-PR, Tag erst auf dessen Merge-Commit.
- **Theme in Playwright:** Die App liest das Farbschema aus `localStorage` (`theme`), nicht aus `prefers-color-scheme` – im Init-Skript setzen.
- **Puffer aus den Einstellungen nehmen:** Produktion hat `break_threshold_buffer_minutes` 15, der Code-Standard ist 30. Beispielrechnungen immer mit den Werten des Nutzers.

## Nächste Sitzung

1. Nächstes Release enthält #379 (Klicktest in der Release-Checkliste)
2. Offene Punkte aus der ROADMAP „Offene Fixes“, u. a. Modals und Auswahllisten in Karten (Portal)
3. Ballooning Stufe 1 erst auf Anfrage planen, dann den Kern MDS-unabhängig schneiden
