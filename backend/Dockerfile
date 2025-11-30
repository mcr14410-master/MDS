# MDS Backend - Production Build für Raspberry Pi
FROM node:20-alpine

# Build-Tools für native npm packages (bcrypt, etc.)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Dependencies zuerst (besseres Caching)
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Nicht benötigte Build-Tools entfernen
RUN apk del python3 make g++

# Source kopieren
COPY . .

# Upload-Verzeichnis erstellen
RUN mkdir -p /app/uploads

# Nicht-root User für Sicherheit
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5000

# Health-Check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "src/server.js"]
