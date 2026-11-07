# Produktions-Pi neu aufsetzen (Systemdatenträger tauschen)

Für den Fall, dass die SD-Karte (System) ausfällt oder getauscht wird. Alle MDS-Daten liegen auf der SSD
unter `/srv` (DB, Uploads, Backups, pgAdmin) und bleiben, wo sie sind – neu aufgesetzt wird nur das System.
Anlass: SD-Karte von rpi01 lieferte am 06.11.2026 beim Lesen fehlerhafte Daten (`EFSBADCRC`, `dpkg -V`
meldete beschädigte Programme, u. a. `/usr/bin/docker`).

Dauer: ca. 1–2 h, MDS und Task-App sind während Phase C nicht erreichbar → nach Feierabend.

---

## Phase A – auf dem alten System (läuft noch)

1. **Rettung der Dateien, die nur auf der SD liegen** (Einstellungen, Crontabs, Zugangsdaten) auf die SSD:
   ```bash
   sudo mkdir -p /srv/sd-rettung
   sudo tar --exclude='node_modules' --exclude='.cache' --exclude='.npm' \
     -czf /srv/sd-rettung/sd-rettung-$(date +%F).tgz \
     /home/rpi01 /etc /root /var/spool/cron 2>&1 | grep -v "Removing leading" | tail -20
   ```
   Lesefehler notieren – diese Dateien sind schon beschädigt und kommen aus dem Netzlaufwerk-Backup
   (`.env`) oder werden neu angelegt. Das Archiv enthält Zugangsdaten, also danach
   `sudo chmod 600 /srv/sd-rettung/*.tgz`.
2. **Bestandsaufnahme** (landet ebenfalls auf der SSD):
   ```bash
   {
   echo "== hostname"; hostname
   echo "== os"; cat /etc/os-release | head -4; uname -r
   echo "== ip"; ip -4 -br addr
   echo "== fstab"; cat /etc/fstab
   echo "== mounts"; findmnt -t ext4,cifs,vfat
   echo "== root-crontab"; sudo crontab -l
   echo "== user-crontab"; crontab -l
   echo "== container"; docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}'
   echo "== home"; ls -la ~
   echo "== ignorierte Dateien im MDS-Repo"; cd ~/mds && git status --ignored --porcelain | grep '^!!' | grep -v node_modules
   echo "== pakete"; apt-mark showmanual
   } | sudo tee /srv/sd-rettung/bestand-$(date +%F_%H%M).txt
   ```
   Für die Task-App dasselbe: Ordner, Einstellungsdatei und Start-Befehl notieren (siehe deren Repo).
3. **Frische Backups** direkt vor dem Herunterfahren, also am Tag des Tauschs noch einmal. Die Uhrzeit im Dateinamen
   verhindert, dass ein abgebrochener Dump einen älteren überschreibt:
   ```bash
   cd ~/mds && sudo ./scripts/backup.sh && sudo ./scripts/backup-offsite.sh
   cd ~/task-app && docker compose exec -T db pg_dump -U task taskapp | sudo tee /srv/sd-rettung/taskapp-$(date +%F_%H%M).sql > /dev/null
   grep -c 'dump complete' /srv/sd-rettung/taskapp-*.sql
   ```
4. **restic-Passwort** liegt am zweiten Ort (Passwort-Safe/Tresor)? Sonst jetzt: `sudo cat /root/.mds-restic-password`.

## Phase B – neue Karte vorbereiten (am PC)

1. Raspberry Pi Imager → Raspberry Pi 5 → **dieselbe OS-Version wie bisher, mit Desktop** (nicht Lite):
   rpi01 läuft auf Bookworm (Debian 12) – im Imager unter „Raspberry Pi OS (other)“ → „Raspberry Pi OS (Legacy,
   64-bit)“, solange Trixie aktuell ist. Grund: Der Kiosk (Task-App-Dashboard am HDMI-Bildschirm) startet über den
   LXDE-Autostart unter X11; ein neueres Image mit Wayland ignoriert diesen Autostart.
2. In den Imager-Einstellungen: Hostname wie bisher, Benutzer wie bisher (Pfade in Crontab und Doku hängen
   daran), SSH an, Zeitzone Europe/Berlin, Tastatur de, WLAN leer. Nach dem Schreiben verifizieren lassen.

