const AssociationService = require('./AssociationService');
const UserService = require('./UserService');
const ProducerService = require('./ProducerService');
const BatchService = require('./BatchService');
const OrderService = require('./OrderService');
const QRCodeService = require('./QRCodeService');

class StatsService {
  /**
   * Get dashboard statistics
   * @returns {Promise<Object>} Dashboard statistics
   */
  async getDashboardStats() {
    const [
      associationCount,
      userCount,
      producerCount,
      batchCount,
      orderCount,
      qrStats,
    ] = await Promise.all([
      AssociationService.getCount(),
      UserService.getAll().then(users => users.length),
      ProducerService.getCount(),
      BatchService.getCount(),
      OrderService.getCount(),
      QRCodeService.getStats(),
    ]);

    return {
      associations: associationCount,
      users: userCount,
      producers: producerCount,
      batches: batchCount,
      orders: orderCount,
      qrCodes: qrStats,
    };
  }

  /**
   * Get order statistics
   * @returns {Promise<Object>} Order statistics by status
   */
  async getOrderStats() {
    const orders = await OrderService.getAll();

    const stats = {
      total: orders.length,
      pending: 0,
      partial: 0,
      fulfilled: 0,
    };

    orders.forEach(order => {
      if (order.status === 'pending') stats.pending++;
      else if (order.status === 'partial') stats.partial++;
      else if (order.status === 'fulfilled') stats.fulfilled++;
    });

    return stats;
  }
}

module.exports = new StatsService();
