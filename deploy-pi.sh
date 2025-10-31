#!/bin/bash

# Deploy-Skript für Raspberry Pi
# Verwendung: ./deploy-pi.sh [raspberry-pi-ip]

PI_IP=${1:-raspberrypi.local}
PI_USER=${2:-pi}
PROJECT_NAME="mds"

echo "═══════════════════════════════════════════════════════════"
echo "  Deploying to Raspberry Pi: $PI_USER@$PI_IP"
echo "═══════════════════════════════════════════════════════════"

# Projekt zum Pi kopieren
echo "📦 Copying project files..."
rsync -avz --exclude='node_modules' \
           --exclude='.git' \
           --exclude='backend/uploads' \
           --exclude='frontend/build' \
           ./ $PI_USER@$PI_IP:~/$PROJECT_NAME/

# Auf dem Pi ausführen
ssh $PI_USER@$PI_IP << 'ENDSSH'
cd ~/mds

echo "🔧 Setting up environment..."
# .env Datei erstellen falls nicht vorhanden
if [ ! -f .env ]; then
    echo "DB_PASSWORD=$(openssl rand -base64 32)" > .env
    echo "✓ Created .env file with secure password"
fi

echo "🐳 Starting Docker containers..."
docker-compose -f docker-compose.pi.yml down
docker-compose -f docker-compose.pi.yml up -d --build

echo "⏳ Waiting for database to be ready..."
sleep 10

echo "🗄️  Initializing database..."
docker exec fertigungsdaten-backend npm run init-db

echo "✓ Deployment complete!"
echo ""
echo "Access your application at:"
echo "  http://$(hostname -I | awk '{print $1}')"
echo ""
echo "Backend API:"
echo "  http://$(hostname -I | awk '{print $1}'):5000/api/health"
ENDSSH

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✓ Deployment completed successfully!"
echo "═══════════════════════════════════════════════════════════"
