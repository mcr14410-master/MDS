#!/bin/bash
# MDS Datenbank Restore Script
# Verwendung: ./restore.sh /srv/mds/backups/mds_backup_XXXXXXXX_XXXXXX.sql.gz

set -e

if [ -z "$1" ]; then
    echo "❌ Fehler: Backup-Datei angeben!"
    echo "   Verwendung: $0 <backup-datei.sql.gz>"
    echo ""
    echo "   Verfügbare Backups:"
    ls -lh /srv/mds/backups/mds_backup_*.sql.gz 2>/dev/null || echo "   Keine Backups gefunden."
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Fehler: Datei nicht gefunden: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  ACHTUNG: Dies überschreibt die aktuelle Datenbank!"
echo "   Backup: $BACKUP_FILE"
read -p "   Fortfahren? (ja/nein): " CONFIRM

if [ "$CONFIRM" != "ja" ]; then
    echo "❌ Abgebrochen."
    exit 1
fi

echo "🔄 Restore gestartet..."

# Aktive Verbindungen trennen und DB neu erstellen
docker compose exec -T db psql -U mds -d postgres -c "
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'mds' AND pid <> pg_backend_pid();"

docker compose exec -T db psql -U mds -d postgres -c "DROP DATABASE IF EXISTS mds;"
docker compose exec -T db psql -U mds -d postgres -c "CREATE DATABASE mds OWNER mds;"

# Backup einspielen
echo "📥 Importiere Backup..."
gunzip -c "$BACKUP_FILE" | docker compose exec -T db psql -U mds -d mds

echo "✅ Restore abgeschlossen!"
echo "🔄 Backend neustarten empfohlen: docker compose restart backend"
