#!/bin/bash
# MDS Deployment Script für Raspberry Pi
# Ausführen im mds/ Projektverzeichnis

set -e

echo "🚀 MDS Deployment"
echo "================="

# Prüfen ob .env existiert
if [ ! -f .env ]; then
    echo "❌ Fehler: .env Datei fehlt!"
    echo "   Kopiere .env.production nach .env und passe die Werte an."
    exit 1
fi

# Verzeichnisse auf SSD erstellen
echo "📁 Erstelle Verzeichnisse..."
sudo mkdir -p /srv/mds/postgres
sudo mkdir -p /srv/mds/uploads
sudo mkdir -p /srv/mds/backups
sudo chown -R 1001:1001 /srv/mds/uploads

# Frontend bauen (lokal)
echo "🔨 Baue Frontend..."
cd frontend
npm install --legacy-peer-deps
npm run build
cd ..

# Docker Images bauen
echo "🐳 Baue Docker Images..."
docker compose build

# Alte Container stoppen (falls vorhanden)
echo "🛑 Stoppe alte Container..."
docker compose down 2>/dev/null || true

# Neue Container starten
echo "▶️  Starte Container..."
docker compose up -d

# Warten auf Health-Checks
echo "⏳ Warte auf Services..."
sleep 10

# Status prüfen
echo ""
echo "📊 Container Status:"
docker compose ps

echo ""
echo "✅ Deployment abgeschlossen!"
echo ""
echo "🌐 MDS erreichbar unter: http://$(hostname -I | awk '{print $1}'):81"
echo "📋 Logs anzeigen: docker compose logs -f"
echo "🛑 Stoppen: docker compose down"
