# Session 21. Oktober 2026 – Release 2.13.0

**PRs:** #186 – #189 (gemergt), #190 Release 2.13.0 (Merge und Deploy durch Nutzer) · Arbeit auf dem Dev-Server `homepi`

Zeitmodell-Verlauf abgeschlossen (Schritt 4, Spalte entfernt), `deploy.sh` und `restore.sh` abgesichert, Kleinkram aus der Fix-Liste und der Versionshinweis im Frontend. Beim Vorbereiten des Releases fiel auf, dass Änderungen am `Caddyfile` beim Deploy nicht ankommen.

---

## Erledigt

| PR | Inhalt |
|---|---|
| #186 | **Zeitmodell-Verlauf Schritt 4:** `users.time_model_id` per Migration `1737000120000` entfernt (`down` rekonstruiert die Spalte aus dem Verlauf). `PUT /api/users/:id` nimmt `time_model_id` weiter an (Erstzuordnung → Verlaufseintrag), Löschen eines Zeitmodells prüft nur noch den Verlauf, Spiegel-Update in `timeModelChangeService` entfernt |
| #187 | **`deploy.sh`:** Backup per `backup.sh` direkt vor der Migration (Abbruch bei Fehler), Frontend-Build nach `.cache/frontend-dist` und Tausch per `rsync -a --delete-delay --delay-updates` erst nach Erfolg, Autostash bricht bei Fehlern von `stash push`, `pull` und `stash pop` ab |
| #188 | **Kleinkram:** `restore.sh` aus jedem Ordner, prüft Backup (gzip + Endmarke) vor dem `DROP`, Import mit `pipefail` + `ON_ERROR_STOP`; `.migrationrc.json` entfernt; Sidebar-ESLint (toter State, Effekt-Abhängigkeit, Regel `react/jsx-uses-vars`) |
| #189 | **Versionshinweis:** Banner „Neue MDS-Version X verfügbar“ im Kopf (Prüfung beim Laden, bei Fokus/Tabwechsel höchstens alle 10 s, alle 5 min), Reload bei `vite:preloadError` (Sperre 60 s); Caddy setzt `no-store` auch für Deep-Links |
| #190 | **Release 2.13.0** – offen, Nutzer mergt und deployt |

## Produktion

- **Vor Schritt 4 geprüft** (rpi01): kein Mitarbeiter mit Zeitmodell nur in `users.time_model_id` (0 Zeilen)
- **Deploy 2.13.0** steht aus – läuft noch mit der alten `deploy.sh` (manuelles Backup), danach `docker compose restart caddy`

## Entscheidungen

- **Frontend-Tausch per `rsync` statt `mv`:** Caddy hat `frontend/dist` als Bind-Mount; ein umbenannter Ordner wäre für den Container unsichtbar (getestet: Container liefert danach weiter den alten Inhalt)
- **`restore.sh` Variante a + b:** Backup vor dem Löschen prüfen und Import abbrechen statt still weitermachen – die alte Fassung meldete bei SQL-Fehlern „✅ Restore abgeschlossen“
- **Versionshinweis Variante A:** Banner mit Knopf, kein automatisches Neuladen (ungespeicherte Eingaben). Auto-Reload beim Seitenwechsel (B) erst, wenn A im Alltag nicht reicht
- **Caddy-Fix im selben PR wie das Banner:** ohne `no-store` für Deep-Links hätte „Neu laden“ dort nicht zuverlässig geholfen
- **Version 2.13.0** (Minor), weil der Versionshinweis neue Funktion ist

## Hinweise / Lehren

- **Einzeldatei als Bind-Mount behält die alte Datei:** `git pull` schreibt das `Caddyfile` neu (neue Inode), der Container sieht weiter die alte – `caddy reload` lädt die alte Konfiguration, erst ein Neustart holt die neue. Ordner-Mounts (wie `frontend/dist`) sehen Änderungen am Inhalt, aber keinen ersetzten Ordner. Getestet mit Wegwerf-Containern; Fix-Punkt in der ROADMAP
- **Laufendes Skript nach `git pull`:** Bash hat die alte `deploy.sh` geöffnet – eine neue Fassung wirkt erst beim Deploy danach
- **Deep-Links ohne Cache-Header:** Browser cachen heuristisch (rund 10 % der Zeit seit `Last-Modified`). Header in Caddy mit `header ?Cache-Control …` im SPA-Fallback setzen – das `?` lässt den Asset-Header stehen, die API bleibt unberührt
- **`vite:preloadError`** feuert Vite auch für einfache `import()`-Aufrufe (3D-Viewer), im Build geprüft. Reload-Sperre nur mit funktionierendem `sessionStorage`, sonst droht eine Schleife
- **Polling testen:** Playwright `page.clock.install()` + `runFor()` prüft ein 5-Minuten-Intervall in Sekunden; `/api/health` per `page.route()` mit anderer Version beantworten
- **ESLint `varsIgnorePattern`** greift nicht für destrukturierte Props (`icon: Icon`) – `react/jsx-uses-vars` ist die richtige Regel
- **PIPESTATUS in `( … | grep )`** liefert den Status der Subshell, nicht der Pipe-Glieder – direkt messen

## Offen

- **Deploy 2.13.0** mit Checkliste (manuelles Backup, Caddy-Neustart, Banner, Mitarbeiter-Einstellungen, Sidebar), danach Tag `v2.13.0`
- **`deploy.sh` und `Caddyfile`:** dauerhafte Lösung (Neustart bei Änderung oder Ordner-Mount) – Fix-Liste
- Caddy: 404 statt `index.html` für fehlende `/assets/*` (kosmetisch)
- Test am Handy (Mitarbeiter-Einstellungen aus 2.12.0)
- Siehe ROADMAP „Nächste Session“
