#!/usr/bin/env bash
set -euo pipefail

# --- Pfade bestimmen ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"
NPM_CACHE_DIR="$REPO_ROOT/.cache/npm"

echo "═══════════════════════════════════════"
echo "  MDS Deploy"
echo "═══════════════════════════════════════"
echo "[deploy] repo root:  $REPO_ROOT"
echo "[deploy] frontend:   $FRONTEND_DIR"

# Minimalchecks
command -v docker >/dev/null || { echo "[deploy] ❌ Docker nicht gefunden"; exit 1; }
test -f "$FRONTEND_DIR/package.json" || { echo "[deploy] ❌ $FRONTEND_DIR/package.json fehlt"; exit 1; }

# --- Git Pull mit Autostash (wenn Git-Repo) ---
if [ -d "$REPO_ROOT/.git" ]; then
  echo "[deploy] 📥 Git pull..."
  pushd "$REPO_ROOT" >/dev/null
  if ! git diff --quiet || ! git diff --quiet --staged || test -n "$(git ls-files --others --exclude-standard 2>/dev/null || true)"; then
    echo "[deploy] local changes -> autostash"
    git stash push -u -m "deploy-autostash $(date -Iseconds)" || true
    STASHED=1
  else
    STASHED=0
  fi
  git fetch --all --prune
  git pull --rebase
  if [ "${STASHED:-0}" = "1" ]; then
    git stash pop || true
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

# --- Frontend-Build im Container ---
echo "[deploy] 🔨 Frontend-Build (im Container)..."
UID_GID="$(id -u):$(id -g)"
mkdir -p "$NPM_CACHE_DIR"

docker run --rm \
  -u "$UID_GID" \
  -v "$FRONTEND_DIR":/app \
  -v "$NPM_CACHE_DIR":/home/node/.npm \
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
    npm run build
  '

# --- Services starten/updaten (erst jetzt geht die neue Version live) ---
echo "[deploy] ▶️  Services starten..."
docker compose -f "$REPO_ROOT/compose.yaml" up -d

# --- Caddy reload (keine Downtime) ---
CID="$(docker compose -f "$REPO_ROOT/compose.yaml" ps -q caddy 2>/dev/null || true)"
if [ -n "$CID" ]; then
  echo "[deploy] 🔄 Caddy reload..."
  docker exec -i "$CID" caddy validate --config /etc/caddy/Caddyfile 2>/dev/null \
    && docker exec -i "$CID" caddy reload --config /etc/caddy/Caddyfile 2>/dev/null \
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
