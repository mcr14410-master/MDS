# Session 24. Oktober 2026 – Caddy-Ordner-Mount, Netzlaufwerk-Backup, Release 2.14.0

**PRs:** #193 – #196 (gemergt), Tag `v2.14.0` · Arbeit auf dem Dev-Server `homepi`, Einrichtung und Deploy auf rpi01 durch den Nutzer

Zwei Punkte aus der Fix-Liste bzw. dem Backup-Konzept: Caddy sieht Änderungen am `Caddyfile` jetzt ohne Neustart, und die Daten liegen nicht mehr nur auf der SSD des Pi – restic sichert jede Nacht auf eine Windows-Freigabe im Firmennetz.

---

## Erledigt

| PR | Inhalt |
|---|---|
| #193 | **Caddy:** `Caddyfile` → `caddy/Caddyfile`, eingebunden als Ordner `./caddy:/etc/caddy` (reicht jetzt `reload`). `deploy.sh` prüft das Caddyfile direkt nach `git pull` per Einmal-Container (`docker compose run --rm --no-deps caddy caddy validate`) und bricht vor jeder Umstellung ab – bisher startete ein fehlgeschlagenes `validate` Caddy neu. Eigener `handle /assets/*` → 404 für fehlende Assets, `handle_errors` setzt `no-store` |
| #194 | **Netzlaufwerk-Backup:** `scripts/backup-offsite.sh` (root-Cron 02:45) sichert neuesten geprüften Dump + `/srv/mds/uploads` + `.env` per restic, Freigabe nur während der Sicherung eingebunden (fstab `noauto`), 30 Tage + 12 Monate, sonntags `restic check --read-data-subset=10%`, Statusdatei `offsite-status.json`. Cron-Job `backup_offsite_monitor` (03:05) liest sie. Einrichtung und Wiederherstellung in DEPLOYMENT.md |
| #195 | **Doku:** fstab-Vorlage mit `nosharesock` (siehe unten) |
| #196 | **Release 2.14.0** |

## Produktion

- **Deploy 2.14.0:** Caddy-Mount zeigt auf `…/mds/caddy`, `/parts/12` → `no-store`, `/assets/gibtsnicht.js` → 404 + `no-store`
- **Netzlaufwerk-Backup eingerichtet** (Schritte 1–5): Zugangsdaten `/etc/samba/creds/mds` (`root:root 600`, vorerst persönlicher Benutzer), fstab mit `nosharesock`, restic-Passwort an zweitem Ort, `restic init`. Erster Lauf: Snapshot `599850ec`, 152 Dateien, 67 MB (53 MB gespeichert). Monitor „Netzlaufwerk-Backup“ grün (25.10., 00:05)
- Crontab-Eintrag (Schritt 6): Kontrolle am Morgen – Snapshot muss von ca. 02:45 sein, nicht 23:57

## Entscheidungen

- **Caddy Variante A (Ordner-Mount)** statt Prüfsumme + Neustart: Reload ohne Unterbrechung, auch Änderungen von Hand kommen an. Die Datei zieht dafür um
- **Prüfung des Caddyfile vor dem Deploy** statt beim Reload: mit Ordner-Mount hätte ein Neustart mit ungültiger Datei Caddy lahmgelegt; ein Abbruch vor der Migration lässt alles unverändert
- **restic statt einfacher Dateien:** Versionen, Verschlüsselung, Aufbewahrung in einem Werkzeug; das Passwort muss dafür an einen zweiten Ort (ohne es ist das Backup wertlos)
- **Freigabe nur während der Sicherung eingebunden**, kein `restic init` durch das Skript (Passwort soll bewusst gesichert werden)
- **Monitor über Statusdatei:** der Backend-Container sieht `/srv/mds/backups` schon, die Freigabe selbst nicht
- **Persönlicher Benutzer vorerst** – eigener Backup-Benutzer mit Schreibrecht nur auf „MDS Backup“ bleibt offen
- **Version 2.14.0** (Minor), weil das Backup neue Funktion ist

## Hinweise / Lehren

- **`mount error(13)` nur manchmal:** Auf rpi01 ist eine andere Freigabe desselben Servers mit einem anderen Benutzer eingebunden (Task-App). Der Kernel hängt eine neue Anmeldung an deren Verbindung, der Server lehnt ab – je nach aufgelöster Adresse (Server mit zwei Netzwerkkarten) mal ja, mal nein. `nosharesock` erzwingt eine eigene Verbindung. Über die IP klappte es immer (vermutlich eigene Verbindung, weil der Kernel bestehende Verbindungen auch über den Namen zuordnet). Eingrenzen ging nur mit **Schleifen über mehrere Versuche** – Einzelversuche („mit `vers=3.0` geht es“) waren Zufallstreffer
- **CIFS-Debug auf dem Pi:** `cifsFYI` allein liefert nichts, die Meldungen laufen über dynamic debug, und debugfs ist auf rpi01 nicht eingebunden
- **Test mit den Versionen der Produktion:** Bookworm-Container (restic 0.14.0, cifs-utils 7.0) als privilegierter Container mit eigenem Samba-Server (Freigabe mit Leerzeichen, `smb3 unix extensions = no` wie Windows) – ohne `sudo` auf homepi
- **restic `forget` gruppiert nach Pfaden:** der Dump heißt jeden Tag anders → ohne `--group-by host` würde nie etwas gelöscht. Mit 90 Tagen Historie (`backup --time`) geprüft: 32 Snapshots bleiben
- **`gunzip | grep -q` mit `pipefail`:** `grep -q` bricht beim Treffer ab, `gunzip` bekommt SIGPIPE, die Pipe gilt als fehlgeschlagen – `grep -c` liest bis zum Ende
- **Fehlerantworten erben Header:** Ein 404 unter `/assets/` trug den `immutable`-Header aus dem Matcher; `handle_errors { header Cache-Control "no-store" }` überschreibt ihn
- **Playwright-Login gegen Dev:** Origin muss `http://localhost:5173` sein, `[::1]:5173` scheitert an CORS (`verifyToken` meldet ab)

## Offen

- **Morgen (25.10.):** Netzlaufwerk-Backup mit Snapshot von ca. 02:45 (Crontab greift, Nacht der Zeitumstellung), erstes `restic check` (Sonntag), Probe-Wiederherstellung nach `/tmp/mds-restore`
- Prüfpunkte aus der Release-Checkliste (Versionshinweis, Deploy-Log, Reste aus 2.11–2.13)
- Backup-Konzept: Ebene 3 (Images Pi/Terminals), Anleitung „frischer Pi“, eigener Backup-Benutzer
- Siehe ROADMAP „Nächste Session“
