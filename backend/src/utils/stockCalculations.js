/**
 * Stock Calculations Utility
 * 
 * Zentrale Funktionen für Bestandsberechnungen
 * Roadmap-konform: new=1.0, used=0.5, reground=0.8
 */

/**
 * Default weights according to roadmap
 */
const DEFAULT_WEIGHTS = {
  new: 1.0,
  used: 0.5,
  reground: 0.8
};

/**
 * Calculate effective stock with weighted quantities
 * 
 * @param {number} quantityNew - Quantity of new items
 * @param {number} quantityUsed - Quantity of used items
 * @param {number} quantityReground - Quantity of reground items
 * @param {Object} weights - Custom weights (optional)
 * @param {number} weights.new - Weight for new items (default: 1.0)
 * @param {number} weights.used - Weight for used items (default: 0.5)
 * @param {number} weights.reground - Weight for reground items (default: 0.8)
 * @returns {number} Effective stock (weighted sum)
 * 
 * @example
 * calculateEffectiveStock(10, 5, 3)
 * // Returns: 10*1.0 + 5*0.5 + 3*0.8 = 14.9
 */
function calculateEffectiveStock(
  quantityNew = 0,
  quantityUsed = 0,
  quantityReground = 0,
  weights = DEFAULT_WEIGHTS
) {
  const w = { ...DEFAULT_WEIGHTS, ...weights };
  
  return (
    parseFloat(quantityNew || 0) * w.new +
    parseFloat(quantityUsed || 0) * w.used +
    parseFloat(quantityReground || 0) * w.reground
  );
}

/**
 * Calculate total stock (simple sum, no weights)
 * 
 * @param {number} quantityNew - Quantity of new items
 * @param {number} quantityUsed - Quantity of used items
 * @param {number} quantityReground - Quantity of reground items
 * @returns {number} Total stock
 * 
 * @example
 * calculateTotalStock(10, 5, 3)
 * // Returns: 18
 */
function calculateTotalStock(
  quantityNew = 0,
  quantityUsed = 0,
  quantityReground = 0
) {
  return (
    parseFloat(quantityNew || 0) +
    parseFloat(quantityUsed || 0) +
    parseFloat(quantityReground || 0)
  );
}

/**
 * Check if stock is low based on effective stock and reorder point
 * 
 * @param {number} effectiveStock - Weighted stock quantity
 * @param {number} reorderPoint - Reorder point threshold
 * @param {boolean} alertEnabled - Whether low stock alerts are enabled
 * @returns {boolean} True if stock is low
 * 
 * @example
 * isLowStock(8, 10, true)  // Returns: true (8 <= 10)
 * isLowStock(12, 10, true) // Returns: false (12 > 10)
 * isLowStock(8, 10, false) // Returns: false (alerts disabled)
 */
function isLowStock(effectiveStock, reorderPoint, alertEnabled = true) {
  if (!alertEnabled || reorderPoint == null) {
    return false;
  }
  
  return parseFloat(effectiveStock || 0) <= parseFloat(reorderPoint);
}

/**
 * Calculate stock level percentage based on max quantity
 * 
 * @param {number} totalStock - Total stock quantity
 * @param {number} maxQuantity - Maximum capacity
 * @returns {number|null} Percentage (0-100) or null if maxQuantity not set
 * 
 * @example
 * calculateStockLevelPercent(15, 20)
 * // Returns: 75
 */
