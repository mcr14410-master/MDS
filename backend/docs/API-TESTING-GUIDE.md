# API Testing Guide - MDS Backend

## 🚀 Server starten

```bash
cd backend
npm run dev
```

Der Server sollte starten und folgende Ausgabe zeigen:
```
🚀 ========================================
   MDS Backend Server
   ========================================
   📍 Running on: http://localhost:5000
   🏥 Health Check: http://localhost:5000/api/health
   📊 DB Info: http://localhost:5000/api/db/info
   ========================================
```

---

## 📋 Test-Methoden

Es gibt mehrere Möglichkeiten, die API zu testen:

### 1. VS Code REST Client Extension (Empfohlen!)

**Installation:**
- VS Code Extension: "REST Client" von Huachao Mao installieren
- Öffne die Datei `test-auth.http`
- Klicke auf "Send Request" über den Requests

**Vorteile:**
- ✅ Sehr einfach zu bedienen
- ✅ Token-Verwaltung automatisch
- ✅ Variablen-Support
- ✅ Responses direkt in VS Code anzeigen

### 2. cURL (Terminal/Command Line)

**Für Linux/Mac (Bash):**
```bash
# Health Check
curl http://localhost:5000/api/health

# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "password123",
    "full_name": "New User"
  }'

# Login und Token speichern
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.token')

echo "Token: $TOKEN"

# Get Profile (mit Token)
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Für Windows (PowerShell):**
```powershell
# Health Check
Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get

# Register
$body = @{
    username = "newuser"
    email = "newuser@example.com"
    password = "password123"
    full_name = "New User"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
  -Method Post -Body $body -ContentType "application/json"

# Login und Token speichern
$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
  -Method Post -Body $loginBody -ContentType "application/json"

$token = $response.token
Write-Host "Token: $token"

# Get Profile (mit Token)
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/me" `
  -Method Get -Headers @{"Authorization"="Bearer $token"}
```

### 3. Postman

1. **Postman installieren** (optional, VS Code REST Client ist einfacher)
2. **Collection erstellen:**
   - New Collection → "MDS Backend"
   - Add Request → "Health Check"
   
3. **Environment Variables:**
   ```
   baseUrl: http://localhost:5000
   token: {{token wird automatisch gesetzt}}
   ```

4. **Tests mit Postman Script:**
   - Unter "Tests" Tab bei Login Request:
   ```javascript
   pm.environment.set("token", pm.response.json().token);
   ```

---

## 🧪 Test-Szenarien

### Szenario 1: Basis-Health Check
```bash
curl http://localhost:5000/api/health
```

**Erwartete Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-01T...",
  "database": "connected",
  "version": "1.0.0",
  "phase": "Phase 1, Week 2 - Backend API + Auth"
}
```

---

### Szenario 2: User Registration Flow

**1. Neuen User registrieren:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "programmer1",
    "email": "programmer1@example.com",
    "password": "secure123",
    "full_name": "Max Mustermann"
  }'
```

**Erwartete Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 2,
    "username": "programmer1",
    "email": "programmer1@example.com",
    "full_name": "Max Mustermann",
    "created_at": "2025-11-01T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Szenario 3: Login & Token-basierte Authentifizierung

**1. Login als Admin:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**2. Token aus Response kopieren und in Variable speichern**

**3. Geschützten Endpoint aufrufen:**
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### Szenario 4: Password Change

```bash
# 1. Zuerst einloggen und Token erhalten
TOKEN="YOUR_TOKEN_HERE"

# 2. Password ändern
curl -X POST http://localhost:5000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "currentPassword": "admin123",
    "newPassword": "newSecurePassword123"
  }'
```

---

## 🔍 Häufige Fehler & Lösungen

### Error: "ECONNREFUSED"
**Problem:** Server läuft nicht
**Lösung:** 
```bash
cd backend
npm run dev
```

### Error: "Invalid token"
**Problem:** Token ist abgelaufen oder ungültig
**Lösung:** Neuer Login erforderlich

### Error: "Username or email already exists"
**Problem:** User existiert bereits
**Lösung:** Anderen Username/Email verwenden

### Error: "Invalid credentials"
**Problem:** Falscher Username oder Passwort
**Lösung:** Credentials überprüfen

---

## 📊 Alle verfügbaren Endpoints

### Public Endpoints (keine Auth erforderlich)

| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| GET | `/` | Root endpoint mit API Info |
| GET | `/api/health` | Health Check & DB Status |
| GET | `/api/db/info` | Datenbank-Statistiken |
| POST | `/api/auth/register` | Neuen User registrieren |
| POST | `/api/auth/login` | User login & Token erhalten |

### Protected Endpoints (Auth erforderlich)

| Method | Endpoint | Beschreibung | Benötigt |
|--------|----------|-------------|----------|
| GET | `/api/auth/me` | Aktuelles User-Profil | Bearer Token |
| POST | `/api/auth/change-password` | Passwort ändern | Bearer Token |

---

## 🎯 Schnelltest-Workflow (Empfohlen für Entwicklung)

**Mit VS Code REST Client:**

1. **Öffne `test-auth.http`**
2. **Sende "Login with Admin" Request** (klick auf "Send Request")
3. **Token wird automatisch gespeichert** als `@authToken`
4. **Sende "Get Current User Profile" Request** - nutzt automatisch das Token

**Fertig!** Das ist der schnellste Weg zum Testen während der Entwicklung.

---

## 📝 Test-Checkliste

Vor dem Commit sollten alle diese Tests erfolgreich sein:

- [ ] Server startet ohne Fehler
- [ ] Health Check gibt `status: "ok"` zurück
- [ ] DB Info zeigt korrekte Anzahl an Tabellen
- [ ] User Registration funktioniert
- [ ] User kann sich mit registrierten Credentials einloggen
- [ ] Token wird beim Login zurückgegeben
- [ ] Geschützter Endpoint `/api/auth/me` funktioniert mit gültigem Token
- [ ] Ungültiger Token wird abgelehnt (401)
- [ ] Password Change funktioniert
- [ ] Fehlerhafte Requests geben sinnvolle Fehlermeldungen

---

## 🚀 Next Steps

Sobald alle Auth-Tests erfolgreich sind:
1. ✅ Bauteile CRUD Endpoints implementieren
2. ✅ Audit-Log Middleware hinzufügen
3. ✅ Permission-Checks für CRUD Operations
4. ✅ Validierung für Bauteile-Daten

---

**Viel Erfolg beim Testen! 🎉**
