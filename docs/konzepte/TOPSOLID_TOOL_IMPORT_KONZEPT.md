# TopSolid → MDS: Werkzeug-Import

**Erstellt:** 2026-10-06
**Status:** Konzept / Diskussionsgrundlage
**Ziel:** Werkzeugdaten aus TopSolid'Cam 7.17 in die vorhandene Werkzeugverwaltung übernehmen,
ohne sie ein zweites Mal von Hand zu pflegen: Stammdaten (`tool_master`), T-Nummern-Listen
(`tool_number_list_items`) und 3D-Modelle

---

## 1. Übersicht

### Grundidee

In TopSolid ist jedes Werkzeug schon komplett beschrieben: Schneide, Aufnahme, Ausspannlänge,
Hersteller, Bestellnummern und 3D-Modell. Im MDS gibt es Lager, Bestellwesen und T-Nummern-Listen.
Diese Daten verbindet der Import:

```
TopSolid (PDM)                         Exporter (API)               MDS
┌──────────────────────────┐        ┌──────────────────┐  Upload   ┌──────────────────────────┐
│ Bibliothek Komponenten   │ ─────► │ TS_LibExport     │ ────────► │ Import-Vorschau (Diff)   │
│  Fräser, Bohrer, Aufn.   │        │ components.json  │           │   ↓ Bestätigung          │
│ Bibliothek Werkzeuge     │ ─────► │ tools.json       │           │ tool_master              │
│  Baugruppe + T-Nummer    │        │ *.stp / *.glb    │           │ tool_number_list_items   │
├──────────────────────────┤        ├──────────────────┤           │ Modelle                  │
│ CAM-Dokument             │ ─────► │ TS_ToolExport    │ ────────► │ tool_lists (je Programm) │
│  verwendete Werkzeuge    │        │ (Programmliste)  │           └──────────────────────────┘
└──────────────────────────┘        └──────────────────┘
```

**Hauptquelle sind die beiden Bibliotheken**, weil dort alles einmal und vollständig liegt. Das
CAM-Dokument liefert nur noch, welche T-Nummern ein Programm verwendet und wie lange (Phase 3).

### Abgrenzung

| Gehört zu … | Beispiel | MDS-Ort |
|---|---|---|
| **Realem Werkzeug** (Lagerartikel) | Holex 122666 3,5 – Spiralbohrer D3,5 VHM IKZ | `tool_master` |
| **Realer Aufnahme** (Lagerartikel) | Garant 308189 6 – Schrumpfaufnahme D6 A120 HSK63 | `tool_master` (`item_type = 'accessory'`, Kategorie „Aufnahmen“) |
| **T-Nummer** (eingespannte Kombination) | T11035 = Bohrer + Schrumpfaufnahme, Ausspannlänge 33 mm (Ausladung ab Spindel 153 mm) | `tool_number_list_items` |
| **Programm** (Verwendung) | TEIL-0001: T11035 läuft 90 s | `tool_lists` / `tool_list_items` (Phase 3) |

Wichtig: Ein realer Fräser kann unter **mehreren T-Nummern** laufen. Im Testdokument liegt z. B.
Gühring 5574-2,000 sowohl unter T106 als auch unter T107. Deshalb gehört die Ausspannlänge an die
T-Nummer und nicht an `tool_master`.

---

## 1a. Aufbau der Werkzeugverwaltung in TopSolid (bei uns)

| TopSolid-Bibliothek | Inhalt | Entspricht im MDS |
|---|---|---|
| **Werkzeugkomponenten** | jeder Fräser, Bohrer und jede Aufnahme einzeln; ~99 % parametrisch im DIN-Stil aufgebaut; Hersteller + Bestellnummer gepflegt | `tool_master` (Lagerartikel) |
| **Werkzeuge** | zusammengebaute Werkzeuge als Baugruppe (Komponente + Aufnahme + Einspannung) mit zugewiesener T-Nummer | `tool_number_list_items` (T-Nummern-Liste) |

Damit decken sich beide Seiten eins zu eins: **Komponente = Lagerartikel**, **Werkzeug-Baugruppe = T-Nummer**.

Folgerungen für den Import:

- **Abgleichschlüssel Komponente:** Hersteller + Bestellnummer (fachlich) **und** die PDM-ID des
  Komponentendokuments (technisch, `external_ref`). Die PDM-ID bleibt stabil, auch wenn jemand die
  Bestellnummer korrigiert.
- **Abgleichschlüssel Werkzeug:** T-Nummer (fachlich) **und** die PDM-ID der Baugruppe. Im CAM-Export
  ist das `ToolPdmItemId`, sie zeigt auf das Bibliotheksdokument.
