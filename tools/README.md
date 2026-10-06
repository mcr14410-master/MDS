# tools/ – kleine Werkstatt-Werkzeuge rund ums MDS

| Ordner | Was | Läuft wo |
|---|---|---|
| `nc-viewer/` | Heidenhain-Programm + Aufspannung (STEP/STL) in 3D ansehen, Werkzeuge, Schritte, Laufzeit, Radiuskorrektur, Schwenkebenen | Browser, offline, eine HTML-Datei |
| `ts-sn-generator/` | Seriennummer-Gravur in TopSolid durchschalten und je Nummer G-Code ausgeben | Windows-PC mit TopSolid 7.17 |

## Weg ins MDS (Vorschlag)

1. **Jetzt:** beide als eigenständige Tools im Repo, eigener Build, keine Abhängigkeit zum Backend.
2. `nc-viewer/src/hh.js` ist UI-unabhängig (CommonJS/Browser) → im Node-Backend nutzbar:
   Laufzeit/Werkzeugliste beim Programm-Upload berechnen, Plausibilitätsprüfung.
3. Viewer lädt Programm + STEP per URL aus dem MDS statt Drag & Drop (z. B. `?prog=/api/programs/123/nc&model=/api/programs/123/step`).
4. Werkzeugstammdaten aus dem MDS (`/api/tools`) → echte Ø/Längen/Halter für Radiuskorrektur und Darstellung,
   später Werkzeugmodelle und Kollisionsprüfung.
5. TS_SN_Generator: Seriennummern-Bereiche/Aufträge aus dem MDS ziehen und erzeugte Programme ans MDS melden.
