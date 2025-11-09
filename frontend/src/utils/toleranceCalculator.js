// frontend/src/utils/toleranceCalculator.js

/**
 * ISO 286-1 Toleranzberechnungen
 * ISO 2768-1 Allgemeintoleranzen
 */

// ==============================================
// ISO 286-1: Grundtoleranzen (IT) in µm
// ==============================================
const IT_VALUES = {
  // Maßbereich: [von, bis, IT6, IT7, IT8, IT9, IT11]
  ranges: [
    [0, 3, 5, 8, 12, 20, 48],
    [3, 6, 6, 10, 14, 25, 60],
    [6, 10, 9, 15, 22, 36, 90],
    [10, 18, 11, 18, 27, 43, 110],
    [18, 30, 13, 21, 33, 52, 130],
    [30, 50, 16, 25, 39, 62, 160],
    [50, 80, 19, 30, 46, 74, 190],
    [80, 120, 22, 35, 54, 87, 220],
    [120, 180, 25, 40, 63, 100, 250],
    [180, 250, 29, 46, 72, 115, 290],
    [250, 315, 32, 52, 81, 130, 320],
    [315, 400, 36, 57, 89, 140, 360],
    [400, 500, 40, 63, 97, 155, 400],
  ]
};

// IT Grade Mapping
const IT_GRADES = {
  6: 2,
  7: 3,
  8: 4,
  9: 5,
  11: 6
};

/**
 * Ermittelt IT-Wert basierend auf Nennmaß und Grade
 */
function getITValue(nominal, grade) {
  const gradeIndex = IT_GRADES[grade];
  if (!gradeIndex) return null;

  for (const range of IT_VALUES.ranges) {
    if (nominal > range[0] && nominal <= range[1]) {
      return range[gradeIndex]; // µm
    }
  }
  return null;
}

// ==============================================
// ISO 286-1: Grundabmaße für F, G, f, g
// ==============================================
const FUNDAMENTAL_DEVIATIONS = {
  // Bohrungen (Großbuchstaben) - Unteres Abmaß in µm
  'F': {
    ranges: [
      [0, 3, 6],
      [3, 6, 10],
      [6, 10, 13],
      [10, 18, 16],
      [18, 30, 20],
      [30, 50, 25],
      [50, 80, 30],
      [80, 120, 36],
      [120, 180, 43],
      [180, 250, 50],
      [250, 315, 56],
      [315, 400, 62],
      [400, 500, 68],
    ]
  },
  'G': {
    ranges: [
      [0, 3, 2],
      [3, 6, 4],
      [6, 10, 5],
      [10, 18, 6],
      [18, 30, 7],
      [30, 50, 9],
      [50, 80, 10],
      [80, 120, 12],
      [120, 180, 14],
      [180, 250, 15],
      [250, 315, 17],
      [315, 400, 18],
      [400, 500, 20],
    ]
  },
  // Wellen (Kleinbuchstaben) - Oberes Abmaß in µm (negativ)
  'f': {
    ranges: [
      [0, 3, -6],
      [3, 6, -10],
      [6, 10, -13],
      [10, 18, -16],
      [18, 30, -20],
      [30, 50, -25],
      [50, 80, -30],
      [80, 120, -36],
      [120, 180, -43],
      [180, 250, -50],
      [250, 315, -56],
      [315, 400, -62],
      [400, 500, -68],
    ]
  },
  'g': {
    ranges: [
      [0, 3, -2],
      [3, 6, -4],
      [6, 10, -5],
      [10, 18, -6],
      [18, 30, -7],
      [30, 50, -9],
      [50, 80, -10],
      [80, 120, -12],
      [120, 180, -14],
      [180, 250, -15],
      [250, 315, -17],
      [315, 400, -18],
      [400, 500, -20],
    ]
  }
};

/**
 * Ermittelt Grundabmaß
 */
function getFundamentalDeviation(nominal, letter) {
  const deviationData = FUNDAMENTAL_DEVIATIONS[letter];
  if (!deviationData) return null;

  for (const range of deviationData.ranges) {
    if (nominal > range[0] && nominal <= range[1]) {
      return range[2]; // µm
    }
  }
  return null;
}

// ==============================================
// ISO 286: Toleranzberechnung
// ==============================================

/**
 * Berechnet ISO 286 Toleranz
 * @param {number} nominal - Nennmaß in mm
 * @param {string} letter - Toleranzlage (H, h, F, f, G, g)
 * @param {number} grade - Toleranzgrad (6, 7, 8, 9, 11)
 * @returns {object|null} - { upper, lower, min, max, tolerance }
 */