function calculateStockLevelPercent(totalStock, maxQuantity) {
  if (!maxQuantity || maxQuantity <= 0) {
    return null;
  }
  
  const percent = (parseFloat(totalStock || 0) / parseFloat(maxQuantity)) * 100;
  return Math.round(percent * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate effective stock percentage based on reorder point
 * Shows how much stock is above/below reorder point
 * 
 * @param {number} effectiveStock - Weighted stock quantity
 * @param {number} reorderPoint - Reorder point threshold
 * @returns {number|null} Percentage or null if reorderPoint not set
 * 
 * @example
 * calculateEffectiveStockPercent(15, 10)
 * // Returns: 150 (50% above reorder point)
 */
function calculateEffectiveStockPercent(effectiveStock, reorderPoint) {
  if (!reorderPoint || reorderPoint <= 0) {
    return null;
  }
  
  const percent = (parseFloat(effectiveStock || 0) / parseFloat(reorderPoint)) * 100;
  return Math.round(percent * 100) / 100; // Round to 2 decimals
}

/**
 * Get stock status based on effective stock and thresholds
 * 
 * @param {number} effectiveStock - Weighted stock quantity
 * @param {number} reorderPoint - Reorder point threshold
 * @param {number} minQuantity - Minimum quantity threshold
 * @returns {string} Status: 'critical', 'low', 'normal', 'high'
 * 
 * @example
 * getStockStatus(5, 10, 3)    // Returns: 'low'
 * getStockStatus(2, 10, 3)    // Returns: 'critical'
 * getStockStatus(15, 10, 3)   // Returns: 'normal'
 */
function getStockStatus(effectiveStock, reorderPoint, minQuantity = null) {
  const stock = parseFloat(effectiveStock || 0);
  const reorder = parseFloat(reorderPoint || 0);
  const min = parseFloat(minQuantity || 0);
  
  if (min && stock <= min) {
    return 'critical';
  }
  
  if (reorder && stock <= reorder) {
    return 'low';
  }
  
  if (reorder && stock > reorder * 1.5) {
    return 'high';
  }
  
  return 'normal';
}

/**
 * Calculate stock info object with all relevant calculations
 * 
 * @param {Object} quantities - Stock quantities
 * @param {number} quantities.new - New items
 * @param {number} quantities.used - Used items
 * @param {number} quantities.reground - Reground items
 * @param {Object} thresholds - Stock thresholds
 * @param {number} thresholds.reorderPoint - Reorder point
 * @param {number} thresholds.minQuantity - Minimum quantity
 * @param {number} thresholds.maxQuantity - Maximum quantity
 * @param {Object} options - Options
 * @param {boolean} options.alertEnabled - Whether alerts are enabled
 * @param {Object} options.weights - Custom weights
 * @returns {Object} Complete stock info
 * 
 * @example
 * calculateStockInfo(
 *   { new: 10, used: 5, reground: 3 },
 *   { reorderPoint: 10, minQuantity: 5, maxQuantity: 30 },
 *   { alertEnabled: true }
 * )
 */
function calculateStockInfo(quantities, thresholds, options = {}) {
  const { new: qtyNew, used: qtyUsed, reground: qtyReground } = quantities;
  const { reorderPoint, minQuantity, maxQuantity } = thresholds;
  const { alertEnabled = true, weights } = options;
  
  const totalStock = calculateTotalStock(qtyNew, qtyUsed, qtyReground);
  const effectiveStock = calculateEffectiveStock(qtyNew, qtyUsed, qtyReground, weights);
  
  return {
    totalStock,
    effectiveStock,
    isLowStock: isLowStock(effectiveStock, reorderPoint, alertEnabled),
    stockStatus: getStockStatus(effectiveStock, reorderPoint, minQuantity),
    stockLevelPercent: calculateStockLevelPercent(totalStock, maxQuantity),
    effectiveStockPercent: calculateEffectiveStockPercent(effectiveStock, reorderPoint),
    quantities: {
      new: parseFloat(qtyNew || 0),
      used: parseFloat(qtyUsed || 0),
      reground: parseFloat(qtyReground || 0)
    },
    thresholds: {
      reorderPoint: parseFloat(reorderPoint || 0),
      minQuantity: parseFloat(minQuantity || 0),
      maxQuantity: parseFloat(maxQuantity || 0)
    }
  };
}

module.exports = {
  DEFAULT_WEIGHTS,
  calculateEffectiveStock,
  calculateTotalStock,
  isLowStock,
  calculateStockLevelPercent,
  calculateEffectiveStockPercent,
  getStockStatus,
  calculateStockInfo
};