## Phase C – Wechsel

1. Altes System sauber stoppen (Postgres auf der SSD wird sauber beendet):
   ```bash
   cd ~/mds && docker compose down
   cd ~/task-app && docker compose down
   sudo shutdown -h now
   ```
2. Karte tauschen (alte beschriften, nicht wiederverwenden), Pi starten, per SSH anmelden. Der SSH-Client meldet
   einen neuen Host-Key, das ist hier erwartet.
3. **Netzwerk:** feste IP wie vorher (DHCP-Reservierung am Router, oder die Verbindung aus der Rettung,
   `/etc/NetworkManager/system-connections/`).
4. **SSD einhängen:** Der Desktop bindet sie beim Start selbst unter `/media/<benutzer>/…` ein, dort erst aushängen.
   `/srv`-Zeile aus der alten fstab (Bestandsaufnahme) übernehmen, dann
   ```bash
   lsblk -f                                    # UUID muss zur alten fstab passen
   sudo umount /media/$USER/<LABEL>
   sudo cp /etc/fstab /etc/fstab.orig
   echo 'UUID=<uuid>  /srv  ext4  defaults,noatime  0  2' | sudo tee -a /etc/fstab
   sudo findmnt --verify                       # 0 errors, die Warnung zum daemon-reload ist hier normal
   sudo systemctl daemon-reload && sudo mount -a && findmnt /srv && ls /srv/mds
   ```
5. **Rettung zum Nachschlagen auspacken:**
   ```bash
   sudo mkdir -p /root/sd-alt && sudo tar -xzf /srv/sd-rettung/sd-rettung-*.tgz -C /root/sd-alt
   ```
6. **Pakete:**
   ```bash
   sudo apt update && sudo apt full-upgrade -y
   sudo apt install -y git cifs-utils restic rsync jq unclutter smbclient smartmontools
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker $USER
   ```
   Was früher von Hand installiert war und jetzt fehlt (einzeln entscheiden, nicht alles nachinstallieren):
   ```bash
   comm -23 <(sudo sed -n '/^== pakete/,$p' /srv/sd-rettung/bestand-*.txt | tail -n +2 | sort -u) <(apt-mark showmanual | sort -u)
   ```
   Danach `sudo reboot`: Das holt den neuen Kernel und die `docker`-Gruppe und prüft die fstab-Zeile, solange noch
   nichts läuft. `findmnt /srv` muss danach ohne Zutun die SSD zeigen.
7. **MDS:**
   ```bash
   cd ~ && git clone https://github.com/mcr14410-master/MDS.git mds && cd ~/mds
   sudo cp /srv/sd-rettung/env/mds.env .env && sudo chown $USER: .env && chmod 600 .env
   git config --global user.name "<name>"; git config --global user.email "<noreply-adresse>"
   git config --global pull.rebase true
   ```
   Die Identität braucht der Autostash von `deploy.sh`. `credential.helper` nicht übernehmen, solange die Repos
   öffentlich sind. Die `.env`-Kopien in `/srv/sd-rettung/env/` entstehen in Phase A; fehlen sie, die Datei aus
   `/root/sd-alt/home/$USER/mds/.env` nehmen.
   Die `.env` muss **genau** die alte sein (DB-Passwort passt sonst nicht zur vorhandenen Datenbank).
   Fehlt oder ist sie beschädigt: aus dem Netzlaufwerk-Backup holen (DEPLOYMENT.md, „Snapshots ansehen und
   wiederherstellen“). Weitere ignorierte Dateien laut Bestandsaufnahme ebenso zurückkopieren.
   ```bash
   ./scripts/deploy.sh 2>&1 | tee ~/deploy-neu.log
   ```
   Keine neuen Migrationen; `init.sh` **nicht** ausführen, auch wenn der Deploy es am Ende erwähnt. Health-Check zeigt die
   aktuelle Version. Die Warnung „DB-Container läuft nicht (Erstinstallation?)“ ist normal. Bricht `rsync` mit
   `Permission denied` ab: `sudo chown -R $USER: frontend/dist` und erneut deployen (bei Ständen vor dem Fix in `deploy.sh`).