- **Parametrik:** Durchmesser, Längen, Radien, Winkel stehen als Parameter im Komponentendokument,
  benannt nach **ISO 13399** (`DC`, `OAL`, `LU` …, siehe 1b). Der Exporter liest sie aus, die Zuordnung
  ist für alle Typen gleich. Unbekannte Parameter landen in `custom_fields.raw`.
- **Eine Bibliothek → eine T-Nummern-Liste** im MDS (z. B. „TopSolid Werkzeuge“). Gibt es später
  mehrere Werkzeugbibliotheken (je Maschine), entsprechend mehrere Listen.
- **Vollständigkeit:** Auch Komponenten, die in keinem Werkzeug stecken, werden Lagerartikel, z. B.
  Ersatz- oder Alternativwerkzeuge für `tool_number_alternatives`.

### Exporter für Bibliotheken (`TS_LibExport`, neu)

Mit der API sollte das ohne geöffnete Dokumente gehen. Diese Methoden gibt es in 7.17:

| Schritt | API |
|---|---|
| Bibliotheksprojekte finden | `Pdm.GetProjects(false, true)`, `Pdm.IsLibraryProject`, `Pdm.SearchProjectByName` |
| Ordner/Dokumente durchlaufen | `Pdm.GetConstituents(id, out folders, out docs)` (rekursiv) |
| Stammdaten je Dokument | `Pdm.GetName`, `GetDescription`, `GetManufacturer`, `GetManufacturerPartNumber`, `GetPartNumber`, `GetComplementaryPartNumber`, `GetComment`, `GetType` (Dateiendung → Komponente/Werkzeug) |
| Parameter (DIN-Maße) | `Documents.GetDocument(pdmId)` → `Parameters.GetParameters(doc)` → Name + Wert (SI) |
| Werkzeug → Komponenten | Baugruppen-Bestandteile des Werkzeugdokuments (Komponente, Aufnahme) |
| Modell | `Documents.Export` (STEP) / glTF wie in `TS_ToolExport` |

## 1b. Ergebnis Erkundungslauf (06.10.2026)

Der Lauf über beide Bibliotheken war nur lesend und hatte 40 Stichproben je Bibliothek.

| | FIRMA Werkzeugkomponenten | FIRMA Werkzeuge |
|---|---|---|
| Ordner | 100 | 81 |
| Dokumente | 878 (872 `.TopPrt`, 4 `.TopAsm`, 2 `.TopFam`) | 691 (`.TopAsm`) |
| Familien mit Katalog | keine in den Stichproben, nur 2 `.TopFam` | – |
| Hersteller gepflegt | 825 | – |
| Bestellnummer gepflegt | 799 | – |
| T-Nummer gepflegt | – | 688 |

**Geklärt:**

1. **T-Nummer** = Eigenschaft `ErpPartNumber` („Zusatzteilenummer“) am Werkzeugdokument, per PDM als
   `GetComplementaryPartNumber` lesbar. Sie entspricht der T-Nummer im Namen (`T1508 …` → `1508`).
2. **Werkzeug → Komponenten:** `Documents.GetReferencedDocuments` am Werkzeugdokument liefert direkt
   die beiden Teile (Schneide + Aufnahme) mit PDM-ID, Hersteller und Bestellnummer, bei 39 von 40
   Stichproben genau 2, einmal 3. Die Verknüpfung ist damit eindeutig über die PDM-ID.
3. **Parameter nach ISO 13399**, Werte in SI (m, rad):

   | Parameter | Bedeutung | MDS |
   |---|---|---|
   | `DC` | Schneidendurchmesser | `diameter` |
   | `OAL` | Gesamtlänge | `length` |
   | `LU` | nutzbare Länge | `custom_fields.usable_length` |
   | `APMX` | max. Schnitttiefe / Schneidenlänge | `custom_fields.cutting_length` |
   | `LPR`, `LPR_MIN`, `LPR_MAX` | Auskraglänge, zulässiger Bereich | `custom_fields.protrusion_*` |
   | `DMM` | Schaftdurchmesser | `custom_fields.shank_diameter` |
   | `DFS` | Halsdurchmesser | `custom_fields.neck_diameter` |
   | `SIG1` | Spitzenwinkel | `custom_fields.tip_angle` (rad → °) |
   | `ZEFP` / `ZEPF` | Anzahl Schneiden | `flutes` – **beide Schreibweisen kommen vor** |
   | `TCM` / `Cutting Tool Material` | Schneidstoff | `material` |
   | `CNSC` | Innenkühlung | `custom_fields.coolant_through` |
   | `HAND` | Linksschnitt | `custom_fields.left_hand` |
   | Aufnahmen: `HSK` / `Size`, `BD1`, `LBD1`, `HSK_*` | Schnittstelle, Bunddurchmesser, Auskraglänge A | `custom_fields.interface`, `…` |

   Dazu kommt `ClassificationKey` (z. B. `…Drills.DrillType.TwistDrill`, `…Mills.MillType.SideMill`),
   der Kategorie und Unterkategorie liefert.
