const BaseService = require('./BaseService');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { validPhone } = require('../utils/validate');

class AssociationService extends BaseService {
  /**
   * Get all associations
   * @returns {Promise<Array>} List of associations
   */
  async getAll() {
    return this.all('SELECT * FROM associations ORDER BY id DESC');
  }

  /**
   * Get association by ID
   * @param {number} id - Association ID
   * @returns {Promise<Object>} Association object
   * @throws {NotFoundError} If association not found
   */
  async getById(id) {
    const association = await this.get('SELECT * FROM associations WHERE id = ?', [id]);
    if (!association) {
      throw new NotFoundError(`Association with ID ${id} not found`);
    }
    return association;
  }

  /**
   * Create a new association
   * @param {Object} data - Association data
   * @param {string} data.neighborhood_name - Neighborhood name
   * @param {string} data.president_name - President name
   * @param {string} data.email - Email address
   * @param {string} data.phone - Phone number
   * @returns {Promise<Object>} Created association with ID
   * @throws {ValidationError} If validation fails
   */
  async create({ neighborhood_name, president_name, email, phone }) {
    // Validation
    if (!neighborhood_name || !neighborhood_name.trim()) {
      throw new ValidationError('Neighborhood name is required');
    }
    if (!president_name || !president_name.trim()) {
      throw new ValidationError('President name is required');
    }
    if (!email || !email.trim()) {
      throw new ValidationError('Email is required');
    }
    if (phone && !validPhone(phone)) {
      throw new ValidationError('Invalid phone number');
    }

    // Create association + linked user in one transaction
    return this.transaction(async ({ run, get }) => {
      const insert = await run(
        'INSERT INTO associations (neighborhood_name, president_name, email, phone) VALUES (?, ?, ?, ?)',
        [neighborhood_name.trim(), president_name.trim(), email.trim(), phone]
      );
      const assocId = insert.lastID;

      // Create an association user with default password '12345'
      const bcrypt = require('bcryptjs');
      const defaultHash = await bcrypt.hash('12345', 10);
      let userEmail = email.trim();

      // Ensure unique email
      const existing = await get('SELECT id FROM users WHERE email = ?', [userEmail]);
      if (existing) {
        userEmail = `assoc-${assocId}@example.local`;
      }

      await run(
        'INSERT INTO users (name, email, password_hash, role, association_id) VALUES (?, ?, ?, ?, ?)',
        [
          `Associação ${neighborhood_name.trim()}`,
          userEmail,
          defaultHash,
          'association',
          assocId,
        ]
      );

      return {
        id: assocId,
        neighborhood_name: neighborhood_name.trim(),
        president_name: president_name.trim(),
        email: email.trim(),
        phone,
      };
    });
  }

  /**
   * Delete an association
   * @param {number} id - Association ID
   * @returns {Promise<void>}
   * @throws {NotFoundError} If association not found
   */
  async delete(id) {
    const result = await this.run('DELETE FROM associations WHERE id = ?', [id]);
    if (result.changes === 0) {
      throw new NotFoundError(`Association with ID ${id} not found`);
    }
  }

  /**
   * Get association count
   * @returns {Promise<number>} Number of associations
   */
  async getCount() {
    const result = await this.get('SELECT COUNT(*) as c FROM associations');
    return result.c;
  }
}

module.exports = new AssociationService();
