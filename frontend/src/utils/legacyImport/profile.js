/**
 * Import-Profil für den Altbestand an Messprogrammen (Spec: docs/konzepte/ALTBESTAND_IMPORT_SPEC.md, 3)
 *
 * Betriebsspezifisch: So waren die Programmordner auf dem Netzlaufwerk aufgebaut. Ordner werden über
 * Stichwörter erkannt, die Nummer am Anfang (01_, 3_ …) zählt nicht. Ein anderer Betrieb passt diese
 * Tabelle an oder nutzt den Helfer nicht – sonst hängt nichts im MDS davon ab.
 *
 * Reines Modul ohne React/axios (wird auch von Node-Tests geladen).
 */

export const DEFAULT_PROFILE = {
  folders: [
    { key: 'program', match: /messprogramm/i },
    { key: 'measurement_data', match: /messdaten/i, skip: 'Messdaten – bleiben im Archiv, nicht übernommen' },
    {
      key: 'setup',
      match: /aufspann/i,
      children: [
        { key: 'photos', match: /bilder|fotos?/i },
        { key: 'drawing', match: /zeichnung/i },
        {
          key: 'instruction',
          match: /arbeitsanweisung|einricht/i,
          skip: 'Arbeitsanweisung/Excel-Einrichteblatt – nicht übernommen (Anweisung bei Bedarf von Hand ins Einrichteblatt)',
        },
        { key: 'cad', match: /cad/i },
      ],
    },
    { key: 'calibration', match: /taster|kalibr/i },
    { key: 'old', match: /alte\s*daten/i, skip: 'Alte Daten – bleiben im Archiv, nicht übernommen' },
  ],
  // Bildformate, die das Einrichteblatt annimmt
  photoExtensions: ['jpg', 'jpeg', 'png', 'webp'],
};
