# Konzept: Module ein- und ausschalten (MDS und Agent)

**Stand:** 30.10.2026 · Entwurf zur Abstimmung, noch nichts umgesetzt
**Bezug:** CLAUDE.md „Betriebsneutral bleiben“, ROADMAP „Admin-Konfigurationsbereich“,
[SETTINGS-WISHLIST.md](SETTINGS-WISHLIST.md), [MESSPROGRAMME_KONZEPT.md](MESSPROGRAMME_KONZEPT.md) (Agent)

**Ziel:** Das MDS läuft auch in einem Betrieb ohne TopSolid, PC-DMIS, Zerobot oder NFC-Terminal.
Betriebsspezifische Teile lassen sich in den Systemeinstellungen abschalten, Agent-Module je Gerät
zuschalten – so, wie man es aus anderen Anwendungen kennt.

---

## 1. Drei Ebenen – nicht vermischen

| Ebene | Frage | Wer stellt ein | Stand |
|---|---|---|---|
| **Modul** | Nutzt der Betrieb das überhaupt? | Admin, global (Systemeinstellungen) | neu |
| **Operationstyp-Feature** | Hat dieser Arbeitsgangtyp z. B. einen Messprogramme-Reiter? | Stammdaten → Operationstypen | vorhanden (`cmm_programs` …) |
| **Recht** | Wer darf es benutzen? | Benutzerverwaltung (Rollen) | vorhanden |

Das Modul steht über allem: Ist es aus, ist es überall weg – unabhängig von Features und Rechten.

---

## 2. Verhalten eines abgeschalteten Moduls

- Menüpunkte, Reiter und Kacheln verschwinden; direkte Aufrufe der Seiten → Hinweis „Modul nicht aktiv“
- Backend: Endpunkte des Moduls antworten mit 403 und klarer Meldung (Middleware, z. B. `requireModule('cmm_programs')`)
- Features des Moduls tauchen bei den Operationstypen nicht mehr zur Auswahl auf
- Cron-Jobs des Moduls laufen nicht
- **Daten bleiben vollständig erhalten.** Abschalten blendet nur aus; nach dem Einschalten ist alles wie
  vorher. Nichts wird gelöscht – Audit-Trail
- Rechte bleiben in der Rollenverwaltung sichtbar (ggf. mit Vermerk „Modul aus“), damit beim
  Einschalten nichts neu vergeben werden muss

**Abhängigkeiten:** Ein Modul kann andere voraussetzen (Messprogramme → Programme, TopSolid → Agent).
Einschalten nur mit Voraussetzung; Abschalten eines Moduls, von dem andere abhängen, wird mit Hinweis
verhindert.

**Kern – nicht abschaltbar:** Bauteile, Arbeitsgänge, Programme (NC), Maschinen, Kunden, Benutzer/Rollen,
Stammdaten, Systemeinstellungen.

---

## 3. Kandidaten

| Modul | hängt ab von | Phase |
|---|---|---|
| Messprogramme (KMG) | Programme | 1 |
| PC-DMIS-Anbindung (Dateirollen, Vorlagen, Kalibrierprogramm) | Messprogramme | 1 |
| MDS-Agent | – | 1 (mit Schritt 4 Messprogramme) |
| TopSolid-Anbindung | Agent | später |
| NC-Transfer an die Maschinen | Agent | später |
| Zerobot-Rechner | – | bei Bedarf |
| Zeiterfassung / NFC-Terminal | – | bei Bedarf |
| Urlaub | – | bei Bedarf |
| Wartung | Maschinen | bei Bedarf |
| Werkzeuge, Messmittel, Spannmittel, Vorrichtungen | – | bei Bedarf |
| Lager & Einkauf, Wiki | – | bei Bedarf |

„Bei Bedarf“: bestehende Module erst nachrüsten, wenn es einen Anlass gibt (anderer Betrieb, Aufräumen
des Menüs). Jedes einzeln ist überschaubar, alle auf einmal viel Fläche für wenig Nutzen.

---

## 4. Agent-Module

Agent-Module werden **zentral im MDS** geschaltet, nicht am Gerät:

- Jeder Agent ist im MDS als Gerät angelegt (Schritt 4 Messprogramme, Tabelle `agents`) – dort wird
  angehakt, welche Module er ausführt: Mess-PC → PC-DMIS, Programmier-PC → TopSolid, später
  Maschinen-Terminal → NC-Transfer
- Der Agent holt seine Konfiguration beim Melden am MDS (Manifest/Heartbeat); lokal in der ini stehen
  nur Pfade und der API-Schlüssel
- Ist ein Modul global aus, ist es auf allen Agents aus
- Im Agenten ist jedes Modul ein eigener Baustein (Schnittstelle je Modul), geladen wird nur, was
  freigeschaltet ist; das Tray-Menü zeigt die aktiven Module
- **Für Schritt 4 merken:** `agents` bekommt von Anfang an eine Modulliste, damit später nichts umgebaut
  werden muss

---

## 5. Technik (Skizze)

- Speicher: die geplante Tabelle `system_settings` (ROADMAP „Admin-Konfigurationsbereich“) – Module sind
  ihr erster Anwendungsfall. Alternativ eigene Tabelle `system_modules` (key, enabled, geändert am/von);
  Entscheidung bei der Umsetzung
- Liste der Module (Schlüssel, Name, Abhängigkeiten, Kern ja/nein) im Code, der Schalter in der DB
- Änderungen am Schalter protokolliert (wer, wann)
- API: `GET /api/system/modules` für alle Angemeldeten (gecacht), Ändern nur mit eigenem Admin-Recht
  (per Migration, nur `admin`)
- Backend-Middleware `requireModule(key)` an den Routen des Moduls; Cron-Service fragt den Schalter vor
  dem Lauf ab
- Frontend: Store lädt die Module nach dem Login; Sidebar, Routen (`ProtectedRoute`) und
  Operationstyp-Features filtern danach
- Oberfläche: Administration → Systemeinstellungen → Module (Schalter je Modul, Abhängigkeiten sichtbar)

**Bestand / Produktion:** Nach der Einführung ist alles an, was heute läuft – es darf sich nichts ändern,
nur weil es die Schalter gibt. Auf einer frischen DB: offen, ob Integrationen (PC-DMIS, TopSolid, Agent)
standardmäßig aus sind.

---

## 6. Reihenfolge

1. Grundgerüst: Speicher, API, Middleware, Store, Seite „Module“, Filter in Sidebar und Routen
2. Messprogramme/PC-DMIS und Agent schaltbar (passt zu Schritt 4 Messprogramme)
3. TopSolid und NC-Transfer, sobald es sie gibt
4. Bestehende Module bei Bedarf nachrüsten

---

## 7. Offene Fragen

1. Eigene Tabelle `system_modules` oder Teil von `system_settings`?
2. Frische Installation: Integrationen standardmäßig aus?
3. Abgeschaltetes Modul mit Daten: Hinweis an Admins, dass Daten vorhanden sind (z. B. „12 Messprogramme“)?
4. Reicht ein globales Admin-Recht für alle Systemeinstellungen, oder je Bereich?
