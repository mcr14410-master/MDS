/* eslint-disable camelcase */

/**
 * Migration: Add custom_field_definitions to tool_categories
 * 
 * Ermöglicht kategorie-spezifische Custom Fields mit dynamischer UI-Generierung
 * 
 * Custom Field Definition Structure:
 * {
 *   "key": "corner_radius",           // Field name in custom_fields JSON
 *   "label": "Eckradius",             // UI Label (German)
 *   "type": "number",                 // text|number|select|checkbox
 *   "unit": "mm",                     // Optional: Display unit
 *   "required": false,
 *   "default": null,
 *   "min": 0,                         // For type=number
 *   "max": 10,
 *   "step": 0.1,
 *   "placeholder": "z.B. 0.2",
 *   "help": "Eckradius des Fräsers"  // Optional: Help text
 * }
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ============================================================================
  // 1. Add custom_field_definitions column to tool_categories
  // ============================================================================
  pgm.addColumn('tool_categories', {
    custom_field_definitions: {
      type: 'jsonb',
      comment: 'JSON Array mit Custom Field Definitionen für diese Kategorie'
    }
  });

  // Create GIN index for efficient JSONB queries
  pgm.createIndex('tool_categories', 'custom_field_definitions', {
    method: 'gin'
  });

  // ============================================================================
  // 2. SEED DATA - Custom Field Definitions für jede Kategorie
  // ============================================================================

  // --------------------------------------------------------------------------
  // Milling (Fräswerkzeuge) - Category ID 1
  // --------------------------------------------------------------------------
  pgm.sql(`
    UPDATE tool_categories 
    SET custom_field_definitions = '[
      {
        "key": "corner_radius",
        "label": "Eckradius",
        "type": "number",
        "unit": "mm",
        "required": false,
        "default": null,
        "min": 0,
        "max": 10,
        "step": 0.1,
        "placeholder": "z.B. 0.2",
        "help": "Eckradius des Fräsers (0 = ohne Radius)"
      },
      {
        "key": "helix_angle",
        "label": "Drallwinkel",
        "type": "number",
        "unit": "°",
        "required": false,
        "default": null,
        "min": 0,
        "max": 90,
        "step": 1,
        "placeholder": "z.B. 30",
        "help": "Drallwinkel in Grad"
      },
      {
        "key": "center_cutting",
        "label": "Zentrierend",
        "type": "checkbox",
        "required": false,
        "default": false,
        "help": "Kann das Werkzeug in Z-Achse eintauchen?"
      },
      {
        "key": "cutting_edge_length",
        "label": "Schneidenlänge",
        "type": "number",
        "unit": "mm",
        "required": false,
        "default": null,
        "min": 0,
        "max": 200,
        "step": 0.1,
        "help": "Nutzbare Schneidenlänge"
      },
      {
        "key": "shank_diameter",
        "label": "Schaftdurchmesser",
        "type": "number",
        "unit": "mm",
        "required": false,
        "default": null,
        "min": 0,
        "max": 50,
        "step": 0.1,
        "help": "Durchmesser des Werkzeugschaftes"
      }
    ]'::jsonb
    WHERE name = 'Milling';
  `);

  // --------------------------------------------------------------------------
  // Drilling (Bohrwerkzeuge) - Category ID 2
  // --------------------------------------------------------------------------
  pgm.sql(`
    UPDATE tool_categories 
    SET custom_field_definitions = '[
      {
        "key": "point_angle",
        "label": "Spitzenwinkel",
        "type": "number",
        "unit": "°",
        "required": false,
        "default": 118,
        "min": 90,
        "max": 140,
        "step": 1,
        "placeholder": "z.B. 118",
        "help": "Spitzenwinkel des Bohrers (Standard: 118°)"
      },
      {
        "key": "point_type",
        "label": "Spitzenform",
        "type": "select",
        "required": false,
        "default": "standard",
        "options": [
          {"value": "standard", "label": "Standard"},
          {"value": "split_point", "label": "Kreuzanschliff"},
          {"value": "parabolic", "label": "Parabolisch"},
          {"value": "flat", "label": "Flach"}
        ],
        "help": "Form der Bohrerspitze"
      },
      {
        "key": "coolant_through",
        "label": "Innenkühlung",
        "type": "checkbox",
        "required": false,
        "default": false,
        "help": "Bohrer mit Kühlmittelzufuhr durch das Werkzeug"
      },
      {
        "key": "flute_length",
        "label": "Nutenlänge",
        "type": "number",
        "unit": "mm",
        "required": false,
        "default": null,
        "min": 0,
        "max": 500,
        "step": 0.1,
        "help": "Länge der Spannut"
      },
      {
        "key": "shank_type",
        "label": "Schaftform",
        "type": "select",
        "required": false,
        "default": "cylindrical",
        "options": [
          {"value": "cylindrical", "label": "Zylindrisch"},
          {"value": "morse_taper", "label": "Morsekegel"},
          {"value": "weldon", "label": "Weldon"},
          {"value": "whistle_notch", "label": "Whistle Notch"}
        ],
        "help": "Schaftform für Werkzeugaufnahme"
      }
    ]'::jsonb
    WHERE name = 'Drilling';
  `);

  // --------------------------------------------------------------------------
  // Turning (Drehwerkzeuge) - Category ID 3
  // --------------------------------------------------------------------------
  pgm.sql(`
    UPDATE tool_categories 
    SET custom_field_definitions = '[
      {
        "key": "holder_size",
        "label": "Halterschafthöhe",
        "type": "number",
        "unit": "mm",
        "required": false,
        "default": null,
        "min": 6,
        "max": 50,
        "step": 1,
        "placeholder": "z.B. 20",
        "help": "Schafthöhe des Drehhalters (z.B. 20x20mm)"
      },
      {
        "key": "insert_size",
        "label": "Plattengröße",
        "type": "text",
        "required": false,
        "default": null,
        "maxLength": 20,
        "placeholder": "z.B. CNMG120408",
        "help": "ISO-Bezeichnung der verwendeten Wendeschneidplatte"
      },
      {
        "key": "hand",
        "label": "Ausführung",
        "type": "select",
        "required": false,
        "default": "neutral",
        "options": [
          {"value": "neutral", "label": "Neutral"},
          {"value": "right", "label": "Rechts"},
          {"value": "left", "label": "Links"}
        ],
        "help": "Hand/Richtung des Drehhalters"
      },
      {
        "key": "clamp_type",
        "label": "Befestigungsart",
        "type": "select",
        "required": false,
        "default": "screw",
        "options": [
          {"value": "screw", "label": "Schraube"},
          {"value": "lever", "label": "Hebel"},
          {"value": "pin", "label": "Stift"},
          {"value": "clamp", "label": "Klemme"}
        ],
        "help": "Art der Plattenbefestigung"
      }
    ]'::jsonb
    WHERE name = 'Turning';
  `);

  // --------------------------------------------------------------------------
  // Threading (Gewindewerkzeuge) - Category ID 4
  // --------------------------------------------------------------------------
  pgm.sql(`
    UPDATE tool_categories 
    SET custom_field_definitions = '[
      {
        "key": "thread_size",
        "label": "Gewindegröße",
        "type": "text",
        "required": false,
        "default": null,
        "maxLength": 20,
        "placeholder": "z.B. M8",
        "help": "Gewindegröße nach ISO (z.B. M8, M10x1.5)"
      },
      {
        "key": "thread_pitch",
        "label": "Steigung",
        "type": "number",
        "unit": "mm",
        "required": false,
        "default": null,
        "min": 0.25,
        "max": 6,
        "step": 0.05,
        "placeholder": "z.B. 1.25",
        "help": "Gewindesteigung in mm"
      },
      {
        "key": "thread_type",
        "label": "Gewindeart",
        "type": "select",
        "required": false,
        "default": "metric",
        "options": [
          {"value": "metric", "label": "Metrisch (ISO)"},
          {"value": "unc", "label": "UNC (Zoll grob)"},
          {"value": "unf", "label": "UNF (Zoll fein)"},
          {"value": "bsw", "label": "BSW (Whitworth)"},
          {"value": "npt", "label": "NPT (Rohrgewinde)"}
        ],
        "help": "Gewindestandard"
      },
      {
        "key": "tap_type",
        "label": "Bohrerausführung",
        "type": "select",
        "required": false,
        "default": "spiral",
        "options": [
          {"value": "spiral", "label": "Spiralbohrer"},
          {"value": "spiral_point", "label": "Spiralnut"},
          {"value": "forming", "label": "Formend"},
          {"value": "hand", "label": "Hand"}
        ],
        "help": "Typ des Gewindewerkzeugs"
      },
      {
        "key": "through_hole",
        "label": "Durchgangsbohrung",
        "type": "checkbox",
        "required": false,
        "default": true,
        "help": "Für Durchgangsbohrung (ja) oder Sackloch (nein)"
      }
    ]'::jsonb
    WHERE name = 'Threading';
  `);

  // --------------------------------------------------------------------------
  // Reaming (Reibahlen) - Category ID 5
  // --------------------------------------------------------------------------
  pgm.sql(`
    UPDATE tool_categories 
    SET custom_field_definitions = '[
      {
        "key": "tolerance",
        "label": "IT-Toleranz",
        "type": "select",
        "required": false,
        "default": "H7",
        "options": [
          {"value": "H5", "label": "H5"},
          {"value": "H6", "label": "H6"},
          {"value": "H7", "label": "H7"},
          {"value": "H8", "label": "H8"},
          {"value": "H9", "label": "H9"}
        ],
        "help": "ISO-Toleranzklasse für geriebene Bohrung"
      },
      {
        "key": "flute_count",
        "label": "Anzahl Nuten",
        "type": "number",
        "required": false,
        "default": null,
        "min": 4,
        "max": 12,
        "step": 1,
        "placeholder": "z.B. 6",
        "help": "Anzahl der Schneidnuten"
      },
      {
        "key": "neck_diameter",
        "label": "Halsdurchmesser",
        "type": "number",
        "unit": "mm",
        "required": false,
        "default": null,
        "min": 0,
        "max": 50,
        "step": 0.1,
        "help": "Durchmesser des reduzierten Halses"
      },
      {
        "key": "reamer_type",
        "label": "Reibahlentyp",
        "type": "select",
        "required": false,
        "default": "machine",
        "options": [
          {"value": "machine", "label": "Maschinen-Reibahle"},
          {"value": "hand", "label": "Hand-Reibahle"},
          {"value": "shell", "label": "Aufsteck-Reibahle"},
          {"value": "expansion", "label": "Dehn-Reibahle"}
        ],
        "help": "Bauart der Reibahle"
      }
    ]'::jsonb
    WHERE name = 'Reaming';
  `);

  // --------------------------------------------------------------------------
  // Boring (Bohrungswerkzeuge) - Category ID 6
  // --------------------------------------------------------------------------
  pgm.sql(`
    UPDATE tool_categories 
    SET custom_field_definitions = '[
      {
        "key": "min_bore_diameter",
        "label": "Min. Bohrungsdurchmesser",
        "type": "number",
        "unit": "mm",
        "required": false,
        "default": null,
        "min": 0,
        "max": 500,
        "step": 0.1,
        "help": "Minimaler bearbeitbarer Bohrungsdurchmesser"
      },
      {
        "key": "max_bore_diameter",
        "label": "Max. Bohrungsdurchmesser",
        "type": "number",
        "unit": "mm",
        "required": false,
        "default": null,
        "min": 0,
        "max": 500,
        "step": 0.1,
        "help": "Maximaler bearbeitbarer Bohrungsdurchmesser"
      },
      {
        "key": "overhang",
        "label": "Ausladung",
        "type": "number",
        "unit": "mm",
        "required": false,
        "default": null,
        "min": 0,
        "max": 500,
        "step": 1,
        "help": "Maximale Ausladung/Auskragung"
      },
      {
        "key": "adjustment_range",
        "label": "Verstellbereich",
        "type": "number",
        "unit": "mm",
        "required": false,
        "default": null,
        "min": 0,
        "max": 50,
        "step": 0.01,
        "help": "Verstellbereich für Feinjustierung"
      },
      {
        "key": "insert_grade",
        "label": "Plattensorte",
        "type": "text",
        "required": false,
        "default": null,
        "maxLength": 20,
        "placeholder": "z.B. CCMT060204",
        "help": "Verwendete Wendeschneidplatten-Sorte"
      }
    ]'::jsonb
    WHERE name = 'Boring';
  `);

  // --------------------------------------------------------------------------
  // Inserts (Wendeschneidplatten) - Category ID 7
  // --------------------------------------------------------------------------
  pgm.sql(`
    UPDATE tool_categories 
    SET custom_field_definitions = '[
      {
        "key": "insert_shape",
        "label": "Plattenform",
        "type": "select",
        "required": false,
        "default": null,
        "options": [
          {"value": "C", "label": "C - Raute 80°"},
          {"value": "D", "label": "D - Raute 55°"},
          {"value": "S", "label": "S - Quadrat"},
          {"value": "T", "label": "T - Dreieck"},
          {"value": "R", "label": "R - Rund"},
          {"value": "V", "label": "V - Raute 35°"},
          {"value": "W", "label": "W - Sechseck"}
        ],
        "help": "ISO-Plattenform (erster Buchstabe)"
      },
      {
        "key": "clearance_angle",
        "label": "Freiwinkel",
        "type": "select",
        "required": false,
        "default": "N",
        "options": [
          {"value": "N", "label": "N - 0°"},
          {"value": "A", "label": "A - 3°"},
          {"value": "B", "label": "B - 5°"},
          {"value": "C", "label": "C - 7°"},
          {"value": "P", "label": "P - 11°"},
          {"value": "D", "label": "D - 15°"}
        ],
        "help": "Freiwinkel der Wendeschneidplatte"
      },
      {
        "key": "inscribed_circle",
        "label": "Einschreibkreis",
        "type": "number",
        "unit": "mm",
        "required": false,
        "default": null,
        "min": 0,
        "max": 50,
        "step": 0.1,
        "placeholder": "z.B. 12.7",
        "help": "Durchmesser des Einschreibkreises (IC)"
      },
      {
        "key": "thickness",
        "label": "Plattendicke",
        "type": "number",
        "unit": "mm",
        "required": false,
        "default": null,
        "min": 0,
        "max": 20,
        "step": 0.1,
        "placeholder": "z.B. 4.76",
        "help": "Dicke der Wendeschneidplatte"
      },
      {
        "key": "nose_radius",
        "label": "Eckenradius",
        "type": "number",
        "unit": "mm",
        "required": false,
        "default": null,
        "min": 0,
        "max": 3,
        "step": 0.01,
        "placeholder": "z.B. 0.4",
        "help": "Radius der Plattenecke"
      },
      {
        "key": "cutting_edges",
        "label": "Anzahl Schneidkanten",
        "type": "number",
        "required": false,
        "default": null,
        "min": 1,
        "max": 12,
        "step": 1,
        "placeholder": "z.B. 4",
        "help": "Anzahl nutzbarer Schneidkanten"
      },
      {
        "key": "chip_breaker",
        "label": "Spanformer",
        "type": "text",
        "required": false,
        "default": null,
        "maxLength": 10,
        "placeholder": "z.B. MF, MM",
        "help": "Spanformgeometrie nach Hersteller"
      }
    ]'::jsonb
    WHERE name = 'Inserts';
  `);

  // Add comment
  pgm.sql(`
    COMMENT ON COLUMN tool_categories.custom_field_definitions IS 
    'JSONB Array mit Custom Field Definitionen für dynamische UI-Generierung. 
     Struktur: [{"key": "field_name", "label": "UI Label", "type": "number|text|select|checkbox", ...}]';
  `);
};

exports.down = (pgm) => {
  // Remove index first
  pgm.dropIndex('tool_categories', 'custom_field_definitions');
  
  // Remove column
  pgm.dropColumn('tool_categories', 'custom_field_definitions');
};