4. **Ausspannlänge:** Sie steht **nicht** als Eigenschaft an der Baugruppe, sondern ergibt sich aus der
   Einbaulage. Im CAM-Export gilt immer `ChuckDistance` = A der Aufnahme + `ShankDistance`
   (z. B. 120 + 33 = 153). Also ist `ShankDistance` die **Ausspannlänge aus dem Halter** und
   `ChuckDistance` die **Ausladung ab Spindelnase**.
   **Bestätigt:** `LPR` der Schneide ist die Standard-Ausspannlänge. In der Bibliothek bleibt sie immer
   `LPR`. Im CAM-Dokument kann sie je Programm zwischen `LPR_MIN` und `LPR_MAX` angepasst werden, das
   ist dann `ShankDistance` im CAM-Export. Daraus folgt:
   - **T-Nummern-Liste (MDS):** `stick_out_length` = `LPR` (Standard), dazu `LPR_MIN`/`LPR_MAX` als zulässiger Bereich
   - **Programm-Werkzeugliste (Phase 3):** tatsächliche Ausspannlänge aus dem CAM-Export (`ShankDistance`)
     je Programm. Wenn sie vom Standard abweicht, wird das im MDS/Rüstblatt **markiert**, damit der
     Einrichter das Werkzeug für dieses Programm anders ausspannt. Liegt sie außerhalb von MIN/MAX, gibt es einen Fehler.
5. **Laufzeit:** ca. 7 s für 40 Stichproben mit Öffnen. Der vollständige Export (1 569 Dokumente)
   sollte also in wenigen Minuten durch sein.

**Datenqualität**: Diese Punkte muss der Import abfangen, die Details stehen in `Datenpruefung_Bibliotheken.md`:

- **18 T-Nummern doppelt** vergeben, z. B. T1008 VHM + HSS, T6203 HSS + VHM, T9280 mit 4 Breiten. Teils sind
  es gewollte Alternativen (→ `tool_number_alternatives`), teils Fehler (T401 Zentrierbohrer + Entgratbürste).
- **4 Abweichungen** zwischen Name und Zusatzteilenummer, z. B. `T996 …` mit Nummer 906 und
  `T13080 Kurzbohrer D8` mit 13800.
- **69 doppelte Hersteller + Bestellnummer** bei Komponenten. Das sind meist kopierte Teile, bei denen die
  Nummer nicht angepasst wurde (Spiralbohrer D9,0 / D9,1 / D9 alle `122666 9`). Deshalb ist die
  **PDM-ID der primäre Abgleichschlüssel**, Hersteller + Bestellnummer dient nur zur Kontrolle.
- **Hersteller-Schreibweisen:** `Atorn`/`ATORN`, `Holex`/`HOLEX`, `Gühring`/`Guehring`, `Komet`/`KOMET`;
  dazu `-` und `0` als Platzhalter. Das wird beim Import normalisiert.
- 53 Komponenten ohne Hersteller, 79 ohne Bestellnummer, darunter Baugruppen-Einzelteile (VARIO BORE).

---

## 2. Ist-Stand MDS (Repo-Stand `729f7d3`)

| Tabelle | Relevante Felder | Passt für Import? |
|---|---|---|
| `tool_master` | `article_number` (UNIQUE), `tool_name`, `category_id`, `subcategory_id`, `item_type` (`tool`/`insert`/`accessory`), `diameter`, `length`, `flutes`, `material`, `coating`, `manufacturer`, `manufacturer_part_number`, `custom_fields` (jsonb) | ✅ Grundkörper. Aufnahmen als `accessory` + Kategorie |
| `tool_categories` | `custom_field_definitions` (jsonb) | ✅ für Eckradius, Spitzenwinkel usw. |
| `tool_documents` | `tool_master_id`, `document_type` (`datasheet`/`drawing`/`certificate`/`manual`/`photo`/`other`), Datei | ⚠️ kein Typ für 3D-Modell |
| `tool_number_lists` | `name`, `description`, Maschinen über `machine_tool_number_lists` | ✅ eine Liste je TopSolid-Bibliothek/Maschine |
| `tool_number_list_items` | `list_id`, `tool_number` (UNIQUE je Liste), `description`, `preferred_tool_master_id`, `notes`, `sequence` | ✅ Basis. ⚠️ Halter, Ausspannlänge, Modell fehlen |
| `tool_number_alternatives` | `list_item_id`, `tool_master_id`, `priority` | ✅ unverändert |
| `tool_list_items` | je Programm: `tool_number`, `description`, `tool_type`, `manufacturer`, `order_number`, `tool_holder` (Text) | später (Phase 3) |