export function calculateISO286(nominal, letter, grade) {
  if (!nominal || nominal <= 0) return null;

  const it = getITValue(nominal, grade);
  if (!it) return null;

  const itMM = it / 1000; // µm → mm
  let upper, lower;

  // Bohrungen (Großbuchstaben)
  if (letter === letter.toUpperCase()) {
    if (letter === 'H') {
      // H: Unteres Abmaß = 0, oberes Abmaß = +IT
      lower = 0;
      upper = itMM;
    } else {
      // F, G: Grundabmaß + IT
      const fundamentalDev = getFundamentalDeviation(nominal, letter);
      if (fundamentalDev === null) return null;
      
      const fundamentalDevMM = fundamentalDev / 1000;
      lower = fundamentalDevMM;
      upper = fundamentalDevMM + itMM;
    }
  } 
  // Wellen (Kleinbuchstaben)
  else {
    if (letter === 'h') {
      // h: Oberes Abmaß = 0, unteres Abmaß = -IT
      upper = 0;
      lower = -itMM;
    } else {
      // f, g: Grundabmaß - IT
      const fundamentalDev = getFundamentalDeviation(nominal, letter);
      if (fundamentalDev === null) return null;
      
      const fundamentalDevMM = fundamentalDev / 1000;
      upper = fundamentalDevMM;
      lower = fundamentalDevMM - itMM;
    }
  }

  // Grenzmaße berechnen
  const min = nominal + lower;
  const max = nominal + upper;
  const mean = (min + max) / 2;

  // Toleranzstring formatieren
  const tolerance = `${letter}${grade} (${upper >= 0 ? '+' : ''}${upper.toFixed(3)}/${lower >= 0 ? '+' : ''}${lower.toFixed(3)})`;

  return {
    upper: parseFloat(upper.toFixed(4)),
    lower: parseFloat(lower.toFixed(4)),
    min: parseFloat(min.toFixed(4)),
    max: parseFloat(max.toFixed(4)),
    mean: parseFloat(mean.toFixed(4)),
    tolerance
  };
}

// ==============================================
// ISO 2768-1: Allgemeintoleranzen
// ==============================================

const ISO2768_TOLERANCES = {
  'f': { // fein
    label: 'f - fein',
    ranges: [
      [0, 3, 0.05],
      [3, 6, 0.05],
      [6, 30, 0.1],
      [30, 120, 0.15],
      [120, 400, 0.2],
      [400, 1000, 0.3],
      [1000, 2000, 0.5],
    ]
  },
  'm': { // mittel
    label: 'm - mittel',
    ranges: [
      [0, 3, 0.1],
      [3, 6, 0.1],
      [6, 30, 0.2],
      [30, 120, 0.3],
      [120, 400, 0.5],
      [400, 1000, 0.8],
      [1000, 2000, 1.2],
    ]
  },
  'c': { // grob
    label: 'c - grob',
    ranges: [
      [0, 3, 0.2],
      [3, 6, 0.3],
      [6, 30, 0.5],
      [30, 120, 0.8],
      [120, 400, 1.2],
      [400, 1000, 2.0],
      [1000, 2000, 3.0],
    ]
  },
  'v': { // sehr grob
    label: 'v - sehr grob',
    ranges: [
      [0, 3, 0.5],
      [3, 6, 1.0],
      [6, 30, 1.5],
      [30, 120, 2.5],
      [120, 400, 4.0],
      [400, 1000, 6.0],
      [1000, 2000, 8.0],
    ]
  }
};

/**
 * Berechnet ISO 2768 Allgemeintoleranz
 * @param {number} nominal - Nennmaß in mm
 * @param {string} grade - Toleranzklasse (f, m, c, v)
 * @returns {object|null} - { tolerance, min, max }
 */
export function calculateISO2768(nominal, grade) {
  if (!nominal || nominal <= 0) return null;

  const gradeData = ISO2768_TOLERANCES[grade];
  if (!gradeData) return null;

  let toleranceValue = null;

  for (const range of gradeData.ranges) {
    if (nominal > range[0] && nominal <= range[1]) {
      toleranceValue = range[2];
      break;
    }
  }

  if (toleranceValue === null) return null;

  const min = nominal - toleranceValue;
  const max = nominal + toleranceValue;
  const mean = (min + max) / 2;
  const tolerance = `ISO2768-${grade} (±${toleranceValue})`;

  return {
    tolerance,
    min: parseFloat(min.toFixed(4)),
    max: parseFloat(max.toFixed(4)),
    mean: parseFloat(mean.toFixed(4))
  };
}

// ==============================================
// Verfügbare Toleranzen
// ==============================================

export const AVAILABLE_TOLERANCES = {
  iso286: {
    letters: [
      { value: 'H', label: 'H (Bohrung)' },
      { value: 'F', label: 'F (Bohrung)' },
      { value: 'G', label: 'G (Bohrung)' },
      { value: 'h', label: 'h (Welle)' },
      { value: 'f', label: 'f (Welle)' },
      { value: 'g', label: 'g (Welle)' },
    ],
    grades: [
      { value: 6, label: '6' },
      { value: 7, label: '7' },
      { value: 8, label: '8' },
      { value: 9, label: '9' },
      { value: 11, label: '11' },
    ]
  },
  iso2768: [
    { value: 'f', label: 'f - fein' },
    { value: 'm', label: 'm - mittel' },
    { value: 'c', label: 'c - grob' },
    { value: 'v', label: 'v - sehr grob' },
  ]
};
