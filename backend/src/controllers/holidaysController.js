/**
 * Holidays Controller
 * 
 * Manages public holidays with automatic generation for all German states.
 * Uses Gaussian Easter algorithm for movable holidays.
 * Supports half-days (Heiligabend, Silvester).
 */

const pool = require('../config/db');

// ============================================
// GERMAN STATES CONFIGURATION
// ============================================

const GERMAN_STATES = {
  BW: { name: 'Baden-Württemberg', code: 'BW' },
  BY: { name: 'Bayern', code: 'BY' },
  BE: { name: 'Berlin', code: 'BE' },
  BB: { name: 'Brandenburg', code: 'BB' },
  HB: { name: 'Bremen', code: 'HB' },
  HH: { name: 'Hamburg', code: 'HH' },
  HE: { name: 'Hessen', code: 'HE' },
  MV: { name: 'Mecklenburg-Vorpommern', code: 'MV' },
  NI: { name: 'Niedersachsen', code: 'NI' },
  NW: { name: 'Nordrhein-Westfalen', code: 'NW' },
  RP: { name: 'Rheinland-Pfalz', code: 'RP' },
  SL: { name: 'Saarland', code: 'SL' },
  SN: { name: 'Sachsen', code: 'SN' },
  ST: { name: 'Sachsen-Anhalt', code: 'ST' },
  SH: { name: 'Schleswig-Holstein', code: 'SH' },
  TH: { name: 'Thüringen', code: 'TH' }
};

// State-specific holidays (in addition to nationwide)
const STATE_SPECIFIC_HOLIDAYS = {
  // Heilige Drei Könige (6. Jan) - BW, BY, ST
  'heilige_drei_koenige': ['BW', 'BY', 'ST'],
  // Internationaler Frauentag (8. März) - BE, MV
  'frauentag': ['BE', 'MV'],
  // Fronleichnam - BW, BY, HE, NW, RP, SL, SN (teilweise), TH (teilweise)
  'fronleichnam': ['BW', 'BY', 'HE', 'NW', 'RP', 'SL', 'SN', 'TH'],
  // Mariä Himmelfahrt (15. Aug) - BY, SL
  'mariae_himmelfahrt': ['BY', 'SL'],
  // Weltkindertag (20. Sept) - TH
  'weltkindertag': ['TH'],
  // Reformationstag (31. Okt) - BB, HB, HH, MV, NI, SN, ST, SH, TH
  'reformationstag': ['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'],
  // Allerheiligen (1. Nov) - BW, BY, NW, RP, SL
  'allerheiligen': ['BW', 'BY', 'NW', 'RP', 'SL'],
  // Buß- und Bettag - SN
  'buss_und_bettag': ['SN']
};

// ============================================
// EASTER CALCULATION (Gaussian Algorithm)
// ============================================

/**
 * Calculate Easter Sunday for a given year
 * Uses the Anonymous Gregorian algorithm (Meeus/Jones/Butcher)
 */
function calculateEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
}

/**
 * Calculate Buß- und Bettag (Wednesday before Nov 23)
 */
