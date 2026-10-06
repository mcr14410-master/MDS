# TS_SN_Generator – Seriennummer-Gravur in TopSolid durchschalten

Stand: 05.10.2026 · TopSolid 7.17 · .NET Framework 4.8

Setzt im **aktiven** TopSolid-CAM-Dokument einen Text-Parameter (z. B. `Gravur2`) nacheinander auf
`SN25 … SN30`, rechnet die Bearbeitungen neu und gibt je Nummer das NC-Programm mit dem im
Dokument eingestellten Postprozessor aus.

## Benutzung

1. Beim ersten Mal `TS_SN_Generator.example.ini` nach `TS_SN_Generator.ini` kopieren (die echte ini ist per `.gitignore` ausgeschlossen).
   Dann `TS_SN_Generator.ini` anpassen – normalerweise nur `Text`, `Start`, `Ende` (`Testlauf = ja` zum Ausprobieren).
2. TopSolid mit dem CAM-Dokument offen (nur **eine** Instanz), `TS_SN_Generator.bat` starten.
3. Zusammenfassung prüfen (Dokument, PP, Parameter, Dateiname, Bereich) → `j`.
4. Je Nummer im PP-Speicherdialog **Speichern** klicken.

Tipp: Meldung „Szenario kann aktuell nicht aktualisiert werden“ vermeiden → im CAM-Dokument
CAD-Kontext → „Letzte Bearbeitungsphase“ → im Elemente-Baum „Szenario 1“ deaktivieren.

Vorhandene Nummern im Zielordner werden übersprungen. Abbruch ohne G-Code, wenn Bearbeitungen nach dem
Neurechnen veraltet sind oder der Dateiname nicht passt. Das Dokument wird **nicht** gespeichert.

## Bauen

Nur auf einem Rechner mit TopSolid 7.17 sinnvoll (DLLs + laufendes TopSolid nötig).
Referenziert werden `TopSolid.Kernel.Automating.dll` und `TopSolid.Cam.NC.Kernel.Automating.dll` aus
`C:\Program Files\TopSolid\TopSolid 7.17\bin` (siehe `src/TsSerienGcode.csproj`). Die exe lädt sie
zur Laufzeit von dort (`AssemblyResolve`) – **TopSolid-DLLs nicht ins Repo legen** (Lizenz).

```bash
dotnet build src/TsSerienGcode.csproj -c Release      # oder Visual Studio
```

Alternativ ohne .NET SDK (so wurde es gebaut, Linux + mono):
`mcs -sdk:4.8 -platform:x64 -out:TS_SN_Generator.exe -r:TopSolid.Kernel.Automating.dll -r:TopSolid.Cam.NC.Kernel.Automating.dll -r:System.ServiceModel.dll src/Program.cs`

## API-Erkenntnisse (TopSolid'Automation 7.17)

- `Documents.Update(doc, true)` **nicht verwenden** – wirft „StartModification must be called“, auch innerhalb einer Modifikation.
- Bearbeitungen neu rechnen: `Operations.IsUpToDate` + nur veraltete einzeln `Operations.Execute(op)` je in eigener Modifikation.
  `RefreshOperations` über alles hilft nicht und löst die Szenario-Meldung aus.
- Programm-Dateinamen-Formel (z. B. `="TEIL-0001-"&Gravur2`) wird per API **nicht** neu ausgewertet – deshalb je Nummer
  `Programs.SetFileName(prog, new SmartText("…SNxx"))` als festen Text, am Ende Formel per
  `new SmartText(SmartTextType.Formula, "", ElementId.Empty, ItemLabel.Empty, formel)` zurücksetzen.
- Ausgabe: `NCPostProcessor.GenerateNCCodesWithOptions(doc, "", new List<KeyValue>(), out log)` – leerer PP-Name = PP des Dokuments.
  Der PP-Speicherdialog erscheint trotzdem.
- `PLANE SPATIAL`-Konvention siehe `../nc-viewer` (R = Rz·Ry·Rx).
