#!/bin/bash
# MDS Datenbank Backup Script
# Cronjob (root): 30 2 * * * /home/rpi01/mds/scripts/backup.sh >> /srv/mds/backups/backup.log 2>&1
# Manuell:        sudo ./scripts/backup.sh   (Backup-Ordner gehört root)

set -euo pipefail

# Compose-Befehle aus dem Repo-Root (Cron startet z. B. in /root → sonst „no configuration file provided“)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

BACKUP_DIR="${BACKUP_DIR:-/srv/mds/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/mds_backup_$TIMESTAMP.sql.gz"
KEEP_DAYS=7
MIN_BYTES=10240                                  # alles darunter ist sicher kein vollständiger Dump
END_MARKER="PostgreSQL database dump complete"   # letzte Kommentarzeile jedes vollständigen pg_dump

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
fail() {
  rm -f "$BACKUP_FILE"
  log "❌ $* – Backup verworfen, alte Backups bleiben erhalten"
  exit 1
}

if [ ! -w "$BACKUP_DIR" ]; then
  log "❌ Keine Schreibrechte auf $BACKUP_DIR (Benutzer: $(whoami)) – manuell mit: sudo $0"
  exit 1
fi

# Backup erstellen
log "📦 Erstelle Backup: $BACKUP_FILE"
if ! docker compose -f "$REPO_ROOT/compose.yaml" exec -T db pg_dump -U mds mds | gzip > "$BACKUP_FILE"; then
  fail "pg_dump fehlgeschlagen"
fi

# Backup prüfen: Mindestgröße + Endmarke
SIZE_BYTES=$(stat -c %s "$BACKUP_FILE")
if [ "$SIZE_BYTES" -lt "$MIN_BYTES" ]; then
  fail "Backup zu klein ($SIZE_BYTES Bytes)"
fi
MARKER_COUNT=$(gunzip -c "$BACKUP_FILE" | grep -c "$END_MARKER" || true)
if [ "${MARKER_COUNT:-0}" -lt 1 ]; then
  fail "Backup unvollständig (Endmarke „$END_MARKER“ fehlt)"
fi

# Aufräumen – erst nach erfolgreichem, geprüftem Backup
log "🗑️  Lösche Backups älter als $KEEP_DAYS Tage und unbrauchbare Dateien (< $MIN_BYTES Bytes)..."
find "$BACKUP_DIR" -name "mds_backup_*.sql.gz" -mtime +$KEEP_DAYS -delete
find "$BACKUP_DIR" -name "mds_backup_*.sql.gz" -size -${MIN_BYTES}c -delete

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "✅ Backup erstellt und geprüft: $BACKUP_FILE ($SIZE)"

COUNT=$(ls -1 "$BACKUP_DIR"/mds_backup_*.sql.gz 2>/dev/null | wc -l)
log "📊 Vorhandene Backups: $COUNT"