---

## 3. Was TopSolid liefert

`TS_ToolExport.exe` liest das aktive CAM-Dokument über TopSolid'Automation und schreibt je Werkzeug
118 Parameter sowie STEP (~185 KB) und glTF/.glb (~15 KB). Getestet mit TEIL-0001, das sind 14 Werkzeuge:

| T-Nr. | Name | Typ | Grundkörper | Aufnahme | Ausladung |
|---|---|---|---|---|---|
| 11035 | Bohrer D3,5 IKZ | Spiralbohrer | Holex 122666 3,5 | Schrumpf D6 A120 HSK63 | 153 (33) |
| 13255 | Kurzbohrer D2,55 VHM | Spiralbohrer | Gühring 3899-2,550 | ER11 A100 HSK63 | 120 |
| 108 | Reibahle 3,6H7 | Reibahle | Garant 192900 3,6 | ER16 A100 HSK63 | 150 |
| 9507 | Gewindefr. M3 3xD 3G 4Z | Innengewindefräser | Guehring 4226 - 3 | ER16 A100 HSK63 | 118 |
| 106 | Schaftfr. D2 SL4 | Schaftfräser | Gühring 5574-2,000 | ER16 A100 HSK63 | 120 |
| 107 | Schaftfr. D2 SL4 | Schaftfräser | Gühring 5574-2,000 | ER16 A100 HSK63 | 120 |
| 1215 | HPC INOX D1,5 | Schaftfräser | Garant 203387 1,5 | Weldon D6 A120 HSK63 | 145 |
| 13100 | Microbohrer D1,0 VHM | Spiralbohrer | Garant 121220 1,0 | ER11 A100 HSK63 | 120 |
| 504 | Entgrater D4 | Fasenfräser | Holex 208121 4 | ER16 A100 HSK63 | 120 |
| 502 | Entgrater D2 | Fasenfräser | Garant 208105 2 | ER11 A100 HSK63 | 115 |
| 6301 | Kugelfräser D1 SD3 VHM | Radienfräser | Gühring 3679-1,000 | ER16 A100 HSK63 | 115 |
| 1206 | HPC INOX D6 | Schaftfräser | Holex 203014 6 | Weldon D6 A120 HSK63 | 144 |
| 1106 | Schlichtfräser D6 | Schaftfräser | Holex 202370 | Schrumpf D6 A120 HSK63 | 145 |
| 906 | NC-Anbohrer D6 90° | Anbohrer | Garant 112020 6 | Schrumpf D6 A120 HSK63 | 150 |

### Auffälligkeiten

- **T-Nummer** steht in `DefinitionDocument.ErpPartNumber` und ist die Nummer im NC-Programm
  (`TOOL CALL 1206`). `PocketDescription` („T 1“, „T 33“) ist dagegen der Magazinplatz bzw. die
  Reihenfolge im Dokument und **nicht** die T-Nummer.
- **Einheiten sind gemischt:** Schaft-Ø und Futter-Ø kommen in Metern (`0,006m`), der Rest in mm.
  Zahlen haben ein Dezimalkomma und eine Einheit (`3,5mm`, `140°`, `90,43494s`), Boolesche Werte
  heißen `Wahr`/`Falsch`.
- Gleiche Aufnahmen tragen nicht immer eine Bestellnummer. Teilweise gibt es nur Name + `Code`
  (z. B. `HLD_001`).
- Die Schreibweise der Hersteller schwankt (`Gühring` / `Guehring`), siehe Abschnitt 6.
- `ToolPdmItemId` (z. B. `19_56cd…&3_25`) ist die stabile TopSolid-ID des Werkzeugs und dient
  beim Re-Import zum Wiedererkennen.

---

## 4. Datenbank-Änderungen

Eine Migration, alles additiv. Bestehende Daten bleiben unberührt.

