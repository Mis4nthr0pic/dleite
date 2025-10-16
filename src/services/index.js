/**
 * Service Layer Index
 *
 * Centralizes all service exports for easy importing
 */

module.exports = {
  AssociationService: require('./AssociationService'),
  AuthService: require('./AuthService'),
  BatchService: require('./BatchService'),
  OrderService: require('./OrderService'),
  ProducerService: require('./ProducerService'),
  QRCodeService: require('./QRCodeService'),
  StatsService: require('./StatsService'),
  UserService: require('./UserService'),
};
