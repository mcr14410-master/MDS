const express = require('express');
const router = express.Router();
const wikiController = require('../controllers/wikiController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// ============================================================================
// CATEGORIES
// ============================================================================

/**
 * @route   GET /api/wiki/categories
 * @desc    Get all wiki categories
 * @access  Private
 */
router.get('/categories', wikiController.getCategories);

/**
 * @route   GET /api/wiki/categories/:slug
 * @desc    Get category by slug
 * @access  Private
 */
router.get('/categories/:slug', wikiController.getCategoryBySlug);

// ============================================================================
// ARTICLES
// ============================================================================

/**
 * @route   GET /api/wiki/articles
 * @desc    Get articles with filters
 * @query   category_id, category_slug, machine_id, control_type, search, limit, offset
 * @access  Private
 */
router.get('/articles', wikiController.getArticles);

/**
 * @route   GET /api/wiki/articles/:id
 * @desc    Get single article by ID
 * @access  Private
 */
router.get('/articles/:id', wikiController.getArticleById);

/**
 * @route   POST /api/wiki/articles
 * @desc    Create new article
 * @access  Private
 */
router.post('/articles', wikiController.createArticle);

/**
 * @route   PUT /api/wiki/articles/:id
 * @desc    Update article
 * @access  Private
 */
router.put('/articles/:id', wikiController.updateArticle);

/**
 * @route   DELETE /api/wiki/articles/:id
 * @desc    Delete article (soft delete)
 * @access  Private
 */
router.delete('/articles/:id', wikiController.deleteArticle);

/**
 * @route   POST /api/wiki/articles/:id/helpful
 * @desc    Mark article as helpful
 * @access  Private
 */
router.post('/articles/:id/helpful', wikiController.markHelpful);

/**
 * @route   POST /api/wiki/articles/:id/images
 * @desc    Upload image to article
 * @access  Private
 */
router.post('/articles/:id/images', 
  wikiController.uploadMiddleware, 
  wikiController.uploadImage
);

// ============================================================================
// IMAGES
// ============================================================================

/**
 * @route   GET /api/wiki/images/:id/view
 * @desc    View image
 * @access  Private
 */
router.get('/images/:id/view', wikiController.viewImage);

/**
 * @route   PUT /api/wiki/images/:id
 * @desc    Update image caption/order
 * @access  Private
 */
router.put('/images/:id', wikiController.updateImage);

/**
 * @route   DELETE /api/wiki/images/:id
 * @desc    Delete image
 * @access  Private
 */
router.delete('/images/:id', wikiController.deleteImage);

module.exports = router;
