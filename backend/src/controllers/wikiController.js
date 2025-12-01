/**
 * Wiki Controller
 * 
 * Handles wiki categories, articles, and images
 * Supports: machine errors, guides, best practices
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

// ============================================================================
// MULTER CONFIGURATION
// ============================================================================

const uploadDir = path.join(__dirname, '../../uploads/wiki');
if (!fsSync.existsSync(uploadDir)) {
  fsSync.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const safeFilename = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${uniqueSuffix}-${safeFilename}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Nur Bilder erlaubt (JPG, PNG, GIF, WebP)'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

exports.uploadMiddleware = upload.single('image');
exports.uploadMultipleMiddleware = upload.array('images', 10);

// ============================================================================
// CATEGORIES
// ============================================================================

/**
 * Get all categories
 * GET /api/wiki/categories
 */
exports.getCategories = async (req, res) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        wc.*,
        COUNT(wa.id) FILTER (WHERE wa.is_deleted = false AND wa.is_published = true) as article_count
      FROM wiki_categories wc
      LEFT JOIN wiki_articles wa ON wa.category_id = wc.id
      WHERE wc.is_active = true
      GROUP BY wc.id
      ORDER BY wc.sort_order ASC, wc.name ASC
    `;
    const result = await client.query(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('getCategories error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Kategorien'
    });
  } finally {
    client.release();
  }
};

/**
 * Get category by slug
 * GET /api/wiki/categories/:slug
 */
exports.getCategoryBySlug = async (req, res) => {
  const client = await pool.connect();
  try {
    const { slug } = req.params;
    
    const query = `
      SELECT * FROM wiki_categories
      WHERE slug = $1 AND is_active = true
    `;
    const result = await client.query(query, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kategorie nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('getCategoryBySlug error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Kategorie'
    });
  } finally {
    client.release();
  }
};

// ============================================================================
// ARTICLES
// ============================================================================

/**
 * Get articles with filters
 * GET /api/wiki/articles
 * Query: category_id, machine_id, control_type, search, limit, offset
 */
exports.getArticles = async (req, res) => {
  const client = await pool.connect();
  try {
    const { 
      category_id, 
      category_slug,
      machine_id, 
      control_type, 
      search,
      limit = 50,
      offset = 0 
    } = req.query;

    let whereConditions = ['wa.is_deleted = false', 'wa.is_published = true'];
    const params = [];
    let paramCount = 1;

    if (category_id) {
      whereConditions.push(`wa.category_id = $${paramCount++}`);
      params.push(category_id);
    }

    if (category_slug) {
      whereConditions.push(`wc.slug = $${paramCount++}`);
      params.push(category_slug);
    }

    if (machine_id) {
      // Maschinenspezifische ODER allgemeine (machine_id IS NULL)
      whereConditions.push(`(wa.machine_id = $${paramCount++} OR wa.machine_id IS NULL)`);
      params.push(machine_id);
    }

    if (control_type) {
      whereConditions.push(`(wa.control_type = $${paramCount++} OR wa.control_type IS NULL)`);
      params.push(control_type);
    }

    if (search) {
      whereConditions.push(`(
        wa.title ILIKE $${paramCount} OR 
        wa.error_code ILIKE $${paramCount} OR
        wa.problem ILIKE $${paramCount} OR 
        wa.solution ILIKE $${paramCount} OR
        wa.tags ILIKE $${paramCount}
      )`);
      params.push(`%${search}%`);
      paramCount++;
    }

    // LIMIT und OFFSET Parameter hinzufügen
    const limitParam = paramCount++;
    const offsetParam = paramCount++;
    params.push(parseInt(limit));
    params.push(parseInt(offset));

    const query = `
      SELECT 
        wa.*,
        wc.name as category_name,
        wc.slug as category_slug,
        wc.icon as category_icon,
        wc.color as category_color,
        m.name as machine_name,
        mp.title as maintenance_plan_name,
        u.username as created_by_username,
        (SELECT COUNT(*) FROM wiki_article_images WHERE article_id = wa.id) as image_count
      FROM wiki_articles wa
      JOIN wiki_categories wc ON wc.id = wa.category_id
      LEFT JOIN machines m ON m.id = wa.machine_id
      LEFT JOIN maintenance_plans mp ON mp.id = wa.maintenance_plan_id
      LEFT JOIN users u ON u.id = wa.created_by
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY wa.error_code ASC NULLS LAST, wa.title ASC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const result = await client.query(query, params);

    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM wiki_articles wa
      JOIN wiki_categories wc ON wc.id = wa.category_id
      WHERE ${whereConditions.join(' AND ')}
    `;
    const countResult = await client.query(countQuery, params.slice(0, -2));

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('getArticles error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Artikel'
    });
  } finally {
    client.release();
  }
};

/**
 * Get single article by ID
 * GET /api/wiki/articles/:id
 */
exports.getArticleById = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    // Increment view count
    await client.query(
      'UPDATE wiki_articles SET view_count = view_count + 1 WHERE id = $1',
      [id]
    );

    const query = `
      SELECT 
        wa.*,
        wc.name as category_name,
        wc.slug as category_slug,
        wc.icon as category_icon,
        wc.color as category_color,
        wc.has_error_code,
        wc.has_machine_reference,
        m.name as machine_name,
        m.control_type as machine_control_type,
        mp.id as maintenance_plan_id,
        mp.title as maintenance_plan_name,
        u.username as created_by_username,
        u2.username as updated_by_username
      FROM wiki_articles wa
      JOIN wiki_categories wc ON wc.id = wa.category_id
      LEFT JOIN machines m ON m.id = wa.machine_id
      LEFT JOIN maintenance_plans mp ON mp.id = wa.maintenance_plan_id
      LEFT JOIN users u ON u.id = wa.created_by
      LEFT JOIN users u2 ON u2.id = wa.updated_by
      WHERE wa.id = $1 AND wa.is_deleted = false
    `;
    const result = await client.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Artikel nicht gefunden'
      });
    }

    // Get images
    const imagesQuery = `
      SELECT * FROM wiki_article_images
      WHERE article_id = $1
      ORDER BY sort_order ASC, uploaded_at ASC
    `;
    const imagesResult = await client.query(imagesQuery, [id]);

    const article = result.rows[0];
    article.images = imagesResult.rows;

    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    console.error('getArticleById error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden des Artikels'
    });
  } finally {
    client.release();
  }
};

/**
 * Create article
 * POST /api/wiki/articles
 */
exports.createArticle = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      category_id,
      machine_id,
      control_type,
      error_code,
      title,
      problem,
      cause,
      solution,
      maintenance_plan_id,
      tags,
      is_published = true
    } = req.body;
    const userId = req.user.id;

    if (!category_id || !title) {
      return res.status(400).json({
        success: false,
        error: 'category_id und title sind erforderlich'
      });
    }

    const query = `
      INSERT INTO wiki_articles (
        category_id, machine_id, control_type, error_code, title,
        problem, cause, solution, maintenance_plan_id, tags,
        is_published, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
      RETURNING *
    `;

    const result = await client.query(query, [
      category_id,
      machine_id || null,
      control_type || null,
      error_code || null,
      title,
      problem || null,
      cause || null,
      solution || null,
      maintenance_plan_id || null,
      tags || null,
      is_published,
      userId
    ]);

    res.status(201).json({
      success: true,
      message: 'Artikel erstellt',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('createArticle error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen des Artikels'
    });
  } finally {
    client.release();
  }
};

/**
 * Update article
 * PUT /api/wiki/articles/:id
 */
exports.updateArticle = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      category_id,
      machine_id,
      control_type,
      error_code,
      title,
      problem,
      cause,
      solution,
      maintenance_plan_id,
      tags,
      is_published
    } = req.body;
    const userId = req.user.id;

    // Check exists
    const checkResult = await client.query(
      'SELECT id FROM wiki_articles WHERE id = $1 AND is_deleted = false',
      [id]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Artikel nicht gefunden'
      });
    }

    const query = `
      UPDATE wiki_articles SET
        category_id = COALESCE($1, category_id),
        machine_id = $2,
        control_type = $3,
        error_code = $4,
        title = COALESCE($5, title),
        problem = $6,
        cause = $7,
        solution = $8,
        maintenance_plan_id = $9,
        tags = $10,
        is_published = COALESCE($11, is_published),
        updated_by = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *
    `;

    const result = await client.query(query, [
      category_id,
      machine_id || null,
      control_type || null,
      error_code || null,
      title,
      problem || null,
      cause || null,
      solution || null,
      maintenance_plan_id || null,
      tags || null,
      is_published,
      userId,
      id
    ]);

    res.json({
      success: true,
      message: 'Artikel aktualisiert',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('updateArticle error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren des Artikels'
    });
  } finally {
    client.release();
  }
};

/**
 * Delete article (soft delete)
 * DELETE /api/wiki/articles/:id
 */
exports.deleteArticle = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await client.query(
      `UPDATE wiki_articles 
       SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
       WHERE id = $2 AND is_deleted = false
       RETURNING id`,
      [userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Artikel nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Artikel gelöscht'
    });
  } catch (error) {
    console.error('deleteArticle error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen des Artikels'
    });
  } finally {
    client.release();
  }
};

/**
 * Mark article as helpful
 * POST /api/wiki/articles/:id/helpful
 */
exports.markHelpful = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const result = await client.query(
      `UPDATE wiki_articles 
       SET helpful_count = helpful_count + 1
       WHERE id = $1 AND is_deleted = false
       RETURNING helpful_count`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Artikel nicht gefunden'
      });
    }

    res.json({
      success: true,
      helpful_count: result.rows[0].helpful_count
    });
  } catch (error) {
    console.error('markHelpful error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler'
    });
  } finally {
    client.release();
  }
};

// ============================================================================
// IMAGES
// ============================================================================

/**
 * Upload image to article
 * POST /api/wiki/articles/:id/images
 */
exports.uploadImage = async (req, res) => {
  const client = await pool.connect();
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Kein Bild hochgeladen'
      });
    }

    const { id } = req.params;
    const { caption } = req.body;
    const userId = req.user.id;

    // Check article exists
    const checkResult = await client.query(
      'SELECT id FROM wiki_articles WHERE id = $1 AND is_deleted = false',
      [id]
    );
    if (checkResult.rows.length === 0) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({
        success: false,
        error: 'Artikel nicht gefunden'
      });
    }

    // Get max sort_order
    const sortResult = await client.query(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM wiki_article_images WHERE article_id = $1',
      [id]
    );

    const relativePath = `uploads/wiki/${req.file.filename}`;

    const query = `
      INSERT INTO wiki_article_images (
        article_id, file_name, file_path, file_size, mime_type, caption, sort_order, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await client.query(query, [
      id,
      req.file.originalname,
      relativePath,
      req.file.size,
      req.file.mimetype,
      caption || null,
      sortResult.rows[0].next_order,
      userId
    ]);

    res.status(201).json({
      success: true,
      message: 'Bild hochgeladen',
      data: result.rows[0]
    });
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    console.error('uploadImage error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Hochladen'
    });
  } finally {
    client.release();
  }
};

