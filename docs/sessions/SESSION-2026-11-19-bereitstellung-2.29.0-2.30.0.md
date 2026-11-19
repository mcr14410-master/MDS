# Session 19. November 2026 – Vorschaubild als PNG, Bereitstellung erweitern, Releases 2.29.0 und 2.30.0

**PRs:** #382 bis #388, Task-App #44 · Arbeit auf dem Dev-Server `homepi`, Deploy auf rpi01 durch den Nutzer

---

## Erledigt

| PR | Inhalt |
|---|---|
| #382 | Session-Doku 17.11.2026, Release 2.28.0 in der Checkliste erledigt |
| #383 | Runbook `PI-NEU-AUFSETZEN.md`: Kiosk-Neustart ohne Reboot per `~/bin/kiosk-neustart.sh` (liegt nicht im Repo, Inhalt im Runbook) |
| Task-App #44 | CLAUDE.md der Task-App verweist auf das Neustart-Skript |
| #384 | Vorschaubild eines Messprogramms darf auch `.png` sein (Name wie die `.prg`), weil das Snipping-Tool von Windows 11 standardmäßig PNG speichert |
| #385 | „Auf dem Mess-PC“ zeigt Bezeichnung und Kunden-Zeichnungsnr. des Bauteils |
| #386 | Release 2.29.0 (#379, #384, #385) |
| #387 | Weitere Messprogramme zu einer offenen Bereitstellung hinzufügen: `POST /api/deployments/:id/programs`, Dialog zeigt vorhandene Programme als „schon auf dem Gerät“ und bietet „Hinzufügen“ |
| #388 | Release 2.30.0 (#387), Tag `v2.30.0` |

## Entscheidungen des Nutzers

- **Zweites Programm im selben Arbeitsgang (Variante A):** Statt „Fertig“ und neu bereitstellen werden Programme zur laufenden Bereitstellung hinzugefügt. „Fertig“ gilt dann für alle Programme dieser Bereitstellung. Auslöser war M2 im falschen Arbeitsgang. Der Nutzer verschiebt es in einen eigenen Arbeitsgang, die Funktion bleibt trotzdem sinnvoll.
- **Programmnummer nach dem Löschen:** Ein gelöschtes Programm gibt seine Nummer frei, sie lässt sich von Hand wieder vergeben. Ein archiviertes Programm behält sie. Der Zähler je Bauteil zählt nie zurück, der nächste Vorschlag ist also trotzdem die nächsthöhere Nummer.
- **Ballooning Standalone:** in der ROADMAP vermerkt (#381), weiterhin nur als Idee.

## Lehren

- **Teilenummern in Integrationstests:** Alle `test-*.js` teilen sich eine Wegwerf-DB. `TEIL-0002` und `TEIL-0042` waren schon vergeben (`parts_part_number_key`). Vor dem Anlegen eines neuen Tests die verwendeten Nummern mit `grep -rho "TEIL-00[0-9]*" backend/tests/integration | sort -u` prüfen.
- **Agent ohne Änderung:** Der Agent gleicht pro Abgleich alle Programme jeder Bereitstellung im Manifest ab. Programme, die erst später zu einer Bereitstellung kommen, brauchen deshalb keine Änderung im Agenten. Geprüft ist das bisher nur mit dem simulierten Agenten im Integrationstest. Der Nachweis am echten Gerät steht noch aus (Checkliste 2.30.0, Punkt 3).
- **Playwright mit mehreren Agenten:** Im Dev-MDS gibt es mehrere Geräte, deshalb ist im Dialog keins vorausgewählt. Im Skript muss das Gerät ausdrücklich gewählt werden.

## Nächste Sitzung

1. Deploy 2.29.0 + 2.30.0 auf rpi01 (Nutzer, 20.11.) mit den Prüfpunkten aus der Release-Checkliste. Danach beide Blöcke unter „Erledigt“ eintragen.
2. Am Mess-PC: Wird ein nachträglich hinzugefügtes Programm abgelegt, und räumt „Fertig“ beide Programme ab?
3. Offene Punkte aus der ROADMAP „Offene Fixes“, u. a. Modals und Auswahllisten in Karten (Portal)
