const BaseService = require('./BaseService');
const { NotFoundError, ValidationError } = require('../utils/errors');
const QRCodeService = require('./QRCodeService');

class OrderService extends BaseService {
  /**
   * Get all orders with association details
   * @returns {Promise<Array>} List of orders with association info
   */
  async getAll() {
    return this.all(`
      SELECT o.*, a.neighborhood_name
      FROM orders o
      JOIN associations a ON o.association_id = a.id
      ORDER BY o.id DESC
    `);
  }

  /**
   * Get orders by association ID
   * @param {number} associationId - Association ID
   * @returns {Promise<Array>} List of orders for the association
   */
  async getByAssociationId(associationId) {
    return this.all(`
      SELECT o.*, a.neighborhood_name
      FROM orders o
      JOIN associations a ON o.association_id = a.id
      WHERE o.association_id = ?
      ORDER BY o.id DESC
    `, [associationId]);
  }

  /**
   * Get order by ID
   * @param {number} id - Order ID
   * @returns {Promise<Object>} Order object with association details
   * @throws {NotFoundError} If order not found
   */
  async getById(id) {
    const order = await this.get(`
      SELECT o.*, a.neighborhood_name
      FROM orders o
      JOIN associations a ON o.association_id = a.id
      WHERE o.id = ?
    `, [id]);

    if (!order) {
      throw new NotFoundError(`Order with ID ${id} not found`);
    }
    return order;
  }

  /**
   * Create a new order
   * @param {Object} data - Order data
   * @param {number} data.association_id - Association ID
   * @param {number} data.quantity_requested - Quantity requested
   * @returns {Promise<Object>} Created order with ID
   * @throws {ValidationError} If validation fails
   */
  async create({ association_id, quantity_requested }) {
    // Validation
    if (!association_id) {
      throw new ValidationError('Association ID is required');
    }
    if (!quantity_requested || quantity_requested <= 0) {
      throw new ValidationError('Quantity requested must be greater than 0');
    }

    const created_at = new Date().toISOString();

    const result = await this.run(
      'INSERT INTO orders (association_id, quantity_requested, status, created_at) VALUES (?, ?, ?, ?)',
      [association_id, quantity_requested, 'pending', created_at]
    );

    return {
      id: result.lastID,
      association_id,
      quantity_requested,
      status: 'pending',
      created_at,
    };
  }

  /**
   * Get order count
   * @returns {Promise<number>} Number of orders
   */
  async getCount() {
    const result = await this.get('SELECT COUNT(*) as c FROM orders');
    return result.c;
  }

  /**
   * Get fulfillments for an order
   * @param {number} orderId - Order ID
   * @returns {Promise<Array>} List of fulfillments with batch details
   */
  async getFulfillments(orderId) {
    return this.all(`
      SELECT f.*, b.batch_number, p.name as producer_name
      FROM fulfillments f
      JOIN batches b ON f.batch_id = b.id
      JOIN producers p ON b.producer_id = p.id
      WHERE f.order_id = ?
      ORDER BY f.id DESC
    `, [orderId]);
  }

  /**
   * Fulfill an order (allocate units from a batch and generate QR codes)
   * @param {Object} params
   * @param {number} params.orderId - Order ID
   * @param {number} params.batchId - Batch ID to allocate from
   * @param {number} params.quantity - Quantity to allocate
   * @returns {Promise<Object>} Fulfillment result with generated QR codes
   * @throws {ValidationError} If validation fails
   * @throws {NotFoundError} If order or batch not found
   */
  async fulfill({ orderId, batchId, quantity }) {
    // Validation
    if (!orderId || !batchId || !quantity) {
      throw new ValidationError('Order ID, Batch ID, and Quantity are required');
    }

    if (quantity <= 0) {
      throw new ValidationError('Quantity must be greater than 0');
    }

    return this.transaction(async ({ run, get }) => {
      // Get order details
      const order = await get(`
        SELECT o.*, a.neighborhood_name
        FROM orders o
        JOIN associations a ON o.association_id = a.id
        WHERE o.id = ?
      `, [orderId]);

      if (!order) {
        throw new NotFoundError(`Order with ID ${orderId} not found`);
      }

      // Get batch details
      const batch = await get('SELECT * FROM batches WHERE id = ?', [batchId]);
      if (!batch) {
        throw new NotFoundError(`Batch with ID ${batchId} not found`);
      }

      // Check if batch has enough quantity
      if (batch.quantity_produced < quantity) {
        throw new ValidationError(`Batch only has ${batch.quantity_produced} units available`);
      }

      // Get total fulfilled quantity so far
      const totalFulfilled = await get(
        'SELECT COALESCE(SUM(quantity_allocated), 0) as total FROM fulfillments WHERE order_id = ?',
        [orderId]
      );

      const newTotal = totalFulfilled.total + quantity;

      if (newTotal > order.quantity_requested) {
        throw new ValidationError(
          `Cannot fulfill ${quantity} units. Order requested ${order.quantity_requested}, already fulfilled ${totalFulfilled.total}`
        );
      }

      // Create fulfillment record
      const created_at = new Date().toISOString();
      const fulfillmentResult = await run(
        'INSERT INTO fulfillments (order_id, batch_id, quantity_allocated, created_at) VALUES (?, ?, ?, ?)',
        [orderId, batchId, quantity, created_at]
      );

      // Update batch quantity
      await run(
        'UPDATE batches SET quantity_produced = quantity_produced - ? WHERE id = ?',
        [quantity, batchId]
      );

      // Update order status
      let newStatus = 'partial';
      if (newTotal >= order.quantity_requested) {
        newStatus = 'fulfilled';
      }

      await run(
        'UPDATE orders SET status = ? WHERE id = ?',
        [newStatus, orderId]
      );

      // Generate QR codes within the same transaction/connection to avoid locks
      const qrCodes = await QRCodeService.generateQRCodes({
        orderId,
        batchId,
        associationId: order.association_id,
        quantity,
      }, { run, get });

      return {
        fulfillment: {
          id: fulfillmentResult.lastID,
          order_id: orderId,
          batch_id: batchId,
          quantity_allocated: quantity,
          created_at,
        },
        order: {
          ...order,
          status: newStatus,
        },
        qrCodes,
      };
    });
  }

  /**
   * Get orders with fulfillment status
   * @returns {Promise<Array>} List of orders with fulfillment details
   */
  async getWithFulfillmentStatus() {
    return this.all(`
      SELECT
        o.*,
        a.neighborhood_name,
        COALESCE(SUM(f.quantity_allocated), 0) as quantity_fulfilled
      FROM orders o
      JOIN associations a ON o.association_id = a.id
      LEFT JOIN fulfillments f ON o.id = f.order_id
      GROUP BY o.id
      ORDER BY o.id DESC
    `);
  }
}

module.exports = new OrderService();
