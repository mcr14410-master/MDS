#!/bin/bash
# MDS Datenbank Migration Script
# Führt alle ausstehenden Migrations aus

set -e

echo "🔄 MDS Datenbank Migration"
echo "=========================="

# Prüfen ob Container läuft
if ! docker compose ps | grep -q "backend.*Up"; then
    echo "❌ Backend Container läuft nicht!"
    echo "   Starte mit: docker compose up -d"
    exit 1
fi

# Migrations ausführen
echo "📦 Führe Migrations aus..."
docker compose exec backend npm run migrate:up

echo "✅ Migrations abgeschlossen!"
