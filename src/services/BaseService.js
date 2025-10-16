const { connect, run, all, get } = require('../db');

/**
 * Base service class providing common database operations
 */
class BaseService {
  /**
   * Execute a database operation with automatic connection management
   * @param {Function} callback - Async function that receives db instance
   * @returns {Promise<any>} Result from the callback
   */
  async withDb(callback) {
    const db = connect();
    try {
      return await callback(db);
    } finally {
      db.close();
    }
  }

  /**
   * Run a database query (INSERT, UPDATE, DELETE)
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<any>} Query result
   */
  async run(sql, params = []) {
    return this.withDb(async (db) => run(db, sql, params));
  }

  /**
   * Get all rows matching query
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} Array of rows
   */
  async all(sql, params = []) {
    return this.withDb(async (db) => all(db, sql, params));
  }

  /**
   * Get single row matching query
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object|undefined>} Single row or undefined
   */
  async get(sql, params = []) {
    return this.withDb(async (db) => get(db, sql, params));
  }

  /**
   * Execute multiple operations within a single database connection
   * Useful for transactions or related operations
   * @param {Function} callback - Async function that receives helper methods
   * @returns {Promise<any>} Result from the callback
   */
  async transaction(callback) {
    return this.withDb(async (db) => {
      await run(db, 'BEGIN TRANSACTION');
      try {
        const result = await callback({
          run: (sql, params) => run(db, sql, params),
          all: (sql, params) => all(db, sql, params),
          get: (sql, params) => get(db, sql, params),
        });
        await run(db, 'COMMIT');
        return result;
      } catch (error) {
        await run(db, 'ROLLBACK');
        throw error;
      }
    });
  }
}

module.exports = BaseService;
