#!/bin/bash
# MDS Datenbank Restore Script
# Verwendung: ./scripts/restore.sh /srv/mds/backups/mds_backup_XXXXXXXX_XXXXXX.sql.gz
#             (aus jedem Ordner aufrufbar; ein relativer Pfad gilt ab dem aktuellen Ordner)

set -eo pipefail

# Compose-Befehle aus dem Repo-Root (sonst „no configuration file provided“)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
END_MARKER="PostgreSQL database dump complete"   # letzte Kommentarzeile jedes vollständigen pg_dump (wie backup.sh)

if [ -z "$1" ]; then
    echo "❌ Fehler: Backup-Datei angeben!"
    echo "   Verwendung: $0 <backup-datei.sql.gz>"
    echo ""
    echo "   Verfügbare Backups:"
    ls -lh /srv/mds/backups/mds_backup_*.sql.gz 2>/dev/null || echo "   Keine Backups gefunden."
    exit 1
fi

if [ ! -f "$1" ]; then
    echo "❌ Fehler: Datei nicht gefunden: $1"
    exit 1
fi

# Pfad absolut machen, bevor ins Repo gewechselt wird
BACKUP_FILE="$(realpath "$1")"
cd "$REPO_ROOT"

# Backup prüfen, bevor die Datenbank gelöscht wird
echo "🔍 Prüfe Backup: $BACKUP_FILE"
if ! gunzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo "❌ Fehler: Backup-Datei ist beschädigt (gzip) – nichts geändert."
    exit 1
fi
MARKER_COUNT=$(gunzip -c "$BACKUP_FILE" | grep -c "$END_MARKER" || true)
if [ "${MARKER_COUNT:-0}" -lt 1 ]; then
    echo "❌ Fehler: Backup unvollständig (Endmarke „$END_MARKER“ fehlt) – nichts geändert."
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
docker compose -f "$REPO_ROOT/compose.yaml" exec -T db psql -U mds -d postgres -c "
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'mds' AND pid <> pg_backend_pid();"

docker compose -f "$REPO_ROOT/compose.yaml" exec -T db psql -U mds -d postgres -c "DROP DATABASE IF EXISTS mds;"
docker compose -f "$REPO_ROOT/compose.yaml" exec -T db psql -U mds -d postgres -c "CREATE DATABASE mds OWNER mds;"

# Backup einspielen – beim ersten Fehler abbrechen statt weiterzumachen
echo "📥 Importiere Backup..."
if ! gunzip -c "$BACKUP_FILE" | docker compose -f "$REPO_ROOT/compose.yaml" exec -T db psql -U mds -d mds -v ON_ERROR_STOP=1; then
    echo "❌ Import fehlgeschlagen – die Datenbank ist UNVOLLSTÄNDIG (die alte wurde bereits gelöscht)."
    echo "   Fehlermeldung oben prüfen und den Restore wiederholen, ggf. mit einem anderen Backup."
    echo "   Bis dahin das MDS nicht benutzen."
    exit 1
fi

echo "✅ Restore abgeschlossen!"
echo "🔄 Backend neustarten empfohlen: docker compose restart backend"
