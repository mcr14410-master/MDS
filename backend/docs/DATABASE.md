# 🗄️ Datenbank-Setup - MDS Backend

## Überblick

Das MDS Backend verwendet **PostgreSQL** als Datenbank mit einem vollständigen Migrations- und Seed-System.

### Migrations-Übersicht

| Migration | Beschreibung | Status |
|-----------|-------------|--------|
| `1737000000000_create-auth-system.js` | User, Roles, Permissions, RBAC | ✅ Ready |
| `1737000001000_create-parts-operations.js` | Customers, Parts, Operations | ✅ Ready |
| `1737000002000_create-machines-programs.js` | Machines, Programs, Versionierung, Tools | ✅ Ready |
| `1737000003000_create-audit-log.js` | Audit-Logs, Comments, QR-Codes, Notifications | ✅ Ready |
| `1737000004000_create-maintenance-system.js` | Wartungspläne, Tasks, Checklisten | ✅ Ready |

---

## 📋 Voraussetzungen

### 1. PostgreSQL installieren

**Windows:**
```bash
# Download von: https://www.postgresql.org/download/windows/
# Oder mit Chocolatey:
choco install postgresql
```

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Datenbank erstellen

```bash
# Als postgres User einloggen
sudo -u postgres psql

# In psql:
CREATE DATABASE mds;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE mds TO postgres;

# Verlassen mit: \q
```

---

## 🚀 Erste Einrichtung

### 1. Dependencies installieren

```bash
cd backend
npm install
```

### 2. .env Datei prüfen

Die `.env` Datei sollte bereits existieren. Prüfe die Verbindungsdaten:

```bash
# PostgreSQL Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mds
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mds
DB_USER=postgres
DB_PASSWORD=postgres
```

**⚠️ WICHTIG:** Ändere das Passwort für Production!

### 3. Migrations ausführen

```bash
# Alle Migrations ausführen
npm run migrate:up

# Oder manuell:
npx node-pg-migrate up
```

**Erwartete Ausgabe:**
```
> mds@1.0.0 migrate:up
> 1737000000000_create-auth-system ................... OK
> 1737000001000_create-parts-operations ............. OK
> 1737000002000_create-machines-programs ............ OK
> 1737000003000_create-audit-log .................... OK
> 1737000004000_create-maintenance-system ........... OK
```

### 4. Test-Daten laden (Optional)

```bash
npm run seed
```

**Test-Daten umfassen:**
- ✅ Admin-User (username: `admin`, password: `admin123`)
- ✅ 3 Kunden (Airbus, BMW, Siemens)
- ✅ 3 Maschinen (DMG, Hermle, Mazak)
- ✅ 3 Bauteile mit Arbeitsgängen
- ✅ Test-Werkzeuge
- ✅ Beispiel-Programm mit Revision
- ✅ Wartungsplan

---

## 📊 Datenbank-Schema Highlights

### Auth-System (RBAC)

```
users
  ├─ user_roles (m:n)
  │   └─ roles
  │       └─ role_permissions (m:n)
  │           └─ permissions
```

**Standard-Rollen:**
- `admin` - Vollzugriff
- `programmer` - CAM-Programmierer
- `reviewer` - Prüfer
- `operator` - Maschinenbediener
- `helper` - Helfer (Wartung)
- `supervisor` - Meister

### Produktions-Hierarchie

```
customers
  └─ parts
      └─ operations (OP10, OP20, ...)
          ├─ programs
          │   └─ program_revisions (Versionierung)
          ├─ setup_sheets
          └─ setup_photos
```

### Maschinen & Wartung

```
machines
  ├─ maintenance_plans
  │   └─ maintenance_tasks
  │       ├─ maintenance_checklist_completions
  │       └─ maintenance_photos
  └─ programs (via operations)
```

### Workflow-System

```
workflow_states:
  - draft (Entwurf)
  - review (In Prüfung)
  - approved (Geprüft)
  - released (Freigegeben) ✅
  - rejected (Abgelehnt)
  - archived (Archiviert)
```

---

## 🔧 Migrations-Befehle

### Migration erstellen

```bash
npm run migrate:create -- migration-name
```

### Migrations ausführen