/**
 * Get image (view)
 * GET /api/wiki/images/:id/view
 */
exports.viewImage = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const result = await client.query(
      'SELECT * FROM wiki_article_images WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Bild nicht gefunden'
      });
    }

    const image = result.rows[0];
    const filePath = path.join(__dirname, '../..', image.file_path);

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Datei nicht gefunden'
      });
    }

    res.setHeader('Content-Type', image.mime_type || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    
    const fileStream = fsSync.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('viewImage error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden des Bildes'
    });
  } finally {
    client.release();
  }
};

/**
 * Delete image
 * DELETE /api/wiki/images/:id
 */
exports.deleteImage = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const result = await client.query(
      'SELECT * FROM wiki_article_images WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Bild nicht gefunden'
      });
    }

    const image = result.rows[0];

    // Delete from DB
    await client.query('DELETE FROM wiki_article_images WHERE id = $1', [id]);

    // Delete file
    const filePath = path.join(__dirname, '../..', image.file_path);
    await fs.unlink(filePath).catch(() => {});

    res.json({
      success: true,
      message: 'Bild gelöscht'
    });
  } catch (error) {
    console.error('deleteImage error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen'
    });
  } finally {
    client.release();
  }
};

/**
 * Update image caption/order
 * PUT /api/wiki/images/:id
 */
exports.updateImage = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { caption, sort_order } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (caption !== undefined) {
      updates.push(`caption = $${paramCount++}`);
      values.push(caption);
    }
    if (sort_order !== undefined) {
      updates.push(`sort_order = $${paramCount++}`);
      values.push(sort_order);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Keine Felder zum Aktualisieren'
      });
    }

    values.push(id);

    const result = await client.query(
      `UPDATE wiki_article_images SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Bild nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('updateImage error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren'
    });
  } finally {
    client.release();
  }
};
