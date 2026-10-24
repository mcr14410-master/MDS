#!/usr/bin/env bash
set -euo pipefail

# --- Pfade bestimmen ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"
NPM_CACHE_DIR="$REPO_ROOT/.cache/npm"
BUILD_OUT="$REPO_ROOT/.cache/frontend-dist"   # Frontend wird erst hier gebaut, dann nach frontend/dist übernommen

echo "═══════════════════════════════════════"
echo "  MDS Deploy"
echo "═══════════════════════════════════════"
echo "[deploy] repo root:  $REPO_ROOT"
echo "[deploy] frontend:   $FRONTEND_DIR"

# Minimalchecks
command -v docker >/dev/null || { echo "[deploy] ❌ Docker nicht gefunden"; exit 1; }
command -v rsync >/dev/null || { echo "[deploy] ❌ rsync nicht gefunden (sudo apt install rsync)"; exit 1; }
test -f "$FRONTEND_DIR/package.json" || { echo "[deploy] ❌ $FRONTEND_DIR/package.json fehlt"; exit 1; }

# --- Git Pull mit Autostash (wenn Git-Repo) ---
if [ -d "$REPO_ROOT/.git" ]; then
  echo "[deploy] 📥 Git pull..."
  pushd "$REPO_ROOT" >/dev/null
  STASHED=0
  if ! git diff --quiet || ! git diff --quiet --staged || test -n "$(git ls-files --others --exclude-standard 2>/dev/null || true)"; then
    echo "[deploy] Lokale Änderungen -> autostash:"
    git status --short | sed 's/^/[deploy]   /'
    if ! git stash push -u -m "deploy-autostash $(date -Iseconds)"; then
      echo "[deploy] ❌ git stash fehlgeschlagen – Deploy abgebrochen, nichts geändert."
      exit 1
    fi
    STASHED=1
  fi
  if ! git fetch --all --prune || ! git pull --rebase; then
    echo "[deploy] ❌ git pull fehlgeschlagen – Deploy abgebrochen, die bisherige Version läuft unverändert weiter."
    if [ "$STASHED" = "1" ]; then
      echo "[deploy]    Lokale Änderungen liegen im Stash (git stash list), zurückholen mit: git stash pop"
    fi
    exit 1
  fi
  if [ "$STASHED" = "1" ] && ! git stash pop; then
    echo "[deploy] ❌ Lokale Änderungen passen nicht zum neuen Stand (Konflikt bei git stash pop) – Deploy abgebrochen."
    echo "[deploy]    Die bisherige Version läuft unverändert weiter, die Änderungen bleiben im Stash (git stash list)."
    echo "[deploy]    Betroffene Dateien: git status. Konflikte lösen oder mit git reset --hard auf den neuen Stand"
    echo "[deploy]    zurücksetzen (Stash bleibt erhalten), dann erneut deployen."
    exit 1
  fi
  popd >/dev/null
else
  echo "[deploy] ⚠️  Kein Git-Repo, skip pull"
fi

# --- Verzeichnisse erstellen ---
echo "[deploy] 📁 Erstelle Verzeichnisse..."
sudo mkdir -p /srv/mds/postgres
sudo mkdir -p /srv/mds/uploads
sudo mkdir -p /srv/mds/backups
sudo chown -R 1001:1001 /srv/mds/uploads 2>/dev/null || true

# Compose-Befehle aus dem Repo-Root (dort liegt die .env mit DB_PASSWORD/JWT_SECRET)
cd "$REPO_ROOT"

# --- Caddyfile prüfen, bevor etwas umgestellt wird ---
# Einmal-Container mit dem Ordner-Mount aus compose.yaml – prüft also die frisch gepullte Datei.
# Ein ungültiges Caddyfile würde Caddy beim Neustart/Neuanlegen des Containers lahmlegen.
echo "[deploy] 🔎 Caddyfile prüfen..."
if ! docker compose -f "$REPO_ROOT/compose.yaml" run --rm --no-deps -T caddy \
    caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile; then
  echo "[deploy] ❌ caddy/Caddyfile ist ungültig – Deploy abgebrochen, die bisherige Version läuft unverändert weiter."
  echo "[deploy]    Fehlermeldung oben prüfen, Caddyfile korrigieren und erneut deployen."
  exit 1
fi

# --- DB-Backup vor der Migration (Rückfall, falls eine Migration Daten falsch umbaut) ---
if [ -n "$(docker compose -f "$REPO_ROOT/compose.yaml" ps -q --status running db 2>/dev/null || true)" ]; then
  echo "[deploy] 💾 DB-Backup vor der Migration..."
  if ! sudo "$SCRIPT_DIR/backup.sh"; then
    echo "[deploy] ❌ Backup fehlgeschlagen – Deploy abgebrochen, die bisherige Version läuft unverändert weiter."
    exit 1
  fi
else
  echo "[deploy] ⚠️  DB-Container läuft nicht (Erstinstallation?) – kein Backup vor der Migration"
fi

