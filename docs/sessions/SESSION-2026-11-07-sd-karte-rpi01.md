# Session 6./7. November 2026 – SD-Karte rpi01 getauscht, Task-App-Backup

**PRs:** MDS #313 und dieser Doku-PR, Task-App #43 · Arbeit auf dem Dev-Server `homepi`, alle Schritte auf dem Pi durch den Nutzer

Die defekte SD-Karte von rpi01 ist ersetzt. Phase A–D aus [PI-NEU-AUFSETZEN.md](../PI-NEU-AUFSETZEN.md) sind durchlaufen, die Daten blieben auf der SSD.

---

## Erledigt

- **Neues System:** Endurance-Karte mit Bookworm Legacy (64-bit, Desktop), Hostname und Benutzer wie bisher
- **MDS:** Version 2.20.0, keine neuen Migrationen, Dateien und Downloads geprüft
- **Task-App:** läuft, Freigabe im Container les- und schreibbar
- **Kiosk:** nur noch Fräsen-Ansicht über `kiosk.sh`, der doppelte Chromium-Start ist raus. Nach dem Neustart kommen alle 7 Container und das Dashboard von selbst hoch
- **Backups:** Dump und Netzlaufwerk von Hand getestet, root-Crontab mit beiden Jobs eingetragen
- **Terminal und Mess-PC-Agent:** funktionieren
- **Fernzugang:** nur noch SSH, `xrdp` und VNC bewusst nicht mehr installiert bzw. aus

| PR | Inhalt |
|---|---|
| #313 | `deploy.sh`: `frontend/dist` vor der Caddyfile-Prüfung anlegen |
| Task-App #43 | Nacht-Backup mit geprüftem Dump, Anhängen und `.env` im restic-Repository des MDS |

## Befunde

- **`deploy.sh` auf frischem Klon:** Docker legt den fehlenden Bind-Mount-Ordner als root an, `rsync` scheitert danach (#313)
- **Anleitung wich von der alten fstab ab:** Task-App-Zugangsdaten und Freigabe-Pfad waren falsch, die Anhänge liegen auf der SSD und nicht auf der Freigabe. Korrigiert
- **Rettungsarchiv war für alle lesbar**, obwohl es Zugangsdaten enthält: auf dem Pi auf `600` gesetzt, Anleitung ergänzt
- **Ohne Git-Identität** scheitert der Autostash von `deploy.sh`: gesetzt, Anleitung ergänzt

## Lehren

- `.env`-Kopien mit Prüfsummenvergleich haben den Tausch abgesichert: die neue Karte kam mit dem alten DB-Passwort direkt an die Daten
- Reboot vor dem ersten Deploy prüft die fstab-Zeile, solange noch nichts läuft

## Nächste Sitzung

1. Morgen nach dem Tausch: Backup und Netzlaufwerk unter „Automatische Aufgaben“ grün
2. Task-App #43 mergen und auf dem Pi einrichten; MDS #313 mergen
3. Prüfpunkte 2.20.0 im MDS (Programmnummer vorbelegt, `.p2x`, Uhrzeiten im Ablauf), dann Release-Checkliste „Erledigt“
4. Nach ein paar Tagen: `tune2fs`, danach `/root/sd-alt` und `/srv/sd-rettung` aufräumen
5. Danach: Erstimport vom Netzlaufwerk (Messprogramme Schritt 7)
