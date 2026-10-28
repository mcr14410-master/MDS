# Session 25.–28. Oktober 2026 – Cron-Jobs bei der Zeitumstellung, Breadcrumbs, Releases 2.14.1/2.14.2

**PRs:** #198 – #208, Tags `v2.14.1`, `v2.14.2` · Arbeit auf dem Dev-Server `homepi`, Prüfungen und Deploy auf rpi01 durch den Nutzer

Fortsetzung der Session vom 24.10. Das Netzlaufwerk-Backup lief in der Nacht der Zeitumstellung durch. Dabei fiel auf, dass zwei MDS-Jobs „Überfällig“ waren: Ursache war ein Fehler in node-cron. Danach folgten die Reste aus den Klicktests 2.11–2.13. Die Breadcrumbs waren eine Mischung aus Englisch und Deutsch und haben die Namen auf den Detailseiten nie geladen.

---

## Erledigt

| PR | Inhalt |
|---|---|
| #198 | **Cron-Jobs bei der Zeitumstellung:** Update auf node-cron 4.6.0. Die drei Nacht-Jobs laufen jetzt um 01:00/01:15/01:30 statt 02:xx; ein Hinweis im Code verbietet Zeiten zwischen 02:00 und 02:59 |
| #199 | Netzlaufwerk-Backup am 25.10. geprüft: Nachtlauf 02:45, `restic check`, Probe-Wiederherstellung 150/150 |
| #200, #201 | **Release 2.14.1** und Deploy, Tag `v2.14.1` |
| #202 | Kontrolle am 26.10.: alle sechs Jobs pünktlich |
| #203, #205, #206 | Prüfpunkte aus 2.11 (Tageswert nach Abwesenheit), 2.13 (Mitarbeiter-Einstellungen, Sidebar) und 2.12 (Handy) nachgeprüft – aus früheren Releases ist nichts mehr offen |
| #204 | **Breadcrumbs:** durchgehend Deutsch, Pfad-Labels für Teile, die je nach Bereich anders heißen. Namen auf Detailseiten werden wieder geladen: Der Import zeigte auf die Basis-URL statt auf die Axios-Instanz, und den Endpunkten fehlte `/api`. Stufen ohne eigene Seite sind Text statt Link |
| #207, #208 | **Release 2.14.2** (Breadcrumbs) und Deploy am 28.10., Tag `v2.14.2`; diese Session-Doku |

## Entscheidungen

- **Variante B bei node-cron:** Das Update allein behebt die Jobs ab 03:00. 4.6.0 lässt aber die Stunde 02:00–02:59 an beiden Umstellungstagen aus (im Frühjahr fehlt sie, im Herbst kommt sie doppelt), deshalb laufen die Nacht-Jobs jetzt um 01:xx
- **Breadcrumbs Variante B:** Labels über den ganzen Pfad statt nur über das Segment (`my`, `admin`, `machines` heißen je nach Bereich anders). Die Zeiterfassung eines Mitarbeiters wird unter „Urlaub & Arbeitszeit › Verwaltung“ eingehängt, weil es `/time-tracking` als eigene Seite nicht gibt
- **Handy-Test aller Seiten** als eigenes Thema in die ROADMAP: Die Mitarbeiter-Einstellungen gehen am Handy, andere Seiten weniger gut

## Hinweise / Lehren

- **Fehler in node-cron 4.2.1:** `LocalizedTime.set` behält am Umstellungstag den alten UTC-Versatz, `matchNext` springt auf den 1. Januar, und der Runner begrenzt die Wartezeit auf 24 h – der Lauf entfällt. Nachgestellt mit dem echten Scheduler und `@sinonjs/fake-timers` (`clock.tickAsync`) über beide Umstellungstage
- **Interne Module von node-cron** sind durch `exports` gesperrt; zum Testen den Pfad unter `node_modules/node-cron/dist/cjs/…` direkt einbinden
- **Playwright für viele Seiten:** Für jede URL eine neue Seite öffnen. Wer eine Seite wiederverwendet, bekommt nach einigen Dutzend Aufrufen `ERR_INSUFFICIENT_RESOURCES`. Der Selektor für die Breadcrumbs muss die Sidebar-Navigation ausschließen (`nav.text-sm:has(> a[href="/"])`)
- **Antwortformate für Detail-Endpunkte uneinheitlich:** `data.data`, `data.part` (Bauteile), `data.user` (Benutzer)

## Offen

- Optional: `caddy fmt` für das Caddyfile (Reload meldet „not formatted“, nur Einrückung)
- Restliche Lint-Meldungen in `Breadcrumbs.jsx` (unbenutztes `index`, useEffect-Abhängigkeiten) – stammen aus der Zeit vor #204
- Siehe ROADMAP „Nächste Session“
