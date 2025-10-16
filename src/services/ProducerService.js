const BaseService = require('./BaseService');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { validCNPJ } = require('../utils/validate');

class ProducerService extends BaseService {
  /**
   * Get all producers
   * @returns {Promise<Array>} List of producers
   */
  async getAll() {
    return this.all('SELECT * FROM producers ORDER BY id DESC');
  }

  /**
   * Get producer by ID
   * @param {number} id - Producer ID
   * @returns {Promise<Object>} Producer object
   * @throws {NotFoundError} If producer not found
   */
  async getById(id) {
    const producer = await this.get('SELECT * FROM producers WHERE id = ?', [id]);
    if (!producer) {
      throw new NotFoundError(`Producer with ID ${id} not found`);
    }
    return producer;
  }

  /**
   * Get producer by CNPJ
   * @param {string} cnpj - Producer CNPJ
   * @returns {Promise<Object|null>} Producer object or null
   */
  async getByCNPJ(cnpj) {
    return this.get('SELECT * FROM producers WHERE cnpj = ?', [cnpj]);
  }

  /**
   * Create a new producer
   * @param {Object} data - Producer data
   * @param {string} data.cnpj - CNPJ number
   * @param {string} data.name - Producer name
   * @returns {Promise<Object>} Created producer with ID
   * @throws {ValidationError} If validation fails
   */
  async create({ cnpj, name }) {
    // Validation
    if (!cnpj || !cnpj.trim()) {
      throw new ValidationError('CNPJ is required');
    }
    if (!validCNPJ(cnpj)) {
      throw new ValidationError('Invalid CNPJ');
    }
    if (!name || !name.trim()) {
      throw new ValidationError('Producer name is required');
    }

    // Check for duplicate CNPJ
    const existingProducer = await this.getByCNPJ(cnpj.trim());
    if (existingProducer) {
      throw new ValidationError('CNPJ already registered');
    }

    const result = await this.run(
      'INSERT INTO producers (cnpj, name) VALUES (?, ?)',
      [cnpj.trim(), name.trim()]
    );

    return {
      id: result.lastID,
      cnpj: cnpj.trim(),
      name: name.trim(),
    };
  }

  /**
   * Delete a producer
   * @param {number} id - Producer ID
   * @returns {Promise<void>}
   * @throws {NotFoundError} If producer not found
   */
  async delete(id) {
    const result = await this.run('DELETE FROM producers WHERE id = ?', [id]);
    if (result.changes === 0) {
      throw new NotFoundError(`Producer with ID ${id} not found`);
    }
  }

  /**
   * Get producer count
   * @returns {Promise<number>} Number of producers
   */
  async getCount() {
    const result = await this.get('SELECT COUNT(*) as c FROM producers');
    return result.c;
  }
}

module.exports = new ProducerService();