```js
// 1737000110000_topsolid-tool-import.js
exports.up = (pgm) => {
  // 1) Aufnahmen: item_type bleibt 'accessory', eigene Kategorie (Lager + Bestellung wie Fräser)
  pgm.sql(`INSERT INTO tool_categories (name, description)
           SELECT 'Holders', 'Werkzeugaufnahmen (HSK, SK …)'
           WHERE NOT EXISTS (SELECT 1 FROM tool_categories WHERE name = 'Holders')`);

  // 2) Herkunft für Re-Import
  pgm.addColumns('tool_master', {
    external_source: { type: 'varchar(30)', comment: "z. B. 'topsolid'" },
    external_ref:    { type: 'varchar(255)', comment: 'TopSolid PDM-Item-Id o. Ä.' }
  });

  // 3) T-Nummer = eingespannte Kombination
  pgm.addColumns('tool_number_list_items', {
    holder_tool_master_id: { type: 'integer', references: 'tool_master', onDelete: 'SET NULL',
                             comment: 'Aufnahme (tool_master, Kategorie Holders)' },
    stick_out_length:      { type: 'decimal(10,3)', comment: 'Standard-Ausspannlänge aus Halter in mm (TopSolid LPR)' },
    stick_out_min:         { type: 'decimal(10,3)', comment: 'zulässig min. (LPR_MIN)' },
    stick_out_max:         { type: 'decimal(10,3)', comment: 'zulässig max. (LPR_MAX)' },
    overall_length:        { type: 'decimal(10,3)', comment: 'Standard-Ausladung ab Spindelnase in mm (A der Aufnahme + LPR)' },
    cam_data:              { type: 'jsonb', comment: 'Weitere CAM-Werte (Schneidenlänge, Freistich, Kühlung …)' },
    external_source:       { type: 'varchar(30)' },
    external_ref:          { type: 'varchar(255)', comment: 'TopSolid ToolPdmItemId' },
    external_synced_at:    { type: 'timestamp' }
  });
  pgm.createIndex('tool_number_list_items', 'holder_tool_master_id');
  pgm.createIndex('tool_number_list_items', ['external_source', 'external_ref']);

  // 4) 3D-Modelle
  pgm.dropConstraint('tool_documents', 'tool_documents_document_type_check');
  pgm.addConstraint('tool_documents', 'tool_documents_document_type_check', {
    check: "document_type IN ('datasheet','drawing','certificate','manual','photo','model_3d','other')"
  });
  pgm.createTable('tool_number_item_documents', {          // Modell der Baugruppe (Werkzeug + Aufnahme)
    id: 'id',
    list_item_id: { type: 'integer', notNull: true, references: 'tool_number_list_items', onDelete: 'CASCADE' },
    document_type: { type: 'varchar(30)', notNull: true, comment: "'model_step' | 'model_glb'" },
    file_name: { type: 'varchar(255)', notNull: true },
    file_path: { type: 'varchar(500)', notNull: true },
    file_size: { type: 'integer', notNull: true },
    mime_type: { type: 'varchar(100)', notNull: true },
    uploaded_by: { type: 'integer', references: 'users', onDelete: 'SET NULL' },
    uploaded_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  // 5) Import-Protokoll (Audit-Trail)
  pgm.createTable('tool_imports', {
    id: 'id',
    source: { type: 'varchar(30)', notNull: true },               // 'topsolid'
    tool_number_list_id: { type: 'integer', references: 'tool_number_lists', onDelete: 'SET NULL' },
    source_document: { type: 'varchar(255)' },                    // z. B. CAM-Dokumentname
    file_name: { type: 'varchar(255)' },
    summary: { type: 'jsonb', notNull: true },                    // gezählte + einzelne Aktionen
    created_by: { type: 'integer', references: 'users', onDelete: 'SET NULL' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });
};
```

### Offener Punkt: Eindeutigkeit von `article_number`

`tool_master.article_number` ist **allein** UNIQUE. Zwei Hersteller mit derselben Bestellnummer
kollidieren dann. Vorschlag: Constraint auf `(manufacturer, article_number)` umstellen. Vorher die
bestehenden Daten auf Duplikate und leere Hersteller prüfen. Das ist eine eigene Migration, sie ist
für den Import nicht zwingend.

---

## 5. Feld-Mapping

Präfix `~` = `$TopSolid.Cam.NC.Kernel.DB.Tools.Entities.Tool.`

### Grundkörper → `tool_master` (`item_type = 'tool'`)

