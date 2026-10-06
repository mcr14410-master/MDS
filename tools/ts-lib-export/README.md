# MDS-Werkzeugimport aus TopSolid – Paket für zuhause

Stand: 06.10.2026

## Inhalt

| Ordner / Datei | Was | Ins Repo? |
|---|---|---|
| `TOPSOLID_TOOL_IMPORT_KONZEPT.md` | Konzept: Datenmodell, Migration, Feld-Mapping, Import-Ablauf, Phasen | ✅ (Repo-Root, wie die anderen `*_KONZEPT.md`) |
| `TS_LibExport/` | Exporter für die TopSolid-Bibliotheken (Quellcode + exe + bat/ini) | ✅ Quellcode, z. B. nach `tools/topsolid/` |
| `TS_ToolExport/` | Exporter für die Werkzeuge eines CAM-Dokuments (Programm-Werkzeugliste, Phase 3) | ✅ Quellcode |
| `Daten_NICHT_INS_REPO/` | echter Export (Werkzeugstamm) + Datenprüfung | ❌ **nicht committen**, das Repo ist öffentlich. Lokal oder in einen Ordner in `.gitignore` legen |

Die TopSolid-DLLs und die Automation-Doku sind bewusst nicht dabei (Lizenz). Die exe lädt die DLLs zur
Laufzeit aus `C:\Program Files\TopSolid\TopSolid 7.17\bin`.

## Einrichtung

`TS_LibExport.example.ini` nach `TS_LibExport.ini` kopieren und die Bibliotheksnamen so eintragen, wie sie im
TopSolid-Projektbaum heißen. Die echte ini ist per `.gitignore` ausgeschlossen (enthält Firmen-Bibliotheksnamen).

## Export-Ergebnis (`export_20261006_170807`)

Gelesen wurden 3 Bibliotheken in 74 s, ohne Fehler:

| Bibliothek | Komponenten | Werkzeuge (T-Nr.) |
|---|---|---|
| FIRMA Werkzeugkomponenten | 876 (802 Schneiden, 74 Aufnahmen/Verlängerungen) | – |
| FIRMA Werkzeuge | 1 (Werkzeugvorlage) | 690 |
| FIRMA Sonderwerkzeug | 48 | 71 (`special: true`) |

- Für die Werkzeuge aus TEIL-0001 stimmen Ausspannlänge (`LPR`) und Ausladung exakt mit dem CAM-Export überein.
- Die PDM-ID des Werkzeugs (`externalRef`) ist identisch mit `ToolPdmItemId` aus dem CAM-Export. Darüber laufen später die Programm-Werkzeuglisten.
- Ø bei 833 von 852 Schneiden vorhanden (6 davon aus dem Namen). Ohne Ø sind nur importierte Fremdmodelle.
- In `tools.csv` steht in der Spalte „Hinweise“, was in TopSolid nachgepflegt werden sollte.

## Datenformat (Kurzfassung)

`components.json` → `components[]`:

```
externalRef, library, special, folder, name, description, comment,
manufacturer, manufacturerKey (normalisiert), partNumber, erpPartNumber,
kind ("cutter" | "holder"), classification (z. B. "DrillType.TwistDrill"), classificationKey,
diameter, diameterSource ("param" | "name"), overallLength, usableLength, cuttingLength,
shankDiameter, neckDiameter, cornerRadius, tipAngle, flutes, material, coolantThrough, leftHand,
protrusion { default, min, max },               // LPR, LPR_MIN, LPR_MAX
interface, holderLength, bodyDiameter,           // nur Aufnahmen (HSK63, A = LBD1, BD1)
params { …alle ISO-13399-Parameter… }            // Längen mm, Winkel °
```

`tools.json` → `tools[]`:

```
externalRef, library, special, folder, name, description, tNumber, classification,
cutter { externalRef, name, manufacturer, partNumber }, holder { … }, otherParts [ … ],
diameter, stickOut, stickOutMin, stickOutMax,    // Standard-Ausspannlänge aus Halter (LPR)
gaugeLength,                                      // Ausladung ab Spindelnase = A + LPR (nur bei einteiliger Aufnahme)
models { glb?, step? }, warnings [ … ]
```

## Nächste Schritte im MDS (siehe Konzept, Abschnitt 9)

1. Migration: `tool_master` (`external_source/ref`, Kategorie „Holders“), `tool_number_list_items`
   (Aufnahme, Ausspannlänge + min/max, Ausladung, `external_ref`), `tool_imports`
2. Import-Endpoint mit Vorschau (`preview` → `commit`), Abgleich über `externalRef`
3. Zwei T-Nummern-Listen: „TopSolid Werkzeuge“ und „Sonderwerkzeuge“ (Sonder-Komponenten mit `tool_category = 'special'`)
4. `.http`-Tests mit `components.json` / `tools.json` aus `Daten_NICHT_INS_REPO`
5. Danach Phase 2 (3D-Modelle, `3_Export_mit_Modellen.bat`) und Phase 3 (Programm-Werkzeuglisten aus `TS_ToolExport`)

## Exporter neu bauen

Gebaut wurde mit Mono unter Linux. Unter Windows geht es auch mit `csc` aus dem .NET Framework 4.8:

```
csc -platform:x64 -out:TS_LibExport.exe -r:"<TopSolid bin>\TopSolid.Kernel.Automating.dll" ^
    -r:"<TopSolid bin>\TopSolid.Cam.NC.Kernel.Automating.dll" -r:System.ServiceModel.dll Program.cs Export.cs
```
