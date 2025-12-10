/**
 * Global Search Controller
 * 
 * Durchsucht alle relevanten Entitäten mit einem einzigen Endpoint
 * 
 * Routes:
 * - GET /api/search?q=suchbegriff&limit=5
 */

const pool = require('../config/db');

/**
 * GET /api/search
 * Globale Suche über alle Entitäten
 */
exports.search = async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;

    // Mindestens 2 Zeichen für Suche
    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const searchTerm = `%${q.trim()}%`;
    const limitNum = Math.min(Math.max(parseInt(limit) || 5, 1), 20);

    // UNION ALL Query für alle Entitäten
    // Jede Sub-Query liefert: type, id, title, subtitle, url
    const queryText = `
      WITH search_results AS (
        -- Bauteile
        SELECT 
          'part' as type,
          id::text,
          part_number as title,
          COALESCE(description, '') as subtitle,
          '/parts/' || id as url,
          1 as priority
        FROM parts
        WHERE status != 'deleted'
          AND (part_number ILIKE $1 OR description ILIKE $1)
        
        UNION ALL
        
        -- Kunden
        SELECT 
          'customer' as type,
          id::text,
          name as title,
          COALESCE(customer_number, '') as subtitle,
          '/customers/' || id as url,
          2 as priority
        FROM customers
        WHERE is_active = true
          AND (name ILIKE $1 OR customer_number ILIKE $1 OR contact_person ILIKE $1)
        
        UNION ALL
        
        -- Maschinen
        SELECT 
          'machine' as type,
          id::text,
          name as title,
          COALESCE(manufacturer, '') || ' - ' || COALESCE(machine_type, '') as subtitle,
          '/machines/' || id as url,
          3 as priority
        FROM machines
        WHERE is_active = true
          AND (name ILIKE $1 OR manufacturer ILIKE $1 OR machine_type ILIKE $1 OR control_type ILIKE $1)
        
        UNION ALL
        
        -- Werkzeuge (Tool Master)
        SELECT 
          'tool' as type,
          id::text,
          article_number as title,
          COALESCE(tool_name, '') as subtitle,
          '/tools/' || id as url,
          4 as priority
        FROM tool_master
        WHERE is_active = true AND is_deleted = false
          AND (article_number ILIKE $1 OR tool_name ILIKE $1)
        
        UNION ALL
        
        -- Messmittel
        SELECT 
          'measuring' as type,
          id::text,
          inventory_number as title,
          COALESCE(name, '') as subtitle,
          '/measuring-equipment/' || id as url,
          5 as priority
        FROM measuring_equipment
        WHERE deleted_at IS NULL
          AND (inventory_number ILIKE $1 OR name ILIKE $1 OR serial_number ILIKE $1 OR manufacturer ILIKE $1)
        
        UNION ALL
        
        -- Spannmittel
        SELECT 
          'clamping' as type,
          id::text,
          inventory_number as title,
          COALESCE(name, '') as subtitle,
          '/clamping-devices/' || id as url,
          6 as priority
        FROM clamping_devices
        WHERE deleted_at IS NULL
          AND (inventory_number ILIKE $1 OR name ILIKE $1)
        
        UNION ALL
        
        -- Vorrichtungen
        SELECT 
          'fixture' as type,
          id::text,
          fixture_number as title,
          COALESCE(name, '') as subtitle,
          '/fixtures/' || id as url,
          7 as priority
        FROM fixtures
        WHERE deleted_at IS NULL
          AND (fixture_number ILIKE $1 OR name ILIKE $1)
        
        UNION ALL
        
        -- NC-Programme
        SELECT 
          'program' as type,
          p.id::text,
          p.program_number as title,
          COALESCE(p.program_name, '') as subtitle,
          '/parts/' || o.part_id || '/operations/' || p.operation_id as url,
          8 as priority
        FROM programs p
        JOIN operations o ON p.operation_id = o.id
        WHERE (p.program_number ILIKE $1 OR p.program_name ILIKE $1)
        
        UNION ALL
        
        -- Wiki-Artikel
        SELECT 
          'wiki' as type,
          id::text,
          title,
          COALESCE(LEFT(problem, 100), '') as subtitle,
          '/wiki/' || id as url,
          9 as priority
        FROM wiki_articles
        WHERE is_published = true AND is_deleted = false
          AND (title ILIKE $1 OR problem ILIKE $1 OR solution ILIKE $1 OR error_code ILIKE $1)
        
        UNION ALL
        
        -- Lieferanten
        SELECT 
          'supplier' as type,
          id::text,
          name as title,
          COALESCE(supplier_code, '') as subtitle,
          '/suppliers/' || id as url,
          10 as priority
        FROM suppliers
        WHERE is_active = true
          AND (name ILIKE $1 OR supplier_code ILIKE $1)
        
        UNION ALL
        
        -- Verbrauchsmaterial
        SELECT 
          'consumable' as type,
          id::text,
          name as title,
          COALESCE(article_number, '') as subtitle,
          '/consumables/' || id as url,
          11 as priority
        FROM consumables
        WHERE is_active = true AND is_deleted = false
          AND (name ILIKE $1 OR article_number ILIKE $1)
      )
      SELECT type, id, title, subtitle, url
      FROM search_results
      ORDER BY priority, title
      LIMIT $2
    `;

    const result = await pool.query(queryText, [searchTerm, limitNum]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Suche',
      error: error.message
    });
  }
};
