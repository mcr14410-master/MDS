# MDS als Progressive Web App (PWA)

## Übersicht

MDS kann als Progressive Web App installiert werden. Damit öffnet sich die Anwendung in einem eigenen Fenster ohne Browser-Tabs und Adressleiste - wie eine native Desktop-Anwendung.

## Browser-Unterstützung

| Browser | Desktop | Mobil |
|---------|---------|-------|
| Chrome | ✅ Ja | ✅ Ja |
| Edge | ✅ Ja | ✅ Ja |
| Safari | ✅ Ja (macOS) | ✅ Ja (iOS) |
| Firefox | ❌ Nein | ✅ Ja (Android) |
| Opera | ✅ Ja | ✅ Ja |

> **Hinweis:** Firefox hat PWA-Support auf Desktop seit Version 85 (2021) entfernt.

## Installation

### Chrome

1. MDS im Browser öffnen (`http://192.168.10.102:81`)
2. **Option A:** In der Adressleiste auf das Installieren-Symbol klicken (⊕)
3. **Option B:** Menü (⋮) → "MDS installieren" oder "App installieren"
4. Im Dialog "Installieren" bestätigen

### Edge

1. MDS im Browser öffnen (`http://192.168.10.102:81`)
2. **Option A:** In der Adressleiste auf das Installieren-Symbol klicken (⊕)
3. **Option B:** Menü (⋯) → "Apps" → "Diese Website als App installieren"
4. Im Dialog "Installieren" bestätigen

### Nach der Installation

- Ein MDS-Icon erscheint im Startmenü / auf dem Desktop
- Die App öffnet sich in einem eigenen Fenster ohne Browser-Oberfläche
- Die App kann wie jede andere Anwendung über das Icon gestartet werden

## "Nicht sicher" Warnung entfernen

Da MDS im internen Netzwerk über HTTP (nicht HTTPS) läuft, zeigen Browser eine "Nicht sicher" Warnung an. Diese kann für die interne IP-Adresse deaktiviert werden.

### Chrome

1. In der Adressleiste eingeben:
   ```
   chrome://flags/#unsafely-treat-insecure-origin-as-secure
   ```

2. Im Textfeld die MDS-Adresse eintragen:
   ```
   http://192.168.10.102:81
   ```

3. Dropdown auf **"Enabled"** setzen

4. Unten auf **"Relaunch"** klicken (Browser neu starten)

### Edge

1. In der Adressleiste eingeben:
   ```
   edge://flags/#unsafely-treat-insecure-origin-as-secure
   ```

2. Im Textfeld die MDS-Adresse eintragen:
   ```
   http://192.168.10.102:81
   ```

3. Dropdown auf **"Enabled"** setzen

4. Unten auf **"Neu starten"** klicken (Browser neu starten)

> **Hinweis:** Diese Einstellung muss auf jedem Computer/Browser einzeln vorgenommen werden.

## Deinstallation

### Chrome

1. Rechtsklick auf das MDS-Icon → "Deinstallieren"
2. Oder: In Chrome `chrome://apps` öffnen → Rechtsklick auf MDS → "Aus Chrome entfernen"

### Edge

1. Rechtsklick auf das MDS-Icon → "Deinstallieren"
2. Oder: Menü (⋯) → "Apps" → "Apps verwalten" → MDS deinstallieren

## Technische Details

Die PWA-Funktionalität basiert auf folgenden Dateien:

| Datei | Beschreibung |
|-------|--------------|
| `frontend/public/manifest.json` | PWA-Konfiguration (Name, Icons, Farben) |
| `frontend/public/mds-192.png` | App-Icon 192x192 px |
| `frontend/public/mds-512.png` | App-Icon 512x512 px |
| `frontend/index.html` | Meta-Tags für PWA |

### manifest.json Konfiguration

```json
{
  "name": "MDS - Fertigungsdaten Management",
  "short_name": "MDS",
  "display": "standalone",
  "background_color": "#1f2937",
  "theme_color": "#3b82f6",
  "start_url": "/"
}
```

- `display: "standalone"` → Öffnet ohne Browser-UI
- `theme_color` → Farbe der Titelleiste
- `background_color` → Hintergrund beim App-Start

## Troubleshooting

### App-Installation wird nicht angeboten

- Browser-Cache leeren und Seite neu laden
- Prüfen ob `manifest.json` erreichbar ist: `http://192.168.10.102:81/manifest.json`
- Browser muss Chrome, Edge, Safari oder Opera sein (nicht Firefox Desktop)

### "Nicht sicher" Warnung bleibt nach Flag-Einstellung

- Browser vollständig schließen und neu starten (nicht nur Tab)
- Prüfen ob die richtige URL im Flag eingetragen ist (inkl. Port)
- Bei mehreren Profilen: Flag gilt nur für das aktive Profil

### App startet im Browser statt eigenem Fenster

- App deinstallieren und neu installieren
- Prüfen ob `display: "standalone"` in manifest.json gesetzt ist
