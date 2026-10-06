# NC-Viewer – Heidenhain-Programme + Aufspannung im Browser

Stand: 05.10.2026 · Teil von `tools/` im MDS-Repo

Zeigt Heidenhain-Klartextprogramme (.H) zusammen mit der Aufspannung aus TopSolid
(STEP/STL) in 3D – **ohne TopSolid-Lizenz, ohne Installation, komplett offline**.
Gedacht für Kollegen und Maschinenbediener: schneller Überblick über ein CAM-Programm.

## Benutzung

1. `NC-Viewer.html` per Doppelklick öffnen (Chrome/Edge/Firefox; kann auch aufs Netzlaufwerk).
2. Programm (`.H`) und optional Aufspannung (`.stp` oder `.stl`) hineinziehen – gern beide gleichzeitig.
3. Aufspannung exportieren: in TopSolid die Bearbeitung als **STEP** exportieren (STEP ist besser als STL:
   Einzelteile mit Namen/Farben, Werkstück wird erkannt und halbtransparent dargestellt).

Bedienung: Leertaste = Abspielen · ←/→ = Satz zurück/vor (Shift = 100) · F = alles zeigen ·
Tab „Schritte“/„Werkzeuge“: Klick = nur diesen Abschnitt, nochmal Klick = alles.

## Was er kann

- Werkzeugbahnen je Werkzeug eingefärbt, Eilgang rot gestrichelt, Werkzeug fährt mit
- **Radiuskorrektur RL/RR** wie die Steuerung (Versatz, Übergangskreis an Außenecken, Schnittpunkt
  an Innenecken; An-/Abfahrsatz direkt auf korrigierten Konturanfang/-ende). Durchmesser aus dem
  Werkzeugkommentar („… D6“), im Tab „Werkzeuge“ überschreibbar. Abschaltbar unter „Ansicht“.
- `PLANE SPATIAL` (Reihenfolge A→B→C um raumfeste Achsen, R = Rz·Ry·Rx – am Modell verifiziert),
  `PLANE RESET`, Zyklus 7 (Nullpunktverschiebung), `CALL LBL` / `REP`, `L`, `C`/`CC`, `CR`, `CP` (Helix)
- Bohrzyklen 200/201/202/203/204/205/240 bei `M99` / `CYCL CALL`
- Nullpunkt-Symbol + Achsen X/Y/Z, bei geschwenkten Bearbeitungen zusätzlich X′/Y′/Z′ mit Ebenen-Schild
- **Automatische Ausrichtung** der Aufspannung: Bauteil mit den Maßen der `BLK FORM` wird gesucht und
  auf den Programm-Nullpunkt gelegt (Rohteil-Mitte oben = WKS). Versatz unter „Ansicht“ korrigierbar.
- Info aus dem Programmkopf, Werkzeugliste mit Zeiten, Laufzeitschätzung
  (SN22: Viewer ≈ 35 min, TopSolid 37 min Bearbeitung)

## Bekannte Grenzen

- Andere Zyklen (Taschen, Gewindefräszyklen, Konturzyklen …) werden **nicht** gezeichnet – Hinweis unter „Info“.
  TopSolid gibt bei uns fast alles als Bahnen aus, deshalb bisher kein Problem.
- `M91`/`M92`-Sätze (Maschinenkoordinaten) werden ausgelassen; `CALL PGM` wird ignoriert; `FN`-Sprünge nicht ausgewertet.
- Werkzeugdurchmesser = Nennmaß aus dem Kommentar, nicht die echten Werte (R + DR) der Maschinen-Werkzeugtabelle.
- Kein Materialabtrag / keine Kollisionsprüfung.
- Laufzeit ohne Werkzeugwechsel, Beschleunigung, Messzyklen.
- Zwei *gleichzeitig* halbtransparente Teile können sich beim Drehen falsch überdecken (Browser-3D-typisch).

## Dateien

| Datei | Inhalt |
|---|---|
| `dist/NC-Viewer.html` | Fertiger Viewer, alles eingebettet (~10,8 MB: three.js, STEP-Leser occt-import-js als WASM) |
| `build.mjs`, `package.json` | Build (Node), `npm run build` |
| `test/hh.test.mjs` | Selbsttest Interpreter, `npm test` |
| `src/hh.js` | **Heidenhain-Interpreter** – unabhängig von der Oberfläche, läuft im Browser (`window.HH`) und in Node (`require`) |
| `src/app.js` | Oberfläche/3D (three.js r160) |
| `src/template.html` | HTML/CSS-Gerüst mit Platzhaltern für die eingebetteten Skripte |

### Interpreter-API (`hh.js`)

```js
const r = HH.run(programmText, {
  radiusComp: true,          // RL/RR anwenden
  toolRadius: { 1206: 3 },   // Radius je Werkzeugnummer überschreiben (sonst aus Kommentar „D…“)
  rapidFeed: 30000           // Eilgang mm/min für die Zeitschätzung
});
r.segs   // [{a:[x,y,z], b:[x,y,z], rapid, tool, op, line, ax:[Werkzeugachse], t:Minuten, pl:Ebenen-Index}]
r.info   // {name, header:[[k,v]], blk:{min,max}, tools:[{nr,s,name,dr}], ops:[{name,tool,segStart,segEnd}],
         //  planes:[{name,M,o,tilted}], holes, warnings}
HH.stats(r.segs)  // {feed, rapid, time}  – Wege in mm, Zeit in min
```

## Neu bauen / testen

Voraussetzung: Node.js ≥ 18 (läuft unter Windows und Linux).

```bash
cd tools/nc-viewer
npm install        # three, occt-import-js, esbuild
npm test           # Selbsttest des Interpreters (Gerade, Kreis, PLANE, Radiuskorrektur, Bohrzyklus)
npm run build      # -> dist/NC-Viewer.html (eine Datei, alles eingebettet, offline lauffähig)
```

`build.mjs` bündelt `src/app.js` mit esbuild und ersetzt in `src/template.html` die Platzhalter
`/*HH*/` (hh.js), `/*OCCT*/` (occt-import-js.js), `/*WASM*/` (WASM als Base64) und `/*APP*/`.

## Ideen fürs MDS

1. **Werkzeugdaten aus dem MDS** (`GET /api/tools?nr=…`): echter Ø, Eckradius, Schneiden-/Ausspannlänge,
   Halter → Radiuskorrektur und Werkzeugdarstellung mit echten Maßen, fehlende Werkzeuge markieren.
2. **Werkzeugmodelle**: parametrisch aus den Stammdaten (Schaft/Schneide/Spannzange) oder Hersteller-STEP
   (DIN 4000 / GTC) im MDS gespeichert.
3. **Kollisionsprüfung** Halter/Werkzeug gegen Aufspannung.
4. Programme + STEP direkt vom MDS laden statt Drag & Drop; `hh.js` im Backend für Laufzeit,
   Werkzeugliste und Plausibilitätsprüfung beim Programm-Upload nutzen.
5. Automatischer STEP-Export aus TopSolid (API), damit `.H` + `.stp` immer zusammen liegen.

## Verwandt

`../ts-sn-generator` – Seriennummer-Gravur in TopSolid durchschalten und je Nummer G-Code ausgeben
(TopSolid'Automation API).
