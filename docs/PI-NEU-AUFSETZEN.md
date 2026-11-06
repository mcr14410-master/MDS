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
   (`.env`) oder werden neu angelegt.
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
   } | sudo tee /srv/sd-rettung/bestand-$(date +%F).txt
   ```
   Für die Task-App dasselbe: Ordner, Einstellungsdatei und Start-Befehl notieren (siehe deren Repo).
3. **Frische Backups**:
   ```bash
   cd ~/mds && sudo ./scripts/backup.sh && sudo ./scripts/backup-offsite.sh
   ```
4. **restic-Passwort** liegt am zweiten Ort (Passwort-Safe/Tresor)? Sonst jetzt: `sudo cat /root/.mds-restic-password`.

## Phase B – neue Karte vorbereiten (am PC)

1. Raspberry Pi Imager → Raspberry Pi 5 → **Raspberry Pi OS (64-bit)**, Lite genügt, wenn am Pi kein
   Bildschirm/Desktop genutzt wird.
2. In den Imager-Einstellungen: Hostname wie bisher, Benutzer wie bisher (Pfade in Crontab und Doku hängen
   daran), SSH an, Zeitzone Europe/Berlin, Tastatur de.

## Phase C – Wechsel

1. Altes System sauber stoppen (Postgres auf der SSD wird sauber beendet):
   ```bash
   cd ~/mds && docker compose down
   # Task-App ebenso stoppen
   sudo shutdown -h now
   ```
2. Karte tauschen (alte beschriften, nicht wiederverwenden), Pi starten, per SSH anmelden.
3. **Netzwerk:** feste IP wie vorher (DHCP-Reservierung am Router, oder die Verbindung aus der Rettung,
   `/etc/NetworkManager/system-connections/`).
4. **SSD einhängen:** `/srv`-Zeile aus der alten fstab (Bestandsaufnahme) übernehmen, dann
   ```bash
   sudo mkdir -p /srv && sudoedit /etc/fstab   # /srv-Zeile mit UUID einfügen
   sudo mount -a && ls /srv/mds
   ```
5. **Rettung zum Nachschlagen auspacken:**
   ```bash
   sudo mkdir -p /root/sd-alt && sudo tar -xzf /srv/sd-rettung/sd-rettung-*.tgz -C /root/sd-alt
   ```
6. **Pakete:**
   ```bash
   sudo apt update && sudo apt full-upgrade -y
   sudo apt install -y git cifs-utils restic
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker $USER   # danach ab- und wieder anmelden
   ```
7. **MDS:**
   ```bash
   cd ~ && git clone https://github.com/mcr14410-master/MDS.git mds && cd ~/mds
   sudo cp /root/sd-alt/home/$USER/mds/.env .env && sudo chown $USER: .env
   ```
   Die `.env` muss **genau** die alte sein (DB-Passwort passt sonst nicht zur vorhandenen Datenbank).
   Fehlt oder ist sie beschädigt: aus dem Netzlaufwerk-Backup holen (DEPLOYMENT.md, „Snapshots ansehen und
   wiederherstellen“). Weitere ignorierte Dateien laut Bestandsaufnahme ebenso zurückkopieren.
   ```bash
   chmod +x scripts/*.sh && ./scripts/deploy.sh 2>&1 | tee ~/deploy-neu.log
   ```
   Keine neuen Migrationen; `init.sh` **nicht** ausführen. Health-Check zeigt die aktuelle Version.
8. **Task-App** nach demselben Muster (Repo klonen, Einstellungsdatei aus `/root/sd-alt`, starten).
9. **Backups wieder einrichten** (Dateien aus `/root/sd-alt` übernehmen, Rechte wie in DEPLOYMENT.md):
   - `/etc/samba/creds/mds` (`root:root`, `chmod 600`), `/root/.mds-restic-password` (`chmod 600`)
   - `/mnt/mds-offsite` anlegen, fstab-Zeile der Freigabe übernehmen (`nosharesock`!), ebenso die
     Freigabe der Task-App samt deren Zugangsdaten
   - root-Crontab (`sudo crontab -e`) und ggf. Benutzer-Crontab aus der Bestandsaufnahme
   - Test: `cd ~/mds && sudo ./scripts/backup.sh && sudo ./scripts/backup-offsite.sh`

## Phase D – Prüfen

- [ ] MDS im Browser: Anmelden, Bauteile/Programme da, Uploads öffnen sich
- [ ] Administration → Automatische Aufgaben: Backup-Status und Netzlaufwerk-Backup am nächsten Morgen grün
- [ ] Zeiterfassungs-Terminal bucht (Karte auflegen)
- [ ] Mess-PC: Agent meldet sich wieder (Tray-Status)
- [ ] Task-App erreichbar
- [ ] Nach ein paar Tagen: `sudo tune2fs -l $(findmnt -no SOURCE /) | grep -i error` → keine Fehler
