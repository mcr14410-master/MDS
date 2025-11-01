# Fertigungsdaten Management System (MDS)

## 🎯 Vision

Ein vollwertiges PDM/MES-System für CNC-Fertigung mit:
- Versionierung von NC-Programmen
- Workflow-Management (Entwurf → Prüfung → Freigabe)
- QR-Codes für Shopfloor
- Wartungsmanagement für Maschinen
- File-Watcher für CAM-Integration
- Audit-Trail für Luftfahrt-Zertifizierung

## 🚀 Status

**Aktuell:** Phase 1 - Fundament (Woche 1)
**Fortschritt:** 5% (Struktur erstellt)
**Nächster Meilenstein:** Datenbank-Schema (Woche 1)

## 📊 Tech-Stack

- **Backend:** Node.js + Express + PostgreSQL
- **Frontend:** React + TailwindCSS
- **Deployment:** Docker (Raspberry Pi)
- **Versionierung:** Git + GitHub
- **IDE:** Eclipse

## 📁 Projekt-Struktur

```
mds/
├── backend/              # Node.js API
├── frontend/             # React App
├── docs/                 # Dokumentation
│   ├── ARCHITECTURE.md   # System-Architektur
│   ├── DATABASE.md       # DB-Schema
│   └── API.md           # API-Dokumentation
├── ROADMAP.md           # Phasenplan
├── CHANGELOG.md         # Was wurde gemacht
└── docker-compose.yml   # Production Setup
```

## 🏃‍♂️ Quick Start (Entwicklung)

### Backend starten:
```bash
cd backend
npm install
npm run dev
```

### Frontend starten:
```bash
cd frontend
npm install
npm start
```

### Docker (Production):
```bash
docker-compose -f docker-compose.pi.yml up -d
```

## 👥 Team

- **Entwicklung:** Claude + mcr14410-master
- **Fachliche Leitung:** mcr14410-master
- **Testing:** mcr14410-master

## 📝 Lizenz

MIT License - Gewerbliche Nutzung erlaubt

## 🔗 Links

- GitHub: https://github.com/mcr14410-master/MDS
- Docs: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Roadmap: [ROADMAP.md](ROADMAP.md)

---

**Entwickelt für die CNC-Fertigungsindustrie**
