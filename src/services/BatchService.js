const BaseService = require('./BaseService');
const { NotFoundError, ValidationError } = require('../utils/errors');

class BatchService extends BaseService {
  /**
   * Get all batches with producer details
   * @returns {Promise<Array>} List of batches with producer info
   */
  async getAll() {
    return this.all(`
      SELECT b.*, p.name as producer_name, p.cnpj as producer_cnpj
      FROM batches b
      JOIN producers p ON b.producer_id = p.id
      ORDER BY b.id DESC
    `);
  }

  /**
   * Get batch by ID
   * @param {number} id - Batch ID
   * @returns {Promise<Object>} Batch object
   * @throws {NotFoundError} If batch not found
   */
  async getById(id) {
    const batch = await this.get(`
      SELECT b.*, p.name as producer_name, p.cnpj as producer_cnpj
      FROM batches b
      JOIN producers p ON b.producer_id = p.id
      WHERE b.id = ?
    `, [id]);

    if (!batch) {
      throw new NotFoundError(`Batch with ID ${id} not found`);
    }
    return batch;
  }

  /**
   * Get batch by batch number
   * @param {string} batchNumber - Batch number
   * @returns {Promise<Object|null>} Batch object or null
   */
  async getByBatchNumber(batchNumber) {
    return this.get('SELECT * FROM batches WHERE batch_number = ?', [batchNumber]);
  }

  /**
   * Create a new batch
   * @param {Object} data - Batch data
   * @param {number} data.producer_id - Producer ID
   * @param {string} data.batch_number - Batch number
   * @param {string} data.expiry_date - Expiry date (ISO format)
   * @param {number} data.quantity_produced - Quantity produced
   * @returns {Promise<Object>} Created batch with ID
   * @throws {ValidationError} If validation fails
   */
  async create({ producer_id, batch_number, expiry_date, quantity_produced }) {
    // Validation
    if (!producer_id) {
      throw new ValidationError('Producer ID is required');
    }
    if (!batch_number || !batch_number.trim()) {
      throw new ValidationError('Batch number is required');
    }
    if (!expiry_date) {
      throw new ValidationError('Expiry date is required');
    }
    if (!quantity_produced || quantity_produced <= 0) {
      throw new ValidationError('Quantity produced must be greater than 0');
    }

    // Check for duplicate batch number
    const existingBatch = await this.getByBatchNumber(batch_number.trim());
    if (existingBatch) {
      throw new ValidationError('Batch number already exists');
    }

    const created_at = new Date().toISOString();

    const result = await this.run(
      'INSERT INTO batches (producer_id, batch_number, expiry_date, quantity_produced, created_at) VALUES (?, ?, ?, ?, ?)',
      [producer_id, batch_number.trim(), expiry_date, quantity_produced, created_at]
    );

    return {
      id: result.lastID,
      producer_id,
      batch_number: batch_number.trim(),
      expiry_date,
      quantity_produced,
      created_at,
    };
  }

  /**
   * Get batch count
   * @returns {Promise<number>} Number of batches
   */
  async getCount() {
    const result = await this.get('SELECT COUNT(*) as c FROM batches');
    return result.c;
  }

  /**
   * Get available batches (for order fulfillment)
   * @returns {Promise<Array>} List of available batches
   */
  async getAvailable() {
    return this.all(`
      SELECT b.*, p.name as producer_name
      FROM batches b
      JOIN producers p ON b.producer_id = p.id
      WHERE b.quantity_produced > 0
      ORDER BY b.expiry_date ASC
    `);
  }
}

module.exports = new BatchService();
