const express = require('express');
const { ensureAuth, ensureRole } = require('../middleware/auth');
const AssociationService = require('../services/AssociationService');
const UserService = require('../services/UserService');
const ProducerService = require('../services/ProducerService');
const BatchService = require('../services/BatchService');
const OrderService = require('../services/OrderService');
const QRCodeService = require('../services/QRCodeService');
const StatsService = require('../services/StatsService');
const { ValidationError } = require('../utils/errors');

const router = express.Router();

router.use(ensureAuth, ensureRole('admin'));

// Dashboard
router.get('/', async (req, res) => {
  try {
    const stats = await StatsService.getDashboardStats();
    res.render('admin/dashboard', {
      title: req.t('admin.dashboard'),
      stats: {
        associations: stats.associations,
        orders: stats.orders,
        batches: stats.batches,
        qr: stats.qrCodes.total,
      },
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    req.session.toast = { type: 'error', title: 'Erro', text: 'Erro ao carregar o painel.' };
    res.redirect('/admin');
  }
});

// Settings page (language selection, etc.)
router.get('/settings', (req, res) => {
  res.render('admin/settings', { title: 'Configurações' });
});

// Associations
router.get('/associations', async (req, res) => {
  try {
    const rows = await AssociationService.getAll();
    res.render('admin/associations', {
      title: req.t('admin.associations'),
      rows,
      error: null,
      form: {},
    });
  } catch (error) {
    console.error('Error loading associations:', error);
    req.session.toast = { type: 'error', title: 'Erro', text: 'Erro ao carregar associações.' };
    res.redirect('/admin');
  }
});

router.post('/associations', async (req, res) => {
  try {
    await AssociationService.create(req.body);
    res.redirect('/admin/associations');
  } catch (error) {
    if (error instanceof ValidationError) {
      const rows = await AssociationService.getAll();
      res.locals.toast = { type: 'warn', title: 'Atenção', text: error.message };
      return res.status(400).render('admin/associations', {
        title: req.t('admin.associations'),
        rows,
        error: error.message,
        form: req.body,
      });
    }
    console.error('Error creating association:', error);
    req.session.toast = { type: 'error', title: 'Erro', text: 'Erro ao criar associação.' };
    res.redirect('/admin/associations');
  }
});

router.post('/associations/:id/delete', async (req, res) => {
  try {
    await AssociationService.delete(req.params.id);
    res.redirect('/admin/associations');
  } catch (error) {
    console.error('Error deleting association:', error);
    req.session.toast = { type: 'error', title: 'Erro', text: 'Erro ao excluir associação.' };
    res.redirect('/admin/associations');
  }
});

// Users
router.get('/users', async (req, res) => {
  try {
    const users = await UserService.getAll();
    const associations = await AssociationService.getAll();
    res.render('admin/users', {
      title: req.t('admin.users'),
      users,
      associations,
    });
  } catch (error) {
    console.error('Error loading users:', error);
    req.session.toast = { type: 'error', title: 'Erro', text: 'Erro ao carregar usuários.' };
    res.redirect('/admin');
  }
});

router.post('/users', async (req, res) => {
  try {
    await UserService.create(req.body);
    res.redirect('/admin/users');
  } catch (error) {
    if (error instanceof ValidationError) {
      const users = await UserService.getAll();
      const associations = await AssociationService.getAll();
      res.locals.toast = { type: 'warn', title: 'Atenção', text: error.message };
      return res.status(400).render('admin/users', {
        title: req.t('admin.users'),
        users,
        associations,
        error: error.message,
      });
    }
    console.error('Error creating user:', error);
    req.session.toast = { type: 'error', title: 'Erro', text: 'Erro ao criar usuário.' };
    res.redirect('/admin/users');
  }
});

router.post('/users/:id/delete', async (req, res) => {
  try {
    await UserService.delete(req.params.id);
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error deleting user:', error);
    req.session.toast = { type: 'error', title: 'Erro', text: 'Erro ao excluir usuário.' };
    res.redirect('/admin/users');
  }
});

// Producers
router.get('/producers', async (req, res) => {
  try {
    const rows = await ProducerService.getAll();
    res.render('admin/producers', {
      title: req.t('admin.producers'),
      rows,
      error: null,
      form: {},
    });
  } catch (error) {
    console.error('Error loading producers:', error);
    req.session.toast = { type: 'error', title: 'Erro', text: 'Erro ao carregar produtores.' };
    res.redirect('/admin');
  }
});

router.post('/producers', async (req, res) => {
  try {
    await ProducerService.create(req.body);
    res.redirect('/admin/producers');
  } catch (error) {
    if (error instanceof ValidationError) {
      const rows = await ProducerService.getAll();
      res.locals.toast = { type: 'warn', title: 'Atenção', text: error.message };
      return res.status(400).render('admin/producers', {
        title: req.t('admin.producers'),
        rows,
        error: error.message,
        form: req.body,
      });
    }
    console.error('Error creating producer:', error);
    req.session.toast = { type: 'error', title: 'Erro', text: 'Erro ao criar produtor.' };
    res.redirect('/admin/producers');
  }
});

router.post('/producers/:id/delete', async (req, res) => {
  try {
    await ProducerService.delete(req.params.id);
    res.redirect('/admin/producers');
  } catch (error) {
    console.error('Error deleting producer:', error);
    req.session.toast = { type: 'error', title: 'Erro', text: 'Erro ao excluir produtor.' };
    res.redirect('/admin/producers');
  }
});

// Batches
router.get('/batches', async (req, res) => {
  try {
    const batches = await BatchService.getAll();
    const producers = await ProducerService.getAll();
    res.render('admin/batches', {
      title: req.t('admin.batches'),
      batches,
      producers,
    });
  } catch (error) {
    console.error('Error loading batches:', error);
    req.session.toast = { type: 'error', title: 'Erro', text: 'Erro ao carregar lotes.' };
    res.redirect('/admin');
  }
});

router.post('/batches', async (req, res) => {
  try {
    await BatchService.create(req.body);
    res.redirect('/admin/batches');
  } catch (error) {
    if (error instanceof ValidationError) {
      const batches = await BatchService.getAll();
      const producers = await ProducerService.getAll();
      res.locals.toast = { type: 'warn', title: 'Atenção', text: error.message };
      return res.status(400).render('admin/batches', {
        title: req.t('admin.batches'),
        batches,
        producers,
        error: error.message,
      });
    }
    console.error('Error creating batch:', error);
    req.session.toast = { type: 'error', title: 'Erro', text: 'Erro ao criar lote.' };
    res.redirect('/admin/batches');
  }
});

// Orders
router.get('/orders', async (req, res) => {
  try {
    const orders = await OrderService.getWithFulfillmentStatus();
    const batches = await BatchService.getAll();
    res.render('admin/orders', {
      title: req.t('admin.orders'),
      orders,
      batches,
    });
  } catch (error) {
    console.error('Error loading orders:', error);
    req.session.toast = { type: 'error', title: 'Erro', text: 'Erro ao carregar pedidos.' };
    res.redirect('/admin');
  }
});

// Admin QR test page (camera + manual token)
router.get(['/qr-test', '/qrtest'], (req, res) => {
  res.render('admin/qrtest', { title: req.t('admin.qrcodes') });
});

router.post('/orders/:id/fulfill', async (req, res) => {
  const orderId = req.params.id;
  const { batch_id, quantity_allocated } = req.body;

  try {
    const quantity = Math.max(0, parseInt(quantity_allocated || '0', 10));
    if (quantity <= 0) {
      return res.redirect('/admin/orders');
    }

    await OrderService.fulfill({
      orderId,
      batchId: batch_id,
      quantity,
    });

    res.redirect(`/admin/orders/${orderId}/qrcodes`);
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation error fulfilling order:', error.message);
      req.session.toast = { type: 'error', title: 'Erro', text: error.message };
      return res.redirect('/admin/orders');
    }
    console.error('Error fulfilling order:', error);
    req.session.toast = { type: 'error', title: 'Erro', text: 'Erro ao alocar pedido.' };
    res.redirect('/admin/orders');
  }
});

router.get('/orders/:id/qrcodes', async (req, res) => {
  try {
    const order = await OrderService.getById(req.params.id);
    const qrs = await QRCodeService.getByOrderId(req.params.id);

    const baseUrl = req.protocol + '://' + req.get('host');
    const QRCode = require('qrcode');

    // Generate data URLs for each QR
    const images = {};
    for (const q of qrs) {
      const url = `${baseUrl}/scan/${q.token}`;
      images[q.id] = await QRCode.toDataURL(url, { width: 120, margin: 1 });
    }

    res.render('admin/qrcodes', {
      title: req.t('admin.qrcodes'),
      order,
      qrs,
      images,
    });
  } catch (error) {
    console.error('Error loading QR codes:', error);
    res.status(500).render('error', { message: 'Error loading QR codes' });
  }
});

module.exports = router;
