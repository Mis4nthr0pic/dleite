const BaseService = require('./BaseService');
const { NotFoundError, ValidationError } = require('../utils/errors');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

class QRCodeService extends BaseService {
  /**
   * Get all QR codes
   * @returns {Promise<Array>} List of QR codes
   */
  async getAll() {
    return this.all('SELECT * FROM qr_codes ORDER BY id DESC');
  }

  /**
   * Get QR code by ID
   * @param {number} id - QR code ID
   * @returns {Promise<Object>} QR code object
   * @throws {NotFoundError} If QR code not found
   */
  async getById(id) {
    const qrCode = await this.get('SELECT * FROM qr_codes WHERE id = ?', [id]);
    if (!qrCode) {
      throw new NotFoundError(`QR code with ID ${id} not found`);
    }
    return qrCode;
  }

  /**
   * Get QR code by token with full details
   * @param {string} token - QR code token
   * @returns {Promise<Object|null>} QR code with batch, producer, and association details
   */
  async getByToken(token) {
    return this.get(`
      SELECT
        q.*,
        b.batch_number, b.expiry_date,
        p.name as producer_name, p.cnpj as producer_cnpj,
        a.neighborhood_name
      FROM qr_codes q
      JOIN batches b ON q.batch_id = b.id
      JOIN producers p ON b.producer_id = p.id
      JOIN associations a ON q.association_id = a.id
      WHERE q.token = ?
    `, [token]);
  }

  /**
   * Get QR codes by order ID
   * @param {number} orderId - Order ID
   * @returns {Promise<Array>} List of QR codes for the order
   */
  async getByOrderId(orderId) {
    return this.all('SELECT * FROM qr_codes WHERE order_id = ?', [orderId]);
  }

  /**
   * Generate QR codes for an order
   * @param {Object} params
   * @param {number} params.orderId - Order ID
   * @param {number} params.batchId - Batch ID
   * @param {number} params.associationId - Association ID
   * @param {number} params.quantity - Number of QR codes to generate
   * @returns {Promise<Array>} Array of generated QR code objects with data URLs
   */
  async generateQRCodes({ orderId, batchId, associationId, quantity }, tx) {
    if (!orderId || !batchId || !associationId || !quantity) {
      throw new ValidationError('Order ID, Batch ID, Association ID, and Quantity are required');
    }

    if (quantity <= 0) {
      throw new ValidationError('Quantity must be greater than 0');
    }

    const issued_at = new Date().toISOString();
    const qrCodes = [];

    const work = async (runner) => {
      for (let i = 0; i < quantity; i++) {
        const token = uuidv4();

        const result = await runner.run(
          'INSERT INTO qr_codes (batch_id, order_id, association_id, token, status, issued_at) VALUES (?, ?, ?, ?, ?, ?)',
          [batchId, orderId, associationId, token, 'issued', issued_at]
        );

        const url = `${process.env.BASE_URL || 'http://localhost:3000'}/scan/${token}`;
        const dataURL = await QRCode.toDataURL(url);

        qrCodes.push({
          id: result.lastID,
          token,
          url,
          dataURL,
          status: 'issued',
          issued_at,
        });
      }
      return qrCodes;
    };

    if (tx && typeof tx.run === 'function') {
      return work(tx);
    }
    return this.transaction(async ({ run, get }) => work({ run, get }));
  }

  /**
   * Mark QR code as consumed
   * @param {string} token - QR code token
   * @returns {Promise<Object>} Updated QR code with details
   * @throws {NotFoundError} If QR code not found
   */
  async consume(token) {
    const qrCode = await this.getByToken(token);

    if (!qrCode) {
      throw new NotFoundError('QR code not found');
    }

    if (qrCode.status === 'consumed') {
      return { ...qrCode, alreadyConsumed: true };
    }

    const consumed_at = new Date().toISOString();

    await this.run(
      'UPDATE qr_codes SET status = ?, consumed_at = ? WHERE id = ?',
      ['consumed', consumed_at, qrCode.id]
    );

    return {
      ...qrCode,
      status: 'consumed',
      consumed_at,
      alreadyConsumed: false,
    };
  }

  /**
   * Get QR code count
   * @returns {Promise<number>} Number of QR codes
   */
  async getCount() {
    const result = await this.get('SELECT COUNT(*) as c FROM qr_codes');
    return result.c;
  }

  /**
   * Get QR code statistics
   * @returns {Promise<Object>} Statistics object with issued and consumed counts
   */
  async getStats() {
    const [issued, consumed] = await Promise.all([
      this.get("SELECT COUNT(*) as c FROM qr_codes WHERE status = 'issued'"),
      this.get("SELECT COUNT(*) as c FROM qr_codes WHERE status = 'consumed'"),
    ]);

    return {
      total: issued.c + consumed.c,
      issued: issued.c,
      consumed: consumed.c,
    };
  }
}

module.exports = new QRCodeService();
