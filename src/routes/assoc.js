const express = require('express');
const { ensureAuth, ensureRole } = require('../middleware/auth');
const OrderService = require('../services/OrderService');
const { ValidationError } = require('../utils/errors');

const router = express.Router();

router.use(ensureAuth, ensureRole('association'));

router.get('/', async (req, res) => {
  try {
    const orders = await OrderService.getByAssociationId(req.session.user.association_id);
    res.render('assoc/dashboard', {
      title: req.t('assoc.dashboard'),
      orders,
    });
  } catch (error) {
    console.error('Error loading association dashboard:', error);
    res.status(500).render('error', { message: 'Error loading dashboard' });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const orders = await OrderService.getByAssociationId(req.session.user.association_id);
    res.render('assoc/orders', {
      title: req.t('assoc.orders'),
      orders,
    });
  } catch (error) {
    console.error('Error loading orders:', error);
    res.status(500).render('error', { message: 'Error loading orders' });
  }
});

router.post('/orders', async (req, res) => {
  try {
    const { quantity_requested } = req.body;
    const quantity = Math.max(1, parseInt(quantity_requested || '1', 10));

    await OrderService.create({
      association_id: req.session.user.association_id,
      quantity_requested: quantity,
    });

    res.redirect('/assoc/orders');
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation error creating order:', error.message);
      return res.status(400).render('error', { message: error.message });
    }
    console.error('Error creating order:', error);
    res.status(500).render('error', { message: 'Error creating order' });
  }
});

module.exports = router;
