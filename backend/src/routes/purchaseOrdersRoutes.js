const express = require('express');
const router = express.Router();
const purchaseOrdersController = require('../controllers/purchaseOrdersController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// ============================================================================
// PURCHASE ORDERS - CRUD
// ============================================================================

// Get all purchase orders (with filters)
router.get('/', purchaseOrdersController.getAllOrders);

// Get single purchase order by ID
router.get('/:id', purchaseOrdersController.getOrderById);

// Create new purchase order
router.post('/', purchaseOrdersController.createOrder);

// Update purchase order (draft only)
router.put('/:id', purchaseOrdersController.updateOrder);

// Delete purchase order (draft only)
router.delete('/:id', purchaseOrdersController.deleteOrder);

// ============================================================================
// PURCHASE ORDERS - STATUS TRANSITIONS
// ============================================================================

// Send order to supplier (draft → sent)
router.post('/:id/send', purchaseOrdersController.sendOrder);

// Receive full order (sent/confirmed → received)
router.post('/:id/receive', purchaseOrdersController.receiveOrder);

// Receive partial order item
router.post('/:orderId/items/:itemId/receive', purchaseOrdersController.receiveOrderItem);

module.exports = router;