8. **Task-App** (Daten: DB `/srv/postgres` und Anhänge `/srv/taskapp/files/attachments` auf der SSD,
   Windows-Freigabe unter `/srv/taskapp/files/share1`):
   - Freigabe: Zugangsdaten `/etc/samba/creds/taskapp` (`root:root`, `chmod 600`) und die `share1`-Zeile der alten
     fstab übernehmen. Die Zeile nutzt `x-systemd.automount`, deshalb:
     ```bash
     sudo systemctl daemon-reload && sudo systemctl start srv-taskapp-files-share1.automount
     ls /srv/taskapp/files/share1 | head -3 && findmnt /srv/taskapp/files/share1   # muss cifs zeigen
     ```
   - Repo klonen nach `~/task-app` (Branch `main`), `.env` aus `/srv/sd-rettung/env/task-app.env`
     (`chown`, `chmod 600`), dann `./scripts/deploy.sh` (Repo der Task-App, `docs/deploy_main.md`);
     Health: `curl -s http://localhost/api/fs/health` (30–60 s nach dem Start)
9. **Kiosk** (Task-App-Dashboard per HDMI):
   ```bash
   sudo raspi-config   # Advanced Options → Wayland → X11; System Options → Boot/Auto Login → Desktop Autologin
   mkdir -p ~/bin ~/.config/lxsession/LXDE-pi
   sudo cat /root/sd-alt/home/$USER/bin/kiosk.sh > ~/bin/kiosk.sh && chmod +x ~/bin/kiosk.sh
   sudo cat /root/sd-alt/home/$USER/.config/lxsession/LXDE-pi/autostart > ~/.config/lxsession/LXDE-pi/autostart
   sudo mkdir -p /etc/X11/xorg.conf.d && sudo cp /root/sd-alt/etc/X11/xorg.conf.d/10-blanking.conf /etc/X11/xorg.conf.d/
   ```
   Prüfen: `grep -E 'autologin|session' /etc/lightdm/lightdm.conf` → Autologin des Benutzers, Session
   `LXDE-pi-x`. Der Autostart setzt Bildschirmschoner aus und die Auflösung (`xrandr`, 4K an HDMI-1); `kiosk.sh`
   wartet auf die Task-App und startet Chromium im Kiosk-Modus. Chromium darf nur über `kiosk.sh` starten, keine
   zweite Chromium-Zeile im Autostart. Nach dem Neustart muss das Dashboard erscheinen, und alle Container müssen
   von selbst hochkommen.
10. **Backups wieder einrichten** (Dateien aus `/root/sd-alt` übernehmen, Rechte wie in DEPLOYMENT.md):
   - `/etc/samba/creds/mds` (`root:root`, `chmod 600`), `/root/.mds-restic-password` (`chmod 600`)
   - `/mnt/mds-offsite` anlegen, fstab-Zeile der Freigabe übernehmen (`nosharesock`!), `sudo systemctl daemon-reload`
   - Test: `cd ~/mds && sudo ./scripts/backup.sh && sudo ./scripts/backup-offsite.sh`
   - root-Crontab und ggf. Benutzer-Crontab aus der Bestandsaufnahme eintragen, kontrollieren mit `sudo crontab -l`.
     Dazu gehört auch das Nacht-Backup der Task-App (Repo der Task-App, `docs/deploy_main.md`), dessen Ordner
     `/srv/taskapp/backups` auf der SSD schon vorhanden ist
   - `xrdp` und VNC bleiben aus, Fernzugang nur per SSH. Mit `sudo diff -rq /root/sd-alt/etc /etc | grep '^Only in /root/sd-alt'`
     prüfen, ob sonst etwas Eigenes in `/etc` lag

## Phase D – Prüfen

- [ ] MDS im Browser: Anmelden, Bauteile/Programme da, Uploads öffnen sich
- [ ] Administration → Automatische Aufgaben: Backup-Status und Netzlaufwerk-Backup am nächsten Morgen grün
- [ ] Zeiterfassungs-Terminal bucht (Karte auflegen)
- [ ] Mess-PC: Agent meldet sich wieder (Tray-Status)
- [ ] Task-App erreichbar, Dashboard läuft nach einem Neustart von selbst auf dem HDMI-Bildschirm
- [ ] Nach ein paar Tagen: `sudo tune2fs -l $(findmnt -no SOURCE /) | grep -i error` → keine Fehler. Danach `/root/sd-alt` und das Rettungsarchiv löschen
