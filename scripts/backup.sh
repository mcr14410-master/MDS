#!/bin/bash
# MDS Datenbank Backup Script
# Für Cronjob: 0 2 * * * /home/pi/mds/scripts/backup.sh

set -e

BACKUP_DIR="/srv/mds/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/mds_backup_$TIMESTAMP.sql.gz"
KEEP_DAYS=7

# Backup erstellen
echo "📦 Erstelle Backup: $BACKUP_FILE"
docker compose exec -T db pg_dump -U mds mds | gzip > "$BACKUP_FILE"

# Alte Backups löschen (älter als KEEP_DAYS)
echo "🗑️  Lösche Backups älter als $KEEP_DAYS Tage..."
find "$BACKUP_DIR" -name "mds_backup_*.sql.gz" -mtime +$KEEP_DAYS -delete

# Backup-Größe anzeigen
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Backup erstellt: $BACKUP_FILE ($SIZE)"

# Anzahl vorhandener Backups
COUNT=$(ls -1 "$BACKUP_DIR"/mds_backup_*.sql.gz 2>/dev/null | wc -l)
echo "📊 Vorhandene Backups: $COUNT"
