const BaseService = require('./BaseService');
const { NotFoundError, ValidationError } = require('../utils/errors');
const bcrypt = require('bcryptjs');

class UserService extends BaseService {
  /**
   * Get all users with association details
   * @returns {Promise<Array>} List of users with association info
   */
  async getAll() {
    return this.all(`
      SELECT u.*, a.neighborhood_name
      FROM users u
      LEFT JOIN associations a ON u.association_id = a.id
      ORDER BY u.id DESC
    `);
  }

  /**
   * Get user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object>} User object
   * @throws {NotFoundError} If user not found
   */
  async getById(id) {
    const user = await this.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }
    return user;
  }

  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null
   */
  async getByEmail(email) {
    return this.get('SELECT * FROM users WHERE email = ?', [email]);
  }

  /**
   * Create a new user
   * @param {Object} data - User data
   * @param {string} data.name - User name
   * @param {string} data.email - Email address
   * @param {string} data.password - Plain text password
   * @param {string} data.role - User role ('admin' or 'association')
   * @param {number} [data.association_id] - Association ID (required for association role)
   * @returns {Promise<Object>} Created user (without password hash)
   * @throws {ValidationError} If validation fails
   */
  async create({ name, email, password, role, association_id }) {
    // Validation
    if (!name || !name.trim()) {
      throw new ValidationError('Name is required');
    }
    if (!email || !email.trim()) {
      throw new ValidationError('Email is required');
    }
    // Password is currently standardized to '12345' (temporary policy)
    const effectivePassword = '12345';
    if (!role || !['admin', 'association'].includes(role)) {
      throw new ValidationError('Role must be either "admin" or "association"');
    }
    if (role === 'association' && !association_id) {
      throw new ValidationError('Association ID is required for association role');
    }

    // Check for duplicate email
    const existingUser = await this.getByEmail(email.trim());
    if (existingUser) {
      throw new ValidationError('Email already in use');
    }

    // Hash password
    const password_hash = await bcrypt.hash(effectivePassword, 10);

    const result = await this.run(
      'INSERT INTO users (name, email, password_hash, role, association_id) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), email.trim(), password_hash, role, association_id || null]
    );

    return {
      id: result.lastID,
      name: name.trim(),
      email: email.trim(),
      role,
      association_id: association_id || null,
    };
  }

  /**
   * Delete a user
   * @param {number} id - User ID
   * @returns {Promise<void>}
   * @throws {NotFoundError} If user not found
   */
  async delete(id) {
    const result = await this.run('DELETE FROM users WHERE id = ?', [id]);
    if (result.changes === 0) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }
  }

  /**
   * Verify user password
   * @param {string} email - User email
   * @param {string} password - Plain text password
   * @returns {Promise<Object|null>} User object (without password hash) or null if invalid
   */
  async verifyPassword(email, password) {
    const user = await this.getByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

module.exports = new UserService();
