# Session 16. Oktober 2026 – Releases 2.10.0, 2.10.1, 2.11.0

**PRs:** #166 – #176 (alle gemergt) · **Releases 2.10.0, 2.10.1** auf dem Pi, **2.11.0** getaggt (Deploy bei Session-Ende noch offen) · Arbeit auf dem Dev-Server `homepi`, teils über Remote Control

Zeitmodell-Verlauf ausgeliefert und in Produktion an zwei Mitarbeitern angewendet, dabei einen Fehler in der Vorschau gefunden und behoben. Danach eine Reihe kleinerer Fixes (Rollenfarben, Kalender, Verwaltung, Abwesenheit löschen) als 2.11.0.

---

## Erledigt

| PR | Inhalt |
|---|---|
| #166 | **Release 2.10.0** – Zeitmodell-Verlauf Schritt 1–3, Testsammlung (Migration `1737000117000`) |
| #167, #168 | **Fix + Release 2.10.1:** Vorschau/Übernehmen im Zeitmodell-Verlauf berücksichtigt nur Abwesenheiten, deren Tageszahl sich durch die Änderung ändert (alt gegen neu berechnet statt gegen den gespeicherten Wert) |
| #169 – #172 | Doku: Release-Checkliste (2.10.0/2.10.1 erledigt, korrigierte Prüfabfrage), Klärung Mitarbeiter 13, neue Punkte in der Fix-Liste |
| #173 | **Farbe je Rolle** – Spalte `roles.color` mit fester Palette (Migration `1737000118000`), Farbwahl im Rollen-Dialog, gemeinsame `utils/roleColors.js` statt fünf Kopien. „Rollen deaktivieren“ entfällt |
| #174 | **Abwesenheit löschen/ändern rechnet Tageswerte nach** (vorher blieben Status und Gutschrift stehen) |
| #175 | **Verwaltung und Kalender:** Mitarbeiter unter Einstellungen, Tab/Bereich/Unterpunkt in der Adresse („Zurück“ aus dem Zeitkonto landet bei den Zeitkonten), Kalender „+N mehr“ sichtbar und klickbar, Klick ohne Verwaltungsrecht ohne Fehler |
| #176 | **Release 2.11.0** |

## Produktion

- **2.10.0 Deploy:** Migration gelaufen, je Mitarbeiter mit Zeitmodell ein Verlaufseintrag ab „ab“-Datum (8 Mitarbeiter)
- **Prüfabfrage vor dem Release** (Tageswerte/Urlaube vor dem „ab“-Datum): bei 6 Mitarbeitern Brückentage um den 02./05.01. (nur Urlaub, Saldo 0, unkritisch); **Mitarbeiter 13** mit 17 gestempelten Tagen und Überstundenabbau im 1. Quartal vor dem „ab“-Datum 01.04.
- **Mitarbeiter 13 – Verlauf an die gespeicherten Werte angepasst:**
  - Nachtrag „4-Tage 32h (Fr. frei)“ ab 01.01.2026 (Vorschau zeigte zuerst drei Überstundenabbau-Einträge im April 1 → 0 → abgebrochen, Fix 2.10.1, danach Vorschau leer, übernommen)
  - Im April noch nach „Fr. frei“ gerechnet (Montage frei, ausgeglichen mit Überstundenabbau – Workaround), ab Mai „Mo. frei“ → Eintrag „Mo. frei“ von 01.04. auf **01.05.** korrigiert (0 Tage, Saldo ±0). Ergebnis: Fr. frei 01.01.–30.04., Mo. frei ab 01.05.; Tage vor April unverändert (21 Tage, Saldo +777 min)
- **Weiterer Mitarbeiter:** Wechsel „Fr. frei“ → „Do. frei“ ab 01.10.2026 über die Oberfläche (Saldo gesamt ±0: Donnerstage +24 h, Freitage −24 h); die Workaround-Zeitausgleiche an den Donnerstagen danach löschen (#85 und #87 am 01.10. waren beide vom Nutzer, kein Systemfehler)

## Entscheidungen

- **Rollen deaktivieren entfällt** – war der Ausweg, solange Standardrollen weder umbenannt noch gelöscht werden konnten
- **Rollenfarben** als feste Palette (8 Farben) statt freier Farbwahl – Tailwind entfernt zur Laufzeit zusammengesetzte Klassen
- **Kalender:** Variante 3 – feste Zellenhöhe, so viele Einträge wie passen, „+N mehr“ mit Tagesliste
- **Verwaltung:** Tabs in der Adresse per `useSearchParams`, Tabwechsel ersetzen den Verlaufseintrag (Browser-Zurück verlässt die Verwaltung statt durch Tabs zu springen)

## Hinweise / Lehren

- **Prüfabfragen vor einem Release** dürfen nur Tabellen nutzen, die es vor der Migration schon gibt – die Abfrage in der Checkliste las aus `user_time_models` (legt erst die Migration an)
- **Vorschau-Logik:** immer „Berechnung alt gegen neu“ vergleichen, nicht „gespeichert gegen neu“ – gespeicherte Werte können aus anderen Gründen veraltet sein (Workarounds, Art-Änderungen). Noch offen: „1 → 1“-Einträge (Fix-Liste)
- **Workarounds aus der Zeit vor dem Verlauf** (Überstundenabbau/Zeitausgleich an getauschten freien Tagen) stecken in den gespeicherten Tageswerten; beim Nachtragen des Verlaufs nach den gespeicherten Sollwerten richten (Abfrage Soll je Monat und Wochentag gegen den Verlauf) und Workaround-Einträge erst **nach** dem Wechsel löschen
- **Skript-Edits per Python:** beim Herausschneiden eines Abschnitts das Ende-Kennzeichen **ab der Startstelle** suchen (`s.index(marker, start)`) – sonst doppelt eingefügter Block (in #175 aufgefallen, weil die Tab-Leiste doppelt erschien; vor dem Commit behoben)
- **Zwei PRs, die beide `[Unreleased]`/ROADMAP ändern,** erzeugen beim zweiten Merge einen Konflikt – erwartet, im Branch des zweiten PRs auflösen (`git merge origin/master`) und `[Unreleased]` nach Added/Changed/Fixed ordnen
- **Desktop-App über SSH:** `superpowers`/`agent-protocols` kommen vom PC und laufen ohne Hooks (SessionStart von superpowers fehlt) – Skills nur auf Zuruf; mit `claude` direkt im Terminal auf homepi laufen die Hooks
- **Remote Control:** Der Client zeigt die „Nächster Schritt“-Box nicht – Fragen gehören dann in den Text

## Offen

- **Deploy 2.11.0** auf dem Pi mit den Prüfpunkten aus der Release-Checkliste (Migration `1737000118000`, umbenannte Rollen einfärben, Klicktests Verwaltung/Kalender)
- **Nacht-Lauf-Kontrolle** seit 2.10.0 (Cron-Protokoll)
- Zeitmodell-Historie **Schritt 4** (`users.time_model_id` entfernen) nach ein paar Tagen ohne Befund
- Fix-Liste: Mitarbeiter-Einstellungen mobil, Audit-Log-Zeitstempel, Vorschau „1 → 1“
- Siehe ROADMAP „Nächste Session“
