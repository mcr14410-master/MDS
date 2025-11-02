# 🧪 API Testing - Woche 2 Abschluss

## ✅ Was haben wir?

**3 verschiedene Test-Optionen:**
1. **test-api.js** - Node.js Script (Empfohlen!)
2. **test-api-simple.ps1** - PowerShell Script
3. **test-auth.http** - VS Code REST Client

---

## 🚀 Schritt 1: Server starten

Öffne ein Terminal im `backend/` Ordner:

```bash
cd backend
npm run dev
```

**Erwartete Ausgabe:**
```
🚀 ========================================
   MDS Backend Server
   ========================================
   📍 Running on: http://localhost:5000
   🏥 Health Check: http://localhost:5000/api/health
   📊 DB Info: http://localhost:5000/api/db/info
   ========================================
```

✅ **Server läuft!** → Weiter zu Schritt 2

---

## 🧪 Schritt 2: Tests ausführen

### ⭐ Option 1: Node.js Script (EMPFOHLEN)

**Am einfachsten und schnellsten!**

```bash
# Im backend/ Ordner:
node test-api.js
```

**Das Script testet automatisch:**
- ✅ Health Check
- ✅ Database Info
- ✅ User Login
- ✅ Get Profile (geschützter Endpoint)
- ✅ Invalid Token Rejection
- ✅ User Registration

**Erwartete Ausgabe:**
```
========================================
   MDS Backend API Tests
========================================

1. Testing Health Check...
   ✅ Health Check: ok
   Database: connected

2. Testing Database Info...
   ✅ Database Info retrieved
   Tables: 28

3. Testing Login...
   ✅ Login successful!
   User: admin
   Email: admin@example.com
   Roles: admin
   Token received: eyJhbGciOiJIUzI1NiIs...

4. Testing Get Profile (Protected)...
   ✅ Profile retrieved successfully!
   Username: admin
   Email: admin@example.com
   Active: true
   Roles: admin
   Permissions: 27 permissions

5. Testing Invalid Token...
   ✅ Invalid token correctly rejected (401)

6. Testing User Registration...
   ✅ User registered successfully!
   Username: testuser_1730467200000
   Email: testuser_1730467200000@example.com

========================================
   Test Summary
========================================
✅ Health Check
✅ Database Info
✅ Login
✅ Get Profile
✅ Invalid Token Rejection
✅ User Registration

6 / 6 tests passed

🎉 Week 2 - Backend API + Auth: COMPLETE!
```

---

### Option 2: PowerShell Script

```powershell
# Im backend/ Ordner:
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\test-api-simple.ps1
```

---

### Option 3: VS Code REST Client

**Beste Option für interaktives Testen während der Entwicklung!**

1. **Extension installieren:**
   - In VS Code: `Ctrl+Shift+X`
   - Suche nach "REST Client" von Huachao Mao
   - Installieren

2. **test-auth.http öffnen**

3. **Tests ausführen:**
   - Klicke auf "Send Request" über jedem Request
   - Token wird automatisch gespeichert
   - Responses werden direkt in VS Code angezeigt

**Workflow:**
```
1. "Login with Admin" → Klick "Send Request"
2. Token wird automatisch gespeichert
3. "Get Current User Profile" → Klick "Send Request"
4. Fertig! ✅
```

---

## ✅ Was sollte funktionieren?

Nach erfolgreichen Tests solltest du sehen:

### Public Endpoints:
- [x] `GET /` - API Info
- [x] `GET /api/health` - Health Check mit DB Status
- [x] `GET /api/db/info` - 28 Tabellen angezeigt
- [x] `POST /api/auth/register` - User Registration funktioniert
- [x] `POST /api/auth/login` - Login gibt Token zurück

### Protected Endpoints (benötigen Token):
- [x] `GET /api/auth/me` - User Profil mit Roles & Permissions
- [x] `POST /api/auth/change-password` - Password ändern funktioniert

### Security Features:
- [x] Ungültiger Token wird abgelehnt (401 Unauthorized)
- [x] Fehlende Authorization gibt 401
- [x] Password Hashing funktioniert
- [x] Token Expiry ist konfiguriert (24h)

---

## 🐛 Troubleshooting

### Server startet nicht?
```bash
# Prüfe ob Port 5000 frei ist:
netstat -ano | findstr :5000

# Falls belegt, Prozess beenden:
taskkill /PID <PID> /F

# Dann Server neu starten:
npm run dev
```

### "ECONNREFUSED" Error?
→ Server läuft nicht! Siehe "Schritt 1: Server starten"

### "Invalid credentials"?
→ Prüfe Username/Password:
```
Username: admin
Password: admin123
```

### "Token expired"?
→ Neuer Login erforderlich (Token gilt 24h)

### Tests schlagen fehl?
1. Server läuft? → `npm run dev`
2. Database verbunden? → Prüfe `.env` Datei
3. Migrations ausgeführt? → `npm run migrate up`
4. Seeds geladen? → `npm run seed`

---

## 📊 Test-Checkliste

Hake ab, wenn erfolgreich getestet:

**Basis-Tests:**
- [ ] Server startet ohne Fehler
- [ ] Health Check gibt `status: "ok"`
- [ ] DB Info zeigt 28 Tabellen

**Authentication:**
- [ ] Login funktioniert
- [ ] Token wird zurückgegeben
- [ ] Token funktioniert für geschützte Endpoints
- [ ] Ungültiger Token wird abgelehnt

**User Management:**
- [ ] User Registration funktioniert
- [ ] Duplicate User wird erkannt
- [ ] Password Change funktioniert

**Validierung:**
- [ ] Email-Format wird geprüft
- [ ] Passwort-Mindestlänge wird geprüft
- [ ] Required Fields werden geprüft

---

## 🎉 Wenn alle Tests erfolgreich...

**GLÜCKWUNSCH! 🎊**

**Woche 2 ist KOMPLETT abgeschlossen!** ✅

### Was wir erreicht haben:
```
✅ JWT Authentication System
✅ User Management (Register, Login, Profile)
✅ Password Management (Hash, Verify, Change)
✅ Auth Middleware (Token, Permissions, Roles)
✅ Protected Endpoints
✅ Comprehensive Testing
✅ Security Best Practices
```

### Nächster Schritt:
**Woche 3: Bauteile CRUD Endpoints** 🚀

---

## 📝 Commit (nach erfolgreichen Tests)

```bash
git add .
git commit -m "feat(backend): complete week 2 - JWT auth + testing

✅ Week 2 - Backend API + Auth COMPLETE

Features:
- JWT authentication system
- User management endpoints
- Password hashing & validation
- Auth middleware (token, permissions, roles)
- Comprehensive test suite (3 test options)
- Complete documentation

Tests: All passing ✅
Security: Implemented ✅

Phase 1, Week 2: 100% ✅

Next: Week 3 - Bauteile CRUD Endpoints"

git push
```

---

## 💡 Tipps für die Zukunft

**Beim Entwickeln:**
- Nutze VS Code REST Client für schnelle manuelle Tests
- Nutze `test-api.js` vor jedem Commit
- Teste immer ungültige Tokens
- Prüfe Error Messages

**Vor Production:**
- Token Expiry kürzer setzen (z.B. 1h)
- Rate Limiting aktivieren
- HTTPS erzwingen
- Environment Secrets prüfen

---

**Viel Erfolg! 🚀**

Fragen? Schau in die Dokumentation:
- `docs/AUTH-API.md` - API Dokumentation
- `docs/API-TESTING-GUIDE.md` - Testing Guide
- `docs/WEEK-2-COMPLETE.md` - Week 2 Summary
