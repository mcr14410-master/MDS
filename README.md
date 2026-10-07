# MDS – Manufacturing Data System

Eigenentwickeltes Fertigungs-Managementsystem für eine kleine CNC-/Aerospace-Fertigung
(Einschichtbetrieb mit mannloser Nachtfertigung). Ersetzt kommerzielle PDM-/MES-Lösungen;
Audit-Trail und Nachvollziehbarkeit stehen im Vordergrund.

[![License](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

Aktuelle Version und Änderungen: [CHANGELOG.md](./CHANGELOG.md) · Planung: [ROADMAP.md](./ROADMAP.md)

---

## Module

| Bereich | Inhalt |
|---|---|
| **Fertigung** | Bauteile, Arbeitsgänge, NC-Programme mit Versionierung und Freigabe-Workflow, Rüstblätter, Werkzeuglisten, Prüfpläne |
| **Werkzeuge** | Werkzeugstamm, Kategorien, T-Nummern-Listen, Zustände (neu / gebraucht / nachgeschliffen), Lagerplätze, QR-Codes |
| **Betriebsmittel** | Messmittel (Kalibrierung, Zertifikate), Spannmittel, Vorrichtungen, Maschinen |
| **Lager & Einkauf** | Lagerorte, Verbrauchsmaterial, Lieferanten, Bestellungen |
| **Wartung** | Wartungspläne, Standalone-Aufgaben, Checklisten, Skill-Level, Eskalationen, Betriebsstunden |
| **Personal** | Urlaubsplanung, Zeiterfassung (NFC-Terminal), Zeitnachweis-PDF |
| **Sonstiges** | Kundenverwaltung, Wiki, Zerobot-Positionsrechner, „Was ist neu“, Benutzer/Rollen (RBAC), Cron-Jobs |

Außerhalb der Web-App liegen in [`tools/`](./tools/) eigenständige Werkzeuge rund um TopSolid und
Heidenhain (NC-Viewer, Seriennummern-Generator, Werkzeug- und Bibliotheksexport).

---

## Technik

| Schicht | Stack |
|---|---|
| Backend | Node.js, Express, PostgreSQL (Raw SQL über `pg`-Pool), node-pg-migrate, JWT, multer, node-cron |
| Frontend | React 19, Vite, React Router v7, Zustand, TailwindCSS v3 (Dark/Light Mode), PWA |
| Betrieb | Docker Compose (PostgreSQL 16, Backend, Caddy, pgAdmin) auf Raspberry Pi 5 |

```
Browser ──► Caddy :81 ──► /api/*  ──► Backend (Express :5000) ──► PostgreSQL
                     └──► /*      ──► frontend/dist (statisch)
```

---

## Lokale Entwicklung

**Voraussetzungen:** Node.js 20+, PostgreSQL 15+ (lokal oder per Docker), Git

```bash
git clone https://github.com/mcr14410-master/MDS.git
cd MDS
```

**Backend** (läuft auf http://localhost:5000):

```bash
cd backend
npm install
cp .env.example .env        # DB-Zugang und JWT_SECRET anpassen
npm run migrate:up          # Schema anlegen
npm run seed                # optional: Testdaten
npm run dev
```

**Frontend** (läuft auf http://localhost:5173):

```bash
cd frontend
npm install
npm run dev
```

In VS Code startet der Task **„MDS-Start (Backend + Frontend)“** beides zusammen.

**Erster Login:** Benutzer `admin`, Passwort `admin123` (wird von der ersten Migration angelegt –
im Betrieb sofort ändern).

**API-Tests:** `.http`-Dateien für die VS-Code-Erweiterung REST Client liegen in
[`backend/tests/`](./backend/tests/).

---

## Deployment

Produktiv läuft MDS per Docker Compose auf einem Raspberry Pi 5 (Port 81, Daten unter `/srv/mds`).
Erstinstallation, Updates, Backup und Restore: [DEPLOYMENT.md](./DEPLOYMENT.md).

```bash
cp .env.production.example .env   # DB_PASSWORD und JWT_SECRET setzen
./scripts/deploy.sh               # Build, Migrationen, Neustart
```

Releases folgen SemVer; die Version steht ausschließlich in `backend/package.json` und
`frontend/package.json`.

---

## Projektstruktur

```
MDS/
├── backend/            Express-API (src/), Migrationen, REST-Client-Tests, Backend-Doku
├── frontend/           React-SPA (src/pages, src/components, src/stores, src/utils)
├── tools/              Eigenständige Werkstatt-Tools (TopSolid, NC-Viewer)
├── scripts/            deploy, migrate, backup, restore, init
├── docs/
│   ├── konzepte/       Konzepte und Ideensammlungen (TopSolid, Lager, Settings …)
│   ├── sessions/       Session-Protokolle (ältere unter archiv/)
│   ├── archiv/         Dokumentation abgeschlossener Features
│   └── *.md            Cron-System, pgAdmin, PWA, Toleranzarten, Farben
├── compose.yaml        Docker Compose
├── Caddyfile           Reverse Proxy
├── CHANGELOG.md        Versionen und Änderungen
├── ROADMAP.md          Planung
└── CLAUDE.md           Arbeitsweise und Konventionen für die KI-gestützte Entwicklung
```

---

## Mitarbeit & Konventionen

Entwicklung auf Feature-Branches von `master`, Merge per Pull Request. Jede Änderung bekommt einen
Eintrag unter `[Unreleased]` im [CHANGELOG](./CHANGELOG.md). Technische Konventionen
(Datenbank-Patterns, Zeitzonen, File-Uploads, Axios-Instanz) stehen in [CLAUDE.md](./CLAUDE.md).

Das Repository ist öffentlich: Kundendaten, NC-Programme, Werkzeugstamm-Exporte und
TopSolid-Bibliotheken gehören nach `_lokal/` (per `.gitignore` ausgeschlossen).

---

## Lizenz

MIT – siehe [LICENSE](./LICENSE).