```bash
# Alle ausstehenden Migrations
npm run migrate:up

# Nur eine Migration
npx node-pg-migrate up -c 1

# Bis zu bestimmter Migration
npx node-pg-migrate up 1737000002000
```

### Migrations rückgängig machen

```bash
# Letzte Migration zurücknehmen
npm run migrate:down

# Mehrere Migrations
npx node-pg-migrate down -c 2

# Alle Migrations zurücknehmen (⚠️ VORSICHT!)
npx node-pg-migrate down -c 999
```

### Migration-Status prüfen

```bash
npx node-pg-migrate status
```

---

## 🧪 Datenbank testen

### 1. Connection Test

```bash
psql -h localhost -U postgres -d mds -c "SELECT version();"
```

### 2. Tabellen prüfen

```sql
-- In psql:
\dt

-- Oder mit SQL:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### 3. Test-Login

```sql
SELECT 
  u.username, 
  u.email, 
  r.name as role
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.username = 'admin';
```

**Erwartete Ausgabe:**
```
 username |       email         | role
----------+--------------------+-------
 admin    | admin@example.com  | admin
```

---

## 📈 Performance & Indizes

Alle wichtigen Tabellen haben Indizes für:
- Foreign Keys
- Häufige Suchfelder (part_number, program_number, etc.)
- Status-Felder (is_active, workflow_state_id)
- Timestamp-Felder (created_at, due_date)
- Composite Indizes für JOIN-Queries

### Index-Übersicht prüfen

```sql
SELECT 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

---

## 🔐 Sicherheit

### Standard Admin-Credentials

**⚠️ WICHTIG: Sofort nach erstem Login ändern!**

```
Username: admin
Email: admin@example.com
Password: admin123
```

### Passwort ändern

```sql
-- Neues Passwort-Hash generieren (mit bcrypt)
-- Beispiel: Passwort 'newPassword123'
UPDATE users 
SET password_hash = '$2a$10$NEW_BCRYPT_HASH_HERE'
WHERE username = 'admin';
```

### Weitere User anlegen

Via API oder manuell:

```sql
INSERT INTO users (username, email, password_hash, first_name, last_name)
VALUES (
  'max.mustermann', 
  'max.mustermann@example.com',
  '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', -- admin123
  'Max', 
  'Mustermann'
);

-- Rolle zuweisen
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'max.mustermann' AND r.name = 'programmer';
```

---

## 🐛 Troubleshooting

### Connection refused

```bash
# PostgreSQL läuft nicht
sudo systemctl status postgresql

# Starten
sudo systemctl start postgresql
```

### Permission denied

```bash
# Als postgres User Rechte vergeben
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE mds TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
```

### Migration failed

```bash
# Status prüfen
npx node-pg-migrate status

# Letzte Migration zurücknehmen
npm run migrate:down

# Nochmal versuchen
npm run migrate:up
```

### Datenbank komplett neu aufsetzen

```bash
# ⚠️ ACHTUNG: Löscht ALLE Daten!

# 1. Alle Migrations zurücknehmen
npm run migrate:down -- -c 999

# 2. Datenbank droppen
sudo -u postgres psql -c "DROP DATABASE mds;"
sudo -u postgres psql -c "CREATE DATABASE mds;"

# 3. Migrations neu ausführen
npm run migrate:up

# 4. Seeds laden
npm run seed
```

---

## 📚 Weiterführende Links

- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [node-pg-migrate](https://salsita.github.io/node-pg-migrate/)
- [node-postgres (pg)](https://node-postgres.com/)

---

## ✅ Checkliste für Production

- [ ] Starkes Passwort für `postgres` User
- [ ] Admin-Passwort ändern
- [ ] SSL-Verbindung aktivieren
- [ ] Regelmäßige Backups einrichten
- [ ] Connection Pooling konfigurieren
- [ ] Performance Monitoring (pg_stat_statements)
- [ ] Firewall-Regeln (Port 5432 nur von Backend)
- [ ] .env Datei in .gitignore
- [ ] Separate Prod/Dev Datenbanken

---

**Status:** ✅ **Woche 1 - Datenbank-Schema KOMPLETT!**

🚀 **Nächster Schritt:** Backend API mit Express aufsetzen
