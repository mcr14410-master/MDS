#!/bin/bash
# MDS Backup aufs Netzlaufwerk (restic): neuester DB-Dump + Uploads + .env
# Läuft nach scripts/backup.sh, bindet die Freigabe nur für die Dauer der Sicherung ein.
# Cronjob (root): 45 2 * * * /home/rpi01/mds/scripts/backup-offsite.sh >> /srv/mds/backups/backup-offsite.log 2>&1
# Manuell:        sudo ./scripts/backup-offsite.sh
# Einrichtung (fstab-Eintrag, restic-Passwort, restic init) und Wiederherstellung: DEPLOYMENT.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

BACKUP_DIR="${BACKUP_DIR:-/srv/mds/backups}"
UPLOADS_DIR="${UPLOADS_DIR:-/srv/mds/uploads}"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/.env}"
OFFSITE_MOUNT="${OFFSITE_MOUNT:-/mnt/mds-offsite}"          # Eintrag in /etc/fstab (noauto)
export RESTIC_REPOSITORY="${RESTIC_REPOSITORY:-$OFFSITE_MOUNT/restic}"
export RESTIC_PASSWORD_FILE="${RESTIC_PASSWORD_FILE:-/root/.mds-restic-password}"
STATUS_FILE="${STATUS_FILE:-$BACKUP_DIR/offsite-status.json}"   # liest der Backup-Monitor im MDS

RESTIC_HOST="mds"          # fester Name statt Hostname – ein neu aufgesetzter Pi sichert in dieselbe Reihe
KEEP_DAILY=30
KEEP_MONTHLY=12
MAX_DUMP_AGE_HOURS=26
MIN_BYTES=10240                                  # wie backup.sh
END_MARKER="PostgreSQL database dump complete"

START_TS=$(date +%s)
MOUNTED_BY_US=0
SNAPSHOT=""
DB_DUMP=""

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

json_escape() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' | tr '\n\t' '  '; }

write_status() {
  local status="$1" message="$2"
  local tmp="$STATUS_FILE.tmp"
  printf '{"status":"%s","finished_at":"%s","duration_s":%s,"snapshot":"%s","db_dump":"%s","message":"%s"}\n' \
    "$status" "$(date -Iseconds)" "$(( $(date +%s) - START_TS ))" \
    "$(json_escape "$SNAPSHOT")" "$(json_escape "$DB_DUMP")" "$(json_escape "$message")" > "$tmp"
  chmod 644 "$tmp"   # Backend-Container liest als Nicht-root
  mv "$tmp" "$STATUS_FILE"
}

unmount() {
  if [ "$MOUNTED_BY_US" = "1" ]; then
    timeout 30 umount "$OFFSITE_MOUNT" 2>/dev/null || umount -l "$OFFSITE_MOUNT" 2>/dev/null || true
    MOUNTED_BY_US=0
  fi
}

fail() {
  log "❌ $* – Netzlaufwerk-Backup fehlgeschlagen"
  write_status "error" "$*" || true
  unmount
  trap - EXIT
  exit 1
}

# Unerwarteter Abbruch (set -e) landet ebenfalls im Status
trap 'rc=$?; if [ $rc -ne 0 ]; then write_status "error" "Unerwarteter Abbruch (Exit $rc), Details in backup-offsite.log" || true; unmount; fi' EXIT

log "☁️  Netzlaufwerk-Backup startet"

# --- Voraussetzungen ---
[ "$(id -u)" = "0" ] || { log "❌ Nur als root (Mount, Passwortdatei): sudo $0"; exit 1; }
command -v restic >/dev/null || fail "restic nicht installiert (sudo apt install restic)"
[ -r "$RESTIC_PASSWORD_FILE" ] || fail "restic-Passwortdatei $RESTIC_PASSWORD_FILE fehlt"
[ "$(stat -c %a "$RESTIC_PASSWORD_FILE")" = "600" ] || fail "restic-Passwortdatei $RESTIC_PASSWORD_FILE muss chmod 600 haben"
[ -d "$UPLOADS_DIR" ] || fail "Upload-Ordner $UPLOADS_DIR fehlt"
[ -r "$ENV_FILE" ] || fail ".env fehlt ($ENV_FILE)"