| TopSolid | MDS | Bemerkung |
|---|---|---|
| `~ComponentToolBody.Manufacturer` | `manufacturer` | normalisieren (Abschn. 6) |
| `~ComponentToolBody.ManufacturerPartNumber` | `manufacturer_part_number` + `article_number` | Abgleichschlüssel |
| `~ComponentToolBody.Name` | `tool_name` | |
| `~ToolFunction` (`TwistDrill`, `EndMill` …) | `category_id` / `subcategory_id` | Zuordnungstabelle, s. u. |
| `~MachiningDiameter` | `diameter` | mm |
| `~ToolLength` | `length` | mm |
| `~NumberOfToolTeeth` | `flutes` | |
| `~CuttingToolMaterialCategory` | `material` | „Beschichtetes Hartmetall“ → `Carbide` + Beschichtung offen |
| `~CornerRadius` | `custom_fields.corner_radius` | mm |
| `~TipAngle` | `custom_fields.tip_angle` | ° (nur Bohrer/Anbohrer) |
| `~FluteLength` | `custom_fields.flute_length` | mm |
| `~ToolShankDiameter` | `custom_fields.shank_diameter` | **m → mm** |
| `~CoolantNozzle` | `custom_fields.coolant_through` | Wahr/Falsch → bool |
| `~CenterCutting` | `custom_fields.center_cutting` | |
| `~Pitch`, `~NominalDiameter` | `custom_fields.thread_pitch`, `thread_size` | nur Gewinde |
| `~ToolPdmItemId` | – | nicht am Körper (gehört zur T-Nummer) |

`ToolFunction` → Kategorie (Startwerte, im Import-Dialog änderbar):

| ToolFunction | Kategorie / Unterkategorie |
|---|---|
| `TwistDrill` | Drilling / Twist Drill |
| `CenterDrill` (Anbohrer) | Drilling / Spot Drill |
| `Reamer` | Drilling / Reamer |
| `EndMill` | Milling / End Mill |
| `BallEndMill` (Radienfräser) | Milling / Ball Nose |
| `ChamferMill` (Fasenfräser) | Milling / Chamfer |
| `ThreadMill` | Threading / Thread Mill |

Die genauen Enum-Namen aus TopSolid stehen in `tools.json` (`~ToolFunction`) und werden beim
ersten echten Import ergänzt.

### Aufnahme → `tool_master` (`item_type = 'accessory'`, Kategorie Holders)

| TopSolid | MDS |
|---|---|
| `~ComponentToolHolder.Manufacturer` | `manufacturer` |
| `~ComponentToolHolder.ManufacturerPartNumber` (leer → `Code`) | `manufacturer_part_number` / `article_number` |
| `~ComponentToolHolder.Name` | `tool_name` |
| `~ToolShank` (HSK63) | `custom_fields.interface` |
| `~ToolChuckDiameter` | `custom_fields.chuck_diameter` (**m → mm**) |
| `~ComponentToolHolder.Code` | `custom_fields.cam_code` |

### T-Nummer → `tool_number_list_items`

| TopSolid | MDS |
|---|---|
| `~DefinitionDocument.ErpPartNumber` | `tool_number` |
| `~ToolDefinitionName` | `description` |
| Grundkörper (Abgleich) | `preferred_tool_master_id` |
| Aufnahme (Abgleich) | `holder_tool_master_id` |
| `LPR` / `LPR_MIN` / `LPR_MAX` der Schneide (Bibliothek) | `stick_out_length` / `stick_out_min` / `stick_out_max` |
| A der Aufnahme + `LPR` | `overall_length` (Ausladung ab Spindelnase) |
| `~ShankDistance` / `~ChuckDistance` (CAM-Export) | je Programm in `tool_list_items` (Phase 3), Abweichung zum Standard markieren |
| `~CuttingLength`, `~DepthDrilling` … | `cam_data` |
| `~ToolPdmItemId` | `external_ref` (`external_source = 'topsolid'`) |
| `<T>.stp`, `<T>.glb` | `tool_number_item_documents` |

---

## 6. Import-Ablauf

### Grundsatz

**Nichts wird ohne Bestätigung geschrieben.** Der Import erzeugt immer zuerst eine Vorschau, und
erst „Übernehmen“ schreibt alles in einer Transaktion. Bestand, Lagerorte und Bestellungen fasst der
Import **nie** an: Neue Stammsätze haben einfach keinen Bestand.

### Endpoints

```
POST /api/tool-number-lists/:id/import/topsolid/preview    multipart: tools.json [+ Modelle als .zip]
  → { importToken, items: [ { tNumber, status, body:{match,…}, holder:{match,…}, changes:[…] } ], warnings }

POST /api/tool-number-lists/:id/import/topsolid/commit     { importToken, decisions: [ … ] }
  → { importId, summary }

GET  /api/tool-imports?listId=…                            Protokoll
GET  /api/tool-number-list-items/:id/model/view            Modell (glb) für Viewer, File-Upload-Standard
```

`importToken`: Die Vorschau wird serverseitig zwischengespeichert, z. B. als temporäre Datei mit 30 min
Gültigkeit. So kann der Commit nicht mit veränderten Daten aufgerufen werden.

### Abgleichregeln

