const express = require('express');
const QRCodeService = require('../services/QRCodeService');
const { NotFoundError } = require('../utils/errors');

const router = express.Router();

router.get('/:token', async (req, res) => {
  try {
    const result = await QRCodeService.consume(req.params.token);

    const status = result.alreadyConsumed ? 'already' : 'ok';

    const info = {
      token: result.token,
      batch_number: result.batch_number,
      expiry_date: result.expiry_date,
      producer_name: result.producer_name,
      association_name: result.neighborhood_name,
      consumed_at: result.consumed_at,
    };

    const toast = status === 'ok'
      ? { type: 'success', title: 'OK', text: req.t('scan.ok') }
      : { type: 'warn', title: 'Aviso', text: req.t('scan.already') };
    return res.render('scan', {
      title: req.t('scan.title'),
      status,
      info,
      toast,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).render('scan', {
        title: req.t('scan.title'),
        status: 'notfound',
        toast: { type: 'error', title: 'Erro', text: req.t('scan.notfound') },
      });
    }
    console.error('Error consuming QR code:', error);
    res.status(500).render('error', { message: 'Error processing QR code' });
  }
});

// Admin/info-only: show details without consuming
router.get('/info/:token', async (req, res) => {
  try {
    const qrCode = await QRCodeService.getByToken(req.params.token);

    if (!qrCode) {
      return res.status(404).render('scan_info', {
        title: req.t('scan.title'),
        found: false,
      });
    }

    const info = {
      token: qrCode.token,
      batch_number: qrCode.batch_number,
      expiry_date: qrCode.expiry_date,
      producer_name: qrCode.producer_name,
      association_name: qrCode.neighborhood_name,
      consumed_at: qrCode.consumed_at || null,
      status: qrCode.status,
    };

    return res.render('scan_info', {
      title: req.t('scan.title'),
      found: true,
      info,
    });
  } catch (error) {
    console.error('Error getting QR code info:', error);
    res.status(500).render('error', { message: 'Error retrieving QR code info' });
  }
});

module.exports = router;

// JSON API: consume and return details (for modal usage)
router.get('/api/:token', async (req, res) => {
  try {
    const result = await QRCodeService.consume(req.params.token);
    const info = {
      token: result.token,
      batch_number: result.batch_number,
      expiry_date: result.expiry_date,
      producer_name: result.producer_name,
      association_name: result.neighborhood_name,
      consumed_at: result.consumed_at,
    };
    return res.json({ success: true, status: result.alreadyConsumed ? 'already' : 'ok', info });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ success: false, status: 'notfound' });
    }
    console.error('Error consuming QR code (API):', error);
    return res.status(500).json({ success: false, status: 'error' });
  }
});