# --- Neuester DB-Dump: vollständig und aktuell? ---
DUMP_PATH=$(ls -1t "$BACKUP_DIR"/mds_backup_*.sql.gz 2>/dev/null | head -1 || true)
[ -n "$DUMP_PATH" ] || fail "Kein DB-Dump in $BACKUP_DIR"
DB_DUMP=$(basename "$DUMP_PATH")
[ "$(stat -c %s "$DUMP_PATH")" -ge "$MIN_BYTES" ] || fail "Neuester DB-Dump $DB_DUMP zu klein"
# grep -c statt -q: -q bricht beim Treffer ab, gunzip bekäme SIGPIPE und pipefail meldete Fehler
[ "$(gunzip -c "$DUMP_PATH" | tail -c 4096 | grep -c "$END_MARKER")" -ge 1 ] || fail "Neuester DB-Dump $DB_DUMP unvollständig (Endmarke fehlt)"
DUMP_AGE_H=$(( ($(date +%s) - $(stat -c %Y "$DUMP_PATH")) / 3600 ))
[ "$DUMP_AGE_H" -le "$MAX_DUMP_AGE_HOURS" ] || fail "Neuester DB-Dump $DB_DUMP ist $DUMP_AGE_H h alt – lief backup.sh?"

# --- Freigabe einbinden ---
if mountpoint -q "$OFFSITE_MOUNT"; then
  log "Freigabe schon eingebunden ($OFFSITE_MOUNT) – bleibt danach eingebunden"
else
  log "Binde Freigabe ein: $OFFSITE_MOUNT"
  timeout 60 mount "$OFFSITE_MOUNT" || fail "Freigabe nicht erreichbar (mount $OFFSITE_MOUNT) – Server, Netz, Zugangsdaten prüfen"
  MOUNTED_BY_US=1
fi
[ -f "$RESTIC_REPOSITORY/config" ] || fail "Kein restic-Repository unter $RESTIC_REPOSITORY – einmalig einrichten (DEPLOYMENT.md, restic init)"

# --- Sichern ---
restic unlock >/dev/null 2>&1 || true   # entfernt nur verwaiste Sperren abgebrochener Läufe
log "📦 Sichere $DB_DUMP, $UPLOADS_DIR, $(basename "$ENV_FILE")"
BACKUP_OUT=$(restic backup --host "$RESTIC_HOST" --tag nightly "$DUMP_PATH" "$UPLOADS_DIR" "$ENV_FILE" 2>&1) \
  || { echo "$BACKUP_OUT"; fail "restic backup fehlgeschlagen: $(echo "$BACKUP_OUT" | grep -v '^\s*$' | tail -1)"; }
echo "$BACKUP_OUT"
SNAPSHOT=$(echo "$BACKUP_OUT" | sed -n 's/^snapshot \([0-9a-f]*\) saved$/\1/p' | tail -1)
[ -n "$SNAPSHOT" ] || fail "restic backup ohne Snapshot-ID"

# --- Aufräumen: 30 Tage täglich + 12 Monate ---
# group-by host: der Dump heißt jeden Tag anders, nach Pfaden gruppiert würde nie etwas gelöscht
log "🗑️  Aufräumen (täglich $KEEP_DAILY, monatlich $KEEP_MONTHLY)"
restic forget --host "$RESTIC_HOST" --group-by host --keep-daily "$KEEP_DAILY" --keep-monthly "$KEEP_MONTHLY" --prune \
  || fail "restic forget/prune fehlgeschlagen (Snapshot $SNAPSHOT ist gespeichert)"

# --- Sonntags: Repository prüfen, dabei 10 % der Daten lesen ---
if [ "$(date +%u)" = "7" ]; then
  log "🔍 Prüfe Repository (restic check)"
  restic check --read-data-subset=10% || fail "restic check meldet Fehler im Repository"
fi

unmount
write_status "ok" "Snapshot $SNAPSHOT gespeichert"
trap - EXIT
log "✅ Netzlaufwerk-Backup fertig: Snapshot $SNAPSHOT ($DB_DUMP + Uploads + .env)"
