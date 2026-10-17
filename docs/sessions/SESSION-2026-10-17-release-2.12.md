# Session 17. Oktober 2026 – Release 2.12.0

**PRs:** #178 – #182 (alle gemergt) · **Release 2.12.0** auf dem Pi · Arbeit auf dem Dev-Server `homepi`, teils über Remote Control

Deploy 2.11.0 und Nacht-Lauf abgehakt, ein Wunsch aus dem Betrieb (Tooltip im Kalender) und die drei offenen Punkte der Fix-Liste erledigt, alles als 2.12.0 ausgeliefert.

---

## Erledigt

| PR | Inhalt |
|---|---|
| #178 | **Kalender-Tooltip:** „+N mehr“ zeigt die ausgeblendeten Abwesenheiten, Tagesliste mit Zeitraum je Zeile und Tooltip (ohne Verwaltungsrecht Zeilen statt deaktivierter Buttons). Dazu Release-Checkliste 2.11.0 und Nacht-Lauf abgehakt |
| #179 | **Vorschau Zeitmodell-Verlauf ohne „1 → 1“:** Abwesenheiten nur aufführen/schreiben, wenn der neue Wert vom gespeicherten abweicht |
| #180 | **Mitarbeiter-Einstellungen am Handy:** Spalten Zeitmodell/RFID unter `sm` ausgeblendet, Details weiten die Tabelle nicht auf (`w-0 min-w-full`), Verlaufstabelle schmaler; Urlaubsseite: Kopf bricht um, Rand 16 px, Reiter scrollbar |
| #181 | **Audit-Log-Zeitstempel als `timestamptz`** (Migration `1737000119000`), Altdaten nach Herkunft umgerechnet, Middleware auf zentralen Pool |
| #182 | **Release 2.12.0** |

## Produktion

- **2.11.0** lief seit dem Vorabend, Prüfpunkte grün
- **Nacht-Lauf** `auto_close_open_days` 12.–17.10.: jede Nacht genau ein Lauf um 02:00, `success`, je 8 Mitarbeiter, keine Fehler/Warnungen – vor und nach 2.10.0 gleich
- **Audit-Log vor der Migration geprüft** (Herkunft je `entity_type`, 51 Typen): nur `user_time_model` in Berliner Zeit, alles andere UTC. Erkennbar an Paaren desselben Vorgangs: `parts`/`part` am 09.09. gleiche Uhrzeit, `time-models`/`user_time_model` am 16.10. 2 h auseinander
- **2.12.0 Deploy** ohne Befund, Migration gelaufen, Aktivitäten-Uhrzeiten und Kalender-Tooltip geprüft; Test am Handy folgt in der Firma

## Entscheidungen

- **Handy-Ansicht:** Variante B (Spalten ausblenden) statt eigenem Karten-Layout – eine Darstellung der Zeile, kleiner Diff
- **Audit-Log:** `timestamptz` statt „alles UTC in `timestamp`“ – eindeutig unabhängig von der Zeitzone der Session und des Node-Prozesses
- **Version 2.12.0** (Minor), weil der Kalender-Tooltip neue Funktion ist

## Hinweise / Lehren

- **Annahmen über Altdaten in Produktion prüfen, bevor die Migration sie umrechnet:** Die Fix-Liste nahm an, Teile schrieben Berliner Zeit – tatsächlich hat auch `partsController` einen eigenen Pool. Die Prüfabfrage vor dem Merge hat 19 falsch umgerechnete Einträge verhindert. Paare desselben Vorgangs aus zwei Quellen sind ein guter Beleg
- **Eigene DB-Pools:** rund 30 Controller legen eigene Pools ohne `SET timezone` an → neuer Punkt in der Fix-Liste (erst Diagnose, ob SQL-Datumslogik betroffen ist)
- **Handy-Layout messen statt schätzen:** Playwright mit `scrollWidth` von Seite und Tabelle gegen den Kasten, je Element per `min-content` – so fielen Reiter und Verlaufstabelle als weitere Verursacher auf. 360 px als kleinste Breite mitprüfen
- **Tabellenzelle mit breitem Inhalt:** `w-0 min-w-full` um den Inhalt verhindert, dass er die Tabelle aufweitet
- **Dunkelmodus in Playwright:** MDS schaltet über den eigenen Schalter, nicht über `prefers-color-scheme` – `colorScheme: 'dark'` ändert nichts
- **`node-pg-migrate up <name>`** migriert nicht „bis“ zu dieser Migration – für Tests alles hoch und `down 1`
- **Drei PRs auf `[Unreleased]`/ROADMAP** → beim zweiten und dritten Merge Konflikte, im jeweiligen Branch mit `git merge origin/master` lösen

## Offen

- **Test am Handy** (Mitarbeiter-Einstellungen) in der Firma
- Fix-Liste: **eigene DB-Pools ohne Zeitzone** (Diagnose)
- Zeitmodell-Historie **Schritt 4** (`users.time_model_id` entfernen)
- Siehe ROADMAP „Nächste Session“
