# 🤝 Contributing to MDS

> **Danke, dass du zum MDS-Projekt beitragen möchtest!**  
> Diese Anleitung zeigt dir, wie du am besten mithilfst.

---

## 📋 Inhaltsverzeichnis

1. [Code of Conduct](#code-of-conduct)
2. [Wie kann ich helfen?](#wie-kann-ich-helfen)
3. [Development Setup](#development-setup)
4. [Contribution Workflow](#contribution-workflow)
5. [Coding Standards](#coding-standards)
6. [Testing](#testing)
7. [Commit Messages](#commit-messages)
8. [Pull Request Process](#pull-request-process)

---

## 📜 Code of Conduct

### Unsere Standards

- ✅ **Respektvoll** - Sei freundlich und höflich
- ✅ **Konstruktiv** - Gib konstruktives Feedback
- ✅ **Geduldig** - Jeder lernt in seinem Tempo
- ✅ **Offen** - Sei offen für neue Ideen
- ❌ **Keine Beleidigungen** - Persönliche Angriffe sind tabu
- ❌ **Kein Spam** - Qualität über Quantität

### Reporting

Verstöße gegen den Code of Conduct bitte melden an:
- **Email:** mcr14410.master@example.com
- **GitHub Issues:** [Report](https://github.com/mcr14410-master/MDS/issues/new?labels=conduct)

---

## 💡 Wie kann ich helfen?

### 1. 🐛 Bugs finden & melden

**Bug gefunden?**

1. Checke [bekannte Issues](https://github.com/mcr14410-master/MDS/issues)
2. Noch nicht gemeldet? → [Neues Issue erstellen](https://github.com/mcr14410-master/MDS/issues/new?template=bug_report.md)
3. Nutze das Bug Report Template
4. Füge Screenshots/Logs hinzu

**Gutes Bug Report Beispiel:**

```markdown
## 🐛 Bug: Bauteile lassen sich nicht löschen

**Beschreibung:**
Beim Versuch ein Bauteil zu löschen, erscheint ein 500 Error.

**Schritte zum Reproduzieren:**
1. Als Admin einloggen
2. Bauteile-Übersicht öffnen
3. Auf "Löschen" bei Bauteil #5 klicken
4. Error erscheint

**Erwartetes Verhalten:**
Bauteil sollte gelöscht werden (Soft-Delete).

**Aktuelles Verhalten:**
500 Internal Server Error

**Screenshots:**
[screenshot.png]

**Environment:**
- OS: Windows 11
- Browser: Chrome 120
- Node: 18.19.0
- PostgreSQL: 15.5

**Console Logs:**
```
Error: Foreign key constraint violation
at executeQuery (database.js:45)
```
```

### 2. ✨ Features vorschlagen

**Idee für ein neues Feature?**

1. Checke [Feature Requests](https://github.com/mcr14410-master/MDS/issues?q=is%3Aissue+label%3Aenhancement)
2. Noch nicht vorgeschlagen? → [Feature Request erstellen](https://github.com/mcr14410-master/MDS/issues/new?template=feature_request.md)
3. Beschreibe Use Case & Nutzen
4. Diskutiere mit der Community

**Gutes Feature Request Beispiel:**

```markdown
## ✨ Feature: Bulk-Import für Bauteile

**Problem:**
Aktuell müssen Bauteile einzeln angelegt werden. 
Bei 100+ Bauteilen ist das sehr zeitaufwendig.

**Vorgeschlagene Lösung:**
CSV/Excel-Import mit Mapping-Dialog:
1. Datei hochladen
2. Spalten zuordnen (Teilenummer → part_number, etc.)
3. Validierung
4. Import

**Alternativen:**
- REST API Endpoint für Batch-Inserts
- Integration mit ERP-System

**Use Case:**
Kunde hat 500 Bauteile in Excel und will sie importieren.

**Priorität:** Medium

**Labels:** enhancement, data-import
```

### 3. 📝 Dokumentation verbessern

**Dokumentation unklar?**

- Typos korrigieren
- Beispiele hinzufügen
- Übersetzungen beitragen
- Guides schreiben

**Kleine Fixes:** Direkt im GitHub Web-Editor  
**Große Änderungen:** Fork → Branch → PR

### 4. 💻 Code beitragen

**Bereit zum Coden?**

1. Schaue dir [Good First Issues](https://github.com/mcr14410-master/MDS/labels/good%20first%20issue) an
2. Kommentiere im Issue: "Ich übernehme das!"
3. Fork & entwickle (siehe Workflow unten)
4. Pull Request erstellen

---

## 🛠️ Development Setup

### 1. Fork & Clone

```bash
# 1. Auf GitHub: Klicke "Fork" oben rechts
# 2. Clone DEINEN Fork (nicht das Original!)
git clone https://github.com/DEIN-USERNAME/MDS.git
cd MDS

# 3. Original als "upstream" hinzufügen
git remote add upstream https://github.com/mcr14410-master/MDS.git

# 4. Checke Remotes
git remote -v
# origin    https://github.com/DEIN-USERNAME/MDS.git (fetch)
# origin    https://github.com/DEIN-USERNAME/MDS.git (push)
# upstream  https://github.com/mcr14410-master/MDS.git (fetch)
# upstream  https://github.com/mcr14410-master/MDS.git (push)
```

### 2. Dependencies installieren

```bash
# Backend
cd backend
npm install

# Frontend (ab Woche 3)
cd ../frontend
npm install
```

### 3. Datenbank Setup

```bash
# Datenbank erstellen
psql -U postgres -c "CREATE DATABASE mds_dev;"

# .env erstellen
cp .env.example .env
# .env bearbeiten (DATABASE_NAME=mds_dev)

# Migrations
npm run migrate:up

# Seeds
npm run seed
```

### 4. Development Server

```bash
# Backend (Terminal 1)
cd backend
npm run dev

# Frontend (Terminal 2, ab Woche 3)
cd frontend
npm run dev
```

---

## 🔄 Contribution Workflow

### Standard-Workflow

```bash
# 1. Neuesten Stand holen
git checkout main
git pull upstream main

# 2. Feature-Branch erstellen
git checkout -b feature/mein-feature
# Oder für Bugfix:
git checkout -b fix/bug-beschreibung

# 3. Entwickeln
# ... code, code, code ...

# 4. Testen
npm test
npm run lint

# 5. Committen (siehe Commit Message Guidelines)
git add .
git commit -m "feat: mein tolles Feature"

# 6. Push zu DEINEM Fork
git push origin feature/mein-feature

# 7. Pull Request auf GitHub erstellen
# → Gehe zu deinem Fork auf GitHub
# → "Compare & pull request" Button erscheint
# → Beschreibung ausfüllen
# → "Create pull request"
```

### Branch-Naming Convention

```
feature/feature-name       # Neues Feature
fix/bug-description        # Bugfix
docs/documentation-update  # Nur Dokumentation
refactor/code-cleanup      # Code-Refactoring
test/add-tests             # Tests hinzufügen
chore/dependency-update    # Dependencies, Config, etc.
```

**Beispiele:**
```bash
feature/qr-code-scanner
fix/part-deletion-error
docs/api-documentation
refactor/database-queries
test/auth-endpoints
chore/update-dependencies
```

---

## 📏 Coding Standards

### JavaScript/Node.js

**Style Guide:** [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)

**Wichtigste Regeln:**

```javascript
// ✅ GOOD
const userName = 'Max';
const calculateTotal = (items) => {
  return items.reduce((sum, item) => sum + item.price, 0);
};

// ❌ BAD
var user_name = "Max";  // var statt const, snake_case
function calculateTotal(items) {  // alte Function-Syntax
  var total = 0;  // var statt const/let
  for (var i = 0; i < items.length; i++) {
    total = total + items[i].price;
  }
  return total;
}
```

**Weitere Regeln:**
- Immer Semikolons `;`
- Single Quotes `'string'` (außer bei JSX)
- 2 Spaces für Indentation (keine Tabs!)
- Max. 80 Zeichen pro Zeile (empfohlen)
- Trailing Comma in Arrays/Objects
- Async/Await statt Promises/Callbacks
- Destructuring bevorzugen

### ESLint

```bash
# Code checken
npm run lint

# Auto-Fix
npm run lint:fix
```

**eslint-Config:** Siehe `.eslintrc.js`

### Prettier

```bash
# Code formatieren
npm run format

# Check ohne zu ändern
npm run format:check
```

**prettier-Config:** Siehe `.prettierrc`

### React (ab Woche 3)

```jsx
// ✅ GOOD - Functional Component mit Hooks
import React, { useState, useEffect } from 'react';

const PartList = ({ customerId }) => {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParts(customerId);
  }, [customerId]);

  const fetchParts = async (id) => {
    try {
      const response = await api.get(`/parts?customer=${id}`);
      setParts(response.data);
    } catch (error) {
      console.error('Failed to fetch parts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="part-list">
      {parts.map(part => (
        <PartCard key={part.id} part={part} />
      ))}
    </div>
  );
};

export default PartList;
```

---

## 🧪 Testing

### Backend Tests

```bash
# Alle Tests
npm test

# Einzelner Test
npm test -- auth.test.js

# Mit Coverage
npm run test:coverage
```

**Test-Struktur:**

```javascript
// tests/auth.test.js
const request = require('supertest');
const app = require('../src/server');

describe('Auth API', () => {
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'admin123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('admin@example.com');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'wrong'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });
});
```

### Frontend Tests (ab Woche 3)

```bash
# Alle Tests
npm test

# Watch Mode
npm test -- --watch

# Mit Coverage
npm test -- --coverage
```

---

## 📝 Commit Messages

### Format

Wir nutzen [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

```
feat:     Neues Feature
fix:      Bugfix
docs:     Nur Dokumentation
style:    Formatting, Semicolons, etc. (kein Code-Änderung)
refactor: Code-Refactoring (kein Feature, kein Bugfix)
perf:     Performance-Verbesserung
test:     Tests hinzufügen/ändern
chore:    Dependencies, Config, Build, etc.
ci:       CI/CD Änderungen
```

### Scope (optional)

```
auth      - Authentication
api       - Backend API
ui        - Frontend UI
db        - Datenbank
docs      - Dokumentation
build     - Build-System
```

### Beispiele

```bash
# Feature
git commit -m "feat(api): add bulk import endpoint for parts"

# Bugfix
git commit -m "fix(auth): prevent duplicate login sessions"

# Dokumentation
git commit -m "docs(readme): update installation instructions"

# Mit Body
git commit -m "feat(qr): add QR code generation

- Generate QR codes for parts and operations
- Store QR code data in database
- Add API endpoint /api/qr/:id
- Add frontend scanner component

Closes #123"

# Breaking Change
git commit -m "feat(api)!: change authentication to OAuth2

BREAKING CHANGE: JWT tokens are no longer supported.
All clients must migrate to OAuth2."
```

---

## 🔍 Pull Request Process

### 1. Pull Request erstellen

**Auf GitHub:**
1. Gehe zu deinem Fork
2. Klicke "Compare & pull request"
3. Base: `mcr14410-master/MDS:main`
4. Compare: `DEIN-USERNAME/MDS:feature/mein-feature`
5. Titel: Kurz & aussagekräftig
6. Beschreibung: Template ausfüllen

**PR-Template:**

```markdown
## 🎯 Beschreibung

Kurze Zusammenfassung was dieser PR macht.

## 🔗 Related Issues

Closes #123
Fixes #456
Related to #789

## 📝 Changes

- [ ] Feature A implementiert
- [ ] Bug B gefixt
- [ ] Tests hinzugefügt
- [ ] Dokumentation aktualisiert

## 🧪 Testing

Wie wurde getestet?

1. Unit Tests: `npm test`
2. Integration Tests: `npm run test:integration`
3. Manuell getestet: [Beschreibung]

## 📷 Screenshots

(Wenn UI-Änderungen)

## ✅ Checklist

- [ ] Code folgt den Style Guidelines
- [ ] Tests sind grün
- [ ] Dokumentation aktualisiert
- [ ] CHANGELOG.md aktualisiert
- [ ] Keine Breaking Changes (oder im Commit vermerkt)
- [ ] Branch ist aktuell mit main
```

### 2. Code Review

**Als Contributor:**
- Sei offen für Feedback
- Antworte auf Review-Kommentare
- Passe Code an wenn nötig
- Pushe Updates (automatisch im PR sichtbar)

**Als Reviewer:**
- Sei konstruktiv und freundlich
- Erkläre WARUM etwas geändert werden sollte
- Erkenne gute Arbeit an
- Nutze GitHub Review-Tools

### 3. Merge

**Merge-Kriterien:**
- ✅ Mindestens 1 Approval
- ✅ Alle Tests grün (CI)
- ✅ Keine Merge-Konflikte
- ✅ Branch ist aktuell mit main
- ✅ Dokumentation aktualisiert

**Merge-Strategie:** Squash & Merge

---

## 📊 Issue Labels

| Label | Bedeutung |
|-------|-----------|
| `bug` | Etwas funktioniert nicht |
| `enhancement` | Neues Feature oder Verbesserung |
| `documentation` | Dokumentation verbessern |
| `good first issue` | Gut für Anfänger |
| `help wanted` | Extra Aufmerksamkeit benötigt |
| `priority: high` | Hohe Priorität |
| `priority: low` | Niedrige Priorität |
| `status: in progress` | Wird gerade bearbeitet |
| `status: blocked` | Blockiert durch anderes Issue |
| `wontfix` | Wird nicht behoben |
| `duplicate` | Duplikat eines anderen Issues |

---

## 🎯 Tipps für gute Contributions

### 1. Klein anfangen

- Starte mit [Good First Issues](https://github.com/mcr14410-master/MDS/labels/good%20first%20issue)
- Kleine PRs werden schneller reviewed
- Lerne das Projekt kennen

### 2. Kommuniziere

- Kommentiere im Issue bevor du anfängst
- Stelle Fragen wenn etwas unklar ist
- Halte dich an Diskussionen

### 3. Qualität über Quantität

- Teste deinen Code gründlich
- Schreibe sauberen, lesbaren Code
- Aktualisiere die Dokumentation

### 4. Sei geduldig

- Reviews können Zeit brauchen
- Maintainer sind auch nur Menschen
- Feedback ist wertvoll, nicht persönlich

---

## 🙏 Danke!

**Danke für deinen Beitrag zu MDS!**

Jeder Contribution hilft, egal wie klein:
- 🐛 Bugs melden
- 💡 Features vorschlagen
- 📝 Dokumentation verbessern
- 💻 Code schreiben
- ⭐ Projekt starren

**Contributors:**

<!-- ALL-CONTRIBUTORS-LIST:START -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

---

## 📞 Kontakt

**Fragen?**
- **Issues:** [github.com/mcr14410-master/MDS/issues](https://github.com/mcr14410-master/MDS/issues)
- **Discussions:** [github.com/mcr14410-master/MDS/discussions](https://github.com/mcr14410-master/MDS/discussions)
- **Email:** mcr14410.master@example.com

---

<div align="center">

**🚀 Happy Contributing! 🚀**

[📖 Back to README](./README.md) · [🗺️ Roadmap](./ROADMAP.md) · [🚀 Quick Start](./QUICKSTART.md)

</div>
