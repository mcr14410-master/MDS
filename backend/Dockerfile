# Multi-Stage Build für kleineres Image
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine

WORKDIR /app

# Nicht-Root User für Sicherheit
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY --from=builder /app/node_modules ./node_modules
COPY . .

RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5000

CMD ["node", "src/server.js"]
