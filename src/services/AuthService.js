const UserService = require('./UserService');
const { UnauthorizedError } = require('../utils/errors');

class AuthService {
  /**
   * Authenticate a user with email and password
   * @param {string} email - User email
   * @param {string} password - Plain text password
   * @returns {Promise<Object>} User object (without password hash)
   * @throws {UnauthorizedError} If credentials are invalid
   */
  async login(email, password) {
    if (!email || !password) {
      throw new UnauthorizedError('Email and password are required');
    }

    const user = await UserService.verifyPassword(email, password);

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    return user;
  }

  /**
   * Create a session user object (for storing in req.session.user)
   * @param {Object} user - User object from database
   * @returns {Object} Session user object
   */
  createSessionUser(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      association_id: user.association_id,
    };
  }

  /**
   * Validate user has required role
   * @param {Object} user - User object
   * @param {string} requiredRole - Required role
   * @returns {boolean} True if user has required role
   */
  hasRole(user, requiredRole) {
    return user && user.role === requiredRole;
  }
}

module.exports = new AuthService();