# --- Backend-Image bauen (laufender Container bleibt unverändert) ---
echo "[deploy] 🐳 Backend-Image bauen..."
docker compose -f "$REPO_ROOT/compose.yaml" build backend

# --- Datenbank Migrations (Einmal-Container mit neuem Image, vor dem Umschalten) ---
# Schlägt eine Migration fehl, bricht der Deploy ab – die bisherige Version läuft weiter.
echo "[deploy] 🗃️  Datenbank Migrations..."
if docker compose -f "$REPO_ROOT/compose.yaml" run --rm -T backend npm run migrate:up; then
  echo "[deploy] ✅ Migrations erfolgreich"
else
  echo "[deploy] ❌ Migration fehlgeschlagen – Deploy abgebrochen."
  echo "[deploy]    Die bisherige Version läuft unverändert weiter (Backend + Frontend)."
  echo "[deploy]    Fehlermeldung oben prüfen, Migration korrigieren und erneut deployen."
  exit 1
fi

# --- Frontend-Build im Container (nach .cache/frontend-dist – das laufende Frontend bleibt unberührt) ---
echo "[deploy] 🔨 Frontend-Build (im Container)..."
UID_GID="$(id -u):$(id -g)"
mkdir -p "$NPM_CACHE_DIR" "$BUILD_OUT"

if ! docker run --rm \
  -u "$UID_GID" \
  -v "$FRONTEND_DIR":/app \
  -v "$NPM_CACHE_DIR":/home/node/.npm \
  -v "$BUILD_OUT":/out \
  -w /app node:20 bash -lc '
    set -e
    # Ownership-Fallen vermeiden
    if [ -d node_modules ] && [ ! -w node_modules ]; then
      echo "[container] node_modules nicht beschreibbar -> entferne sie"
      rm -rf node_modules
    fi
    # Exakt die Versionen aus dem (eingecheckten) package-lock.json installieren
    if [ ! -f package-lock.json ]; then
      echo "[container] ❌ frontend/package-lock.json fehlt"
      exit 1
    fi
    echo "[container] npm ci"
    npm ci --no-audit --no-fund
    echo "[container] npm run build"
    npm run build -- --outDir /out --emptyOutDir
  '; then
  echo "[deploy] ❌ Frontend-Build fehlgeschlagen – Deploy abgebrochen, das bisherige Frontend bleibt."
  echo "[deploy]    Achtung: Die Migrationen sind bereits gelaufen, das bisherige Backend läuft weiter."
  exit 1
fi
test -f "$BUILD_OUT/index.html" || { echo "[deploy] ❌ Frontend-Build ohne index.html – Deploy abgebrochen"; exit 1; }

# --- Neues Frontend übernehmen ---
# Inhalt tauschen statt Ordner umbenennen: Caddy hat frontend/dist als Bind-Mount und sähe sonst weiter
# den alten Ordner. --delay-updates/--delete-delay: neue Dateien kommen gesammelt am Ende, alte erst danach weg.
echo "[deploy] 📦 Frontend übernehmen..."
mkdir -p "$FRONTEND_DIR/dist"
rsync -a --delete-delay --delay-updates "$BUILD_OUT/" "$FRONTEND_DIR/dist/"

# --- Services starten/updaten (Backend geht jetzt live, Frontend seit dem rsync oben) ---
echo "[deploy] ▶️  Services starten..."
docker compose -f "$REPO_ROOT/compose.yaml" up -d

# --- Caddy reload (keine Downtime; Caddyfile oben schon geprüft) ---
# Neustart nur als Rückfall, falls der Reload selbst scheitert
CID="$(docker compose -f "$REPO_ROOT/compose.yaml" ps -q caddy 2>/dev/null || true)"
if [ -n "$CID" ]; then
  echo "[deploy] 🔄 Caddy reload..."
  docker exec -i "$CID" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile \
    || docker compose -f "$REPO_ROOT/compose.yaml" restart caddy
fi

# --- Status ---
echo ""
echo "[deploy] 📊 Status:"
docker compose -f "$REPO_ROOT/compose.yaml" ps

# --- Health-Check ---
echo ""
echo "[deploy] 🏥 Health-Check:"
HEALTH=""
for _ in $(seq 1 15); do
  if HEALTH="$(curl -fsS http://localhost:81/api/health 2>/dev/null)"; then
    break
  fi
  HEALTH=""
  sleep 2
done
if [ -z "$HEALTH" ]; then
  echo "[deploy] ❌ Health-Check fehlgeschlagen (http://localhost:81/api/health nach 30 s nicht erreichbar)"
  echo "[deploy]    Logs prüfen: docker compose logs --tail=50 backend"
  exit 1
fi
if command -v jq >/dev/null 2>&1; then
  echo "$HEALTH" | jq .
else
  echo "$HEALTH"
fi

echo ""
echo "═══════════════════════════════════════"
echo "  ✅ Deploy abgeschlossen!"
echo "  🌐 http://$(hostname -I | awk '{print $1}'):81"
echo "═══════════════════════════════════════"
echo ""
echo "📋 Bei ERSTINSTALLATION: ./scripts/init.sh"
