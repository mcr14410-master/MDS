# pgAdmin für MDS

pgAdmin ist ein Web-basiertes Datenbank-Management-Tool für PostgreSQL.

## Installation

### 1. Verzeichnis anlegen

```bash
sudo mkdir -p /srv/mds/pgadmin
sudo chown -R 5050:5050 /srv/mds/pgadmin
```

### 2. Container starten

```bash
cd /srv/mds
docker compose up -d pgadmin
```

### 3. Zugriff

Öffne im Browser: `http://<server-ip>:5050`

**Standard-Login:**
- E-Mail: `admin@mds.local`
- Passwort: `admin`

## Datenbank-Server verbinden

Nach dem ersten Login muss die MDS-Datenbank verbunden werden:

1. Rechtsklick auf "Servers" → "Register" → "Server..."
2. Tab "General": Name = `MDS`
3. Tab "Connection":

| Feld | Wert |
|------|------|
| Host | `db` |
| Port | `5432` |
| Database | `mds` |
| Username | `mds` |
| Password | *dein DB_PASSWORD* |

4. "Save" klicken

## Eigene Zugangsdaten setzen (Optional)

In der `.env` Datei im MDS-Verzeichnis:

```env
PGADMIN_EMAIL=deine@email.de
PGADMIN_PASSWORD=sicheres_passwort
```

Danach Container neu starten:

```bash
docker compose down pgadmin
docker compose up -d pgadmin
```

## Nützliche Funktionen

- **Query Tool:** SQL direkt ausführen (Rechtsklick auf Datenbank → Query Tool)
- **Backup/Restore:** Datenbank sichern und wiederherstellen
- **Tabellen bearbeiten:** Daten direkt in Tabellenansicht ändern
- **Schema Browser:** Tabellen, Views, Funktionen durchsuchen

## Sicherheitshinweis

⚠️ Port 5050 sollte **nicht öffentlich** erreichbar sein!

Empfehlung: Zugriff nur im lokalen Netzwerk oder per VPN.

Falls eine Firewall aktiv ist:

```bash
# Nur lokales Netzwerk erlauben (Beispiel für ufw)
sudo ufw allow from 192.168.0.0/24 to any port 5050
```

## Troubleshooting

**Container startet nicht:**
```bash
# Logs prüfen
docker compose logs pgadmin

# Berechtigungen prüfen
ls -la /srv/mds/pgadmin
```

**Verbindung zur DB fehlgeschlagen:**
- Host muss `db` sein (Docker-interner Name), nicht `localhost`
- Passwort muss mit `DB_PASSWORD` in `.env` übereinstimmen