1. **T-Nummer**: zuerst über `(external_source, external_ref)`, dann über `tool_number` in der Zielliste.
2. **Grundkörper / Aufnahme**: über Hersteller + Bestellnummer (normalisiert), dann über `external_ref`.
3. **Normalisierung** zum Vergleichen (nicht zum Speichern): Kleinbuchstaben, `ü→ue`, Leerzeichen
   und `-` entfernen. Damit gilt `Gühring 3899-2,550` = `Guehring 3899 2,550`.
4. Optional: eine Alias-Tabelle für Hersteller (`Gühring` ⇄ `Guehring`), sobald mehr Fälle auftreten.

### Status je Zeile in der Vorschau

| Status | Bedeutung | Standard-Aktion |
|---|---|---|
| 🟢 **gleich** | T-Nummer, Werkzeug und Aufnahme vorhanden, Werte identisch | nichts |
| 🔵 **neu** | T-Nummer nicht in der Liste | anlegen und zuordnen |
| 🟡 **geändert** | z. B. andere Ausspannlänge oder andere Aufnahme | Änderung anzeigen, Häkchen setzt der Nutzer |
| 🟠 **Werkzeug fehlt** | Grundkörper/Aufnahme nicht im Stamm | Stammsatz neu anlegen **oder** vorhandenen auswählen |
| 🔴 **Konflikt** | Bestellnummer passt, aber Ø/Typ weicht ab | nichts ohne manuelle Entscheidung |
| ⚪ **nur im MDS** | T-Nummer in Liste, aber nicht im Import | nur Hinweis, nie automatisch löschen |

Die Vorschau zeigt außerdem, wie viele der benötigten Werkzeuge im Lager sind. Daraus lässt sich
auch die Frage „kann das Programm laufen?“ beantworten, Vorstufe zu Phase 3.

---

## 7. Werte-Normalisierung

TopSolid liefert Text mit Einheit und deutschem Dezimalkomma. Dafür gibt es zwei Wege:

- **A – im Backend parsen:** `"0,006m"` → 6.0, `"140°"` → 140, `"Wahr"` → true. Das ist schnell
  gemacht, hängt aber an der Sprache/Einheitenanzeige von TopSolid.
- **B – im Exporter normalisieren (empfohlen):** `TS_LibExport` (und `TS_ToolExport`) liest die Werte über die API typisiert
  (SI-Einheiten) und schreibt zusätzlich einen festen Block je Werkzeug:

```json
{
  "schema": "mds-tool-import/1",
  "source": "topsolid", "sourceDocument": "TEIL-0001", "exportedAt": "2026-10-06T10:12:00",
  "tools": [{
    "externalRef": "19_56cddaa4-…&3_25",
    "tNumber": "11035",
    "name": "T11035 Bohrer D3,5 IKZ",
    "function": "TwistDrill",
    "body":   { "manufacturer": "Holex", "partNumber": "122666 3,5", "name": "Spiralbohrer D3,5 VHM IKZ",
                "diameter": 3.5, "length": 28, "fluteLength": 28, "cornerRadius": 0, "tipAngle": 140,
                "shankDiameter": 6, "flutes": 2, "material": "Beschichtetes Hartmetall", "coolantThrough": true },
    "holder": { "manufacturer": "Garant", "partNumber": "308189 6", "code": "HLD_001",
                "name": "Schrumpfaufnahme D6 A120 HSK63", "interface": "HSK63", "chuckDiameter": 63 },
    "stickOut": 33, "gaugeLength": 153,
    "usage": { "timeS": 90.4, "feedLengthMm": 157.2 },
    "models": { "step": "T11035 Bohrer D3,5 IKZ.stp", "glb": "T11035 Bohrer D3,5 IKZ.glb" },
    "raw": { "…alle 118 Parameter…": "" }
  }]
}
```

Alle Längen sind in **mm**, Winkel in **°**, Zeiten in **s**. Das Backend validiert nur noch gegen
dieses Schema, und `raw` bleibt zur Fehlersuche erhalten.

---

## 8. Anbindung NC-Viewer

Der Viewer (`NC-Viewer.html`) hat bisher nur den Ø aus dem Werkzeugkommentar. Mit dem Import kann er:

- echten Ø und Eckradius für die Radiuskorrektur nutzen (`GET /api/tool-number-lists/:id/items` → `tool_number`)
- das **Werkzeugmodell inkl. Aufnahme** (glb, ~15 KB) statt des Ersatzzylinders zeigen
- fehlende T-Nummern markieren („T13100 nicht in Liste C22“)

Der Viewer kann das auch ohne MDS: `tools.json` + .glb per Drag & Drop, gleiche Datenstruktur.

---

## 9. Umsetzung