function calculateBussUndBettag(year) {
  const nov22 = new Date(year, 10, 22);
  const dayOfWeek = nov22.getDay();
  // Wednesday = 3
  const daysBack = (dayOfWeek + 4) % 7;
  return new Date(year, 10, 22 - daysBack);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ============================================
// HOLIDAY GENERATION
// ============================================

/**
 * Generate all holidays for a year and state
 * @param {number} year 
 * @param {string} region - State code (e.g., 'BY', 'NW')
 * @param {boolean} includeHalfDays - Include Heiligabend/Silvester as half-days
 * @returns {Array<{date: string, name: string, is_half_day: boolean}>}
 */
function generateHolidaysForState(year, region = 'BY', includeHalfDays = true) {
  const easter = calculateEaster(year);
  
  const holidays = [];
  
  // ============================================
  // NATIONWIDE HOLIDAYS (all states)
  // ============================================
  holidays.push(
    { date: `${year}-01-01`, name: 'Neujahr', is_half_day: false },
    { date: `${year}-05-01`, name: 'Tag der Arbeit', is_half_day: false },
    { date: `${year}-10-03`, name: 'Tag der Deutschen Einheit', is_half_day: false },
    { date: `${year}-12-25`, name: '1. Weihnachtstag', is_half_day: false },
    { date: `${year}-12-26`, name: '2. Weihnachtstag', is_half_day: false },
    // Easter-based
    { date: formatDate(addDays(easter, -2)), name: 'Karfreitag', is_half_day: false },
    { date: formatDate(addDays(easter, 1)), name: 'Ostermontag', is_half_day: false },
    { date: formatDate(addDays(easter, 39)), name: 'Christi Himmelfahrt', is_half_day: false },
    { date: formatDate(addDays(easter, 50)), name: 'Pfingstmontag', is_half_day: false }
  );
  
  // ============================================
  // STATE-SPECIFIC HOLIDAYS
  // ============================================
  
  // Heilige Drei Könige (6. Jan)
  if (STATE_SPECIFIC_HOLIDAYS.heilige_drei_koenige.includes(region)) {
    holidays.push({ date: `${year}-01-06`, name: 'Heilige Drei Könige', is_half_day: false });
  }
  
  // Internationaler Frauentag (8. März)
  if (STATE_SPECIFIC_HOLIDAYS.frauentag.includes(region)) {
    holidays.push({ date: `${year}-03-08`, name: 'Internationaler Frauentag', is_half_day: false });
  }
  
  // Fronleichnam (60 days after Easter)
  if (STATE_SPECIFIC_HOLIDAYS.fronleichnam.includes(region)) {
    holidays.push({ date: formatDate(addDays(easter, 60)), name: 'Fronleichnam', is_half_day: false });
  }
  
  // Mariä Himmelfahrt (15. Aug)
  if (STATE_SPECIFIC_HOLIDAYS.mariae_himmelfahrt.includes(region)) {
    holidays.push({ date: `${year}-08-15`, name: 'Mariä Himmelfahrt', is_half_day: false });
  }
  
  // Weltkindertag (20. Sept)
  if (STATE_SPECIFIC_HOLIDAYS.weltkindertag.includes(region)) {
    holidays.push({ date: `${year}-09-20`, name: 'Weltkindertag', is_half_day: false });
  }
  
  // Reformationstag (31. Okt)
  if (STATE_SPECIFIC_HOLIDAYS.reformationstag.includes(region)) {
    holidays.push({ date: `${year}-10-31`, name: 'Reformationstag', is_half_day: false });
  }
  
  // Allerheiligen (1. Nov)
  if (STATE_SPECIFIC_HOLIDAYS.allerheiligen.includes(region)) {
    holidays.push({ date: `${year}-11-01`, name: 'Allerheiligen', is_half_day: false });
  }
  
  // Buß- und Bettag (only Sachsen)
  if (STATE_SPECIFIC_HOLIDAYS.buss_und_bettag.includes(region)) {
    holidays.push({ 
      date: formatDate(calculateBussUndBettag(year)), 
      name: 'Buß- und Bettag', 
      is_half_day: false 
    });
  }
  
  // ============================================
  // HALF-DAYS (optional)
  // ============================================
  if (includeHalfDays) {
    holidays.push(
      { date: `${year}-12-24`, name: 'Heiligabend', is_half_day: true },
      { date: `${year}-12-31`, name: 'Silvester', is_half_day: true }
    );
  }
  
  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================
// CONTROLLER METHODS
// ============================================

/**
 * Get available German states
 * GET /api/holidays/states
 */
const getStates = async (req, res) => {
  res.json(Object.values(GERMAN_STATES));
};

/**
 * Get holidays for a year (auto-generates if not exists)
 * GET /api/holidays?year=2025&region=BY
 */
const getHolidays = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const region = req.query.region || 'BY';
    
    // Check if holidays exist for this year
    const checkResult = await pool.query(
      'SELECT COUNT(*) as count FROM holidays WHERE year = $1 AND region = $2',
      [year, region]
    );
    
    // Auto-generate if not exists
    if (parseInt(checkResult.rows[0].count) === 0) {
      await generateHolidaysForYearInternal(year, region);
    }
    
    // Fetch holidays
    const result = await pool.query(
      `SELECT id, date, name, year, region, is_custom, is_half_day, created_at
       FROM holidays 
       WHERE year = $1 AND region = $2
       ORDER BY date`,
      [year, region]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Feiertage' });
  }
};

/**
 * Generate holidays for a year (internal function)
 */
async function generateHolidaysForYearInternal(year, region = 'BY', includeHalfDays = true) {
  const holidays = generateHolidaysForState(year, region, includeHalfDays);
  
  for (const holiday of holidays) {
    await pool.query(
      `INSERT INTO holidays (date, name, year, region, is_custom, is_half_day)
       VALUES ($1, $2, $3, $4, false, $5)
       ON CONFLICT (date, region) DO NOTHING`,
      [holiday.date, holiday.name, year, region, holiday.is_half_day || false]
    );
  }
  
  console.log(`Generated ${holidays.length} holidays for ${year} (${region})`);
}

/**
 * Manually generate holidays for a year
 * POST /api/holidays/generate
 * Body: { year: 2026, region: 'BY', includeHalfDays: true }
 */
const generateHolidays = async (req, res) => {
  try {
    const { year, region = 'BY', includeHalfDays = true } = req.body;
    
    if (!year) {
      return res.status(400).json({ error: 'Jahr ist erforderlich' });
    }
    
    // Delete existing auto-generated holidays for this year (keep custom ones)
    const deleteResult = await pool.query(
      'DELETE FROM holidays WHERE year = $1 AND region = $2 AND is_custom = false RETURNING id',
      [year, region]
    );
    
    // Generate new holidays
    await generateHolidaysForYearInternal(year, region, includeHalfDays);
    
    const result = await pool.query(
      'SELECT * FROM holidays WHERE year = $1 AND region = $2 ORDER BY date',
      [year, region]
    );
    
    const stateName = GERMAN_STATES[region]?.name || region;
    
    res.status(201).json({
      message: `${deleteResult.rowCount} alte Feiertage gelöscht, ${result.rows.filter(h => !h.is_custom).length} neu generiert für ${stateName}`,
      holidays: result.rows
    });
  } catch (error) {
    console.error('Error generating holidays:', error);
    res.status(500).json({ error: 'Fehler beim Generieren der Feiertage' });
  }
};

/**
 * Add a custom holiday
 * POST /api/holidays
 */
const createHoliday = async (req, res) => {
  try {
    const { date, name, region = 'BY', is_half_day = false } = req.body;
    
    if (!date || !name) {
      return res.status(400).json({ error: 'Datum und Name sind erforderlich' });
    }
    
    const year = new Date(date).getFullYear();
    
    const result = await pool.query(
      `INSERT INTO holidays (date, name, year, region, is_custom, is_half_day)
       VALUES ($1, $2, $3, $4, true, $5)
       RETURNING *`,
      [date, name, year, region, is_half_day]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Feiertag für dieses Datum existiert bereits' });
    }
    console.error('Error creating holiday:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Feiertags' });
  }
};