### Phase 0 – Erkundung
- [x] `TS_ToolExport`: Werkzeuge aus CAM-Dokument (118 Parameter, STEP, glb)
- [x] `TS_LibExport` Erkundungslauf: 878 Komponenten, 691 Werkzeuge, ISO-13399-Parameter, T-Nummer = ErpPartNumber
- [x] Zuordnung ISO-13399 → MDS (Abschn. 1b)
- [x] Ausspannlänge: Bibliothek = `LPR` (Standard), CAM-Dokument = je Programm anpassbar in `LPR_MIN`…`LPR_MAX`
- [ ] Datenbereinigung in TopSolid (doppelte T-Nummern, Bestellnummern, Hersteller)

### Phase 1 – Stammdaten + T-Nummern (Kern)
- [ ] Migration (Abschn. 4)
- [ ] `TS_LibExport`: `components.json` + `tools.json` im Format `mds-tool-import/1` (Abschn. 7)
- [ ] Backend: Parser/Validator, Abgleich, `preview` + `commit`, `tool_imports`
- [ ] `.http`-Tests: neu / gleich / geändert / fehlt / Konflikt / doppelte Bestellnummer /
      Hersteller-Schreibweise / leerer Halter-PN / Re-Import gleicher Datei / abgelaufenes Token
- [ ] Frontend: Button „Aus TopSolid importieren“ in der T-Nummern-Liste, Vorschau-Tabelle mit Status
- [ ] Frontend: Halter + Ausspannlänge in der T-Nummern-Ansicht anzeigen/bearbeiten

### Phase 2 – Modelle
- [ ] Upload STEP/glb (zip) im Import, `tool_number_item_documents`
- [ ] `/view` + `/download` nach File-Upload-Standard
- [ ] 3D-Vorschau in der T-Nummern-Ansicht (three.js, glb)

### Phase 3 – Programme
- [ ] Beim Import eines NC-Programms: `TOOL CALL`-Nummern parsen (Interpreter `hh.js`) →
      `tool_list_items` befüllen, mit T-Nummern-Liste der Maschine abgleichen
- [ ] Laufzeit je Werkzeug aus TopSolid (`usage`) übernehmen
- [ ] Ausspannlänge je Programm übernehmen (`ShankDistance`), Abweichung vom Standard im Rüstblatt hervorheben, außerhalb MIN/MAX = Fehler
- [ ] Migration: `tool_list_items` + `stick_out_length`, `stick_out_deviates` (bool)
- [ ] Prüfung „alle Werkzeuge im Lager?“ vor Freigabe

---

## 10. Offene Fragen

1. **Eine Liste je Maschine oder je TopSolid-Bibliothek?** Die T-Nummern scheinen maschinenübergreifend
   zu gelten (ERP-Nummer). Vorschlag: eine Liste je Werkzeugbibliothek („TopSolid Werkzeuge“), über
   `machine_tool_number_lists` mehreren Maschinen zugeordnet.
2. **Aufnahmen als `tool_master` oder als Spannmittel?** Vorschlag: `tool_master`, weil sie wie Fräser
   gelagert und bestellt werden. Spannmittel bleibt für die Werkstückspannung. Ein eigener
   `item_type = 'holder'` wäre sauberer, zieht aber `storage_items.check_item_type` und mehrere
   Views mit `item_type IN ('tool','insert','accessory')` nach (u. a. 1737000080000), deshalb
   zunächst `accessory` + Kategorie „Holders“.
3. **Wer ist führend?** Vorschlag: Für Geometrie und Ausspannlänge ist TopSolid führend, für Lager,
   Bestellung und Alternativen das MDS. Wer im MDS die Ausspannlänge ändert, bekommt beim nächsten
   Import 🟡 „geändert“ angezeigt.
4. **Nachgeschliffene Werkzeuge** (kleinerer Ø): die bleiben ein Thema der Lagerverwaltung
   (`reground`) und kommen nicht aus TopSolid.
5. **Beschichtung**: TopSolid liefert nur „Beschichtetes Hartmetall“. Die konkrete Beschichtung
   (TiAlN …) muss wie bisher im MDS gepflegt werden. Beim Abgleich wird sie nicht überschrieben.

---

## Anhang: TS_ToolExport

| Datei | Zweck |
|---|---|
| `TS_ToolExport.exe` | liest das aktive CAM-Dokument (TopSolid muss laufen) |
| `1_Werkzeugdaten.bat` | nur `tools.json` + `tools.txt` |
| `2_mit_Geometrie.bat` | zusätzlich STEP + glb je Werkzeug (`--geo`) |
| Option `--alle` | auch nicht verwendete Werkzeuge des Dokuments |

Ausgabe: `ToolExport\<Dokument>\`. Die TopSolid-DLLs und Kundendaten gehören **nicht** ins Repo.