/**
 * Update a holiday
 * PUT /api/holidays/:id
 */
const updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, name, is_half_day } = req.body;
    
    const year = date ? new Date(date).getFullYear() : undefined;
    
    const result = await pool.query(
      `UPDATE holidays 
       SET date = COALESCE($1, date),
           name = COALESCE($2, name),
           year = COALESCE($3, year),
           is_half_day = COALESCE($4, is_half_day)
       WHERE id = $5
       RETURNING *`,
      [date, name, year, is_half_day, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feiertag nicht gefunden' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating holiday:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Feiertags' });
  }
};

/**
 * Delete a holiday
 * DELETE /api/holidays/:id
 */
const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM holidays WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feiertag nicht gefunden' });
    }
    
    res.json({ message: 'Feiertag gelöscht', holiday: result.rows[0] });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Feiertags' });
  }
};

/**
 * Delete all generated holidays for a year
 * DELETE /api/holidays/year/:year
 */
const deleteHolidaysByYear = async (req, res) => {
  try {
    const { year } = req.params;
    const { includeCustom, region } = req.query;
    
    let query = 'DELETE FROM holidays WHERE year = $1';
    const params = [year];
    
    if (region) {
      params.push(region);
      query += ` AND region = $${params.length}`;
    }
    
    if (includeCustom !== 'true') {
      query += ' AND is_custom = false';
    }
    query += ' RETURNING *';
    
    const result = await pool.query(query, params);
    
    res.json({ 
      message: `${result.rows.length} Feiertage gelöscht`,
      deleted: result.rows
    });
  } catch (error) {
    console.error('Error deleting holidays:', error);
    res.status(500).json({ error: 'Fehler beim Löschen der Feiertage' });
  }
};

/**
 * Check if a date is a holiday
 * GET /api/holidays/check?date=2025-12-25&region=BY
 */
const checkHoliday = async (req, res) => {
  try {
    const { date, region = 'BY' } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Datum ist erforderlich' });
    }
    
    const year = new Date(date).getFullYear();
    
    // Ensure holidays exist for this year
    const checkResult = await pool.query(
      'SELECT COUNT(*) as count FROM holidays WHERE year = $1 AND region = $2',
      [year, region]
    );
    
    if (parseInt(checkResult.rows[0].count) === 0) {
      await generateHolidaysForYearInternal(year, region);
    }
    
    const result = await pool.query(
      'SELECT * FROM holidays WHERE date = $1 AND region = $2',
      [date, region]
    );
    
    res.json({
      date,
      isHoliday: result.rows.length > 0,
      isHalfDay: result.rows[0]?.is_half_day || false,
      holiday: result.rows[0] || null
    });
  } catch (error) {
    console.error('Error checking holiday:', error);
    res.status(500).json({ error: 'Fehler beim Prüfen des Feiertags' });
  }
};

/**
 * Get holidays for a date range
 * GET /api/holidays/range?startDate=2025-01-01&endDate=2025-12-31&region=BY
 */
const getHolidaysInRange = async (req, res) => {
  try {
    const { startDate, endDate, region = 'BY' } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start- und Enddatum sind erforderlich' });
    }
    
    // Ensure holidays exist for all years in range
    const startYear = new Date(startDate).getFullYear();
    const endYear = new Date(endDate).getFullYear();
    
    for (let year = startYear; year <= endYear; year++) {
      const checkResult = await pool.query(
        'SELECT COUNT(*) as count FROM holidays WHERE year = $1 AND region = $2',
        [year, region]
      );
      
      if (parseInt(checkResult.rows[0].count) === 0) {
        await generateHolidaysForYearInternal(year, region);
      }
    }
    
    const result = await pool.query(
      `SELECT * FROM holidays 
       WHERE date >= $1 AND date <= $2 AND region = $3
       ORDER BY date`,
      [startDate, endDate, region]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching holidays in range:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Feiertage' });
  }
};

module.exports = {
  getStates,
  getHolidays,
  generateHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  deleteHolidaysByYear,
  checkHoliday,
  getHolidaysInRange,
  // Export for internal use
  generateHolidaysForState,
  calculateEaster,
  GERMAN_STATES
};
